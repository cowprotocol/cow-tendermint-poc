import * as infra from "./src/infra";
import * as domain from "./src/domain";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const node = new infra.Node();
  const protocol = new infra.Protocol(node);
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
  const validators = new infra.Registry(
    provider,
    process.env.VALIDATOR_REGISTRY!
  );
  const solvers = new infra.Registry(provider, process.env.SOLVER_REGISTRY!);
  const signer = new infra.Signer(process.env.PK!);
  const store = new infra.Store();

  // run validator
  const validator = new domain.Validator(
    protocol,
    validators,
    solvers,
    signer,
    store
  );
  protocol.setValidator(validator);

  // run solver
  const solver = new domain.Solver(
    protocol,
    validators,
    solvers,
    signer,
    store
  );
  protocol.setSolver(solver);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
