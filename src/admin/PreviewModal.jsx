import ProductCard from "../components/ProductCard";

/**
 * Modal de previsualización — reutiliza el MISMO componente ProductCard
 * que usa el cliente, para que "lo que ves es lo que se guarda": ningún
 * estilo distinto entre la vista previa del admin y el catálogo real.
 */
export default function PreviewModal({ abierto, onCerrar, productoPreview }) {
  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-carbon border border-carbon-border rounded-card max-w-sm w-full p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Así se verá en el catálogo</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar previsualización"
            className="min-h-tap min-w-tap text-2xl text-ink-muted hover:text-ink"
          >
            ×
          </button>
        </div>

        <ProductCard producto={productoPreview} onComprar={() => {}} onCompraPersonalizada={() => {}} />

        <button type="button" onClick={onCerrar} className="btn-secondary">
          Seguir editando
        </button>
      </div>
    </div>
  );
}
