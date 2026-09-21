import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { prepararImagen } from "../lib/imagenOptimizada";
import EditorTiraTela from "./EditorTiraTela";

const BUCKET = "productos";

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
  const [subiendoId, setSubiendoId] = useState(null);
  const [guardandoFamiliaId, setGuardandoFamiliaId] = useState(null);

  const [nuevaFamiliaNombre, setNuevaFamiliaNombre] = useState("");
  const [creandoFamilia, setCreandoFamilia] = useState(false);

  // Editor de "foto de tira de colores": recorta/gira una sola foto con
  // varias franjas de color y crea todos esos colores de una vez.
  const [tiraFamilia, setTiraFamilia] = useState(null);
  const [tiraArchivo, setTiraArchivo] = useState(null);

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

  async function subirFoto(tela, file) {
    setSubiendoId(tela.id);
    try {
      const fileListo = await prepararImagen(file);
      const extension = fileListo.type === "image/webp" ? "webp" : "jpg";
      const nombreArchivo = `telas/${crypto.randomUUID()}.${extension}`;
      const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(nombreArchivo, fileListo, { contentType: fileListo.type });
      if (errorSubida) throw errorSubida;
      const url = supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
      const { error } = await supabase.from("telas").update({ imagen: url }).eq("id", tela.id);
      if (error) throw error;
      actualizarLocal(tela.id, { imagen: url });
    } catch (err) {
      alert(`No se pudo subir la foto: ${err.message}`);
    } finally {
      setSubiendoId(null);
    }
  }

  async function quitarFoto(tela) {
    const { error } = await supabase.from("telas").update({ imagen: null }).eq("id", tela.id);
    if (error) {
      alert(`No se pudo quitar la foto: ${error.message}`);
      return;
    }
    actualizarLocal(tela.id, { imagen: null });
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

  // Guarda de una sola vez el nombre y el color/hex de TODOS los colores
  // de una familia (ya no hay un botón "Guardar" por cada fila suelta).
  async function guardarTodosLosColores(familiaId) {
    const filas = telas.filter((t) => t.familia_id === familiaId);
    if (filas.length === 0) return;
    setGuardandoFamiliaId(familiaId);
    const { error } = await supabase.from("telas").upsert(filas);
    setGuardandoFamiliaId(null);
    if (error) alert(`No se pudo guardar: ${error.message}`);
  }

  function abrirEditorTira(familia, file) {
    setTiraFamilia(familia);
    setTiraArchivo(file);
  }

  function cerrarEditorTira() {
    setTiraFamilia(null);
    setTiraArchivo(null);
  }

  function coloresCreadosDesdeTira(nuevasFilas) {
    setTelas((actual) => [...actual, ...nuevasFilas]);
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
              subiendoId={subiendoId}
              onCambiarFamilia={(cambios) => actualizarFamiliaLocal(familia.id, cambios)}
              onGuardarFamilia={() => guardarFamilia(familia)}
              onBorrarFamilia={() => borrarFamilia(familia)}
              onCambiarColor={actualizarLocal}
              onBorrarColor={borrarColor}
              onAgregarColor={() => agregarColor(familia.id)}
              onSubirFoto={subirFoto}
              onQuitarFoto={quitarFoto}
              onSubirTira={(file) => abrirEditorTira(familia, file)}
              onGuardarTodosColores={() => guardarTodosLosColores(familia.id)}
              guardandoTodos={guardandoFamiliaId === familia.id}
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
                <FilaColor
                  key={tela.id}
                  tela={tela}
                  guardando={guardandoId === tela.id}
                  subiendo={subiendoId === tela.id}
                  onCambiar={(cambios) => actualizarLocal(tela.id, cambios)}
                  onGuardar={() => guardarFila(tela)}
                  onBorrar={() => borrarColor(tela)}
                  onSubirFoto={(file) => subirFoto(tela, file)}
                  onQuitarFoto={() => quitarFoto(tela)}
                  extra={
                    <select
                      value=""
                      onChange={(e) => asignarFamilia(tela.id, e.target.value)}
                      className="campo-input w-44 text-sm"
                    >
                      <option value="">Asignar a familia…</option>
                      {familias.map((f) => (
                        <option key={f.id} value={f.id}>{f.nombre}</option>
                      ))}
                    </select>
                  }
                />
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

      {tiraFamilia && tiraArchivo && (
        <EditorTiraTela
          key={tiraFamilia.id}
          archivo={tiraArchivo}
          familia={tiraFamilia}
          ordenInicial={telas.filter((t) => t.familia_id === tiraFamilia.id).length}
          onCerrar={cerrarEditorTira}
          onColoresCreados={coloresCreadosDesdeTira}
        />
      )}
    </div>
  );
}

