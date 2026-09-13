import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import CategoriasGrid from "../components/CategoriasGrid";

export default function CatalogoProductos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoriaId = searchParams.get("categoria");

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarProductos() {
      setCargando(true);
      setError(null);
      try {
        let query = supabase
          .from("productos")
          .select("*")
          .eq("activo", true)
          .order("orden", { ascending: true });

        if (categoriaId != null && Number.isFinite(Number(categoriaId))) {
          query = query.eq("categoria_id", Number(categoriaId));
        }

        const { data, error } = await query;

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
  }, [categoriaId]);

  function alHacerClicCategoria(cat) {
    // Categorías reales de Supabase (id numérico): filtran la grilla de
    // productos en esta misma página. Categorías de ejemplo (slug de texto,
    // sin productos reales todavía): llevan a su página de presentación.
    if (Number.isFinite(Number(cat.id))) {
      const yaActiva = String(categoriaId) === String(cat.id);
      if (yaActiva) {
        setSearchParams({});
      } else {
        setSearchParams({ categoria: cat.id });
      }
    } else {
      navigate(`/categoria/${cat.id}`);
    }
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-extrabold text-ink mb-6">Catálogo</h1>

      <CategoriasGrid onCategoriaClick={alHacerClicCategoria} categoriaActivaId={categoriaId} />

      {cargando && (
        <p className="text-center text-ink-muted text-lg py-16">Cargando catálogo…</p>
      )}

      {!cargando && error && (
        <p className="text-center text-terracota text-lg py-16">
          No se pudo cargar el catálogo: {error}
        </p>
      )}

      {!cargando && !error && productos.length === 0 && (
        <p className="text-center text-ink-muted text-lg py-16">
          Todavía no hay productos {categoriaId ? "en esta categoría" : "cargados"}.
        </p>
      )}

      {!cargando && !error && productos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productos.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </div>
  );
}
