import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { convertirSiEsHeic } from "../lib/heic";
import { prepararImagen } from "../lib/imagenOptimizada";

const BUCKET = "productos"; // mismo bucket que ya usan las fotos de mueble

async function subirImagenCategoria(file) {
  const fileListo = await prepararImagen(file);
  const extension = fileListo.type === "image/webp" ? "webp" : "jpg";
  const nombreArchivo = `categorias/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, fileListo, { contentType: fileListo.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
}

function slugificar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoId, setGuardandoId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

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

  async function guardarFila(categoria, subcategoriasFinal) {
    setGuardandoId(categoria.id);
    const { error } = await supabase
      .from("categorias")
      .update({
        nombre: categoria.nombre,
        slug: categoria.slug,
        imagen: categoria.imagen,
        orden: categoria.orden,
        subcategorias: subcategoriasFinal ?? categoria.subcategorias ?? [],
      })
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

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Categorías</h1>
          <p className="text-sm text-ink-muted mt-0.5">Se muestran en el catálogo en este orden.</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="min-h-tap px-4 rounded-control bg-gold text-carbon font-bold text-sm"
        >
          {mostrarForm ? "Cancelar" : "+ Nueva categoría"}
        </button>
      </div>

      {mostrarForm && (
        <NuevaCategoriaCard
          ordenSiguiente={categorias.length}
          onCreada={(cat) => {
            setCategorias((actual) => [...actual, cat]);
            setMostrarForm(false);
          }}
        />
      )}

      {cargando && <p className="text-ink-muted text-lg">Cargando…</p>}
      {error && <p className="text-terracota text-lg">Error: {error}</p>}

      {!cargando && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categorias.map((cat) => (
            <TarjetaCategoria
              key={cat.id}
              categoria={cat}
              guardando={guardandoId === cat.id}
              subiendo={subiendoId === cat.id}
              onCambiar={(cambios) => actualizarLocal(cat.id, cambios)}
              onGuardar={(subcategoriasFinal) => guardarFila(cat, subcategoriasFinal)}
              onSubirImagen={(file) => subirImagenFila(cat, file)}
              onBorrar={() => borrarFila(cat)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaCategoria({ categoria, guardando, subiendo, onCambiar, onGuardar, onSubirImagen, onBorrar }) {
  // El texto que se está escribiendo para una subcategoría nueva vive
  // aquí (no dentro de EditorSubcategorias) para que el botón
  // "Guardar" de la tarjeta pueda incluirlo aunque el admin no haya
  // presionado "+ Añadir" — antes, si escribías el nombre y le dabas
  // directo a "Guardar", esa subcategoría se perdía silenciosamente.
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState("");

  function subcategoriasConPendiente() {
    const actuales = categoria.subcategorias ?? [];
    const pendiente = nuevaSubcategoria.trim();
    if (!pendiente || actuales.includes(pendiente)) return actuales;
    return [...actuales, pendiente];
  }

  function handleGuardarClick() {
    const finales = subcategoriasConPendiente();
    if (finales !== categoria.subcategorias) {
      onCambiar({ subcategorias: finales });
      setNuevaSubcategoria("");
    }
    onGuardar(finales);
  }

  return (
    <div className="group rounded-card overflow-hidden border border-carbon-border bg-carbon-light flex flex-col">
      <label
        className="relative aspect-[4/3] flex items-center justify-center cursor-pointer bg-carbon"
        style={
          categoria.imagen
            ? { backgroundImage: `url(${categoria.imagen})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <input
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => onSubirImagen(e.target.files?.[0])}
        />
        <span
          className={[
            "absolute inset-0 flex items-center justify-center text-xs font-semibold text-white transition-opacity",
            categoria.imagen
              ? "bg-black/0 group-hover:bg-black/50 opacity-0 group-hover:opacity-100"
              : "bg-carbon text-ink-muted opacity-100",
          ].join(" ")}
        >
          {subiendo ? "Subiendo…" : categoria.imagen ? "Cambiar imagen" : "+ Subir imagen"}
        </span>
      </label>

      <div className="p-3 flex flex-col gap-2">
        <input
          type="text"
          value={categoria.nombre}
          onChange={(e) => onCambiar({ nombre: e.target.value })}
          className="bg-transparent text-ink font-bold text-base outline-none border-b border-transparent focus:border-carbon-border pb-0.5"
          aria-label="Nombre"
        />
        <input
          type="text"
          value={categoria.slug}
          onChange={(e) => onCambiar({ slug: e.target.value })}
          className="bg-transparent text-ink-muted text-xs outline-none border-b border-transparent focus:border-carbon-border pb-0.5"
          aria-label="Slug"
        />

        <EditorSubcategorias
          subcategorias={categoria.subcategorias ?? []}
          onCambiar={(subcategorias) => onCambiar({ subcategorias })}
          nuevaSubcategoria={nuevaSubcategoria}
          onCambiarNuevaSubcategoria={setNuevaSubcategoria}
        />

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onBorrar}
            className="min-h-tap text-terracota text-xs font-semibold"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={handleGuardarClick}
            disabled={guardando}
            className="min-h-tap px-3 rounded-control bg-gold text-carbon text-xs font-bold disabled:opacity-60"
          >
            {guardando ? "…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Lista de "chips" con las subcategorías de una categoría (ej: dentro
 * de "Modulares" → Grecia, Verona, Raquel). Se escriben libremente; el
 * texto que se está escribiendo (aún sin confirmar con "+ Añadir")
 * vive en el padre (TarjetaCategoria) para que "Guardar" también lo
 * incluya si el admin no le dio a "+ Añadir" primero.
 */
