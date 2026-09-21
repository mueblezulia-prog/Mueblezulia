import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabaseClient";
import { convertirSiEsHeic } from "../lib/heic";
import { prepararImagen, optimizarBlob } from "../lib/imagenOptimizada";
import { getCroppedImageBlob } from "../lib/cropImage";
import { obtenerContenido, guardarContenido, CONTENIDO_DEFAULT, ALTOS_BLOQUE, ALTOS_MAX, TAMANOS_TITULO, COLORES_TEXTO } from "../lib/contenido";
import { sonidoConfirmar } from "../lib/sonido";
import FondoMultimedia from "../components/FondoMultimedia";
import BloqueContenido from "../components/BloqueContenido";

const BUCKET = "productos"; // mismo bucket que ya usan fotos de mueble y categorías

/** Sube un Blob YA recortado y optimizado (ver RecortadorContenido). */
async function subirBlobContenido(blob) {
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const nombreArchivo = `contenido/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
}

async function subirImagenContenido(file) {
  const fileListo = await prepararImagen(file);
  const extension = fileListo.type === "image/webp" ? "webp" : "jpg";
  const nombreArchivo = `contenido/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, fileListo, { contentType: fileListo.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
}

// Límite del video para que la página no cargue lenta en el celular del
// cliente — unos 15-20 segundos de buena calidad caben cómodo en 20MB.
const LIMITE_VIDEO_MB = 20;

async function subirVideoContenido(file) {
  if (file.size > LIMITE_VIDEO_MB * 1024 * 1024) {
    throw new Error(
      `El video pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB — el máximo es ${LIMITE_VIDEO_MB}MB para que cargue rápido en el celular. Prueba un video más corto o comprimido.`
    );
  }
  const extension = file.name?.split(".").pop()?.toLowerCase() || "mp4";
  const nombreArchivo = `contenido/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, file, { contentType: file.type || "video/mp4" });
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

  const [hero, setHero] = useState(CONTENIDO_DEFAULT.hero);
  const [sede, setSede] = useState(CONTENIDO_DEFAULT.nuestra_sede);
  const [metodos, setMetodos] = useState(CONTENIDO_DEFAULT.metodos_pago.metodos);
  const [bloquesHome, setBloquesHome] = useState([]);
  const [bloquesFabricacion, setBloquesFabricacion] = useState([]);
  const [bloquesUbicacion, setBloquesUbicacion] = useState([]);

  useEffect(() => {
    Promise.all([
      obtenerContenido("hero"),
      obtenerContenido("nuestra_sede"),
      obtenerContenido("fabricacion"),
      obtenerContenido("metodos_pago"),
      obtenerContenido("secciones_home"),
      obtenerContenido("secciones_fabricacion"),
      obtenerContenido("secciones_ubicacion"),
    ]).then(([h, s, fab, m, bh, bf, bu]) => {
      setHero(h);
      setSede(s);
      setMetodos(m.metodos ?? []);
      setBloquesHome(bh.bloques ?? []);
      setBloquesUbicacion(bu.bloques ?? []);

      // Migración de una sola vez: la vieja sección fija "Fabricación"
      // (título + texto + fotos del taller) pasa a ser la primera
      // sección editable de "secciones_fabricacion" — así queda con las
      // mismas opciones que las demás (cambiar tipo, borrar, reordenar),
      // sin perder lo que ya estaba guardado.
      //
      // IMPORTANTE: se controla con la bandera "migrado", NUNCA con "¿ya
      // existe un bloque con este id?" — antes usaba esa segunda forma, y
      // como cada "Guardar Secciones" reescribe todo el objeto guardado
      // (sin la bandera), al borrar esa sección y guardar, la próxima vez
      // que se abría el panel esta migración se disparaba OTRA VEZ y
      // recreaba la sección sola — por eso "Confort Insuperable" volvía a
      // aparecer aunque la borraras y guardaras. Con la bandera, una vez
      // migrado queda migrado para siempre, la borres o no.
      let bloquesFab = bf.bloques ?? [];
      let necesitaGuardar = false;
      if (!bf.migrado) {
        const bloqueLegado = {
          id: "fabricacion-legado",
          tipo: "galeria",
          titulo: fab.titulo ?? "",
          texto: fab.texto ?? "",
          imagenes: fab.imagenes ?? [],
          icono: "🏷️",
          animacionIcono: "suave",
          tinte: "dorado",
          alto: "mediano",
          ajusteImagen: fab.ajusteImagen ?? "cover",
          posicionImagen: "izquierda",
          modoPresentacion: false,
          vidrioSiempre: true,
        };
        bloquesFab = [bloqueLegado, ...bloquesFab];
        necesitaGuardar = true;
      }

      // Limpieza automática de una sola vez: por el error de arriba, en
      // sitios que ya tenían la migración repetida puede haber quedado
      // más de una sección con el MISMO título guardada por accidente
      // (el caso de "Confort Insuperable" duplicado). Se deja solo la
      // primera de cada título repetido — si de verdad quieres dos
      // secciones con el mismo título, cámbiale el nombre a una y no se
      // va a volver a tocar.
      const titulosVistos = new Set();
      const bloquesFabSinDuplicados = bloquesFab.filter((b) => {
        const clave = (b.titulo || "").trim().toLowerCase();
        if (!clave) return true;
        if (titulosVistos.has(clave)) return false;
        titulosVistos.add(clave);
        return true;
      });
      if (bloquesFabSinDuplicados.length !== bloquesFab.length) {
        bloquesFab = bloquesFabSinDuplicados;
        necesitaGuardar = true;
      }

      if (necesitaGuardar) {
        guardarContenido("secciones_fabricacion", { bloques: bloquesFab, migrado: true }).catch(() => {});
      }
      setBloquesFabricacion(bloquesFab);

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

      <SeccionHero hero={hero} onGuardado={setHero} />
      <SeccionSede sede={sede} onGuardado={setSede} />
      <SeccionMetodosPago metodos={metodos} onGuardado={setMetodos} />
      <SeccionBloques
        contenidoKey="secciones_ubicacion"
        titulo="Página de Ubicación — Secciones extra"
        descripcion='Agrega tanto contenido como quieras a la página "Ubicación": más fotos, más texto, banners — se muestran al final, debajo de "¿Tienes dudas?".'
        bloques={bloquesUbicacion}
        onGuardado={setBloquesUbicacion}
      />
      <SeccionBloques
        contenidoKey="secciones_fabricacion"
        titulo="Página de Fabricación"
        descripcion='La primera sección de la lista es la introducción ("Excelencia en Manufactura") — ya la puedes editar, cambiarle el tipo (a video, collage, etc.) o borrarla, igual que cualquier otra de aquí abajo. Agrega tantas más como quieras.'
        bloques={bloquesFabricacion}
        onGuardado={setBloquesFabricacion}
        espejoClave="fabricacion"
      />
      <SeccionBloques
        contenidoKey="secciones_home"
        titulo="Página de Inicio — Secciones extra"
        descripcion='Agrega tantas secciones como quieras a la página de inicio, en el orden que quieras. Se muestran debajo de "Excelencia en Manufactura".'
        bloques={bloquesHome}
        onGuardado={setBloquesHome}
      />
    </div>
  );
}

/* ------------------------------------------------------------ */
/* HERO — la franja principal de la página de inicio              */
/* ------------------------------------------------------------ */
function SeccionHero({ hero, onGuardado }) {
  const [form, setForm] = useState({ imagen: "/assets/fachada.jpg", video: "", tipoMedia: "foto", ...hero });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [subiendoVideo, setSubiendoVideo] = useState(false);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function elegirFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendiente(file);
  }

  async function fotoRecortadaLista(blob, aspectoCss) {
    try {
      const url = await subirBlobContenido(blob);
      setForm((f) => ({ ...f, imagen: url, aspecto: aspectoCss }));
    } catch (err) {
      setMensaje(`Error al subir la foto: ${err.message}`);
    } finally {
      setPendiente(null);
    }
  }

  async function handleSubirVideo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendoVideo(true);
    setMensaje(null);
    try {
      const url = await subirVideoContenido(file);
      cambiar("video", url);
    } catch (err) {
      setMensaje(`Error al subir el video: ${err.message}`);
    } finally {
      setSubiendoVideo(false);
    }
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarContenido("hero", form);
      onGuardado(form);
      sonidoConfirmar();
      setMensaje("Guardado correctamente.");
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-card p-5 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink">🏠 Portada (Inicio)</h2>
      <p className="text-sm text-ink-muted -mt-2">La franja principal que se ve primero al entrar al sitio.</p>

      <div className="relative h-40 rounded-control overflow-hidden border border-carbon-border bg-carbon">
        {form.tipoMedia === "video" && form.video ? (
          <video src={form.video} className="w-full h-full object-cover" muted loop autoPlay playsInline />
        ) : (
          <img src={form.imagen} alt="Fondo de la portada" className="w-full h-full object-cover" />
        )}
      </div>

      <Campo label="Tipo de fondo">
        <div className="flex gap-2">
          {[
            { valor: "foto", label: "Foto" },
            { valor: "video", label: "Video" },
          ].map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => cambiar("tipoMedia", o.valor)}
              className={[
                "flex-1 min-h-tap rounded-control border-2 text-sm font-semibold transition-all duration-150",
                (form.tipoMedia ?? "foto") === o.valor
                  ? "border-gold bg-gold/10 text-ink"
                  : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
              ].join(" ")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Campo>

      {form.tipoMedia === "video" ? (
        <Campo label={`Video (máximo ${LIMITE_VIDEO_MB}MB, se repite solo sin sonido)`}>
          <label className="btn-admin-secondary text-sm w-fit cursor-pointer">
            {subiendoVideo ? "Subiendo…" : form.video ? "Cambiar video" : "Subir video"}
            <input type="file" accept="video/*" className="hidden" onChange={handleSubirVideo} />
          </label>
        </Campo>
      ) : (
        <Campo label="Foto de fondo">
          <label className={`btn-admin-secondary text-sm w-fit ${pendiente ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
            {pendiente ? "Recortando…" : "Cambiar foto"}
            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={elegirFoto} disabled={!!pendiente} />
          </label>
          {pendiente && (
            <RecortadorContenido
              archivo={pendiente}
              aspectoInicial={16 / 9}
              onCancelar={() => setPendiente(null)}
              onListo={fotoRecortadaLista}
            />
          )}
        </Campo>
      )}

      <Campo label="Etiqueta pequeña">
        <input
          type="text"
          value={form.etiqueta}
          onChange={(e) => cambiar("etiqueta", e.target.value)}
          className="campo-input"
        />
      </Campo>

      <Campo label="Título grande">
        <input
          type="text"
          value={form.titulo}
          onChange={(e) => cambiar("titulo", e.target.value)}
          className="campo-input"
        />
      </Campo>

      <Campo label="Subtítulo">
        <input
          type="text"
          value={form.subtitulo}
          onChange={(e) => cambiar("subtitulo", e.target.value)}
          className="campo-input"
        />
      </Campo>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleGuardar} disabled={guardando} className="btn-admin-primary text-sm">
          {guardando ? "Guardando…" : "Guardar Portada"}
        </button>
        {mensaje && (
          <span className={mensaje.startsWith("Error") ? "text-terracota text-sm" : "text-gold text-sm"}>{mensaje}</span>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ */
/* NUESTRA SEDE — dirección, foto de fachada, textos             */
/* ------------------------------------------------------------ */
function SeccionSede({ sede, onGuardado }) {
  const [form, setForm] = useState({
    tipoMedia: "foto",
    alto: "grande",
    imagenes: sede.imagen ? [sede.imagen] : [],
    video: "",
    ...sede,
  });
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [colaFotos, setColaFotos] = useState([]);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function elegirFotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setColaFotos((c) => [...c, ...files.map((file) => ({ id: crypto.randomUUID(), file }))]);
  }

  /** Modo "Foto fija": solo existe UN espacio de foto — elegir una nueva
   * siempre REEMPLAZA la única que hay (nunca agrega un segundo espacio
   * invisible, que es lo que pasaba antes y hacía parecer que la foto
   * "se perdía"). */
  function elegirFotoUnica(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setColaFotos([{ id: crypto.randomUUID(), file, reemplazarIndice: 0 }]);
  }

  /** Vuelve a abrir el recortador sobre una foto YA subida, para ajustar
   * el encuadre sin tener que borrarla y subirla de nuevo desde cero. */
  async function recortarDeNuevo(i) {
    const url = (form.imagenes ?? [])[i];
    if (!url) return;
    setMensaje(null);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      setColaFotos((c) => [{ id: crypto.randomUUID(), file: blob, reemplazarIndice: i }, ...c]);
    } catch {
      setMensaje("No se pudo cargar esa foto para recortarla de nuevo. Intenta bajarla y subirla otra vez.");
    }
  }

  // Recibe el ítem de la cola que se acaba de recortar como parámetro
  // explícito (en vez de volver a leer colaFotos[0] adentro) — así no hay
  // forma de que quede desincronizado con cuál foto se subió. Y en vez de
  // quitarlo de la fila con .slice(1) (que asume que siempre es el
  // primero), lo quitamos buscando su "id" único — así nunca se puede
  // borrar por error el ítem equivocado de la fila de espera.
  async function fotoRecortadaLista(blob, aspectoCss, item) {
    setSubiendo(true);
    setMensaje(null);
    try {
      const url = await subirBlobContenido(blob);
      setForm((f) => {
        const anteriores = f.imagenes ?? [];
        let imagenes;
        if (item?.reemplazarIndice != null) {
          imagenes = [...anteriores];
          imagenes[item.reemplazarIndice] = url;
        } else {
          imagenes = [...anteriores, url];
        }
        console.log(
          `[Nuestra Sede] Foto subida. Antes: ${anteriores.length} foto(s). Después: ${imagenes.length} foto(s).`
        );
        return { ...f, imagenes, imagen: imagenes[0] ?? f.imagen, aspecto: aspectoCss };
      });
    } catch (err) {
      setMensaje(`Error al subir la foto: ${err.message}`);
    } finally {
      setSubiendo(false);
      setColaFotos((c) => c.filter((it) => it.id !== item?.id));
    }
  }

  // Segunda barrera de seguridad: mientras hay una foto en la fila de
  // espera (el recorte está abierto, aunque quede tapado por la ventana
  // de recorte), estos botones no deben poder tocar la lista de fotos ya
  // guardadas. La ventana de recorte YA los bloquea visualmente (ver
  // "pointer-events-none" más abajo), pero este chequeo extra evita
  // cualquier quite/movimiento accidental de una foto que ya estaba
  // puesta mientras se está subiendo/recortando otra.
  function quitarFoto(i) {
    if (colaFotos.length > 0) {
      console.warn("[Nuestra Sede] Se bloqueó un intento de quitar una foto mientras había un recorte en curso.");
      return;
    }
    setForm((f) => {
      const imagenes = (f.imagenes ?? []).filter((_, idx) => idx !== i);
      return { ...f, imagenes, imagen: imagenes[0] ?? f.imagen };
    });
  }

  function moverFoto(i, direccion) {
    if (colaFotos.length > 0) return;
    setForm((f) => {
      const imagenes = [...(f.imagenes ?? [])];
      const j = i + direccion;
      if (j < 0 || j >= imagenes.length) return f;
      [imagenes[i], imagenes[j]] = [imagenes[j], imagenes[i]];
      return { ...f, imagenes, imagen: imagenes[0] ?? f.imagen };
    });
  }

  async function handleSubirVideo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoVideo(true);
    setMensaje(null);
    try {
      const url = await subirVideoContenido(file);
      cambiar("video", url);
    } catch (err) {
      setMensaje(`Error al subir el video: ${err.message}`);
    } finally {
      setSubiendoVideo(false);
    }
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarContenido("nuestra_sede", form);
      onGuardado(form);
      sonidoConfirmar();
      setMensaje("Guardado correctamente.");
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  const imagenes = form.imagenes ?? [];
  const previewImagenes = form.tipoMedia === "diapositiva" ? imagenes : [imagenes[0] ?? form.imagen];

  return (
    <section className="admin-card p-5 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink flex items-center gap-2">
        <img src="/assets/icons/ubicacion.png" alt="" className="w-5 h-5" /> Nuestra Sede
      </h2>
      <p className="text-sm text-ink-muted -mt-2">
        Se usa en la página de Catálogo (fondo de categorías) y en Contacto (foto/video, dirección y mapa).
      </p>

      <div className="rounded-card overflow-hidden border border-carbon-border">
        <p className="text-xs font-semibold text-ink-muted bg-carbon-light px-3 py-1.5 border-b border-carbon-border">
          Vista previa — así se ve ahora mismo en el sitio
        </p>
        <div className="relative bg-carbon-light">
          <FondoMultimedia
            imagenes={previewImagenes}
            video={form.video}
            tipoMedia={form.tipoMedia}
            alto={form.aspecto ? (ALTOS_MAX[form.alto] ?? ALTOS_MAX.grande) : (ALTOS_BLOQUE[form.alto] ?? ALTOS_BLOQUE.grande)}
            ajuste={form.ajusteImagen === "contain" ? "object-contain bg-carbon" : "object-cover"}
            aspecto={form.aspecto}
            alt="Fachada de Muebles Zulia"
          />
          <div className="relative -mt-10 sm:-mt-14 glass p-5">
            <h3 className="text-lg font-bold text-ink mb-1">{form.titulo}</h3>
            <p className="text-ink-muted text-sm">{form.texto}</p>
          </div>
        </div>
      </div>

      <Campo label="Tipo de fondo">
        <div className="flex flex-wrap gap-2">
          {[
            { valor: "foto", label: "Foto fija" },
            { valor: "diapositiva", label: "Varias fotos (pasan solas)" },
            { valor: "video", label: "Video" },
          ].map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => cambiar("tipoMedia", o.valor)}
              className={[
                "flex-1 min-w-[130px] min-h-tap rounded-control border-2 text-sm font-semibold transition-all duration-150",
                (form.tipoMedia ?? "foto") === o.valor
                  ? "border-gold bg-gold/10 text-ink"
                  : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
              ].join(" ")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Campo>

      {form.tipoMedia === "video" ? (
        <Campo label={`Video (máximo ${LIMITE_VIDEO_MB}MB, se repite solo sin sonido)`}>
          <div className="flex flex-col gap-2">
            {form.video && (
              <video src={form.video} className="w-full h-40 rounded-control object-cover border border-carbon-border" muted loop autoPlay playsInline />
            )}
            <label className="btn-admin-secondary text-sm w-fit cursor-pointer">
              {subiendoVideo ? "Subiendo…" : form.video ? "Cambiar video" : "Subir video"}
              <input type="file" accept="video/*" className="hidden" onChange={handleSubirVideo} />
            </label>
          </div>
        </Campo>
      ) : form.tipoMedia === "diapositiva" ? (
        <Campo label="Fotos (pasan solas en ese orden)">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gold">
              {imagenes.length} foto{imagenes.length === 1 ? "" : "s"} guardada{imagenes.length === 1 ? "" : "s"} ahora mismo
            </p>
            {mensaje && (
              <p className={`text-xs font-semibold ${mensaje.startsWith("Error") ? "text-red-400" : "text-ink-muted"}`}>{mensaje}</p>
            )}
            {/* Mientras hay una foto en pleno recorte (el modal "Encuadra tu
                foto" tapa la pantalla), esta cuadrícula queda BLOQUEADA por
                completo (ni un clic la puede tocar) — así ninguna foto ya
                puesta se puede quitar o mover sin querer mientras el modal
                está encima. */}
            <div
              className={`grid grid-cols-3 sm:grid-cols-4 gap-2 ${colaFotos.length > 0 ? "pointer-events-none opacity-50" : ""}`}
            >
              {imagenes.map((url, i) => (
                <div key={url + i} className="relative rounded-control overflow-hidden border border-carbon-border h-24 group">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => quitarFoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Quitar foto"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    onClick={() => recortarDeNuevo(i)}
                    className="absolute top-1 left-1 px-1.5 h-6 rounded bg-black/60 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Recortar esta foto de nuevo"
                  >
                    ✂ Recortar
                  </button>
                  {imagenes.length > 1 && (
                    <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => moverFoto(i, -1)} disabled={i === 0} className="w-6 h-6 rounded bg-black/60 text-white text-xs disabled:opacity-30">←</button>
                      <button type="button" onClick={() => moverFoto(i, 1)} disabled={i === imagenes.length - 1} className="w-6 h-6 rounded bg-black/60 text-white text-xs disabled:opacity-30">→</button>
                    </div>
                  )}
                </div>
              ))}
              <label
                className={[
                  "h-24 rounded-control border-2 border-dashed flex items-center justify-center text-sm transition-colors",
                  colaFotos.length > 0
                    ? "border-carbon-border/50 text-ink-muted/50 pointer-events-none"
                    : "border-carbon-border text-ink-muted cursor-pointer hover:border-gold hover:text-ink",
                ].join(" ")}
              >
                {subiendo ? "Subiendo…" : colaFotos.length > 0 ? "Recortando…" : "+ Añadir"}
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={elegirFotos}
                  disabled={colaFotos.length > 0}
                />
              </label>
            </div>
            {colaFotos.length > 0 && (
              <RecortadorContenido
                key={colaFotos[0].id}
                archivo={colaFotos[0].file}
                aspectoInicial={16 / 9}
                onCancelar={() => setColaFotos((c) => c.filter((it) => it.id !== colaFotos[0].id))}
                onListo={(blob, aspectoCss) => fotoRecortadaLista(blob, aspectoCss, colaFotos[0])}
              />
            )}
            {colaFotos.length > 1 && (
              <p className="text-xs text-ink-muted">
                Hay {colaFotos.length} fotos esperando a ser recortadas, una por una.
              </p>
            )}
          </div>
        </Campo>
      ) : (
        // Modo "Foto fija": UN solo espacio de foto (igual que el banner) —
        // elegir una nueva SIEMPRE reemplaza la que había, nunca queda un
        // segundo espacio que no se ve en ningún lado.
        <Campo label="Foto">
          <div className="flex flex-col gap-2">
            <label
              className={`relative w-full h-32 rounded-control overflow-hidden bg-carbon-light border border-carbon-border block ${
                colaFotos.length > 0 ? "pointer-events-none opacity-60" : "cursor-pointer group"
              }`}
            >
              {imagenes[0] && <img src={imagenes[0]} alt="Foto de Nuestra Sede" className="w-full h-full object-cover" />}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/55 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200">
                {subiendo ? "Subiendo…" : colaFotos.length > 0 ? "Recortando…" : imagenes[0] ? "Cambiar foto" : "+ Subir foto"}
              </span>
              <input
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={elegirFotoUnica}
                disabled={colaFotos.length > 0}
              />
            </label>
            {imagenes[0] && (
              <button type="button" onClick={() => recortarDeNuevo(0)} className="btn-admin-secondary text-xs w-fit">
                ✂ Recortar de nuevo (misma foto)
              </button>
            )}
            {colaFotos.length > 0 && (
              <RecortadorContenido
                key={colaFotos[0].id}
                archivo={colaFotos[0].file}
                aspectoInicial={16 / 9}
                onCancelar={() => setColaFotos((c) => c.filter((it) => it.id !== colaFotos[0].id))}
                onListo={(blob, aspectoCss) => fotoRecortadaLista(blob, aspectoCss, colaFotos[0])}
              />
            )}
          </div>
        </Campo>
      )}

      <Campo label="Tamaño del fondo">
        <SelectorAlto valor={form.alto} onCambiar={(v) => cambiar("alto", v)} />
      </Campo>

      <Campo label="Ajuste de la foto/video">
        <SelectorAjuste valor={form.ajusteImagen} onCambiar={(v) => cambiar("ajusteImagen", v)} />
      </Campo>
      <p className="text-xs text-ink-muted -mt-2">
        El encuadre (qué parte de la foto se ve) ya se ajusta al recortarla arriba, con el recuadro de "Encuadra tu foto".
      </p>

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

      <Campo label="Enlace de Google Maps (botón 'Compartir' → 'Copiar enlace' en la app de Maps)">
        <input
          type="text"
          value={form.enlaceMaps ?? ""}
          onChange={(e) => cambiar("enlaceMaps", e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
          className="campo-input"
        />
      </Campo>

      <Campo label="Horario (como en la ficha de Google Maps)">
        <input
          type="text"
          value={form.horario ?? ""}
          onChange={(e) => cambiar("horario", e.target.value)}
          placeholder="Todos los días: 9:00 a.m. – 5:25 p.m."
          className="campo-input"
        />
      </Campo>

      <Campo label="Coordenadas exactas (para que el mapa apunte al local, no a un vecino)">
        <input
          type="text"
          value={form.coordenadas ?? ""}
          onChange={(e) => cambiar("coordenadas", e.target.value)}
          placeholder="10.6804354,-71.6224744"
          className="campo-input"
        />
      </Campo>
      <p className="text-xs text-ink-muted -mt-3">
        Para sacarlas: abre el enlace de Google Maps de arriba en el navegador, toca el nombre del negocio y luego
        "Compartir" → copia el enlace; los dos números después de "@" son las coordenadas (ej. 10.6804354,-71.6224744).
      </p>

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


/**
 * Ventana de recorte para fotos de "Contenido del Sitio" — el mismo tipo
 * de herramienta que ya usa el formulario de productos (arrastrar para
 * mover, deslizar para acercar/alejar), solo que aquí el admin también
 * elige la proporción del marco (ancho, vertical o cuadrado) según para
 * qué es la foto. Al confirmar, devuelve el recorte YA optimizado
 * (liviano, en WebP) listo para subir.
 */
/** Convierte la proporción numérica (16/9, 4/5, 1) al texto CSS que espera "aspect-ratio". */
function aspectoACss(valor) {
  if (Math.abs(valor - 16 / 9) < 0.001) return "16 / 9";
  if (Math.abs(valor - 4 / 5) < 0.001) return "4 / 5";
  if (Math.abs(valor - 1) < 0.001) return "1 / 1";
  return String(valor);
}

function RecortadorContenido({ archivo, aspectoInicial = 16 / 9, onCancelar, onListo }) {
  const [archivoListo, setArchivoListo] = useState(null);
  const [urlOriginal, setUrlOriginal] = useState(null);
  const [error, setError] = useState(null);
  const [aspecto, setAspecto] = useState(aspectoInicial);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixeles, setAreaPixeles] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    let activo = true;
    let url;
    convertirSiEsHeic(archivo)
      .then((listo) => {
        if (!activo) return;
        url = URL.createObjectURL(listo);
        setArchivoListo(listo);
        setUrlOriginal(url);
      })
      .catch((err) => activo && setError(err.message));
    return () => {
      activo = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivo]);

  async function confirmar() {
    if (!urlOriginal) return;
    setProcesando(true);
    setError(null);
    try {
      const recorte = areaPixeles ? await getCroppedImageBlob(urlOriginal, areaPixeles) : archivoListo;
      const listo = await optimizarBlob(recorte);
      // Le pasamos también la proporción elegida (como texto CSS, ej.
      // "16 / 9") para que el marco donde se muestre la foto use ESA
      // misma proporción en vez de una altura fija — así lo que se
      // recortó acá es exactamente lo que se ve después, completo, sin
      // que un contenedor angosto la recorte una segunda vez.
      onListo(listo, aspectoACss(aspecto));
    } catch (err) {
      setError(`No se pudo recortar la foto: ${err.message}`);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-carbon-light rounded-card border border-carbon-border max-w-lg w-full p-4 flex flex-col gap-3">
        <p className="text-ink font-bold">Encuadra tu foto</p>
        <p className="text-xs text-ink-muted -mt-2">Arrastra para moverla y usa el control de abajo para acercar o alejar.</p>

        <div className="flex gap-2">
          {[
            { label: "Ancho", valor: 16 / 9 },
            { label: "Vertical", valor: 4 / 5 },
            { label: "Cuadrado", valor: 1 },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setAspecto(o.valor)}
              className={[
                "flex-1 min-h-tap rounded-control border-2 text-sm font-semibold transition-all duration-150",
                aspecto === o.valor ? "border-gold bg-gold/10 text-ink" : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
              ].join(" ")}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="relative w-full h-64 bg-black rounded-control overflow-hidden">
          {urlOriginal ? (
            <Cropper
              image={urlOriginal}
              crop={crop}
              zoom={zoom}
              aspect={aspecto}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPx) => setAreaPixeles(areaPx)}
              objectFit="contain"
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-ink-muted text-sm">Cargando…</p>
          )}
        </div>

        <label className="text-sm font-semibold text-ink flex flex-col gap-1">
          Zoom ({Math.round(zoom * 100)}%)
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-gold h-6"
          />
        </label>

        {error && <p className="text-terracota text-sm">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onCancelar} className="btn-admin-secondary text-sm">Cancelar</button>
          <button type="button" onClick={confirmar} disabled={procesando || !urlOriginal} className="btn-admin-primary text-sm">
            {procesando ? "Procesando…" : "Usar esta foto"}
          </button>
        </div>
      </div>
    </div>
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
      sonidoConfirmar();
      setMensaje("Guardado correctamente.");
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-card p-5 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-ink flex items-center gap-2">
        <img src="/assets/icons/pago-general.png" alt="" className="w-5 h-5" /> Métodos de Pago
      </h2>
      <p className="text-sm text-ink-muted -mt-2">Se usa en la página de Contacto. Agrega o quita los que necesites.</p>

      <div className="flex flex-col gap-3">
        {lista.map((m, i) => (
          <div key={i} className="flex flex-wrap items-start gap-2 bg-carbon border border-carbon-border rounded-control p-3">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="w-9 h-9 rounded-control border border-carbon-border bg-carbon-light flex items-center justify-center text-xl overflow-hidden">
                {m.icono?.startsWith("/") ? (
                  <img src={m.icono} alt="" className="w-full h-full object-contain" />
                ) : (
                  m.icono
                )}
              </span>
              <input
                type="text"
                value={m.icono}
                onChange={(e) => cambiarFila(i, "icono", e.target.value)}
                className="campo-input w-16 text-center text-xs px-1"
                placeholder="💵 o /assets/…"
                aria-label="Ícono (emoji o ruta de imagen)"
              />
            </div>
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

/** Botones "Se ve completa" / "Llena el marco" para elegir object-contain vs object-cover. */
function SelectorAjuste({ valor, onCambiar }) {
  const opciones = [
    { valor: "cover", label: "Llena el marco", ayuda: "recorta si sobra" },
    { valor: "contain", label: "Se ve completa", ayuda: "puede dejar franjas" },
  ];
  return (
    <div className="flex gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(o.valor)}
          className={[
            "flex-1 min-h-tap rounded-control border-2 px-3 text-sm font-semibold transition-all duration-150",
            (valor ?? "cover") === o.valor
              ? "border-gold bg-gold/10 text-ink"
              : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
          ].join(" ")}
        >
          {o.label}
          <span className="block text-xs font-normal text-ink-muted">{o.ayuda}</span>
        </button>
      ))}
    </div>
  );
}

/** Botones pequeño / mediano / grande para el alto del marco de fotos. */
function SelectorAlto({ valor, onCambiar }) {
  const opciones = [
    { valor: "pequeno", label: "Pequeño" },
    { valor: "mediano", label: "Mediano" },
    { valor: "grande", label: "Grande" },
    { valor: "completo", label: "Pantalla completa" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(o.valor)}
          className={[
            "flex-1 min-w-[110px] min-h-tap rounded-control border-2 text-sm font-semibold transition-all duration-150",
            (valor ?? "mediano") === o.valor
              ? "border-gold bg-gold/10 text-ink"
              : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Selector de tinte de vidrio para bloques tipo "banner". */
function SelectorTinte({ valor, onCambiar }) {
  const opciones = [
    { valor: "dorado", label: "Dorado" },
    { valor: "blanco", label: "Blanco" },
    { valor: "oscuro", label: "Oscuro" },
  ];
  return (
    <div className="flex gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(o.valor)}
          className={[
            "flex-1 min-h-tap rounded-control border-2 text-sm font-semibold transition-all duration-150",
            (valor ?? "dorado") === o.valor
              ? "border-gold bg-gold/10 text-ink"
              : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Elegir el tamaño del título de un bloque. */
function SelectorTamanoTitulo({ valor, onCambiar }) {
  const opciones = [
    { valor: "pequeno", label: "Pequeño" },
    { valor: "mediano", label: "Mediano" },
    { valor: "grande", label: "Grande" },
  ];
  return (
    <div className="flex gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(o.valor)}
          className={[
            "flex-1 min-h-tap rounded-control border-2 text-sm font-semibold transition-all duration-150",
            (valor ?? "mediano") === o.valor
              ? "border-gold bg-gold/10 text-ink"
              : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Elegir el color del título/texto de un bloque (independiente del color del cuadro de vidrio). */
function SelectorColorTexto({ valor, onCambiar }) {
  const opciones = [
    { valor: "blanco", label: "Blanco" },
    { valor: "dorado", label: "Dorado" },
  ];
  return (
    <div className="flex gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(o.valor)}
          className={[
            "flex-1 min-h-tap rounded-control border-2 text-sm font-semibold transition-all duration-150",
            (valor ?? "blanco") === o.valor
              ? "border-gold bg-gold/10 text-ink"
              : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Elegir cómo aparece el ícono del banner (animación). */
function SelectorAnimacionIcono({ valor, onCambiar }) {
  const opciones = [
    { valor: "suave", label: "Suave", ayuda: "aparece con un deslizar" },
    { valor: "rebote", label: "Rebote", ayuda: "salta un poco al aparecer" },
    { valor: "girar", label: "Girar", ayuda: "entra girando" },
    { valor: "pulso", label: "Pulso", ayuda: "late todo el tiempo" },
    { valor: "ninguna", label: "Ninguna", ayuda: "queda quieto" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(o.valor)}
          className={[
            "min-h-tap rounded-control border-2 px-2 py-2 text-sm font-semibold transition-all duration-150 text-left",
            (valor ?? "suave") === o.valor
              ? "border-gold bg-gold/10 text-ink"
              : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
          ].join(" ")}
        >
          {o.label}
          <span className="block text-[11px] font-normal text-ink-muted">{o.ayuda}</span>
        </button>
      ))}
    </div>
  );
}

/** Elegir si la foto va a la izquierda o a la derecha del texto. */
function SelectorPosicion({ valor, onCambiar }) {
  const opciones = [
    { valor: "izquierda", label: "Foto a la izquierda" },
    { valor: "derecha", label: "Foto a la derecha" },
  ];
  return (
    <div className="flex gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambiar(o.valor)}
          className={[
            "flex-1 min-h-tap rounded-control border-2 px-2 text-sm font-semibold transition-all duration-150",
            (valor ?? "izquierda") === o.valor
              ? "border-gold bg-gold/10 text-ink"
              : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TIPOS_BLOQUE = [
  { tipo: "banner", icono: "🏷️", label: "Banner de título", ayuda: "franja de borde a borde con foto de fondo" },
  { tipo: "imagen_texto", icono: "🖼️", label: "Imagen + Texto", ayuda: "una o varias fotos con un párrafo" },
  { tipo: "galeria", icono: "🧩", label: "Galería de Fotos", ayuda: "varias fotos en cuadrícula" },
  { tipo: "video", icono: "🎬", label: "Video en bucle", ayuda: "un video corto que se repite solo, sin sonido" },
  { tipo: "collage", icono: "🧱", label: "Collage", ayuda: "varias fotos acomodadas juntas, llenando el marco" },
  { tipo: "texto", icono: "📝", label: "Texto libre", ayuda: "solo título y párrafo, sin fotos" },
];

// Tipos que muestran una foto/video de fondo (por eso tienen tamaño,
// ajuste y el interruptor de vidrio) — "texto" no, porque no tiene nada
// detrás.
const TIPOS_CON_MEDIA = ["imagen_texto", "galeria", "video", "collage"];

function bloqueVacio(tipo) {
  return {
    id: crypto.randomUUID(),
    tipo,
    titulo: "",
    texto: "",
    imagenes: [],
    video: "",
    icono: "🏷️",
    animacionIcono: "suave",
    tinte: "dorado",
    alto: "mediano",
    ajusteImagen: "cover",
    aspecto: null,
    tamanoTitulo: "mediano",
    colorTexto: "blanco",
    posicionImagen: "izquierda",
    modoPresentacion: false,
    // El efecto vidrio (difuminado + transparencia) ahora está disponible
    // en cualquier tipo de sección, no solo en el banner — por defecto
    // viene activado porque es lo que se ve más profesional.
    vidrioSiempre: true,
  };
}

/** Interruptor genérico Sí/No (se usa para "vidrio siempre disponible"). */
function Interruptor({ valor, onCambiar, etiqueta, ayuda }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-carbon border border-carbon-border rounded-control px-3.5 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{etiqueta}</div>
        {ayuda && <div className="text-xs text-ink-muted mt-0.5">{ayuda}</div>}
      </div>
      <button
        type="button"
        onClick={() => onCambiar(!valor)}
        aria-pressed={valor}
        className={`w-12 h-7 rounded-full shrink-0 transition-colors duration-200 relative ${valor ? "bg-gold" : "bg-carbon-border"}`}
      >
        <span
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-carbon shadow transition-all duration-200 ${valor ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* SECCIONES PERSONALIZADAS — constructor libre de bloques para   */
/* la página de inicio: el admin elige el tipo, el orden, las      */
/* fotos y cómo se ven, sin tocar código.                          */
/* ------------------------------------------------------------ */
function SeccionBloques({ contenidoKey, titulo, descripcion, bloques, onGuardado, espejoClave }) {
  const [lista, setLista] = useState(bloques);
  const [expandidoId, setExpandidoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  // Si borras, reordenas o editas una sección y NO tocas "Guardar
  // Secciones", nada de eso queda guardado — al recargar la página vuelve
  // a aparecer todo tal como estaba antes. Este aviso es para que nunca
  // se pierda un cambio por olvido (como el de la sección duplicada que
  // "vuelve a aparecer" después de borrarla).
  const [sinGuardar, setSinGuardar] = useState(false);

  function actualizarBloque(id, cambios) {
    setLista((l) => l.map((b) => (b.id === id ? { ...b, ...cambios } : b)));
    setSinGuardar(true);
  }

  function quitarBloque(id) {
    setLista((l) => l.filter((b) => b.id !== id));
    setSinGuardar(true);
  }

  function moverBloque(id, direccion) {
    setLista((l) => {
      const i = l.findIndex((b) => b.id === id);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const copia = [...l];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
    setSinGuardar(true);
  }

  function agregarBloque(tipo) {
    const nuevo = bloqueVacio(tipo);
    setLista((l) => [...l, nuevo]);
    setExpandidoId(nuevo.id);
    setSinGuardar(true);
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      // "migrado: true" no molesta a "secciones_home"/"secciones_ubicacion"
      // (nadie lo lee ahí) pero es IMPRESCINDIBLE para "secciones_fabricacion":
      // si se guarda sin esa bandera se borra, y la migración de la
      // introducción se volvería a disparar sola en la próxima carga.
      await guardarContenido(contenidoKey, { bloques: lista, migrado: true });
      // Algunas páginas (como la portada) muestran un resumen de la
      // primera sección de aquí — lo mantenemos al día automáticamente
      // para no tener que editarlo dos veces en dos lugares distintos.
      if (espejoClave && lista[0]) {
        await guardarContenido(espejoClave, {
          titulo: lista[0].titulo ?? "",
          texto: lista[0].texto ?? "",
          imagenes: lista[0].imagenes ?? [],
          ajusteImagen: lista[0].ajusteImagen ?? "cover",
          aspecto: lista[0].aspecto ?? null,
          tamanoTitulo: lista[0].tamanoTitulo ?? "mediano",
          colorTexto: lista[0].colorTexto ?? "blanco",
        });
      }
      onGuardado(lista);
      sonidoConfirmar();
      setMensaje("Guardado correctamente.");
      setSinGuardar(false);
    } catch (err) {
      setMensaje(`Error al guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="admin-card p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-ink">🧩 {titulo}</h2>
        <p className="text-sm text-ink-muted mt-1">{descripcion}</p>
      </div>

      {sinGuardar && (
        <p className="text-sm font-semibold text-gold bg-gold/10 border border-gold/40 rounded-control px-3.5 py-2.5">
          ⚠ Tienes cambios sin guardar aquí abajo — presiona "Guardar Secciones" al final para que no se pierdan. Si
          recargas la página antes de guardar, todo vuelve a como estaba.
        </p>
      )}

      {lista.length === 0 && (
        <p className="text-ink-muted text-base bg-carbon border border-dashed border-carbon-border rounded-control px-4 py-6 text-center">
          Todavía no has agregado ninguna sección. Elige un tipo abajo para empezar.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {lista.map((bloque, i) => {
          const meta = TIPOS_BLOQUE.find((t) => t.tipo === bloque.tipo) ?? TIPOS_BLOQUE[0];
          const abierto = expandidoId === bloque.id;
          return (
            <div key={bloque.id} className="bg-carbon border border-carbon-border rounded-control overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandidoId(abierto ? null : bloque.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-carbon-light/50 transition-colors duration-150"
              >
                <span className="text-xl shrink-0">{meta.icono}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-bold truncate">{bloque.titulo || `${meta.label} sin título`}</p>
                  <p className="text-ink-muted text-xs">{meta.label}</p>
                </div>
                <span className="text-ink-muted text-sm shrink-0">{abierto ? "▲" : "▼"}</span>
              </button>

              {abierto && (
                <div className="p-4 border-t border-carbon-border flex flex-col gap-4">
                  <EditorBloque bloque={bloque} onCambiar={(c) => actualizarBloque(bloque.id, c)} />
                </div>
              )}

              <div className="flex items-center justify-between px-3 py-2 border-t border-carbon-border bg-carbon-light/30">
                <div className="flex gap-1">
                  <button type="button" onClick={() => moverBloque(bloque.id, -1)} disabled={i === 0}
                    className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30 hover:text-ink transition-colors" aria-label="Subir sección">↑</button>
                  <button type="button" onClick={() => moverBloque(bloque.id, 1)} disabled={i === lista.length - 1}
                    className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30 hover:text-ink transition-colors" aria-label="Bajar sección">↓</button>
                </div>
                <button
                  type="button"
                  onClick={() => quitarBloque(bloque.id)}
                  className="min-h-tap px-3 text-terracota text-sm font-semibold hover:text-ink transition-colors"
                >
                  Borrar sección
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-carbon-border">
        <span className="text-sm font-semibold text-ink-muted">+ Agregar sección:</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIPOS_BLOQUE.map((t) => (
            <button
              key={t.tipo}
              type="button"
              onClick={() => agregarBloque(t.tipo)}
              className="flex flex-col items-center gap-1 rounded-control border-2 border-dashed border-carbon-border p-3
                         hover:border-gold/50 hover:bg-gold/5 transition-all duration-150"
            >
              <span className="text-2xl">{t.icono}</span>
              <span className="text-xs font-bold text-ink text-center">{t.label}</span>
              <span className="text-[11px] text-ink-muted text-center leading-tight">{t.ayuda}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={guardando}
          className={`btn-admin-primary text-sm ${sinGuardar ? "ring-2 ring-gold ring-offset-2 ring-offset-carbon animate-pulse" : ""}`}
        >
          {guardando ? "Guardando…" : "Guardar Secciones"}
        </button>
        {mensaje && (
          <span className={mensaje.startsWith("Error") ? "text-terracota text-sm" : "text-gold text-sm"}>{mensaje}</span>
        )}
      </div>
    </section>
  );
}

/** Formulario de UN bloque — los campos que muestra dependen de `bloque.tipo`. */
function EditorBloque({ bloque, onCambiar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [pendiente, setPendiente] = useState(null); // { modo: "unica" | "multiple" | "reemplazar", file, index? }

  function elegirUnica(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendiente({ modo: "unica", file });
  }

  function elegirMultiple(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendiente({ modo: "multiple", file });
  }

  /** Reabre el recortador sobre una foto YA subida (banner: index = 0),
   * para corregir el encuadre sin borrarla y volver a subirla. */
  async function recortarDeNuevo(index) {
    const url = bloque.imagenes?.[index];
    if (!url) return;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      setPendiente({ modo: "reemplazar", index, file: blob });
    } catch {
      alert("No se pudo cargar esa foto para recortarla de nuevo. Intenta bajarla y subirla otra vez.");
    }
  }

  // Recibe el `pendiente` como parámetro explícito (en vez de leerlo del
  // estado adentro) para que nunca pueda quedar desincronizado con cuál
  // foto se acaba de recortar.
  async function fotoRecortadaLista(blob, aspectoCss, item) {
    setSubiendo(true);
    try {
      const url = await subirBlobContenido(blob);
      if (item?.modo === "unica") {
        onCambiar({ imagenes: [url], aspecto: aspectoCss });
      } else if (item?.modo === "reemplazar") {
        const copia = [...(bloque.imagenes ?? [])];
        copia[item.index] = url;
        onCambiar({ imagenes: copia, aspecto: aspectoCss });
      } else {
        onCambiar({ imagenes: [...(bloque.imagenes ?? []), url], aspecto: aspectoCss });
      }
    } catch (err) {
      alert(`No se pudo subir la foto: ${err.message}`);
    } finally {
      setSubiendo(false);
      setPendiente(null);
    }
  }

  async function subirVideo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSubiendo(true);
    try {
      const url = await subirVideoContenido(file);
      onCambiar({ video: url });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  function quitarFoto(i) {
    onCambiar({ imagenes: bloque.imagenes.filter((_, idx) => idx !== i) });
  }

  function moverFoto(i, direccion) {
    const j = i + direccion;
    if (j < 0 || j >= bloque.imagenes.length) return;
    const copia = [...bloque.imagenes];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onCambiar({ imagenes: copia });
  }

  return (
    <>
      <div className="rounded-control overflow-hidden border border-carbon-border">
        <p className="text-xs font-semibold text-ink-muted bg-carbon-light px-3 py-1.5 border-b border-carbon-border">
          Vista previa — así se ve ahora mismo en el sitio
        </p>
        <BloqueContenido bloque={bloque} />
      </div>

      {pendiente && (
        <RecortadorContenido
          archivo={pendiente.file}
          aspectoInicial={bloque.tipo === "banner" ? 16 / 9 : 4 / 5}
          onCancelar={() => setPendiente(null)}
          onListo={(blob, aspectoCss) => fotoRecortadaLista(blob, aspectoCss, pendiente)}
        />
      )}

      {bloque.tipo === "banner" && (
        <Campo label="Ícono (emoji)">
          <input
            type="text"
            value={bloque.icono}
            onChange={(e) => onCambiar({ icono: e.target.value })}
            className="campo-input w-20 text-center text-xl"
          />
        </Campo>
      )}

      <Campo label="Título">
        <input
          type="text"
          value={bloque.titulo}
          onChange={(e) => onCambiar({ titulo: e.target.value })}
          className="campo-input"
        />
      </Campo>

      {bloque.tipo !== "banner" && (
        <Campo label="Texto">
          <textarea
            rows={4}
            value={bloque.texto}
            onChange={(e) => onCambiar({ texto: e.target.value })}
            className="campo-input resize-none"
          />
        </Campo>
      )}

      {/* Foto única: solo el banner (franja de borde a borde) */}
      {bloque.tipo === "banner" && (
        <Campo label="Foto">
          <div className="flex flex-col gap-2">
            <label className={`relative w-full h-32 rounded-control overflow-hidden bg-carbon-light border border-carbon-border block ${pendiente ? "pointer-events-none opacity-60" : "cursor-pointer group"}`}>
              {bloque.imagenes?.[0] && (
                <img src={bloque.imagenes[0]} alt="" className="w-full h-full object-cover" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/55 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200">
                {subiendo ? "Subiendo…" : pendiente ? "Recortando…" : bloque.imagenes?.[0] ? "Cambiar foto" : "+ Subir foto"}
              </span>
              <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={elegirUnica} disabled={!!pendiente} />
            </label>
            {bloque.imagenes?.[0] && (
              <button type="button" onClick={() => recortarDeNuevo(0)} className="btn-admin-secondary text-xs w-fit">
                ✂ Recortar de nuevo (misma foto)
              </button>
            )}
          </div>
        </Campo>
      )}

      {/* Varias fotos: Imagen + Texto, Galería y Collage — con 2 o más,
          "Imagen + Texto" y "Galería" pueden pasar solas como diapositiva. */}
      {(bloque.tipo === "imagen_texto" || bloque.tipo === "galeria" || bloque.tipo === "collage") && (
        <Campo label="Fotos">
          <div className="flex flex-wrap gap-3">
            {(bloque.imagenes ?? []).map((url, i) => (
              <div key={url + i} className="relative w-20">
                <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-control border border-carbon-border" />
                <button
                  type="button"
                  onClick={() => recortarDeNuevo(i)}
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded bg-black/60 text-white text-[10px] flex items-center justify-center"
                  aria-label="Recortar esta foto de nuevo"
                  title="Recortar de nuevo"
                >
                  ✂
                </button>
                <div className="flex justify-center gap-1 mt-1">
                  <button type="button" onClick={() => moverFoto(i, -1)} disabled={i === 0}
                    className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30 hover:text-ink transition-colors text-sm" aria-label="Mover antes">←</button>
                  <button type="button" onClick={() => quitarFoto(i)}
                    className="min-h-tap min-w-tap text-terracota font-bold hover:text-ink transition-colors text-sm" aria-label="Quitar">×</button>
                  <button type="button" onClick={() => moverFoto(i, 1)} disabled={i === bloque.imagenes.length - 1}
                    className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30 hover:text-ink transition-colors text-sm" aria-label="Mover después">→</button>
                </div>
              </div>
            ))}
            <label
              className={[
                "w-20 h-20 flex items-center justify-center rounded-control border-2 border-dashed text-xs text-center transition-colors duration-150",
                pendiente
                  ? "border-carbon-border/50 text-ink-muted/50 pointer-events-none"
                  : "border-carbon-border text-ink-muted cursor-pointer hover:border-gold/50 hover:text-ink",
              ].join(" ")}
            >
              <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={elegirMultiple} disabled={!!pendiente} />
              {subiendo ? "…" : pendiente ? "Recortando…" : "+ Foto"}
            </label>
          </div>
          {bloque.tipo === "imagen_texto" && (bloque.imagenes?.length ?? 0) === 0 && (
            <p className="text-xs text-ink-muted mt-1">Con 1 foto se ve fija; con 2 o más, pasan solas como diapositiva.</p>
          )}
          {bloque.tipo === "collage" && (
            <p className="text-xs text-ink-muted mt-1">Se ve mejor con 3 fotos (la primera queda más grande). Si subes más de 3, solo se usan las primeras 3.</p>
          )}
        </Campo>
      )}

      {/* Video en bucle */}
      {bloque.tipo === "video" && (
        <Campo label={`Video (máximo ${LIMITE_VIDEO_MB}MB, se repite solo sin sonido)`}>
          <label className="relative w-full h-32 rounded-control overflow-hidden bg-carbon-light border border-carbon-border cursor-pointer group block">
            {bloque.video ? (
              <video src={bloque.video} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-ink-muted text-sm">Ningún video subido todavía</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/55 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200">
              {subiendo ? "Subiendo…" : bloque.video ? "Cambiar video" : "+ Subir video"}
            </span>
            <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={subirVideo} />
          </label>
        </Campo>
      )}

      {TIPOS_CON_MEDIA.includes(bloque.tipo) && (
        <>
          <Campo label="Tamaño del bloque">
            <SelectorAlto valor={bloque.alto} onCambiar={(v) => onCambiar({ alto: v })} />
          </Campo>
          <Campo label="Ajuste de la foto/video">
            <SelectorAjuste valor={bloque.ajusteImagen} onCambiar={(v) => onCambiar({ ajusteImagen: v })} />
          </Campo>
          <Interruptor
            valor={bloque.vidrioSiempre ?? true}
            onCambiar={(v) => onCambiar({ vidrioSiempre: v })}
            etiqueta="Efecto vidrio (difuminado + transparencia)"
            ayuda="El título y el texto quedan sobre una tarjeta de vidrio que se adapta a lo que escribas, en vez de una caja fija."
          />
          <Campo label="Tamaño del título">
            <SelectorTamanoTitulo valor={bloque.tamanoTitulo} onCambiar={(v) => onCambiar({ tamanoTitulo: v })} />
          </Campo>
          <Campo label="Color del título/texto">
            <SelectorColorTexto valor={bloque.colorTexto} onCambiar={(v) => onCambiar({ colorTexto: v })} />
          </Campo>
        </>
      )}

      {bloque.tipo === "galeria" && (bloque.imagenes?.length ?? 0) > 1 && (
        <Campo label="Estilo con varias fotos">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCambiar({ modoPresentacion: false })}
              className={[
                "flex-1 min-h-tap rounded-control border-2 px-3 text-sm font-semibold transition-all duration-150",
                !bloque.modoPresentacion
                  ? "border-gold bg-gold/10 text-ink"
                  : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
              ].join(" ")}
            >
              Cuadrícula
              <span className="block text-xs font-normal text-ink-muted">todas las fotos juntas</span>
            </button>
            <button
              type="button"
              onClick={() => onCambiar({ modoPresentacion: true })}
              className={[
                "flex-1 min-h-tap rounded-control border-2 px-3 text-sm font-semibold transition-all duration-150",
                bloque.modoPresentacion
                  ? "border-gold bg-gold/10 text-ink"
                  : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
              ].join(" ")}
            >
              Diapositiva
              <span className="block text-xs font-normal text-ink-muted">pasan solas + vidrio al final</span>
            </button>
          </div>
        </Campo>
      )}

      {bloque.tipo === "galeria" && (
        <Campo label={bloque.modoPresentacion ? "Color del vidrio (sobre las fotos)" : "Color del vidrio (debajo de las fotos)"}>
          <SelectorTinte valor={bloque.tinte} onCambiar={(v) => onCambiar({ tinte: v })} />
        </Campo>
      )}

      {(bloque.tipo === "collage" || bloque.tipo === "imagen_texto" || bloque.tipo === "video") && (bloque.vidrioSiempre ?? true) && (
        <Campo label="Color del vidrio (sobre el título/texto)">
          <SelectorTinte valor={bloque.tinte} onCambiar={(v) => onCambiar({ tinte: v })} />
        </Campo>
      )}

      {bloque.tipo === "banner" && (
        <Campo label="Color del vidrio">
          <SelectorTinte valor={bloque.tinte} onCambiar={(v) => onCambiar({ tinte: v })} />
        </Campo>
      )}

      {bloque.tipo === "banner" && (
        <Campo label="Animación del ícono">
          <SelectorAnimacionIcono valor={bloque.animacionIcono} onCambiar={(v) => onCambiar({ animacionIcono: v })} />
        </Campo>
      )}
    </>
  );
}
