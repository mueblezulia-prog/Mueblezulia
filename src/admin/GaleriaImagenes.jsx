import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getCroppedImageBlob } from "../lib/cropImage";
import ImageCropModule from "./ImageCropModule";

const BUCKET = "productos";

/**
 * Gestor de varias fotos por mueble (tabla `producto_imagenes`).
 *
 * Cada foto se recorta y se sube a Storage en el momento en que el admin
 * la agrega (no se espera al "Guardar" general del formulario) — así el
 * botón "Guardar" del producto solo necesita escribir la lista final de
 * URLs + orden en `producto_imagenes`, igual que ya hace con los colores.
 *
 * `fotos`: [{ id, url, orden }]  (id puede ser temporal o el id real de
 * la fila en producto_imagenes si el producto ya existía)
 */
export default function GaleriaImagenes({ fotos, onChange }) {
  const [editando, setEditando] = useState(null); // { id, originalUrl, file }
  const [cropState, setCropState] = useState({ crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, aspecto: 4 / 5 });
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  function handleSeleccionarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setEditando({ id: crypto.randomUUID(), file, originalUrl: URL.createObjectURL(file) });
    setCropState({ crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, aspecto: 4 / 5 });
    e.target.value = ""; // permite volver a elegir el mismo archivo después
  }

  async function handleAplicarRecorte() {
    if (!editando) return;
    setSubiendo(true);
    setError(null);
    try {
      let blob;
      if (cropState.croppedAreaPixels) {
        blob = await getCroppedImageBlob(editando.originalUrl, cropState.croppedAreaPixels);
      } else {
        blob = editando.file; // el admin no tocó el cropper: sube la foto tal cual
      }
      const nombreArchivo = `galeria/${editando.id}.jpg`;
      const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(nombreArchivo, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (errorSubida) throw errorSubida;
      const url = supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo).data.publicUrl;

      onChange([...fotos, { id: editando.id, url, orden: fotos.length }]);
      setEditando(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  function quitarFoto(id) {
    onChange(fotos.filter((f) => f.id !== id).map((f, i) => ({ ...f, orden: i })));
  }

  function moverFoto(id, direccion) {
    const i = fotos.findIndex((f) => f.id === id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= fotos.length) return;
    const copia = [...fotos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia.map((f, k) => ({ ...f, orden: k })));
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-lg font-bold text-ink">Galería (varias fotos)</span>
      <p className="text-sm text-ink-muted">
        La primera foto es la que se usa en la tarjeta del catálogo. El resto se puede deslizar en el detalle del producto.
      </p>

      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {fotos.map((foto, i) => (
            <div key={foto.id} className="relative w-24">
              <img src={foto.url} alt={`Foto ${i + 1}`} className="w-24 h-24 object-cover rounded-control border border-carbon-border" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-gold text-carbon text-xs font-bold px-1.5 py-0.5 rounded">
                  Portada
                </span>
              )}
              <div className="flex justify-center gap-1 mt-1">
                <button type="button" onClick={() => moverFoto(foto.id, -1)} disabled={i === 0}
                  className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30" aria-label="Mover antes">←</button>
                <button type="button" onClick={() => quitarFoto(foto.id)}
                  className="min-h-tap min-w-tap text-terracota font-bold" aria-label="Quitar foto">×</button>
                <button type="button" onClick={() => moverFoto(foto.id, 1)} disabled={i === fotos.length - 1}
                  className="min-h-tap min-w-tap text-ink-muted disabled:opacity-30" aria-label="Mover después">→</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando ? (
        <div className="flex flex-col gap-3 border-t border-carbon-border pt-3">
          <ImageCropModule
            imagenOriginalUrl={editando.originalUrl}
            aspecto={cropState.aspecto}
            onAspectoChange={(aspecto) => setCropState((s) => ({ ...s, aspecto }))}
            onChange={(nuevo) => setCropState((s) => ({ ...s, ...nuevo }))}
          />
          {error && <p className="text-terracota text-base">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleAplicarRecorte} disabled={subiendo}
              className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold disabled:opacity-60">
              {subiendo ? "Subiendo…" : "Añadir esta foto"}
            </button>
            <button type="button" onClick={() => setEditando(null)}
              className="min-h-tap px-5 rounded-control border-2 border-ink text-ink font-bold">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <label className="min-h-tap flex items-center justify-center rounded-control border-2 border-dashed border-carbon-border text-ink-muted cursor-pointer w-fit px-5">
          <input type="file" accept="image/*" onChange={handleSeleccionarArchivo} className="hidden" />
          + Agregar foto a la galería
        </label>
      )}
    </div>
  );
}
