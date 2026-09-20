/**
 * Interruptor de catálogo: al activarlo, los productos con entrega
 * inmediata se muestran primero (no se ocultan los demás, solo pasan
 * a un segundo plano al final de la grilla). Es un filtro de ORDEN,
 * distinto de la insignia que ya se ve en cada tarjeta
 * (BadgeDisponibilidad.jsx) — ambos conviven.
 */
export default function FiltroEntregaInmediata({ activo, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={[
        "min-h-tap px-4 rounded-full text-sm font-bold transition-all duration-200 inline-flex items-center gap-1.5",
        activo
          ? "bg-green-500/90 text-carbon shadow-sm shadow-black/20"
          : "bg-carbon-light border border-carbon-border text-ink-muted hover:text-ink hover:border-green-400/40",
        className,
      ].join(" ")}
    >
      <img src="/assets/icons/entrega-inmediata.png" alt="" className="w-3.5 h-3.5 shrink-0" />
      Entrega Inmediata
    </button>
  );
}
