import {
  PRESSURE_GRID,
  PRESSURE_LEGEND,
  PRESSURE_THRESHOLDS
} from "../data/pressureMetadata.js";

const cellPolygon = ({ row, col, latitudes, longitudes }) => {
  const south = latitudes[row];
  const north = latitudes[row] + PRESSURE_GRID.latStep;
  const west = longitudes[col];
  const east = longitudes[col] + PRESSURE_GRID.lonStep;

  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south]
  ];
};

const meanOf = (values) => {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const findPressureCenters = ({ pressures, mask, kind }) => {
  const rowCount = pressures.length;
  const colCount = pressures[0]?.length ?? 0;
  const centers = [];

  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      if (!mask[row][col] || !Number.isFinite(pressures[row][col])) {
        continue;
      }

      const value = pressures[row][col];
      let isExtrema = true;

      for (let deltaRow = -1; deltaRow <= 1; deltaRow += 1) {
        for (let deltaCol = -1; deltaCol <= 1; deltaCol += 1) {
          if (deltaRow === 0 && deltaCol === 0) {
            continue;
          }

          const neighborRow = row + deltaRow;
          const neighborCol = col + deltaCol;
          if (neighborRow < 0 || neighborCol < 0 || neighborRow >= rowCount || neighborCol >= colCount) {
            continue;
          }

          const neighbor = pressures[neighborRow][neighborCol];
          if (!Number.isFinite(neighbor)) {
            continue;
          }

          if (kind === "high" ? neighbor > value : neighbor < value) {
            isExtrema = false;
            break;
          }
        }

        if (!isExtrema) {
          break;
        }
      }

      if (isExtrema) {
        centers.push({ row, col, value });
      }
    }
  }

  return centers.sort((left, right) => (kind === "high" ? right.value - left.value : left.value - right.value));
};

const buildAreaFeatures = ({ pressures, capes, latitudes, longitudes, meanPressure }) => {
  const rowCount = pressures.length;
  const colCount = pressures[0]?.length ?? 0;
  const highMask = Array.from({ length: rowCount }, () => Array(colCount).fill(false));
  const lowMask = Array.from({ length: rowCount }, () => Array(colCount).fill(false));
  const stormMask = Array.from({ length: rowCount }, () => Array(colCount).fill(false));
  const features = [];

  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      const pressure = pressures[row][col];
      const cape = capes[row][col];

      if (Number.isFinite(pressure) && meanPressure != null) {
        if (pressure >= meanPressure + PRESSURE_THRESHOLDS.highDeviationHpa) {
          highMask[row][col] = true;
          features.push({
            type: "Feature",
            properties: {
              kind: "high",
              pressure: Math.round(pressure * 10) / 10,
              color: PRESSURE_LEGEND.high.color
            },
            geometry: {
              type: "Polygon",
              coordinates: [cellPolygon({ row, col, latitudes, longitudes })]
            }
          });
        } else if (pressure <= meanPressure - PRESSURE_THRESHOLDS.lowDeviationHpa) {
          lowMask[row][col] = true;
          features.push({
            type: "Feature",
            properties: {
              kind: "low",
              pressure: Math.round(pressure * 10) / 10,
              color: PRESSURE_LEGEND.low.color
            },
            geometry: {
              type: "Polygon",
              coordinates: [cellPolygon({ row, col, latitudes, longitudes })]
            }
          });
        }
      }

      if (Number.isFinite(cape) && cape >= PRESSURE_THRESHOLDS.stormCapeJkg) {
        stormMask[row][col] = true;
        const severe = cape >= PRESSURE_THRESHOLDS.severeStormCapeJkg;
        features.push({
          type: "Feature",
          properties: {
            kind: severe ? "severe_storm" : "storm",
            cape: Math.round(cape),
            color: severe ? PRESSURE_LEGEND.severeStorm.color : PRESSURE_LEGEND.storm.color
          },
          geometry: {
            type: "Polygon",
            coordinates: [cellPolygon({ row, col, latitudes, longitudes })]
          }
        });
      }
    }
  }

  const labelFeatures = [];

  findPressureCenters({ pressures, mask: highMask, kind: "high" })
    .slice(0, 4)
    .forEach((center) => {
      const west = longitudes[center.col];
      const south = latitudes[center.row];
      labelFeatures.push({
        type: "Feature",
        properties: {
          kind: "high_label",
          label: "H",
          pressure: Math.round(center.value)
        },
        geometry: {
          type: "Point",
          coordinates: [west + PRESSURE_GRID.lonStep / 2, south + PRESSURE_GRID.latStep / 2]
        }
      });
    });

  findPressureCenters({ pressures, mask: lowMask, kind: "low" })
    .slice(0, 4)
    .forEach((center) => {
      const west = longitudes[center.col];
      const south = latitudes[center.row];
      labelFeatures.push({
        type: "Feature",
        properties: {
          kind: "low_label",
          label: "L",
          pressure: Math.round(center.value)
        },
        geometry: {
          type: "Point",
          coordinates: [west + PRESSURE_GRID.lonStep / 2, south + PRESSURE_GRID.latStep / 2]
        }
      });
    });

  return {
    areaFeatures: features,
    labelFeatures
  };
};

export const buildPressureFrameGeoJson = ({ gridForecast, timeIndex }) => {
  const pressures = gridForecast.pressures[timeIndex];
  const capes = gridForecast.capes[timeIndex];
  const validPressures = pressures.flat().filter((value) => Number.isFinite(value));
  const meanPressure = meanOf(validPressures);
  const { areaFeatures, labelFeatures } = buildAreaFeatures({
    pressures,
    capes,
    latitudes: gridForecast.latitudes,
    longitudes: gridForecast.longitudes,
    meanPressure
  });

  return {
    type: "FeatureCollection",
    properties: {
      valid: gridForecast.times[timeIndex],
      meanPressure: meanPressure != null ? Math.round(meanPressure * 10) / 10 : null
    },
    features: [...areaFeatures, ...labelFeatures]
  };
};

export const toFrameKey = (isoTime) => isoTime.replace(/:/g, "-");

export const fromFrameKey = (frameKey) => frameKey.replace(/T(\d{2})-(\d{2})$/, "T$1:$2");
