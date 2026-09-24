import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

/**
 * Módulo de recorte y escala para el panel de administrador.
 * Recorte fijo en vertical (4:5) — la misma proporción que usa la
 * tarjeta del catálogo, para que todas las fotos se vean parejas.
 *
 * Este componente NO sube nada a Supabase por sí mismo — solo calcula
 * los parámetros de recorte. La subida del blob recortado ocurre en
 * ProductForm al guardar (ver src/lib/cropImage.js).
 */
export default function ImageCropModule({
  imagenOriginalUrl,
  cropInicial = { x: 0, y: 0 },
  zoomInicial = 1,
  areaInicial = null,
  onChange,
}) {
  const aspecto = 4 / 5;
  const [crop, setCrop] = useState(cropInicial);
  const [zoom, setZoom] = useState(zoomInicial);

  const handleCropComplete = useCallback(
    (_croppedArea, croppedAreaPixels) => {
      onChange?.({ crop, zoom, croppedAreaPixels, aspecto });
    },
    [crop, zoom, aspecto, onChange]
  );

  if (!imagenOriginalUrl) {
    return (
      <div className="aspect-[4/5] rounded-card border-2 border-dashed border-carbon-border flex items-center justify-center text-ink-muted text-base">
        Sube una foto para habilitar el recorte
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="text-lg font-bold text-ink">Encuadre de la foto</span>
        <p className="text-sm text-ink-muted">Arrastra la foto para acomodarla y usa el zoom para acercar. Así se verá en el catálogo.</p>
      </div>

      <div className="relative w-full aspect-[4/5] bg-black rounded-card overflow-hidden">
        <Cropper
          image={imagenOriginalUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspecto}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          objectFit="contain"
          // Al editar, arranca con el MISMO encuadre que ya estaba guardado.
          initialCroppedAreaPixels={areaInicial ?? undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="zoom-range" className="text-base font-semibold text-ink">
          Zoom ({Math.round(zoom * 100)}%)
        </label>
        <input
          id="zoom-range"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-gold h-8"
        />
      </div>
    </div>
  );
}