function FamiliaCard({
  familia,
  colores,
  subiendoId,
  onCambiarFamilia,
  onGuardarFamilia,
  onBorrarFamilia,
  onCambiarColor,
  onBorrarColor,
  onAgregarColor,
  onSubirFoto,
  onQuitarFoto,
  onSubirTira,
  onGuardarTodosColores,
  guardandoTodos,
}) {
  function handleArchivoTira(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onSubirTira(file);
  }

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

      <div className="flex flex-col gap-2">
        {colores.map((tela) => (
          <FilaColor
            key={tela.id}
            tela={tela}
            subiendo={subiendoId === tela.id}
            onCambiar={(cambios) => onCambiarColor(tela.id, cambios)}
            onBorrar={() => onBorrarColor(tela)}
            onSubirFoto={(file) => onSubirFoto(tela, file)}
            onQuitarFoto={() => onQuitarFoto(tela)}
          />
        ))}

        {colores.length > 0 && (
          <button
            type="button"
            onClick={onGuardarTodosColores}
            disabled={guardandoTodos}
            className="min-h-tap px-4 rounded-control bg-gold text-carbon font-bold text-sm self-start disabled:opacity-60"
          >
            {guardandoTodos ? "Guardando…" : "💾 Guardar todos los colores de esta familia"}
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAgregarColor}
            className="min-h-tap px-4 rounded-control border-2 border-dashed border-carbon-border text-gold font-bold text-sm self-start"
          >
            + Agregar color
          </button>

          <label className="min-h-tap px-4 rounded-control border-2 border-dashed border-gold/50 text-gold font-bold text-sm self-start cursor-pointer flex items-center">
            📷 Subir foto de tira de colores
            <input type="file" accept="image/*,.heic,.heif" onChange={handleArchivoTira} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-ink-muted -mt-1">
          Cambia el nombre y el color de cualquier fila y toca "Guardar todos los colores de esta familia" una sola vez al final —
          no hace falta guardar fila por fila. ¿Tienes una foto con varias franjas de color seguidas (como vienen las muestras de
          tela)? Súbela con "📷 Subir foto de tira de colores" y marca cada color sobre la misma foto.
        </p>
      </div>
    </div>
  );
}

/**
 * Una fila de color: cuadro de foto (tócalo para subir una foto real —
 * opcional, si no hay foto se muestra el color plano), selector de color,
 * nombre, hex, guardar y borrar. `extra` permite insertar un control
 * adicional (usado por el bloque "Sin familia" para el selector de a qué
 * familia asignarlo).
 */
function FilaColor({ tela, guardando, subiendo, onCambiar, onGuardar, onBorrar, onSubirFoto, onQuitarFoto, extra }) {
  // onGuardar solo se pasa en "Sin familia" (donde no hay un botón de
  // guardado general): ahí cada fila mantiene su propio "Guardar". Dentro
  // de una familia normal, los cambios se guardan todos juntos con el
  // botón "Guardar todos los colores de esta familia".
  function handleArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onSubirFoto(file);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-carbon rounded-control border border-carbon-border p-2">
      <label
        className="w-14 h-14 rounded-control border border-carbon-border shrink-0 cursor-pointer bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={tela.imagen ? { backgroundImage: `url(${tela.imagen})` } : { backgroundColor: tela.hex }}
        title="Toca para subir una foto real de la tela (opcional)"
      >
        <input type="file" accept="image/*,.heic,.heif" onChange={handleArchivo} className="hidden" disabled={subiendo} />
        {subiendo && <span className="text-[10px] text-white bg-black/50 px-1 rounded">Subiendo…</span>}
      </label>

      <input
        type="color"
        value={tela.hex}
        onChange={(e) => onCambiar({ hex: e.target.value })}
        className="w-9 h-9 rounded-control border border-carbon-border bg-carbon shrink-0"
        title="Color plano (se usa si no hay foto)"
      />

      <input
        type="text"
        value={tela.nombre}
        onChange={(e) => onCambiar({ nombre: e.target.value })}
        className="campo-input w-32 text-sm"
        aria-label="Nombre del color"
      />

      {tela.imagen && (
        <button type="button" onClick={onQuitarFoto} className="text-xs text-ink-muted underline">
          Quitar foto
        </button>
      )}

      {extra}

      {onGuardar && (
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className="min-h-tap px-3 rounded-control bg-gold text-carbon font-bold text-xs disabled:opacity-60"
        >
          {guardando ? "…" : "Guardar"}
        </button>
      )}
      <button
        type="button"
        onClick={onBorrar}
        className="min-h-tap px-3 rounded-control border border-terracota text-terracota font-bold text-xs"
      >
        Borrar
      </button>
    </div>
  );
}
