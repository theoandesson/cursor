import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/startServer.js";
import { warmWeatherCache } from "../server/services/weatherWarmer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const staticDirectory = path.join(workspaceRoot, "client");

const EXPECTED_ENDPOINT_PATHS = [
  "/api/healthz",
  "/api/endpoints",
  "/api/bootstrap",
  "/api/perf",
  "/api/perf/summary",
  "/api/perf/reset",
  "/api/cities",
  "/api/cities/:cityId",
  "/api/weather/point?lon=&lat=&hours=",
  "/api/weather/cities",
  "/api/weather/cities/:cityId",
  "/api/radar/metadata",
  "/api/radar/frames?hours=&limit=&offset=",
  "/api/radar/frames/:frameKey.png",
  "/tiles/vector/tilejson.json",
  "/tiles/vector/:z/:x/:y.pbf",
  "/api/pressure/metadata",
  "/api/pressure/frames?hours=&limit=&offset=",
  "/api/pressure/frames/:frameKey.geojson",
  "/tiles/vector/tilejson.json",
  "/tiles/vector/:z/:x/:y.pbf",
  "/tiles/fonts/:fontstack/:range.pbf",
  "/api/tiles/proxy?url=",
  "/api/tiles/proxy/stats",
  "/api/search?q=&limit=",
  "/api/search/reverse?lon=&lat=",
  "/api/pois?search=&category=&limit=&offset=",
  "/api/pois/near?lon=&lat=&radiusKm=5&limit=20",
  "/api/pois/:poiId",
  "/api/traffic/segments?minLon=&minLat=&maxLon=&maxLat=&limit=",
  "/api/traffic/near?lon=&lat=&radiusKm=10&limit=20",
  "/api/traffic?level=&minLon=&minLat=&maxLon=&maxLat=",
  "/api/transit?mode=&minLon=&minLat=&maxLon=&maxLat=",
  "/api/transit/lines?cityId=&type=&limit=&offset=",
  "/api/transit/stops?cityId=&type=&lineId=&search=&limit=&offset=",
  "/api/transit/stops/near?lon=&lat=&radiusKm=2&limit=20"
];

