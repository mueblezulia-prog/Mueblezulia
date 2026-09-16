import { useEffect, useState } from "react";
import { obtenerContenido } from "../lib/contenido";
import BloqueContenido from "../components/BloqueContenido";

const DIRECCION = "Av. 15 Delicias, frente a Alkosto, Maracaibo, Zulia";
const MAPS_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(DIRECCION)}&output=embed`;
const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DIRECCION)}`;

const METODOS = [
  { nombre: "Efectivo", detalle: "Pago contra entrega o directo en nuestra sede.", icono: "/assets/icons/pago-efectivo.png" },
  { nombre: "Transferencia / Pago Móvil", detalle: "Te compartimos los datos bancarios al confirmar tu pedido.", icono: "/assets/icons/pago-movil.png" },
  { nombre: "Zelle", detalle: "Disponible para clientes en el exterior.", icono: "/assets/icons/pago-zelle.png" },
  { nombre: "Divisas (USD)", detalle: "Aceptamos dólares en efectivo.", icono: "/assets/icons/pago-divisas.png" },
];

export default function Contacto() {
  const [bloquesExtra, setBloquesExtra] = useState([]);

  useEffect(() => {
    let activo = true;
    obtenerContenido("secciones_ubicacion").then((c) => {
      if (activo) setBloquesExtra(c.bloques ?? []);
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      {/* NUESTRA SEDE */}
      <section className="max-w-5xl mx-auto">
        <div className="bg-gold py-3 mb-6">
          <h1 className="text-center text-carbon font-extrabold text-xl sm:text-2xl uppercase tracking-wide">
            Nuestra Sede
          </h1>
        </div>

        <div className="px-4 grid sm:grid-cols-2 gap-4 items-stretch">
          <img
            src="/assets/ubicacion.jpg"
            alt="Fachada de Muebles Zulia"
            className="w-full h-56 sm:h-full object-cover rounded-card border border-carbon-border"
          />
          <div className="bg-carbon-light border border-carbon-border rounded-card p-5 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-ink mb-2">¡Te esperamos en Muebles Zulia! 📍</h2>
            <p className="text-ink-muted mb-4">
              Ven a conocer la calidad y el diseño que cambiarán tu hogar.
            </p>
            <p className="text-ink font-semibold mb-4">{DIRECCION}</p>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noreferrer"
              className="min-h-tap inline-flex items-center justify-center px-5 rounded-control bg-gold text-carbon font-bold"
            >
              Ver en Google Maps
            </a>
          </div>
        </div>

        <div className="px-4">
          <div className="mt-4 rounded-card overflow-hidden border border-carbon-border h-64">
            <iframe
              title="Ubicación de Muebles Zulia"
              src={MAPS_EMBED_SRC}
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* MÉTODOS DE PAGO */}
      <section className="px-4 py-10 max-w-5xl mx-auto border-t border-carbon-border">
        <h2 className="text-2xl font-extrabold text-ink mb-6 text-center">Métodos de Pago</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {METODOS.map((m) => (
            <div key={m.nombre} className="bg-carbon-light border border-carbon-border rounded-card p-5 flex gap-4 items-start">
              <img src={m.icono} alt="" className="w-10 h-10 shrink-0" />
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
          href="https://wa.me/584127519141"
          className="min-h-tap inline-flex items-center justify-center px-6 rounded-control bg-gold text-carbon font-bold text-lg"
        >
          Escribir por WhatsApp
        </a>
      </section>

      {/* Secciones extra armadas desde /admin/contenido */}
      {bloquesExtra.map((bloque) => (
        <BloqueContenido key={bloque.id} bloque={bloque} />
      ))}
    </div>
  );
}
