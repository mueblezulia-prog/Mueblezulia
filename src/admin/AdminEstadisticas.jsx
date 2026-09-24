import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Dorado para barras: un paso más oscuro que el dorado de marca, para que
// sobre el fondo oscuro no "encandile" (validado con buen contraste).
const COLOR_BARRA = "#BD8C09";
const COLOR_BARRA_HOVER = "#F2B90C";

const RANGOS = [
  { dias: 1, label: "Hoy" },
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}
function claveDia(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function contar(lista, fnClave) {
  const mapa = new Map();
  for (const item of lista) {
    const k = fnClave(item);
    if (k == null) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}
function numero(n) {
  return Number(n).toLocaleString("es-VE");
}

/**
 * Estadísticas del sitio: cuántas visitas hubo, cuántas personas
 * distintas, qué muebles miran más, de dónde llegan (WhatsApp,
 * Instagram…), desde qué ciudad y con qué dispositivo, y cuántas veces
 * tocaron el botón de WhatsApp.
 *
 * Los datos los va guardando el sitio solo (ver src/lib/estadisticas.js)
 * desde que se corre supabase/fase_1_16_opiniones_estadisticas.sql.
 */
export default function AdminEstadisticas() {
  const [dias, setDias] = useState(7);
  const [filas, setFilas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true);
      setError(null);
      // Se trae el doble del período para comparar con el período anterior.
      const desde = inicioDelDia(Date.now() - (dias * 2 - 1) * 86400000);
      const [{ data, error: e1 }, { data: prods }] = await Promise.all([
        supabase
          .from("visitas")
          .select("creado_en, tipo, ruta, producto_id, visitante, origen, dispositivo, pais, region, ciudad")
          .gte("creado_en", desde.toISOString())
          .order("creado_en", { ascending: false })
          .limit(20000),
        supabase.from("productos").select("id, titulo, imagen_recortada_url"),
      ]);
      if (!activo) return;
      if (e1) setError(e1.message);
      else setFilas(data ?? []);
      setProductos(prods ?? []);
      setCargando(false);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [dias, intento]);

  const datos = useMemo(() => calcular(filas, dias, productos), [filas, dias, productos]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">📊 Estadísticas</h1>
          <p className="text-sm text-ink-muted">Quién visita tu sitio y qué le interesa. Tus propias visitas no se cuentan.</p>
        </div>
        {/* Filtro de período: una sola fila, arriba de todo */}
        <div className="flex items-center gap-2">
          <div className="flex bg-carbon-light border border-carbon-border rounded-control p-1" role="group" aria-label="Período">
            {RANGOS.map((r) => (
              <button
                key={r.dias}
                type="button"
                onClick={() => setDias(r.dias)}
                aria-pressed={dias === r.dias}
                className={[
                  "min-h-[40px] px-3 rounded-control text-sm font-bold transition-colors",
                  dias === r.dias ? "bg-gold text-carbon" : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            aria-label="Actualizar"
            title="Actualizar"
            className="w-11 h-11 rounded-control border border-carbon-border text-ink-muted hover:text-ink hover:border-gold/50 text-lg"
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-card p-5 flex flex-col gap-2">
          <p className="text-terracota font-bold">No se pudieron cargar las estadísticas.</p>
          <p className="text-sm text-ink-muted">
            ¿Ya corriste <code className="text-ink">supabase/fase_1_16_opiniones_estadisticas.sql</code> en tu Supabase? ({error})
          </p>
        </div>
      )}

      {cargando && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="esqueleto h-28" />
          ))}
          <div className="esqueleto h-64 col-span-2 lg:col-span-4" />
        </div>
      )}

      {!cargando && !error && datos.total === 0 && (
        <div className="admin-card p-8 flex flex-col items-center text-center gap-2">
          <span className="text-4xl" aria-hidden="true">📈</span>
          <p className="text-lg font-bold text-ink">Todavía no hay visitas en este período</p>
          <p className="text-ink-muted max-w-md">
            Las visitas se empiezan a contar desde que se publica esta versión del sitio. Comparte el enlace de tu tienda y
            vuelve en un rato.
          </p>
        </div>
      )}

      {!cargando && !error && datos.total > 0 && (
        <>
          {/* NÚMEROS PRINCIPALES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tarjeta titulo="Visitas" valor={numero(datos.vistas)} cambio={datos.cambioVistas} ayuda="Páginas abiertas" />
            <Tarjeta titulo="Personas" valor={numero(datos.personas)} cambio={datos.cambioPersonas} ayuda="Visitantes distintos" />
            <Tarjeta titulo="Clics a WhatsApp" valor={numero(datos.clics)} cambio={datos.cambioClics} ayuda="Tocaron “Preguntar”" />
            <Tarjeta
              titulo="Interés"
              valor={`${datos.conversion}%`}
              ayuda="De cada 100 personas, cuántas escribieron"
            />
          </div>

          {/* VISITAS EN EL TIEMPO */}
          <Panel titulo={dias === 1 ? "Visitas por hora (hoy)" : "Visitas por día"}>
            <GraficoBarras barras={datos.serie} />
          </Panel>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel titulo="🛋️ Muebles más vistos">
              {datos.muebles.length === 0 ? (
                <Vacio>Nadie ha abierto un mueble todavía en este período.</Vacio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {datos.muebles.map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      {m.foto ? (
                        <img src={m.foto} alt="" className="w-10 h-12 object-cover rounded bg-carbon shrink-0" />
                      ) : (
                        <div className="w-10 h-12 rounded bg-carbon shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{m.titulo}</p>
                        <BarraHorizontal valor={m.vistas} maximo={datos.muebles[0].vistas} />
                      </div>
                      <div className="text-right shrink-0 w-20">
                        <p className="text-base font-bold text-ink">{numero(m.vistas)}</p>
                        <p className="text-xs text-ink-muted">{m.clics > 0 ? `💬 ${m.clics} clic${m.clics === 1 ? "" : "s"}` : "vistas"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel titulo="🔗 De dónde llegan">
              <ListaBarras items={datos.origenes} vacio="Sin datos todavía." />
              <p className="text-xs text-ink-muted mt-3">
                “Directo” = escribieron la dirección o abrieron un enlace compartido (WhatsApp muchas veces no avisa de dónde
                viene la persona, y se cuenta aquí).
              </p>
            </Panel>

            <Panel titulo="📍 Desde dónde visitan">
              <ListaBarras items={datos.ciudades} vacio="Todavía no hay ubicaciones." />
              <p className="text-xs text-ink-muted mt-3">Ubicación aproximada según la conexión a internet de cada persona.</p>
            </Panel>

            <Panel titulo="📱 Con qué dispositivo">
              <ListaBarras items={datos.dispositivos} vacio="Sin datos todavía." />
            </Panel>

            <Panel titulo="📄 Páginas más visitadas" className="lg:col-span-2">
              <ListaBarras items={datos.paginas} vacio="Sin datos todavía." />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ */

function calcular(filas, dias, productos) {
  const ahora = new Date();
  const inicioActual = inicioDelDia(ahora.getTime() - (dias - 1) * 86400000);
  const actuales = filas.filter((f) => new Date(f.creado_en) >= inicioActual);
  const anteriores = filas.filter((f) => new Date(f.creado_en) < inicioActual);

  const resumen = (lista) => {
    const vistas = lista.filter((f) => f.tipo === "vista");
    return {
      vistas: vistas.length,
      personas: new Set(vistas.map((f) => f.visitante).filter(Boolean)).size,
      clics: lista.filter((f) => f.tipo === "whatsapp").length,
    };
  };
  const act = resumen(actuales);
  const ant = resumen(anteriores);
  const cambio = (a, b) => (b === 0 ? null : Math.round(((a - b) / b) * 100));

  const vistas = actuales.filter((f) => f.tipo === "vista");
  const nombreProducto = new Map(productos.map((p) => [String(p.id), p]));

  // Serie: por hora (hoy) o por día.
  let serie;
  if (dias === 1) {
    serie = Array.from({ length: 24 }, (_, h) => ({
      etiqueta: `${h}h`,
      etiquetaLarga: `${h}:00 – ${h}:59`,
      valor: vistas.filter((f) => new Date(f.creado_en).getHours() === h).length,
    }));
  } else {
    const porDia = new Map(contar(vistas, (f) => claveDia(f.creado_en)));
    serie = Array.from({ length: dias }, (_, i) => {
      const d = new Date(inicioActual.getTime() + i * 86400000);
      return {
        etiqueta: d.toLocaleDateString("es-VE", { day: "numeric", month: "short" }),
        etiquetaLarga: d.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" }),
        valor: porDia.get(claveDia(d)) ?? 0,
      };
    });
  }

  const vistasProducto = contar(vistas.filter((f) => f.producto_id), (f) => f.producto_id);
  const clicsProducto = new Map(contar(actuales.filter((f) => f.tipo === "whatsapp" && f.producto_id), (f) => f.producto_id));
  const muebles = vistasProducto.slice(0, 8).map(([id, n]) => ({
    id,
    vistas: n,
    clics: clicsProducto.get(id) ?? 0,
    titulo: nombreProducto.get(id)?.titulo ?? "Mueble borrado",
    foto: nombreProducto.get(id)?.imagen_recortada_url ?? null,
  }));

  const nombrePagina = (ruta) => {
    if (!ruta || ruta === "/") return "Inicio";
    if (ruta.startsWith("/producto/")) return `Mueble: ${nombreProducto.get(ruta.split("/")[2])?.titulo ?? "(borrado)"}`;
    if (ruta.startsWith("/categoria/")) return `Categoría: ${decodeURIComponent(ruta.split("/")[2] ?? "")}`;
    const fijas = { "/catalogo": "Catálogo", "/telas": "Telas", "/fabricacion": "Fabricación", "/contacto": "Contacto" };
    return fijas[ruta] ?? ruta;
  };

  return {
    total: actuales.length,
    ...act,
    cambioVistas: cambio(act.vistas, ant.vistas),
    cambioPersonas: cambio(act.personas, ant.personas),
    cambioClics: cambio(act.clics, ant.clics),
    conversion: act.personas ? Math.round((act.clics / act.personas) * 100) : 0,
    serie,
    muebles,
    origenes: contar(vistas, (f) => f.origen || "Directo").slice(0, 8),
    ciudades: contar(vistas, (f) => (f.ciudad ? `${f.ciudad}${f.pais ? `, ${f.pais}` : ""}` : f.pais || "Desconocida")).slice(0, 8),
    dispositivos: contar(vistas, (f) => f.dispositivo || "Desconocido"),
    paginas: contar(vistas, (f) => nombrePagina(f.ruta)).slice(0, 8),
  };
}

/* ------------------------------------------------------------ */

function Panel({ titulo, children, className = "" }) {
  return (
    <section className={`admin-card p-4 sm:p-5 ${className}`}>
      <h2 className="text-base font-bold text-ink mb-4">{titulo}</h2>
      {children}
    </section>
  );
}

function Vacio({ children }) {
  return <p className="text-sm text-ink-muted py-4">{children}</p>;
}

function Tarjeta({ titulo, valor, cambio, ayuda }) {
  return (
    <div className="admin-card p-4 flex flex-col gap-1">
      <span className="text-sm font-semibold text-ink-muted">{titulo}</span>
      <span className="text-3xl font-extrabold text-ink leading-tight">{valor}</span>
      {cambio != null ? (
        <span className={["text-xs font-bold", cambio >= 0 ? "text-green-400" : "text-terracota"].join(" ")}>
          {cambio >= 0 ? "▲" : "▼"} {Math.abs(cambio)}% <span className="font-normal text-ink-muted">vs. período anterior</span>
        </span>
      ) : (
        <span className="text-xs text-ink-muted">{ayuda}</span>
      )}
    </div>
  );
}

function BarraHorizontal({ valor, maximo }) {
  const ancho = maximo ? Math.max(3, (valor / maximo) * 100) : 0;
  return (
    <div className="h-2 mt-1 rounded-full bg-carbon overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${ancho}%`, backgroundColor: COLOR_BARRA }} />
    </div>
  );
}

function ListaBarras({ items, vacio }) {
  if (!items.length) return <Vacio>{vacio}</Vacio>;
  const maximo = items[0][1];
  const total = items.reduce((s, [, n]) => s + n, 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map(([nombre, n]) => (
        <li key={nombre}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-ink truncate">{nombre}</span>
            <span className="text-sm font-bold text-ink shrink-0">
              {numero(n)} <span className="font-normal text-ink-muted">· {Math.round((n / total) * 100)}%</span>
            </span>
          </div>
          <BarraHorizontal valor={n} maximo={maximo} />
        </li>
      ))}
    </ul>
  );
}

/** Barras verticales simples (una sola serie) con detalle al pasar el dedo/mouse. */
function GraficoBarras({ barras }) {
  const [activa, setActiva] = useState(null);
  const maximo = Math.max(1, ...barras.map((b) => b.valor));
  // No mostrar todas las etiquetas si hay muchas barras (se encimarían).
  const cadaCuanto = barras.length > 14 ? Math.ceil(barras.length / 7) : barras.length > 12 ? 3 : 1;
  const detalle = activa != null ? barras[activa] : null;

  return (
    <div>
      <div className="h-6 mb-1 text-sm" aria-live="polite">
        {detalle ? (
          <span>
            <strong className="text-ink text-base">{numero(detalle.valor)}</strong>{" "}
            <span className="text-ink-muted">
              visita{detalle.valor === 1 ? "" : "s"} · {detalle.etiquetaLarga}
            </span>
          </span>
        ) : (
          <span className="text-ink-muted">Toca o pasa el mouse sobre una barra para ver el detalle.</span>
        )}
      </div>

      <div className="relative">
        {/* línea de referencia del máximo (recesiva) */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-white/10" aria-hidden="true" />
        <span className="absolute -top-2.5 right-0 text-xs text-ink-muted bg-carbon-light pl-1">{numero(maximo)}</span>

        <div className="h-48 flex items-end gap-[2px]" onPointerLeave={() => setActiva(null)}>
          {barras.map((b, i) => (
            <button
              key={i}
              type="button"
              onPointerEnter={() => setActiva(i)}
              onFocus={() => setActiva(i)}
              onClick={() => setActiva(i)}
              aria-label={`${b.etiquetaLarga}: ${b.valor} visitas`}
              className="flex-1 h-full flex items-end min-w-0 focus:outline-none"
            >
              <span
                className="w-full rounded-t-[4px] transition-colors"
                style={{
                  height: b.valor ? `${Math.max(2, (b.valor / maximo) * 100)}%` : "2px",
                  backgroundColor: b.valor ? (activa === i ? COLOR_BARRA_HOVER : COLOR_BARRA) : "rgba(255,255,255,0.08)",
                }}
              />
            </button>
          ))}
        </div>
        <div className="border-t border-carbon-border" />
        <div className="flex gap-[2px] mt-1.5">
          {barras.map((b, i) => (
            <span key={i} className="flex-1 min-w-0 text-center text-[11px] text-ink-muted overflow-visible whitespace-nowrap">
              {i % cadaCuanto === 0 ? b.etiqueta : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="mt-3">
        <summary className="text-sm text-ink-muted cursor-pointer hover:text-ink">Ver como tabla</summary>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {barras.map((b, i) => (
              <tr key={i} className="border-b border-carbon-border/50">
                <td className="py-1 text-ink-muted">{b.etiquetaLarga}</td>
                <td className="py-1 text-right text-ink font-semibold">{numero(b.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
