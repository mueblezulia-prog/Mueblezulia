import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { prepararImagen } from "../lib/imagenOptimizada";

const BUCKET = "productos";

async function subirCaptura(file) {
  const listo = await prepararImagen(file);
  const extension = listo.type === "image/webp" ? "webp" : "jpg";
  const nombreArchivo = `opiniones/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, listo, { contentType: listo.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
}

const VACIA = { nombre: "", texto: "", producto: "", estrellas: 5, captura: null };

/**
 * Opiniones de clientes: capturas de pantalla (de WhatsApp, Instagram,
 * etc.) y/o comentarios escritos que se muestran en la página de Inicio
 * en la sección "Lo que dicen nuestros clientes".
 *
 * Requiere haber corrido supabase/fase_1_16_opiniones_estadisticas.sql.
 */
export default function AdminOpiniones() {
  const [opiniones, setOpiniones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(VACIA);
  const [editandoId, setEditandoId] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    const { data, error: e } = await supabase.from("testimonios").select("*").order("orden").order("creado_en");
    if (e) setError(e.message);
    else setOpiniones(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function mostrarAviso(texto, tipo = "ok") {
    setAviso({ texto, tipo });
    setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 3000);
  }

  async function alElegirCaptura(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    try {
      const url = await subirCaptura(file);
      setForm((f) => ({ ...f, captura: url }));
    } catch (err) {
      mostrarAviso(`No se pudo subir la captura: ${err.message}`, "error");
    } finally {
      setSubiendo(false);
    }
  }

  function empezarEdicion(op) {
    setEditandoId(op.id);
    setForm({
      nombre: op.nombre ?? "",
      texto: op.texto ?? "",
      producto: op.producto ?? "",
      estrellas: op.estrellas ?? 5,
      captura: op.captura ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(VACIA);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.captura && !form.texto.trim()) {
      mostrarAviso("Sube una captura o escribe lo que dijo el cliente (al menos una de las dos).", "error");
      return;
    }
    setGuardando(true);
    const datos = {
      nombre: form.nombre.trim() || null,
      texto: form.texto.trim() || null,
      producto: form.producto.trim() || null,
      estrellas: form.estrellas || null,
      captura: form.captura,
    };
    const consulta = editandoId
      ? supabase.from("testimonios").update(datos).eq("id", editandoId).select().single()
      : supabase.from("testimonios").insert({ ...datos, orden: opiniones.length, visible: true }).select().single();
    const { data, error: e2 } = await consulta;
    setGuardando(false);
    if (e2) {
      mostrarAviso(`No se pudo guardar: ${e2.message}`, "error");
      return;
    }
    setOpiniones((lista) => (editandoId ? lista.map((o) => (o.id === editandoId ? data : o)) : [...lista, data]));
    mostrarAviso(editandoId ? "✓ Opinión actualizada" : "✓ Opinión agregada — ya se ve en la página de Inicio");
    cancelar();
  }

  async function alternarVisible(op) {
    const visible = !op.visible;
    setOpiniones((l) => l.map((o) => (o.id === op.id ? { ...o, visible } : o)));
    const { error: e } = await supabase.from("testimonios").update({ visible }).eq("id", op.id);
    if (e) {
      setOpiniones((l) => l.map((o) => (o.id === op.id ? { ...o, visible: !visible } : o)));
      mostrarAviso(`No se pudo cambiar: ${e.message}`, "error");
    }
  }

  async function borrar(op) {
    if (!window.confirm("¿Borrar esta opinión? Si solo quieres que no se vea, usa el botón Visible.")) return;
    const { error: e } = await supabase.from("testimonios").delete().eq("id", op.id);
    if (e) {
      mostrarAviso(`No se pudo borrar: ${e.message}`, "error");
      return;
    }
    setOpiniones((l) => l.filter((o) => o.id !== op.id));
    if (editandoId === op.id) cancelar();
  }

  async function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= opiniones.length) return;
    const nueva = [...opiniones];
    [nueva[indice], nueva[destino]] = [nueva[destino], nueva[indice]];
    const renumerada = nueva.map((o, i) => ({ ...o, orden: i }));
    setOpiniones(renumerada);
    await Promise.all(renumerada.map((o) => supabase.from("testimonios").update({ orden: o.orden }).eq("id", o.id)));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">💬 Opiniones de clientes</h1>
        <p className="text-base text-ink-muted mt-1">
          Sube capturas de lo que te escriben tus clientes (WhatsApp, Instagram, reseñas) o escribe lo que dijeron. Se
          muestran en la página de Inicio. Usa solo mensajes reales de tus clientes.
        </p>
      </div>

      {aviso && (
        <div
          role="status"
          className={[
            "rounded-control border px-4 py-3",
            aviso.tipo === "error" ? "border-terracota/50 bg-terracota/10" : "border-green-500/40 bg-green-500/10",
          ].join(" ")}
        >
          {aviso.texto}
        </div>
      )}

      {/* FORMULARIO */}
      <form onSubmit={guardar} className={["admin-card p-4 sm:p-5 flex flex-col gap-4", editandoId ? "border-gold/50" : ""].join(" ")}>
        <p className="text-lg font-bold text-ink">{editandoId ? "Editar opinión" : "Agregar una opinión"}</p>

        <div className="flex flex-col sm:flex-row gap-4">
          <label className="relative w-full sm:w-40 aspect-[3/4] sm:aspect-auto sm:h-52 shrink-0 rounded-control border-2 border-dashed border-carbon-border hover:border-gold/60 bg-carbon cursor-pointer overflow-hidden flex items-center justify-center text-center transition-colors">
            {form.captura ? (
              <img src={form.captura} alt="Captura" className="absolute inset-0 w-full h-full object-contain bg-black" />
            ) : (
              <span className="text-ink-muted text-sm px-3">
                {subiendo ? "Subiendo…" : (
                  <>
                    <span className="block text-3xl mb-1">📱</span>
                    Toca para subir la captura (opcional)
                  </>
                )}
              </span>
            )}
            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={alElegirCaptura} disabled={subiendo} />
          </label>

          <div className="flex-1 flex flex-col gap-3">
            {form.captura && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, captura: null }))}
                className="self-start text-sm text-terracota font-semibold hover:underline"
              >
                Quitar captura
              </button>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold text-ink">Nombre del cliente (opcional)</span>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: María G."
                className="campo-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-semibold text-ink">¿Qué compró? (opcional)</span>
              <input
                type="text"
                value={form.producto}
                onChange={(e) => setForm((f) => ({ ...f, producto: e.target.value }))}
                placeholder="Ej: Modular Grecia"
                className="campo-input"
              />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-base font-semibold text-ink">Lo que dijo (opcional si subiste captura)</span>
          <textarea
            rows={3}
            value={form.texto}
            onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
            placeholder="Ej: ¡Me encantó mi mueble, llegó perfecto y muy rápido!"
            className="campo-input resize-none"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-base font-semibold text-ink">Estrellas</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm((f) => ({ ...f, estrellas: n }))}
                aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                className={["w-11 h-11 text-2xl rounded-control transition", n <= form.estrellas ? "text-gold" : "text-carbon-border"].join(" ")}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={guardando || subiendo} className="btn-admin-primary">
            {guardando ? "Guardando…" : editandoId ? "💾 Guardar cambios" : "+ Agregar opinión"}
          </button>
          {editandoId && (
            <button type="button" onClick={cancelar} className="btn-admin-secondary">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA */}
      <div className="flex flex-col gap-3">
        <p className="text-lg font-bold text-ink">
          Opiniones cargadas {opiniones.length > 0 && <span className="text-ink-muted font-semibold">({opiniones.length})</span>}
        </p>
        {cargando && <div className="esqueleto h-28" />}
        {error && (
          <p className="text-terracota">
            No se pudieron cargar: {error}. ¿Ya corriste <code>supabase/fase_1_16_opiniones_estadisticas.sql</code>?
          </p>
        )}
        {!cargando && !error && opiniones.length === 0 && (
          <p className="admin-card p-6 text-center text-ink-muted">Todavía no hay opiniones. Agrega la primera arriba.</p>
        )}
        {opiniones.map((op, i) => (
          <div key={op.id} className={["admin-card p-3 flex gap-3", op.visible ? "" : "opacity-60"].join(" ")}>
            <div className="flex flex-col shrink-0">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" className="w-9 h-9 text-ink-muted hover:text-ink disabled:opacity-20">▲</button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === opiniones.length - 1} aria-label="Bajar" className="w-9 h-9 text-ink-muted hover:text-ink disabled:opacity-20">▼</button>
            </div>
            {op.captura ? (
              <img src={op.captura} alt="" className="w-16 h-24 object-cover rounded-control bg-black shrink-0" />
            ) : (
              <div className="w-16 h-24 rounded-control bg-carbon border border-carbon-border shrink-0 flex items-center justify-center text-2xl">💬</div>
            )}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-ink">{op.nombre || "Cliente"}</span>
                {op.estrellas && <span className="text-gold text-sm">{"★".repeat(op.estrellas)}</span>}
                {!op.visible && <span className="text-xs font-bold uppercase bg-white/10 text-ink-muted rounded-full px-2 py-0.5">Oculta</span>}
              </div>
              {op.producto && <span className="text-sm text-ink-muted">Compró: {op.producto}</span>}
              {op.texto && <p className="text-sm text-ink/90 line-clamp-2">{op.texto}</p>}
              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => alternarVisible(op)}
                  className={[
                    "min-h-[40px] px-3 rounded-control border-2 text-sm font-bold",
                    op.visible ? "border-green-500/50 text-green-400 bg-green-500/10" : "border-carbon-border text-ink-muted",
                  ].join(" ")}
                >
                  {op.visible ? "👁 Visible" : "🙈 Oculta"}
                </button>
                <button type="button" onClick={() => empezarEdicion(op)} className="min-h-[40px] px-3 rounded-control border-2 border-ink/60 text-ink text-sm font-bold hover:bg-ink hover:text-carbon transition">
                  Editar
                </button>
                <button type="button" onClick={() => borrar(op)} className="min-h-[40px] px-3 rounded-control border-2 border-terracota text-terracota text-sm font-bold hover:bg-terracota hover:text-ink transition">
                  Borrar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
