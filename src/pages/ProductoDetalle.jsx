import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ColorSwatchSelector from "../components/ColorSwatchSelector";
import EtiquetasBadges from "../components/EtiquetasBadges";
import BadgeDisponibilidad from "../components/BadgeDisponibilidad";
import TelaRealDetalle from "../components/TelaRealDetalle";
import IconoWhatsApp from "../components/IconoWhatsApp";
import { obtenerEtiquetasProducto } from "../lib/etiquetas";
import { sonidoConfirmar } from "../lib/sonido";
import { formatearPrecio } from "../lib/formato";
import { linkWhatsApp } from "../lib/contacto";
import { registrarClicWhatsApp } from "../lib/estadisticas";

const ES_VIDEO = /\.(mp4|mov|webm|m4v)(\?|$)/i;

/**
 * Detalle de un mueble.
 *  - Celular: galería arriba, panel de vidrio que "sube" sobre la foto y
 *    barra fija de WhatsApp abajo (a mano del pulgar).
 *  - Computador (lg): dos columnas — galería a la izquierda (fija mientras
 *    bajas) y la información a la derecha con el botón de WhatsApp dentro,
 *    en vez de una sola columna angosta en medio de la pantalla.
 */
export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [colores, setColores] = useState([]);
  const [colorSeleccionado, setColorSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [indiceImagen, setIndiceImagen] = useState(0);
  const [intento, setIntento] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);

      const [
        { data: productoData, error: errorProducto },
        { data: imagenesData, error: errorImagenes },
        { data: coloresData, error: errorColores },
      ] = await Promise.all([
        supabase.from("productos").select("*, producto_etiquetas(etiquetas(*))").eq("id", id).single(),
        supabase.from("producto_imagenes").select("*").eq("producto_id", id).order("orden"),
        supabase.from("producto_colores").select("*").eq("producto_id", id).order("orden"),
      ]);

      if (!activo) return;

      if (errorProducto || !productoData) {
        setError(errorProducto?.message ?? "No encontrado");
      } else {
        setProducto(productoData);
        // La galería siempre incluye la foto de portada primero (para que
        // "1/2" cuente también la portada), seguida de las demás fotos,
        // sin repetir la portada si el admin también la agregó ahí.
        const galeriaExtra = !errorImagenes && imagenesData?.length ? imagenesData.map((im) => im.url) : [];
        const portada = productoData.imagen_recortada_url;
        setImagenes(portada ? [portada, ...galeriaExtra.filter((url) => url !== portada)] : galeriaExtra);

        const listaColores = !errorColores && coloresData?.length ? coloresData : [];
        setColores(listaColores);
        setColorSeleccionado(listaColores[0] ?? null);
      }
      setCargando(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [id, intento]);

  function alHacerScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setIndiceImagen(Math.round(el.scrollLeft / el.clientWidth));
  }

  function irAImagen(i) {
    const el = scrollRef.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(i, imagenes.length - 1));
    el.scrollTo({ left: destino * el.clientWidth, behavior: "smooth" });
    setIndiceImagen(destino);
  }

  // Si la persona llegó por un link compartido (WhatsApp, Instagram), no
  // hay página anterior dentro del sitio: "Atrás" la sacaría de la tienda.
  // En ese caso la llevamos al catálogo.
  function volver() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/catalogo");
  }

  if (cargando) return <EsqueletoDetalle />;

  if (error || !producto) {
    return (
      <div className="contenedor py-20 flex flex-col items-center text-center gap-4">
        <h1 className="text-2xl font-extrabold text-ink">No pudimos mostrar este mueble</h1>
        <p className="text-ink-muted max-w-md">
          Puede que ya no esté disponible o que haya un problema de conexión.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setIntento((n) => n + 1)} className="btn-outline">
            Reintentar
          </button>
          <Link to="/catalogo" className="btn-gold-glass">Ver catálogo</Link>
        </div>
      </div>
    );
  }

  const linkProducto = `${window.location.origin}/producto/${producto.id}`;
  const mensaje =
    `Hola, estoy preguntando por: ${producto.titulo}` +
    (colorSeleccionado ? `\nColor: ${colorSeleccionado.nombre}` : "") +
    `\n${linkProducto}`;
  const hrefWhatsApp = linkWhatsApp(mensaje);

  const botonWhatsApp = (
    <a
      href={hrefWhatsApp}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        sonidoConfirmar();
        registrarClicWhatsApp(producto.id);
      }}
      className="btn-primary gap-2"
    >
      <IconoWhatsApp className="w-6 h-6" />
      Preguntar por WhatsApp
    </a>
  );

  return (
    <div className="pb-32 lg:pb-12 lg:pt-6">
      <div className="max-w-3xl mx-auto lg:max-w-6xl lg:px-4 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
        {/* GALERÍA — proporción fija (4:5, la misma del recorte del
            admin): la página ya no "salta" mientras cargan las fotos, y
            las fotos con otra forma se muestran completas sobre un fondo
            difuminado de ellas mismas, en vez de cortarse. */}
        <div className="relative lg:sticky lg:top-20 lg:rounded-card lg:overflow-hidden lg:border lg:border-white/10">
          <button
            type="button"
            onClick={volver}
            aria-label="Volver"
            className="absolute left-3 top-3 z-20 w-11 h-11 rounded-full glass-dark text-ink flex items-center justify-center text-xl hover:bg-black/60 active:scale-95 transition"
          >
            ←
          </button>

          <div
            ref={scrollRef}
            onScroll={alHacerScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar aspect-[4/5] lg:max-h-[calc(100vh-7rem)] bg-carbon-light"
          >
            {imagenes.length === 0 && (
              <div className="w-full h-full shrink-0 flex items-center justify-center">
                <img src="/assets/logo.png" alt="" className="w-20 h-20 object-contain opacity-40" />
              </div>
            )}
            {imagenes.map((url, i) => (
              <div key={url + i} className="relative w-full h-full shrink-0 snap-center overflow-hidden">
                {ES_VIDEO.test(url) ? (
                  <video src={url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-50"
                      style={{ backgroundImage: `url(${url})` }}
                      aria-hidden="true"
                    />
                    <img
                      src={url}
                      alt={`${producto.titulo} — foto ${i + 1}`}
                      className="relative w-full h-full object-contain"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {imagenes.length > 1 && (
            <>
              {indiceImagen > 0 && (
                <button
                  type="button"
                  onClick={() => irAImagen(indiceImagen - 1)}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-2xl backdrop-blur shadow-md transition-colors"
                >
                  ‹
                </button>
              )}
              {indiceImagen < imagenes.length - 1 && (
                <button
                  type="button"
                  onClick={() => irAImagen(indiceImagen + 1)}
                  aria-label="Foto siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-2xl backdrop-blur shadow-md transition-colors"
                >
                  ›
                </button>
              )}
              <span className="absolute top-4 right-3 glass-dark text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {indiceImagen + 1}/{imagenes.length}
              </span>
              <div className="absolute bottom-16 lg:bottom-4 inset-x-0 flex justify-center gap-1.5">
                {imagenes.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => irAImagen(i)}
                    aria-label={`Ir a la foto ${i + 1}`}
                    className={[
                      "h-2 rounded-full transition-all shadow shadow-black/40",
                      i === indiceImagen ? "bg-gold w-5" : "bg-white/60 w-2",
                    ].join(" ")}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* PANEL DE INFORMACIÓN — en celular "sube" sobre la foto con
            vidrio; en computador es una tarjeta normal a la derecha. */}
        <div className="relative -mt-14 sm:-mt-16 lg:mt-0 overflow-hidden rounded-t-3xl lg:rounded-card z-10 lg:border lg:border-white/10">
          {imagenes[0] && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center scale-110 blur-md opacity-40"
                style={{ backgroundImage: `url(${imagenes[0]})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-carbon/85" />
            </>
          )}
          <div className="relative glass px-5 sm:px-7 pt-8 pb-8 flex flex-col gap-5 border-x-0 lg:border-0">
            <h1 className="text-3xl font-extrabold text-ink tracking-tight leading-tight">{producto.titulo}</h1>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-price font-extrabold text-gold glass-gold px-3 py-1 rounded-control">
                <img src="/assets/icons/precio-tag.png" alt="" className="w-6 h-6" />
                {formatearPrecio(producto.precio)}
              </span>
              {producto.medida && (
                <span className="inline-flex items-center gap-2 text-lg font-semibold text-ink glass px-3 py-1 rounded-control">
                  📏 {producto.medida}
                </span>
              )}
              <BadgeDisponibilidad disponible={producto.disponible_entrega ?? true} hacia="abajo" />
            </div>

            <TelaRealDetalle producto={producto} />

            {/* Insignias: telas/color a elección + etiquetas personalizadas. */}
            <EtiquetasBadges etiquetas={obtenerEtiquetasProducto(producto)} tamano="md" />

            {(producto.descripcion_corta || producto.descripcion_larga) && (
              <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
                {producto.descripcion_corta && (
                  <p className="text-ink text-lg leading-relaxed font-medium">{producto.descripcion_corta}</p>
                )}
                {producto.descripcion_larga && (
                  <p className="text-ink-muted text-base leading-relaxed whitespace-pre-line">{producto.descripcion_larga}</p>
                )}
              </div>
            )}

            <ColorSwatchSelector colores={colores} seleccionado={colorSeleccionado} onSeleccionar={setColorSeleccionado} />

            {/* En computador el botón vive aquí dentro (no hace falta una
                barra fija abajo en una pantalla grande). */}
            <div className="hidden lg:block pt-2">{botonWhatsApp}</div>
          </div>
        </div>
      </div>

      {/* Barra de WhatsApp fija abajo (solo celular/tablet) — z-40 para que
          el panel de información nunca le pase por encima al hacer scroll. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-dark border-x-0 border-b-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto">{botonWhatsApp}</div>
      </div>
    </div>
  );
}

/** Esqueleto mientras carga (en vez de un "Cargando…" suelto). */
function EsqueletoDetalle() {
  return (
    <div className="max-w-3xl mx-auto lg:max-w-6xl lg:px-4 lg:pt-6 lg:grid lg:grid-cols-2 lg:gap-8" aria-busy="true">
      <div className="esqueleto aspect-[4/5] rounded-none lg:rounded-card" />
      <div className="px-5 py-8 flex flex-col gap-4">
        <div className="esqueleto h-9 w-3/4" />
        <div className="esqueleto h-10 w-40" />
        <div className="esqueleto h-5 w-full" />
        <div className="esqueleto h-5 w-5/6" />
        <div className="esqueleto h-5 w-2/3" />
      </div>
    </div>
  );
}
