import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabaseClient";
import { formatearPrecio } from "../lib/formato";
import useModal from "../hooks/useModal";
import ImagenConPuntos from "../components/ImagenConPuntos";

const sinAcentos = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function ElegirMueble({ productos, onElegir, onCerrar }) {
  useModal(onCerrar);
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const t = sinAcentos(q.trim());
    return t ? productos.filter((p) => sinAcentos(p.titulo).includes(t)) : productos;
  }, [q, productos]);
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label="¿Qué mueble es?" onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg max-h-[85vh] flex flex-col bg-carbon border border-carbon-border rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="p-4 flex items-center gap-2 border-b border-carbon-border">
          <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Qué mueble es? Búscalo…" className="campo-input flex-1" />
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="min-w-tap min-h-tap rounded-control text-ink text-xl hover:bg-white/5">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {lista.length === 0 && <p className="p-6 text-center text-ink-muted">No se encontró.</p>}
          {lista.map((p) => (
            <button key={p.id} type="button" onClick={() => onElegir(p)} className="w-full flex items-center gap-3 p-2 rounded-control text-left hover:bg-white/5">
              <span className="w-12 h-12 shrink-0 rounded-control overflow-hidden bg-carbon-light">
                {p.imagen_recortada_url && <img src={p.imagen_recortada_url} alt="" loading="lazy" className="w-full h-full object-cover" />}
              </span>
              <span className="flex-1 min-w-0 font-semibold text-ink truncate">{p.titulo}</span>
              <span className="text-sm text-gold font-bold">{formatearPrecio(p.precio)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * "Muebles en esta foto": tocas la foto donde sale otro mueble (una mesa,
 * una lámpara…) y eliges cuál es. En la página aparece un punto que lleva
 * a ese mueble. También se pueden sugerir muebles "para combinar" sin punto.
 * Se guarda al instante.
 */
export default function EditorMueblesEnFoto({ productoId, fotos = [] }) {
  const [filas, setFilas] = useState(null);
  const [productos, setProductos] = useState([]);
  const [fotoSel, setFotoSel] = useState(0);
  const [pendiente, setPendiente] = useState(null); // { x, y } o { sinPunto: true }
  const [error, setError] = useState(null);
  const listaFotos = fotos.filter(Boolean).filter((u, i, a) => a.indexOf(u) === i);
  const url = listaFotos[fotoSel] ?? listaFotos[0];

  useEffect(() => {
    if (!productoId) return;
    Promise.all([
      supabase.from("producto_en_foto").select("*").eq("producto_id", productoId).order("orden"),
      supabase.from("productos").select("id, titulo, precio, imagen_recortada_url").order("titulo"),
    ]).then(([f, p]) => {
      if (f.error) setError(/does not exist|schema cache|Could not find/i.test(f.error.message) ? "Falta correr supabase/fase_1_24_mercancia_qr_fotos.sql en tu Supabase." : f.error.message);
      else setFilas(f.data ?? []);
      setProductos((p.data ?? []).filter((x) => String(x.id) !== String(productoId)));
    });
  }, [productoId]);

  if (!productoId) {
    return (
      <section className="admin-card p-4 flex flex-col gap-2">
        <h2 className="text-base font-semibold text-ink">🔍 Muebles en esta foto</h2>
        <p className="text-sm text-ink-muted">Guarda el mueble primero. Después podrás marcar otros muebles que salen en su foto.</p>
      </section>
    );
  }

  const esPortada = (r) => !r.imagen_url || r.imagen_url === listaFotos[0];
  const enEstaFoto = (filas ?? []).filter((r) => r.x !== null && r.x !== undefined && (fotoSel === 0 ? esPortada(r) : r.imagen_url === url));
  const sinPunto = (filas ?? []).filter((r) => r.x === null || r.x === undefined);
  const nombre = (id) => productos.find((p) => String(p.id) === String(id))?.titulo ?? "Mueble";
  const numeroDe = (r) => enEstaFoto.indexOf(r) + 1;

  async function agregar(p) {
    const fila = {
      producto_id: productoId,
      relacionado_id: p.id,
      imagen_url: pendiente?.sinPunto || fotoSel === 0 ? null : url,
      x: pendiente?.sinPunto ? null : pendiente.x,
      y: pendiente?.sinPunto ? null : pendiente.y,
      orden: (filas?.length ?? 0) + 1,
    };
    setPendiente(null);
    const { data, error: e } = await supabase.from("producto_en_foto").insert(fila).select("*").single();
    if (e) setError(e.message);
    else setFilas((l) => [...(l ?? []), data ?? fila]);
  }

  async function quitar(r) {
    const { error: e } = await supabase.from("producto_en_foto").delete().eq("id", r.id);
    if (e) setError(e.message);
    else setFilas((l) => l.filter((x) => x.id !== r.id));
  }

  return (
    <section className="admin-card p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">🔍 Muebles en esta foto</h2>
        <p className="text-sm text-ink-muted">Toca la foto donde sale otro mueble que vendes y elige cuál es. En la página aparece un punto que lleva a ese mueble. Se guarda al instante.</p>
      </div>
      {error && <p className="text-sm text-terracota font-semibold">{error}</p>}
      {listaFotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {listaFotos.map((u, i) => (
            <button key={u} type="button" onClick={() => setFotoSel(i)} aria-pressed={fotoSel === i} className={`shrink-0 w-14 h-14 rounded-control overflow-hidden border-2 ${fotoSel === i ? "border-gold" : "border-transparent opacity-60"}`}>
              <img src={u} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {url ? (
        <div className="aspect-[4/5] max-h-[28rem] w-full bg-carbon-light rounded-control overflow-hidden">
          <ImagenConPuntos
            src={url}
            puntos={enEstaFoto.map((r) => ({ id: r.id, x: Number(r.x), y: Number(r.y), numero: numeroDe(r), etiqueta: nombre(r.relacionado_id) })).concat(pendiente && !pendiente.sinPunto ? [{ id: "nuevo", x: pendiente.x, y: pendiente.y, numero: "?" }] : [])}
            onTocarFoto={(x, y) => setPendiente({ x, y })}
          />
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Este mueble no tiene foto todavía.</p>
      )}

      {filas && (enEstaFoto.length > 0 || sinPunto.length > 0) && (
        <ul className="flex flex-col gap-1.5">
          {enEstaFoto.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-control bg-white/[0.03] px-2.5 py-2">
              <span className="w-6 h-6 rounded-full bg-gold text-carbon text-xs font-extrabold flex items-center justify-center">{numeroDe(r)}</span>
              <span className="flex-1 min-w-0 text-ink truncate">{nombre(r.relacionado_id)}</span>
              <button type="button" onClick={() => quitar(r)} className="text-sm font-bold text-terracota px-2 min-h-[36px]">
                Quitar
              </button>
            </li>
          ))}
          {sinPunto.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-control bg-white/[0.03] px-2.5 py-2">
              <span className="w-6 text-center" aria-hidden="true">
                ✨
              </span>
              <span className="flex-1 min-w-0 text-ink truncate">
                {nombre(r.relacionado_id)} <span className="text-xs text-ink-muted">· para combinar</span>
              </span>
              <button type="button" onClick={() => quitar(r)} className="text-sm font-bold text-terracota px-2 min-h-[36px]">
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setPendiente({ sinPunto: true })} className="btn-admin-ghost self-start">
        ✨ Sugerir un mueble para combinar (sin punto)
      </button>

      {pendiente && <ElegirMueble productos={productos} onElegir={agregar} onCerrar={() => setPendiente(null)} />}
    </section>
  );
}
