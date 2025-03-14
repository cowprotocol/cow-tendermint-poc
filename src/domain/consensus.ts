import * as infra from "../infra";
import * as domain from "../domain";
import { Bid, Prevote, Precommit, BidPayload, EmptyBidPayload } from "./model";

const logger = infra.logger;

export class Consensus {
    validators: infra.Registry;
    solvers: infra.Registry;
    signer: infra.Signer;
    store: infra.Store;
    logger: infra.Logger;

    validator?: domain.Validator;
    solver?: domain.Solver;

    constructor(
        validators: infra.Registry,
        solvers: infra.Registry,
        signer: infra.Signer,
        store: infra.Store
    ) {
        this.validators = validators;
        this.solvers = solvers;
        this.signer = signer;
        this.store = store;
        this.logger = infra.logger("consensus");
    }

    public async onBid(bid: Bid) {
      const solver = this.signer.recoverBid(bid);
      if (!(await this.solvers.getAddresses()).includes(solver)) {
        this.logger.debug(`Received bid from unknown solver: ${solver}`);
        return;
      }
  
      this.logger.debug(`Received bid: ${JSON.stringify(bid)} from ${solver}`);
  
      if (!this.store.addBid(bid.payload.auction, solver, bid.payload)) {
        this.logger.error(
          `Solver ${solver} has already bid for auction ${bid.payload.auction}`
        );
        // TODO: slash
        return;
      }

      this.validator?.onBid(bid, solver);
    }

    public async onPrevote(prevote: Prevote) {
      const validatorCount = (await this.validators.getAddresses()).length;
      const validator = this.signer.recoverPrecommit(prevote);
      if (!(await this.validators.getAddresses()).includes(validator)) {
        this.logger.debug(`Received prevote from unknown validator: ${validator}`);
        return;
      }
  
      this.logger.debug(
        `Received prevote: ${JSON.stringify(prevote)} from ${validator}`
      );
  
      if (
        !this.store.addPrevote(
          prevote.payload.auction,
          validator,
          prevote.payload
        )
      ) {
        this.logger.error(`Received duplicate prevote from ${validator}`);
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
        this.store.getPrevoteCount(bid) !==
          Math.ceil((validatorCount * 2) / 3)
      ) {
        return;
      }

      this.validator?.onPrevoteQuorum(prevote);
    }

    public async onPrecommit(precommit: Precommit) {
        const validators = await this.validators.getAddresses();
        const solvers = await this.solvers.getAddresses();
    
        const validator = this.signer.recoverPrecommit(precommit);
        if (!(await this.validators.getAddresses()).includes(validator)) {
          this.logger.debug(`Received precommit from unknown validator: ${validator}`);
          return;
        }
    
        this.logger.debug(
          `Received precommit: ${JSON.stringify(precommit)} from ${validator}`
        );
    
        if (
          !this.store.addPrecommit(
            precommit.payload.auction,
            validator,
            precommit.payload
          )
        ) {
          this.logger.error(`Received duplicate precommit from ${validator}`);
          // TODO: slash
          return;
        }

        const bid = this.store.getBid(precommit.payload.auction, precommit.payload.solver);
        if (
          // We can't finalize if we don't have a bid
          !bid ||
          // Or if we haven't received enough precommits
          this.store.getPrecommitCount(bid) !==
            Math.ceil((validators.length * 2) / 3)
        ) {
          return;
        }
        this.logger.debug(`Bid ${JSON.stringify(precommit.payload)} is finalized.`);
        
        this.onPrecommitQuorum(precommit.payload.auction, solvers, validators);
      }

      onPrecommitQuorum(auction, solvers, validators) {
        // Check if we have enough pre-votes & commits for all bids
        const bids: (BidPayload | EmptyBidPayload)[] = [];
        for (const address of solvers) {
          const bid = this.store.getBid(auction, address);
          if (
            !bid ||
            this.store.getPrevoteCount(bid) <
              Math.ceil((validators.length * 2) / 3)
          ) {
            return;
          }
    
          if (
            this.store.getPrecommitCount(bid) <
              Math.ceil((validators.length * 2) / 3)
          ) {
            return;
          }
    
          bids.push(bid);
        }
        this.solver?.onAuctionFinalized(auction, bids);
      }
}
