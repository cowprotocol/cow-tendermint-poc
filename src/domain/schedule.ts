const AUCTION_FREQUENCY_MILLIS = 10_000;

/**
 * Schedule a job to check after every auction deadline if any solvers haven't bid and cast an empty vote for them.
 */
export function schedule(job: (number) => void, milliseconds_before_deadline) {
  const now = new Date();
  let auctionId = Math.floor(now.getTime() / AUCTION_FREQUENCY_MILLIS);
  let msUntilNextExecution =
    AUCTION_FREQUENCY_MILLIS - (now.getTime() % AUCTION_FREQUENCY_MILLIS);

  if (msUntilNextExecution < milliseconds_before_deadline) {
    msUntilNextExecution += AUCTION_FREQUENCY_MILLIS;
    auctionId++;
  }

  setTimeout(() => {
    job(auctionId++);

    setInterval(() => {
      job(auctionId++);
    }, AUCTION_FREQUENCY_MILLIS);
  }, msUntilNextExecution - milliseconds_before_deadline);
}
