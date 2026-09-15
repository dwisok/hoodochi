# Hoodochi contracts v2 — Robinhood Chain

Two contracts, Foundry project. (v1 — daily tick, size, separate Staking — is what is deployed on mainnet today; it is superseded by this.)

| Contract | Role |
|---|---|
| `Collar` | ERC-721. One collar = one ticker (letters only). On-chain SVG. Minted by `Hoodochi` straight into escrow. |
| `Hoodochi` | ERC-721 creature, 1,000 max, fixed-price public mint. Birth traits are fixed off-chain (pre-generated collection, `provenance` hash on-chain); `tokenURI = baseURI + id` (the renderer). Holds the weekly loop: `setCollar` → `stake` → keeper `settleWeek` every Friday → item / nothing / death; yield accrues in units labelled with the ticker; `claim` moves them to a per-owner, per-ticker ledger. |

What the contract decides itself: item tier and death, from `tierZ10` / `deathZ10` thresholds (tenths of σ, owner-adjustable — BRIEF §9.3 provisional), and the slot draw. What the keeper brings: the week's z-score and the yield units.

Staking is a soft escrow: a staked Hoodochi stays in your wallet but cannot be transferred. Death burns the items and unstakes; the collar stays on the corpse (`deathPolicy = Frozen`, BRIEF §9.1 still open).

Yield units are a ledger, not a share, not a token, not an exposure — until a `sink` is attached after the legal review (BRIEF-NFT §10).

## Deployed (v2)

| Network | Contract | Address |
|---|---|---|
| Robinhood Chain mainnet (4663) | `Collar` | [`0xCCc7C1EA864E99CBe43788c203Af9c1BDfaba7c0`](https://robinhoodchain.blockscout.com/address/0xCCc7C1EA864E99CBe43788c203Af9c1BDfaba7c0) |
| Robinhood Chain mainnet (4663) | `Hoodochi` | [`0x23409CaD886380f066329eF237a37d55950AF9Ad`](https://robinhoodchain.blockscout.com/address/0x23409CaD886380f066329eF237a37d55950AF9Ad) |

Deployed 2026-09-14 from `0xC22ABb0E1b6493A6D09Db6C281B586a8343D5E0f` (owner + keeper). Mint price 0.001 ETH (set via `setMintPrice` right after deploy; was 0.00197), `BASE_URI = https://www.hoodochi.io/token/` (static JSON + birth picture per id, see the site README; set with `setBaseURI` on 2026-09-15), thresholds = provisional defaults. Receipts: `broadcast/Deploy.s.sol/4663/run-latest.json`.

## Network

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 4663 | 46630 |
| RPC | https://rpc.mainnet.chain.robinhood.com | https://rpc.testnet.chain.robinhood.com |
| Explorer (Blockscout) | https://robinhoodchain.blockscout.com | https://explorer.testnet.chain.robinhood.com |
| Gas | ETH (bridge via portal.arbitrum.io/bridge) | faucet.testnet.chain.robinhood.com |

## Setup (once)

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-commit
forge build
forge test -vv
```

## Deploy

```bash
cp .env.example .env      # PRIVATE_KEY, KEEPER, MINT_PRICE_WEI ($5), PROVENANCE, BASE_URI
source .env

# testnet first
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --verify --verifier blockscout

# mainnet, once the Game Boy has been played end to end on testnet
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --verify --verifier blockscout
```

Then in the site's `.env.local`:

```
VITE_CHAIN_ID=46630
VITE_COLLAR_ADDRESS=0x...
VITE_HOODOCHI_ADDRESS=0x...
```

`MINT_PRICE_WEI` is the fixed mint price (0.001 ETH on mainnet); adjust later with `setMintPrice`. `PROVENANCE` is the `provenance` field of `collection/collection.json`, `0x`-prefixed.

## Friday keeper

`keeper/settle.mjs` (site repo) reads the week's closes (Polygon, else Yahoo, else Stooq), computes each staked creature's z-score (weekly return / its own weekly σ) and yield units, and calls `settleWeek(ids, z10, units)`. Idempotent through the `Settled` events. Runs every Saturday 01:30 UTC from GitHub Actions (`.github/workflows/friday.yml`).

## Renderer

`tokenURI(id)` → `BASE_URI + id` → static JSON in the site (`public/token/<id>`, birth traits, `image` = birth picture, `external_url` = `/pet/<id>` where the live look is rendered client-side). A dynamic renderer (items on the picture) can replace it later with a single `setBaseURI`.
