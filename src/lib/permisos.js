import { createContext, useContext } from "react";
import { supabase } from "./supabaseClient";

/**
 * Permisos que se le pueden dar a cada usuario. La protección de verdad
 * está en la base de datos (supabase/fase_1_21_permisos_usuarios.sql);
 * aquí solo se usan para mostrar u ocultar botones y pantallas.
 */
export const PERMISOS = [
  { id: "pedidos", icono: "🧾", label: "Pedidos", detalle: "Ver pedidos, registrarlos y cambiar su estado" },
  { id: "dinero", icono: "💵", label: "Precios y pagos", detalle: "Ver montos, totales y registrar abonos" },
  { id: "clientes", icono: "👥", label: "Clientes", detalle: "La libreta completa: editar y borrar clientes" },
  { id: "inventario", icono: "📦", label: "Inventario", detalle: "Agregar artículos, entradas y conteos de la tienda" },
  { id: "finanzas", icono: "📈", label: "Números del negocio", detalle: "Tablero, costos, anular abonos y entregar con deuda" },
  { id: "catalogo", icono: "🛋️", label: "Catálogo de la página", detalle: "Muebles, categorías, telas y etiquetas" },
  { id: "contenido", icono: "🖼️", label: "Contenido de la página", detalle: "Textos, fotos, secciones y opiniones" },
  { id: "estadisticas", icono: "📊", label: "Estadísticas", detalle: "Visitas de la página y qué miran" },
  { id: "usuarios", icono: "👤", label: "Usuarios", detalle: "Crear usuarios y darles permisos" },
];

/** Roles listos: al elegir uno se marcan sus permisos (luego se pueden ajustar). */
export const ROLES = [
  { id: "dueno", icono: "👑", label: "Dueño", detalle: "Todo, incluido crear usuarios", permisos: PERMISOS.map((p) => p.id) },
  { id: "vendedor", icono: "🤝", label: "Vendedor", detalle: "Factura, registra clientes y abonos, ve el inventario", permisos: ["pedidos", "dinero", "clientes"] },
  { id: "taller", icono: "🔨", label: "Taller", detalle: "Ve los pedidos y cambia su estado, sin precios", permisos: ["pedidos"] },
  { id: "web", icono: "🌐", label: "Página web", detalle: "Muebles, telas, contenido y estadísticas", permisos: ["catalogo", "contenido", "estadisticas"] },
  { id: "personalizado", icono: "⚙️", label: "Personalizado", detalle: "Tú eliges cada permiso", permisos: [] },
];

export function rolDe(id) {
  return ROLES.find((r) => r.id === id) ?? ROLES[ROLES.length - 1];
}

/**
 * Perfil del usuario que inició sesión: { usuario, rol, permisos, activo }.
 * Si todavía no se corrió fase_1_21 en Supabase (la función no existe),
 * se trata como dueño para que el panel siga funcionando como antes.
 */
export async function cargarMiPerfil() {
  const { data, error } = await supabase.rpc("mz_mi_perfil");
  if (error) {
    if (/function .* does not exist|Could not find the function|schema cache/i.test(error.message ?? "")) {
      return { usuario: null, rol: "dueno", permisos: [], activo: true, sinSQL: true };
    }
    throw error;
  }
  return data ?? { usuario: null, rol: "personalizado", permisos: [], activo: true };
}

export function crearPuede(perfil) {
  return (permiso) => {
    if (!perfil || perfil.activo === false) return false;
    if (perfil.rol === "dueno") return true;
    if (Array.isArray(permiso)) return permiso.some((p) => (perfil.permisos ?? []).includes(p));
    return (perfil.permisos ?? []).includes(permiso);
  };
}

export const PermisosContexto = createContext({ perfil: null, puede: () => true, recargar: () => {} });

/** `const { puede, perfil } = usePermisos(); puede("dinero")` */
export function usePermisos() {
  return useContext(PermisosContexto);
}
