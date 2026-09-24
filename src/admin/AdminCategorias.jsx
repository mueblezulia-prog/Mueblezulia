import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { convertirSiEsHeic } from "../lib/heic";
import { prepararImagen } from "../lib/imagenOptimizada";
import EncuadreFoto from "./EncuadreFoto";

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

  // Tarjetas con cambios sin guardar (se resalta su botón "Guardar" y se
  // avisa antes de cerrar la pestaña, para no perder cambios sin querer).
  const [sucios, setSucios] = useState(() => new Set());
  const [guardadoId, setGuardadoId] = useState(null);

  useEffect(() => {
    if (sucios.size === 0) return undefined;
    function antesDeSalir(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", antesDeSalir);
    return () => window.removeEventListener("beforeunload", antesDeSalir);
  }, [sucios]);

  function actualizarLocal(id, cambios) {
    setCategorias((actual) => actual.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    setSucios((actual) => new Set(actual).add(id));
  }

  async function guardarFila(categoria, subcategoriasFinal) {
    if (!categoria.nombre?.trim()) {
      alert("La categoría necesita un nombre.");
      return;
    }
    // La dirección web (slug) no puede tener espacios, acentos ni quedar
    // vacía — si no, el enlace /categoria/... del sitio se rompía.
    const slugLimpio = slugificar(categoria.slug || categoria.nombre);
    setGuardandoId(categoria.id);
    const { error } = await supabase
      .from("categorias")
      .update({
        nombre: categoria.nombre.trim(),
        slug: slugLimpio,
        imagen: categoria.imagen,
        imagen_pos_x: categoria.imagen_pos_x ?? 50,
        imagen_pos_y: categoria.imagen_pos_y ?? 50,
        imagen_zoom: categoria.imagen_zoom ?? 1,
        orden: categoria.orden,
        subcategorias: subcategoriasFinal ?? categoria.subcategorias ?? [],
      })
      .eq("id", categoria.id);
    setGuardandoId(null);
    if (error) {
      alert(
        `No se pudo guardar: ${error.message}` +
          (/column/i.test(error.message) ? "\n\n¿Ya corriste supabase/fase_1_19_beneficios_y_zoom.sql en tu Supabase?" : "")
      );
      return;
    }
    setCategorias((actual) => actual.map((c) => (c.id === categoria.id ? { ...c, slug: slugLimpio } : c)));
    setSucios((actual) => {
      const nuevo = new Set(actual);
      nuevo.delete(categoria.id);
      return nuevo;
    });
    setGuardadoId(categoria.id);
    setTimeout(() => setGuardadoId((id) => (id === categoria.id ? null : id)), 2200);
  }

  // Cambia el orden en que salen las categorías en el sitio (◀ ▶).
  async function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= categorias.length) return;
    const nueva = [...categorias];
    [nueva[indice], nueva[destino]] = [nueva[destino], nueva[indice]];
    const renumerada = nueva.map((c, i) => ({ ...c, orden: i }));
    const cambiadas = renumerada.filter((c) => categorias.find((x) => x.id === c.id)?.orden !== c.orden);
    setCategorias(renumerada);
    const resultados = await Promise.all(
      cambiadas.map((c) => supabase.from("categorias").update({ orden: c.orden }).eq("id", c.id))
    );
    const fallo = resultados.find((r) => r.error);
    if (fallo) {
      alert(`No se pudo guardar el nuevo orden: ${fallo.error.message}`);
      cargar();
    }
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Categorías</h1>
          <p className="text-sm text-ink-muted mt-0.5">Se muestran en el sitio en este orden — usa ◀ ▶ para moverlas.</p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className={mostrarForm ? "btn-admin-secondary" : "btn-admin-primary"}
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

      {cargando && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="esqueleto h-72" />
          ))}
        </div>
      )}
      {error && <p className="text-terracota text-lg">Error: {error}</p>}

      {!cargando && !error && categorias.length === 0 && !mostrarForm && (
        <div className="admin-card p-8 text-center text-ink-muted">Todavía no hay categorías. Crea la primera con "+ Nueva categoría".</div>
      )}

      {!cargando && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((cat, i) => (
            <TarjetaCategoria
              key={cat.id}
              categoria={cat}
              sucio={sucios.has(cat.id)}
              recienGuardado={guardadoId === cat.id}
              onMover={(dir) => mover(i, dir)}
              esPrimera={i === 0}
              esUltima={i === categorias.length - 1}
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

function TarjetaCategoria({
  categoria,
  guardando,
  subiendo,
  sucio,
  recienGuardado,
  onMover,
  esPrimera,
  esUltima,
  onCambiar,
  onGuardar,
  onSubirImagen,
  onBorrar,
}) {
  // El texto que se está escribiendo para una subcategoría nueva vive
  // aquí (no dentro de EditorSubcategorias) para que el botón
  // "Guardar" de la tarjeta pueda incluirlo aunque el admin no haya
  // presionado "+ Añadir" — antes, si escribías el nombre y le dabas
  // directo a "Guardar", esa subcategoría se perdía silenciosamente.
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState("");

  const posX = categoria.imagen_pos_x ?? 50;
  const posY = categoria.imagen_pos_y ?? 50;
  const zoom = categoria.imagen_zoom ?? 1;

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
      {!categoria.imagen ? (
        <label className="relative aspect-[4/3] flex items-center justify-center cursor-pointer text-sm font-semibold text-ink-muted bg-carbon hover:text-ink">
          <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => onSubirImagen(e.target.files?.[0])} />
          {subiendo ? "Subiendo…" : "📷 + Subir imagen"}
        </label>
      ) : (
        // Arrastra la foto para acomodarla y usa el zoom para acercarla —
        // igual se ve en el sitio (Inicio y Catálogo).
        <div className="p-2 pb-0">
          <EncuadreFoto
            url={categoria.imagen}
            x={posX}
            y={posY}
            zoom={zoom}
            aspecto="aspect-[4/3]"
            onCambiar={({ x, y, zoom: z }) => onCambiar({ imagen_pos_x: x, imagen_pos_y: y, imagen_zoom: z })}
          >
            <label
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute top-1.5 right-1.5 z-10 min-h-[40px] px-2.5 rounded-control bg-black/60 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold cursor-pointer flex items-center"
              title="Cambiar imagen"
            >
              <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => onSubirImagen(e.target.files?.[0])} />
              📷 Cambiar
            </label>
            {subiendo && (
              <span className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-white text-xs font-semibold pointer-events-none">
                Subiendo…
              </span>
            )}
          </EncuadreFoto>
        </div>
      )}

      <div className="p-3 flex flex-col gap-2">
        <input
          type="text"
          value={categoria.nombre}
          onChange={(e) => onCambiar({ nombre: e.target.value })}
          className="bg-transparent text-ink font-bold text-lg outline-none border-b border-carbon-border/60 focus:border-gold/60 pb-1 transition-colors"
          aria-label="Nombre de la categoría"
        />
        <label className="flex items-center gap-1 text-sm text-ink-muted">
          <span className="shrink-0">/categoria/</span>
          <input
            type="text"
            value={categoria.slug}
            onChange={(e) => onCambiar({ slug: e.target.value })}
            className="flex-1 min-w-0 bg-transparent text-ink-muted text-base outline-none border-b border-transparent focus:border-carbon-border pb-0.5"
            aria-label="Dirección web de la categoría"
            title="Dirección web de la categoría (sin espacios ni acentos — se corrige sola al guardar)"
          />
        </label>

        <EditorSubcategorias
          subcategorias={categoria.subcategorias ?? []}
          onCambiar={(subcategorias) => onCambiar({ subcategorias })}
          nuevaSubcategoria={nuevaSubcategoria}
          onCambiarNuevaSubcategoria={setNuevaSubcategoria}
        />

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-carbon-border/60">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMover(-1)}
              disabled={esPrimera}
              aria-label="Mover antes"
              className="w-10 h-10 rounded-control text-ink-muted hover:text-ink hover:bg-white/5 disabled:opacity-20"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => onMover(1)}
              disabled={esUltima}
              aria-label="Mover después"
              className="w-10 h-10 rounded-control text-ink-muted hover:text-ink hover:bg-white/5 disabled:opacity-20"
            >
              ▶
            </button>
            <button type="button" onClick={onBorrar} className="min-h-tap px-2 text-terracota text-sm font-semibold hover:underline">
              Borrar
            </button>
          </div>
          <div className="flex items-center gap-2">
            {recienGuardado && <span className="text-sm text-green-400 font-semibold">✓ Guardado</span>}
            {sucio && !recienGuardado && <span className="text-xs text-gold font-semibold hidden sm:inline">● Sin guardar</span>}
            <button
              type="button"
              onClick={handleGuardarClick}
              disabled={guardando}
              className={[
                "min-h-tap px-4 rounded-control text-sm font-bold disabled:opacity-60 transition",
                sucio ? "bg-gold text-carbon shadow-md shadow-gold/20" : "bg-carbon border border-carbon-border text-ink-muted",
              ].join(" ")}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
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
              className="inline-flex items-center gap-1 bg-carbon border border-carbon-border rounded-full pl-3 pr-1 py-0.5 text-sm text-ink"
            >
              {s}
              <button
                type="button"
                onClick={() => quitar(s)}
                className="w-7 h-7 rounded-full text-terracota font-bold text-base hover:bg-terracota/15 transition-colors leading-none"
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
          className="flex-1 min-w-0 min-h-[40px] bg-carbon border border-carbon-border rounded-control px-3 py-1 text-base text-ink outline-none focus:border-gold/60 transition-colors duration-150"
        />
        <button
          type="button"
          onClick={agregar}
          className="shrink-0 min-h-[40px] px-3 rounded-control border border-carbon-border text-ink-muted text-sm font-bold hover:border-gold/50 hover:text-ink transition-colors duration-150"
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
        <label className="text-xs text-ink-muted">Dirección web (opcional)</label>
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
