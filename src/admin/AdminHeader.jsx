import { Link } from "react-router-dom";

// Pestañas del panel admin. Solo "Muebles" está construida en esta Fase 1
// (el formulario de agregar/editar producto). Las demás quedan visibles
// pero deshabilitadas, como recordatorio de lo que falta en próximas fases.
const TABS = [
  { label: "Estadísticas", disponible: false },
  { label: "Pedidos", disponible: false },
  { label: "Muebles", disponible: true },
  { label: "Categorías", disponible: false },
  { label: "Configuración", disponible: false },
];

export default function AdminHeader() {
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
          {TABS.map((tab) => (
            <span
              key={tab.label}
              title={tab.disponible ? undefined : "Disponible en una próxima fase"}
              className={[
                "min-h-tap flex items-center px-4 rounded-control text-sm font-semibold",
                tab.disponible
                  ? "bg-gold text-carbon"
                  : "bg-carbon-light text-ink-muted opacity-50 cursor-not-allowed",
              ].join(" ")}
            >
              {tab.label}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
