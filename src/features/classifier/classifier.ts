import * as ort from "onnxruntime-web/wasm";
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import ortMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import { N_FEATURES } from "@/features/landmarks/features";

// Let Vite fingerprint and serve the two runtime files the WASM backend
// actually needs. Importing them from node_modules also avoids the dev-server
// error that occurs when ONNX Runtime dynamically imports a file from
// /public (Vite refuses to transform public files as modules).
ort.env.wasm.wasmPaths = { wasm: ortWasmUrl, mjs: ortMjsUrl };
// Single threaded WASM works without COOP/COEP headers. Threads would be
// faster but require cross-origin isolation on the host.
ort.env.wasm.numThreads = 1;

export const MODEL_URL = "/models/model.onnx";
export const LABELS_URL = "/models/label_map.json";

export interface Prediction {
  probabilities: Float32Array;
  topIndex: number;
  topConfidence: number;
  runnerUpIndex: number;
  runnerUpConfidence: number;
}

export class Classifier {
  private constructor(
    private readonly session: ort.InferenceSession,
    readonly labels: string[],
    private readonly inputName: string,
    private readonly outputName: string,
  ) {}

  static async load(modelUrl = MODEL_URL, labelsUrl = LABELS_URL): Promise<Classifier> {
    const [session, labelsResponse] = await Promise.all([
      ort.InferenceSession.create(modelUrl, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      }),
      fetch(labelsUrl),
    ]);
    if (!labelsResponse.ok) {
      throw new Error(`label map unavailable (${labelsResponse.status})`);
    }
    const labelMap = (await labelsResponse.json()) as Record<string, string>;
    const labels = Object.keys(labelMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => labelMap[key]);

    const inputName = session.inputNames[0];
    const probabilityOutput = session.outputNames.find((name) =>
      name.toLowerCase().includes("probab"),
    );
    if (!probabilityOutput) {
      throw new Error("model has no probability output");
    }
    return new Classifier(session, labels, inputName, probabilityOutput);
  }

  async predict(features: Float32Array): Promise<Prediction> {
    if (features.length !== N_FEATURES) {
      throw new Error(`expected ${N_FEATURES} features, got ${features.length}`);
    }
    const tensor = new ort.Tensor("float32", features, [1, N_FEATURES]);
    const output = await this.session.run({ [this.inputName]: tensor });
    const probabilities = output[this.outputName].data as Float32Array;

    let topIndex = 0;
    let runnerUpIndex = 0;
    let topConfidence = -1;
    let runnerUpConfidence = -1;
    for (let i = 0; i < probabilities.length; i += 1) {
      const value = probabilities[i];
      if (value > topConfidence) {
        runnerUpIndex = topIndex;
        runnerUpConfidence = topConfidence;
        topIndex = i;
        topConfidence = value;
      } else if (value > runnerUpConfidence) {
        runnerUpIndex = i;
        runnerUpConfidence = value;
      }
    }
    return {
      probabilities,
      topIndex,
      topConfidence,
      runnerUpIndex,
      runnerUpConfidence: Math.max(0, runnerUpConfidence),
    };
  }
}
