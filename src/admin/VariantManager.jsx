import { useState } from "react";

/**
 * Gestor de variantes de color. Mantiene una lista local
 * [{ id, nombre, hex, orden }] que el formulario padre guarda en
 * `producto_colores` al presionar "Guardar".
 */
export default function VariantManager({ variantes, onChange }) {
  const [nombre, setNombre] = useState("");
  const [hex, setHex] = useState("#F2B90C");

  function agregarVariante() {
    if (!nombre.trim()) return;
    const nueva = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      hex,
      orden: variantes.length,
    };
    onChange([...variantes, nueva]);
    setNombre("");
    setHex("#F2B90C");
  }

  function quitarVariante(id) {
    onChange(variantes.filter((v) => v.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-lg font-bold text-ink">Variantes de Color</span>

      <div className="flex flex-wrap gap-3">
        {variantes.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-2 bg-carbon-light border border-carbon-border rounded-control px-3 py-2"
          >
            <span
              className="w-6 h-6 rounded-full border border-carbon-border"
              style={{ backgroundColor: v.hex }}
            />
            <span className="text-base text-ink">{v.nombre}</span>
            <button
              type="button"
              aria-label={`Quitar ${v.nombre}`}
              onClick={() => quitarVariante(v.id)}
              className="text-ink-muted hover:text-terracota text-lg font-bold px-1"
            >
              ×
            </button>
          </div>
        ))}
        {!variantes.length && (
          <span className="text-ink-muted text-base">Aún no hay colores agregados.</span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-carbon-border">
        <div className="flex flex-col gap-1">
          <label htmlFor="v-nombre" className="text-sm text-ink-muted">Nombre del color</label>
          <input
            id="v-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Gold"
            className="min-h-tap px-3 rounded-control bg-carbon-light border border-carbon-border text-ink text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="v-hex" className="text-sm text-ink-muted">Valor HEX</label>
          <div className="flex items-center gap-2">
            <input
              id="v-hex"
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="w-12 h-12 rounded-control border border-carbon-border bg-carbon-light"
            />
            <input
              type="text"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="min-h-tap w-28 px-3 rounded-control bg-carbon-light border border-carbon-border text-ink text-base"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={agregarVariante}
          className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold text-base"
        >
          + Añadir Variante
        </button>
      </div>
    </div>
  );
}
