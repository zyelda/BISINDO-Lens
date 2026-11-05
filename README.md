# BISINDO Lens

BISINDO Lens adalah prototipe web untuk latihan membaca abjad **BISINDO (Bahasa Isyarat Indonesia) A–Z** secara real-time dari kamera. MediaPipe Hand Landmarker mengambil 21 titik sendi tangan, lalu sebuah Random Forest yang diekspor ke ONNX mengklasifikasikan bentuk tangan menjadi 26 huruf.

Semua pemrosesan gambar terjadi **di browser**. Tidak ada frame kamera yang dikirim ke server, tidak ada backend saat runtime, dan model disajikan sebagai berkas statis dari origin yang sama.

> Ini alat bantu latihan, bukan penerjemah bahasa isyarat dan bukan pengganti belajar dengan penutur asli. BISINDO memiliki variasi regional yang tidak ditangkap oleh klasifikasi abjad statis.

## Hasil evaluasi

Angka di bawah ini dihasilkan oleh `ml/bisindo/train.py` pada test split yang tidak dipakai untuk memilih model. Tidak ada angka yang diketik manual; halaman `/model` membaca nilai yang sama dari `public/models/metrics.json`.

| Metrik | Nilai |
| --- | --- |
| Akurasi test held-out | **87,50%** (91 dari 104 gambar) |
| Macro F1 | **0,8768** |
| Balanced accuracy | **0,8750** |
| Macro precision | **0,8923** |
| Uji cermin (x dibalik) | **90,38%** akurasi, **0,9011** macro F1 |
| Cross-validation 5-fold (training only) | **0,8770 ± 0,0577** macro F1 |
| Paritas ONNX vs scikit-learn | **1,0000** |
| Ukuran model ONNX | **12,97 MiB** (13.602.115 byte) |

