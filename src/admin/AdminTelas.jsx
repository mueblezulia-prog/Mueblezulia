import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Catálogo global de telas, en dos niveles:
 *
 *   Familia de tela (telas_familias) — ej. "Terciopelo Premium"
 *     └─ Colores de esa familia (telas, con familia_id) — ej. Gris Perla
 *
 * Cada color se sigue administrando exactamente igual que antes (nombre +
 * hex, guardar, borrar) — lo único que cambia es que ahora vive dentro de
 * una familia en vez de suelto. Los colores creados ANTES de esta versión
 * (familia_id = null) aparecen en "Sin familia" para asignarles una sin
 * perder nada.
 *
 * Requiere haber corrido supabase/fase_1_10_familias_tela.sql.
 */
export default function AdminTelas() {
  const [familias, setFamilias] = useState([]);
  const [telas, setTelas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);

  const [nuevaFamiliaNombre, setNuevaFamiliaNombre] = useState("");
  const [creandoFamilia, setCreandoFamilia] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    const [{ data: familiasData, error: errorFamilias }, { data: telasData, error: errorTelas }] =
      await Promise.all([
        supabase.from("telas_familias").select("*").order("orden"),
        supabase.from("telas").select("*").order("orden"),
      ]);
    if (errorFamilias || errorTelas) {
      setError((errorFamilias ?? errorTelas).message);
    } else {
      setFamilias(familiasData ?? []);
      setTelas(telasData ?? []);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizarLocal(id, cambios) {
    setTelas((actual) => actual.map((t) => (t.id === id ? { ...t, ...cambios } : t)));
  }

  async function guardarFila(tela) {
    setGuardandoId(tela.id);
    const { error } = await supabase
      .from("telas")
      .update({ nombre: tela.nombre, hex: tela.hex })
      .eq("id", tela.id);
    setGuardandoId(null);
    if (error) alert(`No se pudo guardar: ${error.message}`);
  }

  async function borrarColor(tela) {
    const confirmado = window.confirm(
      `¿Borrar el color "${tela.nombre}"? Se quitará de todos los productos que lo tengan.`
    );
    if (!confirmado) return;
    const { error } = await supabase.from("telas").delete().eq("id", tela.id);
    if (error) {
      alert(`No se pudo borrar: ${error.message}`);
      return;
    }
    setTelas((actual) => actual.filter((t) => t.id !== tela.id));
  }

  async function agregarColor(familiaId) {
    const nombre = window.prompt("Nombre del nuevo color (ej: Gris Perla):");
    if (!nombre || !nombre.trim()) return;
    const colorEnFamilia = telas.filter((t) => t.familia_id === familiaId).length;
    const { data, error } = await supabase
      .from("telas")
      .insert({ nombre: nombre.trim(), hex: "#F2B90C", orden: colorEnFamilia, familia_id: familiaId })
      .select()
      .single();
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    setTelas((actual) => [...actual, data]);
  }

  async function asignarFamilia(telaId, familiaId) {
    const { error } = await supabase
      .from("telas")
      .update({ familia_id: familiaId || null })
      .eq("id", telaId);
    if (error) {
      alert(`No se pudo asignar: ${error.message}`);
      return;
    }
    actualizarLocal(telaId, { familia_id: familiaId || null });
  }

  async function crearFamilia(e) {
    e.preventDefault();
    if (!nuevaFamiliaNombre.trim()) return;
    setCreandoFamilia(true);
    const { data, error } = await supabase
      .from("telas_familias")
      .insert({ nombre: nuevaFamiliaNombre.trim(), orden: familias.length })
      .select()
      .single();
    setCreandoFamilia(false);
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    setFamilias((actual) => [...actual, data]);
    setNuevaFamiliaNombre("");
  }

  async function guardarFamilia(familia) {
    const { error } = await supabase
      .from("telas_familias")
      .update({ nombre: familia.nombre, descripcion: familia.descripcion })
      .eq("id", familia.id);
    if (error) alert(`No se pudo guardar: ${error.message}`);
  }

  function actualizarFamiliaLocal(id, cambios) {
    setFamilias((actual) => actual.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  async function borrarFamilia(familia) {
    const coloresDeEstaFamilia = telas.filter((t) => t.familia_id === familia.id);
    let advertencia = `¿Borrar la familia "${familia.nombre}"?`;
    if (coloresDeEstaFamilia.length > 0) {
      advertencia += ` Tiene ${coloresDeEstaFamilia.length} color(es) — también se van a borrar, y se quitarán de cualquier mueble que los tenga.`;
    }
    if (!window.confirm(advertencia)) return;

    if (coloresDeEstaFamilia.length > 0) {
      const { error: errorColores } = await supabase
        .from("telas")
        .delete()
        .in("id", coloresDeEstaFamilia.map((t) => t.id));
      if (errorColores) {
        alert(`No se pudo borrar: ${errorColores.message}`);
        return;
      }
    }
    const { error } = await supabase.from("telas_familias").delete().eq("id", familia.id);
    if (error) {
      alert(`No se pudo borrar la familia: ${error.message}`);
      return;
    }
    setTelas((actual) => actual.filter((t) => t.familia_id !== familia.id));
    setFamilias((actual) => actual.filter((f) => f.id !== familia.id));
  }

  const telasSinFamilia = telas.filter((t) => !t.familia_id);

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <img src="/assets/icons/tela.png" alt="" className="w-6 h-6" />
          Telas
        </h1>
        <p className="text-ink-muted text-base mt-1">
          Familias de tela y sus colores. Crea cada una aquí una sola vez, y luego elige cuál trae puesta cada mueble desde su formulario.
        </p>
      </div>

      {cargando && <p className="text-ink-muted text-lg">Cargando…</p>}
      {error && <p className="text-terracota text-lg">Error: {error}</p>}

      {!cargando && !error && (
        <div className="flex flex-col gap-4">
          {familias.map((familia) => (
            <FamiliaCard
              key={familia.id}
              familia={familia}
              colores={telas.filter((t) => t.familia_id === familia.id)}
              guardandoId={guardandoId}
              onCambiarFamilia={(cambios) => actualizarFamiliaLocal(familia.id, cambios)}
              onGuardarFamilia={() => guardarFamilia(familia)}
              onBorrarFamilia={() => borrarFamilia(familia)}
              onCambiarColor={actualizarLocal}
              onGuardarColor={guardarFila}
              onBorrarColor={borrarColor}
              onAgregarColor={() => agregarColor(familia.id)}
            />
          ))}

          {familias.length === 0 && (
            <p className="text-ink-muted text-base">Todavía no hay familias de tela creadas. Crea la primera abajo.</p>
          )}

          {telasSinFamilia.length > 0 && (
            <div className="bg-carbon-light border border-dashed border-carbon-border rounded-card p-4 flex flex-col gap-3">
              <div>
                <span className="text-lg font-bold text-ink">Sin familia</span>
                <p className="text-sm text-ink-muted">
                  Colores creados antes de tener familias. Asígnales una para que queden ordenados (podés seguir usándolos igual mientras tanto).
                </p>
              </div>
              {telasSinFamilia.map((tela) => (
                <div key={tela.id} className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    value={tela.hex}
                    onChange={(e) => actualizarLocal(tela.id, { hex: e.target.value })}
                    className="w-10 h-10 rounded-control border border-carbon-border bg-carbon shrink-0"
                  />
                  <input
                    type="text"
                    value={tela.nombre}
                    onChange={(e) => actualizarLocal(tela.id, { nombre: e.target.value })}
                    className="campo-input flex-1 min-w-[120px]"
                    aria-label="Nombre del color"
                  />
                  <select
                    value=""
                    onChange={(e) => asignarFamilia(tela.id, e.target.value)}
                    className="campo-input w-48"
                  >
                    <option value="">Asignar a familia…</option>
                    {familias.map((f) => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => guardarFila(tela)}
                    disabled={guardandoId === tela.id}
                    className="min-h-tap px-4 rounded-control bg-gold text-carbon font-bold disabled:opacity-60"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => borrarColor(tela)}
                    className="min-h-tap px-4 rounded-control border-2 border-terracota text-terracota font-bold"
                  >
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={crearFamilia} className="flex flex-wrap items-end gap-3 border-t border-carbon-border pt-6">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-sm text-ink-muted">Nombre de la nueva familia</label>
          <input
            type="text"
            value={nuevaFamiliaNombre}
            onChange={(e) => setNuevaFamiliaNombre(e.target.value)}
            placeholder="Ej: Terciopelo Premium"
            className="campo-input"
          />
        </div>
        <button type="submit" disabled={creandoFamilia} className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold disabled:opacity-60">
          {creandoFamilia ? "Creando…" : "+ Agregar familia de tela"}
        </button>
      </form>
    </div>
  );
}

function FamiliaCard({
  familia,
  colores,
  guardandoId,
  onCambiarFamilia,
  onGuardarFamilia,
  onBorrarFamilia,
  onCambiarColor,
  onGuardarColor,
  onBorrarColor,
  onAgregarColor,
}) {
  return (
    <div className="bg-carbon-light border border-carbon-border rounded-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-[200px] flex flex-col gap-2">
          <input
            type="text"
            value={familia.nombre}
            onChange={(e) => onCambiarFamilia({ nombre: e.target.value })}
            onBlur={onGuardarFamilia}
            className="campo-input font-bold text-lg"
            aria-label="Nombre de la familia"
          />
          <textarea
            value={familia.descripcion ?? ""}
            onChange={(e) => onCambiarFamilia({ descripcion: e.target.value })}
            onBlur={onGuardarFamilia}
            placeholder="Características (opcional): composición, cuidados, sensación al tacto…"
            rows={2}
            className="campo-input resize-none text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onBorrarFamilia}
          className="min-h-tap px-3 rounded-control border-2 border-terracota text-terracota font-bold text-sm shrink-0"
        >
          Borrar familia
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {colores.map((tela) => (
          <div key={tela.id} className="flex items-center gap-2 bg-carbon rounded-control border border-carbon-border p-2">
            <input
              type="color"
              value={tela.hex}
              onChange={(e) => onCambiarColor(tela.id, { hex: e.target.value })}
              className="w-9 h-9 rounded-control border border-carbon-border bg-carbon shrink-0"
            />
            <input
              type="text"
              value={tela.nombre}
              onChange={(e) => onCambiarColor(tela.id, { nombre: e.target.value })}
              className="campo-input w-28 text-sm"
              aria-label="Nombre del color"
            />
            <button
              type="button"
              onClick={() => onGuardarColor(tela)}
              disabled={guardandoId === tela.id}
              className="min-h-tap px-2 rounded-control bg-gold text-carbon font-bold text-xs disabled:opacity-60"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => onBorrarColor(tela)}
              className="min-h-tap px-2 rounded-control border border-terracota text-terracota font-bold text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAgregarColor}
          className="min-h-tap px-4 rounded-control border-2 border-dashed border-carbon-border text-gold font-bold text-sm"
        >
          + Agregar color
        </button>
      </div>
    </div>
  );
}
