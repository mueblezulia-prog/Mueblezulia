import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/fabricacion", label: "Fabricación" },
  { to: "/contacto", label: "Contacto" },
];

export default function NavBar() {
  return (
    <header className="bg-carbon border-b border-carbon-border sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <img src="/assets/logo.png" alt="" className="w-8 h-8 object-contain" />
          <span className="text-lg sm:text-xl font-extrabold text-ink">Mueble Zulia</span>
        </NavLink>

        {/* En móvil la navegación vive en la barra inferior (BottomNav);
            estas pestañas de arriba solo se muestran en pantallas grandes. */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
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
      </div>
    </header>
  );
}
