import { useState } from "react";

const TEXTOS = {
  disponible: "Esto significa que el mueble está disponible y listo para entregar.",
  pedido: "Este mueble se confecciona bajo pedido — te confirmamos el tiempo de entrega al hacer tu compra.",
};

/**
 * Insignia de disponibilidad — verde y con brillo llamativo cuando el
 * mueble está en stock ("Entrega Inmediata"), más discreta cuando es
 * bajo pedido. Al tocarla, revela con una animación un texto corto
 * explicando qué significa (no navega ni cierra el enlace del padre).
 */
export default function BadgeDisponibilidad({ disponible, className = "", tooltipHacia = "arriba" }) {
  const [abierto, setAbierto] = useState(false);
  const haciaArriba = tooltipHacia === "arriba";

  function alTocar(e) {
    // Estas insignias suelen vivir dentro del <Link> de la tarjeta de
    // producto — sin esto, tocarlas navegaría al detalle en vez de
    // solo mostrar la explicación.
    e.preventDefault();
    e.stopPropagation();
    setAbierto((v) => !v);
  }

  return (
    <span className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={alTocar}
        aria-expanded={abierto}
        className={[
          "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-bold transition-all duration-200",
          disponible
            ? "bg-green-500/20 border border-green-400/60 text-green-300 glow-verde"
            : "bg-white/5 border border-white/15 text-ink-muted",
        ].join(" ")}
      >
        <span className="text-sm leading-none">🚚</span>
        {disponible ? "Entrega Inmediata" : "Bajo Pedido"}
      </button>

      {/* Explicación — se revela con un fundido + pequeño despliegue.
          Por defecto hacia ARRIBA del ícono (para cuando la insignia
          vive al fondo de una tarjeta con overflow-hidden); con
          tooltipHacia="abajo" se despliega hacia abajo en su lugar
          (para cuando la insignia está arriba de todo, ej. sobre la foto). */}
      <span
        className={[
          "absolute z-20 left-0 w-56 glass-dark text-ink text-xs leading-snug rounded-control p-2.5",
          "transition-all duration-200 ease-out",
          haciaArriba ? "bottom-full mb-1.5 origin-bottom" : "top-full mt-1.5 origin-top",
          abierto
            ? "opacity-100 scale-y-100 translate-y-0"
            : `opacity-0 scale-y-90 pointer-events-none ${haciaArriba ? "translate-y-1" : "-translate-y-1"}`,
        ].join(" ")}
      >
        {disponible ? TEXTOS.disponible : TEXTOS.pedido}
      </span>
    </span>
  );
}
