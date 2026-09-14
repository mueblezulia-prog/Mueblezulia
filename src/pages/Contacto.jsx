import { useEffect, useState } from "react";
import SectionBanner from "../components/SectionBanner";
import { obtenerContenido, CONTENIDO_DEFAULT } from "../lib/contenido";

const WHATSAPP_LINK = "https://wa.me/584127519141?text=" + encodeURIComponent("Hola, tengo una consulta sobre sus muebles.");

export default function Contacto() {
  const [sede, setSede] = useState(CONTENIDO_DEFAULT.nuestra_sede);
  const [metodos, setMetodos] = useState(CONTENIDO_DEFAULT.metodos_pago.metodos);

  useEffect(() => {
    let activo = true;
    obtenerContenido("nuestra_sede").then((d) => activo && setSede(d));
    obtenerContenido("metodos_pago").then((d) => activo && setMetodos(d.metodos ?? []));
    return () => {
      activo = false;
    };
  }, []);

  const mapsEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(sede.direccion)}&output=embed`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede.direccion)}`;

  return (
    <div>
      {/* NUESTRA SEDE */}
      <section className="max-w-5xl mx-auto">
        <div className="mb-6">
          <SectionBanner titulo="Nuestra Sede" icono="📍" imagenFondo={sede.imagen} tinte="blanco" />
        </div>

        <div className="px-4">
          {/* La foto se ve completa (object-contain, sin recortar) y la
              tarjeta de información sube con margen negativo para que el
              panel de vidrio quede montado sobre la parte de abajo de la
              foto — mismo efecto premium que en el detalle de producto. */}
          <div className="relative rounded-card overflow-hidden bg-carbon-light border border-carbon-border">
            <img
              src={sede.imagen}
              alt="Fachada de Muebles Zulia"
              className={`w-full max-h-[420px] ${sede.ajusteImagen === "cover" ? "h-[420px] object-cover" : "object-contain"} bg-carbon`}
            />
          </div>

          <div className="relative -mt-10 sm:-mt-14 mx-3 sm:mx-6 glass rounded-card p-5 flex flex-col items-start">
            <h2 className="text-xl font-bold text-ink mb-2">{sede.titulo}</h2>
            <p className="text-ink-muted mb-4">{sede.texto}</p>
            <p className="text-ink font-semibold mb-4">{sede.direccion}</p>
            <a
              href={mapsLink}
              target="_blank"
              rel="noreferrer"
              className="min-h-tap inline-flex items-center justify-center px-5 rounded-control bg-gold text-carbon font-bold
                         hover:bg-gold-hover active:scale-[0.98] transition-all duration-200"
            >
              Ver en Google Maps
            </a>
          </div>
        </div>

        <div className="px-4">
          <div className="mt-6 rounded-card overflow-hidden border border-carbon-border h-64">
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
      <section className="pb-10 max-w-5xl mx-auto">
        <div className="my-8">
          <SectionBanner titulo="Métodos de Pago" icono="💳" imagenFondo="/assets/interior-tienda.jpg" tinte="blanco" />
        </div>
        <div className="px-4 grid sm:grid-cols-2 gap-4">
          {metodos.map((m, i) => (
            <div
              key={m.nombre || i}
              className="bg-carbon-light border border-carbon-border rounded-card p-5 flex gap-4
                         hover:border-gold/40 hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
            >
              <span className="text-3xl leading-none shrink-0">{m.icono}</span>
              <div>
                <h3 className="text-lg font-bold text-ink mb-1">{m.nombre}</h3>
                <p className="text-ink-muted">{m.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACTO DIRECTO */}
      <section className="px-4 py-10 max-w-5xl mx-auto border-t border-carbon-border text-center">
        <h2 className="text-2xl font-extrabold text-ink mb-4">¿Tienes dudas?</h2>
        <p className="text-ink-muted mb-6">Escríbenos y te ayudamos con tu pedido o cotización.</p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="min-h-tap inline-flex items-center justify-center px-6 rounded-control bg-gold text-carbon font-bold text-lg"
        >
          Escribir por WhatsApp
        </a>
      </section>
    </div>
  );
}
