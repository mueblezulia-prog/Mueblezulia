import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const BUCKET = "productos"; // mismo bucket que ya usan las fotos de mueble

async function subirImagenCategoria(file) {
  const nombreArchivo = `categorias/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, file);
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
}

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoSlug, setNuevoSlug] = useState("");
  const [nuevaImagenFile, setNuevaImagenFile] = useState(null);
  const [nuevaImagenPreview, setNuevaImagenPreview] = useState(null);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase.from("categorias").select("*").order("orden");
    if (error) setError(error.message);
    else setCategorias(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function actualizarLocal(id, cambios) {
    setCategorias((actual) => actual.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  }

  async function guardarFila(categoria) {
    setGuardandoId(categoria.id);
    const { error } = await supabase
      .from("categorias")
      .update({ nombre: categoria.nombre, slug: categoria.slug, imagen: categoria.imagen, orden: categoria.orden })
      .eq("id", categoria.id);
    setGuardandoId(null);
    if (error) alert(`No se pudo guardar: ${error.message}`);
  }

  async function subirImagenFila(categoria, file) {
    if (!file) return;
    setSubiendoId(categoria.id);
    try {
      const url = await subirImagenCategoria(file);
      const { error } = await supabase.from("categorias").update({ imagen: url }).eq("id", categoria.id);
      if (error) throw error;
      actualizarLocal(categoria.id, { imagen: url });
    } catch (err) {
      alert(`No se pudo subir la imagen: ${err.message}`);
    } finally {
      setSubiendoId(null);
    }
  }

  async function borrarFila(categoria) {
    const confirmado = window.confirm(
      `¿Borrar "${categoria.nombre}"? Los productos de esta categoría quedarán sin categoría.`
    );
    if (!confirmado) return;
    const { error } = await supabase.from("categorias").delete().eq("id", categoria.id);
    if (error) {
      alert(`No se pudo borrar: ${error.message}`);
      return;
    }
    setCategorias((actual) => actual.filter((c) => c.id !== categoria.id));
  }

  function slugificar(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleSeleccionarImagenNueva(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNuevaImagenFile(file);
    setNuevaImagenPreview(URL.createObjectURL(file));
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    setMensaje(null);
    try {
      const slug = nuevoSlug.trim() || slugificar(nuevoNombre);
      const imagenUrl = nuevaImagenFile ? await subirImagenCategoria(nuevaImagenFile) : null;
      const { data, error } = await supabase
        .from("categorias")
        .insert({ nombre: nuevoNombre.trim(), slug, imagen: imagenUrl, orden: categorias.length })
        .select()
        .single();
      if (error) throw error;
      setCategorias((actual) => [...actual, data]);
      setNuevoNombre("");
      setNuevoSlug("");
      setNuevaImagenFile(null);
      setNuevaImagenPreview(null);
    } catch (err) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-8">
      <h1 className="text-2xl font-extrabold text-ink">Categorías</h1>

      {cargando && <p className="text-ink-muted text-lg">Cargando…</p>}
      {error && <p className="text-terracota text-lg">Error: {error}</p>}

      {!cargando && !error && (
        <div className="flex flex-col gap-3">
          {categorias.map((cat) => (
            <div key={cat.id} className="bg-carbon-light border border-carbon-border rounded-card p-3 flex flex-wrap items-center gap-3">
              {cat.imagen && (
                <img src={cat.imagen} alt={cat.nombre} className="w-14 h-14 object-cover rounded-control shrink-0" />
              )}
              <input
                type="text"
                value={cat.nombre}
                onChange={(e) => actualizarLocal(cat.id, { nombre: e.target.value })}
                className="campo-input flex-1 min-w-[140px]"
                aria-label="Nombre"
              />
              <input
                type="text"
                value={cat.slug}
                onChange={(e) => actualizarLocal(cat.id, { slug: e.target.value })}
                className="campo-input w-40"
                aria-label="Slug"
              />
              <label className="min-h-tap px-3 flex items-center justify-center rounded-control border-2 border-dashed border-carbon-border text-ink-muted text-sm cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => subirImagenFila(cat, e.target.files?.[0])}
                />
                {subiendoId === cat.id ? "Subiendo…" : cat.imagen ? "Cambiar imagen" : "Subir imagen"}
              </label>
              <button
                type="button"
                onClick={() => guardarFila(cat)}
                disabled={guardandoId === cat.id}
                className="min-h-tap px-4 rounded-control bg-gold text-carbon font-bold disabled:opacity-60"
              >
                {guardandoId === cat.id ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => borrarFila(cat)}
                className="min-h-tap px-4 rounded-control border-2 border-terracota text-terracota font-bold"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCrear} className="flex flex-wrap items-end gap-3 border-t border-carbon-border pt-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">Nombre</label>
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Ej: Cocinas"
            className="campo-input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">Slug (opcional)</label>
          <input
            type="text"
            value={nuevoSlug}
            onChange={(e) => setNuevoSlug(e.target.value)}
            placeholder="cocinas"
            className="campo-input w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-muted">Imagen (opcional)</label>
          <label className="min-h-tap px-4 flex items-center justify-center rounded-control border-2 border-dashed border-carbon-border text-ink-muted text-sm cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleSeleccionarImagenNueva} />
            {nuevaImagenPreview ? "Imagen lista ✓" : "Subir imagen"}
          </label>
        </div>
        {nuevaImagenPreview && (
          <img src={nuevaImagenPreview} alt="Vista previa" className="w-14 h-14 object-cover rounded-control" />
        )}
        <button type="submit" disabled={creando} className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold disabled:opacity-60">
          {creando ? "Creando…" : "+ Añadir categoría"}
        </button>
      </form>
      {mensaje && <p className="text-terracota">{mensaje}</p>}
    </div>
  );
}
