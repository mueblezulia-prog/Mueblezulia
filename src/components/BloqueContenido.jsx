import SectionBanner from "./SectionBanner";
import CarruselBloque, { CLASE_TINTE } from "./CarruselBloque";
import { ALTOS_BLOQUE, ALTOS_MAX, TAMANOS_TITULO, COLORES_TEXTO, COLORES_TEXTO_SUAVE } from "../lib/contenido";

/**
 * Dibuja UN bloque de contenido armado desde el admin (ver
 * AdminContenido.jsx → "Secciones Personalizadas"). El admin elige el
 * tipo, el texto, las fotos, el tinte y el tamaño — este componente
 * solo traduce esa configuración a la tarjeta correspondiente, para
 * que cualquier página pueda mostrar los mismos bloques sin repetir
 * el maquetado.
 */
// Columnas en computador según cuántas celdas hay (clases escritas
// completas para que Tailwind las genere).
const COLS_SM = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };
function columnasComputador(total) {
  if (total <= 4) return COLS_SM[Math.max(total, 1)];
  if (total % 3 === 0) return COLS_SM[3];
  if (total % 4 === 0) return COLS_SM[4];
  return COLS_SM[3];
}

/**
 * El texto de la sección convertido en una "foto más" de la cuadrícula:
 * se usa cuando las fotos dejan un espacio vacío (ej. 3 fotos en 2
 * columnas) — así ese hueco lo llena el texto en vez de quedar negro.
 */
function CeldaTexto({ bloque, imagenes, claseTamano, claseColor, claseColorSuave, redondeo = "rounded-card" }) {
  return (
    <div className={`relative overflow-hidden ${redondeo} ${CLASE_TINTE[bloque.tinte] ?? CLASE_TINTE.dorado} flex`}>
      {imagenes[0] && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-125 blur-xl opacity-60"
          style={{ backgroundImage: `url(${imagenes[imagenes.length - 1]})` }}
          aria-hidden="true"
        />
      )}
      <div className="relative p-3 sm:p-5 flex flex-col justify-center gap-1 w-full overflow-y-auto">
        {bloque.titulo && <h3 className={`${claseTamano} font-extrabold ${claseColor} drop-shadow-sm leading-tight`}>{bloque.titulo}</h3>}
        {bloque.texto && (
          <p className={`${claseColorSuave} text-sm sm:text-base leading-snug drop-shadow-sm whitespace-pre-line`}>{bloque.texto}</p>
        )}
      </div>
    </div>
  );
}

// El texto entra en la celda libre solo si no es muy largo (si no, va
// debajo en su propia tarjeta ancha, como siempre).
const MAX_TEXTO_EN_CELDA = 260;

