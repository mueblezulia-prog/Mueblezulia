import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { convertirSiEsHeic } from "../lib/heic";
import { obtenerContenido, guardarContenido, CONTENIDO_DEFAULT } from "../lib/contenido";
import { sonidoConfirmar } from "../lib/sonido";

const BUCKET = "productos"; // mismo bucket que ya usan fotos de mueble y categorías

async function subirImagenContenido(file) {
  const fileListo = await convertirSiEsHeic(file);
  const nombreArchivo = `contenido/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombreArchivo, fileListo);
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
      let bloquesFab = bf.bloques ?? [];
      const yaMigrado = bloquesFab.some((b) => b.id === "fabricacion-legado");
      if (!yaMigrado) {
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
        guardarContenido("secciones_fabricacion", { bloques: bloquesFab }).catch(() => {});
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
  const [form, setForm] = useState(hero);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
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
        <img src="/assets/icons/ubicacion.png" alt="" className="w-5 h-5" /> Nuestra Sede
      </h2>
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

      <Campo label="Ajuste de la foto">
        <SelectorAjuste valor={form.ajusteImagen} onCambiar={(v) => cambiar("ajusteImagen", v)} />
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

  function actualizarBloque(id, cambios) {
    setLista((l) => l.map((b) => (b.id === id ? { ...b, ...cambios } : b)));
  }

  function quitarBloque(id) {
    setLista((l) => l.filter((b) => b.id !== id));
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
  }

  function agregarBloque(tipo) {
    const nuevo = bloqueVacio(tipo);
    setLista((l) => [...l, nuevo]);
    setExpandidoId(nuevo.id);
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await guardarContenido(contenidoKey, { bloques: lista });
      // Algunas páginas (como la portada) muestran un resumen de la
      // primera sección de aquí — lo mantenemos al día automáticamente
      // para no tener que editarlo dos veces en dos lugares distintos.
      if (espejoClave && lista[0]) {
        await guardarContenido(espejoClave, {
          titulo: lista[0].titulo ?? "",
          texto: lista[0].texto ?? "",
          imagenes: lista[0].imagenes ?? [],
          ajusteImagen: lista[0].ajusteImagen ?? "cover",
        });
      }
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
      <div>
        <h2 className="text-xl font-bold text-ink">🧩 {titulo}</h2>
        <p className="text-sm text-ink-muted mt-1">{descripcion}</p>
      </div>

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
        <button type="button" onClick={handleGuardar} disabled={guardando} className="btn-admin-primary text-sm">
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

  async function subirUnica(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const url = await subirImagenContenido(file);
      onCambiar({ imagenes: [url] });
    } catch (err) {
      alert(`No se pudo subir la foto: ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  }

  async function agregarMultiple(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSubiendo(true);
    try {
      const url = await subirImagenContenido(file);
      onCambiar({ imagenes: [...(bloque.imagenes ?? []), url] });
    } catch (err) {
      alert(`No se pudo subir la foto: ${err.message}`);
    } finally {
      setSubiendo(false);
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
          <label className="relative w-full h-32 rounded-control overflow-hidden bg-carbon-light border border-carbon-border cursor-pointer group block">
            {bloque.imagenes?.[0] && (
              <img src={bloque.imagenes[0]} alt="" className="w-full h-full object-cover" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/55 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200">
              {subiendo ? "Subiendo…" : bloque.imagenes?.[0] ? "Cambiar foto" : "+ Subir foto"}
            </span>
            <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={subirUnica} />
          </label>
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
            <label className="w-20 h-20 flex items-center justify-center rounded-control border-2 border-dashed border-carbon-border text-ink-muted text-xs text-center cursor-pointer hover:border-gold/50 hover:text-ink transition-colors duration-150">
              <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={agregarMultiple} />
              {subiendo ? "…" : "+ Foto"}
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

      {bloque.tipo === "galeria" && bloque.modoPresentacion && (
        <Campo label="Color del vidrio (sobre la última foto)">
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
