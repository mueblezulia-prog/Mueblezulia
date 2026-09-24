import { useEffect, useRef } from "react";

/**
 * Comportamiento estándar de cualquier ventana emergente del sitio:
 *  - la tecla Escape la cierra,
 *  - la página de atrás NO se desplaza mientras está abierta
 *    (antes se movía todo el fondo al hacer scroll dentro de la ventana).
 *
 * `abierta` permite usarlo en componentes que siempre están montados y
 * solo muestran la ventana a veces.
 */
export default function useModal(onCerrar, abierta = true) {
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    if (!abierta) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function alPresionarTecla(e) {
      if (e.key === "Escape") onCerrarRef.current?.();
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [abierta]);
}
