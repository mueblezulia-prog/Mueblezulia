import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { convertirSiEsHeic } from "../lib/heic";

const BUCKET = "productos";

async function subirIconoEtiqueta(file) {
  const fileListo = await convertirSiEsHeic(file);
  const nombreArchivo = `etiquetas/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, fileListo);
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
}

/**
 * Catálogo de etiquetas personalizadas (tabla `etiquetas`). El admin
 * crea aquí las que quiera — "Todas las telas", "A tu color", "Envío
 * incluido", lo que sea — con un emoji o una imagen como ícono, y
 * luego las asigna a cada mueble desde su formulario (ver
 * EtiquetasSelector.jsx). Se muestran como insignia dorada en la
 * tarjeta y el detalle del producto.
 */
export default function AdminEtiquetas() {
  const [etiquetas, setEtiquetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoIcono, setNuevoIcono] = useState("🏷️");
  const [creando, setCreando] = useState(false);
  const [subiendoNueva, setSubiendoNueva] = useState(false);

  async function subirFotoNueva(file) {
    if (!file) return;
    setSubiendoNueva(true);
    try {
      const url = await subirIconoEtiqueta(file);
      setNuevoIcono(url);
    } catch (err) {
      alert(`No se pudo subir la foto: ${err.message}`);
    } finally {
      setSubiendoNueva(false);
    }
  }

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase.from("etiquetas").select("*").order("orden");
    if (error) setError(error.message);
    else setEtiquetas(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizarLocal(id, cambios) {
    setEtiquetas((actual) => actual.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
  }

  async function guardarFila(etiqueta) {
    setGuardandoId(etiqueta.id);
    const { error } = await supabase
      .from("etiquetas")
      .update({ nombre: etiqueta.nombre, icono: etiqueta.icono })
      .eq("id", etiqueta.id);
    setGuardandoId(null);
    if (error) alert(`No se pudo guardar: ${error.message}`);
  }

  async function borrarFila(etiqueta) {
    const confirmado = window.confirm(
      `¿Borrar la etiqueta "${etiqueta.nombre}"? Se quitará de todos los productos que la tengan.`
    );
    if (!confirmado) return;
    const { error } = await supabase.from("etiquetas").delete().eq("id", etiqueta.id);
    if (error) {
      alert(`No se pudo borrar: ${error.message}`);
      return;
    }
    setEtiquetas((actual) => actual.filter((e) => e.id !== etiqueta.id));
  }

  async function subirImagenFila(etiqueta, file) {
    if (!file) return;
    setSubiendoId(etiqueta.id);
    try {
      const url = await subirIconoEtiqueta(file);
      actualizarLocal(etiqueta.id, { icono: url });
    } catch (err) {
      alert(`No se pudo subir la imagen: ${err.message}`);
    } finally {
      setSubiendoId(null);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    const { data, error } = await supabase
      .from("etiquetas")
      .insert({ nombre: nuevoNombre.trim(), icono: nuevoIcono.trim() || "🏷️", orden: etiquetas.length })
      .select()
      .single();
    setCreando(false);
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    setEtiquetas((actual) => [...actual, data]);
    setNuevoNombre("");
    setNuevoIcono("🏷️");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          🏷️ Etiquetas de Productos
        </h1>
        <p className="text-ink-muted text-base mt-1">
          Crea aquí las etiquetas que quieras (ej: "Todas las telas", "Envío incluido") y luego elige cuáles
          aplican a cada mueble desde su formulario. Se muestran como insignia dorada en el catálogo.
        </p>
      </div>

      {cargando && <p className="text-ink-muted text-lg">Cargando…</p>}
      {error && <p className="text-terracota text-lg">Error: {error}</p>}

      {!cargando && !error && (
        <div className="flex flex-col gap-3">
          {etiquetas.map((etiqueta) => (
            <div key={etiqueta.id} className="admin-card p-3 flex flex-wrap items-center gap-3">
              <label className="relative w-12 h-12 rounded-control border border-carbon-border bg-carbon shrink-0 cursor-pointer flex items-center justify-center text-2xl overflow-hidden group">
                {etiqueta.icono?.startsWith("/") || etiqueta.icono?.startsWith("http") ? (
                  <img src={etiqueta.icono} alt="" className="w-full h-full object-contain" />
                ) : (
                  etiqueta.icono
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/60 text-white text-[10px] font-semibold text-center opacity-0 group-hover:opacity-100 transition-all duration-150">
                  {subiendoId === etiqueta.id ? "…" : "Subir foto"}
                </span>
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  onChange={(e) => subirImagenFila(etiqueta, e.target.files?.[0])}
                />
              </label>
              <input
                type="text"
                value={etiqueta.nombre}
                onChange={(e) => actualizarLocal(etiqueta.id, { nombre: e.target.value })}
                className="campo-input flex-1 min-w-[140px]"
                aria-label="Nombre de la etiqueta"
              />
              <input
                type="text"
                value={etiqueta.icono}
                onChange={(e) => actualizarLocal(etiqueta.id, { icono: e.target.value })}
                className="campo-input w-24 text-center"
                placeholder="🏷️"
                aria-label="Ícono (emoji), o sube una foto con el botón de la izquierda"
              />
              <button
                type="button"
                onClick={() => guardarFila(etiqueta)}
                disabled={guardandoId === etiqueta.id}
                className="btn-admin-primary text-sm"
              >
                {guardandoId === etiqueta.id ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => borrarFila(etiqueta)}
                className="btn-admin-danger text-sm"
              >
                Borrar
              </button>
            </div>
          ))}
          {etiquetas.length === 0 && (
            <p className="text-ink-muted text-base">Todavía no hay etiquetas creadas.</p>
          )}
        </div>
      )}

      <form onSubmit={handleCrear} className="flex flex-wrap items-end gap-3 border-t border-carbon-border pt-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">Ícono</label>
          <label className="relative w-12 h-12 rounded-control border border-carbon-border bg-carbon cursor-pointer flex items-center justify-center text-xl overflow-hidden group">
            {nuevoIcono?.startsWith("/") || nuevoIcono?.startsWith("http") ? (
              <img src={nuevoIcono} alt="" className="w-full h-full object-contain" />
            ) : (
              nuevoIcono
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/60 text-white text-[10px] font-semibold text-center opacity-0 group-hover:opacity-100 transition-all duration-150">
              {subiendoNueva ? "…" : "Subir foto"}
            </span>
            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(e) => subirFotoNueva(e.target.files?.[0])}
            />
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">O escribe un emoji</label>
          <input
            type="text"
            value={nuevoIcono}
            onChange={(e) => setNuevoIcono(e.target.value)}
            className="campo-input w-20 text-center text-xl"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">Nombre de la etiqueta</label>
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Ej: Envío incluido"
            className="campo-input"
          />
        </div>
        <button type="submit" disabled={creando || subiendoNueva} className="btn-admin-primary">
          {creando ? "Creando…" : "+ Añadir etiqueta"}
        </button>
      </form>
      <p className="text-xs text-ink-muted -mt-4">
        Toca el cuadro del ícono para subir una foto propia, o escribe un emoji al lado — lo que dejes ahí es lo que se usa.
      </p>
    </div>
  );
}
