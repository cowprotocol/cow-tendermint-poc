import * as infra from "../infra";
import { Precommit, BidPayload, EmptyBidPayload } from "./model";
import { schedule } from "./schedule";

const logger = infra.logger;

export class Solver {
  protocol: infra.Protocol;
  validators: infra.Registry;
  solvers: infra.Registry;
  signer: infra.Signer;
  store: infra.Store;

  constructor(
    protocol: infra.Protocol,
    validators: infra.Registry,
    solvers: infra.Registry,
    signer: infra.Signer,
    store: infra.Store
  ) {
    this.protocol = protocol;
    this.validators = validators;
    this.solvers = solvers;
    this.signer = signer;
    this.store = store;

    // Bid 2s before the end of the auction
    schedule((auction) => {
      this.vote(auction);
    }, 2000);
  }

  public async onPrecommit(precommit: Precommit) {
    const validators = await this.validators.getAddresses();
    const solvers = await this.solvers.getAddresses();

    const validator = this.signer.recoverPrecommit(precommit);
    if (!(await this.validators.getAddresses()).includes(validator)) {
      logger.debug(`Received precommit from unknown validator: ${validator}`);
      return;
    }

    logger.debug(
      `Received precommit: ${JSON.stringify(precommit)} from ${validator}`
    );

    if (
      !this.store.addPrecommit(
        precommit.payload.auction,
        validator,
        precommit.payload
      )
    ) {
      logger.error(`Received duplicate precommit from ${validator}`);
      // TODO: slash
      return;
    }

    // Check if we have enough precommits for our vote
    const prevote = this.store.getPrevote(
      precommit.payload.auction,
      precommit.payload.solver,
      this.signer.address()
    );

    if (
      // We can't finalize if we don't have a prevote
      !prevote ||
      // Or if we haven't received enough precommits
      this.store.getPrecommitCount(prevote) !==
        Math.ceil((validators.length * 2) / 3)
    ) {
      return;
    }
    logger.info(`Bid ${JSON.stringify(precommit.payload)} is finalized.`);
    this.onBidFinalized(precommit.payload.auction, solvers, validators);
  }

  onBidFinalized(auction, solvers, validators) {
    // Check if we have enough pre-votes & commits for all bids
    const bids: (BidPayload | EmptyBidPayload)[] = [];
    for (const address of solvers) {
      const bid = this.store.getBid(auction, address);
      if (
        !bid ||
        this.store.getPrevoteCount(bid, address) <
          Math.ceil((validators.length * 2) / 3)
      ) {
        return;
      }

      const prevote = this.store.getPrevote(
        auction,
        address,
        this.signer.address()
      );

      if (
        !prevote ||
        this.store.getPrecommitCount(prevote) <
          Math.ceil((validators.length * 2) / 3)
      ) {
        return;
      }

      bids.push(bid);
    }
    logger.info(`Auction ${auction} is finalized: ${JSON.stringify(bids)}`);
  }

  vote(auction: number) {
    const payload = {
      auction,
      solver: this.signer.address(),
      value: Math.random(),
    };
    logger.info(`Issuing bid: ${JSON.stringify(payload)}`);
    this.protocol.bid({
      payload,
      signature: this.signer.signBid(payload),
    });
  }
}
