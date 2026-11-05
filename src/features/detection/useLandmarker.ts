import { useEffect, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

export type LandmarkerStatus = "loading" | "ready" | "error";

export interface LandmarkerHandle {
  status: LandmarkerStatus;
  error: string | null;
  instance: HandLandmarker | null;
}

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/hand_landmarker.task";

export function useLandmarker(): LandmarkerHandle {
  const [status, setStatus] = useState<LandmarkerStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<HandLandmarker | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: HandLandmarker | null = null;

    async function load() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
        const options = {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: "GPU" as const,
          },
          runningMode: "VIDEO" as const,
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        };

        try {
          created = await HandLandmarker.createFromOptions(fileset, options);
        } catch {
          // Some machines/drivers cannot create a GPU delegate. Fall back to
          // CPU rather than failing the whole page.
          created = await HandLandmarker.createFromOptions(fileset, {
            ...options,
            baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
          });
        }

        if (cancelled) {
          created.close();
          return;
        }
        setInstance(created);
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Gagal memuat MediaPipe");
        setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
      created?.close();
    };
  }, []);

  return { status, error, instance };
}

export type { HandLandmarkerResult };
