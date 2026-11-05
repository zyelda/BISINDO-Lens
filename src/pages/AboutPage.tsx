import SectionHeading from "@/components/SectionHeading";

const STACK = [
  ["Antarmuka", "React 18, TypeScript, Vite, Tailwind CSS"],
  ["Visi komputer", "MediaPipe Tasks Vision · Hand Landmarker (21 titik, hingga 2 tangan)"],
  ["Klasifikasi", "Random Forest 300 pohon, diekspor ke ONNX, dijalankan di browser"],
  ["Inferensi", "ONNX Runtime Web (WASM), tanpa backend saat runtime"],
  ["Training", "Python 3.12, scikit-learn, skl2onnx, MediaPipe Python"],
  ["Pengujian", "Vitest, Testing Library, Playwright"],
];

export default function AboutPage() {
  return (
    <div className="folio">
      <SectionHeading
        index="04"
        title="Tentang"
        lede="BISINDO Lens adalah prototipe edukasi untuk latihan abjad Bahasa Isyarat Indonesia. Proyek ini tidak menggantikan pembelajaran dengan penutur asli."
      />

      <section className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="display text-2xl">Cara kerja</h2>
            <p className="mt-3 text-ink-muted">
              Kamera memberi frame ke MediaPipe Hand Landmarker. Untuk setiap
              tangan, aplikasi menghitung vektor 96 dimensi: koordinat 21
              landmark yang sudah dinormalisasi terhadap pergelangan dan
              panjang telapak, kosinus fleksi 15 sendi, jarak ujung jari ke
              pergelangan, jarak antar ujung jari, dan vektor normal telapak.
              Random Forest membaca vektor itu dan mengeluarkan distribusi
              26 kelas.
            </p>
            <p className="mt-3 text-ink-muted">
              Prediksi mentah tidak langsung ditampilkan. Rata-rata bergerak
              eksponensial menstabilkan distribusi antar-frame; huruf baru
              dikunci setelah beberapa frame berturut-turut melewati ambang
              keyakinan dan selisih minimum terhadap kandidat kedua.
            </p>
          </div>

          <div>
            <h2 className="display text-2xl">Privasi</h2>
            <p className="mt-3 text-ink-muted">
              Tidak ada frame kamera yang dikirim ke server. Model, runtime
              MediaPipe, dan ONNX Runtime disajikan sebagai berkas statis dari
              origin yang sama. Riwayat sesi hanya tersimpan di memori tab dan
              hilang saat halaman dimuat ulang.
            </p>
          </div>

          <div>
            <h2 className="display text-2xl">Dua tangan</h2>
            <p className="mt-3 text-ink-muted">
              MediaPipe dapat melacak dua tangan sekaligus. Keduanya digambar
              di overlay, tetapi hanya tangan dengan telapak terbesar yang
              diklasifikasi sebagai tangan aktif; tangan kedua tetap dihitung
              dan ditampilkan. Dataset yang tersedia hanya berisi gestur satu
              tangan, jadi tidak ada kelas gestur dua tangan yang dilatih.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="display text-2xl">Teknologi</h2>
            <dl className="mt-3 divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)] text-sm">
              {STACK.map(([key, value]) => (
                <div key={key} className="py-2.5">
                  <dt className="eyebrow">{key}</dt>
                  <dd className="mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className="display text-2xl">Sumber data</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
              <li>
                <a
                  href="https://github.com/Zappie733/Research-Binus-BISINDO-DATASET"
                  className="focus-ring underline decoration-1 underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  Zappie733/Research-Binus-BISINDO-DATASET
                </a>{" "}
                (MIT) — 520 foto A–Z, dipakai untuk training dan test.
              </li>
              <li>
                <a
                  href="https://github.com/KrisnaSantosa15/realtime-bisindo-classification"
                  className="focus-ring underline decoration-1 underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  KrisnaSantosa15/realtime-bisindo-classification
                </a>{" "}
                (MIT) — hanya untuk eksperimen lintas sumber; tidak dipakai di
                model final.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="display text-2xl">Lisensi & atribusi</h2>
            <p className="mt-3 text-sm text-ink-muted">
              Kode proyek ini menggunakan dependensi open source. Berkas model
              MediaPipe berasal dari Google. Gambar contoh huruf berasal dari
              dataset berlisensi MIT dan hanya ditampilkan sebagai referensi.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 border border-[color:var(--rule)] border-l-4 border-l-[color:var(--signal-warn)] p-5">
        <h2 className="text-base font-semibold">Bukan alat komunikasi medis</h2>
        <p className="mt-1 text-sm text-ink-muted">
          BISINDO memiliki variasi regional dan konteks yang tidak ditangkap
          oleh klasifikasi abjad statis. Jangan gunakan aplikasi ini sebagai
          satu-satunya sarana komunikasi dengan penutur BISINDO.
        </p>
      </section>
    </div>
  );
}
