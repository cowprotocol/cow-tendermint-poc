import * as domain from "../domain";
import { Node } from "./libp2p";

/**
 * Defines the communication protocol in terms of topics & payloads from the infra perspective.
 * Provides translation between the raw messages and the domain objects and maps incoming messages to handlers.
 */
export class Protocol {
  node: Node;
  validator?: domain.Validator;
  solver?: domain.Solver;

  constructor(node: Node) {
    this.node = node;
    node.addListener(this.toListener());
  }

  public setValidator(validator: domain.Validator) {
    this.validator = validator;
  }

  public setSolver(solver: domain.Solver) {
    this.solver = solver;
  }

  public toListener() {
    return {
      "/cow/0.0.1/bid": (data: Uint8Array) => {
        const payload = new TextDecoder().decode(data);
        const bid = JSON.parse(payload);
        this.onBid(bid);
      },
      "/cow/0.0.1/prevote": (data: Uint8Array) => {
        const payload = new TextDecoder().decode(data);
        const prevote = JSON.parse(payload);
        this.onPrevote(prevote);
      },
      "/cow/0.0.1/precommit": (data: Uint8Array) => {
        const payload = new TextDecoder().decode(data);
        const precommit = JSON.parse(payload);
        this.onPrecommit(precommit);
      },
    };
  }

  public onBid(bid: domain.Bid) {
    this.validator?.onBid(bid);
  }

  public onPrevote(prevote: domain.Prevote) {
    this.validator?.onPrevote(prevote);
  }

  public onPrecommit(precommit: domain.Precommit) {
    this.solver?.onPrecommit(precommit);
  }

  public async bid(payload: domain.Bid) {
    const serialized = JSON.stringify(payload);
    this.node.publish("/cow/0.0.1/bid", new TextEncoder().encode(serialized));
    this.onBid(payload);
  }

  public async prevote(payload: domain.Prevote) {
    const serialized = JSON.stringify(payload);
    this.node.publish(
      "/cow/0.0.1/prevote",
      new TextEncoder().encode(serialized)
    );
    this.onPrevote(payload);
  }

  public async precommit(payload: domain.Precommit) {
    const serialized = JSON.stringify(payload);
    this.node.publish(
      "/cow/0.0.1/precommit",
      new TextEncoder().encode(serialized)
    );
    this.onPrecommit(payload);
  }
}
