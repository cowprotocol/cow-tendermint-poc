# CoW Tendermint

A multi-proposer tendermint implementation for the CoW Protocol auction.

## Setup

1. Run the devcontainer (or `npm ci && cp env.example .env` locally)
2. Either export an existing private key or generate a new random one with

```bash
export PK=$(hexdump -vn32 -e'"0x" 8/4 "%08x" 1 "\n"' /dev/urandom)
```

3. Run the script with `npm tsx index.ts`
4. Make sure that the address with which you are signing is added to the validator/solver registry (cf. `.env` file for addresses)
