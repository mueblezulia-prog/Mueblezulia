const METODOS = [
  { nombre: "Efectivo", detalle: "Pago contra entrega o en nuestro local." },
  { nombre: "Transferencia / Pago Móvil", detalle: "Te compartimos los datos bancarios al confirmar tu pedido." },
  { nombre: "Zelle", detalle: "Disponible para clientes en el exterior." },
  { nombre: "Divisas (USD)", detalle: "Aceptamos dólares en efectivo." },
];

export default function MetodosPago() {
  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-ink mb-2">Métodos de Pago</h1>
      <p className="text-ink-muted text-lg mb-8">
        {/* TODO: confirmar la lista real de métodos de pago que acepta Mueble Zulia */}
        Estas son las formas en que puedes pagar tu mueble.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {METODOS.map((m) => (
          <div key={m.nombre} className="bg-carbon-light border border-carbon-border rounded-card p-5">
            <h2 className="text-lg font-bold text-ink mb-1">{m.nombre}</h2>
            <p className="text-ink-muted">{m.detalle}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-carbon-light border border-carbon-border rounded-card p-5">
        <h2 className="text-lg font-bold text-ink mb-1">¿Tienes dudas sobre el pago?</h2>
        <p className="text-ink-muted mb-4">Escríbenos y te ayudamos a coordinar la forma de pago que mejor te convenga.</p>
        <a
          href="https://wa.me/58" // TODO: reemplazar por el número real de WhatsApp
          className="min-h-tap inline-flex items-center px-5 rounded-control bg-gold text-carbon font-bold"
        >
          Escribir por WhatsApp
        </a>
      </div>
    </div>
  );
}
