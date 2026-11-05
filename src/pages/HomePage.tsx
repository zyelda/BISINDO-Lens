import { Link } from "react-router-dom";

const STEPS = [
  {
    index: "01",
    title: "Kamera",
    body: "Webcam menangkap gambar di perangkat. Tidak ada frame yang diunggah.",
  },
  {
    index: "02",
    title: "Landmark",
    body: "MediaPipe menemukan hingga dua tangan dan menandai 21 titik sendi pada tiap tangan.",
  },
  {
    index: "03",
    title: "Klasifikasi",
    body: "Random Forest membaca vektor fitur dan mengunci huruf setelah prediksi stabil.",
  },
];

export default function HomePage() {
  return (
    <div className="folio">
      <section className="pt-10 sm:pt-16" aria-labelledby="judul-utama">
        <p className="eyebrow">01 / Pengenalan</p>
        <h1
          id="judul-utama"
          className="display mt-4 max-w-4xl text-5xl leading-[0.95] sm:text-6xl lg:text-7xl"
        >
          Membaca tangan,
          <br />
          satu huruf setiap kali.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-muted">
          BISINDO Lens adalah alat latihan abjad Bahasa Isyarat Indonesia.
          Arahkan tangan ke kamera, tahan gestur, dan aplikasi menampilkan
          huruf beserta tingkat keyakinannya — seluruhnya di browser Anda.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/deteksi" className="btn-primary focus-ring">
            Mulai deteksi
          </Link>
          <Link to="/panduan" className="btn-quiet focus-ring">
            Lihat panduan A–Z
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-px border-y border-[color:var(--rule)] bg-[color:var(--rule)] sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.index} className="bg-paper p-6">
            <p className="eyebrow tabular">{step.index}</p>
            <h2 className="display mt-3 text-2xl">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {step.body}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-[1fr_1fr]" aria-labelledby="cakupan">
        <div>
          <p className="eyebrow">02 / Cakupan</p>
          <h2 id="cakupan" className="display mt-2 text-3xl">
            Apa yang bisa dan tidak bisa dilakukan
          </h2>
          <p className="mt-3 max-w-xl text-ink-muted">
            Aplikasi menyediakan 26 label A–Z. Dua di antaranya memerlukan
            gerakan, sehingga diperlakukan berbeda dari 24 huruf statis.
          </p>
          <Link
            to="/model"
            className="focus-ring mt-5 inline-block text-sm font-semibold text-accent underline decoration-1 underline-offset-4"
          >
            Baca metode dan hasil evaluasi →
          </Link>
        </div>

        <dl className="divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
          <div className="grid grid-cols-[7rem_1fr] gap-4 py-4">
            <dt className="eyebrow pt-1">Bisa</dt>
            <dd className="text-sm">
              24 huruf statis, deteksi hingga dua tangan sekaligus, overlay
              landmark, riwayat sesi, ambang keyakinan yang dapat diatur.
            </dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-4 py-4">
            <dt className="eyebrow pt-1">Terbatas</dt>
            <dd className="text-sm">
              J dan Z memakai gerbang lintasan heuristik, belum model temporal
              terlatih. Akurasi lintas signer belum diuji.
            </dd>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-4 py-4">
            <dt className="eyebrow pt-1">Bukan</dt>
            <dd className="text-sm">
              Penerjemah kalimat, pengenal kata, atau pengganti belajar bersama
              penutur asli. Ini alat bantu latihan abjad.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-16 border border-[color:var(--rule)] p-6 sm:p-8" aria-labelledby="mulai">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">03 / Mulai</p>
            <h2 id="mulai" className="display mt-2 text-2xl">
              Siapkan tangan, cahaya, dan jarak
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              Posisikan tangan sekitar 50–70 cm dari kamera dengan latar
              sederhana. Anda bisa mengubah ambang keyakinan jika prediksi
              terlalu sensitif.
            </p>
          </div>
          <Link to="/deteksi" className="btn-primary focus-ring shrink-0">
            Buka kamera
          </Link>
        </div>
      </section>
    </div>
  );
}
