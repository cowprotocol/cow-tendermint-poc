export interface BidPayload {
    auction: number;
    solver: string;
    value: number;
}

export interface EmptyBidPayload {
    auction: number;
    solver: string;
}

export interface Bid {
    payload: BidPayload | EmptyBidPayload;
    signature: string;
    timestamp: number;
}

export interface PrevotePayload {
    auction: number;
    solver: string;
    // TODO replace with commitment to bid
    value: number;
}

export interface Prevote {
    payload: PrevotePayload | EmptyBidPayload;
    signature: string;
    timestamp: number;
}

export interface PrecommitPayload {
    auction: number;
    solver: string;
    // TODO replace with commitment to bid
    value: number;
    // TODO add aggregated signature of prevotes
}

export interface Precommit {
    payload: PrecommitPayload | EmptyBidPayload;
    signature: string;
    timestamp: number;
}
