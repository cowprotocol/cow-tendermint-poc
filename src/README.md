## Architecture

The source code is split into two main modules, `domain` and `infra`.

**Infra** contains abstractions for external dependencies (persistence, observability on-chain communication, third-party library signature wrappers, etc).

**Domain** contains domain specific logic such as the concrete tendermint consensus algorithm logic, the solver and validator behavior as well as domain specific data structures and runloop/shedulin logic.

- The core data models are defined in `./domain/model.ts`.
- Serialisation and translation to network level messages happens in `./infra/protocol.ts`

At the time of writing the overall architecture can be depictured as follows:

![architecture](../img/architecture.png)

Cf. to module specific documentation in the code for more detailed information.

## Class Diagram

```mermaid
classDiagram
    class Consensus {
        +validators: Registry
        +solvers: Registry
        +signer: Signer
        +store: Store
        +logger: Logger
        +validator: Validator?
        +solver: Solver?
        +onBid(bid: Bid) void
        +onPrevote(prevote: Prevote) void
        +onPrecommit(precommit: Precommit) void
        +onPrecommitQuorum(auction: number, solvers: string[], validators: string[]) void
    }

    class Bid {
        +payload: BidPayload
        +signature: string
        +timestamp: number
        +static empty(auction: number, solver: string) Bid
        +static hash(bid: BidPayload) string
    }

    class BidPayload {
        +auction: number
        +solver: string
        +solution: Solution | EmptySolution
    }

    class Solution {
        +score: number
    }
    class EmptySolution

    class Prevote {
        +payload: PrevotePayload
        +signature: string
        +timestamp: number
    }

    class PrevotePayload {
        +auction: number
        +solver: string
        +bid: string
    }

    class Precommit {
        +payload: PrecommitPayload
        +signature: string
        +timestamp: number
    }

    class PrecommitPayload {
        +auction: number
        +solver: string
        +bid: string
    }

    class Validator {
        <<Interface>>
        +onBid(bid: Bid) void
        +onPrevoteQuorum(prevote: Prevote) void
    }

    class Solver {
        <<Interface>>
        +onAuctionFinalized(auction: number, bids: BidPayload[]) void
    }

    class Registry {
        <<Interface>>
        +getAddresses() string[]
    }

    class Signer {
        <<Interface>>
        +recoverBid(bid: Bid) string
        +recoverPrecommit(vote: Prevote | Precommit) string
    }

    class Store {
        <<Interface>>
        +addBid(bid: Bid) boolean
        +getBid(auction: number, solver: string) Bid?
        +addPrevote(auction: number, validator: string, payload: PrevotePayload) boolean
        +getPrevoteCount(payload: BidPayload) number
        +addPrecommit(auction: number, validator: string, payload: PrecommitPayload) boolean
        +getPrecommitCount(payload: BidPayload) number
    }

    class Logger {
        <<Interface>>
        +debug(message: string) void
        +error(message: string) void
    }

    Consensus o-- Registry : validators
    Consensus o-- Registry : solvers
    Consensus o-- Signer : signer
    Consensus o-- Store : store
    Consensus o-- Logger : logger
    Consensus ..> Validator : uses
    Consensus ..> Solver : uses
    Consensus --> Bid : uses
    Consensus --> Prevote : uses
    Consensus --> Precommit : uses

    Bid *-- BidPayload : contains
    BidPayload *-- Solution : contains
    BidPayload .. EmptySolution : contains

    Prevote *-- PrevotePayload : contains
    Precommit *-- PrecommitPayload : contains

    Validator ..> Bid : uses
    Validator ..> Prevote : uses
    Solver ..> BidPayload : uses

    Consensus ..> schedule : uses (implicitly)
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant ES as External Solver
    participant NL as Network Layer
    participant C as Consensus
    participant S as Signer
    participant SR as SolverRegistry
    participant ST as Store
    participant V as Validator (Optional)

    ES->>NL: Send Bid Message
    NL->>C: onBid(bid)
    C->>S: recoverBid(bid)
    S-->>C: solverAddress
    C->>SR: getAddresses()
    SR-->>C: knownSolverAddresses
    alt Solver Known
        C->>ST: addBid(bid)
        ST-->>C: success/failure
        opt Validator Exists
            C->>V: onBid(bid)
        end
    else Solver Unknown
        C->>NL: Log/Ignore Bid
    end
```
