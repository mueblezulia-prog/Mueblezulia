let contexto;

function obtenerContexto() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!contexto) contexto = new Ctor();
  if (contexto.state === "suspended") contexto.resume();
  return contexto;
}

/**
 * Sonido base: un tono corto y grave, con ataque casi instantáneo y
 * caída suave, pasado por un filtro pasa-bajos — nada de "beep" de
 * videojuego, se siente más como un toque suave sobre madera. Se usa
 * como confirmación táctil discreta en botones importantes.
 */
export function sonidoToque({ frecuencia = 520, duracion = 0.1, volumen = 0.05 } = {}) {
  const audioCtx = obtenerContexto();
  if (!audioCtx) return;
  try {
    const ahora = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const filtro = audioCtx.createBiquadFilter();
    const ganancia = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frecuencia, ahora);
    osc.frequency.exponentialRampToValueAtTime(Math.max(frecuencia * 0.6, 60), ahora + duracion);

    filtro.type = "lowpass";
    filtro.frequency.value = 1800;

    ganancia.gain.setValueAtTime(0, ahora);
    ganancia.gain.linearRampToValueAtTime(volumen, ahora + 0.006);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);

    osc.connect(filtro);
    filtro.connect(ganancia);
    ganancia.connect(audioCtx.destination);

    osc.start(ahora);
    osc.stop(ahora + duracion + 0.02);
  } catch {
    // Si el navegador bloquea el audio (autoplay, etc.) simplemente no suena — nunca rompe la interacción.
  }
}

/** Confirmación "cálida" para guardar/enviar: dos toques suaves y ascendentes. */
export function sonidoConfirmar() {
  sonidoToque({ frecuencia: 430, duracion: 0.09, volumen: 0.045 });
  setTimeout(() => sonidoToque({ frecuencia: 640, duracion: 0.11, volumen: 0.05 }), 75);
}

/** Toque muy leve para navegación (cambiar de pestaña, ir a una categoría). */
export function sonidoNavegar() {
  sonidoToque({ frecuencia: 600, duracion: 0.07, volumen: 0.03 });
}
