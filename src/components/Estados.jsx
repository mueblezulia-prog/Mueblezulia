/**
 * Estados reutilizables de carga / error / vacío, para que todas las
 * páginas se vean iguales mientras cargan (antes era un "Cargando…" de
 * texto suelto que hacía saltar la página, y los errores mostraban el
 * mensaje técnico de la base de datos al cliente).
 */

export function EsqueletoTarjetas({ cantidad = 8, columnas = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" }) {
  return (
    <div className={`grid ${columnas} gap-3 sm:gap-4`} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="esqueleto aspect-[4/5]" />
          <div className="esqueleto h-4 w-3/4 rounded-control" />
          <div className="esqueleto h-3 w-1/2 rounded-control" />
        </div>
      ))}
    </div>
  );
}

export function MensajeError({ titulo = "No pudimos cargar esta sección", onReintentar }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14">
      <p className="text-lg font-bold text-ink">{titulo}</p>
      <p className="text-ink-muted max-w-sm">Revisa tu conexión a internet e inténtalo de nuevo.</p>
      {onReintentar && (
        <button type="button" onClick={onReintentar} className="btn-outline mt-1">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function MensajeVacio({ children }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14">
      <img src="/assets/logo.png" alt="" className="w-12 h-12 object-contain opacity-40" />
      <p className="text-ink-muted text-lg max-w-md">{children}</p>
    </div>
  );
}
