import * as domain from '../domain';

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

    addBid(bid: domain.Bid) {
        this.ensureAuction(bid.payload.auction, bid.payload.solver);
        // TODO exact same bid is ok
        if (this.bids.get(bid.payload.auction)!.has(bid.payload.solver)) {
            return false;
        }
        this.bids.get(bid.payload.auction)!.set(bid.payload.solver, bid);
        return true;
    }

    getBid(auction: number, solver: string) {
        return this.bids.get(auction)?.get(solver);
    }

    addPrevote(
        auction: number,
        validator: string,
        prevote: domain.PrevotePayload,
    ) {
        this.ensureAuction(auction, prevote.solver);
        // TODO: same prevote is ok
        if (this.prevotes.get(auction)!.get(prevote.solver)!.has(validator)) {
            return false;
        }

        this.prevotes
            .get(auction)!
            .get(prevote.solver)!
            .set(validator, prevote);
        return true;
    }

    getPrevoteCount(bid: domain.BidPayload) {
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

    addPrecommit(
        auction: number,
        validator: string,
        precommit: domain.PrecommitPayload,
    ) {
        this.ensureAuction(auction, precommit.solver);
        // TODO: same precommit is ok
        if (
            this.precommits.get(auction)!.get(precommit.solver)!.has(validator)
        ) {
            return false;
        }
        this.precommits
            .get(auction)!
            .get(precommit.solver)!
            .set(validator, precommit);
        return true;
    }

    getPrecommitCount(bid: domain.BidPayload) {
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

    ensureAuction(auction: number, solver: string) {
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
