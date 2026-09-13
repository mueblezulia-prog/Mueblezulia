import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";

// Solo para el banner (título + ícono) mientras la categoría no tenga
// todavía una fila real en Supabase. En cuanto exista en la tabla
// "categorias" (Panel Admin), el nombre real la reemplaza automáticamente.
const BANNERS = {
  modulares: { banner: "Confort Total", icono: "🛋️" },
  comedores: { banner: "El Arte de Compartir", icono: "🍽️" },
  dormitorios: { banner: "Descansa Como Mereces", icono: "🛏️" },
  "mesa-centro": { banner: "El Centro de tu Sala", icono: "🪑" },
  reflejos: { banner: "Detalles que Iluminan", icono: "🪞" },
  "mueble-tv": { banner: "Entretenimiento en Casa", icono: "📺" },
};

export default function CategoriaPagina() {
  const { slug } = useParams();
  const [categoria, setCategoria] = useState(null);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);

      const { data: categoriaData, error: errorCategoria } = await supabase
        .from("categorias")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!activo) return;

      if (errorCategoria) {
        setError(errorCategoria.message);
        setCargando(false);
        return;
      }
      setCategoria(categoriaData);

      // Todavía no existe esta categoría en Supabase (falta crearla desde
      // el Panel Admin) — no hay cómo saber qué productos son de esta
      // línea, así que se muestra la página vacía en vez de adivinar.
      if (!categoriaData) {
        setProductos([]);
        setCargando(false);
        return;
      }

      const { data: productosData, error: errorProductos } = await supabase
        .from("productos")
        .select("*")
        .eq("categoria_id", categoriaData.id)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (!activo) return;
      if (errorProductos) {
        setError(errorProductos.message);
      } else {
        setProductos(productosData ?? []);
      }
      setCargando(false);
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [slug]);

  const bannerInfo = BANNERS[slug] ?? { banner: categoria?.nombre ?? "Catálogo", icono: "🪑" };
  const nombreCategoria = categoria?.nombre ?? bannerInfo.banner;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <Link
        to="/catalogo"
        className="min-h-tap inline-flex items-center gap-2 text-ink-muted hover:text-ink text-base font-bold mb-4 transition-colors"
      >
        ← Volver al Catálogo
      </Link>

      <div className="relative rounded-card overflow-hidden mb-6 py-6 px-4 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[3px]"
          style={{ backgroundImage: "url(/assets/interior-tienda.jpg)" }}
        />
        <div className="absolute inset-0 bg-carbon/50" />
        <div className="relative glass-gold text-ink rounded-control px-5 py-3 flex items-center gap-3">
          <span className="text-3xl leading-none">{bannerInfo.icono}</span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{bannerInfo.banner}</h1>
        </div>
      </div>

      {cargando && (
        <p className="text-center text-ink-muted text-lg py-16">Cargando…</p>
      )}

      {!cargando && error && (
        <p className="text-center text-terracota text-lg py-16">
          No se pudo cargar: {error}
        </p>
      )}

      {!cargando && !error && productos.length === 0 && (
        <p className="text-center text-ink-muted text-lg py-16">
          Todavía no hay productos de {nombreCategoria} cargados — pronto agregamos piezas de esta línea.
        </p>
      )}

      {!cargando && !error && productos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {productos.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}

      <div className="text-center mt-8">
        <Link
          to="/catalogo"
          className="min-h-tap inline-flex items-center justify-center px-6 rounded-control glass-gold text-ink font-bold
                     hover:bg-gold/25 active:scale-[0.98] transition-all duration-200"
        >
          Ver Catálogo Completo
        </Link>
      </div>
    </div>
  );
}
