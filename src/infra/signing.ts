import { ethers } from 'ethers';
import * as domain from '../domain';
import { Logger, logger } from './logging';

/**
 * Component that performs cryptographic signing and verification for domain objects.
 */
export class Signer {
    wallet: ethers.Wallet;
    logger: Logger;

    constructor(privateKey: string) {
        this.wallet = new ethers.Wallet(privateKey);
        this.logger = logger('signer');

        this.logger.info(`Signing with address ${this.wallet.address}`);
    }

    /**
     * Recovers the public key (address) of the signer.
     *
     * @returns the address of the signer
     */
    public address() {
        return this.wallet.address;
    }

    /**
     * Signs a bid with the current signing key.
     *
     * @param bid to sign
     * @returns signature
     */
    public signBid(bid: domain.BidPayload) {
        return this.wallet.signMessageSync(JSON.stringify(bid));
    }

    /**
     * Recovers the address of the signer of a bid.
     *
     * @param bid to recover signer from
     * @returns the address of the signer
     */
    public recoverBid(bid: domain.Bid) {
        return ethers.verifyMessage(JSON.stringify(bid.payload), bid.signature);
    }

    /**
     * Signs a prevote with the current signing key.
     *
     * @param prevote to sign
     * @returns signature
     */
    public signPrevote(prevote: domain.PrevotePayload) {
        return this.wallet.signMessageSync(JSON.stringify(prevote));
    }

    /**
     * Recovers the address of the signer of a prevote.
     *
     * @param prevote to recover signer from
     * @returns the address of the signer
     */
    public recoverPrevote(prevote: domain.Prevote) {
        return ethers.verifyMessage(
            JSON.stringify(prevote.payload),
            prevote.signature,
        );
    }

    /**
     * Signs a precommit with the current signing key.
     *
     * @param precommit to sign
     * @returns signature
     */
    public signPrecommit(precommit: domain.PrecommitPayload) {
        return this.wallet.signMessageSync(JSON.stringify(precommit));
    }

    /**
     * Recovers the address of the signer of a precommit.
     *
     * @param precommit to recover signer from
     * @returns the address of the signer
     */
    public recoverPrecommit(precommit: domain.Precommit) {
        return ethers.verifyMessage(
            JSON.stringify(precommit.payload),
            precommit.signature,
        );
    }
}
