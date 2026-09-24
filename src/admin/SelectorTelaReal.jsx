import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Elige LA tela real de este mueble en específico (la que trae puesta en
 * la foto): primero la familia, después el color de esa familia. Es
 * opcional — "Ninguna" la deja sin asignar.
 *
 * Distinto de <SelectorTelas> (la lista de "colores disponibles" para que
 * el cliente elija) — ambos conviven. Cuando acá se elige un color, se
 * avisa al padre (onTambienAgregarDisponible) para que también se marque
 * automáticamente en esa otra lista, sin duplicar el trabajo.
 */
export default function SelectorTelaReal({ telaColorId, onChange, onTambienAgregarDisponible }) {
  const [familias, setFamilias] = useState([]);
  const [telas, setTelas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const telaActual = telas.find((t) => t.id === telaColorId) ?? null;
  const [familiaAbierta, setFamiliaAbierta] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("telas_familias").select("*").order("orden"),
      supabase.from("telas").select("*").order("orden"),
    ]).then(([{ data: familiasData }, { data: telasData }]) => {
      setFamilias(familiasData ?? []);
      setTelas(telasData ?? []);
      setCargando(false);
    });
  }, []);

  // Al editar un mueble que ya tiene tela real, abrir directamente su familia.
  useEffect(() => {
    if (telaActual?.familia_id) setFamiliaAbierta(telaActual.familia_id);
  }, [telaActual?.familia_id]);

  function elegirColor(tela) {
    onChange(tela.id);
    onTambienAgregarDisponible?.(tela.id);
  }

  const coloresDeLaFamilia = telas.filter((t) => t.familia_id === familiaAbierta);

  return (
    <div className="flex flex-col gap-3 bg-carbon-light border border-carbon-border rounded-card p-4">
      <div>
        <span className="text-lg font-bold text-ink flex items-center gap-2">
          🧵 Tela real de este mueble
        </span>
        <p className="text-sm text-ink-muted mt-1">
          La tela y color que trae puesto ESTE mueble en la foto. Es opcional — si no eliges ninguna, queda sin asignar.
        </p>
      </div>

      {cargando && <p className="text-ink-muted text-base">Cargando…</p>}

      {!cargando && (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Paso 1 · Familia</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setFamiliaAbierta(null);
                  onChange(null);
                }}
                className={[
                  "min-h-tap px-4 rounded-full border-2 text-sm font-bold transition-colors",
                  !telaColorId ? "border-carbon-border border-dashed text-ink-muted bg-carbon" : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
                ].join(" ")}
              >
                ✕ Ninguna
              </button>
              {familias.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFamiliaAbierta(f.id)}
                  className={[
                    "min-h-tap px-4 rounded-full border-2 text-sm font-bold transition-colors",
                    familiaAbierta === f.id ? "border-gold bg-carbon text-ink" : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
                  ].join(" ")}
                >
                  {f.nombre}
                </button>
              ))}
              {familias.length === 0 && (
                <span className="text-sm text-ink-muted">
                  Todavía no hay familias de tela. Crea la primera en{" "}
                  <a href="/admin/telas" target="_blank" rel="noopener" className="text-gold underline">Administrar telas →</a>
                </span>
              )}
            </div>
          </div>

          {familiaAbierta && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                Paso 2 · Color de "{familias.find((f) => f.id === familiaAbierta)?.nombre}"
              </span>
              <div className="flex flex-wrap gap-2">
                {coloresDeLaFamilia.map((tela) => {
                  const activo = telaColorId === tela.id;
                  return (
                    <button
                      key={tela.id}
                      type="button"
                      onClick={() => elegirColor(tela)}
                      className={[
                        "flex items-center gap-2 rounded-full border-2 pl-2 pr-3 py-1.5 min-h-tap transition-colors",
                        activo ? "border-gold bg-carbon" : "border-carbon-border bg-transparent hover:border-carbon-border/60",
                      ].join(" ")}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-carbon-border shrink-0 bg-cover bg-center"
                        style={tela.imagen ? { backgroundImage: `url(${tela.imagen})` } : { backgroundColor: tela.hex }}
                      />
                      <span className="text-sm text-ink font-semibold">{tela.nombre}</span>
                      {activo && <span className="text-gold font-bold">✓</span>}
                    </button>
                  );
                })}
                {coloresDeLaFamilia.length === 0 && (
                  <span className="text-sm text-ink-muted">Esta familia todavía no tiene colores cargados.</span>
                )}
              </div>
            </div>
          )}

          {telaColorId && telaActual && (
            <p className="text-xs text-green-400/80 bg-green-500/10 border border-green-400/30 rounded-control px-3 py-2">
              ✓ "{telaActual.nombre}" se agrega automáticamente a "Telas disponibles para este mueble" de abajo.
            </p>
          )}
        </>
      )}
    </div>
  );
}
