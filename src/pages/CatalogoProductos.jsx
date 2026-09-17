import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import CategoriasGrid from "../components/CategoriasGrid";
import Reveal from "../components/Reveal";

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
          .select("*, producto_etiquetas(etiquetas(*))")
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
    <div className="relative min-h-screen">
      {/* Fondo de toda la página de Catálogo: la foto de la tienda,
          difuminada y con un velo blanco translúcido encima (efecto
          vidrio "esmerilado"), fija detrás de categorías y productos. */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center blur-md scale-110"
        style={{ backgroundImage: "url(/assets/interior-tienda.jpg)" }}
      />
      <div className="fixed inset-0 -z-10 bg-white/10" />
      <div className="fixed inset-0 -z-10 bg-carbon/70" />

      <div className="relative px-4 py-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-ink mb-1 drop-shadow">Catálogo</h1>
        <p className="text-ink-muted mb-6">Explora todas nuestras líneas de muebles.</p>

        <CategoriasGrid />

        <div className="relative rounded-card overflow-hidden border-t border-white/10 mt-2">
          {/* A diferencia del fondo de la página (una sola foto estirada
              y difuminada), aquí la textura se REPITE en mosaico detrás
              de un panel de vidrio — para que se sienta como una
              superficie, no como una foto de fondo. */}
          <div
            className="absolute inset-0 -z-10"
            style={{ backgroundImage: "url(/assets/textura-vidrio.jpg)", backgroundRepeat: "repeat", backgroundSize: "96px 96px" }}
          />
          <div className="absolute inset-0 -z-10 glass-dark" />

          <div className="relative px-4 py-6">
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
                {productos.map((producto, i) => (
                  <Reveal key={producto.id} delay={(i % 8) * 60}>
                    <ProductCard producto={producto} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
