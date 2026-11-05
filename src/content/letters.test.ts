import { describe, expect, it } from "vitest";
import labelMap from "../../public/models/label_map.json";
import featureSpec from "../../public/models/feature_spec.json";
import metrics from "../../public/models/metrics.json";
import { N_FEATURES } from "@/features/landmarks/features";
import { LETTERS, MOTION_LETTERS, STATIC_LETTERS } from "@/content/letters";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

describe("model artifacts", () => {
  it("maps output indices 0-25 to A-Z in order", () => {
    const entries = Object.entries(labelMap as Record<string, string>);
    expect(entries).toHaveLength(26);
    ALPHABET.forEach((letter, index) => {
      expect((labelMap as Record<string, string>)[String(index)]).toBe(letter);
    });
  });

  it("declares the same feature contract as the TypeScript implementation", () => {
    expect(featureSpec.version).toBe("1.0.0");
    expect(featureSpec.n_features).toBe(N_FEATURES);
    expect(metrics.feature_spec_version).toBe(featureSpec.version);
    expect(metrics.feature_names).toHaveLength(N_FEATURES);
  });

  it("stores a 26x26 confusion matrix whose total matches the test split", () => {
    expect(metrics.labels).toEqual(ALPHABET);
    expect(metrics.confusion_matrix).toHaveLength(26);
    const total = metrics.confusion_matrix.reduce(
      (sum, row) => sum + row.reduce((rowSum, value) => rowSum + value, 0),
      0,
    );
    expect(total).toBe(metrics.test.samples);
    expect(metrics.test.samples).toBe(104);
  });

  it("reports metrics in the valid range", () => {
    for (const key of [
      "accuracy",
      "balanced_accuracy",
      "macro_precision",
      "macro_recall",
      "macro_f1",
      "weighted_f1",
    ] as const) {
      expect(metrics.test[key]).toBeGreaterThan(0);
      expect(metrics.test[key]).toBeLessThanOrEqual(1);
    }
    expect(metrics.onnx.parity_with_sklearn).toBe(1);
  });

  it("exposes 24 static letters and 2 motion letters covering A-Z", () => {
    expect(LETTERS).toHaveLength(26);
    expect(STATIC_LETTERS).toHaveLength(24);
    expect(MOTION_LETTERS.map((entry) => entry.letter)).toEqual(["J", "Z"]);
    expect(LETTERS.map((entry) => entry.letter)).toEqual(ALPHABET);
    for (const entry of LETTERS) {
      expect(entry.sample).toBe(`/letters/${entry.letter}.jpg`);
    }
  });
});
