import Reveal from "./Reveal";

/**
 * Franja de título de borde a borde, con foto de fondo difuminada
 * (efecto gaussiano) y una capa de vidrio semitransparente encima.
 * Se usa en todos los títulos de sección del sitio para que se vean
 * consistentes: Catálogo, cada categoría, Fabricación, Nuestra Sede, etc.
 *
 * tinte="dorado" -> vidrio amarillo/dorado (glass-gold)
 * tinte="blanco" -> vidrio blanco neutro (glass)
 * tinte="oscuro" -> vidrio oscuro/negro (glass-dark), para fondos de taller
 */
export default function SectionBanner({ titulo, icono, imagenFondo, tinte = "dorado", tamano = "normal" }) {
  const claseVidrio = tinte === "blanco" ? "glass" : tinte === "oscuro" ? "glass-dark" : "glass-gold";
  const claseTexto = tinte === "oscuro" ? "text-ink" : "text-ink";

  return (
    <Reveal
      className={[
        "relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden flex items-center justify-center",
        tamano === "grande" ? "py-10" : "py-6",
      ].join(" ")}
    >
      {imagenFondo && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-xl"
          style={{ backgroundImage: `url(${imagenFondo})` }}
        />
      )}
      <div className={`absolute inset-0 ${claseVidrio}`} />
      <div className="relative flex items-center gap-3 px-4">
        {icono &&
          (icono.startsWith("/") ? (
            <img
              src={icono}
              alt=""
              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 animar-entrada"
              style={{ animationDelay: "0ms" }}
            />
          ) : (
            <span className="text-2xl sm:text-3xl leading-none animar-entrada" style={{ animationDelay: "0ms" }}>
              {icono}
            </span>
          ))}
        <h2
          className={`${claseTexto} font-extrabold text-xl sm:text-2xl text-center uppercase tracking-wide drop-shadow-md animar-entrada`}
          style={{ animationDelay: "120ms" }}
        >
          {titulo}
        </h2>
      </div>
    </Reveal>
  );
}
