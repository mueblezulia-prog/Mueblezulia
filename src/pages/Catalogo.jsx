import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarProductos() {
      setCargando(true);
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
      setCargando(false);
    }

    cargarProductos();
    return () => {
      activo = false;
    };
  }, []);

  function handleComprar(producto) {
    // Fase 1: placeholder — se conecta al flujo de carrito/checkout existente
    console.log("Comprar ahora:", producto.id);
  }

  function handleCompraPersonalizada(producto) {
    // Fase 1: placeholder — abre WhatsApp o un formulario de personalización
    console.log("Compra personalizada:", producto.id);
  }

  if (cargando) {
    return (
      <p className="text-center text-ink-muted text-lg py-16">Cargando catálogo…</p>
    );
  }

  if (error) {
    return (
      <p className="text-center text-terracota text-lg py-16">
        No se pudo cargar el catálogo: {error}
      </p>
    );
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-extrabold text-ink mb-6">Catálogo</h1>
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
    </div>
  );
}
