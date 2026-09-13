import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import CategoriasGrid from "../components/CategoriasGrid";

/**
 * Catálogo general: muestra TODOS los muebles activos. Para entrar a una
 * línea específica (Modulares, Comedores, etc.) se usa la grilla de arriba,
 * que lleva a su página dedicada /categoria/:slug (CategoriaPagina.jsx) —
 * ahí es donde se filtra por categoría, así el comportamiento es el mismo
 * sin importar desde qué pantalla del sitio se entre.
 */
export default function CatalogoProductos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarProductos() {
      setCargando(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("*")
          .eq("activo", true)
          .order("orden", { ascending: true });

        if (!activo) return;
        if (error) {
          setError(error.message);
        } else {
          setProductos(data ?? []);
        }
      } catch (err) {
        if (!activo) return;
        setError(err?.message ?? "Error desconocido al conectar con la base de datos.");
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarProductos();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-extrabold text-ink mb-1">Catálogo</h1>
      <p className="text-ink-muted mb-6">Explora todas nuestras líneas de muebles.</p>

      <CategoriasGrid />

      <div className="border-t border-carbon-border pt-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-ink mb-4">Todos los productos</h2>

        {cargando && (
          <p className="text-center text-ink-muted text-lg py-16">Cargando catálogo…</p>
        )}

        {!cargando && error && (
          <p className="text-center text-terracota text-lg py-16">
            No se pudo cargar el catálogo: {error}
          </p>
        )}

        {!cargando && !error && productos.length === 0 && (
          <p className="text-center text-ink-muted text-lg py-16">Todavía no hay productos cargados.</p>
        )}

        {!cargando && !error && productos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {productos.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
