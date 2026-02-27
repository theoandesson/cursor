# AGENTS.md

## Cursor Cloud specific instructions

This is a Vite-based vanilla JS web application displaying Swedish climate data from SMHI on a 2D SVG map.

### Quick reference

| Task | Command |
|------|---------|
| Dev server | `npm start` (opens browser on port 3000) |
| Lint | `npm run lint` |
| Build | `npm run build` |

### Architecture

- **Vite** dev server with proxy to SMHI APIs (avoids CORS)
- **SVG** map of Sweden with Mercator projection (`src/map/`)
- **SMHI Open Data API** for live temperature (param 1) and sea level (param 6, period `latest-day`) data (`src/data/`)
- Dashboard panels + interactive tooltips (`src/ui/`)

### Caveats

- SMHI oceanographic API uses parameter **6** for sea level ("Havsvattenstånd") and period `latest-day` (not `latest-hour`). Some stations return 404 — this is expected and handled gracefully.
- The Vite proxy config in `vite.config.js` maps `/api/smhi/metobs` and `/api/smhi/ocobs` to the real SMHI endpoints. Without the proxy, browser requests will fail due to CORS.
- The app includes fallback data (`src/data/stations.js`) used when the SMHI API is unreachable.
- In cloud VM environments without GPU/WebGL, the previous 3D globe version required `failIfMajorPerformanceCaveat: false`. The current 2D SVG version has no such requirement.
