import { useState } from "react";

function esImagen(icono) {
  return icono?.startsWith("/") || icono?.startsWith("http");
}

/**
 * Dibuja las insignias doradas de un producto (telas/colores/etiquetas
 * personalizadas). En modo `compacto` (tarjeta del catálogo), si hay
 * más de 2 insignias se muestran solo los íconos para no saturar la
 * tarjeta; al tocar una, se expande con una animación suave revelando
 * el texto completo, y se puede volver a tocar para cerrarla.
 *
 * Como esto vive dentro de la tarjeta-link del catálogo, el toque
 * detiene la propagación para no disparar la navegación al detalle.
 */
export default function EtiquetasBadges({ etiquetas, compacto = false, tamano = "sm" }) {
  const [abiertaId, setAbiertaId] = useState(null);

  if (!etiquetas?.length) return null;

  const modoIconos = compacto && etiquetas.length > 2;
  const tamIcono = tamano === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const tamTexto = tamano === "sm" ? "text-xs" : "text-base";
  const padding = tamano === "sm" ? "px-2 py-0.5" : "px-3 py-1";

  return (
    <div className="flex flex-wrap gap-1">
      {etiquetas.map((etiqueta, i) => {
        const abierta = abiertaId === etiqueta.id;
        const revelar = !modoIconos || abierta;
        // Solo es un botón cuando se puede tocar (modo íconos); si no, es
        // un simple <span> — un <button> sin función dentro del link de
        // la tarjeta era HTML inválido.
        const Etiqueta = modoIconos ? "button" : "span";
        return (
          <Etiqueta
            key={etiqueta.id}
            type={modoIconos ? "button" : undefined}
            onClick={
              modoIconos
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAbiertaId(abierta ? null : etiqueta.id);
                  }
                : undefined
            }
            className={[
              "inline-flex items-center gap-1 self-start max-w-full min-w-0 font-semibold text-gold bg-gold/15 border border-gold/40 rounded-control",
              "transition-all duration-300 ease-out overflow-hidden animar-entrada",
              tamTexto,
              padding,
              modoIconos ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={`${tamIcono} shrink-0 flex items-center justify-center`}>
              {esImagen(etiqueta.icono) ? (
                <img src={etiqueta.icono} alt="" className="w-full h-full object-contain" />
              ) : (
                etiqueta.icono
              )}
            </span>
            <span
              className={[
                "whitespace-nowrap truncate min-w-0 transition-all duration-300 ease-out",
                revelar ? "max-w-[20rem] opacity-100 ml-0.5" : "max-w-0 opacity-0 ml-0",
              ].join(" ")}
            >
              {etiqueta.texto}
            </span>
          </Etiqueta>
        );
      })}
    </div>
  );
}