export default function BloqueContenido({ bloque }) {
  const claveAlto = bloque.alto ?? "mediano";
  // Si la foto ya viene recortada a una proporción exacta (ver
  // RecortadorContenido en el admin), el marco usa esa proporción en vez
  // de una altura fija — así "Llena el marco" nunca vuelve a recortar de
  // más; el alto acá solo actúa como TOPE máximo en pantallas anchas.
  const alto = bloque.aspecto ? (ALTOS_MAX[claveAlto] ?? ALTOS_MAX.mediano) : (ALTOS_BLOQUE[claveAlto] ?? ALTOS_BLOQUE.mediano);
  const estiloAspecto = bloque.aspecto ? { aspectRatio: bloque.aspecto } : undefined;
  const ajuste = bloque.ajusteImagen === "contain" ? "object-contain bg-carbon" : "object-cover";
  const imagenes = bloque.imagenes ?? [];
  const claseTamano = TAMANOS_TITULO[bloque.tamanoTitulo] ?? TAMANOS_TITULO.mediano;
  const claseColor = COLORES_TEXTO[bloque.colorTexto] ?? COLORES_TEXTO.blanco;
  const claseColorSuave = COLORES_TEXTO_SUAVE[bloque.colorTexto] ?? COLORES_TEXTO_SUAVE.blanco;

  if (bloque.tipo === "banner") {
    return (
      <SectionBanner
        titulo={bloque.titulo}
        icono={bloque.icono}
        imagenFondo={imagenes[0]}
        tinte={bloque.tinte ?? "dorado"}
        animacionIcono={bloque.animacionIcono ?? "suave"}
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
        <section className="contenedor py-8">
          <CarruselBloque
            imagenes={imagenes}
            titulo={bloque.titulo}
            texto={bloque.texto}
            tinte={bloque.tinte}
            alto={alto}
            ajuste={ajuste}
            aspecto={bloque.aspecto}
            tamanoTitulo={bloque.tamanoTitulo}
            colorTexto={bloque.colorTexto}
          />
        </section>
      );
    }
    // Si las fotos dejan un hueco en la cuadrícula (cantidad impar), el
    // texto ocupa ese espacio en vez de ir debajo.
    const textoEnCelda =
      !!bloque.texto && imagenes.length % 2 === 1 && imagenes.length > 1 && bloque.texto.length <= MAX_TEXTO_EN_CELDA;
    const celdas = imagenes.length + (textoEnCelda ? 1 : 0);
    return (
      <section className="contenedor py-8">
        {bloque.titulo && <h2 className="text-2xl font-extrabold text-ink mb-5 text-center">{bloque.titulo}</h2>}
        <div className={`grid grid-cols-2 ${columnasComputador(celdas)} gap-3`}>
          {imagenes.map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt={bloque.titulo || "Foto"}
              style={estiloAspecto}
              className={`w-full ${alto} ${ajuste} rounded-card border border-carbon-border`}
            />
          ))}
          {textoEnCelda && (
            <CeldaTexto
              bloque={{ ...bloque, titulo: "" }}
              imagenes={imagenes}
              claseTamano={claseTamano}
              claseColor={claseColor}
              claseColorSuave={claseColorSuave}
            />
          )}
        </div>
        {/* El texto va en su propia tarjeta de vidrio, DEBAJO de las
            fotos (nunca encima) — así nunca tapa la cuadrícula, ni crece
            más que ella. Detrás del tinte va la primera foto duplicada y
            difuminada (efecto espejo) para que nunca se vea como un
            cuadro gris plano. */}
        {bloque.texto && !textoEnCelda && (
          <div className={`mt-4 rounded-card overflow-hidden relative ${CLASE_TINTE[bloque.tinte] ?? CLASE_TINTE.dorado}`}>
            {imagenes[0] && (
              <div
                className="absolute inset-0 bg-cover bg-center scale-125 blur-xl opacity-60"
                style={{ backgroundImage: `url(${imagenes[0]})` }}
                aria-hidden="true"
              />
            )}
            <div className="relative p-4 sm:p-5">
              <p className={`${claseColorSuave} text-sm sm:text-base leading-snug whitespace-pre-line`}>{bloque.texto}</p>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (bloque.tipo === "video" && bloque.video) {
    // Video arriba, completo — el texto va en su propio bloque de vidrio
    // DEBAJO (nunca encima tapando el video).
    return (
      <section className="contenedor py-8">
        <div className="w-full rounded-card overflow-hidden border border-carbon-border flex flex-col">
          <div className={`relative w-full ${alto}`} style={estiloAspecto}>
            <video
              src={bloque.video}
              className={`absolute inset-0 w-full h-full ${ajuste}`}
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
          {(bloque.vidrioSiempre ?? true) && (bloque.titulo || bloque.texto) && (
            <div className={`p-4 sm:p-6 ${CLASE_TINTE[bloque.tinte] ?? CLASE_TINTE.dorado}`}>
              {bloque.titulo && <h3 className={`${claseTamano} font-extrabold ${claseColor} drop-shadow-sm`}>{bloque.titulo}</h3>}
              {bloque.texto && <p className={`${claseColorSuave} text-sm sm:text-base mt-1 leading-snug drop-shadow-sm whitespace-pre-line`}>{bloque.texto}</p>}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (bloque.tipo === "collage") {
    // Tres formas de acomodar las mismas fotos (ver SelectorEstiloCollage
    // en el admin) — el texto SIEMPRE va debajo, en su propio bloque de
    // vidrio, nunca encima tapando las fotos, sea cual sea la forma.
    const estiloCollage = bloque.estiloCollage ?? "cuadricula";
    let cuerpoFotos;
    let textoYaMostrado = false;

    if (estiloCollage === "mosaico") {
      // Mosaico inclinado (estilo Pinterest): fotos superpuestas, cada
      // una con su propio marco blanco tipo polaroid y una leve
      // inclinación alternada — se ve bien con 3 a 5 fotos.
      const rotaciones = ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6", "-rotate-3"];
      cuerpoFotos = (
        <div className="flex flex-wrap justify-center items-end gap-y-8 px-6 sm:px-10 py-10">
          {imagenes.slice(0, 5).map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt={bloque.titulo || `Foto ${i + 1}`}
              className={`w-28 h-36 sm:w-36 sm:h-48 object-cover rounded-md border-[6px] border-white shadow-xl bg-white transition-transform duration-200 hover:scale-105 hover:rotate-0 hover:z-20 ${
                rotaciones[i % rotaciones.length]
              } ${i > 0 ? "-ml-8 sm:-ml-12" : ""}`}
              style={{ zIndex: i }}
            />
          ))}
        </div>
      );
    } else if (estiloCollage === "tarjetas") {
      // Tarjetas: cada foto en su propio recuadro separado (con borde y
      // sombra propios), en fila — se ve bien con 2 a 4 fotos.
      const fotosMostradas = imagenes.slice(0, 6);
      const hayTexto = (bloque.vidrioSiempre ?? true) && (bloque.titulo || bloque.texto);
      const textoEnCelda =
        hayTexto && fotosMostradas.length % 2 === 1 && fotosMostradas.length > 1 && (bloque.texto?.length ?? 0) <= MAX_TEXTO_EN_CELDA;
      textoYaMostrado = textoEnCelda;
      const celdas = fotosMostradas.length + (textoEnCelda ? 1 : 0);
      cuerpoFotos = (
        <div className={`grid gap-3 p-3 grid-cols-2 ${columnasComputador(celdas)}`}>
          {fotosMostradas.map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt={bloque.titulo || `Foto ${i + 1}`}
              style={estiloAspecto}
              className={`w-full ${alto} ${ajuste} rounded-card border border-carbon-border shadow-md shadow-black/20`}
            />
          ))}
          {textoEnCelda && (
            <CeldaTexto
              bloque={bloque}
              imagenes={fotosMostradas}
              claseTamano={claseTamano}
              claseColor={claseColor}
              claseColorSuave={claseColorSuave}
            />
          )}
        </div>
      );
    } else {
      // Cuadrícula (el acomodo clásico, de siempre): llena todo el marco,
      // la primera foto ocupa el doble de espacio para que no se vea
      // parejo y aburrido.
      cuerpoFotos = (
        <div className={`relative w-full ${alto} grid grid-cols-2 grid-rows-2 gap-1.5`} style={estiloAspecto}>
          {imagenes.slice(0, 3).map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt={bloque.titulo || `Foto ${i + 1}`}
              className={`w-full h-full ${ajuste} ${i === 0 && imagenes.length > 1 ? "row-span-2" : ""}`}
            />
          ))}
        </div>
      );
    }

    // El mosaico inclinado necesita "respirar" (las fotos giradas y su
    // sombra no deben cortarse contra un borde recto) — por eso, solo
    // para ese estilo, la tarjeta no lleva marco propio ni recorta lo
    // que se sale del cuadro.
    const esMosaico = estiloCollage === "mosaico";
    return (
      <section className="contenedor py-8">
        <div className={esMosaico ? "w-full flex flex-col" : "w-full rounded-card overflow-hidden border border-carbon-border flex flex-col"}>
          {cuerpoFotos}
          {!textoYaMostrado && (bloque.vidrioSiempre ?? true) && (bloque.titulo || bloque.texto) && (
            <div className={`relative overflow-hidden ${esMosaico ? "rounded-card" : ""} ${CLASE_TINTE[bloque.tinte] ?? CLASE_TINTE.dorado}`}>
              {imagenes[0] && (
                <div
                  className="absolute inset-0 bg-cover bg-center scale-125 blur-xl opacity-60"
                  style={{ backgroundImage: `url(${imagenes[0]})` }}
                  aria-hidden="true"
                />
              )}
              <div className="relative p-4 sm:p-6">
                {bloque.titulo && <h3 className={`${claseTamano} font-extrabold ${claseColor} drop-shadow-sm`}>{bloque.titulo}</h3>}
                {bloque.texto && <p className={`${claseColorSuave} text-sm sm:text-base mt-1 leading-snug drop-shadow-sm whitespace-pre-line`}>{bloque.texto}</p>}
              </div>
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
      <section className="contenedor py-8">
        <CarruselBloque
          imagenes={imagenes}
          titulo={bloque.titulo}
          texto={bloque.texto}
          tinte={bloque.tinte}
          alto={alto}
          ajuste={ajuste}
          aspecto={bloque.aspecto}
          tamanoTitulo={bloque.tamanoTitulo}
          colorTexto={bloque.colorTexto}
        />
      </section>
    );
  }

  // Estilo clásico (vidrio desactivado a propósito): foto a un lado,
  // título + texto al otro, sin superponerse.
  const imagenDerecha = bloque.posicionImagen === "derecha";
  return (
    <section className="contenedor py-8">
      <div className="glass border-0 rounded-card overflow-hidden grid sm:grid-cols-2">
        <img
          src={imagenes[0]}
          alt={bloque.titulo || "Foto"}
          style={estiloAspecto}
          className={`w-full ${alto} sm:h-full ${ajuste} ${imagenDerecha ? "sm:order-2" : ""}`}
        />
        <div className="p-5 flex flex-col justify-center">
          {bloque.titulo && <h3 className={`${claseTamano} font-bold ${claseColor} mb-2`}>{bloque.titulo}</h3>}
          {bloque.texto && <p className="text-ink-muted whitespace-pre-line">{bloque.texto}</p>}
        </div>
      </div>
    </section>
  );
}
