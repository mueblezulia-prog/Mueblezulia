import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Catálogo global de telas/colores (tabla `telas`). Se administra UNA vez
 * aquí y luego cada producto elige cuáles de estas telas ofrece (ver
 * SelectorTelas.jsx) — así no hay que volver a escribir el mismo color
 * a mano en cada mueble.
 */
export default function AdminTelas() {
  const [telas, setTelas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoHex, setNuevoHex] = useState("#F2B90C");
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase.from("telas").select("*").order("orden");
    if (error) setError(error.message);
    else setTelas(data ?? []);
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

  async function borrarFila(tela) {
    const confirmado = window.confirm(
      `¿Borrar la tela "${tela.nombre}"? Se quitará de todos los productos que la tengan.`
    );
    if (!confirmado) return;
    const { error } = await supabase.from("telas").delete().eq("id", tela.id);
    if (error) {
      alert(`No se pudo borrar: ${error.message}`);
      return;
    }
    setTelas((actual) => actual.filter((t) => t.id !== tela.id));
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    const { data, error } = await supabase
      .from("telas")
      .insert({ nombre: nuevoNombre.trim(), hex: nuevoHex, orden: telas.length })
      .select()
      .single();
    setCreando(false);
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    setTelas((actual) => [...actual, data]);
    setNuevoNombre("");
    setNuevoHex("#F2B90C");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Telas y Colores</h1>
        <p className="text-ink-muted text-base mt-1">
          Catálogo compartido: crea aquí cada tela una sola vez, y luego elige cuáles aplican a cada mueble desde su formulario.
        </p>
      </div>

      {cargando && <p className="text-ink-muted text-lg">Cargando…</p>}
      {error && <p className="text-terracota text-lg">Error: {error}</p>}

      {!cargando && !error && (
        <div className="flex flex-col gap-3">
          {telas.map((tela) => (
            <div key={tela.id} className="bg-carbon-light border border-carbon-border rounded-card p-3 flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={tela.hex}
                onChange={(e) => actualizarLocal(tela.id, { hex: e.target.value })}
                className="w-12 h-12 rounded-control border border-carbon-border bg-carbon shrink-0"
              />
              <input
                type="text"
                value={tela.nombre}
                onChange={(e) => actualizarLocal(tela.id, { nombre: e.target.value })}
                className="campo-input flex-1 min-w-[140px]"
                aria-label="Nombre de la tela"
              />
              <input
                type="text"
                value={tela.hex}
                onChange={(e) => actualizarLocal(tela.id, { hex: e.target.value })}
                className="campo-input w-28"
                aria-label="Valor HEX"
              />
              <button
                type="button"
                onClick={() => guardarFila(tela)}
                disabled={guardandoId === tela.id}
                className="min-h-tap px-4 rounded-control bg-gold text-carbon font-bold disabled:opacity-60"
              >
                {guardandoId === tela.id ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => borrarFila(tela)}
                className="min-h-tap px-4 rounded-control border-2 border-terracota text-terracota font-bold"
              >
                Borrar
              </button>
            </div>
          ))}
          {telas.length === 0 && (
            <p className="text-ink-muted text-base">Todavía no hay telas creadas.</p>
          )}
        </div>
      )}

      <form onSubmit={handleCrear} className="flex flex-wrap items-end gap-3 border-t border-carbon-border pt-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">Color</label>
          <input
            type="color"
            value={nuevoHex}
            onChange={(e) => setNuevoHex(e.target.value)}
            className="w-12 h-12 rounded-control border border-carbon-border bg-carbon-light"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">Nombre de la tela</label>
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Ej: Gris Perla"
            className="campo-input"
          />
        </div>
        <button type="submit" disabled={creando} className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold disabled:opacity-60">
          {creando ? "Creando…" : "+ Añadir tela"}
        </button>
      </form>
    </div>
  );
}
