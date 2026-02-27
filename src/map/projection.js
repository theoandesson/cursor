const BOUNDS = {
  north: 69.5,
  south: 54.8,
  west: 10.5,
  east: 25.0,
};

function mercatorY(lat) {
  const rad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

const yMin = mercatorY(BOUNDS.south);
const yMax = mercatorY(BOUNDS.north);

export function project(lat, lon, width, height) {
  const x = ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * width;
  const y = height - ((mercatorY(lat) - yMin) / (yMax - yMin)) * height;
  return { x, y };
}

export function coordsToPath(coords, width, height) {
  return coords
    .map(([lat, lon], i) => {
      const { x, y } = project(lat, lon, width, height);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
}
