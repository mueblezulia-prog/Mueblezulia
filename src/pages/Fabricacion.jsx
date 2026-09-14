import SectionBanner from "../components/SectionBanner";

export default function Fabricacion() {
  return (
    <div>
      <div className="mb-8">
        <SectionBanner
          titulo="Excelencia en Manufactura"
          icono="🔨"
          imagenFondo="/assets/carpinteria.jpg"
          tinte="oscuro"
        />
      </div>

      <section className="px-4 pb-10 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-6 items-center">
          <div className="grid grid-cols-2 grid-rows-2 gap-3 h-72 sm:h-96">
            <img
              src="/assets/carpinteria.jpg"
              alt="Taller de carpintería de Muebles Zulia"
              className="w-full h-full object-cover rounded-card border border-carbon-border"
            />
            <img
              src="/assets/trabajador-4.jpg"
              alt="Artesanos instalando un mueble en el taller"
              className="w-full h-full object-cover rounded-card border border-carbon-border"
            />
            <img
              src="/assets/trabajador-2.png"
              alt="Artesano armando un mueble"
              className="w-full h-full object-cover rounded-card border border-carbon-border"
            />
            <img
              src="/assets/trabajador-3.png"
              alt="Artesano terminando un mueble"
              className="w-full h-full object-cover rounded-card border border-carbon-border"
            />
          </div>
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
