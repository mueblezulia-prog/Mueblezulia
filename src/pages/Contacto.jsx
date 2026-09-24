import { useEffect, useState } from "react";
import SectionBanner from "../components/SectionBanner";
import Reveal from "../components/Reveal";
import BloqueContenido from "../components/BloqueContenido";
import FondoMultimedia from "../components/FondoMultimedia";
import { obtenerContenido, CONTENIDO_DEFAULT, ALTOS_BLOQUE } from "../lib/contenido";
import { sonidoConfirmar, sonidoNavegar } from "../lib/sonido";
import { linkWhatsApp, WHATSAPP_NUMERO } from "../lib/contacto";
import IconoWhatsApp from "../components/IconoWhatsApp";

const WHATSAPP_LINK = linkWhatsApp("Hola, tengo una consulta sobre sus muebles.");

export default function Contacto() {
  const [sede, setSede] = useState(CONTENIDO_DEFAULT.nuestra_sede);
  const [metodos, setMetodos] = useState(CONTENIDO_DEFAULT.metodos_pago.metodos);
  const [bloques, setBloques] = useState([]);

  useEffect(() => {
    let activo = true;
    obtenerContenido("nuestra_sede").then((d) => activo && setSede(d));
    obtenerContenido("metodos_pago").then((d) => activo && setMetodos(d.metodos ?? []));
    obtenerContenido("secciones_ubicacion").then((d) => activo && setBloques(d.bloques ?? []));
    return () => {
      activo = false;
    };
  }, []);

  // Con solo la dirección de texto, la búsqueda a veces cae en un local
  // vecino (p. ej. "Alkosto") en vez de la mueblería. Si hay coordenadas
  // exactas guardadas, el mapa se centra ahí sin ambigüedad.
  const mapsEmbedSrc = sede.coordenadas
    ? `https://www.google.com/maps?q=${encodeURIComponent(sede.coordenadas)}&z=18&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(sede.direccion)}&output=embed`;
  // Preferimos el enlace real copiado desde Google Maps (lleva exacto al
  // punto marcado); si todavía no se ha llenado, usamos como respaldo uno
  // armado con la dirección de texto.
  const mapsLink =
    sede.enlaceMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede.direccion)}`;
  const sedeAlto = ALTOS_BLOQUE[sede.alto] ?? ALTOS_BLOQUE.grande;
  const sedeAjuste = sede.ajusteImagen === "contain" ? "object-contain bg-carbon" : "object-cover";
  const sedeImagenes = sede.tipoMedia === "diapositiva" ? sede.imagenes ?? [] : [sede.imagenes?.[0] ?? sede.imagen];

  return (
    <div>
      {/* NUESTRA SEDE */}
      <section className="max-w-6xl mx-auto">
        <div className="mb-6">
          <SectionBanner titulo="Nuestra Sede" icono="/assets/icons/ubicacion.png" imagenFondo={sede.imagen} tinte="blanco" />
        </div>

        {/* En computador: la sede a la izquierda y el mapa a la derecha
            (antes el mapa quedaba abajo, lejos, con la página muy larga). */}
        <div className="px-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-stretch">
          {/* Un solo cuadro completo: la foto y el panel de vidrio viven
              DENTRO del mismo contenedor con overflow-hidden, así los
              bordes redondeados quedan unificados en vez de dos cajas
              separadas que no encajaban bien entre sí. */}
          <div className="relative rounded-card overflow-hidden border border-carbon-border bg-carbon-light">
            <FondoMultimedia
              imagenes={sedeImagenes}
              video={sede.video}
              tipoMedia={sede.tipoMedia}
              alto={sedeAlto}
              ajuste={sedeAjuste}
              enfoque={sede.enfoque}
              alt="Fachada de Muebles Zulia"
            />

            <div className="relative -mt-10 sm:-mt-14 glass p-5 flex flex-col items-start animar-entrada">
              <h2 className="text-xl font-bold text-ink mb-2">{sede.titulo}</h2>
              <p className="text-ink-muted mb-4">{sede.texto}</p>
              <p className="text-ink font-semibold mb-1">{sede.direccion}</p>
              {sede.horario && (
                <p className="text-ink-muted text-sm mb-4 flex items-center gap-1.5">
                  <span aria-hidden="true">🕒</span> {sede.horario}
                </p>
              )}
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                onClick={sonidoNavegar}
                className="min-h-tap inline-flex items-center justify-center gap-2 px-5 rounded-control bg-gold text-carbon font-bold
                           hover:bg-gold-hover active:scale-[0.98] transition-all duration-200"
              >
                📍 Ver en Google Maps
              </a>
            </div>
          </div>

          <div className="mt-6 lg:mt-0 rounded-card overflow-hidden border border-carbon-border h-64 sm:h-80 lg:h-auto lg:min-h-[24rem]">
            <iframe
              title="Ubicación de Muebles Zulia"
              src={mapsEmbedSrc}
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* MÉTODOS DE PAGO */}
      <section className="pb-10 max-w-6xl mx-auto">
        <div className="my-8">
          <SectionBanner titulo="Métodos de Pago" icono="/assets/icons/pago-general.png" imagenFondo="/assets/interior-tienda.jpg" tinte="blanco" />
        </div>
        <div className="px-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metodos.map((m, i) => (
            <Reveal
              key={m.nombre || i}
              delay={(i % 6) * 70}
              className="bg-carbon-light border border-carbon-border rounded-card p-5 flex gap-4
                         hover:border-gold/40 hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
            >
              <span className="text-3xl leading-none shrink-0 w-9 h-9 flex items-center justify-center">
                {m.icono?.startsWith("/") ? (
                  <img src={m.icono} alt="" className="w-full h-full object-contain" />
                ) : (
                  m.icono
                )}
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink mb-1">{m.nombre}</h3>
                <p className="text-ink-muted">{m.detalle}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CONTACTO DIRECTO */}
      <section className="contenedor py-12">
        <div className="relative overflow-hidden rounded-card glass-gold px-6 py-10 text-center flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-2">¿Tienes dudas?</h2>
          <p className="text-ink/90 mb-6 max-w-md">Escríbenos y te ayudamos con tu pedido o cotización. Respondemos rápido.</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              onClick={sonidoConfirmar}
              className="min-h-tap inline-flex items-center justify-center gap-2 px-6 rounded-control bg-gold text-carbon font-bold text-lg
                         shadow-lg shadow-black/25 hover:bg-gold-hover active:scale-[0.98] transition-all duration-200"
            >
              <IconoWhatsApp className="w-6 h-6" />
              Escribir por WhatsApp
            </a>
            <a href={`tel:+${WHATSAPP_NUMERO}`} className="btn-outline w-auto">
              📞 Llamar
            </a>
          </div>
        </div>
      </section>

      {/* Secciones libres, armadas y ordenadas desde /admin/contenido
          ("Página de Ubicación") — más fotos, más texto, banners, en
          el orden que el admin quiera. */}
      {bloques.map((bloque) => (
        <Reveal key={bloque.id} as="div" className="border-t border-carbon-border">
          <BloqueContenido bloque={bloque} />
        </Reveal>
      ))}
    </div>
  );
}
