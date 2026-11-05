import { HISTORY_LIMIT } from "@/content/letters";

export interface HistoryEntry {
  id: number;
  letter: string;
  at: number;
}

export default function SessionHistory({
  entries,
  onClear,
}: {
  entries: HistoryEntry[];
  onClear: () => void;
}) {
  const recent = entries.slice(-HISTORY_LIMIT);

  return (
    <section aria-labelledby="riwayat" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="riwayat" className="eyebrow">
          Riwayat sesi
        </h2>
        <button
          type="button"
          className="focus-ring text-sm text-ink-muted underline decoration-1 underline-offset-4 hover:text-ink disabled:opacity-40"
          onClick={onClear}
          disabled={entries.length === 0}
        >
          Kosongkan
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="border border-dashed border-[color:var(--rule)] px-4 py-6 text-sm text-ink-muted">
          Belum ada huruf yang terkunci. Mulai kamera dan tahan satu gestur
          sampai status berubah menjadi “Prediksi terkunci”.
        </p>
      ) : (
        <ol className="flex flex-wrap gap-x-2 gap-y-2" aria-label="Huruf yang terdeteksi">
          {recent.map((entry) => (
            <li
              key={entry.id}
              className="display flex h-10 w-10 items-center justify-center border border-[color:var(--rule)] bg-paper-sunk text-xl"
            >
              {entry.letter}
            </li>
          ))}
        </ol>
      )}

      {recent.length > 0 ? (
        <p className="tabular text-sm text-ink-muted">
          {recent.map((entry) => entry.letter).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
