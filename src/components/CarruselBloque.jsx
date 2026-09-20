import { useEffect, useState } from "react";

export const CLASE_TINTE = {
  dorado: "glass-gold",
  blanco: "glass",
  oscuro: "glass-dark",
};

/**
 * "Modo presentación": las fotos de la galería pasan solas cada pocos
 * segundos con un fundido suave. La ÚLTIMA foto del set siempre muestra,
 * además, el título y el texto del bloque sobre una tarjeta de vidrio
 * (blur + tinte) con un leve movimiento — como cierre de la secuencia.
 *
 * `alto`: clase de altura (ver ALTOS_BLOQUE en lib/contenido.js).
 * `ajuste`: "object-cover" u "object-contain bg-carbon".
 */
export default function CarruselBloque({ imagenes, titulo, texto, tinte = "dorado", alto, ajuste }) {
  const [indice, setIndice] = useState(0);
  const total = imagenes.length;
  const esUltima = indice === total - 1;

  useEffect(() => {
    if (total <= 1) return;
    // La última foto se queda un poco más en pantalla para que el
    // texto con efecto vidrio alcance a leerse cómodo.
    const duracion = indice === total - 1 ? 5500 : 3500;
    const temporizador = setTimeout(() => {
      setIndice((i) => (i + 1) % total);
    }, duracion);
    return () => clearTimeout(temporizador);
  }, [indice, total]);

  const claseVidrio = CLASE_TINTE[tinte] ?? CLASE_TINTE.dorado;

  return (
    <div className={`relative w-full ${alto} rounded-card overflow-hidden border border-carbon-border`}>
      {imagenes.map((url, i) => (
        <img
          key={url + i}
          src={url}
          alt={titulo || `Foto ${i + 1}`}
          className={`carrusel-slide absolute inset-0 w-full h-full ${ajuste}
            ${i === indice ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {/* Puntos indicadores — arriba, para no chocar con la franja de
          vidrio de abajo (que ahora ocupa todo el ancho). */}
      {total > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
          {imagenes.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                i === indice ? "bg-gold" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Cierre en vidrio — solo sobre la última foto, con título y texto.
          Ocupa todo el ancho del marco (de borde a borde), quieto, sin
          flotar. */}
      {esUltima && (titulo || texto) && (
        <div
          className={`carrusel-slide absolute inset-x-0 bottom-0 p-4 sm:p-6 ${claseVidrio}
            ${esUltima ? "opacity-100" : "opacity-0"}`}
        >
          {titulo && <h3 className="text-lg sm:text-xl font-extrabold text-ink drop-shadow-sm">{titulo}</h3>}
          {texto && (
            <p className="text-ink/90 text-sm sm:text-base mt-1 leading-snug drop-shadow-sm">{texto}</p>
          )}
        </div>
      )}
    </div>
  );
}
