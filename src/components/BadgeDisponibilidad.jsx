import { useEffect, useRef, useState } from "react";

const TEXTOS = {
  disponible: "Esto significa que el mueble está disponible y listo para entregar.",
  pedido: "Este mueble se confecciona bajo pedido — te confirmamos el tiempo de entrega al hacer tu compra.",
};

/**
 * Insignia de disponibilidad — verde y con brillo llamativo cuando el
 * mueble está en stock ("Entrega Inmediata"), más discreta cuando es
 * bajo pedido. Al tocarla, revela con una animación un texto corto
 * explicando qué significa (no navega ni cierra el enlace del padre).
 *
 * `hacia`: "abajo" (por defecto — en la tarjeta del catálogo la insignia
 * está arriba de la foto, y si la explicación se abría hacia arriba
 * quedaba cortada) o "arriba".
 */
export default function BadgeDisponibilidad({ disponible, className = "", hacia = "abajo" }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Se cierra solo al tocar en cualquier otro lado de la página.
  useEffect(() => {
    if (!abierto) return undefined;
    function alTocarAfuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("pointerdown", alTocarAfuera);
    return () => document.removeEventListener("pointerdown", alTocarAfuera);
  }, [abierto]);

  function alTocar(e) {
    // Estas insignias suelen vivir dentro del <Link> de la tarjeta de
    // producto — sin esto, tocarlas navegaría al detalle en vez de
    // solo mostrar la explicación.
    e.preventDefault();
    e.stopPropagation();
    setAbierto((v) => !v);
  }

  const posicion = hacia === "arriba" ? "bottom-full mb-1.5 origin-bottom" : "top-full mt-1.5 origin-top";

  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={alTocar}
        aria-expanded={abierto}
        className={[
          // Fondo oscuro con desenfoque (glass) SIEMPRE detrás del texto,
          // para que se lea igual de bien sobre cualquier foto.
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-control px-2 sm:px-2.5 py-1 text-xs font-bold backdrop-blur-md transition-all duration-200",
          disponible
            ? "bg-black/45 border border-green-400/60 text-green-300 glow-verde"
            : "bg-black/45 border border-white/15 text-ink",
        ].join(" ")}
      >
        <img src="/assets/icons/entrega-inmediata.png" alt="" className="w-3.5 h-3.5 shrink-0" />
        {disponible ? "Entrega Inmediata" : "Bajo Pedido"}
      </button>

      <span
        role="tooltip"
        className={[
          "absolute z-20 left-0 w-max max-w-[13rem] glass-dark text-ink text-sm leading-snug rounded-control p-2.5",
          posicion,
          "transition-all duration-200 ease-out",
          abierto ? "opacity-100 scale-y-100 translate-y-0" : "opacity-0 scale-y-90 pointer-events-none",
        ].join(" ")}
      >
        {disponible ? TEXTOS.disponible : TEXTOS.pedido}
      </span>
    </span>
  );
}
