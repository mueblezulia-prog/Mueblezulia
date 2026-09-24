import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getCroppedImageBlob } from "../lib/cropImage";
import { convertirSiEsHeic } from "../lib/heic";
import { optimizarBlob } from "../lib/imagenOptimizada";
import ImageCropModule from "./ImageCropModule";
import GaleriaImagenes from "./GaleriaImagenes";
import SelectorTelas from "./SelectorTelas";
import SelectorTelaReal from "./SelectorTelaReal";
import EtiquetasSelector from "./EtiquetasSelector";
import PreviewModal from "./PreviewModal";
import MejorarConIA from "./MejorarConIA";

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
  const [subcategoria, setSubcategoria] = useState(productoExistente?.subcategoria ?? "");
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    supabase
      .from("categorias")
      .select("id, nombre, subcategorias")
      .order("orden")
      .then(({ data, error }) => {
        if (!error && data) setCategorias(data);
      });
  }, []);

  // Lista de subcategorías de la categoría elegida (si tiene). Si se
  // cambia a una categoría sin esa subcategoría, se limpia sola para
  // no guardar una subcategoría que ya no corresponde.
  const categoriaSeleccionada = categorias.find((c) => String(c.id) === String(categoriaId));
  const subcategoriasDisponibles = categoriaSeleccionada?.subcategorias ?? [];

  useEffect(() => {
    // BUG corregido: antes este efecto corría apenas se montaba el
    // formulario, ANTES de que "categorias" terminara de cargar desde
    // Supabase — en ese instante "subcategoriasDisponibles" siempre
    // estaba vacío, así que borraba la subcategoría ya guardada del
    // mueble aunque fuera válida. Ahora espera a que las categorías
    // hayan cargado antes de decidir si hay que limpiarla.
    if (categorias.length === 0) return;
    if (subcategoria && !subcategoriasDisponibles.includes(subcategoria)) {
      setSubcategoria("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaId, categorias]);

  const [imagenOriginalUrl, setImagenOriginalUrl] = useState(productoExistente?.imagen_original_url ?? null);
  const [imagenOriginalFile, setImagenOriginalFile] = useState(null);
  // Encuadre guardado de la foto (posición y zoom). BUG corregido: antes
  // no se guardaba ni se le pasaba al recortador, así que al EDITAR un
  // mueble la foto se volvía a recortar centrada y con zoom 1 cada vez que
  // se tocaba "Guardar" — se perdía el encuadre que habías hecho.
  // Se usa el ÁREA recortada en pixeles de la foto (no la posición en
  // pantalla), así el encuadre se recupera igual en celular o computador.
  const areaGuardada = productoExistente?.crop_data?.croppedAreaPixels ?? null;
  const [cropState, setCropState] = useState({
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: areaGuardada,
    aspecto: productoExistente?.crop_data?.aspecto ?? 4 / 5,
  });
  const navigate = useNavigate();

  const [fotos, setFotos] = useState([]);
  const [telasSeleccionadas, setTelasSeleccionadas] = useState([]);
  const [telaColorId, setTelaColorId] = useState(productoExistente?.tela_color_id ?? null);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([]);
  const [disponibleTodasTelas, setDisponibleTodasTelas] = useState(productoExistente?.disponible_todas_telas ?? false);
  const [colorAEleccion, setColorAEleccion] = useState(productoExistente?.color_a_eleccion ?? false);
  const [disponibleEntrega, setDisponibleEntrega] = useState(productoExistente?.disponible_entrega ?? true);
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

  // Carga las etiquetas ya asignadas a este producto al editarlo.
  useEffect(() => {
    if (!productoExistente?.id) return;
    let activo = true;
    supabase
      .from("producto_etiquetas")
      .select("etiqueta_id")
      .eq("producto_id", productoExistente.id)
      .then(({ data, error }) => {
        if (activo && !error && data) {
          setEtiquetasSeleccionadas(data.map((f) => f.etiqueta_id).filter(Boolean));
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

  // ---- Aviso de cambios sin guardar ----
  // Se compara lo que hay en el formulario con cómo estaba al abrirlo; si
  // hay diferencias y se intenta cerrar/recargar la pestaña, el navegador
  // pregunta antes (antes se perdía todo sin avisar).
  const yaGuardadoRef = useRef(false);
  const fotoInstantanea = JSON.stringify([
    titulo, String(precio), descripcionCorta, descripcionLarga, medida, String(categoriaId), subcategoria,
    telaColorId, disponibleTodasTelas, colorAEleccion, disponibleEntrega, !!imagenOriginalFile,
  ]);
  const instantaneaInicial = useRef(fotoInstantanea);
  const sucio =
    fotoInstantanea !== instantaneaInicial.current ||
    (!!productoExistente && !!areaGuardada && areaDistinta(cropState.croppedAreaPixels, areaGuardada));
  useEffect(() => {
    if (!sucio) return undefined;
    function antesDeSalir(e) {
      if (yaGuardadoRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", antesDeSalir);
    return () => window.removeEventListener("beforeunload", antesDeSalir);
  }, [sucio]);

  function confirmarSalida(e) {
    if (sucio && !yaGuardadoRef.current && !window.confirm("Tienes cambios sin guardar. ¿Salir de todas formas?")) {
      e.preventDefault();
    }
  }

  // Libera la foto temporal anterior al cambiarla o al salir del formulario.
  const urlTemporalRef = useRef(null);
  useEffect(() => () => urlTemporalRef.current && URL.revokeObjectURL(urlTemporalRef.current), []);

  async function handleSubirImagen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorImagen(null);
    try {
      const fileListo = await convertirSiEsHeic(file);
      if (urlTemporalRef.current) URL.revokeObjectURL(urlTemporalRef.current);
      const url = URL.createObjectURL(fileListo);
      urlTemporalRef.current = url;
      setImagenOriginalFile(fileListo);
      setImagenOriginalUrl(url);
    } catch (err) {
      setErrorImagen(`No se pudo procesar la foto: ${err.message}`);
    }
  }

  async function subirOriginalSiHaceFalta() {
    if (!imagenOriginalFile) return imagenOriginalUrl; // ya existía, no cambió
    const listo = await optimizarBlob(imagenOriginalFile);
    const extension = listo.type === "image/webp" ? "webp" : "jpg";
    const nombreArchivo = `originales/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, listo, { contentType: listo.type || "image/jpeg" });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
  }

  // ¿Cambió la foto o el encuadre respecto a lo guardado?
  const encuadreCambio = !productoExistente || !!imagenOriginalFile || areaDistinta(cropState.croppedAreaPixels, areaGuardada);

  async function generarYSubirRecorte(urlOriginalFinal) {
    // Si no se cambió ni la foto ni el encuadre, se reutiliza el recorte
    // que ya estaba guardado (no se vuelve a recortar ni a subir).
    if (!cropState.croppedAreaPixels || (!encuadreCambio && productoExistente?.imagen_recortada_url)) {
      return productoExistente?.imagen_recortada_url ?? urlOriginalFinal;
    }
    const recorte = await getCroppedImageBlob(imagenOriginalUrl, cropState.croppedAreaPixels);
    const blob = await optimizarBlob(recorte);
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const nombreArchivo = `recortes/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, blob, {
      contentType: blob.type || "image/jpeg",
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
      medida,
      disponible_todas_telas: disponibleTodasTelas,
      color_a_eleccion: colorAEleccion,
      disponible_entrega: disponibleEntrega,
      // Si no se cambió la foto ni el encuadre, se muestra el recorte ya
      // guardado (lo que de verdad ve el cliente); si no, la foto nueva.
      imagen_recortada_url:
        !encuadreCambio && productoExistente?.imagen_recortada_url ? productoExistente.imagen_recortada_url : imagenOriginalUrl,
    };
  }

  // Espera (con reintentos cortos) a que el producto recién creado sea
  // visible antes de escribirle filas relacionadas (colores, fotos). Esto
  // evita el error "violates foreign key constraint producto_colores_
  // producto_id_fkey" si por cualquier motivo la fila tarda un instante en
  // quedar visible para la siguiente petición.
  async function esperarProductoVisible(id) {
    for (let intento = 0; intento < 3; intento++) {
      const { data } = await supabase.from("productos").select("id").eq("id", id).maybeSingle();
      if (data) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  }

  // Reemplaza las telas asignadas a este producto (borra + inserta,
  // copiando nombre/hex del catálogo global para que el detalle del
  // cliente no tenga que ir a buscarlos aparte). Lanza si falla, pero
  // no bloquea el guardado de las fotos (ver Promise.allSettled arriba).
  async function guardarColores(productoId) {
    const { error: errorBorrar } = await supabase.from("producto_colores").delete().eq("producto_id", productoId);
    if (errorBorrar) throw errorBorrar;
    if (!telasSeleccionadas.length) return;
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

  // Reemplaza las etiquetas asignadas a este producto (borra + inserta).
  async function guardarEtiquetas(productoId) {
    const { error: errorBorrar } = await supabase.from("producto_etiquetas").delete().eq("producto_id", productoId);
    if (errorBorrar) throw errorBorrar;
    if (!etiquetasSeleccionadas.length) return;
    const filas = etiquetasSeleccionadas.map((etiquetaId) => ({
      producto_id: productoId,
      etiqueta_id: etiquetaId,
    }));
    const { error } = await supabase.from("producto_etiquetas").insert(filas);
    if (error) throw error;
  }

  // Reemplaza la galería de fotos del producto (las fotos ya están subidas
  // a Storage — aquí solo se guarda la lista final + orden).
  async function guardarFotos(productoId) {
    const { error: errorBorrar } = await supabase.from("producto_imagenes").delete().eq("producto_id", productoId);
    if (errorBorrar) throw errorBorrar;
    if (!fotos.length) return;
    const filasFotos = fotos.map((f, i) => ({
      producto_id: productoId,
      url: f.url,
      orden: i,
    }));
    const { error } = await supabase.from("producto_imagenes").insert(filasFotos);
    if (error) throw error;
  }

  async function handleGuardar() {
    if (guardando) return; // evita guardar dos veces con doble toque
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
        titulo: titulo.trim(),
        precio: Number(precio),
        descripcion_corta: descripcionCorta,
        descripcion_larga: descripcionLarga,
        medida: medida || null,
        categoria_id: categoriaId ? Number(categoriaId) : null,
        subcategoria: subcategoria || null,
        tela_color_id: telaColorId || null,
        disponible_todas_telas: disponibleTodasTelas,
        color_a_eleccion: colorAEleccion,
        disponible_entrega: disponibleEntrega,
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
        // Solo para productos nuevos: confirma que la fila ya es visible
        // antes de intentar escribir colores/fotos que dependen de ella.
        await esperarProductoVisible(productoId);
      }

      // Colores y fotos se guardan por separado (Promise.allSettled): si uno
      // de los dos falla, el otro se guarda igual — antes, un error en las
      // telas impedía que las fotos de la galería llegaran a guardarse.
      const [resultadoColores, resultadoFotos, resultadoEtiquetas] = await Promise.allSettled([
        guardarColores(productoId),
        guardarFotos(productoId),
        guardarEtiquetas(productoId),
      ]);

      const advertencias = [];
      if (resultadoColores.status === "rejected") {
        advertencias.push(`colores (${resultadoColores.reason.message})`);
      }
      if (resultadoFotos.status === "rejected") {
        advertencias.push(`fotos de la galería (${resultadoFotos.reason.message})`);
      }
      if (resultadoEtiquetas.status === "rejected") {
        advertencias.push(`etiquetas (${resultadoEtiquetas.reason.message})`);
      }

      yaGuardadoRef.current = true;
      if (advertencias.length) {
        // No se sale del formulario: así se ve el aviso y se puede
        // volver a tocar "Guardar" (antes se iba directo a la lista y el
        // aviso nunca se llegaba a ver).
        setMensaje(
          `Advertencia: el mueble se guardó, pero no se pudo guardar: ${advertencias.join(" y ")}. Vuelve a tocar "Guardar" en unos segundos.`
        );
        if (!productoExistente) {
          onGuardado?.(productoId, {
            tipo: "advertencia",
            texto: `"${titulo.trim()}" se creó, pero no se pudo guardar: ${advertencias.join(" y ")}. Ábrelo con "Editar" y toca "Guardar" de nuevo.`,
          });
        }
      } else {
        onGuardado?.(productoId, {
          tipo: "ok",
          texto: `✓ "${titulo.trim()}" se guardó correctamente.`,
        });
      }
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:pb-10 flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <Link to="/admin/productos" onClick={confirmarSalida} className="text-sm text-ink-muted hover:text-ink font-semibold">
            ← Muebles
          </Link>
          <h1 className="text-2xl font-extrabold text-ink truncate">
            {productoExistente ? `${titulo || "Editar mueble"}` : "Nuevo mueble"}
          </h1>
          {sucio && <p className="text-sm text-gold font-semibold">● Cambios sin guardar</p>}
        </div>
        {/* En computador los botones van arriba; en el celular, en una
            barra fija abajo (a mano del pulgar, sin tener que subir). */}
        <div className="hidden lg:flex gap-3">
          <button
            type="button"
            onClick={() => setPreviewAbierto(true)}
            disabled={!imagenOriginalUrl || !titulo}
            className="btn-admin-secondary"
          >
            Previsualizar 👁
          </button>
          <button type="button" onClick={handleGuardar} disabled={guardando} className="btn-admin-primary">
            {guardando ? "Guardando…" : "💾 Guardar"}
          </button>
        </div>
      </div>

      {mensaje && (
        <div
          role="status"
          className={[
            "rounded-control border px-4 py-3 text-base",
            mensaje.startsWith("Error")
              ? "border-terracota/50 bg-terracota/10 text-ink"
              : "border-gold/50 bg-gold/10 text-ink",
          ].join(" ")}
        >
          {mensaje.replace(/^Error: /, "⚠️ ")}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna izquierda: imagen y recorte */}
        <div className="flex flex-col gap-4">
          <label className="min-h-tap flex items-center justify-center gap-2 rounded-control border-2 border-dashed border-carbon-border text-ink font-semibold cursor-pointer hover:border-gold/60 transition-colors">
            <input type="file" accept="image/*,.heic,.heif" onChange={handleSubirImagen} className="hidden" />
            📷 {imagenOriginalUrl ? "Cambiar foto principal" : "Subir foto principal del mueble"}
          </label>
          {errorImagen && <p className="text-terracota text-sm">{errorImagen}</p>}

          {/* `key`: al subir una foto nueva, el recortador arranca de cero
              (centrado); al editar, arranca con el encuadre guardado. */}
          <ImageCropModule
            key={imagenOriginalUrl ?? "sin-foto"}
            imagenOriginalUrl={imagenOriginalUrl}
            areaInicial={imagenOriginalFile ? null : areaGuardada}
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

          {subcategoriasDisponibles.length > 0 && (
            <Campo label="Subcategoría (opcional)">
              <select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                className="campo-input"
              >
                <option value="">Ninguna</option>
                {subcategoriasDisponibles.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Campo>
          )}

          <Campo label="Descripción Corta">
            <textarea
              rows={3}
              value={descripcionCorta}
              onChange={(e) => setDescripcionCorta(e.target.value)}
              className="campo-input resize-none"
            />
            <MejorarConIA texto={descripcionCorta} tipo="corta" onUsar={setDescripcionCorta} />
          </Campo>

          <Campo label="Descripción Larga">
            <textarea
              rows={5}
              value={descripcionLarga}
              onChange={(e) => setDescripcionLarga(e.target.value)}
              className="campo-input resize-none"
            />
            <MejorarConIA texto={descripcionLarga} tipo="larga" onUsar={setDescripcionLarga} />
          </Campo>

          <SelectorTelaReal
            telaColorId={telaColorId}
            onChange={setTelaColorId}
            onTambienAgregarDisponible={(id) =>
              setTelasSeleccionadas((actual) => (actual.includes(id) ? actual : [...actual, id]))
            }
          />

          <SelectorTelas
            seleccionadas={telasSeleccionadas}
            onChange={setTelasSeleccionadas}
            disponibleTodasTelas={disponibleTodasTelas}
            onCambiarTodasTelas={setDisponibleTodasTelas}
            colorAEleccion={colorAEleccion}
            onCambiarColorEleccion={setColorAEleccion}
            disponibleEntrega={disponibleEntrega}
            onCambiarDisponibleEntrega={setDisponibleEntrega}
          />

          <EtiquetasSelector seleccionadas={etiquetasSeleccionadas} onChange={setEtiquetasSeleccionadas} />

          <GaleriaImagenes fotos={fotos} onChange={setFotos} />
        </div>
      </div>

      {/* Barra fija de acciones — solo celular/tablet */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-dark border-x-0 border-b-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-5xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => setPreviewAbierto(true)}
            disabled={!imagenOriginalUrl || !titulo}
            className="btn-admin-secondary flex-1 px-3"
          >
            👁 Ver
          </button>
          <button type="button" onClick={handleGuardar} disabled={guardando} className="btn-admin-primary flex-[2]">
            {guardando ? "Guardando…" : sucio ? "💾 Guardar cambios" : "💾 Guardar"}
          </button>
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

/** ¿Dos áreas de recorte son distintas? (tolerancia de 2px por redondeo) */
function areaDistinta(a, b) {
  if (!a || !b) return !!a !== !!b;
  return ["x", "y", "width", "height"].some((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 2);
}

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
