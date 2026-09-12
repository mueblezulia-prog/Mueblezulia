export default function Ubicacion() {
  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-ink mb-2">Ubicación y Contacto</h1>
      <p className="text-ink-muted text-lg mb-8">
        {/* TODO: reemplazar por la dirección y datos de contacto reales */}
        Visítanos o contáctanos por cualquiera de estos medios.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-carbon-light border border-carbon-border rounded-card p-5">
          <h2 className="text-lg font-bold text-ink mb-1">Dirección</h2>
          <p className="text-ink-muted">Zulia, Venezuela — dirección exacta pendiente de confirmar.</p>
        </div>
        <div className="bg-carbon-light border border-carbon-border rounded-card p-5">
          <h2 className="text-lg font-bold text-ink mb-1">Horario</h2>
          <p className="text-ink-muted">Lunes a sábado, 9:00 am – 6:00 pm.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="https://wa.me/58" // TODO: número real de WhatsApp
          className="min-h-tap flex items-center justify-center px-6 rounded-control bg-gold text-carbon font-bold text-lg"
        >
          Escribir por WhatsApp
        </a>
        <a
          href="https://maps.google.com" // TODO: link real de Google Maps
          className="min-h-tap flex items-center justify-center px-6 rounded-control border border-ink text-ink font-bold text-lg"
        >
          Ver en Google Maps
        </a>
      </div>
    </div>
  );
}
