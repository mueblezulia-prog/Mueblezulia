/**
 * Selector de variantes de color. Recibe `colores` desde Supabase
 * (tabla producto_colores: { id, nombre, hex }) y resalta el seleccionado
 * con un anillo dorado + check, con buen contraste para lectura 45+.
 */
export default function ColorSwatchSelector({ colores, seleccionado, onSeleccionar }) {
  if (!colores?.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-lg font-bold text-ink flex items-center gap-2">
        <img src="/assets/icons/tela.png" alt="" className="w-5 h-5" />
        Colores disponibles
      </span>
      <div className="flex flex-wrap gap-3">
        {colores.map((color) => {
          const activo = seleccionado?.id === color.id;
          return (
            <button
              key={color.id}
              type="button"
              title={color.nombre}
              aria-label={color.nombre}
              aria-pressed={activo}
              onClick={() => onSeleccionar(color)}
              className={`relative w-12 h-12 rounded-full border-2 transition
                ${activo ? "border-gold ring-2 ring-gold ring-offset-2 ring-offset-carbon" : "border-carbon-border"}`}
              style={{ backgroundColor: color.hex }}
            >
              {activo && (
                <span className="absolute inset-0 flex items-center justify-center text-white font-black text-lg [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      {seleccionado && (
        <span className="text-ink text-base">
          Elegido: <strong className="text-gold">{seleccionado.nombre}</strong>
        </span>
      )}
    </div>
  );
}
