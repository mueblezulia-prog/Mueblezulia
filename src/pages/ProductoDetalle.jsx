import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ColorSwatchSelector from "../components/ColorSwatchSelector";

export default function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [colores, setColores] = useState([]);
  const [colorSeleccionado, setColorSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);

      const [{ data: productoData, error: errorProducto }, { data: coloresData, error: errorColores }] =
        await Promise.all([
          supabase.from("productos").select("*").eq("id", id).single(),
          supabase.from("producto_colores").select("*").eq("producto_id", id).order("orden"),
        ]);

      if (!activo) return;

      if (errorProducto) {
        setError(errorProducto.message);
      } else {
        setProducto(productoData);
      }
      if (!errorColores && coloresData?.length) {
        setColores(coloresData);
        setColorSeleccionado(coloresData[0]);
      }
      setCargando(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [id]);

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

      {/* Imagen grande — usa el mismo recorte final que el catálogo,
          pero renderizada a mayor tamaño (misma imagen_recortada_url). */}
      <img
        src={producto.imagen_recortada_url}
        alt={producto.titulo}
        className="w-full h-auto block"
      />

      <div className="px-4 py-6 flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold text-ink">{producto.titulo}</h1>
        <p className="text-price font-extrabold text-gold">
          ${Number(producto.precio).toLocaleString("es-VE")}
        </p>

        {producto.descripcion_larga && (
          <p className="text-ink-muted text-lg leading-relaxed">
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
      <div className="fixed bottom-0 left-0 right-0 bg-carbon border-t border-carbon-border p-4 flex flex-col gap-2 max-w-3xl mx-auto">
        <button type="button" className="btn-primary">
          Comprar Ahora
        </button>
        <button type="button" className="btn-secondary">
          Compra Personalizada
        </button>
      </div>
    </div>
  );
}
