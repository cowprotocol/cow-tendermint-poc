import * as infra from "../infra";
import { BidPayload, EmptyBidPayload } from "./model";
import { schedule } from "./schedule";

const logger = infra.logger;

export class Solver {
  protocol: infra.Protocol;
  signer: infra.Signer;
  logger = infra.Logger;

  constructor(
    protocol: infra.Protocol,
    signer: infra.Signer,
  ) {
    this.logger = infra.logger("solver");
    this.logger.info("Running Solver");

    this.protocol = protocol;
    this.signer = signer;

    // Bid 2s before the end of the auction
    schedule((auction) => {
      this.bid(auction);
    }, 2000);
  }

  onAuctionFinalized(auction: number, bids: (BidPayload | EmptyBidPayload)[]) {
    this.logger.info(`Auction ${auction} is finalized: ${JSON.stringify(bids)}`);
  }

  bid(auction: number) {
    const payload = {
      auction,
      solver: this.signer.address(),
      value: Math.random(),
    };
    this.logger.info(`Issuing bid: ${JSON.stringify(payload)}`);
    this.protocol.bid({
      payload,
      signature: this.signer.signBid(payload),
    });
  }
}
