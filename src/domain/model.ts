import { ethers } from 'ethers';
import { getVoteStartTime } from './schedule';

// Solution is the output of a solver for a given auction
export interface Solution {
    score: number;
}

// Empty solution is used to signal that a solver did not submit a solution for a given auction
export type EmptySolution = void;

// Auction specific data about the bid
export interface BidPayload {
    auction: number;
    solver: string;
    solution: Solution | EmptySolution;
}

// Top level data structure for a bid (including metadata)
export interface Bid {
    payload: BidPayload;
    // Signature of the payload by the bidding solver
    signature: string;
    // Local timestamp for when the bid was created
    timestamp: number;
}

export interface PrevotePayload {
    auction: number;
    // The solver whose bid is being prevoted on
    solver: string;
    // Commitment (hash) to solution payload
    bid: string;
}

export interface Prevote {
    payload: PrevotePayload;
    // Signature of the payload by the prevoting solver
    signature: string;
    // Local timestamp for when the prevote was created
    timestamp: number;
}

export interface PrecommitPayload {
    auction: number;
    solver: string;
    // Commitment (hash) to solution payload
    bid: string;
    // TODO add aggregated signature of prevotes
}

export interface Precommit {
    payload: PrecommitPayload;
    // Signature of the payload by the precommitting solver
    signature: string;
    // Local timestamp for when the precommit was created
    timestamp: number;
}

export namespace Bid {
    /**
     * Create an empty bid for a given auction and solver.
     *
     * @param auction auction id
     * @param solver solver address
     * @returns an empty bid
     */
    export function empty(auction: number, solver: string): Bid {
        return {
            payload: {
                auction,
                solver,
                solution: undefined,
            },
            signature: '',
            timestamp: getVoteStartTime(auction),
        };
    }

    /**
     * Hash the payload of a bid.
     *
     * @param bid the bid to hash
     * @returns the hash of the bid payload
     */
    export function hash(bid: BidPayload) {
        return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(bid)));
    }
}
