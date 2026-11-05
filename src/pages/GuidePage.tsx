import { useState } from "react";
import LetterPlate from "@/components/LetterPlate";
import SectionHeading from "@/components/SectionHeading";
import StatusBadge from "@/components/StatusBadge";
import { LETTERS, MOTION_LETTERS } from "@/content/letters";

type Filter = "all" | "static" | "motion";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Semua 26" },
  { id: "static", label: "Statis 24" },
  { id: "motion", label: "Gerak 2" },
];

export default function GuidePage() {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = LETTERS.filter((entry) =>
    filter === "all" ? true : entry.kind === filter,
  );

  return (
    <div className="folio">
      <SectionHeading
        index="02"
        title="Panduan A–Z"
        lede="Setiap gambar adalah contoh asli dari dataset publik, bukan ilustrasi buatan. Arah telapak dapat berbeda dari kebiasaan Anda; sesuaikan dengan referensi BISINDO yang Anda pelajari."
        aside={
          <div className="flex flex-wrap gap-2" role="group" aria-label="Saring huruf">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`focus-ring border px-3 py-1.5 text-sm transition-colors duration-120 ${
                  filter === item.id
                    ? "border-ink bg-ink text-paper"
                    : "border-[color:var(--rule)] text-ink-muted hover:border-ink hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      <section className="mt-8 grid gap-8 border-y border-[color:var(--rule)] py-6 sm:grid-cols-2">
        <div>
          <h2 className="display text-xl">24 huruf statis</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Dibaca dari satu pose tangan. Tahan pose sampai status berubah
            menjadi “Prediksi terkunci”.
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="display text-xl">2 huruf bergerak</h2>
            <StatusBadge tone="warn">Gerbang gerak</StatusBadge>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {MOTION_LETTERS.map((entry) => entry.letter).join(" dan ")} memakai
            lintasan ujung telunjuk. Model statis menebak bentuk awalnya, tetapi
            hasil hanya dikunci bila lintasan cocok.
          </p>
        </div>
      </section>

      {visible.length === 0 ? (
        <p className="mt-10 text-ink-muted">Tidak ada huruf pada saringan ini.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry) => (
            <li key={entry.letter}>
              <LetterPlate entry={entry} />
            </li>
          ))}
        </ul>
      )}

      <section className="mt-14 border-t border-[color:var(--rule)] pt-8">
        <h2 className="display text-2xl">Cara berlatih</h2>
        <ol className="mt-4 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Jarak",
              body: "Letakkan tangan 50–70 cm dari kamera. Seluruh telapak harus masuk frame.",
            },
            {
              title: "Cahaya",
              body: "Hadapkan sumber cahaya ke telapak, bukan dari belakang tangan.",
            },
            {
              title: "Tahan",
              body: "Tahan pose 5–10 frame. Status “Memproses gestur” berarti prediksi belum dikunci.",
            },
          ].map((item, index) => (
            <li key={item.title}>
              <p className="eyebrow tabular">0{index + 1}</p>
              <h3 className="display mt-1 text-lg">{item.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
