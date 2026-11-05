import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="folio">
      <section className="py-16">
        <p className="eyebrow">404 / Tidak ditemukan</p>
        <h1 className="display mt-3 max-w-2xl text-4xl sm:text-5xl">
          Halaman ini tidak ada di folio.
        </h1>
        <p className="mt-4 max-w-xl text-ink-muted">
          URL yang Anda buka tidak cocok dengan rute mana pun. Kembali ke
          beranda atau langsung buka halaman deteksi.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="btn-primary focus-ring">
            Kembali ke beranda
          </Link>
          <Link to="/deteksi" className="btn-quiet focus-ring">
            Buka deteksi
          </Link>
        </div>
      </section>
    </div>
  );
}
