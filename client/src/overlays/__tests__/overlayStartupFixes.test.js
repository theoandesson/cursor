/**
 * Unit tests for overlay opacity and before-layer helpers.
 * Run with: node --test client/src/overlays/__tests__/overlayStartupFixes.test.js
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { createOverlayManager } from "../controller/createOverlayManager.js";
import { resolveBeforeLayerId } from "../utils/resolveBeforeLayerId.js";
import { STYLE_LAYER_IDS } from "../constants/styleLayerIds.js";

describe("resolveBeforeLayerId", () => {
  test("returns the first existing candidate layer", () => {
    const map = {
      getLayer: (id) => (id === STYLE_LAYER_IDS.BUILDINGS ? {} : null)
    };

    assert.equal(resolveBeforeLayerId(map), STYLE_LAYER_IDS.BUILDINGS);
  });

  test("returns undefined when no candidates exist", () => {
    const map = { getLayer: () => null };
    assert.equal(resolveBeforeLayerId(map), undefined);
  });

  test("prefers road labels over buildings when present", () => {
    const present = new Set([STYLE_LAYER_IDS.ROAD_LABELS, STYLE_LAYER_IDS.BUILDINGS]);
    const map = {
      getLayer: (id) => (present.has(id) ? {} : null)
    };

    assert.equal(resolveBeforeLayerId(map), STYLE_LAYER_IDS.ROAD_LABELS);
  });
});

describe("createOverlayManager opacity bindings", () => {
  test("multiplies baseOpacity by overlay opacity", async () => {
    const paint = new Map();
    const layers = new Set(["overlay-pressure-high-fill"]);
    const map = {
      getLayer: (id) => (layers.has(id) ? {} : null),
      setLayoutProperty: () => {},
      setPaintProperty: (layerId, property, value) => {
        paint.set(`${layerId}:${property}`, value);
      }
    };

    const manager = createOverlayManager({
      map,
      definitions: [
        {
          id: "pressure-systems",
          label: "Tryck",
          layerIds: ["overlay-pressure-high-fill"],
          opacityBindings: [
            {
              layerId: "overlay-pressure-high-fill",
              property: "fill-opacity",
              baseOpacity: 0.34
            }
          ],
          defaultVisible: false,
          defaultOpacity: 1
        }
      ]
    });

    await manager.mountAll();
    assert.equal(paint.get("overlay-pressure-high-fill:fill-opacity"), 0.34);

    manager.setOpacity("pressure-systems", 0.5);
    assert.equal(paint.get("overlay-pressure-high-fill:fill-opacity"), 0.17);
  });
});
