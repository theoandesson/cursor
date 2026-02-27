# Sweden 3D Map Fidelity

Högupplöst 3D-karta över Sverige med adaptiv detaljnivå:

- **Rörelse-läge**: lägre polygonupplösning för terräng + förenklade byggnader.
- **Idle-läge**: högre polygonupplösning för terräng + full byggnadsdetalj.

## Målbild

Projektet är uppsatt för att kunna nå myndighetsnära noggrannhet genom:

- OpenFreeMap OpenMapTiles-vektordata (inkl. byggnadslager för 3D)
- georefererad terrängkälla i meter (Terrarium DEM)
- 3D-byggnader med höjdfält
- strikt fokus på Sverige (bbox + kamerabegränsning)
- modulär LOD-kontroll för effektiv rendering

## Start

1. Installera beroenden:
   - `npm install`
2. Starta appen:
   - `npm start`

När `npm start` körs startar servern och öppnar localhost-länken automatiskt.

## Smoke-test

- `npm run smoke`

Verifierar att servern fungerar, att klienten serveras och att health-endpoint svarar.
