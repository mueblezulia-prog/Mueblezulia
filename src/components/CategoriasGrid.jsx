import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Categorías por defecto que se muestran mientras no haya datos reales en
// Supabase, o si una categoría todavía no tiene imagen cargada desde el
// panel admin. Cada una tiene su propia página dedicada en /categoria/:slug
// (ver src/pages/CategoriaPagina.jsx), así que sí son "clicables" incluso
// sin id numérico real — solo se comportan distinto al filtro por id.
const CATEGORIAS_PLACEHOLDER = [
  { id: "modulares", nombre: "Modulares", imagen: "/assets/categorias/modulares.jpg" },
  { id: "comedores", nombre: "Comedores", imagen: "/assets/categorias/comedores.jpg" },
  { id: "dormitorios", nombre: "Dormitorios", imagen: "/assets/categorias/dormitorios.jpg" },
  { id: "mesa-centro", nombre: "Mesa de Centro", imagen: "/assets/categorias/mesa-centro.jpg" },
  { id: "reflejos", nombre: "Colección de Reflejos", imagen: "/assets/categorias/reflejos.jpg" },
  { id: "mueble-tv", nombre: "Mueble TV", imagen: "/assets/categorias/mueble-tv.jpg" },
];

/**
 * Grilla de categorías reutilizable.
 * `onCategoriaClick(cat)` recibe el objeto categoría completo ({id, nombre,
 * imagen}) — cada página decide qué hacer al hacer clic (ir a una página
 * dedicada, filtrar in-place, etc.), esta grilla no asume nada de eso.
 */
export default function CategoriasGrid({ onCategoriaClick, categoriaActivaId, titulo = "¿Cuál te llevas a Casa?" }) {
  const [categorias, setCategorias] = useState(CATEGORIAS_PLACEHOLDER);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre, imagen")
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
      <h2 className="text-xl sm:text-2xl font-extrabold text-ink mb-4">{titulo}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {categorias.map((cat) => {
          // Comparación como texto: categoriaActivaId puede venir de la URL
          // (siempre string) mientras que cat.id puede ser number desde Supabase.
          const activa = categoriaActivaId != null && String(categoriaActivaId) === String(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onCategoriaClick?.(cat)}
              className={[
                "relative rounded-card overflow-hidden aspect-[4/3] flex items-end p-3 text-left border transition-colors cursor-pointer",
                activa
                  ? "border-gold ring-2 ring-gold"
                  : "border-carbon-border hover:border-ink-muted",
              ].join(" ")}
              style={
                cat.imagen
                  ? { backgroundImage: `url(${cat.imagen})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { backgroundColor: "#2A2A2A" }
              }
            >
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <span className="relative text-ink font-bold text-sm sm:text-base leading-tight">
                {cat.nombre}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
