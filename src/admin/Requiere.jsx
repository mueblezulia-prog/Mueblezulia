import { usePermisos } from "../lib/permisos";

/**
 * Muestra la pantalla solo si el usuario tiene el permiso. Si no, un
 * aviso amable (en vez de una pantalla que falla al guardar).
 * `permiso` puede ser uno ("catalogo") o varios (["clientes", "pedidos"]).
 */
export default function Requiere({ permiso, children }) {
  const { puede } = usePermisos();
  if (puede(permiso)) return children;
  return (
    <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center gap-3">
      <span className="text-5xl" aria-hidden="true">🔒</span>
      <h1 className="text-xl font-extrabold text-ink">No tienes acceso a esta sección</h1>
      <p className="text-ink-muted">Si la necesitas, pídele al dueño que te dé el permiso desde "Usuarios".</p>
    </div>
  );
}
