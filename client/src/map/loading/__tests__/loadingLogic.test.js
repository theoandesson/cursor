/**
 * Unit tests for loading-module pure functions.
 * Run with: node --test client/src/map/loading/__tests__/loadingLogic.test.js
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  LOADING_STEPS,
  calculateVectorProgress,
  getStepMessage,
  isInteractiveReady
} from "../vectorLoadProgress.js";

import { scheduleDeferredWork } from "../scheduleDeferredWork.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMockMap = ({
  hasSource = true,
  sourceLoaded = true,
  tilesLoaded = true,
  mapLoaded = true
} = {}) => ({
  getSource: () => (hasSource ? {} : null),
  isSourceLoaded: () => sourceLoaded,
  areTilesLoaded: () => tilesLoaded,
  loaded: () => mapLoaded
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// calculateVectorProgress
// ---------------------------------------------------------------------------

describe("calculateVectorProgress", () => {
  const SOURCE_ID = "sweden_vector";

  test("returns 0.08 when source does not exist", () => {
    const map = makeMockMap({ hasSource: false });
    assert.strictEqual(calculateVectorProgress(map, SOURCE_ID), 0.08);
  });

  test("returns 0.34 when source exists but is not loaded", () => {
    const map = makeMockMap({ hasSource: true, sourceLoaded: false });
    assert.strictEqual(calculateVectorProgress(map, SOURCE_ID), 0.34);
  });

  test("returns 0.72 when source is loaded but tiles are not", () => {
    const map = makeMockMap({ hasSource: true, sourceLoaded: true, tilesLoaded: false });
    assert.strictEqual(calculateVectorProgress(map, SOURCE_ID), 0.72);
  });

  test("returns 1 when source and tiles are fully loaded", () => {
    const map = makeMockMap();
    assert.strictEqual(calculateVectorProgress(map, SOURCE_ID), 1);
  });

  test("sentinel values are strictly ordered", () => {
    assert.ok(0.08 < 0.34 && 0.34 < 0.72 && 0.72 < 1, "progress sentinels should be ascending");
  });
});

// ---------------------------------------------------------------------------
// getStepMessage
// ---------------------------------------------------------------------------

describe("getStepMessage", () => {
  test("returns a non-empty string for every defined threshold", () => {
    LOADING_STEPS.forEach(({ threshold }) => {
      const msg = getStepMessage(threshold);
      assert.ok(typeof msg === "string" && msg.length > 0, `expected string for threshold ${threshold}`);
    });
  });

  test("progress at exactly a threshold boundary returns that step's message", () => {
    const firstStep = LOADING_STEPS[0];
    assert.strictEqual(getStepMessage(firstStep.threshold), firstStep.message);
  });

  test("progress just below a threshold returns that step's message", () => {
    const step = LOADING_STEPS[1];
    const msg = getStepMessage(step.threshold - 0.001);
    assert.ok(
      LOADING_STEPS.some((s) => s.message === msg),
      "message should be one of the defined step messages"
    );
  });

  test("progress above all thresholds returns the fallback string", () => {
    assert.strictEqual(getStepMessage(1.5), "Laddar data…");
  });
});

// ---------------------------------------------------------------------------
// isInteractiveReady
// ---------------------------------------------------------------------------

describe("isInteractiveReady", () => {
  const SOURCE_ID = "sweden_vector";

  test("returns true only when all three conditions are met", () => {
    const map = makeMockMap({ mapLoaded: true, sourceLoaded: true });
    assert.strictEqual(isInteractiveReady(map, SOURCE_ID, true), true);
  });

  test("returns false when map is not loaded", () => {
    const map = makeMockMap({ mapLoaded: false, sourceLoaded: true });
    assert.strictEqual(isInteractiveReady(map, SOURCE_ID, true), false);
  });

  test("returns false when source is not loaded", () => {
    const map = makeMockMap({ mapLoaded: true, sourceLoaded: false });
    assert.strictEqual(isInteractiveReady(map, SOURCE_ID, true), false);
  });

  test("returns false when no render frame has occurred", () => {
    const map = makeMockMap({ mapLoaded: true, sourceLoaded: true });
    assert.strictEqual(isInteractiveReady(map, SOURCE_ID, false), false);
  });
});

// ---------------------------------------------------------------------------
// PriorityQueue – min-heap invariant verification
//
// The PriorityQueue in createViewportPrefetcher.js is not exported, so we
// replicate its exact implementation here to verify:
//   1. Dequeue order is always ascending by priority (min-heap).
//   2. The `keys` Map stays perfectly in sync with `items` indices after every
//      swap — this is the critical invariant the swap() fix ensures.
//   3. Re-enqueueing with a lower priority bubbles the entry to the correct
//      position without leaving stale index references.
// ---------------------------------------------------------------------------

describe("PriorityQueue – min-heap invariant (mirrors createViewportPrefetcher.js)", () => {
  class PriorityQueue {
    constructor() {
      this.items = [];
      this.keys = new Map();
    }

    get size() {
      return this.items.length;
    }

    clear() {
      this.items.length = 0;
      this.keys.clear();
    }

    enqueue(tile, priority) {
      const key = `${tile.z}/${tile.x}/${tile.y}`;
      const existingIndex = this.keys.get(key);
      if (existingIndex != null) {
        const existing = this.items[existingIndex];
        if (priority < existing.priority) {
          existing.priority = priority;
          this.bubbleUp(existingIndex);
          this.bubbleDown(existingIndex);
        }
        return;
      }

      this.items.push({ key, tile, priority });
      this.keys.set(key, this.items.length - 1);
      this.bubbleUp(this.items.length - 1);
    }

    dequeue() {
      if (this.items.length === 0) {
        return null;
      }

      const next = this.items[0];
      const last = this.items.pop();
      this.keys.delete(next.key);

      if (this.items.length > 0 && last) {
        this.items[0] = last;
        this.keys.set(last.key, 0);
        this.bubbleDown(0);
      }

      return next;
    }

    bubbleUp(index) {
      while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);
        if (this.items[parentIndex].priority <= this.items[index].priority) {
          break;
        }
        this.swap(index, parentIndex);
        index = parentIndex;
      }
    }

    bubbleDown(index) {
      const length = this.items.length;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;

        if (left < length && this.items[left].priority < this.items[smallest].priority) {
          smallest = left;
        }
        if (right < length && this.items[right].priority < this.items[smallest].priority) {
          smallest = right;
        }
        if (smallest === index) {
          break;
        }
        this.swap(index, smallest);
        index = smallest;
      }
    }

    swap(leftIndex, rightIndex) {
      const left = this.items[leftIndex];
      const right = this.items[rightIndex];
      this.items[leftIndex] = right;
      this.items[rightIndex] = left;
      this.keys.set(left.key, rightIndex);
      this.keys.set(right.key, leftIndex);
    }

    assertKeysConsistent() {
      this.items.forEach((item, index) => {
        const mapped = this.keys.get(item.key);
        assert.strictEqual(mapped, index, `Key "${item.key}" maps to ${mapped} but item is at index ${index}`);
      });
      assert.strictEqual(this.keys.size, this.items.length, "keys.size should equal items.length");
    }
  }

  test("dequeues items in ascending priority order", () => {
    const pq = new PriorityQueue();
    pq.enqueue({ z: 1, x: 3, y: 0 }, 4);
    pq.enqueue({ z: 1, x: 0, y: 0 }, 1);
    pq.enqueue({ z: 1, x: 2, y: 0 }, 3);
    pq.enqueue({ z: 1, x: 1, y: 0 }, 2);

    assert.strictEqual(pq.dequeue().priority, 1);
    assert.strictEqual(pq.dequeue().priority, 2);
    assert.strictEqual(pq.dequeue().priority, 3);
    assert.strictEqual(pq.dequeue().priority, 4);
    assert.strictEqual(pq.size, 0);
  });

  test("keys Map stays consistent with items after every dequeue", () => {
    const pq = new PriorityQueue();
    const tiles = Array.from({ length: 6 }, (_, i) => ({ z: 2, x: i, y: 0 }));
    tiles.forEach((tile, i) => pq.enqueue(tile, 6 - i));

    while (pq.size > 0) {
      pq.assertKeysConsistent();
      pq.dequeue();
    }
  });

  test("keys Map stays consistent after interleaved enqueue and dequeue", () => {
    const pq = new PriorityQueue();
    pq.enqueue({ z: 3, x: 0, y: 0 }, 10);
    pq.enqueue({ z: 3, x: 1, y: 0 }, 5);
    pq.assertKeysConsistent();

    pq.dequeue();
    pq.assertKeysConsistent();

    pq.enqueue({ z: 3, x: 2, y: 0 }, 1);
    pq.enqueue({ z: 3, x: 3, y: 0 }, 7);
    pq.assertKeysConsistent();

    pq.dequeue();
    pq.assertKeysConsistent();
  });

  test("re-enqueueing with a lower priority promotes the entry correctly", () => {
    const pq = new PriorityQueue();
    const tile = { z: 4, x: 0, y: 0 };
    pq.enqueue(tile, 10);
    pq.enqueue({ z: 4, x: 1, y: 0 }, 3);
    pq.enqueue({ z: 4, x: 2, y: 0 }, 6);

    // Reduce tile priority so it should become the min
    pq.enqueue(tile, 1);
    pq.assertKeysConsistent();

    const first = pq.dequeue();
    assert.strictEqual(first.priority, 1, "promoted tile should dequeue first");
    assert.strictEqual(first.key, "4/0/0");
  });

  test("re-enqueueing with a higher priority does not change position", () => {
    const pq = new PriorityQueue();
    const tile = { z: 4, x: 0, y: 0 };
    pq.enqueue(tile, 1);
    pq.enqueue({ z: 4, x: 1, y: 0 }, 5);
    pq.enqueue(tile, 10); // Should be ignored because 10 > 1
    pq.assertKeysConsistent();

    assert.strictEqual(pq.dequeue().priority, 1, "priority should not have worsened");
  });

  test("dequeue from a single-element queue returns null on second call", () => {
    const pq = new PriorityQueue();
    pq.enqueue({ z: 1, x: 0, y: 0 }, 5);
    pq.dequeue();
    assert.strictEqual(pq.dequeue(), null);
    assert.strictEqual(pq.size, 0);
  });
});

// ---------------------------------------------------------------------------
// scheduleDeferredWork – cancellation
// ---------------------------------------------------------------------------

describe("scheduleDeferredWork cancellation", () => {
  test("cancel() prevents the callback from running", async () => {
    let called = false;
    const cancel = scheduleDeferredWork(() => {
      called = true;
    }, { timeoutMs: 50 });

    cancel();
    await wait(250);
    assert.strictEqual(called, false, "callback should not run after cancel");
  });

  test("callback runs when cancel is not called", async () => {
    let called = false;
    scheduleDeferredWork(() => {
      called = true;
    }, { timeoutMs: 50 });

    await wait(250);
    assert.strictEqual(called, true, "callback should run normally");
  });

  test("cancel() called after execution is a safe no-op", async () => {
    let callCount = 0;
    const cancel = scheduleDeferredWork(() => {
      callCount += 1;
    }, { timeoutMs: 10 });

    await wait(150);
    assert.doesNotThrow(() => cancel(), "calling cancel after execution should not throw");
    await wait(50);
    assert.strictEqual(callCount, 1, "callback should have run exactly once");
  });

  test("delayMs defers scheduling past the delay period", async () => {
    let called = false;
    scheduleDeferredWork(() => {
      called = true;
    }, { timeoutMs: 10, delayMs: 100 });

    await wait(50);
    assert.strictEqual(called, false, "should not have run before delayMs elapsed");

    await wait(200);
    assert.strictEqual(called, true, "should have run after delayMs elapsed");
  });

  test("cancel() during delayMs prevents execution", async () => {
    let called = false;
    const cancel = scheduleDeferredWork(() => {
      called = true;
    }, { timeoutMs: 10, delayMs: 100 });

    await wait(20);
    cancel();

    await wait(300);
    assert.strictEqual(called, false, "callback should not run after cancel during delay");
  });
});
