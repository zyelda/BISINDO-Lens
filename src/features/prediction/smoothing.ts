export type PredictionPhase =
  | "waiting"
  | "low"
  | "stabilizing"
  | "committed";

export interface SmootherOptions {
  /** Minimum EMA probability to accept a candidate. */
  threshold: number;
  /** Minimum gap between top-1 and top-2. */
  margin: number;
  /** Consecutive frames required before a letter is committed. */
  stableFrames: number;
  /** Frames without a valid candidate before the committed letter is released. */
  releaseFrames: number;
  /** Exponential moving average weight for the new frame. */
  ema: number;
}

export const DEFAULT_SMOOTHER_OPTIONS: SmootherOptions = {
  threshold: 0.6,
  margin: 0.15,
  stableFrames: 5,
  releaseFrames: 15,
  ema: 0.35,
};

export interface SmoothedPrediction {
  phase: PredictionPhase;
  /** Letter that has been confirmed and should be treated as output. */
  letter: string | null;
  /** Current top candidate while it is still stabilising. */
  previewLetter: string | null;
  confidence: number;
  runnerUp: string | null;
  runnerUpConfidence: number;
  margin: number;
  streak: number;
}

const EMPTY: SmoothedPrediction = {
  phase: "waiting",
  letter: null,
  previewLetter: null,
  confidence: 0,
  runnerUp: null,
  runnerUpConfidence: 0,
  margin: 0,
  streak: 0,
};

export class PredictionSmoother {
  private ema: Float32Array | null = null;
  private candidate: number | null = null;
  private streak = 0;
  private committed: number | null = null;
  private misses = 0;

  constructor(
    private labels: string[],
    private options: SmootherOptions = DEFAULT_SMOOTHER_OPTIONS,
  ) {}

  setLabels(labels: string[]): void {
    this.labels = labels;
    this.reset();
  }

  setOptions(options: Partial<SmootherOptions>): void {
    this.options = { ...this.options, ...options };
  }

  reset(): void {
    this.ema = null;
    this.candidate = null;
    this.streak = 0;
    this.committed = null;
    this.misses = 0;
  }

  /** Called when the hand disappears. Keeps the letter briefly. */
  miss(): SmoothedPrediction {
    this.misses += 1;
    this.candidate = null;
    this.streak = 0;
    if (this.misses >= this.options.releaseFrames) {
      this.committed = null;
      this.ema = null;
      return { ...EMPTY };
    }
    return {
      phase: this.committed === null ? "waiting" : "committed",
      letter: this.committed === null ? null : this.labels[this.committed],
      previewLetter: null,
      confidence: 0,
      runnerUp: null,
      runnerUpConfidence: 0,
      margin: 0,
      streak: 0,
    };
  }

  push(probabilities: Float32Array): SmoothedPrediction {
    if (probabilities.length !== this.labels.length) {
      throw new Error(
        `expected ${this.labels.length} probabilities, got ${probabilities.length}`,
      );
    }

    if (!this.ema) {
      this.ema = new Float32Array(probabilities);
    } else {
      const alpha = this.options.ema;
      for (let i = 0; i < probabilities.length; i += 1) {
        this.ema[i] = alpha * probabilities[i] + (1 - alpha) * this.ema[i];
      }
    }

    let top = 0;
    let second = -1;
    let topConfidence = -1;
    let secondConfidence = -1;
    for (let i = 0; i < this.ema.length; i += 1) {
      const value = this.ema[i];
      if (value > topConfidence) {
        second = top;
        secondConfidence = topConfidence;
        top = i;
        topConfidence = value;
      } else if (value > secondConfidence) {
        second = i;
        secondConfidence = value;
      }
    }
    const margin = topConfidence - Math.max(0, secondConfidence);

    const valid =
      topConfidence >= this.options.threshold && margin >= this.options.margin;

    if (valid) {
      this.misses = 0;
      if (this.candidate === top) {
        this.streak += 1;
      } else {
        this.candidate = top;
        this.streak = 1;
      }
      if (this.streak >= this.options.stableFrames) {
        this.committed = top;
      }
    } else {
      this.misses += 1;
      this.candidate = null;
      this.streak = 0;
      if (this.misses >= this.options.releaseFrames) {
        this.committed = null;
      }
    }

    const isCommitted =
      valid &&
      this.committed !== null &&
      this.committed === top &&
      this.streak >= this.options.stableFrames;

    return {
      phase: valid ? (isCommitted ? "committed" : "stabilizing") : "low",
      letter: this.committed === null ? null : this.labels[this.committed],
      previewLetter: valid ? this.labels[top] : null,
      confidence: topConfidence,
      runnerUp: second >= 0 ? this.labels[second] : null,
      runnerUpConfidence: Math.max(0, secondConfidence),
      margin,
      streak: this.streak,
    };
  }
}
