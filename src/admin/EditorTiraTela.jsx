import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabaseClient";
import { convertirSiEsHeic } from "../lib/heic";
import { optimizarBlob } from "../lib/imagenOptimizada";
import { getCroppedImageBlobRotado } from "../lib/cropImage";

const BUCKET = "productos";

// Qué tan grande es cada "circulito" de color que se recorta, como
// porcentaje del lado más corto de la foto ya encuadrada.
const LADO_RECORTE_PCT = 0.16;
const TAM_PREVIEW_PX = 96;
const TAM_FINAL_PX = 420;

function limitar(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

function normalizarGrados(g) {
  let n = g % 360;
  if (n > 180) n -= 360;
  if (n < -180) n += 360;
  return n;
}

async function voltearHorizontal(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Recorta un cuadrado centrado en (xPct, yPct) — coordenadas de 0 a 1
// relativas al tamaño real de la foto — y lo dibuja en un canvas cuadrado
// de `salidaPx` de lado. Sirve tanto para la vista previa chiquita como
// para la foto final que se sube.
function dibujarRecorteCuadrado(imgEl, xPct, yPct, ladoPct, salidaPx) {
  const naturalW = imgEl.naturalWidth;
  const naturalH = imgEl.naturalHeight;
  const cx = xPct * naturalW;
  const cy = yPct * naturalH;
  let lado = ladoPct * Math.min(naturalW, naturalH);
  // Antes, si el pin quedaba muy cerca de un borde (por ejemplo justo
  // debajo de la etiqueta de la tela), el cuadro de recorte se
  // "deslizaba" para no salirse de la foto — y terminaba mostrando otra
  // parte de la foto (la etiqueta) en vez de lo que estaba justo debajo
  // del pin. Ahora, en ese caso, el cuadro se ACHICA lo necesario para
  // quedar siempre perfectamente centrado en el pin, nunca desplazado.
  const margenMax = 2 * Math.min(cx, cy, naturalW - cx, naturalH - cy);
  if (margenMax > 0) lado = Math.min(lado, margenMax);
  lado = Math.max(lado, 4);
  const sx = cx - lado / 2;
  const sy = cy - lado / 2;
  const canvas = document.createElement("canvas");
  canvas.width = salidaPx;
  canvas.height = salidaPx;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgEl, sx, sy, lado, lado, 0, 0, salidaPx, salidaPx);
  return canvas;
}

function colorPromedioDeCanvas(canvasFuente) {
  const mini = document.createElement("canvas");
  mini.width = 1;
  mini.height = 1;
  const ctx = mini.getContext("2d");
  ctx.drawImage(canvasFuente, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

let contadorPines = 0;

/**
 * Flujo completo para cargar UNA foto de una tira de varios colores de
 * tela (como se compran en las muestras de tela — varias franjas de color
 * seguidas en una sola foto) y convertirla en varios colores nuevos de
 * una familia, todo de una vez:
 *
 *   Paso 1 "recortar": igual que el resto del sitio, pero con control de
 *     rotación (grados finos + giros de 90°) y volteo horizontal, porque
 *     estas fotos casi siempre se toman con la tira algo torcida.
 *   Paso 2 "marcar": sobre la foto ya derecha, el usuario toca cada franja
 *     de color para poner un pin numerado ahí (se puede arrastrar para
 *     ajustar), le escribe el nombre a cada uno, y al guardar se recorta
 *     automáticamente un circulito de la foto real para cada color — ya
 *     no hace falta subir una foto por color, una por una.
 *
 * No reemplaza "+ Agregar color" (para agregar un color suelto), convive
 * con él.
 */
export default function EditorTiraTela({ archivo, familia, ordenInicial, onCerrar, onColoresCreados, onFotoCompletaGuardada }) {
  const [paso, setPaso] = useState("cargando"); // cargando | recortar | marcar
  const [error, setError] = useState(null);

  // --- Paso 1: recortar / girar / voltear ---
  const [archivoListo, setArchivoListo] = useState(null); // ya pasado por HEIC si hacía falta
  const [volteado, setVolteado] = useState(false);
  const [blobParaCropper, setBlobParaCropper] = useState(null);
  const [urlParaCropper, setUrlParaCropper] = useState(null);
  const [aspecto, setAspecto] = useState(4 / 5);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [giro90, setGiro90] = useState(0);
  const [anguloFino, setAnguloFino] = useState(0);
  const [areaPixeles, setAreaPixeles] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // --- Paso 2: marcar colores ---
  const [tiraUrl, setTiraUrl] = useState(null);
  const [tiraBlob, setTiraBlob] = useState(null);
  const [dimsNaturales, setDimsNaturales] = useState(null);
  const [pines, setPines] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const imgElRef = useRef(null);
  const contenedorRef = useRef(null);

  // Convierte el archivo (HEIC si hace falta) al entrar.
  useEffect(() => {
    let activo = true;
    convertirSiEsHeic(archivo)
      .then((listo) => {
        if (!activo) return;
        setArchivoListo(listo);
        setPaso("recortar");
      })
      .catch((err) => activo && setError(err.message));
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivo]);

  // Cuando cambia el archivo listo o se voltea, recalcula la imagen que
  // ve el recortador.
  useEffect(() => {
    if (!archivoListo) return;
    let activo = true;
    let urlNueva;
    (async () => {
      const blob = volteado ? await voltearHorizontal(archivoListo) : archivoListo;
      if (!activo) return;
      urlNueva = URL.createObjectURL(blob);
      setBlobParaCropper(blob);
      setUrlParaCropper(urlNueva);
    })();
    return () => {
      activo = false;
      if (urlNueva) URL.revokeObjectURL(urlNueva);
    };
  }, [archivoListo, volteado]);

  useEffect(() => {
    return () => {
      if (tiraUrl) URL.revokeObjectURL(tiraUrl);
    };
  }, [tiraUrl]);

  async function confirmarRecorte() {
    if (!areaPixeles || !urlParaCropper) return;
    setProcesando(true);
    setError(null);
    try {
      const rotacionTotal = giro90 + anguloFino;
      const blobRecortado = await getCroppedImageBlobRotado(urlParaCropper, areaPixeles, rotacionTotal);
      const url = URL.createObjectURL(blobRecortado);
      setTiraUrl(url);
      setTiraBlob(blobRecortado);
      setPines([]);
      setPaso("marcar");
    } catch (err) {
      setError(`No se pudo recortar la foto: ${err.message}`);
    } finally {
      setProcesando(false);
    }
  }

  function agregarPinEn(x, y) {
    contadorPines += 1;
    const canvas = imgElRef.current ? dibujarRecorteCuadrado(imgElRef.current, x, y, LADO_RECORTE_PCT, TAM_PREVIEW_PX) : null;
    setPines((actual) => [
      ...actual,
      {
        id: contadorPines,
        x,
        y,
        nombre: "",
        preview: canvas ? canvas.toDataURL("image/jpeg", 0.85) : null,
      },
    ]);
  }

  function clicEnFoto(e) {
    if (pines.length >= 20) return;
    const rect = contenedorRef.current.getBoundingClientRect();
    const x = limitar((e.clientX - rect.left) / rect.width, 0, 1);
    const y = limitar((e.clientY - rect.top) / rect.height, 0, 1);
    agregarPinEn(x, y);
  }

  function agregarPinBoton() {
    agregarPinEn(0.5, pines.length === 0 ? 0.5 : limitar((pines[pines.length - 1].y + 0.12) % 1, 0.06, 0.94));
  }

  function actualizarPin(id, cambios) {
    setPines((actual) => actual.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  }

  function moverPin(id, x, y) {
    const canvas = imgElRef.current ? dibujarRecorteCuadrado(imgElRef.current, x, y, LADO_RECORTE_PCT, TAM_PREVIEW_PX) : null;
    actualizarPin(id, { x, y, preview: canvas ? canvas.toDataURL("image/jpeg", 0.85) : undefined });
  }

  function quitarPin(id) {
    setPines((actual) => actual.filter((p) => p.id !== id));
  }

  function iniciarArrastre(e, id) {
    e.preventDefault();
    e.stopPropagation();
    function mover(ev) {
      const rect = contenedorRef.current.getBoundingClientRect();
      const punto = ev.touches ? ev.touches[0] : ev;
      const x = limitar((punto.clientX - rect.left) / rect.width, 0, 1);
      const y = limitar((punto.clientY - rect.top) / rect.height, 0, 1);
      moverPin(id, x, y);
    }
    function soltar() {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", soltar);
    }
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    window.addEventListener("touchmove", mover, { passive: false });
    window.addEventListener("touchend", soltar);
  }

  async function guardarTodos() {
    if (pines.length === 0) {
      setError("Marca al menos un color en la foto (tócala donde está cada color).");
      return;
    }
    if (pines.some((p) => !p.nombre.trim())) {
      setError("Ponle un nombre a cada color antes de guardar.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const filasNuevas = [];
      for (let i = 0; i < pines.length; i++) {
        const pin = pines[i];
        const canvas = dibujarRecorteCuadrado(imgElRef.current, pin.x, pin.y, LADO_RECORTE_PCT, TAM_FINAL_PX);
        const hex = colorPromedioDeCanvas(canvas);
        const blobFinal = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
        const optimizado = await optimizarBlob(blobFinal);
        const extension = optimizado.type === "image/webp" ? "webp" : "jpg";
        const nombreArchivo = `telas/${crypto.randomUUID()}.${extension}`;
        const { error: errorSubida } = await supabase.storage
          .from(BUCKET)
          .upload(nombreArchivo, optimizado, { contentType: optimizado.type });
        if (errorSubida) throw errorSubida;
        const url = supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;
        filasNuevas.push({
          nombre: pin.nombre.trim(),
          hex,
          imagen: url,
          familia_id: familia.id,
          orden: ordenInicial + i,
        });
      }
      const { data, error: errorInsertar } = await supabase.from("telas").insert(filasNuevas).select();
      if (errorInsertar) throw errorInsertar;
      onColoresCreados(data ?? []);

      // Además de los circulitos por color, se guarda la foto de la tira
      // COMPLETA (ya derecha) en la familia, para el botón "Ver tela
      // completa" que ve el cliente. Si esto falla (por ejemplo, porque
      // todavía no corriste el .sql que agrega esa columna) no se pierde
      // nada de lo ya guardado arriba — solo no va a aparecer ese botón.
      try {
        if (tiraBlob) {
          const optimizadaCompleta = await optimizarBlob(tiraBlob);
          const extCompleta = optimizadaCompleta.type === "image/webp" ? "webp" : "jpg";
          const nombreCompleta = `telas/${crypto.randomUUID()}.${extCompleta}`;
          const { error: errorFotoCompleta } = await supabase.storage
            .from(BUCKET)
            .upload(nombreCompleta, optimizadaCompleta, { contentType: optimizadaCompleta.type });
          if (!errorFotoCompleta) {
            const urlCompleta = supabase.storage.from(BUCKET).getPublicUrl(nombreCompleta).data.publicUrl;
            const { error: errorFamilia } = await supabase
              .from("telas_familias")
              .update({ foto_completa: urlCompleta })
              .eq("id", familia.id);
            if (!errorFamilia) onFotoCompletaGuardada?.(urlCompleta);
          }
        }
      } catch {
        // No bloquea el guardado principal de los colores.
      }

      onCerrar();
    } catch (err) {
      setError(`No se pudo guardar: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-carbon-light rounded-card border border-carbon-border max-w-2xl w-full p-4 flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-ink font-bold">Foto de tira de colores — {familia?.nombre}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              {paso === "recortar"
                ? "Paso 1 de 2 · Encuadra y endereza la foto"
                : "Paso 2 de 2 · Marca dónde está cada color"}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-ink-muted text-xl leading-none px-1">
            ×
          </button>
        </div>

        {paso === "cargando" && <p className="text-ink-muted text-sm">Preparando la foto…</p>}

        {paso === "recortar" && urlParaCropper && (
          <>
            <p className="text-xs text-ink-muted -mt-1">
              Arrastra para moverla, usa el zoom para acercar, y "Girar"/"Ángulo fino" para dejarla derecha — así siempre puedes
              agarrar la tira como te salga más fácil.
            </p>

            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Vertical", valor: 4 / 5 },
                { label: "Tira alta", valor: 0.35 },
                { label: "Ancho", valor: 16 / 9 },
                { label: "Cuadrado", valor: 1 },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setAspecto(o.valor)}
                  className={[
                    "min-h-tap px-3 rounded-control border-2 text-sm font-semibold transition-colors",
                    aspecto === o.valor ? "border-gold bg-gold/10 text-ink" : "border-carbon-border text-ink-muted hover:border-carbon-border/60",
                  ].join(" ")}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <button
                type="button"
                onClick={() => setGiro90((g) => normalizarGrados(g - 90))}
                className="min-h-tap px-3 rounded-control border-2 border-carbon-border text-ink-muted font-bold text-sm"
              >
                ↺ 90°
              </button>
              <button
                type="button"
                onClick={() => setGiro90((g) => normalizarGrados(g + 90))}
                className="min-h-tap px-3 rounded-control border-2 border-carbon-border text-ink-muted font-bold text-sm"
              >
                ↻ 90°
              </button>
              <div className="w-px self-stretch bg-carbon-border" />
              <button
                type="button"
                onClick={() => setVolteado((v) => !v)}
                className={[
                  "min-h-tap px-3 rounded-control border-2 font-bold text-sm",
                  volteado ? "border-gold bg-gold/10 text-ink" : "border-carbon-border text-ink-muted",
                ].join(" ")}
              >
                ⇋ Voltear
              </button>
            </div>

            <div className="relative w-full h-64 bg-black rounded-control overflow-hidden">
              <Cropper
                image={urlParaCropper}
                crop={crop}
                zoom={zoom}
                rotation={giro90 + anguloFino}
                aspect={aspecto}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, areaPx) => setAreaPixeles(areaPx)}
                objectFit="contain"
              />
            </div>

            <label className="text-sm font-semibold text-ink flex flex-col gap-1">
              <span className="flex justify-between">
                <span>Ángulo fino</span>
                <span className="text-gold">{anguloFino}°</span>
              </span>
              <input
                type="range"
                min={-45}
                max={45}
                step={0.5}
                value={anguloFino}
                onChange={(e) => setAnguloFino(Number(e.target.value))}
                className="w-full accent-gold h-6"
              />
              <span className="text-xs font-normal text-ink-muted">
                Muévelo grado a grado hasta que las líneas de la tela queden derechas — los botones "90°" son para cuando la foto
                quedó completamente de lado o al revés.
              </span>
            </label>

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
              <button type="button" onClick={onCerrar} className="btn-admin-secondary text-sm">
                Cancelar
              </button>
              <button type="button" onClick={confirmarRecorte} disabled={procesando} className="btn-admin-primary text-sm">
                {procesando ? "Procesando…" : "Usar esta foto →"}
              </button>
            </div>
          </>
        )}

        {paso === "marcar" && tiraUrl && (
          <>
            <p className="text-xs text-ink-muted -mt-1">
              Toca la foto donde está cada color para poner un pin — puedes arrastrarlo para ajustarlo. A cada pin se le recorta
              automáticamente un circulito real de la foto para usarlo como imagen de ese color.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div
                ref={contenedorRef}
                onClick={clicEnFoto}
                className="relative w-full sm:w-56 shrink-0 rounded-card overflow-hidden border border-carbon-border bg-black cursor-crosshair select-none mx-auto"
                style={dimsNaturales ? { aspectRatio: `${dimsNaturales.w} / ${dimsNaturales.h}`, maxHeight: "60vh" } : { minHeight: 200 }}
              >
                <img
                  ref={imgElRef}
                  src={tiraUrl}
                  alt=""
                  draggable={false}
                  onLoad={(e) => setDimsNaturales({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
                {pines.map((pin, i) => (
                  <div
                    key={pin.id}
                    onMouseDown={(e) => iniciarArrastre(e, pin.id)}
                    onTouchStart={(e) => iniciarArrastre(e, pin.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                    className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 border-[3px] border-gold text-carbon font-extrabold text-xs flex items-center justify-center cursor-grab active:cursor-grabbing shadow"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 flex-1 w-full min-w-0">
                {pines.map((pin, i) => (
                  <div key={pin.id} className="flex items-center gap-2 bg-carbon rounded-control border border-carbon-border p-2">
                    <span className="w-6 h-6 rounded-full bg-gold text-carbon font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {pin.preview && (
                      <img src={pin.preview} alt="" className="w-8 h-8 rounded-full border border-carbon-border object-cover shrink-0" />
                    )}
                    <input
                      type="text"
                      value={pin.nombre}
                      onChange={(e) => actualizarPin(pin.id, { nombre: e.target.value })}
                      placeholder="Nombre del color"
                      className="campo-input flex-1 text-sm min-w-0"
                    />
                    <button type="button" onClick={() => quitarPin(pin.id)} aria-label="Quitar este color" className="text-terracota text-lg leading-none px-1 shrink-0">
                      ×
                    </button>
                  </div>
                ))}

                {pines.length === 0 && (
                  <p className="text-sm text-ink-muted bg-carbon rounded-control border border-dashed border-carbon-border p-3">
                    Todavía no has marcado ningún color. Toca la foto de la izquierda donde está cada uno.
                  </p>
                )}

                <button
                  type="button"
                  onClick={agregarPinBoton}
                  className="min-h-tap px-4 rounded-control border-2 border-dashed border-carbon-border text-gold font-bold text-sm self-start"
                >
                  + Agregar color
                </button>
              </div>
            </div>

            {error && <p className="text-terracota text-sm">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setPaso("recortar")} className="btn-admin-secondary text-sm">
                ← Volver a encuadrar
              </button>
              <button type="button" onClick={guardarTodos} disabled={guardando} className="btn-admin-primary text-sm">
                {guardando ? "Guardando…" : `Guardar ${pines.length || ""} color${pines.length === 1 ? "" : "es"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
