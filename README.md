# Hoodochi

Landing page — Vite + React + TypeScript.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Real prices: copy `.env.example` to `.env.local` and set `VITE_POLYGON_KEY` (free key at polygon.io). Without it the Live section runs on simulated data.

Artwork: the creature, the 20 items and the collar come from the Python generator in `generator/` (see its README). `generator/export_site.py` regenerates `src/sprites-v2.ts`; the site never redraws them by hand.

## Pages

- `/` — the landing (hero, rules, Game Boy, item rail, on-chain, parade). The Game Boy is the app: connect, mint, collar, stake, claim.
- `/pets` — every minted Hoodochi, live from the chain (staked / idle / dead filters).
- `/pet/:id` — one Hoodochi: what it wears, what it is staked on, whether it lives, how to show it in a wallet.
- `/graveyard` — the dead ones, the ticker that killed them, how long they lasted.

Routing is client-side (`src/router.tsx`); `public/.htaccess` rewrites unknown paths to `index.html` on the host.

## Token metadata

`tokenURI(id) = https://www.hoodochi.io/token/<id>` → `public/token/<id>` (JSON, birth traits, served with `ForceType application/json`) and `public/token/img/<id>.png` (the birth picture, 768×768, from the generated collection). What a Hoodochi wears right now is rendered live on `/pet/<id>`; wallets and marketplaces show the birth picture.

## Friday keeper

`keeper/settle.mjs` settles the week on-chain for every staked Hoodochi (see `keeper/README.md`). `.github/workflows/friday.yml` runs it every Saturday 01:30 UTC with the `KEEPER_PRIVATE_KEY` repository secret.

## Deployment

Hostinger builds `main` from GitHub on every push (about a minute). Public build config lives in `.env.production` (chain id and contract addresses, no secrets); local overrides in `.env.local`.
