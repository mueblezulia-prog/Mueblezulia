export default function Fabricacion() {
  const pasos = [
    {
      titulo: "Selección de materiales",
      texto: "Escogemos madera y tapicería de calidad para que cada mueble dure años en tu hogar.",
    },
    {
      titulo: "Fabricación artesanal",
      texto: "Nuestros carpinteros arman cada pieza a mano, cuidando cada detalle del acabado.",
    },
    {
      titulo: "Control de calidad",
      texto: "Revisamos cada mueble antes de entregarlo, verificando costuras, estructura y terminación.",
    },
    {
      titulo: "Entrega e instalación",
      texto: "Llevamos el mueble hasta tu casa y lo dejamos listo para usar.",
    },
  ];

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-ink mb-2">Nuestra Fabricación</h1>
      <p className="text-ink-muted text-lg mb-8">
        {/* TODO: reemplazar por el texto real de Mueble Zulia sobre su proceso de fabricación */}
        Así hacemos cada mueble, paso a paso, con la calidad que nos caracteriza.
      </p>

      <div className="space-y-5">
        {pasos.map((paso, i) => (
          <div key={paso.titulo} className="flex gap-4 bg-carbon-light border border-carbon-border rounded-card p-4">
            <div className="min-w-tap w-12 h-12 rounded-full bg-gold text-carbon font-extrabold text-lg flex items-center justify-center shrink-0">
              {i + 1}
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink mb-1">{paso.titulo}</h2>
              <p className="text-ink-muted">{paso.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
