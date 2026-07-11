const TRAFFIC_LEVELS = ["free", "moderate", "heavy", "severe"];

const lerpCoord = (start, end, t) => [
  start[0] + (end[0] - start[0]) * t,
  start[1] + (end[1] - start[1]) * t
];

const buildChainSegments = ({
  prefix,
  roadName,
  roadClass,
  waypoints,
  trafficPattern,
  speedPattern
}) => {
  const segments = [];

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const trafficLevel = trafficPattern[index % trafficPattern.length];
    const speedKmh = speedPattern[index % speedPattern.length];

    segments.push({
      id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
      roadName,
      roadClass,
      trafficLevel,
      speedKmh,
      coordinates: [
        start,
        lerpCoord(start, end, 0.33),
        lerpCoord(start, end, 0.66),
        end
      ]
    });
  }

  return segments;
};

const E4_NORTH = buildChainSegments({
  prefix: "e4-north",
  roadName: "E4",
  roadClass: "motorway",
  waypoints: [
    [22.05, 65.62],
    [21.72, 65.32],
    [21.2, 64.88],
    [20.95, 64.62],
    [20.55, 64.12],
    [20.26, 63.83],
    [19.75, 63.45],
    [18.95, 63.05],
    [18.2, 62.55],
    [17.85, 62.25],
    [17.31, 62.39]
  ],
  trafficPattern: ["free", "free", "moderate", "moderate", "heavy", "free", "moderate", "free", "moderate", "heavy"],
  speedPattern: [100, 105, 78, 82, 55, 98, 85, 102, 72, 48]
});

const E4_MID = buildChainSegments({
  prefix: "e4-mid",
  roadName: "E4",
  roadClass: "motorway",
  waypoints: [
    [17.31, 62.39],
    [17.05, 61.95],
    [16.75, 61.45],
    [16.45, 60.95],
    [17.14, 60.67],
    [17.52, 60.35],
    [17.78, 60.05],
    [17.95, 59.88],
    [18.02, 59.72],
    [18.05, 59.55],
    [18.07, 59.38]
  ],
  trafficPattern: ["moderate", "heavy", "moderate", "free", "moderate", "heavy", "severe", "heavy", "moderate", "heavy"],
  speedPattern: [80, 52, 76, 98, 84, 45, 22, 38, 70, 58]
});

const E4_SOUTH = buildChainSegments({
  prefix: "e4-south",
  roadName: "E4",
  roadClass: "motorway",
  waypoints: [
    [18.07, 59.38],
    [17.95, 59.15],
    [17.75, 58.88],
    [17.45, 58.62],
    [16.85, 58.45],
    [16.18, 58.59],
    [15.85, 58.42],
    [15.62, 58.28],
    [15.2, 57.95],
    [14.65, 57.55],
    [14.16, 57.78],
    [13.55, 57.35],
    [13.05, 56.85],
    [12.85, 56.55],
    [12.69, 56.05]
  ],
  trafficPattern: [
    "heavy",
    "severe",
    "heavy",
    "moderate",
    "moderate",
    "heavy",
    "moderate",
    "free",
    "moderate",
    "free",
    "moderate",
    "heavy",
    "moderate",
    "free"
  ],
  speedPattern: [42, 18, 35, 68, 72, 50, 78, 95, 82, 100, 76, 48, 80, 98]
});

const E6_WEST = buildChainSegments({
  prefix: "e6-west",
  roadName: "E6",
  roadClass: "motorway",
  waypoints: [
    [13.16, 55.38],
    [13.0, 55.55],
    [12.95, 55.72],
    [12.85, 56.02],
    [12.78, 56.35],
    [12.86, 56.67],
    [12.55, 57.05],
    [12.2, 57.45],
    [11.97, 57.71]
  ],
  trafficPattern: ["moderate", "heavy", "moderate", "free", "moderate", "heavy", "moderate", "free"],
  speedPattern: [72, 48, 78, 98, 82, 52, 76, 102]
});

const E6_NORTH = buildChainSegments({
  prefix: "e6-north",
  roadName: "E6",
  roadClass: "motorway",
  waypoints: [
    [11.97, 57.71],
    [11.85, 58.05],
    [11.75, 58.35],
    [12.05, 58.55],
    [12.28, 58.28],
    [12.45, 58.05],
    [12.55, 57.85]
  ],
  trafficPattern: ["heavy", "moderate", "moderate", "free", "moderate", "heavy"],
  speedPattern: [55, 78, 82, 100, 74, 46]
});

