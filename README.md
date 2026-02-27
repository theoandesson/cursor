# Sweden 3D Map Fidelity

Högupplöst 3D-karta över Sverige med adaptiv detaljnivå:

- **Rörelse-läge**: lägre polygonupplösning för terräng + förenklade byggnader.
- **Idle-läge**: högre polygonupplösning för terräng + full byggnadsdetalj.
- **Sverige-only-läge**: rendering och tile-laddning begränsas till svensk geometri/område.
- **Daglig tilecache**: hus/infrastruktur/terräng cachelagras lokalt och rullas till ny version varje dag.
- **Seamless loading UX**: progress-overlay vid första laddning + cache-warm-status i UI.

## Målbild

Projektet är uppsatt för att kunna nå myndighetsnära noggrannhet genom:

- OpenFreeMap OpenMapTiles-vektordata (inkl. byggnadslager för 3D)
- georefererad terrängkälla i meter (Terrarium DEM)
- 3D-byggnader med höjdfält
- strikt fokus på Sverige (bbox + kamerabegränsning)
- Sverige-geojson + `within`-filter för att rita enbart svenska features
- modulär LOD-kontroll för effektiv rendering
- service worker-baserad tilecache (OpenFreeMap + terrarium) med daglig cacheversion
- cache-retention med fallback till nylig cacheversion för mjukare dagliga övergångar

## Start

1. Installera beroenden:
   - `npm install`
2. Starta appen:
   - `npm start`

När `npm start` körs startar servern och öppnar localhost-länken automatiskt.

## Smoke-test

- `npm run smoke`

Verifierar att servern fungerar, att klienten serveras och att health-endpoint svarar.
