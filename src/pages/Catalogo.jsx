import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import CategoriasGrid from "../components/CategoriasGrid";
import Hero from "../components/Hero";

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [categoriaId, setCategoriaId] = useState(null);

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

  function handleComprar(producto) {
    // Fase 1: placeholder — se conecta al flujo de carrito/checkout existente
    console.log("Comprar ahora:", producto.id);
  }

  function handleCompraPersonalizada(producto) {
    // Fase 1: placeholder — abre WhatsApp o un formulario de personalización
    console.log("Compra personalizada:", producto.id);
  }

  return (
    <div>
      <Hero />

      <div id="catalogo" className="px-4 py-6 max-w-6xl mx-auto scroll-mt-16">
        <CategoriasGrid onSeleccionar={setCategoriaId} categoriaActivaId={categoriaId} />

      <h1 className="text-3xl font-extrabold text-ink mb-6">Catálogo</h1>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {productos.map((producto) => (
            <ProductCard
              key={producto.id}
              producto={producto}
              onComprar={handleComprar}
              onCompraPersonalizada={handleCompraPersonalizada}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
