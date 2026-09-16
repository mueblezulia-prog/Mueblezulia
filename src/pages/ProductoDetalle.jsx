import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ColorSwatchSelector from "../components/ColorSwatchSelector";
import Reveal from "../components/Reveal";
import { sonidoConfirmar } from "../lib/sonido";

const WHATSAPP_NUMERO = "584127519141"; // +58 412 751 9141

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
  const scrollRef = useRef(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);

      const [
        { data: productoData, error: errorProducto },
        { data: imagenesData, error: errorImagenes },
        { data: coloresData, error: errorColores },
      ] = await Promise.all([
        supabase.from("productos").select("*").eq("id", id).single(),
        supabase.from("producto_imagenes").select("*").eq("producto_id", id).order("orden"),
        supabase.from("producto_colores").select("*").eq("producto_id", id).order("orden"),
      ]);

      if (!activo) return;

      if (errorProducto) {
        setError(errorProducto.message);
      } else {
        setProducto(productoData);
        // La galería del detalle siempre incluye la foto de portada
        // primero (para que "1/2" cuente también la portada, no solo
        // las fotos extra), seguida de las demás fotos de la galería,
        // sin repetir la portada si el admin también la agregó ahí.
        const galeriaExtra = !errorImagenes && imagenesData?.length ? imagenesData.map((im) => im.url) : [];
        const portada = productoData?.imagen_recortada_url;
        const todas = portada
          ? [portada, ...galeriaExtra.filter((url) => url !== portada)]
          : galeriaExtra;
        setImagenes(todas);

        if (!errorColores && coloresData?.length) {
          setColores(coloresData);
          setColorSeleccionado(coloresData[0]);
        }
      }
      setCargando(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [id]);

  function alHacerScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndiceImagen(i);
  }

  function irAImagen(i) {
    const el = scrollRef.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(i, imagenes.length - 1));
    el.scrollTo({ left: destino * el.clientWidth, behavior: "smooth" });
    setIndiceImagen(destino);
  }

  if (cargando) {
    return <p className="text-center text-ink-muted text-lg py-16">Cargando…</p>;
  }
  if (error || !producto) {
    return (
      <p className="text-center text-terracota text-lg py-16">
        No se pudo cargar el producto{error ? `: ${error}` : ""}.
      </p>
    );
  }

  const linkProducto = `${window.location.origin}/producto/${producto.id}`;
  const mensajeWhatsApp = encodeURIComponent(
    `Hola, estoy preguntando por: ${producto.titulo}\n${linkProducto}`
  );
  const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWhatsApp}`;

  return (
    <div className="max-w-3xl mx-auto pb-28">
      {/* Galería deslizable: si el mueble tiene varias fotos (cargadas
          desde el Panel Admin en producto_imagenes), aquí se pueden
          deslizar con el dedo o usar las flechas. Los puntos de abajo
          indican cuál se ve. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="absolute left-3 top-3 z-20 w-10 h-10 rounded-full glass-dark text-ink flex items-center justify-center text-xl"
        >
          ←
        </button>

        <div
          ref={scrollRef}
          onScroll={alHacerScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {imagenes.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${producto.titulo} — foto ${i + 1}`}
              className="w-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>

        {imagenes.length > 1 && (
          <>
            {indiceImagen > 0 && (
              <button
                type="button"
                onClick={() => irAImagen(indiceImagen - 1)}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-xl backdrop-blur shadow-md transition-colors"
              >
                ‹
              </button>
            )}
            {indiceImagen < imagenes.length - 1 && (
              <button
                type="button"
                onClick={() => irAImagen(indiceImagen + 1)}
                aria-label="Foto siguiente"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-xl backdrop-blur shadow-md transition-colors"
              >
                ›
              </button>
            )}
            <span className="absolute top-2 right-2 bg-black/50 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur">
              {indiceImagen + 1}/{imagenes.length}
            </span>
          </>
        )}

        {imagenes.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {imagenes.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irAImagen(i)}
                aria-label={`Ir a la foto ${i + 1}`}
                className={[
                  "w-2 h-2 rounded-full transition-colors shadow shadow-black/40",
                  i === indiceImagen ? "bg-gold" : "bg-white/50",
                ].join(" ")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panel de vidrio: una sola superficie translúcida que "sube" sobre
          la foto (margen negativo) y va de borde a borde de la pantalla,
          sin esquinas redondeadas abajo, para que llegue hasta la barra
          fija de WhatsApp sin dejar huecos a los lados ni abajo. */}
      <div className="relative -mt-14 sm:-mt-16 overflow-hidden rounded-t-3xl z-10">
        {imagenes[0] && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center scale-110 blur-md opacity-40"
              style={{ backgroundImage: `url(${imagenes[0]})` }}
            />
            <div className="absolute inset-0 bg-carbon/85" />
          </>
        )}
        <div className="relative glass px-5 pt-8 pb-8 flex flex-col gap-4 border-x-0 animar-entrada">
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">{producto.titulo}</h1>

          {/* Precio y medida con su ícono respectivo */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-price font-extrabold text-gold glass-gold px-3 py-1 rounded-control">
              💲 {Number(producto.precio).toLocaleString("es-VE")}
            </span>
            {producto.medida && (
              <span className="inline-flex items-center gap-2 text-lg font-semibold text-ink-muted glass px-3 py-1 rounded-control">
                📏 {producto.medida}
              </span>
            )}
            {producto.disponible_todas_telas && (
              <span className="inline-flex items-center gap-2 text-base font-bold text-gold glass-gold px-3 py-1 rounded-control">
                🌈 Todas las telas
              </span>
            )}
            {producto.color_a_eleccion && (
              <span className="inline-flex items-center gap-2 text-base font-bold text-gold glass-gold px-3 py-1 rounded-control">
                🎨 El color de tu preferencia
              </span>
            )}
          </div>

          {producto.descripcion_corta && (
            <p className="text-ink-muted text-lg leading-relaxed">
              {producto.descripcion_corta}
            </p>
          )}

          {producto.descripcion_larga && (
            <p className="text-ink-muted text-base leading-relaxed">
              {producto.descripcion_larga}
            </p>
          )}

          <ColorSwatchSelector
            colores={colores}
            seleccionado={colorSeleccionado}
            onSeleccionar={setColorSeleccionado}
          />
        </div>
      </div>

      {/* Barra de acciones fija abajo — siempre visible, fácil de alcanzar con el pulgar */}
      <div className="fixed bottom-0 left-0 right-0 glass-dark p-4 max-w-3xl mx-auto">
        <a
          href={linkWhatsApp}
          target="_blank"
          rel="noreferrer"
          onClick={sonidoConfirmar}
          className="btn-primary flex items-center justify-center gap-2"
        >
          💬 Preguntar por WhatsApp
        </a>
      </div>
    </div>
  );
}
