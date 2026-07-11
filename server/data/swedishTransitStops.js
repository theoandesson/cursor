/** Major transit stops and stations in Stockholm, Göteborg and Malmö. */
export const SWEDISH_TRANSIT_STOPS = Object.freeze([
  // ── Stockholm T-bana ──────────────────────────────────────────────
  {
    stopId: "stockholm-kungstradgarden",
    name: "Kungsträdgården",
    lon: 18.0719,
    lat: 59.3305,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-blue"]
  },
  {
    stopId: "stockholm-t-centralen",
    name: "T-Centralen",
    lon: 18.0594,
    lat: 59.3318,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: [
      "stockholm-tbana-blue",
      "stockholm-tbana-red",
      "stockholm-tbana-green",
      "stockholm-pendeltag-41",
      "stockholm-pendeltag-43",
      "stockholm-pendeltag-44"
    ]
  },
  {
    stopId: "stockholm-radhuset",
    name: "Rådhuset",
    lon: 18.0448,
    lat: 59.3307,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-blue"]
  },
  {
    stopId: "stockholm-fridhemsplan",
    name: "Fridhemsplan",
    lon: 18.0296,
    lat: 59.3321,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-blue", "stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-sundbybergs-centrum",
    name: "Sundbybergs centrum",
    lon: 17.9694,
    lat: 59.3626,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-blue"]
  },
  {
    stopId: "stockholm-akalla",
    name: "Akalla",
    lon: 17.9145,
    lat: 59.4148,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-blue"]
  },
  {
    stopId: "stockholm-norsborg",
    name: "Norsborg",
    lon: 17.8148,
    lat: 59.2472,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red"]
  },
  {
    stopId: "stockholm-skarmholmen",
    name: "Skärholmen",
    lon: 17.9072,
    lat: 59.2765,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red"]
  },
  {
    stopId: "stockholm-liljeholmen",
    name: "Liljeholmen",
    lon: 18.0231,
    lat: 59.3108,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red"]
  },
  {
    stopId: "stockholm-slussen",
    name: "Slussen",
    lon: 18.0722,
    lat: 59.3197,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red", "stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-ostermalmstorg",
    name: "Östermalmstorg",
    lon: 18.0766,
    lat: 59.337,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red"]
  },
  {
    stopId: "stockholm-tekniska-hogskolan",
    name: "Tekniska högskolan",
    lon: 18.07,
    lat: 59.3475,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red"]
  },
  {
    stopId: "stockholm-universitetet",
    name: "Universitetet",
    lon: 18.055,
    lat: 59.3664,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red"]
  },
  {
    stopId: "stockholm-morby-centrum",
    name: "Mörby centrum",
    lon: 18.0427,
    lat: 59.3972,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-red"]
  },
  {
    stopId: "stockholm-hasselby-strand",
    name: "Hässelby strand",
    lon: 17.851,
    lat: 59.362,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-vallingby",
    name: "Vällingby",
    lon: 17.8741,
    lat: 59.3637,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-odenplan",
    name: "Odenplan",
    lon: 18.0513,
    lat: 59.343,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-gamla-stan",
    name: "Gamla stan",
    lon: 18.0689,
    lat: 59.325,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-gullmarsplan",
    name: "Gullmarsplan",
    lon: 18.0788,
    lat: 59.2995,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-globen",
    name: "Globen",
    lon: 18.0835,
    lat: 59.2936,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-green"]
  },
  {
    stopId: "stockholm-farsta-strand",
    name: "Farsta strand",
    lon: 18.0945,
    lat: 59.2445,
    cityId: "stockholm",
    type: "tunnelbana",
    lineIds: ["stockholm-tbana-green"]
  },
  // ── Stockholm pendeltåg ───────────────────────────────────────────
  {
    stopId: "stockholm-marsta",
    name: "Märsta",
    lon: 17.855,
    lat: 59.626,
    cityId: "stockholm",
    type: "pendeltåg",
    lineIds: ["stockholm-pendeltag-41"]
  },
  {
    stopId: "stockholm-solna",
    name: "Solna",
    lon: 17.944,
    lat: 59.518,
    cityId: "stockholm",
    type: "pendeltåg",
    lineIds: ["stockholm-pendeltag-41", "stockholm-pendeltag-43"]
  },
  {
    stopId: "stockholm-sodertalje-centrum",
    name: "Södertälje centrum",
    lon: 17.625,
    lat: 59.199,
    cityId: "stockholm",
    type: "pendeltåg",
    lineIds: ["stockholm-pendeltag-41"]
  },
  {
    stopId: "stockholm-balsta",
    name: "Bålsta",
    lon: 17.535,
    lat: 59.573,
    cityId: "stockholm",
    type: "pendeltåg",
    lineIds: ["stockholm-pendeltag-43"]
  },
  {
    stopId: "stockholm-nynashamn",
    name: "Nynäshamn",
    lon: 18.9,
    lat: 58.903,
    cityId: "stockholm",
    type: "pendeltåg",
    lineIds: ["stockholm-pendeltag-43"]
  },
  {
    stopId: "stockholm-uppsala-central",
    name: "Uppsala central",
    lon: 17.638,
    lat: 59.858,
    cityId: "stockholm",
    type: "pendeltåg",
    lineIds: ["stockholm-pendeltag-44"]
  },
  {
    stopId: "stockholm-alvsjo",
    name: "Älvsjö",
    lon: 18.05,
    lat: 59.28,
    cityId: "stockholm",
    type: "pendeltåg",
    lineIds: ["stockholm-pendeltag-44"]
  },
  // ── Göteborg spårvagn ─────────────────────────────────────────────
  {
    stopId: "goteborg-brunnsparken",
    name: "Brunnsparken",
    lon: 11.973,
    lat: 57.708,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: [
      "goteborg-sparvagn-1",
      "goteborg-sparvagn-3",
      "goteborg-sparvagn-5",
      "goteborg-sparvagn-6",
      "goteborg-sparvagn-11"
    ]
  },
  {
    stopId: "goteborg-centralstationen",
    name: "Centralstationen",
    lon: 11.973,
    lat: 57.708,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: [
      "goteborg-sparvagn-1",
      "goteborg-sparvagn-3",
      "goteborg-sparvagn-5",
      "goteborg-sparvagn-6"
    ]
  },
  {
    stopId: "goteborg-korsvagen",
    name: "Korsvägen",
    lon: 11.99,
    lat: 57.696,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-3", "goteborg-sparvagn-5"]
  },
  {
    stopId: "goteborg-chalmers",
    name: "Chalmers",
    lon: 11.97,
    lat: 57.689,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-3"]
  },
  {
    stopId: "goteborg-kalltorp",
    name: "Kålltorp",
    lon: 12.02,
    lat: 57.715,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-3"]
  },
  {
    stopId: "goteborg-tynnered",
    name: "Tynnered",
    lon: 11.89,
    lat: 57.655,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-1"]
  },
  {
    stopId: "goteborg-ostra-sjukhuset",
    name: "Östra sjukhuset",
    lon: 12.07,
    lat: 57.735,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-1", "goteborg-sparvagn-5"]
  },
  {
    stopId: "goteborg-lansmansgarden",
    name: "Länsmansgården",
    lon: 11.88,
    lat: 57.64,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-5", "goteborg-sparvagn-6"]
  },
  {
    stopId: "goteborg-kortedala",
    name: "Kortedala",
    lon: 12.06,
    lat: 57.745,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-6"]
  },
  {
    stopId: "goteborg-saltholmen",
    name: "Saltholmen",
    lon: 11.78,
    lat: 57.62,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-11"]
  },
  {
    stopId: "goteborg-jarnet",
    name: "Järntorget",
    lon: 11.95,
    lat: 57.699,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-3", "goteborg-sparvagn-11"]
  },
  {
    stopId: "goteborg-nordstan",
    name: "Nordstan",
    lon: 11.968,
    lat: 57.709,
    cityId: "goteborg",
    type: "spårvagn",
    lineIds: ["goteborg-sparvagn-1", "goteborg-sparvagn-5"]
  },
  // ── Malmö stadstunnel / Pågatåg ───────────────────────────────────
  {
    stopId: "malmo-central",
    name: "Malmö C",
    lon: 13.003,
    lat: 55.607,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: [
      "malmo-stadstunnel",
      "malmo-pagatag-ost",
      "malmo-pagatag-nord",
      "malmo-oresundstag"
    ]
  },
  {
    stopId: "malmo-triangeln",
    name: "Triangeln",
    lon: 13.006,
    lat: 55.605,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: ["malmo-stadstunnel", "malmo-pagatag-ost", "malmo-pagatag-nord"]
  },
  {
    stopId: "malmo-hyllie",
    name: "Hyllie",
    lon: 12.975,
    lat: 55.613,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: ["malmo-stadstunnel", "malmo-oresundstag"]
  },
  {
    stopId: "malmo-triangeln-ost",
    name: "Östervärn",
    lon: 13.04,
    lat: 55.6,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: ["malmo-stadstunnel"]
  },
  {
    stopId: "malmo-lund-central",
    name: "Lund C",
    lon: 13.19,
    lat: 55.706,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-nord"]
  },
  {
    stopId: "malmo-ystad",
    name: "Ystad",
    lon: 13.82,
    lat: 55.43,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-ost"]
  },
  {
    stopId: "malmo-trelleborg",
    name: "Trelleborg C",
    lon: 13.16,
    lat: 55.375,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-ost"]
  },
  {
    stopId: "malmo-rosengard",
    name: "Rosengård",
    lon: 13.03,
    lat: 55.59,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-ost"]
  },
  {
    stopId: "malmo-emporia",
    name: "Emporia",
    lon: 12.97,
    lat: 55.565,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-oresundstag"]
  },
  {
    stopId: "malmo-kopenhamn-h",
    name: "Köpenhamn H",
    lon: 12.57,
    lat: 55.673,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-oresundstag"]
  },
  {
    stopId: "malmo-oxie",
    name: "Oxie",
    lon: 13.1,
    lat: 55.58,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-ost"]
  },
  {
    stopId: "malmo-arp",
    name: "Arlöv",
    lon: 13.07,
    lat: 55.64,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-nord"]
  },
  {
    stopId: "malmo-sodervarn",
    name: "Södervärn",
    lon: 13.01,
    lat: 55.593,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: ["malmo-stadstunnel"]
  },
  {
    stopId: "malmo-vastra-hamnen",
    name: "Västra hamnen",
    lon: 12.975,
    lat: 55.613,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: ["malmo-stadstunnel"]
  },
  {
    stopId: "malmo-persborg",
    name: "Persborg",
    lon: 13.02,
    lat: 55.585,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: ["malmo-stadstunnel"]
  },
  {
    stopId: "malmo-dockan",
    name: "Dockan",
    lon: 12.995,
    lat: 55.61,
    cityId: "malmo",
    type: "stadstunnel",
    lineIds: ["malmo-stadstunnel"]
  },
  {
    stopId: "malmo-ribersborg",
    name: "Ribersborg",
    lon: 12.965,
    lat: 55.6,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-oresundstag"]
  },
  {
    stopId: "malmo-bunkeflostrand",
    name: "Bunkeflostrand",
    lon: 12.94,
    lat: 55.555,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-oresundstag"]
  },
  {
    stopId: "malmo-svedala",
    name: "Svedala",
    lon: 13.35,
    lat: 55.505,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-ost"]
  },
  {
    stopId: "malmo-eslov",
    name: "Eslöv",
    lon: 13.3,
    lat: 55.84,
    cityId: "malmo",
    type: "pendeltåg",
    lineIds: ["malmo-pagatag-nord"]
  }
]);
