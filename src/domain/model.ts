import { ethers } from 'ethers';
import { getVoteStartTime } from './schedule';

export interface Solution {
    score: number;
}

export type EmptySolution = void;

export interface BidPayload {
    auction: number;
    solver: string;
    solution: Solution | EmptySolution;
}

export interface Bid {
    payload: BidPayload;
    signature: string;
    timestamp: number;
}

export interface PrevotePayload {
    auction: number;
    solver: string;
    // Commitment (hash) to solution payload
    bid: string;
}

export interface Prevote {
    payload: PrevotePayload;
    signature: string;
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
    signature: string;
    timestamp: number;
}

export namespace Bid {
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

    export function hash(bid: BidPayload) {
        return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(bid)));
    }
}
