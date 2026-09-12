import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Categorías por defecto que se muestran mientras no haya datos reales en
// Supabase, o si una categoría todavía no tiene imagen cargada desde el
// panel admin. Se marcan como "placeholder": true porque no tienen un id
// numérico real de la base de datos, así que no se usan para filtrar
// (evita el error "invalid input syntax for type integer").
const CATEGORIAS_PLACEHOLDER = [
  { id: "modulares", nombre: "Modulares", placeholder: true },
  { id: "comedores", nombre: "Comedores", placeholder: true },
  { id: "dormitorios", nombre: "Dormitorios", placeholder: true },
  { id: "mesa-centro", nombre: "Mesa de Centro", placeholder: true },
  { id: "reflejos", nombre: "Colección de Reflejos", placeholder: true },
  { id: "mueble-tv", nombre: "Mueble TV", placeholder: true },
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
              onClick={() => !cat.placeholder && onSeleccionar?.(activa ? null : cat.id)}
              title={cat.placeholder ? "Agrega esta categoría en el Panel Admin para poder filtrar por ella" : undefined}
              className={[
                "relative rounded-card overflow-hidden aspect-[4/3] flex items-end p-3 text-left border transition-colors",
                activa
                  ? "border-gold ring-2 ring-gold"
                  : "border-carbon-border hover:border-ink-muted",
                cat.placeholder ? "cursor-default" : "cursor-pointer",
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
