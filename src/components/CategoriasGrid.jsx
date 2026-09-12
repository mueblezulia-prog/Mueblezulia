import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Categorías por defecto que se muestran mientras no haya datos reales en
// Supabase, o si una categoría todavía no tiene imagen cargada desde el
// panel admin. Así la sección nunca se ve vacía o rota.
const CATEGORIAS_PLACEHOLDER = [
  { id: "modulares", nombre: "Modulares" },
  { id: "comedores", nombre: "Comedores" },
  { id: "dormitorios", nombre: "Dormitorios" },
  { id: "mesa-centro", nombre: "Mesa de Centro" },
  { id: "reflejos", nombre: "Colección de Reflejos" },
  { id: "mueble-tv", nombre: "Mueble TV" },
];

export default function CategoriasGrid({ onSeleccionar, categoriaActivaId }) {
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
      <h2 className="text-xl sm:text-2xl font-extrabold text-ink mb-4">
        ¿Cuál te llevas a Casa?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {categorias.map((cat) => {
          const activa = categoriaActivaId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSeleccionar?.(activa ? null : cat.id)}
              className={[
                "relative rounded-card overflow-hidden aspect-[4/3] flex items-end p-3 text-left border transition-colors",
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
