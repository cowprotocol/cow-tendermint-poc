const AUCTION_FREQUENCY_MILLIS = 10_000;
export const SOLVER_BIDDING_BEFORE_DEADLINE_MILLIS = 2_000;

/**
 * Schedule a job to check after every auction deadline if any solvers haven't bid and cast an empty vote for them.
 */
export function schedule(
    job: (auction: number) => void,
    milliseconds_before_deadline: number,
) {
    const now = new Date();
    let auctionId = Math.floor(now.getTime() / AUCTION_FREQUENCY_MILLIS);
    let msUntilNextExecution =
        AUCTION_FREQUENCY_MILLIS - (now.getTime() % AUCTION_FREQUENCY_MILLIS);

    if (msUntilNextExecution < milliseconds_before_deadline) {
        msUntilNextExecution += AUCTION_FREQUENCY_MILLIS;
        auctionId++;
    }

    setTimeout(() => {
        step(job, milliseconds_before_deadline, auctionId++);
    }, msUntilNextExecution - milliseconds_before_deadline);
}

function step(
    job: (auction: number) => void,
    milliseconds_before_deadline: number,
    auction: number,
) {
    job(auction);
    schedule(job, milliseconds_before_deadline);
}

export function getBiddingStartTime(auction: number) {
    return getVoteStartTime(auction) - SOLVER_BIDDING_BEFORE_DEADLINE_MILLIS;
}

export function getVoteStartTime(auction: number) {
    return (auction + 1) * AUCTION_FREQUENCY_MILLIS;
}
