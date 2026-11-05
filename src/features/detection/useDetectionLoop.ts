import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Category, HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { Classifier } from "@/features/classifier/classifier";
import {
  HAND_CONNECTIONS,
  extractHandFeatures,
  palmSpan,
  type Landmark,
} from "@/features/landmarks/features";
import {
  DEFAULT_SMOOTHER_OPTIONS,
  PredictionSmoother,
  type SmoothedPrediction,
} from "@/features/prediction/smoothing";
import {
  classifyMotion,
  type MotionResult,
  type TrailPoint,
} from "@/features/prediction/motion";

export type DetectionPhase =
  | "starting"
  | "waiting-hand"
  | "low"
  | "stabilizing"
  | "committed"
  | "motion-required";

export interface DetectionSettings {
  threshold: number;
  margin: number;
  stableFrames: number;
  showLandmarks: boolean;
}

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  threshold: DEFAULT_SMOOTHER_OPTIONS.threshold,
  margin: DEFAULT_SMOOTHER_OPTIONS.margin,
  stableFrames: DEFAULT_SMOOTHER_OPTIONS.stableFrames,
  showLandmarks: true,
};

export interface DetectionSnapshot {
  phase: DetectionPhase;
  letter: string | null;
  preview: string | null;
  confidence: number;
  runnerUp: string | null;
  runnerUpConfidence: number;
  hands: number;
  fps: number;
  motion: "J" | "Z" | null;
  handedness: string | null;
}

const INITIAL: DetectionSnapshot = {
  phase: "starting",
  letter: null,
  preview: null,
  confidence: 0,
  runnerUp: null,
  runnerUpConfidence: 0,
  hands: 0,
  fps: 0,
  motion: null,
  handedness: null,
};

const MOTION_AMBIGUOUS = new Set(["I", "D", "G", "J", "Z"]);

type VideoWithCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function toLandmarks(points: NormalizedLandmark[]): Landmark[] {
  return points.map((point) => ({ x: point.x, y: point.y, z: point.z }));
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: NormalizedLandmark[][],
  handedness: Category[][],
  show: boolean,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!show) return;

  const unit = Math.max(2, canvas.width * 0.0035);
  landmarks.forEach((hand, handIndex) => {
    const primary = handIndex === 0;
    context.strokeStyle = primary ? "#A63D24" : "rgba(244, 239, 230, 0.55)";
    context.fillStyle = primary ? "#F4EFE6" : "rgba(244, 239, 230, 0.7)";
    context.lineWidth = unit;

    for (const [from, to] of HAND_CONNECTIONS) {
      context.beginPath();
      context.moveTo(hand[from].x * canvas.width, hand[from].y * canvas.height);
      context.lineTo(hand[to].x * canvas.width, hand[to].y * canvas.height);
      context.stroke();
    }
    for (const point of hand) {
      context.beginPath();
      context.arc(
        point.x * canvas.width,
        point.y * canvas.height,
        unit * 1.15,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    const label = handedness[handIndex]?.[0]?.categoryName;
    if (label) {
      context.font = `${unit * 5}px Inter, system-ui, sans-serif`;
      context.fillStyle = "#F4EFE6";
      context.fillText(
        label === "Left" ? "Kiri" : "Kanan",
        hand[0].x * canvas.width + unit * 2,
        hand[0].y * canvas.height - unit * 2,
      );
    }
  });
}

export interface DetectionLoopOptions {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  landmarker: HandLandmarker | null;
  classifier: Classifier | null;
  settings: DetectionSettings;
  onCommit: (letter: string) => void;
}

export function useDetectionLoop({
  enabled,
  videoRef,
  canvasRef,
  landmarker,
  classifier,
  settings,
  onCommit,
}: DetectionLoopOptions): DetectionSnapshot {
  const [snapshot, setSnapshot] = useState<DetectionSnapshot>(INITIAL);
  const settingsRef = useRef(settings);
  const commitRef = useRef(onCommit);
  const smootherRef = useRef<PredictionSmoother | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    smootherRef.current?.setOptions({
      threshold: settings.threshold,
      margin: settings.margin,
      stableFrames: settings.stableFrames,
    });
  }, [settings]);

  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    if (!enabled || !landmarker || !classifier) {
      setSnapshot((previous) => ({ ...previous, phase: "starting", fps: 0 }));
      return;
    }

    const smoother = new PredictionSmoother(classifier.labels, {
      ...DEFAULT_SMOOTHER_OPTIONS,
      threshold: settingsRef.current.threshold,
      margin: settingsRef.current.margin,
      stableFrames: settingsRef.current.stableFrames,
    });
    smootherRef.current = smoother;

    let stopped = false;
    let handle = 0;
    let useCallback = false;
    let lastVideoTime = -1;
    let processing = false;
    let frames = 0;
    let fpsWindowStart = performance.now();
    let fps = 0;
    let lastPublish = 0;
    let trail: TrailPoint[] = [];
    let lastOutput: string | null = null;
    const video = videoRef.current as VideoWithCallback | null;

    if (video && typeof video.requestVideoFrameCallback === "function") {
      useCallback = true;
    }

    const publish = (next: DetectionSnapshot, force = false) => {
      const now = performance.now();
      if (!force && now - lastPublish < 80) return;
      lastPublish = now;
      setSnapshot(next);
    };

    const handleFrame = async (now: number) => {
      if (!video || video.readyState < 2 || processing) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      processing = true;

      try {
        const result = landmarker.detectForVideo(video, now);
        drawOverlay(
          canvasRef.current as HTMLCanvasElement,
          video,
          result.landmarks,
          result.handedness,
          settingsRef.current.showLandmarks,
        );

        frames += 1;
        if (now - fpsWindowStart >= 1000) {
          fps = Math.round((frames * 1000) / (now - fpsWindowStart));
          frames = 0;
          fpsWindowStart = now;
        }

        const hands = result.landmarks.length;
        if (hands === 0) {
          trail = [];
          const missed = smoother.miss();
          const phase: DetectionPhase =
            missed.letter === null ? "waiting-hand" : "committed";
          if (missed.letter === null) lastOutput = null;
          publish({
            phase,
            letter: missed.letter,
            preview: null,
            confidence: 0,
            runnerUp: null,
            runnerUpConfidence: 0,
            hands: 0,
            fps,
            motion: null,
            handedness: null,
          });
          return;
        }

        const handsNormalized = result.landmarks.map(toLandmarks);
        let primary = 0;
        let primarySpan = -1;
        handsNormalized.forEach((hand, index) => {
          const span = palmSpan(hand);
          if (span > primarySpan) {
            primarySpan = span;
            primary = index;
          }
        });
        const hand = handsNormalized[primary];

        const aspect = video.videoWidth / Math.max(1, video.videoHeight);
        const features = extractHandFeatures(hand, aspect);
        const prediction = await classifier.predict(features);
        if (stopped) return;

        const smoothed: SmoothedPrediction = smoother.push(prediction.probabilities);
        const staticLetter = smoothed.letter ?? smoothed.previewLetter;

        const palm = palmSpan(hand);
        trail.push({ x: hand[8].x, y: hand[8].y, t: now, palm });
        if (trail.length > 90) trail = trail.slice(-90);
        const motion: MotionResult | null = classifyMotion(trail);

        let phase: DetectionPhase = "low";
        let letter = smoothed.letter;
        let preview = smoothed.previewLetter;
        let confidence = smoothed.confidence;
        let runnerUp = smoothed.runnerUp;
        let runnerUpConfidence = smoothed.runnerUpConfidence;

        if (
          motion &&
          (staticLetter === null || MOTION_AMBIGUOUS.has(staticLetter))
        ) {
          letter = motion.letter;
          preview = motion.letter;
          confidence = Math.max(confidence, motion.score);
          phase = "committed";
          runnerUp = staticLetter;
          runnerUpConfidence = smoothed.confidence;
        } else if (
          (smoothed.letter === "J" || smoothed.letter === "Z") &&
          !motion
        ) {
          letter = null;
          preview = smoothed.letter;
          phase = "motion-required";
        } else if (smoothed.phase === "committed") {
          phase = "committed";
        } else if (smoothed.phase === "stabilizing") {
          phase = "stabilizing";
        } else if (smoothed.phase === "low") {
          phase = "low";
        }

        if (letter && letter !== lastOutput) {
          lastOutput = letter;
          commitRef.current(letter);
        } else if (!letter) {
          lastOutput = null;
        }

        publish({
          phase,
          letter,
          preview,
          confidence,
          runnerUp,
          runnerUpConfidence,
          hands,
          fps,
          motion: motion?.letter ?? null,
          handedness:
            result.handedness[primary]?.[0]?.categoryName === "Left"
              ? "Kiri"
              : "Kanan",
        });
      } catch (error) {
        console.error("[detection]", error);
      } finally {
        processing = false;
      }
    };

    const schedule = () => {
      if (stopped) return;
      if (useCallback && video?.requestVideoFrameCallback) {
        handle = video.requestVideoFrameCallback(() => {
          void handleFrame(performance.now());
          schedule();
        });
      } else {
        handle = requestAnimationFrame(() => {
          void handleFrame(performance.now());
          schedule();
        });
      }
    };

    publish({ ...INITIAL, phase: "waiting-hand", fps: 0 }, true);
    schedule();

    return () => {
      stopped = true;
      if (useCallback && video?.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(handle);
      } else {
        cancelAnimationFrame(handle);
      }
      smootherRef.current = null;
    };
  }, [enabled, landmarker, classifier, videoRef, canvasRef]);

  return snapshot;
}