const NEW_CLIENT_ASSETS = [
  "/src/search/createSearchControl.js",
  "/src/search/searchService.js",
  "/src/places/createPlaceCard.js",
  "/src/places/placeService.js",
  "/src/places/poiCategories.js",
  "/src/map/modes/createMapModeControl.js",
  "/src/map/modes/mapModes.js",
  "/src/cache/tileCachePolicy.js",
  "/src/styles/search.css",
  "/src/styles/place-card.css",
  "/src/traffic/createTrafficFlowLayer.js",
  "/src/traffic/createTransitLayer.js",
  "/src/traffic/trafficService.js",
  "/src/overlays/layers/createTrafficFlowPlugin.js",
  "/src/overlays/layers/createTransitPlugin.js",
  "/src/perf/perfTracker.js",
  "/src/navigation/routes.js",
  "/src/store/weatherStore.js",
  "/src/api/bootstrapClient.js",
  "/src/overlays/bootstrap/createOverlaySystem.js",
  "/src/overlays/layers/createSmhiRadarPlugin.js",
  "/src/overlays/layers/createPressureSystemsPlugin.js",
  "/src/overlays/api/pressureApiClient.js"
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (baseUrl, pathOrUrl, { method = "GET" } = {}) => {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
  const response = await fetch(url, { method });
  const contentType = response.headers.get("content-type") ?? "";
  let body = null;

  if (contentType.includes("application/json") || contentType.includes("application/geo+json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return { response, body, contentType };
};

const expectJsonError = async (baseUrl, pathOrUrl, expectedStatus, errorIncludes) => {
  const { response, body } = await request(baseUrl, pathOrUrl);
  assert(
    response.status === expectedStatus,
    `${pathOrUrl} svarade ${response.status}, förväntat ${expectedStatus}.`
  );
  assert(typeof body === "object" && body !== null, `${pathOrUrl} returnerade inte JSON.`);
  assert(typeof body.error === "string", `${pathOrUrl} saknar error-fält.`);
  if (errorIncludes) {
    assert(
      body.error.includes(errorIncludes),
      `${pathOrUrl} error "${body.error}" matchade inte "${errorIncludes}".`
    );
  }
  return body;
};

const testCoreHealth = async (baseUrl) => {
  const { response: indexResponse, body: html } = await request(baseUrl, "/");
  assert(indexResponse.ok, `index.html svarade ${indexResponse.status}`);
  assert(
    typeof html === "string" && html.includes("Sverige 3D-karta"),
    "index.html verkar inte vara korrekt serverad."
  );

  const { response: healthResponse } = await request(baseUrl, "/healthz");
  assert(healthResponse.ok, `/healthz svarade ${healthResponse.status}`);

  const { response: apiHealthResponse } = await request(baseUrl, "/api/healthz");
  assert(apiHealthResponse.ok, `/api/healthz svarade ${apiHealthResponse.status}`);

  const { response: tileJsonResponse, body: tileJsonBody } = await request(
    baseUrl,
    "/tiles/vector/tilejson.json"
  );
  assert(tileJsonResponse.ok, `/tiles/vector/tilejson.json svarade ${tileJsonResponse.status}`);
  assert(
    typeof tileJsonBody === "object" &&
      tileJsonBody !== null &&
      Array.isArray(tileJsonBody.tiles),
    "/tiles/vector/tilejson.json returnerade inte giltig TileJSON."
  );
};

const testEndpointsCatalog = async (baseUrl) => {
  const { response, body } = await request(baseUrl, "/api/endpoints");
  assert(response.ok, `/api/endpoints svarade ${response.status}`);
  assert(Array.isArray(body.endpoints), "/api/endpoints saknar endpoints-array.");

  const paths = body.endpoints.map((entry) => entry.path);
  for (const expectedPath of EXPECTED_ENDPOINT_PATHS) {
    assert(
      paths.includes(expectedPath),
      `/api/endpoints saknar route: ${expectedPath}`
    );
  }

  assert(
    body.endpoints.length === EXPECTED_ENDPOINT_PATHS.length,
    `/api/endpoints listar ${body.endpoints.length} routes, förväntat ${EXPECTED_ENDPOINT_PATHS.length}.`
  );
};

const testSearchValidation = async (baseUrl) => {
  await expectJsonError(baseUrl, "/api/search?q=", 400, "Ogiltig sökfråga");
  await expectJsonError(baseUrl, "/api/search?q=%20%20", 400, "Ogiltig sökfråga");
  await expectJsonError(baseUrl, "/api/search", 400, "Ogiltig sökfråga");
  await expectJsonError(baseUrl, "/api/search?q=stockholm&limit=0", 400, "Ogiltig limit");
  await expectJsonError(baseUrl, "/api/search?q=stockholm&limit=999", 400, "Ogiltig limit");
  await expectJsonError(baseUrl, "/api/search?q=stockholm&limit=abc", 400, "Ogiltig limit");

  await expectJsonError(
    baseUrl,
    "/api/search/reverse",
    400,
    "Ogiltiga koordinater"
  );
  await expectJsonError(
    baseUrl,
    "/api/search/reverse?lon=0&lat=0",
    400,
    "Ogiltiga koordinater"
  );
  await expectJsonError(
    baseUrl,
    "/api/search/reverse?lon=18.06",
    400,
    "Ogiltiga koordinater"
  );
};

const testPoisEndpoints = async (baseUrl) => {
  const { response: listResponse, body: listPayload } = await request(
    baseUrl,
    "/api/pois?limit=5&offset=0"
  );
  assert(listResponse.ok, `/api/pois svarade ${listResponse.status}`);
  assert(Array.isArray(listPayload.pois), "/api/pois saknar pois-array.");
  assert(listPayload.pois.length === 5, "/api/pois?limit=5 returnerade fel antal POI.");
  assert(listPayload.total >= listPayload.pois.length, "/api/pois total är mindre än sidan.");
  assert(listPayload.limit === 5, "/api/pois limit speglas inte korrekt.");
  assert(listPayload.offset === 0, "/api/pois offset speglas inte korrekt.");

  const firstPoi = listPayload.pois[0];
  assert(firstPoi?.id, "/api/pois returnerade POI utan id.");
  assert(firstPoi.categoryName, "/api/pois returnerade POI utan categoryName.");

  const { response: searchResponse, body: searchPayload } = await request(
    baseUrl,
    "/api/pois?search=stockholm&limit=3"
  );
  assert(searchResponse.ok, `/api/pois?search svarade ${searchResponse.status}`);
  assert(searchPayload.pois.length >= 1, "/api/pois?search returnerade inga träffar.");
  assert(
    searchPayload.pois.every(
      (poi) =>
        poi.name.toLowerCase().includes("stockholm") ||
        poi.address.toLowerCase().includes("stockholm") ||
        poi.cityId?.toLowerCase().includes("stockholm")
    ),
    "/api/pois?search=stockholm innehöll irrelevanta träffar."
  );

  const { response: categoryResponse, body: categoryPayload } = await request(
    baseUrl,
    "/api/pois?category=cafe&limit=5"
  );
  assert(categoryResponse.ok, `/api/pois?category svarade ${categoryResponse.status}`);
  assert(categoryPayload.pois.length >= 1, "/api/pois?category=cafe returnerade inga träffar.");
  assert(
    categoryPayload.pois.every((poi) => poi.category === "cafe"),
    "/api/pois?category=cafe innehöll fel kategori."
  );

  const { response: byIdResponse, body: byIdPayload } = await request(
    baseUrl,
    `/api/pois/${encodeURIComponent(firstPoi.id)}`
  );
  assert(byIdResponse.ok, `/api/pois/:poiId svarade ${byIdResponse.status}`);
  assert(byIdPayload.poi?.id === firstPoi.id, "/api/pois/:poiId returnerade fel POI.");

  await expectJsonError(baseUrl, "/api/pois/unknown-poi-id", 404, "Okänd POI");

  await expectJsonError(baseUrl, "/api/pois?limit=0", 400, "Ogiltig limit");
  await expectJsonError(baseUrl, "/api/pois?offset=-1", 400, "Ogiltig offset");

  const { response: nearResponse, body: nearPayload } = await request(
    baseUrl,
    "/api/pois/near?lon=18.06&lat=59.32&radiusKm=2&limit=3"
  );
  assert(nearResponse.ok, `/api/pois/near svarade ${nearResponse.status}`);
  assert(Array.isArray(nearPayload.pois), "/api/pois/near saknar pois-array.");
  assert(nearPayload.pois.length >= 1, "/api/pois/near returnerade inga närliggande POI.");
  assert(nearPayload.radiusKm === 2, "/api/pois/near speglade inte radiusKm.");
  assert(nearPayload.limit === 3, "/api/pois/near speglade inte limit.");
  assert(
    nearPayload.pois.every((poi) => typeof poi.distanceKm === "number"),
    "/api/pois/near saknar distanceKm på träffar."
  );

  const distances = nearPayload.pois.map((poi) => poi.distanceKm);
  assert(
    distances.every((distance, index) => index === 0 || distance >= distances[index - 1]),
    "/api/pois/near returnerade inte sorterade avstånd."
  );

  await expectJsonError(baseUrl, "/api/pois/near", 400, "Ogiltiga koordinater");
  await expectJsonError(baseUrl, "/api/pois/near?lon=18&lat=59&radiusKm=0", 400, "radiusKm");
  await expectJsonError(baseUrl, "/api/pois/near?lon=18&lat=59&radiusKm=999", 400, "radiusKm");
  await expectJsonError(baseUrl, "/api/pois/near?lon=18&lat=59&limit=0", 400, "Ogiltig limit");
};

const testTrafficEndpoints = async (baseUrl) => {
  const { response: listResponse, body: listPayload } = await request(
    baseUrl,
    "/api/traffic/segments?limit=5"
  );
  assert(listResponse.ok, `/api/traffic/segments svarade ${listResponse.status}`);
  assert(Array.isArray(listPayload.segments), "/api/traffic/segments saknar segments-array.");
  assert(listPayload.segments.length === 5, "/api/traffic/segments?limit=5 returnerade fel antal.");
  assert(listPayload.segments[0]?.roadName, "/api/traffic/segments returnerade segment utan roadName.");

  const { response: nearResponse, body: nearPayload } = await request(
    baseUrl,
    "/api/traffic/near?lon=18.06&lat=59.32&radiusKm=20&limit=3"
  );
  assert(nearResponse.ok, `/api/traffic/near svarade ${nearResponse.status}`);
  assert(Array.isArray(nearPayload.segments), "/api/traffic/near saknar segments-array.");
  assert(nearPayload.segments.length >= 1, "/api/traffic/near returnerade inga träffar.");
  assert(
    nearPayload.segments.every((segment) => typeof segment.distanceKm === "number"),
    "/api/traffic/near saknar distanceKm på träffar."
  );

  const { response: geoResponse, body: geoPayload } = await request(baseUrl, "/api/traffic?limit=5");
  assert(geoResponse.ok, `/api/traffic svarade ${geoResponse.status}`);
  assert(geoPayload.geojson?.type === "FeatureCollection", "/api/traffic saknar geojson FeatureCollection.");
};

const testTransitEndpoints = async (baseUrl) => {
  const { response: geoResponse, body: geoPayload } = await request(baseUrl, "/api/transit");
  assert(geoResponse.ok, `/api/transit svarade ${geoResponse.status}`);
  assert(geoPayload.type === "FeatureCollection", "/api/transit saknar FeatureCollection.");
  assert(Array.isArray(geoPayload.features), "/api/transit saknar features-array.");

  const { response: linesResponse, body: linesPayload } = await request(
    baseUrl,
    "/api/transit/lines?limit=5&offset=0"
  );
  assert(linesResponse.ok, `/api/transit/lines svarade ${linesResponse.status}`);
  assert(Array.isArray(linesPayload.lines), "/api/transit/lines saknar lines-array.");
  assert(linesPayload.lines.length >= 1, "/api/transit/lines returnerade inga linjer.");

  const { response: stopsResponse, body: stopsPayload } = await request(
    baseUrl,
    "/api/transit/stops?limit=5&offset=0"
  );
  assert(stopsResponse.ok, `/api/transit/stops svarade ${stopsResponse.status}`);
  assert(Array.isArray(stopsPayload.stops), "/api/transit/stops saknar stops-array.");
  assert(stopsPayload.stops.length >= 1, "/api/transit/stops returnerade inga hållplatser.");

  await expectJsonError(baseUrl, "/api/transit?mode=invalid", 400, "färdsätt");
  await expectJsonError(baseUrl, "/api/traffic?level=invalid", 400, "trafiknivå");
};

const testTileProxySecurity = async (baseUrl) => {
  await expectJsonError(baseUrl, "/api/tiles/proxy", 400, "url");
  await expectJsonError(baseUrl, "/api/tiles/proxy?url=not-a-url", 400, "Ogiltig url");
  await expectJsonError(
    baseUrl,
    "/api/tiles/proxy?url=https://evil.com/tile.png",
    403,
    "inte tillåten"
  );
  await expectJsonError(
    baseUrl,
    "/api/tiles/proxy?url=https://tiles.openfreemap.org/forbidden/tile.pbf",
    403,
    "inte tillåten"
  );
  await expectJsonError(
    baseUrl,
    "/api/tiles/proxy?url=http://tiles.openfreemap.org/planet/test.pbf",
    403,
    "inte tillåten"
  );

  const { response: statsResponse, body: statsPayload } = await request(
    baseUrl,
    "/api/tiles/proxy/stats"
  );
  assert(statsResponse.ok, `/api/tiles/proxy/stats svarade ${statsResponse.status}`);
  assert(typeof statsPayload.entries === "number", "/api/tiles/proxy/stats saknar entries.");
  assert(typeof statsPayload.maxEntries === "number", "/api/tiles/proxy/stats saknar maxEntries.");
  assert(typeof statsPayload.ttlMs === "number", "/api/tiles/proxy/stats saknar ttlMs.");
};

const testClientAssets = async (baseUrl) => {
  for (const assetPath of NEW_CLIENT_ASSETS) {
    const { response, body } = await request(baseUrl, assetPath);
    assert(response.ok, `${assetPath} svarade ${response.status}`);
    assert(
      typeof body === "string" && body.length > 0,
      `${assetPath} verkar vara tom.`
    );
  }

  const { response: mainScriptResponse } = await request(baseUrl, "/src/main.js");
  assert(mainScriptResponse.ok, `/src/main.js svarade ${mainScriptResponse.status}`);

  const { response: serviceWorkerResponse } = await request(baseUrl, "/sw.js");
  assert(serviceWorkerResponse.ok, `/sw.js svarade ${serviceWorkerResponse.status}`);
};

const testExistingApis = async (baseUrl) => {
  const { response: citiesResponse, body: citiesPayload } = await request(baseUrl, "/api/cities?limit=5");
  assert(citiesResponse.ok, `/api/cities svarade ${citiesResponse.status}`);
  assert(
    Array.isArray(citiesPayload.cities) && citiesPayload.cities.length === 5,
    "/api/cities returnerade inte förväntad pagination."
  );
};

const testBootstrapAndPerf = async (baseUrl) => {
  const { response: htmlResponse, body: html } = await request(baseUrl, "/");
  assert(html.includes('id="app-nav"'), "index.html saknar navigationspanelen.");

  const { response: perfSummaryResponse, body: perfSummary } = await request(
    baseUrl,
    "/api/perf/summary"
  );
  assert(perfSummaryResponse.ok, `/api/perf/summary svarade ${perfSummaryResponse.status}`);
  assert(
    typeof perfSummary.totalRequests === "number",
    "/api/perf/summary returnerade inte förväntad struktur."
  );

  await warmWeatherCache({ forecastHours: 24 });

  const { response: bootstrapResponse, body: bootstrapPayload } = await request(
    baseUrl,
    "/api/bootstrap"
  );
  assert(bootstrapResponse.ok, `/api/bootstrap svarade ${bootstrapResponse.status}`);
  assert(
    bootstrapPayload.cities && bootstrapPayload.weather && bootstrapPayload.version === "1",
    "/api/bootstrap returnerade inte förväntad struktur."
  );
  assert(
    bootstrapResponse.headers.get("x-response-time"),
    "/api/bootstrap saknar X-Response-Time header."
  );

  const { response: perfTrackerResponse } = await request(baseUrl, "/src/perf/perfTracker.js");
  assert(perfTrackerResponse.ok, `/src/perf/perfTracker.js svarade ${perfTrackerResponse.status}`);
};

const testRadarEndpoints = async (baseUrl) => {
  const { response: metaResponse, body: metaPayload } = await request(baseUrl, "/api/radar/metadata");
  assert(metaResponse.ok, `/api/radar/metadata svarade ${metaResponse.status}`);
  assert(
    Array.isArray(metaPayload.coordinates) && metaPayload.coordinates.length === 4,
    "/api/radar/metadata saknar koordinater."
  );

  const { response: framesResponse, body: framesPayload } = await request(
    baseUrl,
    "/api/radar/frames?hours=1&limit=3"
  );
  assert(framesResponse.ok, `/api/radar/frames svarade ${framesResponse.status}`);
  assert(
    Array.isArray(framesPayload.frames) && framesPayload.frames.length >= 1,
    "/api/radar/frames returnerade inga bilder."
  );

  const { response: imageResponse, contentType } = await request(
    baseUrl,
    framesPayload.frames.at(-1).imageUrl
  );
  assert(imageResponse.ok, `Radar PNG svarade ${imageResponse.status}`);
  assert(contentType.includes("image/png"), "Radar PNG returnerade felaktigt content-type.");
};

const testPressureEndpoints = async (baseUrl) => {
  const { response: metaResponse, body: metaPayload } = await request(baseUrl, "/api/pressure/metadata");
  assert(metaResponse.ok, `/api/pressure/metadata svarade ${metaResponse.status}`);
  assert(metaPayload.legend?.high?.color, "/api/pressure/metadata saknar legend.");

  const { response: framesResponse, body: framesPayload } = await request(
    baseUrl,
    "/api/pressure/frames?hours=3&limit=3"
  );
  assert(framesResponse.ok, `/api/pressure/frames svarade ${framesResponse.status}`);
  assert(
    Array.isArray(framesPayload.frames) && framesPayload.frames.length >= 1,
    "/api/pressure/frames returnerade inga prognossteg."
  );

  const frameKey = framesPayload.frames[0].key;
  const { response: geoResponse, body: geoPayload } = await request(
    baseUrl,
    `/api/pressure/frames/${frameKey}.geojson`
  );
  assert(geoResponse.ok, `/api/pressure/frames/${frameKey}.geojson svarade ${geoResponse.status}`);
  assert(
    geoPayload.type === "FeatureCollection" && Array.isArray(geoPayload.features),
    "Tryckframe saknar GeoJSON-features."
  );
};

const run = async () => {
  const host = "127.0.0.1";
  const port = 4199;
  const baseUrl = `http://${host}:${port}`;

  const { server } = await startServer({
    host,
    port,
    staticDirectory
  });

  try {
    await testCoreHealth(baseUrl);
    await testEndpointsCatalog(baseUrl);
    await testSearchValidation(baseUrl);
    await testPoisEndpoints(baseUrl);
    await testTrafficEndpoints(baseUrl);
    await testTransitEndpoints(baseUrl);
    await testTileProxySecurity(baseUrl);
    await testClientAssets(baseUrl);
    await testExistingApis(baseUrl);
    await testBootstrapAndPerf(baseUrl);
    await testRadarEndpoints(baseUrl);
    await testPressureEndpoints(baseUrl);

    console.log("Smoke-test klar: server, API, bootstrap, radar, tryck, prestanda, säkerhet och klientfiler fungerar.");
  } finally {
    await new Promise((resolve, reject) => {
      if (!server.listening) {
        resolve();
        return;
      }

      server.close((error) => {
        if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
