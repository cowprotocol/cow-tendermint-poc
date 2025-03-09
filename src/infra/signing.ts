import { ethers } from "ethers";
import * as domain from "../domain";

export class Signer {
  wallet: ethers.Wallet;
  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
  }

  address() {
    return this.wallet.address;
  }

  signBid(bid: domain.BidPayload) {
    return this.wallet.signMessageSync(JSON.stringify(bid));
  }

  recoverBid(bid: domain.Bid) {
    return ethers.verifyMessage(JSON.stringify(bid.payload), bid.signature);
  }

  signPrevote(prevote: domain.PrevotePayload | domain.EmptyBidPayload) {
    return this.wallet.signMessageSync(JSON.stringify(prevote));
  }

  recoverPrevote(prevote: domain.Prevote) {
    return ethers.verifyMessage(
      JSON.stringify(prevote.payload),
      prevote.signature
    );
  }

  signPrecommit(precommit: domain.PrecommitPayload | domain.EmptyBidPayload) {
    return this.wallet.signMessageSync(JSON.stringify(precommit));
  }

  recoverPrecommit(precommit: domain.Precommit) {
    return ethers.verifyMessage(
      JSON.stringify(precommit.payload),
      precommit.signature
    );
  }
}
