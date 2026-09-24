/**
 * Beneficios que se pueden marcar en cada tela (panel → Telas). Se guardan
 * por su `id`; si el admin escribe uno propio, se guarda el texto tal cual.
 */
export const BENEFICIOS_TELA = [
  { id: "antifluido", icono: "💧", texto: "Antifluido" },
  { id: "pet-friendly", icono: "🐾", texto: "Pet friendly" },
  { id: "antimanchas", icono: "🧼", texto: "Anti manchas" },
  { id: "facil-limpieza", icono: "🧽", texto: "Fácil de limpiar" },
  { id: "alta-resistencia", icono: "💪", texto: "Alta resistencia" },
  { id: "antidesgarro", icono: "🛡️", texto: "Resistente al rasgado" },
  { id: "resistente-sol", icono: "☀️", texto: "Resistente al sol" },
  { id: "suave", icono: "☁️", texto: "Suave al tacto" },
  { id: "antibacterial", icono: "🦠", texto: "Antibacterial" },
  { id: "lavable", icono: "🫧", texto: "Lavable" },
];

/** Convierte la lista guardada en insignias listas para dibujar. */
export function beneficiosDeFamilia(familia) {
  return (familia?.beneficios ?? []).filter(Boolean).map((valor) => {
    const conocido = BENEFICIOS_TELA.find((b) => b.id === valor);
    return conocido ?? { id: valor, icono: "✨", texto: valor };
  });
}

/** Estilo de la foto de portada (cuadrada) según el encuadre guardado. */
export function estiloPortada(familia) {
  const x = familia?.portada_pos_x ?? 50;
  const y = familia?.portada_pos_y ?? 50;
  const zoom = familia?.portada_zoom ?? 1;
  return { objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` };
}
