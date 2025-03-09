import * as infra from "../infra";
import { Bid, Prevote, Precommit, BidPayload, EmptyBidPayload } from "./model";
import { schedule } from "./schedule";

const logger = infra.logger;

export class Validator {
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

    schedule((auction) => {
      this.checkBlocks(auction);
    }, 0);
  }

  public async onBid(bid: Bid) {
    const solver = this.signer.recoverBid(bid);
    if (!(await this.solvers.getAddresses()).includes(solver)) {
      logger.debug(`Received bid from unknown solver: ${solver}`);
      return;
    }

    logger.debug(`Received bid: ${JSON.stringify(bid)} from ${solver}`);

    if (!this.store.addBid(bid.payload.auction, solver, bid.payload)) {
      logger.error(
        `Solver ${solver} has already bid for auction ${bid.payload.auction}`
      );
      // TODO: slash
      return;
    }

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

  public async onPrevote(prevote: Prevote) {
    const validatorCount = (await this.validators.getAddresses()).length;
    const validator = this.signer.recoverPrecommit(prevote);
    if (!(await this.validators.getAddresses()).includes(validator)) {
      logger.debug(`Received prevote from unknown validator: ${validator}`);
      return;
    }

    logger.debug(
      `Received prevote: ${JSON.stringify(prevote)} from ${validator}`
    );

    if (
      !this.store.addPrevote(
        prevote.payload.auction,
        validator,
        prevote.payload
      )
    ) {
      logger.error(`Received duplicate prevote from ${validator}`);
      // TODO: slash
      return;
    }

    const bid = this.store.getBid(
      prevote.payload.auction,
      prevote.payload.solver
    );

    if (
      // We can't precommit if we don't have a bid
      !bid ||
      // Or if we haven't received enough prevotes
      this.store.getPrevoteCount(bid, prevote.payload.solver) !==
        Math.ceil((validatorCount * 2) / 3)
    ) {
      return;
    }

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
