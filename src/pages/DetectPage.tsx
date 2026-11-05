import { useCallback, useEffect, useRef, useState } from "react";
import CameraStage from "@/components/CameraStage";
import ErrorPanel from "@/components/ErrorPanel";
import PredictionPanel from "@/components/PredictionPanel";
import SessionHistory, { type HistoryEntry } from "@/components/SessionHistory";
import SectionHeading from "@/components/SectionHeading";
import StatusBadge from "@/components/StatusBadge";
import { useCamera } from "@/features/camera/useCamera";
import { Classifier } from "@/features/classifier/classifier";
import {
  DEFAULT_DETECTION_SETTINGS,
  useDetectionLoop,
  type DetectionSettings,
} from "@/features/detection/useDetectionLoop";
import { useLandmarker } from "@/features/detection/useLandmarker";
import { HISTORY_LIMIT } from "@/content/letters";

export default function DetectPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const landmarker = useLandmarker();

  const [classifier, setClassifier] = useState<Classifier | null>(null);
  const [classifierError, setClassifierError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DetectionSettings>(
    DEFAULT_DETECTION_SETTINGS,
  );
  const [mirror, setMirror] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyId = useRef(1);

  useEffect(() => {
    let cancelled = false;
    Classifier.load()
      .then((instance) => {
        if (!cancelled) setClassifier(instance);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setClassifierError(
            error instanceof Error ? error.message : "Model tidak dapat dimuat",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCommit = useCallback((letter: string) => {
    setHistory((previous) => {
      const next = [
        ...previous,
        { id: historyId.current, letter, at: Date.now() },
      ];
      historyId.current += 1;
      return next.slice(-HISTORY_LIMIT);
    });
  }, []);

  const live = camera.status === "live";
  const enabled =
    live && landmarker.status === "ready" && classifier !== null;

  const snapshot = useDetectionLoop({
    enabled,
    videoRef,
    canvasRef,
    landmarker: landmarker.instance,
    classifier,
    settings,
    onCommit: handleCommit,
  });

  const showStart = !live && camera.status !== "requesting";

  return (
    <div className="folio">
      <SectionHeading
        index="01"
        title="Deteksi"
        lede="Tahan satu gestur sampai status berubah menjadi “Prediksi terkunci”. Huruf yang goyah tidak akan dicatat."
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={live ? "ok" : "neutral"}>
              {live ? "Kamera aktif" : "Kamera nonaktif"}
            </StatusBadge>
            <StatusBadge tone={landmarker.status === "ready" ? "ok" : "warn"}>
              {landmarker.status === "ready" ? "MediaPipe siap" : "MediaPipe…"}
            </StatusBadge>
            <StatusBadge tone={classifier ? "ok" : classifierError ? "stop" : "warn"}>
              {classifier ? "Model siap" : classifierError ? "Model gagal" : "Model…"}
            </StatusBadge>
          </div>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,1fr)] lg:gap-10">
        <div className="flex flex-col gap-4">
          <CameraStage
            videoRef={videoRef}
            canvasRef={canvasRef}
            mirror={mirror}
            live={live}
          >
            {showStart ? (
              <div className="max-w-sm text-center">
                <p className="display text-2xl text-paper">Kamera belum aktif</p>
                <p className="mt-2 text-sm text-paper/70">
                  Izinkan akses kamera saat browser meminta. Gambar diproses di
                  perangkat dan tidak dikirim ke mana pun.
                </p>
                <button
                  type="button"
                  className="btn-primary focus-ring mt-5 border-paper bg-paper text-ink hover:bg-paper-sunk"
                  onClick={() => void camera.start()}
                >
                  Mulai kamera
                </button>
              </div>
            ) : camera.status === "requesting" ? (
              <p className="text-sm text-paper/80" role="status">
                Menunggu izin kamera…
              </p>
            ) : null}
          </CameraStage>

          <div className="flex flex-wrap items-center gap-3">
            {live ? (
              <button
                type="button"
                className="btn-quiet focus-ring"
                onClick={camera.stop}
              >
                Hentikan kamera
              </button>
            ) : camera.status === "requesting" ? (
              <button type="button" className="btn-primary focus-ring" disabled>
                Meminta izin…
              </button>
            ) : null}

            {camera.devices.length > 1 ? (
              <button
                type="button"
                className="btn-quiet focus-ring"
                onClick={() => void camera.switchCamera()}
              >
                Ganti kamera
              </button>
            ) : null}

            <details className="ml-auto">
              <summary className="focus-ring cursor-pointer text-sm text-ink-muted underline decoration-1 underline-offset-4">
                Pengaturan
              </summary>
              <div className="mt-3 w-64 border border-[color:var(--rule)] bg-paper p-4">
                <label
                  htmlFor="threshold"
                  className="flex items-baseline justify-between gap-2 text-sm font-semibold"
                >
                  Ambang keyakinan
                  <span className="tabular text-ink-muted">
                    {Math.round(settings.threshold * 100)}%
                  </span>
                </label>
                <input
                  id="threshold"
                  type="range"
                  min={40}
                  max={90}
                  step={5}
                  value={Math.round(settings.threshold * 100)}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      threshold: Number(event.target.value) / 100,
                    }))
                  }
                  className="mt-2 w-full accent-[color:var(--accent)]"
                />

                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.showLandmarks}
                    onChange={(event) =>
                      setSettings((previous) => ({
                        ...previous,
                        showLandmarks: event.target.checked,
                      }))
                    }
                    className="accent-[color:var(--accent)]"
                  />
                  Tampilkan landmark
                </label>

                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={mirror}
                    onChange={(event) => setMirror(event.target.checked)}
                    className="accent-[color:var(--accent)]"
                  />
                  Cermin tampilan
                </label>
              </div>
            </details>
          </div>

          {camera.failure ? (
            <ErrorPanel
              title={camera.failure.title}
              detail={camera.failure.detail}
              hint={camera.failure.hint}
              action={
                <button
                  type="button"
                  className="btn-quiet focus-ring"
                  onClick={() => void camera.start()}
                >
                  Coba lagi
                </button>
              }
            />
          ) : null}

          {landmarker.status === "error" ? (
            <ErrorPanel
              title="MediaPipe gagal dimuat"
              detail={landmarker.error ?? "Berkas model penglihatan tidak tersedia."}
              hint="Pastikan folder public/mediapipe berisi hand_landmarker.task dan wasm. Jalankan ulang npm run copy:assets."
            />
          ) : null}

          {classifierError ? (
            <ErrorPanel
              title="Model klasifikasi gagal dimuat"
              detail={classifierError}
              hint="Pastikan public/models/model.onnx dan label_map.json ada. Latih model dengan python -m ml.bisindo.train."
            />
          ) : null}

          <p className="text-xs leading-relaxed text-ink-muted">
            Huruf J dan Z membutuhkan gerakan. Bila model menebak J/Z dari satu
            pose, hasil tidak dikunci dan status berubah menjadi “Perlu
            gerakan”.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <PredictionPanel snapshot={snapshot} threshold={settings.threshold} />
          <SessionHistory
            entries={history}
            onClear={() => setHistory([])}
          />
        </div>
      </div>
    </div>
  );
}
