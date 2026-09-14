import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { convertirSiEsHeic } from "../lib/heic";
import { obtenerContenido, guardarContenido, CONTENIDO_DEFAULT } from "../lib/contenido";

const BUCKET = "productos"; // mismo bucket que ya usan fotos de mueble y categorías

async function subirImagenContenido(file) {
  const fileListo = await convertirSiEsHeic(file);
  const nombreArchivo = `contenido/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, fileListo);
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
}

/**
 * Panel para editar el contenido del sitio sin tocar código: la
 * dirección y foto de "Nuestra Sede", el texto y las fotos de
 * "Fabricación", y la lista de "Métodos de Pago". Cada sección se
 * guarda por separado en la tabla `contenido_sitio` (ver
 * src/lib/contenido.js) — las páginas públicas leen de ahí.
 */
export default function AdminContenido() {
  const [cargando, setCargando] = useState(true);

  const [sede, setSede] = useState(CONTENIDO_DEFAULT.nuestra_sede);
  const [fabricacion, setFabricacion] = useState(CONTENIDO_DEFAULT.fabricacion);
  const [metodos, setMetodos] = useState(CONTENIDO_DEFAULT.metodos_pago.metodos);

  useEffect(() => {
    Promise.all([
      obtenerContenido("nuestra_sede"),
      obtenerContenido("fabricacion"),
      obtenerContenido("metodos_pago"),
    ]).then(([s, f, m]) => {
      setSede(s);
      setFabricacion(f);
      setMetodos(m.metodos ?? []);
      setCargando(false);
    });
  }, []);

  if (cargando) {
    return <p className="max-w-3xl mx-auto p-6 text-ink-muted text-lg">Cargando…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Contenido del Sitio</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Personaliza textos, fotos y la dirección que se ven en el sitio público — cada sección se guarda por separado.
        </p>
      </div>

      <SeccionSede sede={sede} onGuardado={setSede} />
      <SeccionFabricacion fabricacion={fabricacion} onGuardado={setFabricacion} />
      <SeccionMetodosPago metodos={metodos} onGuardado={setMetodos} />
    </div>
  );
}

/* ------------------------------------------------------------ */
/* NUESTRA SEDE — dirección, foto de fachada, textos             */
/* ------------------------------------------------------------ */
function SeccionSede({ sede, onGuardado }) {
  const [form, setForm] = useState(sede);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubirFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setMensaje(null);
    try {
      const url = await subirImagenContenido(file);
      cambiar("imagen", url);
    } catch (err) {
      setMensaje(`Error al subir la foto: ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarContenido("nuestra_sede", form);
      onGuardado(form);
      setMensaje("Guardado correctamente.");
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-card p-5 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink">📍 Nuestra Sede</h2>
      <p className="text-sm text-ink-muted -mt-2">
        Se usa en la página de Catálogo (fondo de categorías) y en Contacto (foto, dirección y mapa).
      </p>

      <label className="relative w-full h-40 rounded-control overflow-hidden bg-carbon border border-carbon-border cursor-pointer group">
        <img src={form.imagen} alt="Foto de la sede" className="w-full h-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/55 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200">
          {subiendo ? "Subiendo…" : "Cambiar foto"}
        </span>
        <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleSubirFoto} />
      </label>

      <Campo label="Dirección (usada también en el mapa de Google)">
        <input
          type="text"
          value={form.direccion}
          onChange={(e) => cambiar("direccion", e.target.value)}
          className="campo-input"
        />
      </Campo>

      <Campo label="Título de bienvenida">
        <input
          type="text"
          value={form.titulo}
          onChange={(e) => cambiar("titulo", e.target.value)}
          className="campo-input"
        />
      </Campo>

      <Campo label="Texto corto">
        <textarea
          rows={2}
          value={form.texto}
          onChange={(e) => cambiar("texto", e.target.value)}
          className="campo-input resize-none"
        />
      </Campo>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleGuardar} disabled={guardando} className="btn-admin-primary text-sm">
          {guardando ? "Guardando…" : "Guardar Nuestra Sede"}
        </button>
        {mensaje && (
          <span className={mensaje.startsWith("Error") ? "text-terracota text-sm" : "text-gold text-sm"}>{mensaje}</span>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ */
/* FABRICACIÓN — título, texto y galería de fotos (dinámica)      */
/* ------------------------------------------------------------ */
function SeccionFabricacion({ fabricacion, onGuardado }) {
  const [form, setForm] = useState(fabricacion);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleAgregarFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSubiendo(true);
    setMensaje(null);
    try {
      const url = await subirImagenContenido(file);
      setForm((f) => ({ ...f, imagenes: [...(f.imagenes ?? []), url] }));
    } catch (err) {
      setMensaje(`Error al subir la foto: ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  }

  function quitarFoto(i) {
    setForm((f) => ({ ...f, imagenes: f.imagenes.filter((_, idx) => idx !== i) }));
  }

  function moverFoto(i, direccion) {
    setForm((f) => {
      const j = i + direccion;
      if (j < 0 || j >= f.imagenes.length) return f;
      const copia = [...f.imagenes];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return { ...f, imagenes: copia };
    });
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarContenido("fabricacion", form);
      onGuardado(form);
      setMensaje("Guardado correctamente.");
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-card p-5 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink">🔨 Fabricación</h2>
      <p className="text-sm text-ink-muted -mt-2">
        Se usa en la página "Fabricación". Agrega, quita o reordena tantas fotos como quieras.
      </p>

      <Campo label="Título">
        <input
          type="text"
          value={form.titulo}
          onChange={(e) => cambiar("titulo", e.target.value)}
          className="campo-input"
        />
      </Campo>

      <Campo label="Texto">
        <textarea
          rows={5}
          value={form.texto}
          onChange={(e) => cambiar("texto", e.target.value)}
          className="campo-input resize-none"
        />
      </Campo>

      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold text-ink">Fotos del taller</span>
        <div className="flex flex-wrap gap-3">
          {(form.imagenes ?? []).map((url, i) => (
            <div key={url + i} className="relative w-24">
              <img src={url} alt={`Foto ${i + 1}`} className="w-24 h-24 object-cover rounded-control border border-carbon-border" />
              <div className="flex justify-center gap-1 mt-1">
                <button type="button" onClick={() => moverFoto(i, -1)} disabled={i === 0}
                  className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30 hover:text-ink transition-colors" aria-label="Mover antes">←</button>
                <button type="button" onClick={() => quitarFoto(i)}
                  className="min-h-tap min-w-tap text-terracota font-bold hover:text-ink transition-colors" aria-label="Quitar foto">×</button>
                <button type="button" onClick={() => moverFoto(i, 1)} disabled={i === form.imagenes.length - 1}
                  className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30 hover:text-ink transition-colors" aria-label="Mover después">→</button>
              </div>
            </div>
          ))}
          <label className="w-24 h-24 flex items-center justify-center rounded-control border-2 border-dashed border-carbon-border text-ink-muted text-xs text-center cursor-pointer hover:border-gold/50 hover:text-ink transition-colors duration-150">
            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleAgregarFoto} />
            {subiendo ? "Subiendo…" : "+ Agregar"}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleGuardar} disabled={guardando} className="btn-admin-primary text-sm">
          {guardando ? "Guardando…" : "Guardar Fabricación"}
        </button>
        {mensaje && (
          <span className={mensaje.startsWith("Error") ? "text-terracota text-sm" : "text-gold text-sm"}>{mensaje}</span>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ */
/* MÉTODOS DE PAGO — lista dinámica (nombre + detalle + ícono)    */
/* ------------------------------------------------------------ */
function SeccionMetodosPago({ metodos, onGuardado }) {
  const [lista, setLista] = useState(metodos);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function cambiarFila(i, campo, valor) {
    setLista((l) => l.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)));
  }

  function quitarFila(i) {
    setLista((l) => l.filter((_, idx) => idx !== i));
  }

  function agregarFila() {
    setLista((l) => [...l, { nombre: "", detalle: "", icono: "💰" }]);
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarContenido("metodos_pago", { metodos: lista });
      onGuardado(lista);
      setMensaje("Guardado correctamente.");
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-card p-5 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink">💳 Métodos de Pago</h2>
      <p className="text-sm text-ink-muted -mt-2">Se usa en la página de Contacto. Agrega o quita los que necesites.</p>

      <div className="flex flex-col gap-3">
        {lista.map((m, i) => (
          <div key={i} className="flex flex-wrap items-start gap-2 bg-carbon border border-carbon-border rounded-control p-3">
            <input
              type="text"
              value={m.icono}
              onChange={(e) => cambiarFila(i, "icono", e.target.value)}
              className="campo-input w-16 text-center text-xl"
              aria-label="Ícono (emoji)"
            />
            <div className="flex-1 min-w-[160px] flex flex-col gap-2">
              <input
                type="text"
                value={m.nombre}
                onChange={(e) => cambiarFila(i, "nombre", e.target.value)}
                placeholder="Nombre (ej: Zelle)"
                className="campo-input"
              />
              <input
                type="text"
                value={m.detalle}
                onChange={(e) => cambiarFila(i, "detalle", e.target.value)}
                placeholder="Detalle"
                className="campo-input"
              />
            </div>
            <button
              type="button"
              onClick={() => quitarFila(i)}
              className="min-h-tap min-w-tap text-terracota font-bold text-lg hover:text-ink transition-colors"
              aria-label="Quitar método"
            >
              ×
            </button>
          </div>
        ))}
        {lista.length === 0 && <p className="text-ink-muted text-base">Todavía no hay métodos de pago.</p>}
      </div>

      <button type="button" onClick={agregarFila} className="btn-admin-secondary text-sm w-fit">
        + Añadir método
      </button>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleGuardar} disabled={guardando} className="btn-admin-primary text-sm">
          {guardando ? "Guardando…" : "Guardar Métodos de Pago"}
        </button>
        {mensaje && (
          <span className={mensaje.startsWith("Error") ? "text-terracota text-sm" : "text-gold text-sm"}>{mensaje}</span>
        )}
      </div>
    </section>
  );
}

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