**Bacalah angka ini dengan hati-hati.** Test set hanya berisi **104 foto, 4 gambar per kelas, dari satu signer**. Satu kesalahan mengubah akurasi sekitar 0,96 poin persentase, dan interval kepercayaannya lebar. Model belum diuji pada signer lain, latar lain, atau kamera lain. Lihat [Keterbatasan](#keterbatasan-dan-hal-yang-belum-selesai).

## Fitur

- Deteksi 26 kelas abjad A–Z dengan keyakinan dan kandidat kedua.
- MediaPipe melacak hingga **dua tangan** dan menggambar overlay keduanya; klasifikasi memakai tangan aktif (telapak terbesar).
- Gerbang gerakan untuk **J dan Z**, karena keduanya membutuhkan lintasan, bukan hanya pose statis.
- Stabilisasi prediksi: EMA antar-frame, ambang keyakinan, selisih minimum terhadap kandidat kedua, dan sejumlah frame stabil sebelum huruf dikunci.
- Pengaturan ambang keyakinan, margin, jumlah frame stabil, dan overlay landmark.
- Riwayat sesi di memori tab, bisa dikosongkan.
- Halaman panduan berisi 26 contoh gambar asli dari dataset.
- Halaman model menampilkan metrik nyata, laporan per kelas, confusion matrix, dan keterbatasan.
- Tata letak responsif untuk desktop dan ponsel.
- Tanpa backend, tanpa analytics, tanpa penyimpanan frame.

## Stack

| Lapisan | Teknologi |
| --- | --- |
| Antarmuka | React 18, TypeScript, Vite 5, Tailwind CSS |
| Visi komputer | `@mediapipe/tasks-vision` Hand Landmarker (21 titik, hingga 2 tangan) |
| Klasifikasi | Random Forest 300 pohon, diekspor ke ONNX |
| Inferensi | ONNX Runtime Web (WASM, single-thread) |
| Training | Python 3.12, scikit-learn, skl2onnx, MediaPipe Python, OpenCV |
| Pengujian | Vitest + Testing Library, Playwright (fake webcam) |
| Font | Fraunces dan Inter, di-host sendiri (SIL OFL) |

## Arsitektur

```text
webcam
  └─ MediaPipe Hand Landmarker (GPU, fallback CPU)
       └─ 2 tangan × 21 landmark
            └─ pilih tangan aktif (palm span terbesar)
                 └─ fitur 96 dimensi
                      └─ Random Forest ONNX (WASM)
                           └─ EMA + ambang + margin + frame stabil
                                └─ gerbang gerakan J/Z
                                     └─ UI, overlay, riwayat sesi
```

Tidak ada server aplikasi. Berkas berikut disajikan sebagai aset statis:

- `public/mediapipe/hand_landmarker.task` — model MediaPipe (7,5 MB).
- `public/mediapipe/wasm/` — runtime MediaPipe, disalin saat `npm install`.
- Runtime ONNX Web diimpor langsung dari `node_modules` dengan `?url`, lalu di-fingerprint Vite; tidak ada salinan di `public/`.
- `public/models/` — `model.onnx`, `label_map.json`, `feature_spec.json`, `metrics.json`.
- `public/letters/` — 26 contoh gambar A–Z (0,94 MB).

## Struktur repositori

```text
.
├─ src/
│  ├─ components/            # Layout, kamera, panel prediksi, confusion matrix, dll.
│  ├─ content/letters.ts     # metadata 26 huruf dan status statis/gerakan
│  ├─ features/
│  │  ├─ camera/             # lifecycle getUserMedia
│  │  ├─ classifier/         # loader dan inferensi ONNX
│  │  ├─ detection/          # loop MediaPipe + klasifikasi + commit
│  │  ├─ landmarks/          # ekstraksi fitur 96-D (mirror Python)
│  │  └─ prediction/         # smoothing EMA dan gerbang gerakan J/Z
│  ├─ pages/                 # Beranda, Deteksi, Panduan, Model, Tentang, 404
│  └─ styles/global.css      # token warna, tipografi, komponen editorial
├─ ml/bisindo/
│  ├─ config.py              # kontrak label dan fitur
│  ├─ features.py            # ekstraksi fitur Python
│  ├─ ingest_images.py       # gambar → landmark CSV (MediaPipe)
│  ├─ ingest_krisna.py       # rekonstruksi CSV eksperimen lintas sumber
│  ├─ data.py                # loader, augmentasi, mirror, laporan
│  ├─ experiment.py          # perbandingan kandidat dataset
│  └─ train.py               # tuning, evaluasi, ekspor ONNX, metrik
├─ public/
│  ├─ models/                # artefak model final (ikut di-commit)
│  ├─ letters/               # contoh gambar A–Z
│  ├─ fonts/                 # WOFF2 + lisensi OFL
│  └─ mediapipe/             # model tugas; runtime WASM disalin saat install
├─ e2e/                      # Playwright: navigasi, panduan, model, deteksi
├─ tests/fixtures/           # vektor fitur golden + MJPEG hasil generate
├─ scripts/copy-assets.mjs   # menyalin runtime MediaPipe WASM dari node_modules
└─ requirements-ml.txt       # dependensi pipeline Python
```

## Menjalankan aplikasi

Prasyarat: **Node.js 20+** dan npm 10+ (diuji dengan Node 25 dan npm 11). Untuk training, gunakan **Python 3.12**.

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Kamera hanya tersedia di **secure context**: `localhost` atau HTTPS. Membuka alamat LAN lewat `http://192.168.x.x` tidak akan memberi izin kamera di banyak browser.

`npm install` menjalankan `postinstall` yang menyalin runtime MediaPipe WASM dari `node_modules` ke `public/mediapipe/wasm`. Jika folder itu hilang, jalankan:

```bash
npm run copy:assets
```

Build produksi dan pratinjau lokal:

```bash
npm run build
npm run preview
```

Build saat ini menghasilkan kira-kira 423 kB JS (135 kB gzip), 18,7 kB CSS, 24,7 kB glue `.mjs`, dan 14,85 MB aset WASM ONNX Runtime. Model ONNX 12,97 MB dan model MediaPipe 7,5 MB dimuat terpisah saat halaman deteksi dibuka.

ONNX Runtime sengaja tidak disajikan dari `public/`. Vite menolak mengimpor berkas `/public` sebagai modul saat dev, sehingga dua berkas runtime yang dibutuhkan (`.wasm` dan `.mjs`) diimpor dengan `?url` agar diproses dan di-fingerprint oleh Vite. Hanya dua berkas itu yang ikut ke build, bukan seluruh paket ONNX Runtime.

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | Ringkasan, alur kerja, batasan, ajakan mulai |
| `/deteksi` | Kamera, overlay, panel prediksi, pengaturan, riwayat sesi |
| `/panduan` | 26 contoh huruf, filter statis/gerakan |
| `/model` | Metrik held-out, uji cermin, laporan per kelas, confusion matrix |
| `/tentang` | Cara kerja, privasi, dua tangan, sumber data, atribusi |
| `*` | Halaman 404 dengan tautan kembali |

## Cara kerja deteksi

### 1. Fitur 96 dimensi

Untuk setiap tangan, fitur dihitung dari 21 landmark:

- **63** koordinat ternormalisasi (`x`, `y`, `z`), dikoreksi rasio aspek (`x` dan `z` dikali `width / height`), lalu ditranslasikan agar pergelangan berada di origin dan diskalakan dengan panjang telapak (`landmark 9` terhadap `landmark 0`).
- **15** kosinus sudut fleksi sendi jari.
- **5** jarak ujung jari ke pergelangan.
- **10** jarak antar ujung jari.
- **3** komponen normal telapak.

Rotasi tidak dihilangkan agar huruf yang bergantung orientasi (mis. G/Q) tetap bisa dibedakan. Nilai di-clip ke rentang `[-20, 20]`.

Implementasi Python (`ml/bisindo/features.py`) dan TypeScript (`src/features/landmarks/features.ts`) harus identik. `tests/fixtures/feature_vectors.json` dihasilkan oleh training dan diuji oleh Vitest; `feature_spec.json` juga mencantumkan versi kontrak fitur.

### 2. Stabilisasi

Prediksi mentah tidak langsung ditampilkan. `PredictionSmoother` melakukan:

- EMA dengan bobot 0,35 per frame.
- Ambang keyakinan awal 60% dan margin 15% terhadap kandidat kedua.
- Minimal 5 frame berturut-turut sebelum huruf dikunci.
- Toleransi 15 frame tanpa tangan sebelum huruf dilepas.

Semua nilai awal dapat diubah dari panel pengaturan.

### 3. J dan Z

Random Forest hanya melihat satu frame. Karena itu J dan Z memakai gerbang lintasan heuristik pada ujung telunjuk:

- jendela 1,4 detik, minimal 10 titik dan 450 ms;
- lintasan dinormalisasi terhadap panjang telapak;
- pola arah dan pembalikan menentukan J (lengkung) atau Z (zig-zag).

Jika classifier menebak J/Z tetapi gerakan tidak cocok, UI menampilkan “Perlu gerakan” dan huruf tidak dicatat. Ini heuristik geometris, bukan model temporal terlatih.

### 4. Dua tangan dan pratinjau cermin

MediaPipe diminta melacak dua tangan. Keduanya digambar di overlay dan jumlahnya ditampilkan, tetapi hanya tangan dengan telapak terbesar yang masuk classifier. Dataset yang tersedia hanya berisi gestur satu tangan, jadi tidak ada kelas gestur dua tangan yang dilatih.

Pratinjau webcam dicerminkan agar terasa seperti cermin. Karena itu training memakai augmentasi flip horizontal; model tanpa augmentasi ini turun ke sekitar 56,7% saat diuji pada input tercermin. Uji cermin formal pada model final mencapai 90,38%.

## Dataset dan training

### Dataset final

| Item | Nilai |
| --- | --- |
| Sumber | [Zappie733/Research-Binus-BISINDO-DATASET](https://github.com/Zappie733/Research-Binus-BISINDO-DATASET) (MIT) |
| Commit yang dipakai | `78c6162` |
| Ukuran clone | ±56 MB |
| Gambar | 520 foto, 26 kelas, 640×480, satu signer |
| Train | 416 gambar; 414 terdeteksi tangan |
| Test held-out | 104 gambar; 4 per kelas |
| Augmentasi training | 414 → 828 baris (`copies=1`) |
| Parameter final | 300 pohon, `max_depth=16`, `min_samples_leaf=1`, `max_features=sqrt`, `class_weight=balanced_subsample`, `random_state=42` |

Augmentasi yang dipakai: flip horizontal (50%), rotasi kecil ±9°, skala 0,9–1,1, dan noise Gaussian 0,008. Rotasi sengaja kecil karena beberapa huruf berbeda oleh orientasi.

### Eksperimen lintas sumber

Repo [KrisnaSantosa15/realtime-bisindo-classification](https://github.com/KrisnaSantosa15/realtime-bisindo-classification) (MIT, commit `94c649e`, ±102 MB) menyimpan CSV landmark, bukan gambar. CSV aslinya misaligned: jumlah kolom tidak sesuai dengan urutan `[x, y, z]` per landmark. `ml/bisindo/ingest_krisna.py` merekonstruksi 7.346 baris satu tangan dari nilai non-null.

Saat dipakai lintas sumber, model yang dilatih pada data Krisna hanya mencapai **30,8%** pada test Zappie. Perbedaan konvensi landmark, orientasi, dan distribusi data terlalu besar, sehingga data itu **tidak dipakai** di model final. Skripnya tetap disertakan agar eksperimen bisa direproduksi.

Total dua clone dataset adalah **158 MB**, masih di bawah batas 200 MB. Training final hanya membutuhkan clone Zappie (±56 MB).

### Reproduksi training

```bash
python -m venv .venv
# Windows Git Bash:
source .venv/Scripts/activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements-ml.txt

mkdir -p public/mediapipe data/raw
curl -L \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task \
  -o public/mediapipe/hand_landmarker.task

git clone https://github.com/Zappie733/Research-Binus-BISINDO-DATASET.git \
  data/raw/zappie-bisindo

python -m ml.bisindo.ingest_images \
  --input data/raw/zappie-bisindo/train --split train
python -m ml.bisindo.ingest_images \
  --input data/raw/zappie-bisindo/test --split test

python -m ml.bisindo.train
```

`train.py` akan:

1. Melakukan 5-fold cross-validation pada training split untuk memilih konfigurasi.
2. Melatih ulang pada training split + augmentasi.
3. Mengevaluasi test held-out dan test tercermin.
4. Menulis `public/models/metrics.json`, `label_map.json`, `feature_spec.json`, dan `model.onnx`.
5. Menulis ulang `tests/fixtures/feature_vectors.json`.

Karena `trained_at` selalu diperbarui, `metrics.json` akan berubah setiap kali training dijalankan. Nilai metrik dapat sedikit berbeda jika versi scikit-learn/NumPy berbeda.

Eksperimen lintas sumber (opsional):

```bash
git clone https://github.com/KrisnaSantosa15/realtime-bisindo-classification.git \
  data/raw/krisna-bisindo
python -m ml.bisindo.ingest_krisna
python -m ml.bisindo.experiment
```

Folder `data/raw/` dan `data/processed/` tidak di-commit.

## Pengujian

Unit test (fitur, smoothing, gerbang gerakan, metadata huruf):

```bash
npm test
```

Typecheck dan build:

```bash
npm run typecheck
npm run build
```

End-to-end dengan kamera palsu:

```bash
npx playwright install chromium
npm run test:e2e
```

Saat ini suite berisi 34 test di dua project (desktop dan mobile): **27 lulus, 7 dilewati secara sengaja**. Test alur kamera hanya berjalan di desktop karena fake video capture Chromium membutuhkan build browser penuh; satu test layout khusus mobile dilewati di desktop. Test mencakup:

- semua rute dan halaman 404;
- 26 gambar panduan benar-benar termuat;
- metrik model di halaman `/model` sesuai `metrics.json`;
- deteksi end-to-end huruf A, ambang keyakinan, keadaan tanpa tangan, izin kamera ditolak, model hilang, dan pelepasan kamera saat navigasi;
- tidak ada overflow horizontal di semua rute;
- kontrol kamera dan panel prediksi tetap usable di mobile.

`e2e/global-setup.ts` membuat berkas MJPEG dari `public/letters/A.jpg`; tidak ada video biner besar yang di-commit.

Semua sekaligus:

```bash
npm run verify
```

## Keterbatasan dan hal yang belum selesai

- **Satu signer, 104 gambar test.** Belum ada evaluasi lintas signer, lintas latar, atau lintas kamera. Klaim akurasi tidak boleh digeneralisasi ke populasi.
- **Hanya 4 gambar per kelas di test.** Satu kesalahan = 0,96 poin akurasi. Interval kepercayaan lebar dan per-class F1 tidak stabil.
- **Kelas lemah.** D (F1 0,40), M dan N (0,50), T (0,57), F dan P (0,67), H dan U (0,86). Kebingungan terbesar: N↔M (masing-masing 2 kesalahan) dan F→D (2).
- **J/Z bukan model temporal.** Gerbang gerakan adalah heuristik geometris dan bisa salah pada kamera lambat, gerakan cepat, atau tangan yang keluar frame.
- **Dua tangan dilacak, bukan dua-duanya diklasifikasi.** Hanya tangan aktif (telapak terbesar) yang masuk classifier. Tidak ada data gestur dua tangan.
- **Confidence bukan probabilitas terkalibrasi.** Nilai Random Forest adalah frekuensi voting pohon, bukan keyakinan yang terkalibrasi.
- **Variasi BISINDO.** Model mengikuti referensi dataset; variasi regional dan konteks kalimat tidak ditangkap.
- **Belum ada penerjemah kalimat, penyimpanan riwayat permanen, mode offline/PWA, atau CI.** Antarmuka hanya tersedia dalam bahasa Indonesia dan belum diaudit dengan pembaca layar.
- **Belum ada berkas LICENSE untuk kode aplikasi.** Lisensi dependensi dan dataset dicantumkan di bawah; tambahkan lisensi proyek sebelum publikasi.

## Atribusi dan lisensi

- **Dataset:** [Zappie733/Research-Binus-BISINDO-DATASET](https://github.com/Zappie733/Research-Binus-BISINDO-DATASET), MIT. Gambar contoh huruf di `public/letters/` berasal dari dataset ini.
- **Eksperimen lintas sumber:** [KrisnaSantosa15/realtime-bisindo-classification](https://github.com/KrisnaSantosa15/realtime-bisindo-classification), MIT. Tidak dipakai di model final.
- **MediaPipe Tasks Vision dan model Hand Landmarker:** Google, Apache-2.0. Model diunduh dari bucket MediaPipe.
- **ONNX Runtime Web:** Microsoft, MIT.
- **React, Vite, Tailwind CSS, scikit-learn, skl2onnx:** lisensi open source masing-masing.
- **Font Fraunces dan Inter:** SIL Open Font License 1.1. Berkas lisensi ada di `public/fonts/Fraunces-OFL.txt` dan `public/fonts/Inter-OFL.txt`.

## Catatan privasi

Frame kamera diproses di memori tab dan tidak diunggah. Riwayat sesi hanya hidup di memori dan hilang saat halaman dimuat ulang. Tidak ada cookie analytics, pelacakan, atau penyimpanan model di server.
