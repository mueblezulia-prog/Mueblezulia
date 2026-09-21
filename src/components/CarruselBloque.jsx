import { useEffect, useState } from "react";
import { TAMANOS_TITULO, COLORES_TEXTO } from "../lib/contenido";

export const CLASE_TINTE = {
  dorado: "glass-caption-gold",
  blanco: "glass-caption",
  oscuro: "glass-caption-dark",
};

/**
 * "Modo presentación": las fotos de la galería pasan solas cada pocos
 * segundos con un fundido suave.
 *
 * ESTRUCTURA DE LA TARJETA (a propósito, no es una capa flotante):
 * el contenedor se divide en DOS bloques apilados verticalmente, cada
 * uno con su propio espacio:
 *   1) Bloque de la foto — arriba, completa, respetando el recorte/alto
 *      elegido en el panel. Nada se dibuja encima de ella.
 *   2) Bloque de vidrio con el texto — debajo, totalmente separado. Si
 *      el texto necesita más espacio, este bloque crece hacia abajo
 *      (la tarjeta entera se hace más alta); nunca empuja hacia arriba
 *      ni tapa la foto.
 * Detrás del tinte de vidrio va la misma foto, duplicada y difuminada
 * (efecto espejo), para que el cuadro de texto nunca se vea como un
 * rectángulo gris plano.
 *
 * `alto`: clase de altura (ver ALTOS_BLOQUE/ALTOS_MAX en lib/contenido.js) —
 * se aplica SOLO al bloque de la foto, nunca a la tarjeta completa.
 * `ajuste`: "object-cover" u "object-contain bg-carbon".
 * `aspecto`: si la foto se recortó a una proporción exacta (ver
 * RecortadorContenido), aquí llega como texto CSS ("16 / 9", "4 / 5",
 * "1 / 1") — el bloque de la foto usa esa proporción en vez de depender
 * solo de `alto`, así "Llena el marco" nunca vuelve a recortar de más.
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
    <div className="w-full rounded-card overflow-hidden border border-carbon-border flex flex-col">
      {/* Bloque 1: la foto, completa, sin nada encima. */}
      <div className={`relative w-full ${alto}`} style={estiloMarco}>
        {imagenes.map((url, i) => (
          <img
            key={url + i}
            src={url}
            alt={titulo || `Foto ${i + 1}`}
            className={`carrusel-slide absolute inset-0 w-full h-full ${ajuste}
              ${i === indice ? "opacity-100" : "opacity-0"}`}
          />
        ))}

        {/* Puntos indicadores — pequeños, arriba de la foto, no tapan
            contenido importante. */}
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
      </div>

      {/* Bloque 2: el texto, en su propio espacio, DEBAJO de la foto —
          nunca la tapa, y crece hacia abajo si el texto es largo. */}
      {(titulo || texto) && (
        <div className={`relative overflow-hidden ${claseVidrio}`}>
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
