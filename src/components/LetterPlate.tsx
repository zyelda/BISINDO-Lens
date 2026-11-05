import { useState } from "react";
import type { LetterEntry } from "@/content/letters";
import StatusBadge from "@/components/StatusBadge";

export default function LetterPlate({ entry }: { entry: LetterEntry }) {
  const [failed, setFailed] = useState(false);

  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="display text-4xl">{entry.letter}</span>
        <StatusBadge tone={entry.kind === "motion" ? "warn" : "neutral"}>
          {entry.kind === "motion" ? "Gerak" : "Statis"}
        </StatusBadge>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden border border-[color:var(--rule)] bg-paper-sunk">
        {failed ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-muted">
            Contoh gambar tidak tersedia.
          </div>
        ) : (
          <img
            src={entry.sample}
            alt={`Contoh gestur huruf ${entry.letter} dari dataset publik`}
            loading="eager"
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{entry.note}</p>
    </article>
  );
}
