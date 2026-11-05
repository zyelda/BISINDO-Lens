import ConfidenceBar from "@/components/ConfidenceBar";
import StatusBadge, { type Tone } from "@/components/StatusBadge";
import type { DetectionSnapshot } from "@/features/detection/useDetectionLoop";

const PHASE_LABEL: Record<DetectionSnapshot["phase"], string> = {
  starting: "Menyiapkan model",
  "waiting-hand": "Menunggu tangan",
  low: "Gestur belum dikenali",
  stabilizing: "Memproses gestur",
  committed: "Prediksi terkunci",
  "motion-required": "Perlu gerakan",
};

const PHASE_TONE: Record<DetectionSnapshot["phase"], Tone> = {
  starting: "neutral",
  "waiting-hand": "neutral",
  low: "warn",
  stabilizing: "warn",
  committed: "ok",
  "motion-required": "warn",
};

export default function PredictionPanel({
  snapshot,
  threshold,
}: {
  snapshot: DetectionSnapshot;
  threshold: number;
}) {
  const { phase, letter, preview, confidence, runnerUp, runnerUpConfidence } =
    snapshot;

  const committed = phase === "committed" ? letter : null;
  const display = committed ?? preview;
  const dimmed = committed === null;

  return (
    <section aria-labelledby="hasil-prediksi" className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="hasil-prediksi" className="eyebrow">
          Hasil prediksi
        </h2>
        <StatusBadge tone={PHASE_TONE[phase]}>
          {PHASE_LABEL[phase]}
        </StatusBadge>
      </div>

      <div className="flex items-end justify-between gap-4 border-y border-[color:var(--rule)] py-4">
        <div className="min-w-0">
          <p
            className={`display text-[7rem] leading-[0.82] tabular sm:text-[9rem] ${
              dimmed ? "text-ink/25" : "text-ink"
            }`}
            aria-hidden="true"
          >
            {display ?? "—"}
          </p>
        </div>
        <div className="w-28 shrink-0 pb-1 text-right">
          <p className="eyebrow">Keyakinan</p>
          <p className="tabular text-2xl font-semibold">
            {Math.round(confidence * 100)}%
          </p>
        </div>
      </div>

      <ConfidenceBar
        value={confidence}
        tone={phase === "committed" ? "ok" : "warn"}
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-ink-muted">Tangan terdeteksi</dt>
        <dd className="tabular text-right font-semibold">{snapshot.hands}</dd>
        <dt className="text-ink-muted">Tangan aktif</dt>
        <dd className="text-right font-semibold">{snapshot.handedness ?? "—"}</dd>
        <dt className="text-ink-muted">Kandidat kedua</dt>
        <dd className="text-right font-semibold">
          {runnerUp ? `${runnerUp} · ${Math.round(runnerUpConfidence * 100)}%` : "—"}
        </dd>
        <dt className="text-ink-muted">Ambang keyakinan</dt>
        <dd className="tabular text-right font-semibold">
          {Math.round(threshold * 100)}%
        </dd>
        <dt className="text-ink-muted">Laju proses</dt>
        <dd className="tabular text-right font-semibold">{snapshot.fps} fps</dd>
      </dl>

      {phase === "motion-required" ? (
        <p className="border-l-2 border-[color:var(--signal-warn)] pl-3 text-sm text-ink-muted">
          Huruf {preview} memerlukan gerakan. Tahan pose awal lalu gambar
          lintasannya dengan telunjuk. Prediksi statis tidak akan dikunci.
        </p>
      ) : null}

      {committed ? (
        <p className="sr-only" aria-live="polite">
          Huruf {committed} terdeteksi
        </p>
      ) : null}
    </section>
  );
}
