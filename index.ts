import * as infra from "./src/infra";
import * as domain from "./src/domain";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

enum Mode {
  Validator,
  Solver,
  Both
}

async function main() {
  let mode = Mode.Both
  let bootstapNode = process.argv[2];
  if (process.argv[2] == "validator") {
    mode = Mode.Validator
    bootstapNode = process.argv[3];
  } else if (process.argv[2] == "solver") {
    mode = Mode.Solver
    bootstapNode = process.argv[3];
  }

  // Setup infrastructure
  const node = new infra.Node(bootstapNode, parseInt(process.env.PORT || "0"), process.env.MULTIADDRESS);
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
  const validators = new infra.Registry(
    provider,
    process.env.VALIDATOR_REGISTRY!
  );
  const solvers = new infra.Registry(provider, process.env.SOLVER_REGISTRY!);
  const signer = new infra.Signer(process.env.PK!);
  const store = new infra.Store();

  // Setup Protocol
  const domainProtocol = new domain.Protocol(validators, solvers, signer, store);
  const protocol = new infra.Protocol(node, domainProtocol);

  if (mode == Mode.Validator || mode == Mode.Both) {
    const validator = new domain.Validator(
      protocol,
      solvers,
      signer,
      store,
    );
    domainProtocol.validator = validator;
  }

  if (mode == Mode.Solver || mode == Mode.Both) {
    const solver = new domain.Solver(
      protocol,
      signer,
    );
    domainProtocol.solver = solver;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
