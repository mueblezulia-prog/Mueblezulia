import SectionBanner from "./SectionBanner";
import CarruselBloque, { CLASE_TINTE } from "./CarruselBloque";
import { ALTOS_BLOQUE } from "../lib/contenido";

/**
 * Dibuja UN bloque de contenido armado desde el admin (ver
 * AdminContenido.jsx → "Secciones Personalizadas"). El admin elige el
 * tipo, el texto, las fotos, el tinte y el tamaño — este componente
 * solo traduce esa configuración a la tarjeta correspondiente, para
 * que cualquier página pueda mostrar los mismos bloques sin repetir
 * el maquetado.
 */
export default function BloqueContenido({ bloque }) {
  const alto = ALTOS_BLOQUE[bloque.alto] ?? ALTOS_BLOQUE.mediano;
  const ajuste = bloque.ajusteImagen === "contain" ? "object-contain bg-carbon" : "object-cover";
  const imagenes = bloque.imagenes ?? [];

  if (bloque.tipo === "banner") {
    return (
      <SectionBanner
        titulo={bloque.titulo}
        icono={bloque.icono}
        imagenFondo={imagenes[0]}
        tinte={bloque.tinte ?? "dorado"}
      />
    );
  }

  if (bloque.tipo === "texto") {
    return (
      <section className="px-4 py-8 max-w-3xl mx-auto text-center">
        {bloque.titulo && <h2 className="text-2xl font-extrabold text-ink mb-3">{bloque.titulo}</h2>}
        {bloque.texto && <p className="text-ink-muted text-lg leading-relaxed whitespace-pre-line">{bloque.texto}</p>}
      </section>
    );
  }

  if (bloque.tipo === "galeria") {
    if (bloque.modoPresentacion && imagenes.length > 0) {
      return (
        <section className="px-4 py-8 max-w-5xl mx-auto">
          <CarruselBloque
            imagenes={imagenes}
            titulo={bloque.titulo}
            texto={bloque.texto}
            tinte={bloque.tinte}
            alto={alto}
            ajuste={ajuste}
          />
        </section>
      );
    }
    return (
      <section className="px-4 py-8 max-w-5xl mx-auto">
        {bloque.titulo && <h2 className="text-2xl font-extrabold text-ink mb-5 text-center">{bloque.titulo}</h2>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {imagenes.map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt={bloque.titulo || "Foto"}
              className={`w-full ${alto} ${ajuste} rounded-card border border-carbon-border`}
            />
          ))}
        </div>
        {bloque.texto && <p className="text-ink-muted text-center mt-4">{bloque.texto}</p>}
      </section>
    );
  }

  if (bloque.tipo === "video" && bloque.video) {
    return (
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <div className={`relative w-full ${alto} rounded-card overflow-hidden border border-carbon-border`}>
          <video
            src={bloque.video}
            className={`absolute inset-0 w-full h-full ${ajuste}`}
            autoPlay
            muted
            loop
            playsInline
          />
          {(bloque.vidrioSiempre ?? true) && (bloque.titulo || bloque.texto) && (
            <div className={`carrusel-slide absolute inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-6 rounded-card p-4 sm:p-5 glass-float ${CLASE_TINTE[bloque.tinte] ?? CLASE_TINTE.dorado}`}>
              {bloque.titulo && <h3 className="text-lg sm:text-xl font-extrabold text-ink drop-shadow-sm">{bloque.titulo}</h3>}
              {bloque.texto && <p className="text-ink/90 text-sm sm:text-base mt-1 leading-snug drop-shadow-sm whitespace-pre-line">{bloque.texto}</p>}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (bloque.tipo === "collage") {
    // Cuadrícula que llena todo el marco (2 a 4 fotos): la primera ocupa
    // el doble de espacio para que no se vea parejo y aburrido.
    return (
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <div className={`relative w-full ${alto} rounded-card overflow-hidden border border-carbon-border grid grid-cols-2 grid-rows-2 gap-1.5`}>
          {imagenes.slice(0, 3).map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt={bloque.titulo || `Foto ${i + 1}`}
              className={`w-full h-full ${ajuste} ${i === 0 && imagenes.length > 1 ? "row-span-2" : ""}`}
            />
          ))}
          {(bloque.vidrioSiempre ?? true) && (bloque.titulo || bloque.texto) && (
            <div className={`absolute inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-6 rounded-card p-4 sm:p-5 ${CLASE_TINTE[bloque.tinte] ?? CLASE_TINTE.dorado}`}>
              {bloque.titulo && <h3 className="text-lg sm:text-xl font-extrabold text-ink drop-shadow-sm">{bloque.titulo}</h3>}
              {bloque.texto && <p className="text-ink/90 text-sm sm:text-base mt-1 leading-snug drop-shadow-sm whitespace-pre-line">{bloque.texto}</p>}
            </div>
          )}
        </div>
      </section>
    );
  }

  // "imagen_texto" (por defecto): con el vidrio activado (lo normal), la
  // foto llena todo el marco y el título/texto flotan encima en una
  // tarjeta de vidrio que se ajusta solo a lo que escribas — funciona
  // igual con 1 foto fija o varias que pasan solas como diapositiva.
  if (bloque.vidrioSiempre ?? true) {
    return (
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <CarruselBloque
          imagenes={imagenes}
          titulo={bloque.titulo}
          texto={bloque.texto}
          tinte={bloque.tinte}
          alto={alto}
          ajuste={ajuste}
        />
      </section>
    );
  }

  // Estilo clásico (vidrio desactivado a propósito): foto a un lado,
  // título + texto al otro, sin superponerse.
  const imagenDerecha = bloque.posicionImagen === "derecha";
  return (
    <section className="px-4 py-8 max-w-5xl mx-auto">
      <div className="glass rounded-card overflow-hidden grid sm:grid-cols-2">
        <img
          src={imagenes[0]}
          alt={bloque.titulo || "Foto"}
          className={`w-full ${alto} sm:h-full ${ajuste} ${imagenDerecha ? "sm:order-2" : ""}`}
        />
        <div className="p-5 flex flex-col justify-center">
          {bloque.titulo && <h3 className="text-xl font-bold text-ink mb-2">{bloque.titulo}</h3>}
          {bloque.texto && <p className="text-ink-muted whitespace-pre-line">{bloque.texto}</p>}
        </div>
      </div>
    </section>
  );
}
