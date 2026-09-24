import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { prepararImagen } from "../lib/imagenOptimizada";
import EditorTiraTela from "./EditorTiraTela";
import EncuadreFoto from "./EncuadreFoto";
import { BENEFICIOS_TELA } from "../lib/telas";

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

  async function agregarColor(familiaId, nombre) {
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
      .update({
        nombre: familia.nombre,
        descripcion: familia.descripcion,
        composicion: familia.composicion,
        ancho: familia.ancho,
        cuidados: familia.cuidados,
        beneficios: familia.beneficios ?? [],
        portada_pos_x: familia.portada_pos_x ?? 50,
        portada_pos_y: familia.portada_pos_y ?? 50,
        portada_zoom: familia.portada_zoom ?? 1,
      })
      .eq("id", familia.id);
    if (error) {
      alert(
        `No se pudo guardar: ${error.message}` +
          (/column/i.test(error.message) ? "\n\n¿Ya corriste supabase/fase_1_19_beneficios_y_zoom.sql en tu Supabase?" : "")
      );
    }
  }

  // Disponible/No disponible se guarda al toque (no hace falta esperar a
  // "Guardar y cerrar"), porque afecta lo que ve el cliente en todo el
  // sitio de inmediato.
  async function alternarDisponibilidad(familia) {
    const nuevoValor = !(familia.disponible ?? true);
    actualizarFamiliaLocal(familia.id, { disponible: nuevoValor });
    const { error } = await supabase.from("telas_familias").update({ disponible: nuevoValor }).eq("id", familia.id);
    if (error) {
      alert(
        `No se pudo cambiar la disponibilidad: ${error.message}\n\n¿Ya corriste supabase/fase_1_13_disponibilidad_tela.sql en tu proyecto de Supabase?`
      );
      actualizarFamiliaLocal(familia.id, { disponible: !nuevoValor });
    }
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
  // Devuelve true si se guardó bien (la tarjeta solo se cierra en ese
  // caso — antes se cerraba aunque fallara y los cambios quedaban ocultos).
  async function guardarTodosLosColores(familiaId) {
    const filas = telas.filter((t) => t.familia_id === familiaId);
    if (filas.length === 0) return true;
    setGuardandoFamiliaId(familiaId);
    // Solo nombre y color: mandar la fila entera (fechas, foto, etc.) hacía
    // que el guardado fallara con facilidad.
    const resultados = await Promise.all(
      filas.map((t) => supabase.from("telas").update({ nombre: t.nombre, hex: t.hex }).eq("id", t.id))
    );
    setGuardandoFamiliaId(null);
    const fallo = resultados.find((r) => r.error);
    if (fallo) {
      alert(`No se pudo guardar: ${fallo.error.message}`);
      return false;
    }
    return true;
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
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
              onAgregarColor={(nombre) => agregarColor(familia.id, nombre)}
              onSubirFoto={subirFoto}
              onQuitarFoto={quitarFoto}
              onSubirTira={(file) => abrirEditorTira(familia, file)}
              onGuardarTodosColores={() => guardarTodosLosColores(familia.id)}
              guardandoTodos={guardandoFamiliaId === familia.id}
              onAlternarDisponibilidad={() => alternarDisponibilidad(familia)}
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
                  Colores creados antes de tener familias. Asígnales una para que queden ordenados (puedes seguir usándolos igual mientras tanto).
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
                      className="campo-input w-48"
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
          onFotoCompletaGuardada={(url) => actualizarFamiliaLocal(tiraFamilia.id, { foto_completa: url })}
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
  onAlternarDisponibilidad,
}) {
  const disponible = familia.disponible ?? true;
  // Una familia recién creada (todavía sin colores) arranca abierta para
  // poder cargarla de una — las que ya tienen colores arrancan cerradas,
  // como un catálogo.
  const [expandida, setExpandida] = useState(colores.length === 0);
  // Campo para escribir el nombre del color nuevo (en vez de la ventanita
  // del navegador "prompt", que en el celular se veía fea y confusa).
  const [nuevoColor, setNuevoColor] = useState(null);
  const [beneficioPropio, setBeneficioPropio] = useState("");

  // Beneficios y encuadre de la portada se guardan SOLOS (medio segundo
  // después del último cambio), sin tener que tocar ningún botón.
  const firmaAuto = JSON.stringify([familia.beneficios ?? [], familia.portada_pos_x, familia.portada_pos_y, familia.portada_zoom]);
  const firmaInicial = useRef(firmaAuto);
  const [guardadoAuto, setGuardadoAuto] = useState(false);
  useEffect(() => {
    if (firmaAuto === firmaInicial.current) return undefined;
    const t = setTimeout(async () => {
      await onGuardarFamilia();
      firmaInicial.current = firmaAuto;
      setGuardadoAuto(true);
      setTimeout(() => setGuardadoAuto(false), 1800);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaAuto]);

  const beneficios = familia.beneficios ?? [];
  function alternarBeneficio(id) {
    onCambiarFamilia({ beneficios: beneficios.includes(id) ? beneficios.filter((b) => b !== id) : [...beneficios, id] });
  }
  function agregarBeneficioPropio() {
    const texto = beneficioPropio.trim();
    if (texto && !beneficios.includes(texto)) onCambiarFamilia({ beneficios: [...beneficios, texto] });
    setBeneficioPropio("");
  }

  async function confirmarNuevoColor() {
    if (!nuevoColor?.trim()) {
      setNuevoColor(null);
      return;
    }
    await onAgregarColor(nuevoColor.trim());
    setNuevoColor(null);
  }

  function handleArchivoTira(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onSubirTira(file);
  }

  // Al guardar todos los colores, se contrae de nuevo la tarjeta — así
  // queda como un catálogo (una fila por familia) en vez de tener todo
  // abierto todo el tiempo.
  async function manejarGuardarTodos() {
    const ok = await onGuardarTodosColores();
    if (ok) setExpandida(false);
  }

  return (
    <div className={["admin-card overflow-hidden", expandida ? "border-gold/40" : ""].join(" ")}>
      <div
        role="button"
        aria-expanded={expandida}
        tabIndex={0}
        onClick={() => setExpandida((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpandida((v) => !v);
        }}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
      >
        <div className="flex -space-x-2.5 shrink-0">
          {colores.slice(0, 5).map((c, i) => (
            <span
              key={c.id}
              className={`w-9 h-9 rounded-full border-2 border-carbon-light bg-cover bg-center shrink-0 ${i >= 3 ? "hidden sm:block" : ""}`}
              style={c.imagen ? { backgroundImage: `url(${c.imagen})` } : { backgroundColor: c.hex }}
            />
          ))}
          {colores.length === 0 && (
            <span className="w-9 h-9 rounded-full border-2 border-dashed border-carbon-border shrink-0" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg text-ink truncate flex items-center gap-2">
            <span className="truncate">{familia.nombre || "(Sin nombre)"}</span>
          </div>
          <div className="text-sm text-ink-muted">
            {colores.length} color{colores.length === 1 ? "" : "es"}
          </div>
        </div>

        {/* Switch de disponibilidad, visible siempre en la fila cerrada —
            no hace falta abrir la familia para prender/apagarlo. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAlternarDisponibilidad();
          }}
          title={disponible ? "Disponible — toca para marcar como no disponible" : "No disponible — toca para marcar como disponible"}
          role="switch"
          aria-checked={disponible}
          aria-label="Disponible"
          className="flex items-center gap-1.5 shrink-0 min-h-tap px-1"
        >
          <span className={["text-xs font-bold uppercase tracking-wide hidden sm:inline", disponible ? "text-green-400" : "text-terracota"].join(" ")}>
            {disponible ? "Disponible" : "No disponible"}
          </span>
          <span
            className={[
              "w-12 h-7 rounded-full relative transition-colors duration-200 border",
              disponible ? "bg-green-500/80 border-green-400" : "bg-carbon border-terracota/60",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 w-[22px] h-[22px] rounded-full bg-white shadow transition-all duration-200",
                disponible ? "left-[23px]" : "left-0.5",
              ].join(" ")}
            />
          </span>
        </button>

        <span className="text-ink-muted text-xl shrink-0">{expandida ? "▲" : "▼"}</span>
      </div>

      {expandida && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-carbon-border pt-4">
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
                placeholder="Descripción (opcional): sensación al tacto, estilo, etc."
                rows={2}
                className="campo-input resize-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={familia.composicion ?? ""}
                  onChange={(e) => onCambiarFamilia({ composicion: e.target.value })}
                  onBlur={onGuardarFamilia}
                  placeholder="Composición (ej: 100% poliéster)"
                  className="campo-input"
                  aria-label="Composición"
                />
                <input
                  type="text"
                  value={familia.ancho ?? ""}
                  onChange={(e) => onCambiarFamilia({ ancho: e.target.value })}
                  onBlur={onGuardarFamilia}
                  placeholder="Ancho (ej: 1.40 m)"
                  className="campo-input"
                  aria-label="Ancho"
                />
                <input
                  type="text"
                  value={familia.cuidados ?? ""}
                  onChange={(e) => onCambiarFamilia({ cuidados: e.target.value })}
                  onBlur={onGuardarFamilia}
                  placeholder="Cuidados (ej: limpiar en seco)"
                  className="campo-input sm:col-span-2"
                  aria-label="Cuidados"
                />
              </div>
              <p className="text-xs text-ink-muted -mt-1">
                Estos tres campos son opcionales y aparecen como insignias (como las de "Todas las telas" en los muebles) en la
                tarjeta pública de esta tela. Déjalos vacíos si no aplican.
              </p>

              {/* BENEFICIOS (como los de la etiqueta de la muestra) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-carbon-border/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-semibold text-ink">Beneficios de esta tela</span>
                  {guardadoAuto && <span className="text-sm text-green-400 font-semibold">✓ Guardado</span>}
                </div>
                <p className="text-xs text-ink-muted -mt-1">Toca los que tenga (se guardan solos). Se ven como insignias verdes.</p>
                <div className="flex flex-wrap gap-2">
                  {BENEFICIOS_TELA.map((b) => {
                    const activo = beneficios.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => alternarBeneficio(b.id)}
                        aria-pressed={activo}
                        className={[
                          "min-h-[40px] px-3 rounded-full border-2 text-sm font-semibold inline-flex items-center gap-1.5 transition",
                          activo
                            ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-300"
                            : "border-carbon-border text-ink-muted hover:border-emerald-400/40 hover:text-ink",
                        ].join(" ")}
                      >
                        <span aria-hidden="true">{b.icono}</span>
                        {b.texto}
                        {activo && <span aria-hidden="true">✓</span>}
                      </button>
                    );
                  })}
                  {beneficios
                    .filter((v) => !BENEFICIOS_TELA.some((b) => b.id === v))
                    .map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => alternarBeneficio(v)}
                        className="min-h-[40px] px-3 rounded-full border-2 border-emerald-400/70 bg-emerald-500/15 text-emerald-300 text-sm font-semibold inline-flex items-center gap-1.5"
                        title="Tocar para quitar"
                      >
                        ✨ {v} <span aria-hidden="true">✕</span>
                      </button>
                    ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    agregarBeneficioPropio();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={beneficioPropio}
                    onChange={(e) => setBeneficioPropio(e.target.value)}
                    placeholder="Otro beneficio (ej: Anti pelusa)"
                    className="campo-input flex-1 min-w-0"
                  />
                  <button type="submit" className="btn-admin-secondary px-4">Agregar</button>
                </form>
              </div>

              {/* ENCUADRE DE LA PORTADA (tarjeta cuadrada del catálogo) */}
              {familia.foto_completa && (
                <div className="flex flex-col gap-2 pt-2 border-t border-carbon-border/60">
                  <span className="text-base font-semibold text-ink">Foto de la tarjeta (cuadrada)</span>
                  <p className="text-xs text-ink-muted -mt-1">
                    Así se ve en el catálogo de telas. Mueve la foto y usa el zoom para elegir qué parte se ve; al tocar la
                    tarjeta, el cliente ve la foto completa.
                  </p>
                  <EncuadreFoto
                    url={familia.foto_completa}
                    x={familia.portada_pos_x ?? 50}
                    y={familia.portada_pos_y ?? 50}
                    zoom={familia.portada_zoom ?? 1}
                    onCambiar={({ x, y, zoom }) => onCambiarFamilia({ portada_pos_x: x, portada_pos_y: y, portada_zoom: zoom })}
                    className="w-full max-w-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button type="button" onClick={onBorrarFamilia} className="btn-admin-danger text-sm">
                Borrar familia
              </button>
            </div>
          </div>
          <p className="text-xs text-ink-muted -mt-1">
            {disponible
              ? "Los clientes pueden ver y elegir esta tela normalmente en todo el sitio."
              : "Los clientes van a ver esta tela marcada como \"No disponible\" en todo el sitio (no se borra nada, solo se avisa)."}
          </p>

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
                onClick={manejarGuardarTodos}
                disabled={guardandoTodos}
                className="btn-admin-primary self-start"
              >
                {guardandoTodos ? "Guardando…" : "💾 Guardar y cerrar esta familia"}
              </button>
            )}

            <div className="flex flex-wrap gap-2">
              {nuevoColor === null ? (
                <button type="button" onClick={() => setNuevoColor("")} className="btn-admin-ghost text-sm self-start">
                  + Agregar color
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    confirmarNuevoColor();
                  }}
                  className="flex gap-2 w-full sm:w-auto"
                >
                  <input
                    autoFocus
                    type="text"
                    value={nuevoColor}
                    onChange={(e) => setNuevoColor(e.target.value)}
                    placeholder="Nombre del color (ej: Gris Perla)"
                    className="campo-input flex-1 sm:w-64"
                  />
                  <button type="submit" className="btn-admin-primary px-4">Agregar</button>
                  <button type="button" onClick={() => setNuevoColor(null)} className="btn-admin-secondary px-3" aria-label="Cancelar">
                    ✕
                  </button>
                </form>
              )}

              <label className="min-h-tap px-4 rounded-control border-2 border-dashed border-gold/50 text-gold font-bold text-sm self-start cursor-pointer flex items-center">
                📷 Subir foto de tira de colores
                <input type="file" accept="image/*,.heic,.heif" onChange={handleArchivoTira} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-ink-muted -mt-1">
              Cambia el nombre y el color de cualquier fila y toca "Guardar y cerrar esta familia" al final — no hace falta guardar
              fila por fila. ¿Tienes una foto con varias franjas de color seguidas (como vienen las muestras de tela)? Súbela con
              "📷 Subir foto de tira de colores" y marca cada color sobre la misma foto.
            </p>
          </div>
        </div>
      )}
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
        className="campo-input w-40 flex-1 min-w-[8rem]"
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
