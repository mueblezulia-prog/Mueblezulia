import { useEffect, useState } from "react";
import SectionBanner from "../components/SectionBanner";
import Reveal from "../components/Reveal";
import BloqueContenido from "../components/BloqueContenido";
import { obtenerContenido } from "../lib/contenido";

/**
 * La introducción ("Orgullosamente Fabricado en Maracaibo", fotos del
 * taller) ya NO es una sección aparte y fija — ahora es la primera
 * sección editable de "secciones_fabricacion", igual que cualquier otra
 * que el admin agregue desde /admin/contenido: se puede editar, cambiar
 * de tipo (a video, collage, etc.) o borrar por completo.
 */
export default function Fabricacion() {
  const [bloques, setBloques] = useState([]);

  useEffect(() => {
    let activo = true;
    obtenerContenido("secciones_fabricacion").then((d) => activo && setBloques((d.bloques ?? []).filter((b) => !b.oculto)));
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-8">
        <SectionBanner
          titulo="Excelencia en Manufactura"
          icono="/assets/icons/fabricacion.png"
          imagenFondo="/assets/carpinteria.jpg"
          tinte="oscuro"
        />
      </div>

      {/* Todo lo demás se arma y ordena desde /admin/contenido → "Página
          de Fabricación — Secciones extra", incluida la introducción. */}
      {bloques.map((bloque) => (
        <Reveal key={bloque.id} as="div" className="border-t border-carbon-border first:border-t-0">
          <BloqueContenido bloque={bloque} />
        </Reveal>
      ))}
    </div>
  );
}
