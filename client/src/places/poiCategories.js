const CATEGORY_META = Object.freeze({
  restaurant: { icon: "🍽️", label: "Restaurang" },
  cafe: { icon: "☕", label: "Café" },
  bar: { icon: "🍺", label: "Bar" },
  fast_food: { icon: "🍔", label: "Snabbmat" },
  hospital: { icon: "🏥", label: "Sjukhus" },
  pharmacy: { icon: "💊", label: "Apotek" },
  clinic: { icon: "🩺", label: "Vårdcentral" },
  dentist: { icon: "🦷", label: "Tandläkare" },
  fuel: { icon: "⛽", label: "Bensinstation" },
  parking: { icon: "🅿️", label: "Parkering" },
  supermarket: { icon: "🛒", label: "Mataffär" },
  convenience: { icon: "🏪", label: "Närbutik" },
  bakery: { icon: "🥐", label: "Bageri" },
  bank: { icon: "🏦", label: "Bank" },
  atm: { icon: "🏧", label: "Bankomat" },
  hotel: { icon: "🏨", label: "Hotell" },
  hostel: { icon: "🛏️", label: "Vandrarhem" },
  museum: { icon: "🏛️", label: "Museum" },
  library: { icon: "📚", label: "Bibliotek" },
  school: { icon: "🏫", label: "Skola" },
  university: { icon: "🎓", label: "Universitet" },
  post_office: { icon: "📮", label: "Post" },
  police: { icon: "👮", label: "Polis" },
  fire_station: { icon: "🚒", label: "Brandstation" },
  bus_station: { icon: "🚌", label: "Busstation" },
  train_station: { icon: "🚆", label: "Tågstation" },
  tourist_attraction: { icon: "📸", label: "Sevärdhet" },
  park: { icon: "🌳", label: "Park" },
  sports_centre: { icon: "🏟️", label: "Sportanläggning" },
  cinema: { icon: "🎬", label: "Biograf" },
  shopping_mall: { icon: "🛍️", label: "Köpcentrum" },
  hairdresser: { icon: "💇", label: "Frisör" },
  veterinary: { icon: "🐾", label: "Veterinär" },
  place_of_worship: { icon: "⛪", label: "Kyrka" }
});

const OSM_TYPE_META = Object.freeze({
  city: { icon: "🏙️", label: "Stad" },
  town: { icon: "🏘️", label: "Tätort" },
  village: { icon: "🏡", label: "By" },
  hamlet: { icon: "🏡", label: "Småort" },
  suburb: { icon: "🏘️", label: "Stadsdel" },
  neighbourhood: { icon: "📍", label: "Område" },
  road: { icon: "🛣️", label: "Väg" },
  house: { icon: "🏠", label: "Byggnad" },
  building: { icon: "🏢", label: "Byggnad" },
  place: { icon: "📍", label: "Plats" },
  amenity: { icon: "📍", label: "Plats" },
  tourism: { icon: "📸", label: "Turism" },
  leisure: { icon: "🌳", label: "Fritid" },
  shop: { icon: "🛍️", label: "Butik" },
  railway: { icon: "🚆", label: "Järnväg" }
});

const FALLBACK = Object.freeze({ icon: "📍", label: "Plats" });

export const getPoiCategoryMeta = (categoryId) =>
  CATEGORY_META[categoryId] ?? FALLBACK;

export const getPlaceCategoryMeta = ({ category, type, categoryName } = {}) => {
  if (categoryName) {
    return { icon: CATEGORY_META[category]?.icon ?? FALLBACK.icon, label: categoryName };
  }

  if (category && CATEGORY_META[category]) {
    return CATEGORY_META[category];
  }

  if (type && OSM_TYPE_META[type]) {
    return OSM_TYPE_META[type];
  }

  if (category && OSM_TYPE_META[category]) {
    return OSM_TYPE_META[category];
  }

  return FALLBACK;
};
