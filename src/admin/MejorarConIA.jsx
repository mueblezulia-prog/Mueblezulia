import { useState } from "react";

/**
 * Botón "✨ Mejorar con IA" para un campo de descripción: manda el texto
 * actual al servidor (que llama a Gemini) y muestra el resultado como una
 * SUGERENCIA aparte — nunca reemplaza lo que escribiste solo, para que
 * decidas si la usas o la descartas.
 *
 * `tipo`: "corta" | "larga" — cambia el estilo que le pide a la IA.
 * `onUsar(textoMejorado)`: se llama cuando el admin toca "Usar este texto".
 */
export default function MejorarConIA({ texto, tipo, onUsar }) {
  const [cargando, setCargando] = useState(false);
  const [sugerencia, setSugerencia] = useState(null);
  const [error, setError] = useState(null);

  async function mejorar() {
    if (!texto?.trim()) {
      setError("Escribe primero una descripción para poder mejorarla.");
      setSugerencia(null);
      return;
    }
    setCargando(true);
    setError(null);
    setSugerencia(null);
    try {
      const res = await fetch("/api/mejorar-descripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, tipo }),
      });
      const datos = await res.json();
      if (!res.ok || !datos.ok) throw new Error(datos.error || "No se pudo mejorar el texto.");
      setSugerencia(datos.mejorado);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <button
        type="button"
        onClick={mejorar}
        disabled={cargando}
        className="self-start min-h-tap px-3 rounded-control border-2 border-gold/50 text-gold font-bold text-xs disabled:opacity-60"
      >
        {cargando ? "Mejorando…" : "✨ Mejorar con IA"}
      </button>

      {error && <p className="text-xs text-terracota">{error}</p>}

      {sugerencia && (
        <div className="bg-carbon-light border border-gold/40 rounded-control p-3 flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">Sugerencia de la IA</span>
          <p className="text-sm text-ink leading-relaxed">{sugerencia}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onUsar(sugerencia);
                setSugerencia(null);
              }}
              className="min-h-tap px-3 rounded-control bg-gold text-carbon font-bold text-xs"
            >
              Usar este texto
            </button>
            <button
              type="button"
              onClick={() => setSugerencia(null)}
              className="min-h-tap px-3 rounded-control border border-carbon-border text-ink-muted font-bold text-xs"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
