import * as domain from '../domain';

/**
 * Simple in-memory store for domain specific data types.
 */
export class Store {
    // Mapping of auction => (solver => bid)
    bids: Map<number, Map<string, domain.Bid>>;

    // Mapping of auction => (solver => (validator => prevote))
    prevotes: Map<number, Map<string, Map<string, domain.PrevotePayload>>>;

    // Mapping of auction => (solver => (validator => precommit))
    precommits: Map<number, Map<string, Map<string, domain.PrecommitPayload>>>;

    constructor() {
        this.bids = new Map();
        this.prevotes = new Map();
        this.precommits = new Map();
    }

    /**
     * Store a bid. Bids are stored per auction and solver.
     *
     * @param bid the bid to add
     * @returns false, if a conflicting bid already exists, true otherwise
     */
    public addBid(bid: domain.Bid): boolean {
        this.ensureAuction(bid.payload.auction, bid.payload.solver);
        const existing = this.bids
            .get(bid.payload.auction)!
            .get(bid.payload.solver);
        if (existing) {
            return existing === bid;
        }
        this.bids.get(bid.payload.auction)!.set(bid.payload.solver, bid);
        return true;
    }

    /**
     * Retrieve a bid by auction and solver.
     *
     * @param auction the auction id
     * @param solver the solver address
     * @returns the bid or undefined if not found
     */
    public getBid(auction: number, solver: string): domain.Bid | undefined {
        return this.bids.get(auction)?.get(solver);
    }

    /**
     * Store a prevote. Prevotes are stored per auction, solver and validator.
     *
     * @param auction the auction id
     * @param validator the validator address that casted the vote
     * @param prevote prevote payload
     * @returns false, if a conflicting prevote already exists, true otherwise
     */
    public addPrevote(
        auction: number,
        validator: string,
        prevote: domain.PrevotePayload,
    ) {
        this.ensureAuction(auction, prevote.solver);
        const existing = this.prevotes
            .get(auction)!
            .get(prevote.solver)!
            .get(validator);
        if (existing) {
            return existing === prevote;
        }

        this.prevotes
            .get(auction)!
            .get(prevote.solver)!
            .set(validator, prevote);
        return true;
    }

    /**
     * Count the number of prevotes stored for a given bid.
     *
     * @param bid the bid to count prevotes for
     * @returns the number of prevotes
     */
    public getPrevoteCount(bid: domain.BidPayload): number {
        let count = 0;
        for (const [, prevote] of this.prevotes
            .get(bid.auction)
            ?.get(bid.solver) || []) {
            if (prevote.bid === domain.Bid.hash(bid)) {
                count++;
            }
        }
        return count;
    }

    /**
     *
     * @param auction the auction id
     * @param validator the validator address that casted the precommit
     * @param precommit precommit payload
     * @returns false, if a conflicting precommit already exists, true otherwise
     */
    public addPrecommit(
        auction: number,
        validator: string,
        precommit: domain.PrecommitPayload,
    ) {
        this.ensureAuction(auction, precommit.solver);
        const existing = this.precommits
            .get(auction)!
            .get(precommit.solver)!
            .get(validator);
        if (existing) {
            return existing === precommit;
        }
        this.precommits
            .get(auction)!
            .get(precommit.solver)!
            .set(validator, precommit);
        return true;
    }

    /**
     * Count the number of precommits stored for a given bid.
     *
     * @param bid the bid to count precommits for
     * @returns the number of precommits
     */
    public getPrecommitCount(bid: domain.BidPayload) {
        let count = 0;
        for (const [, precommit] of this.precommits
            .get(bid.auction)
            ?.get(bid.solver) || []) {
            if (precommit.bid === domain.Bid.hash(bid)) {
                count++;
            }
        }
        return count;
    }

    private ensureAuction(auction: number, solver: string) {
        if (!this.bids.has(auction)) {
            this.bids.set(auction, new Map());
        }

        if (!this.prevotes.has(auction)) {
            this.prevotes.set(auction, new Map());
        }
        if (!this.prevotes.get(auction)!.has(solver)) {
            this.prevotes.get(auction)!.set(solver, new Map());
        }

        if (!this.precommits.has(auction)) {
            this.precommits.set(auction, new Map());
        }
        if (!this.precommits.get(auction)!.has(solver)) {
            this.precommits.get(auction)!.set(solver, new Map());
        }
    }
}
