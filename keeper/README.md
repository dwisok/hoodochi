# Keeper — the Friday settlement

`settle.mjs` is the only off-chain piece of the game loop. Every week it reads, for each staked Hoodochi, the weekly return of the ticker on its collar, normalises it by that ticker's own weekly volatility (σ of the previous 52 weekly returns) and calls `settleWeek(ids, z10, units)`. The contract does the rest: item tier, slot draw, death.

```bash
node keeper/settle.mjs                 # dry run for this week: prints z, z10, units per Hoodochi
node keeper/settle.mjs --send          # broadcast with KEEPER_PRIVATE_KEY
node keeper/settle.mjs --date 2026-09-11   # a previous week
node keeper/settle.mjs --all           # dry run of every collared Hoodochi, staked or not
```

Environment: `KEEPER_PRIVATE_KEY` (the contract's `keeper()`), optional `POLYGON_KEY` (else Yahoo Finance, else Stooq), optional `RPC_URL`, `HOODOCHI_ADDRESS`.

Safety:
- Refuses to run before the Friday close of the target week (`--force` to override).
- Skips any Hoodochi with a `Settled` event since that close, so a second run is a no-op.
- Skips a ticker whose latest weekly close is not published yet, or with fewer than 20 weeks of history.
- Refuses to broadcast if the key does not match `keeper()`.

Yield units are abstract (BRIEF §2.4): `units = z × 0.02 × 1e6` on an up week, 0 otherwise. The Game Boy shows them divided by 1e6.

Automation: `.github/workflows/friday.yml` runs it every Saturday 01:30 UTC with the repository secrets `KEEPER_PRIVATE_KEY` and `POLYGON_KEY`, and can be triggered by hand (with a dry-run switch) from the Actions tab.
