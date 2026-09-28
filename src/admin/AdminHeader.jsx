import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { usePermisos } from "../lib/permisos";

// Pestañas del panel de la PÁGINA WEB. (Pedidos y clientes van en la app
// de gestión, aparte.) Cada una se muestra solo si el usuario tiene el
// permiso correspondiente.
export const TABS = [
  { label: "Muebles", ruta: "/admin/productos", icono: "🛋️", permiso: "catalogo" },
  { label: "Categorías", ruta: "/admin/categorias", icono: "🗂️", permiso: "catalogo" },
  { label: "Telas", ruta: "/admin/telas", icono: "🧵", permiso: "catalogo" },
  { label: "Etiquetas", ruta: "/admin/etiquetas", icono: "🏷️", permiso: "catalogo" },
  { label: "Contenido", ruta: "/admin/contenido", icono: "🖼️", permiso: "contenido" },
  { label: "Opiniones", ruta: "/admin/opiniones", icono: "💬", permiso: "contenido" },
  { label: "Estadísticas", ruta: "/admin/estadisticas", icono: "📊", permiso: "estadisticas" },
  { label: "Usuarios", ruta: "/admin/usuarios", icono: "👤", permiso: "usuarios" },
];

/**
 * Barra superior del panel: se queda FIJA arriba al bajar (antes se iba
 * con el scroll y había que subir para cambiar de sección), y en el
 * celular las pestañas se deslizan de lado en una sola fila en vez de
 * ocupar tres filas.
 */
export default function AdminHeader() {
  const { pathname } = useLocation();
  const { puede } = usePermisos();
  const tabs = TABS.filter((t) => puede(t.permiso));
  // En el celular, la pestaña activa siempre a la vista (antes quedaba
  // escondida a la derecha, p. ej. "Usuarios").
  const navRef = useRef(null);
  useEffect(() => {
    const activa = navRef.current?.querySelector('[aria-current="page"]');
    activa?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-carbon/95 backdrop-blur border-b border-carbon-border shadow-sm shadow-black/30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-12 flex items-center justify-between gap-3">
          <Link to={tabs[0]?.ruta ?? "/admin"} className="flex items-center gap-2 min-w-0">
            <img src="/assets/logo.png" alt="" className="w-7 h-7 object-contain shrink-0" />
            <span className="text-base sm:text-lg font-extrabold text-ink truncate">
              Mueble Zulia <span className="text-gold font-bold">· Panel</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to="/"
              target="_blank"
              rel="noopener"
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-control text-sm text-ink-muted hover:text-ink hover:bg-white/5 font-semibold transition"
            >
              Ver sitio ↗
            </Link>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Cerrar sesión en este dispositivo?")) supabase.auth.signOut();
              }}
              className="min-h-[40px] px-3 rounded-control text-sm text-ink-muted hover:text-terracota hover:bg-white/5 font-semibold transition"
            >
              Salir
            </button>
          </div>
        </div>

        <nav ref={navRef} className="h-14 flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" aria-label="Secciones del panel">
          {tabs.map((tab) => {
            // "Muebles" también se considera activa en /admin/productos/nuevo
            // y /admin/productos/:id/editar, no solo en la lista exacta.
            const activa = pathname.startsWith(tab.ruta);
            return (
              <Link
                key={tab.label}
                to={tab.ruta}
                aria-current={activa ? "page" : undefined}
                className={[
                  "shrink-0 h-11 flex items-center gap-1.5 px-4 rounded-control text-sm font-bold transition-colors",
                  activa ? "bg-gold text-carbon shadow-sm shadow-black/30" : "bg-carbon-light text-ink hover:bg-carbon-border",
                ].join(" ")}
              >
                <span aria-hidden="true">{tab.icono}</span>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
