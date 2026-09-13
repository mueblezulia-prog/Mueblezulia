import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getCroppedImageBlob } from "../lib/cropImage";
import { convertirSiEsHeic } from "../lib/heic";
import ImageCropModule from "./ImageCropModule";
import GaleriaImagenes from "./GaleriaImagenes";
import SelectorTelas from "./SelectorTelas";
import PreviewModal from "./PreviewModal";

const BUCKET = "productos";

/**
 * Formulario de alta/edición de mueble. Si `productoExistente` viene con
 * datos, el formulario se comporta como "editar"; si no, como "agregar".
 */
export default function ProductForm({ productoExistente, onGuardado }) {
  const [titulo, setTitulo] = useState(productoExistente?.titulo ?? "");
  const [precio, setPrecio] = useState(productoExistente?.precio ?? "");
  const [descripcionCorta, setDescripcionCorta] = useState(productoExistente?.descripcion_corta ?? "");
  const [descripcionLarga, setDescripcionLarga] = useState(productoExistente?.descripcion_larga ?? "");
  const [medida, setMedida] = useState(productoExistente?.medida ?? "");
  const [categoriaId, setCategoriaId] = useState(productoExistente?.categoria_id ?? "");
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    supabase
      .from("categorias")
      .select("id, nombre")
      .order("orden")
      .then(({ data, error }) => {
        if (!error && data) setCategorias(data);
      });
  }, []);

  const [imagenOriginalUrl, setImagenOriginalUrl] = useState(productoExistente?.imagen_original_url ?? null);
  const [imagenOriginalFile, setImagenOriginalFile] = useState(null);
  const [cropState, setCropState] = useState({
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: productoExistente?.crop_data?.croppedAreaPixels ?? null,
    aspecto: productoExistente?.crop_data?.aspecto ?? 4 / 5,
  });

  const [fotos, setFotos] = useState([]);
  const [telasSeleccionadas, setTelasSeleccionadas] = useState([]);
  const [previewAbierto, setPreviewAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Carga las telas ya asignadas a este producto al editarlo.
  useEffect(() => {
    if (!productoExistente?.id) return;
    let activo = true;
    supabase
      .from("producto_colores")
      .select("tela_id")
      .eq("producto_id", productoExistente.id)
      .then(({ data, error }) => {
        if (activo && !error && data) {
          setTelasSeleccionadas(data.map((f) => f.tela_id).filter(Boolean));
        }
      });
    return () => {
      activo = false;
    };
  }, [productoExistente?.id]);

  // Carga la galería existente (producto_imagenes) al editar un producto.
  useEffect(() => {
    if (!productoExistente?.id) return;
    let activo = true;
    supabase
      .from("producto_imagenes")
      .select("*")
      .eq("producto_id", productoExistente.id)
      .order("orden")
      .then(({ data, error }) => {
        if (activo && !error && data) setFotos(data);
      });
    return () => {
      activo = false;
    };
  }, [productoExistente?.id]);

  const [errorImagen, setErrorImagen] = useState(null);

  async function handleSubirImagen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorImagen(null);
    try {
      const fileListo = await convertirSiEsHeic(file);
      setImagenOriginalFile(fileListo);
      setImagenOriginalUrl(URL.createObjectURL(fileListo));
    } catch (err) {
      setErrorImagen(`No se pudo procesar la foto: ${err.message}`);
    }
  }

  async function subirOriginalSiHaceFalta() {
    if (!imagenOriginalFile) return imagenOriginalUrl; // ya existía, no cambió
    const nombreArchivo = `originales/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, imagenOriginalFile);
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
  }

  async function generarYSubirRecorte(urlOriginalFinal) {
    if (!cropState.croppedAreaPixels) {
      // No se tocó el cropper (ej. edición sin cambiar encuadre): reutiliza la existente
      return productoExistente?.imagen_recortada_url ?? urlOriginalFinal;
    }
    const blob = await getCroppedImageBlob(imagenOriginalUrl, cropState.croppedAreaPixels);
    const nombreArchivo = `recortes/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, blob, {
      contentType: "image/jpeg",
    });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
  }

  function construirProductoPreview() {
    return {
      id: productoExistente?.id ?? "preview",
      titulo,
      descripcion_corta: descripcionCorta,
      precio: precio || 0,
      // Mientras no se guarda, la vista previa usa el blob local (imagenOriginalUrl
      // apunta al object URL de la foto recién subida o a la ya guardada).
      imagen_recortada_url: imagenOriginalUrl,
    };
  }

  async function handleGuardar() {
    if (!titulo.trim()) {
      setMensaje("Error: el título es obligatorio.");
      return;
    }
    if (!precio || Number(precio) <= 0) {
      setMensaje("Error: ingresa un precio válido (mayor a 0).");
      return;
    }
    if (!imagenOriginalUrl) {
      setMensaje("Error: sube al menos una foto principal.");
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const urlOriginal = await subirOriginalSiHaceFalta();
      const urlRecortada = await generarYSubirRecorte(urlOriginal);

      const payload = {
        titulo,
        precio: Number(precio),
        descripcion_corta: descripcionCorta,
        descripcion_larga: descripcionLarga,
        medida: medida || null,
        categoria_id: categoriaId ? Number(categoriaId) : null,
        imagen_original_url: urlOriginal,
        imagen_recortada_url: urlRecortada,
        crop_data: {
          croppedAreaPixels: cropState.croppedAreaPixels,
          aspecto: cropState.aspecto,
        },
      };

      let productoId = productoExistente?.id;
      if (productoId) {
        const { error } = await supabase.from("productos").update(payload).eq("id", productoId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("productos").insert(payload).select("id").single();
        if (error) throw error;
        productoId = data.id;
      }

      // Reemplaza las telas asignadas a este producto (borra + inserta,
      // copiando nombre/hex del catálogo global para que el detalle del
      // cliente no tenga que ir a buscarlos aparte).
      await supabase.from("producto_colores").delete().eq("producto_id", productoId);
      if (telasSeleccionadas.length) {
        const { data: telasData, error: errorTelas } = await supabase
          .from("telas")
          .select("*")
          .in("id", telasSeleccionadas);
        if (errorTelas) throw errorTelas;
        const filasColores = (telasData ?? []).map((tela, i) => ({
          producto_id: productoId,
          tela_id: tela.id,
          nombre: tela.nombre,
          hex: tela.hex,
          orden: i,
        }));
        const { error } = await supabase.from("producto_colores").insert(filasColores);
        if (error) throw error;
      }

      // Reemplaza la galería de fotos del producto (las fotos ya están
      // subidas a Storage — aquí solo se guarda la lista final + orden).
      await supabase.from("producto_imagenes").delete().eq("producto_id", productoId);
      if (fotos.length) {
        const filasFotos = fotos.map((f, i) => ({
          producto_id: productoId,
          url: f.url,
          orden: i,
        }));
        const { error } = await supabase.from("producto_imagenes").insert(filasFotos);
        if (error) throw error;
      }

      setMensaje("Guardado correctamente.");
      onGuardado?.(productoId);
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/productos" className="text-sm text-ink-muted hover:text-ink font-semibold">
            ← Muebles
          </Link>
          <h1 className="text-2xl font-extrabold text-ink">
            {productoExistente ? `${titulo || "Editar producto"}` : "Nuevo producto"}
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPreviewAbierto(true)}
            disabled={!imagenOriginalUrl || !titulo}
            className="min-h-tap px-5 rounded-control border-2 border-ink text-ink font-bold disabled:opacity-40"
          >
            Previsualizar 👁
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {mensaje && (
        <p className={mensaje.startsWith("Error") ? "text-terracota" : "text-gold"}>{mensaje}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna izquierda: imagen y recorte */}
        <div className="flex flex-col gap-4">
          <label className="min-h-tap flex items-center justify-center rounded-control border-2 border-dashed border-carbon-border text-ink-muted cursor-pointer">
            <input type="file" accept="image/*,.heic,.heif" onChange={handleSubirImagen} className="hidden" />
            {imagenOriginalUrl ? "Cambiar foto" : "Subir foto del mueble"}
          </label>
          {errorImagen && <p className="text-terracota text-sm">{errorImagen}</p>}

          <ImageCropModule
            imagenOriginalUrl={imagenOriginalUrl}
            onChange={(nuevo) => setCropState((s) => ({ ...s, ...nuevo }))}
          />
        </div>

        {/* Columna derecha: datos del producto */}
        <div className="flex flex-col gap-5">
          <Campo label="Título">
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="campo-input"
            />
          </Campo>

          <Campo label="Precio (USD)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="campo-input"
            />
          </Campo>

          <Campo label="Medida (opcional)">
            <input
              type="text"
              value={medida}
              onChange={(e) => setMedida(e.target.value)}
              placeholder="Ej: 180cm x 90cm x 80cm"
              className="campo-input"
            />
          </Campo>

          <Campo label="Categoría">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="campo-input"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Descripción Corta">
            <textarea
              rows={3}
              value={descripcionCorta}
              onChange={(e) => setDescripcionCorta(e.target.value)}
              className="campo-input resize-none"
            />
          </Campo>

          <Campo label="Descripción Larga">
            <textarea
              rows={5}
              value={descripcionLarga}
              onChange={(e) => setDescripcionLarga(e.target.value)}
              className="campo-input resize-none"
            />
          </Campo>

          <SelectorTelas seleccionadas={telasSeleccionadas} onChange={setTelasSeleccionadas} />

          <GaleriaImagenes fotos={fotos} onChange={setFotos} />
        </div>
      </div>

      <PreviewModal
        abierto={previewAbierto}
        onCerrar={() => setPreviewAbierto(false)}
        productoPreview={construirProductoPreview()}
      />
    </div>
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
