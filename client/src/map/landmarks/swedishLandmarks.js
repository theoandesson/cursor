export const SWEDISH_LANDMARKS = Object.freeze([
  {
    id: "avicii-arena",
    name: "Avicii Arena (Globen)",
    coordinates: [18.0835, 59.2936],
    city: "Stockholm",
    description:
      "Sveriges nationalarena för ishockey och evenemang, med sin ikoniska sfärformad silhuett vid Södermalm."
  },
  {
    id: "turning-torso",
    name: "Turning Torso",
    coordinates: [12.9753, 55.6133],
    city: "Malmö",
    description:
      "Skandinaviens högsta skyskrapa med en vriden form inspirerad av en staty av Santiago Calatrava."
  },
  {
    id: "uppsala-domkyrka",
    name: "Uppsala domkyrka",
    coordinates: [17.6339, 59.8581],
    city: "Uppsala",
    description:
      "Nordens största katedral och ett av Sveriges viktigaste medeltida monument, synligt över staden."
  },
  {
    id: "stockholm-stadshus",
    name: "Stockholms stadshus",
    coordinates: [18.0505, 59.3275],
    city: "Stockholm",
    description:
      "Rödmurad jugendbyggnad vid Riddarfjärden där Nobelbanketten hålls varje år."
  },
  {
    id: "vasamuseet",
    name: "Vasamuseet",
    coordinates: [18.0919, 59.328],
    city: "Stockholm",
    description:
      "Museet som huser det nästan intakta krigsskeppet Vasa från 1600-talet, ett av världens mest besökta museer."
  },
  {
    id: "kiruna-kyrka",
    name: "Kiruna kyrka",
    coordinates: [20.2256, 67.8523],
    city: "Kiruna",
    description:
      "Träkyrka i samisk stil som valts till Sveriges vackraste byggnad och symboliserar Lappland."
  },
  {
    id: "kalmar-slott",
    name: "Kalmar slott",
    coordinates: [16.3558, 56.6628],
    city: "Kalmar",
    description:
      "Renässansslott vid Östersjön där Kalmarunionen bildades 1397."
  },
  {
    id: "masthuggkyrkan",
    name: "Masthuggkyrkan",
    coordinates: [11.9589, 57.6989],
    city: "Göteborg",
    description:
      "Landmärke på Masthugget med utsikt över hamnen och en av Göteborgs mest igenkännliga silhuetter."
  },
  {
    id: "lund-domkyrka",
    name: "Lunds domkyrka",
    coordinates: [13.1922, 55.7047],
    city: "Lund",
    description:
      "Romansk katedral från 1100-talet med astronomisk klocka och rik medeltida historia."
  },
  {
    id: "icehotel",
    name: "Icehotel",
    coordinates: [19.8236, 67.8514],
    city: "Jukkasjärvi",
    description:
      "Världens första hotell byggt av snö och is vid Torne älv, återuppbyggt varje vinter."
  }
]);

export const buildLandmarksGeoJson = (landmarks = SWEDISH_LANDMARKS) => ({
  type: "FeatureCollection",
  features: landmarks.map((landmark) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: landmark.coordinates
    },
    properties: {
      id: landmark.id,
      name: landmark.name,
      city: landmark.city,
      description: landmark.description
    }
  }))
});
