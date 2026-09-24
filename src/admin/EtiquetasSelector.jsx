import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Selector de etiquetas personalizadas para un producto — se eligen de
 * un catálogo compartido (tabla `etiquetas`, administrado en
 * /admin/etiquetas), igual que las telas. Un producto puede tener
 * tantas etiquetas como quiera, además de "Disponible en todas las
 * telas" y "El color de tu preferencia" que son un caso especial fijo.
 */
export default function EtiquetasSelector({ seleccionadas, onChange }) {
  const [etiquetas, setEtiquetas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase
      .from("etiquetas")
      .select("*")
      .order("orden")
      .then(({ data, error }) => {
        if (!error && data) setEtiquetas(data);
        setCargando(false);
      });
  }, []);

  function alternar(id) {
    if (seleccionadas.includes(id)) {
      onChange(seleccionadas.filter((x) => x !== id));
    } else {
      onChange([...seleccionadas, id]);
    }
  }

  if (cargando) return null;

  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-carbon-border">
      <span className="text-lg font-bold text-ink">Etiquetas para este mueble</span>
      <p className="text-sm text-ink-muted -mt-1">
        Además de las de arriba, agrega las que quieras (envío, promociones, lo que sea).{" "}
        <a href="/admin/etiquetas" target="_blank" rel="noopener" className="text-gold underline">Crear/editar etiquetas →</a>
      </p>

      {etiquetas.length === 0 && (
        <p className="text-ink-muted text-base">
          Todavía no hay etiquetas creadas.{" "}
          <a href="/admin/etiquetas" target="_blank" rel="noopener" className="text-gold underline">Crea la primera aquí</a>.
        </p>
      )}

      {etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {etiquetas.map((etiqueta) => {
            const activa = seleccionadas.includes(etiqueta.id);
            const esImagen = etiqueta.icono?.startsWith("/") || etiqueta.icono?.startsWith("http");
            return (
              <button
                key={etiqueta.id}
                type="button"
                onClick={() => alternar(etiqueta.id)}
                aria-pressed={activa}
                className={[
                  "flex items-center gap-2 rounded-control border-2 px-3 py-2 min-h-tap transition-colors duration-150",
                  activa ? "border-gold bg-gold/10" : "border-carbon-border bg-transparent hover:border-carbon-border/60",
                ].join(" ")}
              >
                <span className="w-5 h-5 flex items-center justify-center text-lg shrink-0">
                  {esImagen ? <img src={etiqueta.icono} alt="" className="w-full h-full object-contain" /> : etiqueta.icono}
                </span>
                <span className="text-base text-ink">{etiqueta.nombre}</span>
                {activa && <span className="text-gold font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
