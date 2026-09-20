import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import SectionBanner from "../components/SectionBanner";
import Reveal from "../components/Reveal";
import FiltroEntregaInmediata from "../components/FiltroEntregaInmediata";
import { sonidoNavegar } from "../lib/sonido";

// Solo para el banner (título + ícono) mientras la categoría no tenga
// todavía una fila real en Supabase. En cuanto exista en la tabla
// "categorias" (Panel Admin), el nombre real la reemplaza automáticamente.
// "tinte" alterna dorado/blanco entre categorías, como se pidió.
const BANNERS = {
  modulares: { banner: "Confort Total", icono: "🛋️", tinte: "dorado" },
  comedores: { banner: "El Arte de Compartir", icono: "🍽️", tinte: "blanco" },
  dormitorios: { banner: "Descansa Como Mereces", icono: "🛏️", tinte: "dorado" },
  "mesa-centro": { banner: "El Centro de tu Sala", icono: "🪑", tinte: "blanco" },
  reflejos: { banner: "Detalles que Iluminan", icono: "🪞", tinte: "dorado" },
  "mueble-tv": { banner: "Entretenimiento en Casa", icono: "📺", tinte: "blanco" },
};

export default function CategoriaPagina() {
  const { slug } = useParams();
  const [categoria, setCategoria] = useState(null);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [subActiva, setSubActiva] = useState("todas");
  const [soloEntrega, setSoloEntrega] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);
      setSubActiva("todas");

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
        .select("*, producto_etiquetas(etiquetas(*))")
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

  const bannerInfo = BANNERS[slug] ?? { banner: categoria?.nombre ?? "Catálogo", icono: "🪑", tinte: "dorado" };
  const nombreCategoria = categoria?.nombre ?? bannerInfo.banner;
  const subcategorias = categoria?.subcategorias ?? [];
  const productosFiltrados =
    subActiva === "todas" ? productos : productos.filter((p) => p.subcategoria === subActiva);
  // El interruptor de "Entrega Inmediata" ORDENA, no oculta: los
  // disponibles pasan primero y el resto queda atrás, al final de la
  // grilla, para que el cliente los siga viendo si baja.
  const productosOrdenados = soloEntrega
    ? [...productosFiltrados].sort(
        (a, b) => Number(b.disponible_entrega ?? true) - Number(a.disponible_entrega ?? true)
      )
    : productosFiltrados;

  return (
    <div className="py-6">
      <div className="px-4 max-w-5xl mx-auto">
        <Link
          to="/catalogo"
          className="min-h-tap inline-flex items-center gap-2 text-ink-muted hover:text-ink text-base font-bold mb-4 transition-colors"
        >
          ← Volver al Catálogo
        </Link>
      </div>

      <div className="mb-6">
        <SectionBanner
          titulo={bannerInfo.banner}
          icono={bannerInfo.icono}
          imagenFondo="/assets/interior-tienda.jpg"
          tinte={bannerInfo.tinte}
        />
      </div>

      <div className="px-4 max-w-5xl mx-auto">
      {cargando && (
        <p className="text-center text-ink-muted text-lg py-16">Cargando…</p>
      )}

      {!cargando && error && (
        <p className="text-center text-terracota text-lg py-16">
          No se pudo cargar: {error}
        </p>
      )}

      {!cargando && !error && productos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {subcategorias.length > 0 && (
            <>
              <PestanaSub activa={subActiva === "todas"} onClick={() => { setSubActiva("todas"); sonidoNavegar(); }}>
                Todas
              </PestanaSub>
              {subcategorias.map((s) => (
                <PestanaSub key={s} activa={subActiva === s} onClick={() => { setSubActiva(s); sonidoNavegar(); }}>
                  {s}
                </PestanaSub>
              ))}
            </>
          )}
          <FiltroEntregaInmediata
            activo={soloEntrega}
            onClick={() => { setSoloEntrega((v) => !v); sonidoNavegar(); }}
            className="ml-auto"
          />
        </div>
      )}

      {!cargando && !error && productos.length === 0 && (
        <p className="text-center text-ink-muted text-lg py-16">
          Todavía no hay productos de {nombreCategoria} cargados — pronto agregamos piezas de esta línea.
        </p>
      )}

      {!cargando && !error && productos.length > 0 && productosFiltrados.length === 0 && (
        <p className="text-center text-ink-muted text-lg py-16">
          Todavía no hay productos en "{subActiva}".
        </p>
      )}

      {!cargando && !error && productosFiltrados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {productosOrdenados.map((producto, i) => (
            <Reveal key={producto.id} delay={(i % 9) * 60}>
              <ProductCard producto={producto} />
            </Reveal>
          ))}
        </div>
      )}

      <div className="text-center mt-8">
        <Link
          to="/catalogo"
          onClick={sonidoNavegar}
          className="min-h-tap inline-flex items-center justify-center px-6 rounded-control glass-gold text-ink font-bold
                     hover:bg-gold/25 active:scale-[0.98] transition-all duration-200"
        >
          Ver Catálogo Completo
        </Link>
      </div>
      </div>
    </div>
  );
}

/** Pestaña tipo píldora para filtrar por subcategoría (estilo "Folders / Files / Users"). */
function PestanaSub({ activa, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-tap px-4 rounded-full text-sm font-bold transition-all duration-200",
        activa
          ? "bg-gold text-carbon shadow-sm shadow-black/20"
          : "bg-carbon-light border border-carbon-border text-ink-muted hover:text-ink hover:border-gold/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