const E20 = buildChainSegments({
  prefix: "e20",
  roadName: "E20",
  roadClass: "motorway",
  waypoints: [
    [13.0, 55.61],
    [12.55, 56.05],
    [12.1, 56.55],
    [11.85, 57.05],
    [11.97, 57.71],
    [12.55, 58.05],
    [13.55, 58.55],
    [14.55, 58.95],
    [15.0, 59.05],
    [15.21, 59.27],
    [16.05, 59.35],
    [17.05, 59.38],
    [17.85, 59.38],
    [18.07, 59.33]
  ],
  trafficPattern: [
    "moderate",
    "heavy",
    "moderate",
    "free",
    "heavy",
    "moderate",
    "free",
    "moderate",
    "heavy",
    "severe",
    "heavy",
    "moderate",
    "free"
  ],
  speedPattern: [75, 48, 80, 98, 52, 78, 102, 84, 42, 20, 38, 72, 96]
});

const E18 = buildChainSegments({
  prefix: "e18",
  roadName: "E18",
  roadClass: "motorway",
  waypoints: [
    [11.95, 59.05],
    [12.55, 59.15],
    [13.2, 59.28],
    [13.5, 59.38],
    [14.55, 59.35],
    [15.21, 59.27],
    [16.05, 59.35],
    [17.05, 59.38],
    [17.85, 59.38],
    [18.07, 59.33]
  ],
  trafficPattern: ["free", "moderate", "moderate", "heavy", "moderate", "free", "moderate", "heavy", "moderate", "heavy"],
  speedPattern: [100, 85, 78, 52, 80, 98, 82, 45, 72, 55]
});

const E22 = buildChainSegments({
  prefix: "e22",
  roadName: "E22",
  roadClass: "trunk",
  waypoints: [
    [13.0, 55.61],
    [13.55, 55.85],
    [14.55, 56.15],
    [15.55, 56.45],
    [16.36, 56.66],
    [16.55, 57.05],
    [16.45, 57.55],
    [16.18, 58.59]
  ],
  trafficPattern: ["moderate", "free", "moderate", "heavy", "moderate", "free", "moderate", "heavy"],
  speedPattern: [78, 95, 82, 48, 76, 100, 84, 52]
});

const E45 = buildChainSegments({
  prefix: "e45",
  roadName: "E45",
  roadClass: "trunk",
  waypoints: [
    [11.97, 57.71],
    [12.05, 58.05],
    [12.15, 58.35],
    [12.28, 58.55],
    [12.45, 58.85],
    [12.65, 59.15],
    [12.85, 59.45]
  ],
  trafficPattern: ["free", "moderate", "moderate", "heavy", "moderate", "free"],
  speedPattern: [98, 82, 76, 50, 78, 96]
});

const STOCKHOLM_RING = [
  {
    id: "stockholm-essingeleden-west",
    roadName: "Essingeleden",
    roadClass: "motorway",
    trafficLevel: "severe",
    speedKmh: 18,
    coordinates: [
      [18.0, 59.33],
      [18.02, 59.335],
      [18.04, 59.34],
      [18.06, 59.342]
    ]
  },
  {
    id: "stockholm-essingeleden-east",
    roadName: "Essingeleden",
    roadClass: "motorway",
    trafficLevel: "heavy",
    speedKmh: 32,
    coordinates: [
      [18.06, 59.342],
      [18.08, 59.34],
      [18.1, 59.335],
      [18.12, 59.33]
    ]
  },
  {
    id: "stockholm-vasterleden",
    roadName: "Västerleden",
    roadClass: "motorway",
    trafficLevel: "heavy",
    speedKmh: 38,
    coordinates: [
      [17.95, 59.35],
      [18.0, 59.352],
      [18.05, 59.354],
      [18.1, 59.352]
    ]
  },
  {
    id: "stockholm-sodra-lanken",
    roadName: "Södra länken",
    roadClass: "motorway",
    trafficLevel: "severe",
    speedKmh: 22,
    coordinates: [
      [18.07, 59.31],
      [18.08, 59.305],
      [18.09, 59.3],
      [18.1, 59.295]
    ]
  },
  {
    id: "stockholm-norra-lanken",
    roadName: "Norra länken",
    roadClass: "motorway",
    trafficLevel: "moderate",
    speedKmh: 62,
    coordinates: [
      [18.05, 59.36],
      [18.06, 59.365],
      [18.07, 59.37],
      [18.08, 59.372]
    ]
  }
];

