import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import SectionBanner from "./SectionBanner";
import Reveal from "./Reveal";
import { sonidoNavegar } from "../lib/sonido";

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
  // null = cargando. Antes arrancaba mostrando las categorías de ejemplo y
  // luego las cambiaba por las reales (se veía un "salto" raro al entrar).
  const [categorias, setCategorias] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre, imagen, slug, imagen_pos_x, imagen_pos_y")
        .order("orden", { ascending: true });
      if (!activo) return;
      // Si aún no has cargado categorías reales en Supabase, se mantienen
      // los placeholders de arriba en vez de mostrar una sección vacía.
      setCategorias(!error && data && data.length > 0 ? data : CATEGORIAS_PLACEHOLDER);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="mb-8">
      {/* Encabezado de borde a borde, con foto real de la sala de
          exhibición de fondo (difuminada, efecto gaussiano). */}
      <div className="mb-4">
        <SectionBanner titulo={titulo} imagenFondo="/assets/interior-tienda.jpg" tinte="dorado" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {categorias === null &&
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="esqueleto aspect-[4/3]" />)}
        {(categorias ?? []).map((cat, i) => (
          <Reveal key={cat.id} delay={(i % 6) * 60}>
            <Link
              to={`/categoria/${cat.slug}`}
              onClick={sonidoNavegar}
              aria-label={cat.nombre}
              className="group relative rounded-card overflow-hidden aspect-[4/3] flex items-end text-left w-full
                         border border-carbon-border shadow-sm
                         hover:border-gold/60 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5
                         transition-all duration-300 ease-out"
              style={!cat.imagen ? { backgroundColor: "#2A2A2A" } : undefined}
            >
              {cat.imagen && (
                <span
                  className="absolute inset-0 bg-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${cat.imagen})`,
                    backgroundPosition: `${cat.imagen_pos_x ?? 50}% ${cat.imagen_pos_y ?? 50}%`,
                  }}
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {/* Etiqueta en barra completa (de borde a borde), no en pastilla
                  flotante — el vidrio cubre todo el ancho de la tarjeta. */}
              <span className="relative w-full glass text-ink font-bold text-sm sm:text-base leading-tight px-3 py-2 group-hover:text-gold transition-colors duration-200">
                {cat.nombre}
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
