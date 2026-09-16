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
export default function SelectorTelas({ seleccionadas, onChange, disponibleTodasTelas, onCambiarTodasTelas, colorAEleccion, onCambiarColorEleccion }) {
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
      <span className="text-lg font-bold text-ink">Telas disponibles para este mueble</span>
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
                  "flex items-center gap-2 rounded-control border-2 px-3 py-2 min-h-tap transition-colors duration-150",
                  activa ? "border-gold bg-carbon-light" : "border-carbon-border bg-transparent hover:border-carbon-border/60",
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

      {/* Etiquetas especiales — no son telas del catálogo, son avisos
          para el cliente. Se muestran como insignia dorada en la tarjeta
          y el detalle del producto cuando están activadas. */}
      <div className="flex flex-col gap-2 pt-2 border-t border-carbon-border">
        <EtiquetaEspecial
          icono="🌈"
          titulo="Disponible en todas las telas"
          ayuda="El cliente puede pedir cualquier tela del catálogo, no solo las marcadas arriba."
          activa={disponibleTodasTelas}
          onClick={() => onCambiarTodasTelas(!disponibleTodasTelas)}
        />
        <EtiquetaEspecial
          icono="🎨"
          titulo="El color de tu preferencia"
          ayuda="Se confecciona en el color o tela que pida el cliente, fuera del catálogo."
          activa={colorAEleccion}
          onClick={() => onCambiarColorEleccion(!colorAEleccion)}
        />
      </div>
    </div>
  );
}

function EtiquetaEspecial({ icono, titulo, ayuda, activa, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={[
        "flex items-center gap-3 rounded-control border-2 px-3 py-2 min-h-tap text-left transition-all duration-150",
        activa ? "border-gold bg-gold/10" : "border-carbon-border bg-transparent hover:border-carbon-border/60",
      ].join(" ")}
    >
      <span className="text-xl shrink-0">{icono}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-ink">{titulo}</span>
        <span className="block text-xs text-ink-muted">{ayuda}</span>
      </span>
      <span
        className={[
          "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-[11px] font-bold",
          activa ? "border-gold bg-gold text-carbon" : "border-carbon-border text-transparent",
        ].join(" ")}
      >
        ✓
      </span>
    </button>
  );
}
