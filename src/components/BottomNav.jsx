import { NavLink, useLocation } from "react-router-dom";
import { sonidoNavegar } from "../lib/sonido";

const IconInicio = ({ activo }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={activo ? "#F2B90C" : "#B3B3B3"} strokeWidth="2">
    <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCatalogo = ({ activo }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={activo ? "#F2B90C" : "#B3B3B3"} strokeWidth="2">
    <rect x="3" y="4" width="7" height="7" rx="1" />
    <rect x="14" y="4" width="7" height="7" rx="1" />
    <rect x="3" y="15" width="7" height="5" rx="1" />
    <rect x="14" y="15" width="7" height="5" rx="1" />
  </svg>
);

const IconTelas = ({ activo }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={activo ? "#F2B90C" : "#B3B3B3"} strokeWidth="2">
    <circle cx="8" cy="9" r="4.5" />
    <circle cx="15.5" cy="14.5" r="4.5" />
  </svg>
);

const IconFabricacion = ({ activo }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={activo ? "#F2B90C" : "#B3B3B3"} strokeWidth="2">
    <path d="m14 6-7.5 7.5a2.1 2.1 0 1 0 3 3L17 9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m17.5 5.5 1 1L21 4l-2-2-2.5 2.5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 19.5 6 18" strokeLinecap="round" />
  </svg>
);

const IconUbicacion = ({ activo }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={activo ? "#F2B90C" : "#B3B3B3"} strokeWidth="2">
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="9.5" r="2.3" />
  </svg>
);

const TABS = [
  { to: "/", label: "Inicio", end: true, Icon: IconInicio },
  { to: "/catalogo", label: "Catálogo", Icon: IconCatalogo, tambien: ["/categoria/", "/producto/"] },
  { to: "/telas", label: "Telas", Icon: IconTelas },
  { to: "/fabricacion", label: "Fabricación", Icon: IconFabricacion },
  { to: "/contacto", label: "Contacto", Icon: IconUbicacion },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  function alTocar(to, end) {
    const yaActiva = end ? pathname === to : pathname.startsWith(to);
    // Solo suena si realmente cambia de pestaña — tocar la que ya está
    // activa no debería sonar de nuevo.
    if (!yaActiva) sonidoNavegar();
  }

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-carbon/80 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-lg shadow-black/30">
      <div className="grid grid-cols-5">
        {TABS.map(({ to, label, end, Icon, tambien }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => alTocar(to, end)}
            className="min-h-tap flex flex-col items-center justify-center py-2 gap-0.5"
          >
            {({ isActive: activaExacta }) => {
              const isActive = activaExacta || (tambien ?? []).some((r) => pathname.startsWith(r));
              return (
              <>
                <span
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                    isActive ? "bg-gold/25 backdrop-blur-sm border border-gold/50" : "bg-transparent",
                  ].join(" ")}
                >
                  <Icon activo={isActive} />
                </span>
                <span className={["text-xs font-semibold", isActive ? "text-gold" : "text-ink-muted"].join(" ")}>
                  {label}
                </span>
              </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
