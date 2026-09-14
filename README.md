# Hoodochi

Landing page — Vite + React + TypeScript.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Real prices: copy `.env.example` to `.env.local` and set `VITE_POLYGON_KEY` (free key at polygon.io). Without it the Live section runs on simulated data.

Artwork: the creature, the 20 items and the collar come from the Python generator in `generator/` (see its README). `generator/export_site.py` regenerates `src/sprites-v2.ts`; the site never redraws them by hand.
