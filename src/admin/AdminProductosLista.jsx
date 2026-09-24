import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { formatearPrecio } from "../lib/formato";

/**
 * Lista de muebles del panel.
 *  - Buscador y filtro por categoría (con muchos muebles ya no hay que
 *    bajar y bajar buscando uno).
 *  - Botón Visible/Oculto: esconde un mueble del sitio sin borrarlo.
 *  - Flechas ↑ ↓ para cambiar el orden en que salen en el catálogo.
 */
export default function AdminProductosLista() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [ocupadoId, setOcupadoId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Aviso que deja el formulario al guardar (ej. "se guardó, pero…").
  const [aviso, setAviso] = useState(location.state?.aviso ?? null);

  async function cargar() {
    setCargando(true);
    setError(null);
    const [{ data, error: errorProductos }, { data: categoriasData }] = await Promise.all([
      supabase
        .from("productos")
        .select("id, titulo, precio, imagen_recortada_url, activo, orden, categoria_id, categorias(nombre)")
        .order("orden", { ascending: true }),
      supabase.from("categorias").select("id, nombre").order("orden"),
    ]);
    if (errorProductos) setError(errorProductos.message);
    else setProductos(data ?? []);
    setCategorias(categoriasData ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // Limpia el aviso del historial para que no reaparezca al recargar.
    if (location.state?.aviso) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (filtroCategoria === "sin" && p.categoria_id) return false;
      if (filtroCategoria && filtroCategoria !== "sin" && String(p.categoria_id) !== filtroCategoria) return false;
      if (texto && !p.titulo?.toLowerCase().includes(texto)) return false;
      return true;
    });
  }, [productos, busqueda, filtroCategoria]);

  const hayFiltro = busqueda.trim() !== "" || filtroCategoria !== "";
  const ocultos = productos.filter((p) => p.activo === false).length;

  async function handleBorrar(producto) {
    const confirmado = window.confirm(
      `¿Borrar "${producto.titulo}"? Esta acción no se puede deshacer.\n\nSi solo quieres que no se vea en el sitio por un tiempo, usa el botón "Visible" para ocultarlo.`
    );
    if (!confirmado) return;
    setOcupadoId(producto.id);
    const { error: errorBorrar } = await supabase.from("productos").delete().eq("id", producto.id);
    setOcupadoId(null);
    if (errorBorrar) {
      setAviso({ tipo: "error", texto: `No se pudo borrar: ${errorBorrar.message}` });
      return;
    }
    setProductos((actual) => actual.filter((p) => p.id !== producto.id));
    setAviso({ tipo: "ok", texto: `"${producto.titulo}" se borró.` });
  }

  async function alternarVisible(producto) {
    const nuevo = producto.activo === false;
    setOcupadoId(producto.id);
    setProductos((actual) => actual.map((p) => (p.id === producto.id ? { ...p, activo: nuevo } : p)));
    const { error: errorVisible } = await supabase.from("productos").update({ activo: nuevo }).eq("id", producto.id);
    setOcupadoId(null);
    if (errorVisible) {
      setProductos((actual) => actual.map((p) => (p.id === producto.id ? { ...p, activo: !nuevo } : p)));
      setAviso({ tipo: "error", texto: `No se pudo cambiar: ${errorVisible.message}` });
    }
  }

  // Mueve un mueble una posición arriba/abajo y renumera el orden
  // (0, 1, 2…) — solo se guardan las filas cuyo número cambió.
  async function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= productos.length) return;
    const nuevaLista = [...productos];
    [nuevaLista[indice], nuevaLista[destino]] = [nuevaLista[destino], nuevaLista[indice]];
    const renumerada = nuevaLista.map((p, i) => ({ ...p, orden: i }));
    const cambiados = renumerada.filter((p, i) => productos.find((x) => x.id === p.id)?.orden !== i);
    setProductos(renumerada);
    const resultados = await Promise.all(
      cambiados.map((p) => supabase.from("productos").update({ orden: p.orden }).eq("id", p.id))
    );
    const fallo = resultados.find((r) => r.error);
    if (fallo) {
      setAviso({ tipo: "error", texto: `No se pudo guardar el nuevo orden: ${fallo.error.message}` });
      cargar();
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Muebles</h1>
          {!cargando && !error && (
            <p className="text-sm text-ink-muted">
              {productos.length} en total{ocultos > 0 ? ` · ${ocultos} oculto${ocultos === 1 ? "" : "s"}` : ""}
            </p>
          )}
        </div>
        <button type="button" onClick={() => navigate("/admin/productos/nuevo")} className="btn-admin-primary">
          + Nuevo mueble
        </button>
      </div>

      {aviso && (
        <div
          role="status"
          className={[
            "flex items-start justify-between gap-3 rounded-control border px-4 py-3 text-base",
            aviso.tipo === "error"
              ? "border-terracota/50 bg-terracota/10 text-ink"
              : aviso.tipo === "advertencia"
                ? "border-gold/50 bg-gold/10 text-ink"
                : "border-green-500/40 bg-green-500/10 text-ink",
          ].join(" ")}
        >
          <span>{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="text-ink-muted hover:text-ink text-lg leading-none">
            ✕
          </button>
        </div>
      )}

      {!cargando && !error && productos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar por nombre…"
            className="campo-input flex-1"
            aria-label="Buscar mueble"
          />
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="campo-input sm:w-56"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nombre}
              </option>
            ))}
            <option value="sin">Sin categoría</option>
          </select>
        </div>
      )}

      {cargando && (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="esqueleto h-24" />
          ))}
        </div>
      )}
      {error && (
        <div className="admin-card p-5 flex flex-col items-start gap-3">
          <p className="text-terracota font-bold">No se pudieron cargar los muebles.</p>
          <p className="text-sm text-ink-muted">{error}</p>
          <button type="button" onClick={cargar} className="btn-admin-secondary">Reintentar</button>
        </div>
      )}

      {!cargando && !error && productos.length === 0 && (
        <div className="admin-card p-8 flex flex-col items-center text-center gap-3">
          <span className="text-4xl" aria-hidden="true">🛋️</span>
          <p className="text-lg font-bold text-ink">Todavía no hay muebles cargados</p>
          <p className="text-ink-muted">Crea el primero y aparecerá en el catálogo del sitio.</p>
          <button type="button" onClick={() => navigate("/admin/productos/nuevo")} className="btn-admin-primary mt-1">
            + Crear primer mueble
          </button>
        </div>
      )}

      {!cargando && !error && productos.length > 0 && filtrados.length === 0 && (
        <p className="text-ink-muted text-center py-8">Ningún mueble coincide con la búsqueda.</p>
      )}

      {!cargando && !error && filtrados.length > 0 && (
        <>
          {hayFiltro && (
            <p className="text-xs text-ink-muted -mt-2">Para cambiar el orden con las flechas, quita la búsqueda y el filtro.</p>
          )}
          <ul className="flex flex-col gap-3">
            {filtrados.map((producto) => {
              const indiceReal = productos.findIndex((p) => p.id === producto.id);
              const oculto = producto.activo === false;
              const ocupado = ocupadoId === producto.id;
              return (
                <li
                  key={producto.id}
                  className={[
                    "admin-card p-3 flex flex-col sm:flex-row sm:items-center gap-3",
                    oculto ? "opacity-70" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {!hayFiltro && (
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => mover(indiceReal, -1)}
                          disabled={indiceReal === 0}
                          aria-label="Subir en el orden"
                          className="w-9 h-9 rounded-control text-ink-muted hover:text-ink hover:bg-white/5 disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => mover(indiceReal, 1)}
                          disabled={indiceReal === productos.length - 1}
                          aria-label="Bajar en el orden"
                          className="w-9 h-9 rounded-control text-ink-muted hover:text-ink hover:bg-white/5 disabled:opacity-20"
                        >
                          ▼
                        </button>
                      </div>
                    )}
                    {producto.imagen_recortada_url ? (
                      <img
                        src={producto.imagen_recortada_url}
                        alt=""
                        className="w-16 h-20 object-cover rounded-control bg-carbon shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-20 rounded-control bg-carbon border border-dashed border-carbon-border shrink-0 flex items-center justify-center text-xs text-ink-muted text-center">
                        Sin foto
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-ink truncate">{producto.titulo}</p>
                      <p className="text-sm text-ink-muted truncate">{producto.categorias?.nombre ?? "Sin categoría"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gold font-bold">{formatearPrecio(producto.precio)}</span>
                        {oculto && (
                          <span className="text-xs font-bold uppercase tracking-wide bg-white/10 text-ink-muted rounded-full px-2 py-0.5">
                            Oculto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_1fr_auto_auto] sm:flex gap-2 sm:shrink-0 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => alternarVisible(producto)}
                      disabled={ocupado}
                      title={oculto ? "Oculto en el sitio — toca para mostrarlo" : "Visible en el sitio — toca para ocultarlo"}
                      className={[
                        "min-h-tap px-2 sm:px-3 rounded-control border-2 font-bold text-sm whitespace-nowrap transition disabled:opacity-50",
                        oculto ? "border-carbon-border text-ink-muted hover:text-ink" : "border-green-500/50 text-green-400 bg-green-500/10",
                      ].join(" ")}
                    >
                      {oculto ? "🙈 Oculto" : "👁 Visible"}
                    </button>
                    <Link to={`/admin/productos/${producto.id}/editar`} className="btn-admin-secondary inline-flex items-center justify-center text-sm px-3 sm:px-4">
                      Editar
                    </Link>
                    <a
                      href={`/producto/${producto.id}`}
                      target="_blank"
                      rel="noopener"
                      className="min-h-tap px-3 inline-flex items-center rounded-control text-sm font-bold text-ink-muted hover:text-ink hover:bg-white/5"
                      title="Ver cómo se ve en el sitio"
                    >
                      Ver ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => handleBorrar(producto)}
                      disabled={ocupado}
                      className="btn-admin-danger text-sm px-3"
                      aria-label={`Borrar ${producto.titulo}`}
                    >
                      <span className="sm:hidden" aria-hidden="true">🗑</span>
                      <span className="hidden sm:inline">Borrar</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
