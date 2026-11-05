import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/", label: "Beranda", end: true },
  { to: "/deteksi", label: "Deteksi" },
  { to: "/panduan", label: "Panduan" },
  { to: "/model", label: "Model" },
  { to: "/tentang", label: "Tentang" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-ink focus:bg-paper focus:px-4 focus:py-2"
      >
        Lompat ke konten
      </a>

      <header className="border-b border-[color:var(--rule)]">
        <div className="folio flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4 sm:py-5">
          <NavLink to="/" className="focus-ring group flex items-baseline gap-2">
            <span className="display text-xl tracking-tight">BISINDO Lens</span>
            <span className="eyebrow hidden sm:inline">Pengenalan abjad</span>
          </NavLink>

          <nav
            aria-label="Navigasi utama"
            className="-mx-1 w-full overflow-x-auto sm:w-auto sm:overflow-visible"
          >
            <ul className="flex items-center gap-0 sm:gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        "focus-ring inline-block whitespace-nowrap px-2 py-2 text-[0.8125rem] transition-colors duration-120 sm:px-3 sm:text-sm",
                        isActive
                          ? "text-accent underline decoration-accent decoration-2 underline-offset-4"
                          : "text-ink-muted hover:text-ink",
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="konten" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-[color:var(--rule)]">
        <div className="folio flex flex-col gap-3 py-8 text-sm text-ink-muted sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-xl">
            BISINDO Lens — prototipe edukasi. Pemrosesan gambar terjadi di perangkat
            Anda; tidak ada frame yang dikirim ke server.
          </p>
          <p className="tabular text-2xs uppercase tracking-[0.16em]">
            MediaPipe · Random Forest · On-device
          </p>
        </div>
      </footer>
    </div>
  );
}
