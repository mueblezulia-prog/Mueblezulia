import { useEffect, useState } from "react";
import { TAMANOS_TITULO, COLORES_TEXTO } from "../lib/contenido";

export const CLASE_TINTE = {
  dorado: "glass-caption-gold",
  blanco: "glass-caption",
  oscuro: "glass-caption-dark",
};

/**
 * "Modo presentación": las fotos de la galería pasan solas cada pocos
 * segundos con un fundido suave. El título y el texto del bloque se ven
 * SIEMPRE, sobre una tarjeta de vidrio (blur + tinte) quieta al fondo —
 * no aparecen y desaparecen con cada foto, para que nunca se sienta que
 * "falta" el texto mientras pasan las fotos.
 *
 * `alto`: clase de altura (ver ALTOS_BLOQUE/ALTOS_MAX en lib/contenido.js).
 * `ajuste`: "object-cover" u "object-contain bg-carbon".
 * `aspecto`: si la foto se recortó a una proporción exacta (ver
 * RecortadorContenido), aquí llega como texto CSS ("16 / 9", "4 / 5",
 * "1 / 1") — el marco usa esa proporción en vez de depender solo de
 * `alto`, así "Llena el marco" nunca vuelve a recortar de más.
 */
export default function CarruselBloque({
  imagenes,
  titulo,
  texto,
  tinte = "dorado",
  alto,
  ajuste,
  aspecto,
  tamanoTitulo = "mediano",
  colorTexto = "blanco",
}) {
  const [indice, setIndice] = useState(0);
  const total = imagenes.length;

  useEffect(() => {
    if (total <= 1) return;
    const temporizador = setTimeout(() => {
      setIndice((i) => (i + 1) % total);
    }, 3500);
    return () => clearTimeout(temporizador);
  }, [indice, total]);

  const claseVidrio = CLASE_TINTE[tinte] ?? CLASE_TINTE.dorado;
  const claseTamano = TAMANOS_TITULO[tamanoTitulo] ?? TAMANOS_TITULO.mediano;
  const claseColor = COLORES_TEXTO[colorTexto] ?? COLORES_TEXTO.blanco;
  const estiloMarco = aspecto ? { aspectRatio: aspecto } : undefined;
  const imagenEspejo = imagenes[indice] ?? imagenes[0];

  return (
    <div
      className={`relative w-full ${alto} rounded-card overflow-hidden border border-carbon-border`}
      style={estiloMarco}
    >
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

      {/* Franja de vidrio con título y texto — SIEMPRE visible (no
          aparece/desaparece con las fotos), de borde a borde, quieta.
          Detrás del tinte de vidrio va la MISMA foto, duplicada y
          difuminada (efecto espejo) — así nunca se ve como un vidrio
          "vacío"/gris plano, siempre hay algo detrás para difuminar. */}
      {(titulo || texto) && (
        <div className={`absolute inset-x-0 bottom-0 overflow-hidden ${claseVidrio}`}>
          {imagenEspejo && (
            <div
              className="absolute inset-0 bg-cover bg-center scale-125 blur-xl opacity-60"
              style={{ backgroundImage: `url(${imagenEspejo})` }}
              aria-hidden="true"
            />
          )}
          <div className="relative p-4 sm:p-6">
            {titulo && (
              <h3 className={`${claseTamano} font-extrabold ${claseColor} drop-shadow-sm`}>{titulo}</h3>
            )}
            {texto && (
              <p className={`${claseColor}/90 text-sm sm:text-base mt-1 leading-snug drop-shadow-sm whitespace-pre-line`}>
                {texto}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
