import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AdminProductosLista() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function cargar() {
    setCargando(true);
    const { data, error } = await supabase
      .from("productos")
      .select("id, titulo, precio, imagen_recortada_url, activo, categoria_id, categorias(nombre)")
      .order("orden", { ascending: true });
    if (error) setError(error.message);
    else setProductos(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleBorrar(producto) {
    const confirmado = window.confirm(`¿Borrar "${producto.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    const { error } = await supabase.from("productos").delete().eq("id", producto.id);
    if (error) {
      alert(`No se pudo borrar: ${error.message}`);
      return;
    }
    setProductos((actual) => actual.filter((p) => p.id !== producto.id));
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">Muebles</h1>
        <button
          type="button"
          onClick={() => navigate("/admin/productos/nuevo")}
          className="min-h-tap px-5 rounded-control bg-gold text-carbon font-bold"
        >
          + Nuevo producto
        </button>
      </div>

      {cargando && <p className="text-ink-muted text-lg">Cargando…</p>}
      {error && <p className="text-terracota text-lg">Error: {error}</p>}

      {!cargando && !error && productos.length === 0 && (
        <p className="text-ink-muted text-lg">Todavía no hay productos cargados.</p>
      )}

      {!cargando && !error && productos.length > 0 && (
        <div className="flex flex-col gap-3">
          {productos.map((producto) => (
            <div
              key={producto.id}
              className="flex items-center gap-4 bg-carbon-light border border-carbon-border rounded-card p-3"
            >
              <img
                src={producto.imagen_recortada_url}
                alt={producto.titulo}
                className="w-16 h-16 object-cover rounded-control bg-carbon shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-ink truncate">{producto.titulo}</p>
                <p className="text-sm text-ink-muted">
                  {producto.categorias?.nombre ?? "Sin categoría"}
                  {!producto.activo && " · Oculto"}
                </p>
                <p className="text-gold font-bold">${Number(producto.precio).toLocaleString("es-VE")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  to={`/admin/productos/${producto.id}/editar`}
                  className="min-h-tap px-4 flex items-center rounded-control border-2 border-ink text-ink font-bold"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => handleBorrar(producto)}
                  className="min-h-tap px-4 rounded-control border-2 border-terracota text-terracota font-bold"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
