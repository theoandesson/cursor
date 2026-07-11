/** Major public transit lines in Stockholm, Göteborg and Malmö. */
export const SWEDISH_TRANSIT_LINES = Object.freeze([
  // ── Stockholm T-bana ──────────────────────────────────────────────
  {
    lineId: "stockholm-tbana-blue",
    name: "T-bana Blå linje",
    color: "#007DBA",
    type: "tunnelbana",
    cityId: "stockholm",
    coordinates: [
      [18.0719, 59.3305],
      [18.0594, 59.3318],
      [18.0448, 59.3307],
      [18.0296, 59.3321],
      [18.0152, 59.3371],
      [17.9694, 59.3626],
      [17.9448, 59.3702],
      [17.9286, 59.3805],
      [17.907, 59.3885],
      [17.9145, 59.4148]
    ]
  },
  {
    lineId: "stockholm-tbana-red",
    name: "T-bana Röd linje",
    color: "#C41E3A",
    type: "tunnelbana",
    cityId: "stockholm",
    coordinates: [
      [17.8148, 59.2472],
      [17.8561, 59.2914],
      [17.8969, 59.3125],
      [18.0231, 59.3108],
      [18.061, 59.3178],
      [18.0722, 59.3197],
      [18.0594, 59.3318],
      [18.0766, 59.337],
      [18.0842, 59.3452],
      [18.07, 59.3475],
      [18.055, 59.3664],
      [18.0427, 59.3972]
    ]
  },
  {
    lineId: "stockholm-tbana-green",
    name: "T-bana Grön linje",
    color: "#4CA22F",
    type: "tunnelbana",
    cityId: "stockholm",
    coordinates: [
      [17.851, 59.362],
      [17.8741, 59.3637],
      [18.0063, 59.3065],
      [18.0365, 59.3165],
      [18.0509, 59.3186],
      [18.0689, 59.325],
      [18.0594, 59.3318],
      [18.0513, 59.343],
      [18.037, 59.342],
      [18.019, 59.341],
      [18.0788, 59.2995],
      [18.0835, 59.2936],
      [18.0945, 59.2445]
    ]
  },
  // ── Stockholm pendeltåg ───────────────────────────────────────────
  {
    lineId: "stockholm-pendeltag-41",
    name: "Pendeltåg 41 (Märsta–Södertälje)",
    color: "#E30613",
    type: "pendeltåg",
    cityId: "stockholm",
    coordinates: [
      [17.855, 59.626],
      [17.944, 59.518],
      [18.0594, 59.3318],
      [18.072, 59.319],
      [17.907, 59.276],
      [17.625, 59.199]
    ]
  },
  {
    lineId: "stockholm-pendeltag-43",
    name: "Pendeltåg 43 (Bålsta–Nynäshamn)",
    color: "#E30613",
    type: "pendeltåg",
    cityId: "stockholm",
    coordinates: [
      [17.535, 59.573],
      [17.82, 59.45],
      [18.0594, 59.3318],
      [18.072, 59.319],
      [18.18, 59.2],
      [18.9, 58.903]
    ]
  },
  {
    lineId: "stockholm-pendeltag-44",
    name: "Pendeltåg 44 (Uppsala–Älvsjö)",
    color: "#005293",
    type: "pendeltåg",
    cityId: "stockholm",
    coordinates: [
      [17.638, 59.858],
      [17.72, 59.72],
      [17.9, 59.55],
      [18.0594, 59.3318],
      [18.05, 59.28]
    ]
  },
  // ── Göteborg spårvagn ─────────────────────────────────────────────
  {
    lineId: "goteborg-sparvagn-1",
    name: "Spårvagn 1 (Tynnered–Östra sjukhuset)",
    color: "#FFFFFF",
    type: "spårvagn",
    cityId: "goteborg",
    coordinates: [
      [11.89, 57.655],
      [11.95, 57.695],
      [11.973, 57.708],
      [12.01, 57.72],
      [12.04, 57.73],
      [12.07, 57.735]
    ]
  },
  {
    lineId: "goteborg-sparvagn-3",
    name: "Spårvagn 3 (Kålltorp–Marklandsgatan)",
    color: "#0061AE",
    type: "spårvagn",
    cityId: "goteborg",
    coordinates: [
      [12.02, 57.715],
      [11.973, 57.708],
      [11.96, 57.697],
      [11.94, 57.685],
      [11.92, 57.675]
    ]
  },
  {
    lineId: "goteborg-sparvagn-5",
    name: "Spårvagn 5 (Länsmansgården–Östra sjukhuset)",
    color: "#FFD100",
    type: "spårvagn",
    cityId: "goteborg",
    coordinates: [
      [11.88, 57.64],
      [11.92, 57.67],
      [11.95, 57.695],
      [11.973, 57.708],
      [12.04, 57.73]
    ]
  },
  {
    lineId: "goteborg-sparvagn-6",
    name: "Spårvagn 6 (Kortedala–Länsmansgården)",
    color: "#E30613",
    type: "spårvagn",
    cityId: "goteborg",
    coordinates: [
      [12.06, 57.745],
      [12.01, 57.72],
      [11.973, 57.708],
      [11.95, 57.695],
      [11.88, 57.64]
    ]
  },
  {
    lineId: "goteborg-sparvagn-11",
    name: "Spårvagn 11 (Saltholmen–Brunnsparken)",
    color: "#0061AE",
    type: "spårvagn",
    cityId: "goteborg",
    coordinates: [
      [11.78, 57.62],
      [11.85, 57.66],
      [11.92, 57.695],
      [11.973, 57.708]
    ]
  },
  // ── Malmö stadstunnel / Pågatåg ───────────────────────────────────
  {
    lineId: "malmo-stadstunnel",
    name: "Malmö stadstunnel",
    color: "#00A651",
    type: "stadstunnel",
    cityId: "malmo",
    coordinates: [
      [12.999, 55.609],
      [13.003, 55.607],
      [13.006, 55.605],
      [13.01, 55.603],
      [13.015, 55.601]
    ]
  },
  {
    lineId: "malmo-pagatag-ost",
    name: "Pågatåg Österut (Malmö–Ystad)",
    color: "#E30613",
    type: "pendeltåg",
    cityId: "malmo",
    coordinates: [
      [13.003, 55.607],
      [13.1, 55.58],
      [13.3, 55.52],
      [13.82, 55.43]
    ]
  },
  {
    lineId: "malmo-pagatag-nord",
    name: "Pågatåg Norrut (Malmö–Lund)",
    color: "#005293",
    type: "pendeltåg",
    cityId: "malmo",
    coordinates: [
      [13.003, 55.607],
      [13.05, 55.62],
      [13.15, 55.68],
      [13.19, 55.706]
    ]
  },
  {
    lineId: "malmo-oresundstag",
    name: "Öresundståg (Malmö–Köpenhamn)",
    color: "#005293",
    type: "pendeltåg",
    cityId: "malmo",
    coordinates: [
      [13.003, 55.607],
      [12.975, 55.613],
      [12.85, 55.63],
      [12.65, 55.64],
      [12.57, 55.673]
    ]
  }
]);
