import * as infra from '../infra';
import { BidPayload } from './model';
import { schedule, SOLVER_BIDDING_BEFORE_DEADLINE_MILLIS } from './schedule';

/**
 * Component responsible for casting solver bids and follow consensus to derive the winner of the auction.
 */
export class Solver {
    protocol: infra.Protocol;
    signer: infra.Signer;
    logger: infra.Logger;

    constructor(protocol: infra.Protocol, signer: infra.Signer) {
        this.logger = infra.logger('solver');
        this.logger.info('Running Solver');

        this.protocol = protocol;
        this.signer = signer;

        // Bid 2s before the end of the auction
        schedule((auction) => {
            this.bid(auction);
        }, SOLVER_BIDDING_BEFORE_DEADLINE_MILLIS);
    }

    /**
     * Callback for when an auction is finalized.
     *
     * @param auction the auction id that was finalized
     * @param bids the complete list of bids (including empty ones) from all solvers for the auction
     */
    public onAuctionFinalized(auction: number, bids: BidPayload[]) {
        this.logger.info(
            `Auction ${auction} is finalized: ${JSON.stringify(bids)}`,
        );
    }

    private bid(auction: number) {
        const payload = {
            auction,
            solver: this.signer.address(),
            solution: {
                score: Math.random(),
            },
        };
        this.logger.info(`Issuing bid: ${JSON.stringify(payload)}`);
        this.protocol.bid({
            payload,
            signature: this.signer.signBid(payload),
            timestamp: Date.now(),
        });
    }
}
