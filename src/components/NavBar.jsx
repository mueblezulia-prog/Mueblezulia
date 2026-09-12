import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Catálogo", end: true },
  { to: "/fabricacion", label: "Fabricación" },
  { to: "/metodos-pago", label: "Métodos de Pago" },
  { to: "/ubicacion", label: "Ubicación" },
];

export default function NavBar() {
  return (
    <header className="bg-carbon border-b border-carbon-border sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <NavLink to="/" className="text-lg sm:text-xl font-extrabold text-ink shrink-0">
          Mueble Zulia
        </NavLink>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  "min-h-tap flex items-center px-3 sm:px-4 rounded-control text-sm sm:text-base font-semibold whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-gold text-carbon"
                    : "text-ink-muted hover:text-ink",
                ].join(" ")
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/admin/productos/nuevo"
          className="min-h-tap hidden sm:flex items-center px-4 rounded-control border border-carbon-border text-ink-muted text-sm font-semibold shrink-0 hover:text-ink"
        >
          Panel Admin
        </NavLink>
      </div>
    </header>
  );
}
