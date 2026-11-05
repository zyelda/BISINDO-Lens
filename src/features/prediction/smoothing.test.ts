import { describe, expect, it } from "vitest";
import {
  DEFAULT_SMOOTHER_OPTIONS,
  PredictionSmoother,
  type SmootherOptions,
} from "@/features/prediction/smoothing";

const LABELS = ["A", "B", "C"];

const OPTIONS: SmootherOptions = {
  ...DEFAULT_SMOOTHER_OPTIONS,
  threshold: 0.6,
  margin: 0.15,
  stableFrames: 3,
  releaseFrames: 2,
  ema: 1,
};

function array(...values: number[]): Float32Array {
  return Float32Array.from(values);
}

describe("PredictionSmoother", () => {
  it("does not emit a letter below the confidence threshold", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);
    const result = smoother.push(array(0.41, 0.3, 0.29));
    expect(result.phase).toBe("low");
    expect(result.letter).toBeNull();
    expect(result.previewLetter).toBeNull();
  });

  it("does not emit a letter when the runner-up is too close", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);
    const result = smoother.push(array(0.5, 0.45, 0.05));
    expect(result.phase).toBe("low");
    expect(result.letter).toBeNull();
    expect(result.margin).toBeCloseTo(0.05, 5);
  });

  it("commits only after the configured number of stable frames", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);

    expect(smoother.push(array(0.9, 0.05, 0.05))).toMatchObject({
      phase: "stabilizing",
      letter: null,
      previewLetter: "A",
      streak: 1,
    });
    expect(smoother.push(array(0.9, 0.05, 0.05))).toMatchObject({
      phase: "stabilizing",
      letter: null,
      streak: 2,
    });
    expect(smoother.push(array(0.9, 0.05, 0.05))).toMatchObject({
      phase: "committed",
      letter: "A",
      previewLetter: "A",
      streak: 3,
    });
  });

  it("resets the streak when the top candidate changes", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);
    smoother.push(array(0.9, 0.05, 0.05));
    smoother.push(array(0.05, 0.9, 0.05));
    const third = smoother.push(array(0.9, 0.05, 0.05));
    expect(third.phase).toBe("stabilizing");
    expect(third.streak).toBe(1);
    expect(third.letter).toBeNull();
  });

  it("holds a committed letter briefly, then releases it", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);
    for (let i = 0; i < 3; i += 1) smoother.push(array(0.9, 0.05, 0.05));

    const firstMiss = smoother.miss();
    expect(firstMiss.phase).toBe("committed");
    expect(firstMiss.letter).toBe("A");

    const secondMiss = smoother.miss();
    expect(secondMiss.phase).toBe("waiting");
    expect(secondMiss.letter).toBeNull();
  });

  it("reports the runner-up class and its score", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);
    const result = smoother.push(array(0.1, 0.7, 0.2));
    expect(result.previewLetter).toBe("B");
    expect(result.runnerUp).toBe("C");
    expect(result.runnerUpConfidence).toBeCloseTo(0.2, 5);
  });

  it("clears all state on reset", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);
    for (let i = 0; i < 3; i += 1) smoother.push(array(0.9, 0.05, 0.05));
    smoother.reset();
    const result = smoother.push(array(0.9, 0.05, 0.05));
    expect(result.phase).toBe("stabilizing");
    expect(result.streak).toBe(1);
  });

  it("rejects a probability vector with the wrong length", () => {
    const smoother = new PredictionSmoother(LABELS, OPTIONS);
    expect(() => smoother.push(array(0.9, 0.1))).toThrow(
      /expected 3 probabilities/,
    );
  });
});
