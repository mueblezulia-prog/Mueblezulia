import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ColorSwatchSelector from "../components/ColorSwatchSelector";

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
        // Si todavía no hay filas en producto_imagenes (panel admin no
        // sube varias fotos aún), se usa la única foto del producto como
        // galería de 1 imagen, para que el diseño no cambie.
        if (!errorImagenes && imagenesData?.length) {
          setImagenes(imagenesData.map((im) => im.url));
        } else if (productoData?.imagen_recortada_url) {
          setImagenes([productoData.imagen_recortada_url]);
        }

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
      <div className="sticky top-0 z-10 bg-carbon/90 backdrop-blur px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-tap min-w-tap flex items-center gap-2 text-ink text-lg font-bold"
        >
          ← Volver
        </button>
      </div>

      {/* Galería deslizable: si el mueble tiene varias fotos (cargadas
          desde el Panel Admin en producto_imagenes), aquí se pueden
          deslizar con el dedo. Los puntos de abajo indican cuál se ve. */}
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
        <div className="flex justify-center gap-1.5 py-3">
          {imagenes.map((_, i) => (
            <span
              key={i}
              className={[
                "w-2 h-2 rounded-full",
                i === indiceImagen ? "bg-gold" : "bg-carbon-border",
              ].join(" ")}
            />
          ))}
        </div>
      )}

      <div className="px-4 py-4 flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold text-ink">{producto.titulo}</h1>

        {/* Precio y medida con su ícono respectivo */}
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-2 text-price font-extrabold text-gold">
            💲 {Number(producto.precio).toLocaleString("es-VE")}
          </span>
          {producto.medida && (
            <span className="inline-flex items-center gap-2 text-lg font-semibold text-ink-muted">
              📏 {producto.medida}
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

      {/* Barra de acciones fija abajo — siempre visible, fácil de alcanzar con el pulgar */}
      <div className="fixed bottom-0 left-0 right-0 bg-carbon border-t border-carbon-border p-4 max-w-3xl mx-auto">
        <a
          href={linkWhatsApp}
          target="_blank"
          rel="noreferrer"
          className="btn-primary flex items-center justify-center gap-2"
        >
          💬 Preguntar por WhatsApp
        </a>
      </div>
    </div>
  );
}
