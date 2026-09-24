import { NavLink, useLocation } from "react-router-dom";

// `tambien`: otras rutas en las que esta pestaña debe verse activa (ej.
// dentro de una categoría o de un mueble sigues "en el catálogo").
const TABS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Catálogo", tambien: ["/categoria/", "/producto/"] },
  { to: "/telas", label: "Telas" },
  { to: "/fabricacion", label: "Fabricación" },
  { to: "/contacto", label: "Contacto" },
];

export default function NavBar() {
  const { pathname } = useLocation();
  return (
    <header className="bg-carbon/95 backdrop-blur border-b border-carbon-border sticky top-0 z-20 shadow-sm shadow-black/20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2 shrink-0 group">
          <img src="/assets/logo.png" alt="" className="w-8 h-8 object-contain transition-transform duration-200 group-hover:scale-105" />
          <span className="text-lg sm:text-xl font-extrabold text-ink tracking-tight">Mueble Zulia</span>
        </NavLink>

        {/* En móvil la navegación vive en la barra inferior (BottomNav);
            estas pestañas de arriba solo se muestran en pantallas grandes. */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive: activaExacta }) => {
                const isActive = activaExacta || (tab.tambien ?? []).some((r) => pathname.startsWith(r));
                return [
                  "min-h-tap flex items-center px-3 sm:px-4 rounded-control text-sm sm:text-base font-semibold whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "glass-gold text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-white/5",
                ].join(" ");
              }}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
