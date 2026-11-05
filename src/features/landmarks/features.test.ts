import { describe, expect, it } from "vitest";
import {
  N_FEATURES,
  extractHandFeatures,
  isValidHand,
  palmSpan,
  type Landmark,
} from "@/features/landmarks/features";
import fixtures from "../../../tests/fixtures/feature_vectors.json";

function toLandmarks(rows: number[][]): Landmark[] {
  return rows.map(([x, y, z]) => ({ x, y, z }));
}

describe("hand feature extraction", () => {
  it("matches the Python reference implementation for every golden case", () => {
    expect(fixtures.cases.length).toBeGreaterThan(0);
    for (const testCase of fixtures.cases) {
      const features = extractHandFeatures(
        toLandmarks(testCase.landmarks),
        testCase.aspect,
      );
      expect(features).toHaveLength(N_FEATURES);
      for (let i = 0; i < N_FEATURES; i += 1) {
        const expected = testCase.features[i];
        const actual = features[i];
        if (Math.abs(expected - actual) > 1e-6) {
          throw new Error(
            `case ${testCase.label} feature ${i}: expected ${expected}, got ${actual}`,
          );
        }
      }
    }
  });

  it("is translation and scale invariant", () => {
    const base = toLandmarks(fixtures.cases[0].landmarks);
    const reference = extractHandFeatures(base, 1);

    const shifted = base.map((point) => ({
      x: point.x + 0.25,
      y: point.y - 0.1,
      z: point.z + 0.05,
    }));
    const scaled = base.map((point) => ({
      x: point.x * 2,
      y: point.y * 2,
      z: point.z * 2,
    }));

    const shiftedFeatures = extractHandFeatures(shifted, 1);
    const scaledFeatures = extractHandFeatures(scaled, 1);

    for (let i = 0; i < N_FEATURES; i += 1) {
      expect(shiftedFeatures[i]).toBeCloseTo(reference[i], 5);
      expect(scaledFeatures[i]).toBeCloseTo(reference[i], 5);
    }
  });

  it("rejects degenerate and malformed landmarks", () => {
    expect(isValidHand([])).toBe(false);
    const collapsed = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
    expect(isValidHand(collapsed)).toBe(false);
    expect(palmSpan(collapsed)).toBe(0);
    expect(Array.from(extractHandFeatures(collapsed, 1))).toEqual(
      new Array(N_FEATURES).fill(0),
    );

    expect(() => extractHandFeatures([{ x: 0, y: 0, z: 0 }], 1)).toThrow(
      /expected 21 landmarks/,
    );
  });

  it("applies the aspect correction so the same physical hand matches", () => {
    const base = toLandmarks(fixtures.cases[0].landmarks);
    const reference = extractHandFeatures(base, 1);

    // In a 2:1 frame the same physical hand has half the normalised x/z span,
    // so the extractor must multiply x/z by the aspect ratio before scaling.
    const wideFrame = base.map((point) => ({
      x: point.x / 2,
      y: point.y,
      z: point.z / 2,
    }));
    const corrected = extractHandFeatures(wideFrame, 2);

    for (let i = 0; i < N_FEATURES; i += 1) {
      expect(corrected[i]).toBeCloseTo(reference[i], 6);
    }
  });

  it("keeps every value finite and inside the clip range", () => {
    for (const testCase of fixtures.cases) {
      const features = extractHandFeatures(
        toLandmarks(testCase.landmarks),
        testCase.aspect,
      );
      for (const value of features) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(-20);
        expect(value).toBeLessThanOrEqual(20);
      }
    }
  });
});
