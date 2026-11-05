import ConfusionMatrix from "@/components/ConfusionMatrix";
import SectionHeading from "@/components/SectionHeading";
import metrics from "../../public/models/metrics.json";

const percent = (value: number, digits = 2) =>
  `${(value * 100).toFixed(digits)}%`;

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-4">
      <dt className="eyebrow">{label}</dt>
      <dd className="display tabular text-4xl">{value}</dd>
      <p className="text-sm text-ink-muted">{note}</p>
    </div>
  );
}

export default function ModelPage() {
  const labels = metrics.labels;
  const perClass = metrics.per_class as Record<
    string,
    { precision: number; recall: number; f1: number; support: number }
  >;

  return (
    <div className="folio">
      <SectionHeading
        index="03"
        title="Model & evaluasi"
        lede="Semua angka di halaman ini dihasilkan oleh skrip training di repositori ini pada test split yang tidak dipakai untuk memilih model. Tidak ada angka yang diketik manual."
      />

      <dl className="mt-8 grid grid-cols-1 gap-x-8 border-b border-[color:var(--rule)] sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Akurasi test"
          value={percent(metrics.test.accuracy)}
          note={`${metrics.test.samples} gambar held-out`}
        />
        <Metric
          label="Macro F1"
          value={metrics.test.macro_f1.toFixed(3)}
          note="Rata-rata 26 kelas, tidak dibobot"
        />
        <Metric
          label="Balanced accuracy"
          value={percent(metrics.test.balanced_accuracy)}
          note="Setiap kelas berbobot sama"
        />
        <Metric
          label="Uji cermin"
          value={percent(metrics.mirror_test.accuracy)}
          note="Test yang sama, x dicerminkan"
        />
        <Metric
          label="Paritas ONNX"
          value={percent(metrics.onnx.parity_with_sklearn, 1)}
          note="Prediksi ONNX vs scikit-learn"
        />
      </dl>

      <p className="mt-4 max-w-3xl text-sm text-ink-muted">
        Uji cermin memakai gambar test yang sama dengan koordinat x dibalik.
        Ini bukan data independen, melainkan pemeriksaan bahwa pratinjau
        webcam yang dicerminkan tidak mengubah prediksi. Model dilatih dengan
        augmentasi flip horizontal untuk alasan ini.
      </p>

      <section className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
        <div className="min-w-0">
          <h2 className="display text-2xl">Confusion matrix</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Kesalahan terbanyak ada pada pasangan huruf yang memang mirip secara
            geometris. Nilai per sel adalah jumlah gambar test.
          </p>
          <div className="mt-5">
            <ConfusionMatrix matrix={metrics.confusion_matrix} labels={labels} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="display text-2xl">Konfigurasi</h2>
            <dl className="mt-3 divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
              {[
                ["Classifier", "Random Forest"],
                ["Pohon keputusan", String(metrics.classifier.n_estimators)],
                ["Kedalaman maksimum", String(metrics.classifier.max_depth)],
                ["max_features", String(metrics.classifier.max_features)],
                ["Bobot kelas", String(metrics.classifier.class_weight)],
                ["Fitur", `${metrics.feature_names.length} dimensi`],
                ["Versi fitur", metrics.feature_spec_version],
                ["Versi model", metrics.version],
              ].map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-baseline justify-between gap-4 py-2"
                >
                  <dt className="text-ink-muted">{key}</dt>
                  <dd className="tabular text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className="display text-2xl">5-fold cross-validation</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Dilakukan hanya pada data training untuk memilih
              hyperparameter. Macro F1{" "}
              <span className="tabular font-semibold text-ink">
                {metrics.cv.best_macro_f1.toFixed(3)}
              </span>{" "}
              ± {metrics.cv.std.toFixed(3)}.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="display text-2xl">Laporan per kelas</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Setiap kelas memiliki empat gambar test. Satu kesalahan sudah
          menurunkan recall sebesar 25%, jadi angka per kelas harus dibaca
          sebagai indikasi kasar, bukan estimasi stabil.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:min-w-[34rem] sm:text-sm">
            <caption className="sr-only">
              Precision, recall, dan F1 per huruf pada test set
            </caption>
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="py-2 pr-2 sm:pr-4 font-semibold">
                  Huruf
                </th>
                <th scope="col" className="py-2 pr-2 sm:pr-4 text-right font-semibold">
                  Precision
                </th>
                <th scope="col" className="py-2 pr-2 sm:pr-4 text-right font-semibold">
                  Recall
                </th>
                <th scope="col" className="py-2 pr-2 sm:pr-4 text-right font-semibold">
                  F1
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  n
                </th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label) => {
                const row = perClass[label];
                const weak = row.f1 < 0.6;
                return (
                  <tr
                    key={label}
                    className="border-b border-[color:var(--rule)]"
                  >
                    <th scope="row" className="py-2 pr-2 sm:pr-4 font-semibold">
                      {label}
                    </th>
                    <td className="tabular py-2 pr-2 sm:pr-4 text-right">
                      {row.precision.toFixed(2)}
                    </td>
                    <td className="tabular py-2 pr-2 sm:pr-4 text-right">
                      {row.recall.toFixed(2)}
                    </td>
                    <td
                      className={`tabular py-2 pr-2 sm:pr-4 text-right ${
                        weak ? "font-semibold text-[color:var(--signal-stop)]" : ""
                      }`}
                    >
                      {row.f1.toFixed(2)}
                    </td>
                    <td className="tabular py-2 text-right">{row.support}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-10 border-t border-[color:var(--rule)] pt-8 lg:grid-cols-2">
        <div>
          <h2 className="display text-2xl">Dataset</h2>
          <dl className="mt-3 divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-muted">Sumber</dt>
              <dd className="text-right font-semibold">
                <a
                  href={metrics.dataset.url}
                  className="focus-ring underline decoration-1 underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  {metrics.dataset.name}
                </a>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-muted">Lisensi</dt>
              <dd className="text-right font-semibold">
                {metrics.dataset.license}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-muted">Signer</dt>
              <dd className="tabular text-right font-semibold">
                {metrics.dataset.signers}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-muted">Gambar training</dt>
              <dd className="tabular text-right font-semibold">
                {metrics.dataset.train_images}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-muted">Baris training (augmentasi)</dt>
              <dd className="tabular text-right font-semibold">
                {metrics.dataset.train_images_augmented}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-muted">Gambar test</dt>
              <dd className="tabular text-right font-semibold">
                {metrics.dataset.test_images}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-ink-muted">Ukuran ONNX</dt>
              <dd className="tabular text-right font-semibold">
                {(metrics.onnx.size_bytes / 1024 / 1024).toFixed(2)} MB
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-ink-muted">{metrics.dataset.note}</p>
        </div>

        <div>
          <h2 className="display text-2xl">Keterbatasan</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-ink-muted">
            {metrics.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>
              Dataset publik lain yang diuji (KrisnaSantosa15, MIT) hanya
              mencapai 30,8% saat dipakai lintas sumber, sehingga tidak
              dicampur ke model final.
            </li>
            <li>
              Dua tangan dilacak dan di-overlay; klasifikasi memakai tangan
              aktif (telapak terbesar). Tidak ada kelas gestur dua tangan
              dalam pelatihan.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
