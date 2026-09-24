import { beneficiosDeFamilia } from "../lib/telas";

/**
 * Insignias verdes de beneficios de una tela ("💧 Antifluido",
 * "🐾 Pet friendly"…). `max`: cuántas mostrar (el resto como "+2").
 */
export default function InsigniasBeneficios({ familia, max, tamano = "md" }) {
  const lista = beneficiosDeFamilia(familia);
  if (!lista.length) return null;
  const visibles = max ? lista.slice(0, max) : lista;
  const resto = lista.length - visibles.length;
  const clase =
    tamano === "sm"
      ? "text-xs px-1.5 py-0.5 gap-1"
      : "text-sm px-2.5 py-1 gap-1.5";
  return (
    <div className="flex flex-wrap gap-1.5 min-w-0">
      {visibles.map((b) => (
        <span
          key={b.id}
          className={`inline-flex items-center max-w-full min-w-0 font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/40 rounded-full ${clase}`}
        >
          <span aria-hidden="true">{b.icono}</span>
          <span className="truncate">{b.texto}</span>
        </span>
      ))}
      {resto > 0 && (
        <span className={`inline-flex items-center font-semibold text-emerald-300/80 rounded-full ${clase}`}>+{resto}</span>
      )}
    </div>
  );
}
