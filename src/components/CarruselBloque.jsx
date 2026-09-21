import { useEffect, useState } from "react";

export const CLASE_TINTE = {
  dorado: "glass-gold",
  blanco: "glass",
  oscuro: "glass-dark",
};

/**
 * "Modo presentación": las fotos de la galería pasan solas cada pocos
 * segundos con un fundido suave. El título y el texto del bloque se ven
 * SIEMPRE, sobre una tarjeta de vidrio (blur + tinte) quieta al fondo —
 * no aparecen y desaparecen con cada foto, para que nunca se sienta que
 * "falta" el texto mientras pasan las fotos.
 *
 * `alto`: clase de altura (ver ALTOS_BLOQUE en lib/contenido.js).
 * `ajuste`: "object-cover" u "object-contain bg-carbon".
 */
export default function CarruselBloque({ imagenes, titulo, texto, tinte = "dorado", alto, ajuste, enfoque }) {
  const [indice, setIndice] = useState(0);
  const total = imagenes.length;
  const estiloEnfoque = enfoque ? { objectPosition: enfoque } : undefined;

  useEffect(() => {
    if (total <= 1) return;
    const temporizador = setTimeout(() => {
      setIndice((i) => (i + 1) % total);
    }, 3500);
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
          style={estiloEnfoque}
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

      {/* Franja de vidrio con título y texto — SIEMPRE visible (no
          aparece/desaparece con las fotos), de borde a borde, quieta. */}
      {(titulo || texto) && (
        <div className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 ${claseVidrio}`}>
          {titulo && <h3 className="text-lg sm:text-xl font-extrabold text-ink drop-shadow-sm">{titulo}</h3>}
          {texto && (
            <p className="text-ink/90 text-sm sm:text-base mt-1 leading-snug drop-shadow-sm whitespace-pre-line">{texto}</p>
          )}
        </div>
      )}
    </div>
  );
}
