import * as infra from '../infra';
import { Bid, Prevote } from './model';
import { schedule } from './schedule';

/**
 * Component responsible for driving and ensuring consensus of solver bids.
 */
export class Validator {
    protocol: infra.Protocol;
    solvers: infra.Registry;
    signer: infra.Signer;
    store: infra.Store;
    logger: infra.Logger;

    constructor(
        protocol: infra.Protocol,
        solvers: infra.Registry,
        signer: infra.Signer,
        store: infra.Store,
    ) {
        this.logger = infra.logger('validator');
        this.logger.info('Running Validator');

        this.protocol = protocol;
        this.solvers = solvers;
        this.signer = signer;
        this.store = store;

        schedule((auction) => {
            this.checkBlocks(auction);
        }, 0);
    }

    /**
     * Handle a received valid bid by casting a first round attestation (pre-vote) for it.
     *
     * @param bid the received bid
     */
    public async onBid(bid: Bid) {
        const payload = {
            auction: bid.payload.auction,
            solver: bid.payload.solver,
            bid: Bid.hash(bid.payload),
        };
        const prevote = {
            payload,
            signature: this.signer.signPrevote(payload),
            timestamp: Date.now(),
        };
        await this.protocol.prevote(prevote);
    }

    /**
     * Handle valid first round attestation (prevote) quorum by casting a second round (pre-commit) attestation for it.
     *
     * @param prevote the received prevote
     */
    public async onPrevoteQuorum(prevote: Prevote) {
        const precommit = {
            payload: prevote.payload,
            signature: this.signer.signPrecommit(prevote.payload),
            timestamp: Date.now(),
        };
        this.logger.debug(`Precommitting: ${JSON.stringify(precommit)}`);
        await this.protocol.precommit(precommit);
    }

    /**
     * Check all blocks for empty bids and issue "empty bid" votes for them.
     *
     * @param auction the auction to check
     */
    async checkBlocks(auction: number) {
        for (const address of await this.solvers.getAddresses()) {
            if (this.store.getBid(auction, address)) {
                continue;
            }

            this.logger.debug(`Issuing vote for empty bid for ${address}`);
            const bid = Bid.empty(auction, address);
            this.store.addBid(bid);

            const payload = {
                auction,
                solver: address,
                bid: Bid.hash(bid.payload),
            };
            const prevote = {
                payload,
                signature: this.signer.signPrevote(payload),
                timestamp: Date.now(),
            };
            await this.protocol.prevote(prevote);
        }
    }
}
