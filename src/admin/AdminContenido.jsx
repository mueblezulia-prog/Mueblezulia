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
  const [fabricacion, setFabricacion] = useState(CONTENIDO_DEFAULT.fabricacion);
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
      setFabricacion(fab);
      setMetodos(m.metodos ?? []);
      setBloquesHome(bh.bloques ?? []);
      setBloquesFabricacion(bf.bloques ?? []);
      setBloquesUbicacion(bu.bloques ?? []);
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
      <SeccionFabricacion fabricacion={fabricacion} onGuardado={setFabricacion} />
      <SeccionBloques
        contenidoKey="secciones_fabricacion"
        titulo="Página de Fabricación — Secciones extra"
        descripcion='Agrega más contenido debajo de lo de arriba: más fotos, más texto, banners — como si construyeras la página tú mismo.'
        bloques={bloquesFabricacion}
        onGuardado={setBloquesFabricacion}
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

      <Campo label="Ajuste de la foto">
        <SelectorAjuste valor={form.ajusteImagen} onCambiar={(v) => cambiar("ajusteImagen", v)} />
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
/* FABRICACIÓN — título, texto y galería principal (fija)         */
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
      <h2 className="text-xl font-bold text-ink">🔨 Fabricación</h2>
      <p className="text-sm text-ink-muted -mt-2">
        Se usa arriba de todo en la página "Fabricación". Agrega, quita o reordena tantas fotos como quieras.
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

      <Campo label="Ajuste de las fotos">
        <SelectorAjuste valor={form.ajusteImagen} onCambiar={(v) => cambiar("ajusteImagen", v)} />
      </Campo>

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
  { tipo: "imagen_texto", icono: "🖼️", label: "Imagen + Texto", ayuda: "una foto al lado de un párrafo" },
  { tipo: "galeria", icono: "🧩", label: "Galería de Fotos", ayuda: "varias fotos en cuadrícula" },
  { tipo: "texto", icono: "📝", label: "Texto libre", ayuda: "solo título y párrafo, sin fotos" },
];

function bloqueVacio(tipo) {
  return {
    id: crypto.randomUUID(),
    tipo,
    titulo: "",
    texto: "",
    imagenes: [],
    icono: "🏷️",
    tinte: "dorado",
    alto: "mediano",
    ajusteImagen: "cover",
    posicionImagen: "izquierda",
  };
}

/* ------------------------------------------------------------ */
/* SECCIONES PERSONALIZADAS — constructor libre de bloques para   */
/* la página de inicio: el admin elige el tipo, el orden, las      */
/* fotos y cómo se ven, sin tocar código.                          */
/* ------------------------------------------------------------ */
function SeccionBloques({ contenidoKey, titulo, descripcion, bloques, onGuardado }) {
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

      {/* Foto única: banner e imagen_texto */}
      {(bloque.tipo === "banner" || bloque.tipo === "imagen_texto") && (
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

      {/* Galería de varias fotos */}
      {bloque.tipo === "galeria" && (
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
        </Campo>
      )}

      {(bloque.tipo === "imagen_texto" || bloque.tipo === "galeria") && (
        <>
          <Campo label="Alto del marco">
            <SelectorAlto valor={bloque.alto} onCambiar={(v) => onCambiar({ alto: v })} />
          </Campo>
          <Campo label="Ajuste de la foto">
            <SelectorAjuste valor={bloque.ajusteImagen} onCambiar={(v) => onCambiar({ ajusteImagen: v })} />
          </Campo>
        </>
      )}

      {bloque.tipo === "imagen_texto" && (
        <Campo label="Posición">
          <SelectorPosicion valor={bloque.posicionImagen} onCambiar={(v) => onCambiar({ posicionImagen: v })} />
        </Campo>
      )}

      {bloque.tipo === "banner" && (
        <Campo label="Color del vidrio">
          <SelectorTinte valor={bloque.tinte} onCambiar={(v) => onCambiar({ tinte: v })} />
        </Campo>
      )}
    </>
  );
}
