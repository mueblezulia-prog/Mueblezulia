import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// Categorías por defecto que se muestran mientras no haya datos reales en
// Supabase, o si una categoría todavía no tiene imagen cargada desde el
// panel admin. Cada una tiene su propia página dedicada en /categoria/:slug
// (ver src/pages/CategoriaPagina.jsx).
const CATEGORIAS_PLACEHOLDER = [
  { id: "modulares", slug: "modulares", nombre: "Modulares", imagen: "/assets/categorias/modulares.jpg" },
  { id: "comedores", slug: "comedores", nombre: "Comedores", imagen: "/assets/categorias/comedores.jpg" },
  { id: "dormitorios", slug: "dormitorios", nombre: "Dormitorios", imagen: "/assets/categorias/dormitorios.jpg" },
  { id: "mesa-centro", slug: "mesa-centro", nombre: "Mesa de Centro", imagen: "/assets/categorias/mesa-centro.jpg" },
  { id: "reflejos", slug: "reflejos", nombre: "Colección de Reflejos", imagen: "/assets/categorias/reflejos.jpg" },
  { id: "mueble-tv", slug: "mueble-tv", nombre: "Mueble TV", imagen: "/assets/categorias/mueble-tv.jpg" },
];

/**
 * Grilla de categorías reutilizable. Cada tarjeta es un link directo a su
 * página dedicada /categoria/:slug — no hay filtrado "en la misma página"
 * en ningún lado, así todas las entradas (Home, Catálogo) se comportan
 * igual y siempre aterrizan en la categoría correcta.
 */
export default function CategoriasGrid({ titulo = "¿Cuál te llevas a Casa?" }) {
  const [categorias, setCategorias] = useState(CATEGORIAS_PLACEHOLDER);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre, imagen, slug")
        .order("orden", { ascending: true });
      if (!activo) return;
      // Si aún no has cargado categorías reales en Supabase, se mantienen
      // los placeholders de arriba en vez de mostrar una sección vacía.
      if (!error && data && data.length > 0) setCategorias(data);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="mb-8">
      {/* Encabezado con foto real de la tienda de fondo (difuminada) —
          ahora TODO el cuadro es vidrio dorado (no solo el texto), para
          que la foto se sienta "detrás del vidrio" en toda su superficie. */}
      <div className="relative rounded-card overflow-hidden mb-4 py-8 px-4 flex items-center justify-center min-h-[110px]">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[3px]"
          style={{ backgroundImage: "url(/assets/interior-tienda.jpg)" }}
        />
        <div className="absolute inset-0 glass-gold" />
        <h2 className="relative text-ink font-extrabold text-xl sm:text-2xl text-center drop-shadow-md">
          {titulo}
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {categorias.map((cat) => (
          <Link
            key={cat.id}
            to={`/categoria/${cat.slug}`}
            className="group relative rounded-card overflow-hidden aspect-[4/3] flex items-end text-left
                       border border-carbon-border shadow-sm
                       hover:border-gold/60 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5
                       transition-all duration-300 ease-out"
            style={!cat.imagen ? { backgroundColor: "#2A2A2A" } : undefined}
          >
            {cat.imagen && (
              <span
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
                style={{ backgroundImage: `url(${cat.imagen})` }}
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {/* Etiqueta en barra completa (de borde a borde), no en pastilla
                flotante — el vidrio cubre todo el ancho de la tarjeta. */}
            <span className="relative w-full glass text-ink font-bold text-sm sm:text-base leading-tight px-3 py-2 group-hover:text-gold transition-colors duration-200">
              {cat.nombre}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
