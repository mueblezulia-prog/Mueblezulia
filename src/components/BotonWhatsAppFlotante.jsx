import IconoWhatsApp from "./IconoWhatsApp";
import { linkWhatsApp } from "../lib/contacto";
import { registrarClicWhatsApp } from "../lib/estadisticas";

/**
 * Botón redondo de WhatsApp que flota abajo a la derecha en todas las
 * páginas del sitio (menos en el detalle de un mueble, que ya tiene su
 * propia barra de WhatsApp). En el celular queda justo encima de la barra
 * de navegación, al alcance del pulgar.
 */
export default function BotonWhatsAppFlotante() {
  return (
    <a
      href={linkWhatsApp("Hola, vi su página web y quiero información sobre sus muebles.")}
      target="_blank"
      rel="noreferrer"
      onClick={() => registrarClicWhatsApp(null)}
      aria-label="Escríbenos por WhatsApp"
      className="fixed z-30 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:right-6
                 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center
                 shadow-lg shadow-black/40 ring-4 ring-black/20 hover:scale-105 active:scale-95 transition-transform"
    >
      <IconoWhatsApp className="w-7 h-7 sm:w-8 sm:h-8" />
    </a>
  );
}
