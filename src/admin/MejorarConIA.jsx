import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
      // Se manda la sesión del panel: el servidor solo acepta pedidos de
      // alguien que inició sesión (así nadie más gasta tu cuota de Gemini).
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch("/api/mejorar-descripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ texto, tipo }),
      });
      // Si el servidor no respondió con JSON (ej. se cayó o se está
      // reiniciando), mostramos un mensaje entendible en vez de un error raro.
      const datos = await res.json().catch(() => ({ ok: false, error: "El servidor no respondió. Intenta de nuevo en unos segundos." }));
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
