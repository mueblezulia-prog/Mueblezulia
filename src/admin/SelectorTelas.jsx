import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Selector de telas/colores para un producto — a diferencia de la versión
 * anterior, las telas NO se escriben a mano por producto: se eligen de un
 * catálogo compartido (tabla `telas`, administrado en /admin/telas), así
 * el mismo set de opciones está disponible para cualquier mueble.
 *
 * `seleccionadas`: array de ids de `telas` que aplican a este producto.
 * `onChange(idsSeleccionados)` — el padre guarda esos ids en
 * `producto_colores` (columna `tela_id`) al presionar "Guardar".
 */
export default function SelectorTelas({ seleccionadas, onChange }) {
  const [telas, setTelas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase
      .from("telas")
      .select("*")
      .order("orden")
      .then(({ data, error }) => {
        if (!error && data) setTelas(data);
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

  return (
    <div className="flex flex-col gap-3">
      <span className="text-lg font-bold text-ink flex items-center gap-2">
        <img src="/assets/icons/tela.png" alt="" className="w-5 h-5" />
        Telas disponibles para este mueble
      </span>
      <p className="text-sm text-ink-muted">
        Elige cuáles telas del catálogo puede escoger el cliente para este producto.{" "}
        <a href="/admin/telas" className="text-gold underline">Administrar catálogo de telas →</a>
      </p>

      {cargando && <p className="text-ink-muted text-base">Cargando…</p>}

      {!cargando && telas.length === 0 && (
        <p className="text-ink-muted text-base">
          Todavía no hay telas en el catálogo.{" "}
          <a href="/admin/telas" className="text-gold underline">Crea la primera aquí</a>.
        </p>
      )}

      {!cargando && telas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {telas.map((tela) => {
            const activa = seleccionadas.includes(tela.id);
            return (
              <button
                key={tela.id}
                type="button"
                onClick={() => alternar(tela.id)}
                aria-pressed={activa}
                className={[
                  "flex items-center gap-2 rounded-control border-2 px-3 py-2 min-h-tap",
                  activa ? "border-gold bg-carbon-light" : "border-carbon-border bg-transparent",
                ].join(" ")}
              >
                <span
                  className="w-6 h-6 rounded-full border border-carbon-border shrink-0"
                  style={{ backgroundColor: tela.hex }}
                />
                <span className="text-base text-ink">{tela.nombre}</span>
                {activa && <span className="text-gold font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
