import * as infra from "../infra";
import { Bid, Prevote, Precommit, BidPayload, EmptyBidPayload } from "./model";
import { schedule } from "./schedule";

const logger = infra.logger;

export class Validator {
  protocol: infra.Protocol;
  solvers: infra.Registry;
  signer: infra.Signer;
  store: infra.Store;

  constructor(
    protocol: infra.Protocol,
    solvers: infra.Registry,
    signer: infra.Signer,
    store: infra.Store
  ) {
    logger.info("Running Validator");

    this.protocol = protocol;
    this.solvers = solvers;
    this.signer = signer;
    this.store = store;

    schedule((auction) => {
      this.checkBlocks(auction);
    }, 0);
  }

  public async onBid(bid: Bid, solver: string) {
    const payload = {
      auction: bid.payload.auction,
      solver,
      value: bid.payload.value,
    };
    const prevote = {
      payload,
      signature: this.signer.signPrevote(payload),
    };
    await this.protocol.prevote(prevote);
  }

  public async onPrevoteQuorum(prevote: Prevote) {
    const precommit = {
      payload: prevote.payload,
      signature: this.signer.signPrecommit(prevote.payload),
    };
    logger.debug(`Precommitting: ${JSON.stringify(precommit)}`);
    await this.protocol.precommit(precommit);
  }

  async checkBlocks(auction: number) {
    for (const address of await this.solvers.getAddresses()) {
      if (this.store.getBid(auction, address)) {
        continue;
      }

      logger.debug(`Issuing vote for empty bid for ${address}`);
      const payload = {
        auction,
        solver: address,
      };

      this.store.addBid(auction, address, payload);
      const prevote = {
        payload,
        signature: this.signer.signPrevote(payload),
      };
      await this.protocol.prevote(prevote);
    }
  }
}
