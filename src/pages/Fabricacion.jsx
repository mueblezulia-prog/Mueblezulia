export default function Fabricacion() {
  return (
    <div>
      <section className="px-4 py-10 max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">
          <span className="inline-block bg-ink text-carbon px-4 py-2 rounded-control">
            Excelencia en Manufactura
          </span>
        </h1>

        <div className="grid sm:grid-cols-2 gap-6 items-center">
          <img
            src="/assets/taller.jpg"
            alt="Artesano trabajando en el taller de Muebles Zulia"
            className="w-full h-72 sm:h-96 object-cover rounded-card border border-carbon-border"
          />
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gold mb-3">
              Pasión por el Detalle
            </h2>
            <p className="text-ink-muted text-lg leading-relaxed">
              En Muebles Zulia, la excelencia no es negociable. Supervisamos
              rigurosamente cada etapa de la confección, asegurándonos de que
              manos expertas trabajen con los mejores materiales para lograr
              los acabados impecables que tu hogar merece.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
