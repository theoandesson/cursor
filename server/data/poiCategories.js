const CATEGORIES = [
  { id: "restaurant", name: "Restaurang", icon: "restaurant", osmTag: "amenity=restaurant" },
  { id: "cafe", name: "Café", icon: "cafe", osmTag: "amenity=cafe" },
  { id: "bar", name: "Bar", icon: "bar", osmTag: "amenity=bar" },
  { id: "fast_food", name: "Snabbmat", icon: "fast-food", osmTag: "amenity=fast_food" },
  { id: "hospital", name: "Sjukhus", icon: "hospital", osmTag: "amenity=hospital" },
  { id: "pharmacy", name: "Apotek", icon: "pharmacy", osmTag: "amenity=pharmacy" },
  { id: "clinic", name: "Vårdcentral", icon: "clinic", osmTag: "amenity=clinic" },
  { id: "dentist", name: "Tandläkare", icon: "dentist", osmTag: "amenity=dentist" },
  { id: "fuel", name: "Bensinstation", icon: "fuel", osmTag: "amenity=fuel" },
  { id: "parking", name: "Parkering", icon: "parking", osmTag: "amenity=parking" },
  { id: "supermarket", name: "Mataffär", icon: "supermarket", osmTag: "shop=supermarket" },
  { id: "convenience", name: "Närbutik", icon: "convenience", osmTag: "shop=convenience" },
  { id: "bakery", name: "Bageri", icon: "bakery", osmTag: "shop=bakery" },
  { id: "bank", name: "Bank", icon: "bank", osmTag: "amenity=bank" },
  { id: "atm", name: "Bankomat", icon: "atm", osmTag: "amenity=atm" },
  { id: "hotel", name: "Hotell", icon: "hotel", osmTag: "tourism=hotel" },
  { id: "hostel", name: "Vandrarhem", icon: "hostel", osmTag: "tourism=hostel" },
  { id: "museum", name: "Museum", icon: "museum", osmTag: "tourism=museum" },
  { id: "library", name: "Bibliotek", icon: "library", osmTag: "amenity=library" },
  { id: "school", name: "Skola", icon: "school", osmTag: "amenity=school" },
  { id: "university", name: "Universitet", icon: "university", osmTag: "amenity=university" },
  { id: "post_office", name: "Post", icon: "post", osmTag: "amenity=post_office" },
  { id: "police", name: "Polis", icon: "police", osmTag: "amenity=police" },
  { id: "fire_station", name: "Brandstation", icon: "fire-station", osmTag: "amenity=fire_station" },
  { id: "bus_station", name: "Busstation", icon: "bus", osmTag: "amenity=bus_station" },
  { id: "train_station", name: "Tågstation", icon: "train", osmTag: "railway=station" },
  { id: "tourist_attraction", name: "Sevärdhet", icon: "attraction", osmTag: "tourism=attraction" },
  { id: "park", name: "Park", icon: "park", osmTag: "leisure=park" },
  { id: "sports_centre", name: "Sportanläggning", icon: "sports", osmTag: "leisure=sports_centre" },
  { id: "cinema", name: "Biograf", icon: "cinema", osmTag: "amenity=cinema" },
  { id: "shopping_mall", name: "Köpcentrum", icon: "mall", osmTag: "shop=mall" },
  { id: "hairdresser", name: "Frisör", icon: "hairdresser", osmTag: "shop=hairdresser" },
  { id: "veterinary", name: "Veterinär", icon: "veterinary", osmTag: "amenity=veterinary" },
  { id: "place_of_worship", name: "Kyrka", icon: "worship", osmTag: "amenity=place_of_worship" }
];

export const POI_CATEGORIES = Object.freeze(
  CATEGORIES.map((category) => Object.freeze({ ...category }))
);

export const POI_CATEGORY_BY_ID = Object.freeze(
  Object.fromEntries(POI_CATEGORIES.map((category) => [category.id, category]))
);