const GOTHENBURG_RING = [
  {
    id: "goteborg-e6-north-ring",
    roadName: "E6",
    roadClass: "motorway",
    trafficLevel: "heavy",
    speedKmh: 42,
    coordinates: [
      [11.92, 57.75],
      [11.95, 57.73],
      [11.98, 57.71],
      [12.0, 57.69]
    ]
  },
  {
    id: "goteborg-e20-east",
    roadName: "E20",
    roadClass: "motorway",
    trafficLevel: "moderate",
    speedKmh: 68,
    coordinates: [
      [11.9, 57.7],
      [11.95, 57.705],
      [12.0, 57.71],
      [12.05, 57.715]
    ]
  },
  {
    id: "goteborg-e45-connector",
    roadName: "E45",
    roadClass: "trunk",
    trafficLevel: "moderate",
    speedKmh: 72,
    coordinates: [
      [11.97, 57.71],
      [11.98, 57.705],
      [11.99, 57.7],
      [12.0, 57.695]
    ]
  }
];

const MALMO_CONNECTORS = [
  {
    id: "malmo-ring-east",
    roadName: "Inre ringvägen",
    roadClass: "primary",
    trafficLevel: "heavy",
    speedKmh: 35,
    coordinates: [
      [13.02, 55.6],
      [13.03, 55.605],
      [13.04, 55.61],
      [13.05, 55.615]
    ]
  },
  {
    id: "malmo-oresund-approach",
    roadName: "E20",
    roadClass: "motorway",
    trafficLevel: "moderate",
    speedKmh: 65,
    coordinates: [
      [12.98, 55.6],
      [12.99, 55.602],
      [13.0, 55.605],
      [13.01, 55.608]
    ]
  }
];

const URBAN_CONNECTORS = [
  {
    id: "uppsala-e4-bypass",
    roadName: "E4",
    roadClass: "motorway",
    trafficLevel: "moderate",
    speedKmh: 78,
    coordinates: [
      [17.6, 59.88],
      [17.62, 59.87],
      [17.64, 59.86],
      [17.66, 59.855]
    ]
  },
  {
    id: "linkoping-e4-bypass",
    roadName: "E4",
    roadClass: "motorway",
    trafficLevel: "free",
    speedKmh: 105,
    coordinates: [
      [15.55, 58.38],
      [15.58, 58.39],
      [15.61, 58.4],
      [15.64, 58.41]
    ]
  },
  {
    id: "norrkoping-e4-approach",
    roadName: "E4",
    roadClass: "motorway",
    trafficLevel: "moderate",
    speedKmh: 82,
    coordinates: [
      [16.1, 58.55],
      [16.13, 58.56],
      [16.16, 58.57],
      [16.18, 58.58]
    ]
  },
  {
    id: "jonkoping-e4-bypass",
    roadName: "E4",
    roadClass: "motorway",
    trafficLevel: "free",
    speedKmh: 108,
    coordinates: [
      [14.1, 57.75],
      [14.13, 57.76],
      [14.16, 57.77],
      [14.18, 57.78]
    ]
  },
  {
    id: "orebro-e20-bypass",
    roadName: "E20",
    roadClass: "motorway",
    trafficLevel: "moderate",
    speedKmh: 75,
    coordinates: [
      [15.15, 59.25],
      [15.18, 59.26],
      [15.21, 59.27],
      [15.24, 59.28]
    ]
  },
  {
    id: "karlstad-e18-west",
    roadName: "E18",
    roadClass: "motorway",
    trafficLevel: "free",
    speedKmh: 110,
    coordinates: [
      [13.4, 59.35],
      [13.43, 59.36],
      [13.46, 59.37],
      [13.5, 59.38]
    ]
  }
];

export const SWEDISH_TRAFFIC_SEGMENTS = Object.freeze(
  [
    ...E4_NORTH,
    ...E4_MID,
    ...E4_SOUTH,
    ...E6_WEST,
    ...E6_NORTH,
    ...E20,
    ...E18,
    ...E22,
    ...E45,
    ...STOCKHOLM_RING,
    ...GOTHENBURG_RING,
    ...MALMO_CONNECTORS,
    ...URBAN_CONNECTORS
  ].map((segment) => ({
    ...segment,
    trafficLevel: TRAFFIC_LEVELS.includes(segment.trafficLevel)
      ? segment.trafficLevel
      : "moderate"
  }))
);
