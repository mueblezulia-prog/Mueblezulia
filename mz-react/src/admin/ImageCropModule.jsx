import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

/**
 * Módulo de recorte y escala para el panel de administrador.
 *
 * - `imagenOriginalUrl`: la foto tal cual la subió el admin (sin recortar).
 * - `aspecto`: relación de ancho/alto libre que el admin puede fijar
 *   (ej. 4/5 vertical, 1/1 cuadrado, 4/3). null = recorte libre.
 * - `onChange(cropState)`: se dispara en cada cambio con
 *   { crop, zoom, croppedAreaPixels } para que el formulario padre
 *   guarde el estado más reciente (y lo use al presionar "Guardar").
 *
 * Este componente NO sube nada a Supabase por sí mismo — solo calcula
 * los parámetros de recorte. La subida del blob recortado ocurre en
 * ProductForm al guardar (ver src/lib/cropImage.js).
 */
export default function ImageCropModule({
  imagenOriginalUrl,
  aspecto = 4 / 5,
  onAspectoChange,
  cropInicial = { x: 0, y: 0 },
  zoomInicial = 1,
  onChange,
}) {
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
      <span className="text-lg font-bold text-ink">Imagen de Producto (Crop &amp; Encuadre)</span>

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
          className="w-full accent-gold h-6"
        />
      </div>

      <div className="flex gap-2">
        {[
          { label: "Vertical", valor: 4 / 5 },
          { label: "Cuadrado", valor: 1 },
          { label: "Horizontal", valor: 4 / 3 },
        ].map((opcion) => (
          <button
            key={opcion.label}
            type="button"
            onClick={() => onAspectoChange?.(opcion.valor)}
            className={`min-h-tap px-4 rounded-control border text-base font-semibold
              ${aspecto === opcion.valor
                ? "bg-gold text-carbon border-gold"
                : "bg-transparent text-ink border-carbon-border"}`}
          >
            {opcion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
