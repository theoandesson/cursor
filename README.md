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
# Sverige 3D-karta med SMHI-väder

Högupplöst 3D-karta över Sverige med live väderdata från SMHI.

## Krav

| Krav | Minimum | Rekommenderat |
|------|---------|---------------|
| **Node.js** | 18.0.0 | 20 LTS eller 22 LTS |
| **npm** | Medföljer Node.js | – |
| **Internet** | Krävs | – |
| **Webbläsare** | Modern (Chrome, Firefox, Edge) | Chrome |

### Kontrollera att Node.js är installerat

Öppna en terminal (Kommandotolken, PowerShell, eller Terminal på macOS/Linux) och skriv:

```bash
node -v
```

Du bör se något i stil med `v20.11.1`. Om kommandot inte hittas eller versionen är lägre än `v18`, installera senaste LTS-versionen från [nodejs.org](https://nodejs.org/).

Kontrollera även att npm finns:

```bash
npm -v
```

## Starta appen – steg för steg

### 1. Klona repot

Öppna en terminal och navigera till den mapp där du vill spara projektet:

```bash
cd ~/projekt
```

Klona sedan repot:

```bash
git clone https://github.com/theoandesson/cursor.git
```

Gå in i projektmappen:

```bash
cd cursor
```

### 2. Hämta senaste versionen

`main`-branchen innehåller bara den initiala koden. **Alla förbättringar** (zoomning utan lagg, 70+ städer, orientering, väder-API) finns på branchen `cursor/applikationsstart-kommando-1944`:

```bash
git checkout cursor/applikationsstart-kommando-1944
git pull origin cursor/applikationsstart-kommando-1944
Se till att du har den senaste koden från `main`-branchen:

```bash
git checkout main
git pull origin main
```

### 3. Installera beroenden

Installera alla npm-paket som projektet behöver:

```bash
npm install
```

Du ska se något liknande:

```
added 75 packages in 1s
```

Om du får felmeddelanden, se [Felsökning](#felsökning) nedan.

### 4. Starta servern

```bash
npm start
```

Du ska se detta i terminalen:

```
Sverige 3D-karta startad: http://127.0.0.1:4173
LOD: låg detalj vid rörelse, hög detalj i idle.
```

**Webbläsaren öppnas automatiskt.** Om den inte öppnas, kopiera länken ovan och klistra in i din webbläsare.

> **Tips:** Vill du använda en annan port? Kör med miljövariabeln `PORT`:
>
> ```bash
> PORT=3000 npm start
> ```
>
> Vill du stänga av att webbläsaren öppnas automatiskt?
>
> ```bash
> AUTO_OPEN_BROWSER=false npm start
> ```

### 5. Använd appen

- **Zooma in/ut** – scrollhjul, `+`/`-` tangenter, dubbelklick, eller knapparna uppe till höger
- **Panorera** – klicka och dra med musen
- **Rotera/luta/flytta** – använd knapparna `R-`/`R+` (rotation), `L-`/`L+` (lutning) och `N/V/O/S` (förflyttning)
- **Zooma in/ut** – scrollhjul, `+`/`-` tangenter, dubbelklick, eller knapparna uppe till vänster
- **Panorera** – klicka och dra med musen
- **Navigeringspanel** – använd pilarna (förflyttning), `↺`/`↻` (rotation), `Tilt -`/`Tilt +` (lutning) och `⌂` (återställning)
- **Inverterad styrning** – växla med knappen `Inverterad: På/Av` i navigeringspanelen
- **Se väder** – markörer visas automatiskt för 70+ svenska städer
- **Klicka var som helst** på kartan för detaljerad väder-popup med 6-timmars prognos

## Stoppa servern

Tryck `Ctrl + C` i terminalen.

## Smoke-test

```bash
npm run smoke
```

Verifierar att servern fungerar och att health-endpoint svarar.

## API-endpoints

Servern exponerar även ett API som klienten använder för stad- och väderdata:

- `GET /api/healthz` – API-status
- `GET /api/endpoints` – lista alla tillgängliga API-endpoints
- `GET /api/cities` – lista svenska städer (stöd för `search`, `limit`, `offset`)
- `GET /api/cities/:cityId` – hämta en enskild stad
- `GET /api/weather/point?lon=<lon>&lat=<lat>&hours=<1-48>` – väder för valfri punkt
- `GET /api/weather/cities` – väder för alla städer (`refresh=true` för forcad uppdatering)
- `GET /api/weather/cities/:cityId` – väder för en specifik stad

Exempel:

```bash
curl "http://127.0.0.1:4173/api/cities?limit=20"
curl "http://127.0.0.1:4173/api/weather/cities?limit=10"
curl "http://127.0.0.1:4173/api/weather/point?lon=18.0686&lat=59.3293"
```

## Felsökning

### "command not found: node" eller "node is not recognized"

Node.js är inte installerat. Ladda ner det från [nodejs.org](https://nodejs.org/) (välj LTS-versionen).

### "SyntaxError: Cannot use import statement outside a module"

Din Node-version är för gammal. Uppgradera till Node.js 18 eller nyare:

```bash
node -v
```

### "EADDRINUSE: address already in use"

Port 4173 används redan. Antingen stäng programmet som använder porten, eller kör med en annan port:

```bash
PORT=3000 npm start
```

### "npm install" ger fel

Försök rensa npm-cache och installera om:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Kartan laddas inte / vit sida

- Kontrollera att du har internetanslutning (kartdata laddas från externa servrar)
- Öppna webbläsarens utvecklarverktyg (`F12`) och kolla Console-fliken för felmeddelanden
- Testa att ladda om sidan med `Ctrl + Shift + R`

### Väderdata visas inte

- SMHI API kräver internetanslutning
- API:et fungerar bara för koordinater inom Sverige
- Kontrollera Console-fliken i utvecklarverktygen (`F12`) för eventuella nätverksfel