function EditorSubcategorias({ subcategorias, onCambiar, nuevaSubcategoria, onCambiarNuevaSubcategoria }) {
  function agregar() {
    const texto = nuevaSubcategoria.trim();
    if (!texto || subcategorias.includes(texto)) {
      onCambiarNuevaSubcategoria("");
      return;
    }
    onCambiar([...subcategorias, texto]);
    onCambiarNuevaSubcategoria("");
  }

  function quitar(nombre) {
    onCambiar(subcategorias.filter((s) => s !== nombre));
  }

  return (
    <div className="flex flex-col gap-1.5 pt-1 border-t border-carbon-border/60">
      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">Subcategorías</span>
      {subcategorias.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {subcategorias.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 bg-carbon border border-carbon-border rounded-control px-2 py-0.5 text-xs text-ink"
            >
              {s}
              <button
                type="button"
                onClick={() => quitar(s)}
                className="text-terracota font-bold hover:text-ink transition-colors leading-none"
                aria-label={`Quitar ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={nuevaSubcategoria}
          onChange={(e) => onCambiarNuevaSubcategoria(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Ej: Grecia (o escribe y da Guardar)"
          className="flex-1 min-w-0 bg-carbon border border-carbon-border rounded-control px-2 py-1 text-xs text-ink outline-none focus:border-gold/60 transition-colors duration-150"
        />
        <button
          type="button"
          onClick={agregar}
          className="shrink-0 px-2 rounded-control border border-carbon-border text-ink-muted text-xs font-bold hover:border-gold/50 hover:text-ink transition-colors duration-150"
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}

function NuevaCategoriaCard({ ordenSiguiente, onCreada }) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);

  async function handleSeleccionarImagen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesandoImagen(true);
    try {
      const fileListo = await convertirSiEsHeic(file);
      setImagenFile(fileListo);
      setImagenPreview(URL.createObjectURL(fileListo));
    } catch (err) {
      setError(`No se pudo procesar la imagen: ${err.message}`);
    } finally {
      setProcesandoImagen(false);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    setError(null);
    try {
      const slugFinal = slug.trim() || slugificar(nombre);
      const imagenUrl = imagenFile ? await subirImagenCategoria(imagenFile) : null;
      const { data, error } = await supabase
        .from("categorias")
        .insert({ nombre: nombre.trim(), slug: slugFinal, imagen: imagenUrl, orden: ordenSiguiente })
        .select()
        .single();
      if (error) throw error;
      onCreada(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <form
      onSubmit={handleCrear}
      className="rounded-card border border-dashed border-carbon-border bg-carbon-light p-4 flex flex-wrap items-end gap-3"
    >
      <label className="w-16 h-16 shrink-0 rounded-control border border-carbon-border overflow-hidden flex items-center justify-center text-ink-muted text-xs cursor-pointer bg-carbon text-center"
        style={imagenPreview ? { backgroundImage: `url(${imagenPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleSeleccionarImagen} />
        {!imagenPreview && (procesandoImagen ? "…" : "Foto")}
      </label>

      <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
        <label className="text-xs text-ink-muted">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Cocinas"
          className="campo-input"
        />
      </div>
      <div className="flex flex-col gap-1 w-32">
        <label className="text-xs text-ink-muted">Slug (opcional)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="cocinas"
          className="campo-input"
        />
      </div>
      <button type="submit" disabled={creando} className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold disabled:opacity-60">
        {creando ? "Creando…" : "Crear"}
      </button>

      {error && <p className="text-terracota text-sm w-full">{error}</p>}
    </form>
  );
}
