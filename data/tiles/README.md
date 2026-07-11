# Self-hosted tile data

Populate local Sweden tile pyramids with:

`npm run tiles:sync`

Expected paths after sync:

- `data/tiles/vector/{z}/{x}/{y}.pbf`
- `data/tiles/dem/{z}/{x}/{y}.png`

The server-side self-hosted tile service reads directly from these directories.
