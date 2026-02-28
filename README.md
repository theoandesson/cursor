# Sverige 3D-karta med SMHI-väder

Högupplöst 3D-karta över Sverige med live väderdata från SMHI.

## Krav

- **Node.js 18 eller nyare** (rekommenderat: 20 eller 22)
- **npm** (följer med Node.js)
- **Internetanslutning** (kartdata och väder laddas live)
- **Modern webbläsare** (Chrome, Firefox, Edge)

### Kontrollera din Node-version

```bash
node -v
```

Om du ser `v18.x.x` eller högre är du redo. Om inte, ladda ner senaste versionen från [nodejs.org](https://nodejs.org/).

## Starta appen

### 1. Klona repot

```bash
git clone https://github.com/theoandesson/cursor.git
cd cursor
```

### 2. Byt till rätt branch

```bash
git checkout cursor/zoomning-utan-lagg-7389
```

### 3. Installera beroenden

```bash
npm install
```

Du ska se något i stil med:

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

Webbläsaren öppnas automatiskt. Om den inte öppnas, gå manuellt till:

**http://127.0.0.1:4173**

### 5. Använd appen

- **Zooma in/ut**: scrollhjul, `+`/`-` tangenter, dubbelklick, eller knapparna uppe till höger
- **Panorera**: klicka och dra med musen
- **Rotera/luta/flytta med panelen**: använd knapparna `R-`/`R+` (rotation), `L-`/`L+` (lutning) och `N/V/O/S` (forflyttning)
- **Se väder**: markörer visas automatiskt för 12 svenska städer
- **Klicka var som helst** på kartan för detaljerad väder-popup med 6-timmars prognos

## Stoppa servern

Tryck `Ctrl + C` i terminalen.

## Smoke-test

```bash
npm run smoke
```

Verifierar att servern fungerar och att health-endpoint svarar.

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
