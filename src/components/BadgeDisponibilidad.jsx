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
export default function BadgeDisponibilidad({ disponible, className = "" }) {
  const [abierto, setAbierto] = useState(false);

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
          // Fondo oscuro con desenfoque (glass) SIEMPRE detrás del texto,
          // para que la insignia se lea igual de bien sin importar qué tan
          // clara u oscura sea la foto de fondo — no depende del contraste
          // de la foto.
          "inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-bold backdrop-blur-md transition-all duration-200",
          disponible
            ? "bg-black/45 border border-green-400/60 text-green-300 glow-verde"
            : "bg-black/45 border border-white/15 text-ink-muted",
        ].join(" ")}
      >
        <img src="/assets/icons/entrega-inmediata.png" alt="" className="w-3.5 h-3.5 shrink-0" />
        {disponible ? "Entrega Inmediata" : "Bajo Pedido"}
      </button>

      {/* Explicación — se revela con un fundido + pequeño despliegue,
          hacia ARRIBA del ícono (la tarjeta recorta el contenido que se
          sale por abajo, por los bordes redondeados). */}
      <span
        className={[
          "absolute z-20 left-0 bottom-full mb-1.5 w-56 glass-dark text-ink text-xs leading-snug rounded-control p-2.5",
          "origin-bottom transition-all duration-200 ease-out",
          abierto ? "opacity-100 scale-y-100 translate-y-0" : "opacity-0 scale-y-90 translate-y-1 pointer-events-none",
        ].join(" ")}
      >
        {disponible ? TEXTOS.disponible : TEXTOS.pedido}
      </span>
    </span>
  );
}
