# Ambitiös tile-infrastruktur (self-hosted)

Det här dokumentet beskriver den ambitiösa self-hosted-arkitekturen för `sweden-3d-map-fidelity`: från tile-pipeline och scheduler/prefetcher till render budget och väderoptimering.

## 1. Målbild

Ambitiöst läge ska ge:

- Lokalt kontrollerad tile-leverans via `data/tiles`.
- Förutsägbart beteende vid cache miss (lokal-only eller hybrid fallback).
- Lägre upplevd latens med scheduler + predictive prefetch.
- Stabil rendering under rörelse genom tydliga render-budgetar.
- Snabb uppstart med varm vädercache och SWR på klienten.

## 2. Driftslägen och styrning

### 2.1 Miljövariabler

- `SELF_HOSTED_TILES=true|false` styr om self-hosted tile-spåret är aktivt.
- `TILE_FALLBACK_UPSTREAM=true|false` styr om saknade lokala tiles får hämtas från upstream i hybridläge.

Rekommenderade startkommandon:

```bash
SELF_HOSTED_TILES=true TILE_FALLBACK_UPSTREAM=true npm start
SELF_HOSTED_TILES=true TILE_FALLBACK_UPSTREAM=false npm start
```

### 2.2 Tile mode i klienten

Klienten läser tile mode via `window.__SWEDEN_MAP_TILE_MODE__` och väljer:

- self-hosted templates (`/tiles/vector/...`, `/tiles/dem/...`)
- eller externa templates (`tiles.openfreemap.org`, `s3.amazonaws.com`, m.fl.)

Det gör att samma rendering kan köras mot olika infrastruktur utan att byta stil-lager.

## 3. Tile-pipeline

### 3.1 Synk och materialisering

Pipeline startas med:

```bash
npm run tiles:sync
```

Kontraktet för sync-steget är att fylla `data/tiles` med den struktur som tile-router och klient förväntar sig:

- `data/tiles/vector/...` för vektor-tiles (`.pbf`)
- `data/tiles/dem/...` för höjdtiles (`.png`, terrarium)
- eventuella metadata/manifester för validering och observabilitet

### 3.2 Serving-lager

Servern exponerar `/tiles/*` och API-endpoints för tile-funktioner:

- `/tiles/vector/tilejson.json`
- `/tiles/vector/:z/:x/:y.pbf`
- `/api/tiles/proxy?url=...`
- `/api/tiles/proxy/stats`

Nuvarande placeholder-beteende i `tilesRouter` returnerar `503` med tydlig hint om att köra `npm run tiles:sync` när infrastrukturen ännu inte är synkad eller aktiverad.

### 3.3 Hybrid fallback

När `TILE_FALLBACK_UPSTREAM=true` kan missing lokala tiles hämtas via tile-proxy-spåret i stället för att faila hårt.

Fördelar:

- Robust drift under pågående synk.
- Mjuk övergång från extern till full self-hosted.
- Lägre risk vid dataluckor i lokalt tile-lager.

### 3.4 Säkerhet och cache i tile-proxy

Tile-proxy använder:

- tillåtlista för hosts/sökvägar
- blockering av inloggningsuppgifter i URL
- timeout, storleksgräns och redirect-skydd
- in-memory LRU-liknande cache med TTL

Det ger kontrollerad upstream-åtkomst utan att öppna proxy som generell tunnel.

## 4. Scheduler + Prefetcher

### 4.1 Viewport Tile Scheduler

`createViewportTileScheduler`:

- räknar ut synliga tiles för aktuell viewport
- prioriterar tiles med avstånd till center (`z/x/y`)
- kör i worker när möjligt, fallback till main thread vid worker-fel
- rapporterar status för observabilitet (antal synliga/prioriterade tiles)

Syftet är att minimera tiden till visuellt komplett viewport.

### 4.2 Predictive Prefetcher

`createViewportPrefetcher`:

- triggar på `moveend`/`zoomend`
- laddar först synliga tiles
- expanderar med ringar runt viewport (`prefetchRings`)
- gör look-ahead i pan-riktning
- förvärmer även kommande zoomnivåer (`zoomLevelsAhead`)
- begränsar samtidighet (`maxConcurrent`) och total minnesmängd (`maxFetchedEntries`)

Resultatet är färre kalla requests vid nästa användargester.

### 4.3 Samspel med self-hosted mode

I self-hosted mode används lokala templates i både scheduler-/prefetch-flöde och normal rendering. Det ger:

- högre cache-hit i browser + service worker
- mindre beroende av extern latens
- jämnare frame pacing vid snabb navigation

## 5. Render budget och prestandastyrning

Prestandabudgetar används för att hålla UX stabil:

- `bootToMapVisible`: mål för tid till synlig karta
- `bootToWeatherVisible`: separat budget för cache-hit/miss
- `apiBootstrap`: separat budget för cache-hit/miss
- `panelSwitch`: budget för interaktionsrespons
- `pointWeather`: budget för punktfrågor mot väder

Adaptive LOD sänker renderkostnad under rörelse genom att:

- justera building-opacity/height dynamiskt
- tillfälligt dölja vissa etiketter
- sänka pixel ratio i närzoom under aktiv rörelse

När kartan blir stilla återställs högre detaljgrad.

## 6. Väderoptimering

Väderoptimeringen är flerskiktad:

### 6.1 Server

- Värmer cache vid start (`warmWeatherCache`).
- Kör bakgrundsrefresh med intervall (`startBackgroundRefresh`).
- Har minnescache + filcache för stadsväder med TTL.
- Begränsar parallella upstream-anrop för att undvika överlast.

### 6.2 Klient

- Kör bootstrap med SWR (`fetchBootstrapWithSwr`).
- Läser/skriver snapshot i IndexedDB för snabb återstart med nära-offline-upplevelse.
- Applicerar färsk nätverksdata när den blir tillgänglig.

### 6.3 Nätverk och payload

- Komprimerar kompressibla API-svar men skippar tunga binära radar/tile-spår.
- Utnyttjar cache headers och service worker-policy för tile-URL:er.

Det minimerar både TTFB och bandbredd för väder- och kartflöden.

## 7. Verifiering och driftchecklista

1. Synka tiles:
   - `npm run tiles:sync`
2. Verifiera tilekedjan:
   - `npm run test:tiles`
3. Bygg produktionsbundle:
   - `npm run build`
4. Starta i önskat läge:
   - `SELF_HOSTED_TILES=true TILE_FALLBACK_UPSTREAM=true npm start`
5. Kontrollera endpoint-status:
   - `/api/endpoints`
   - `/api/tiles/proxy/stats`
   - `/healthz` och `/api/healthz`

## 8. Flödesdiagram

```mermaid
flowchart TD
    A[npm run tiles:sync] --> B[data/tiles materialiseras]
    B --> C[Node/Express tiles-router]
    C --> D[/tiles/vector och /tiles/dem]
    D --> E[MapLibre render pipeline]
    E --> F[Viewport scheduler]
    F --> G[Predictive prefetcher]
    G --> D
    D --> H{Tile saknas lokalt?}
    H -->|Nej| I[Servera lokal tile]
    H -->|Ja + fallback på| J[/api/tiles/proxy]
    J --> K[Upstream tile-host]
    H -->|Ja + fallback av| L[Fel/övervakning]
```
