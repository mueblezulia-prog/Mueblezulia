import { useEffect, useRef, useState } from "react";

/**
 * Envuelve cualquier contenido para que aparezca con un fundido suave
 * hacia arriba cuando entra en pantalla (o al cargar, si ya está
 * visible desde el inicio, como el Hero). Minimalista a propósito:
 * solo opacidad + un pequeño desplazamiento, nada llamativo.
 *
 * `delay` en milisegundos permite escalonar varios elementos seguidos
 * (por ejemplo, las tarjetas de un grid) para un efecto más elegante.
 */
export default function Reveal({ children, className = "", delay = 0, as: Tag = "div", ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Quien tenga activado "reducir movimiento" en su sistema ve el
    // contenido directamente, sin animación.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      {...props}
      className={[
        "transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      ].join(" ")}
      // El retraso escalonado solo aplica a la APARICIÓN: una vez visible se
      // quita, si no también retrasaba los efectos al pasar el mouse.
      style={{ ...props.style, transitionDelay: visible ? undefined : `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
