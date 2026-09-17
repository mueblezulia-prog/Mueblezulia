import { Link, useLocation } from "react-router-dom";

// Pestañas del panel admin. "Muebles" y "Categorías" ya están construidas;
// las demás quedan visibles pero deshabilitadas, como recordatorio de lo
// que falta en próximas fases (reutilizan las rutas API que ya existen en
// server.js: /api/admin/pedidos y /api/admin/estadisticas).
const TABS = [
  { label: "Estadísticas", ruta: null },
  { label: "Pedidos", ruta: null },
  { label: "Muebles", ruta: "/admin/productos" },
  { label: "Categorías", ruta: "/admin/categorias" },
  { label: "Telas", ruta: "/admin/telas" },
  { label: "Etiquetas", ruta: "/admin/etiquetas" },
  { label: "Contenido", ruta: "/admin/contenido" },
];

export default function AdminHeader() {
  const { pathname } = useLocation();

  return (
    <header className="bg-carbon border-b border-carbon-border">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-extrabold text-ink">
            🛋️ Mueble Zulia — Admin
          </span>
          <Link to="/" className="text-sm text-ink-muted hover:text-ink font-semibold">
            ← Volver al sitio
          </Link>
        </div>

        <nav className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            // "Muebles" también se considera activa en /admin/productos/nuevo
            // y /admin/productos/:id/editar, no solo en la lista exacta.
            const activa = tab.ruta && pathname.startsWith(tab.ruta);
            if (!tab.ruta) {
              return (
                <span
                  key={tab.label}
                  title="Disponible en una próxima fase"
                  className="min-h-tap flex items-center px-4 rounded-control text-sm font-semibold bg-carbon-light text-ink-muted opacity-50 cursor-not-allowed"
                >
                  {tab.label}
                </span>
              );
            }
            return (
              <Link
                key={tab.label}
                to={tab.ruta}
                className={[
                  "min-h-tap flex items-center px-4 rounded-control text-sm font-semibold",
                  activa ? "bg-gold text-carbon" : "bg-carbon-light text-ink hover:bg-carbon-border",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
