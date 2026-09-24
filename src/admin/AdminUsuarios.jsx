import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function fecha(valor) {
  if (!valor) return "Nunca";
  return new Date(valor).toLocaleString("es-VE", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Los mensajes de error de la base de datos llegan en español desde las
// funciones SQL; si no, se muestra uno genérico entendible.
function mensajeError(error) {
  const texto = error?.message ?? "";
  if (/function .* does not exist|Could not find the function/i.test(texto)) {
    return "Falta correr supabase/fase_1_18_usuarios_panel.sql en tu Supabase.";
  }
  return texto || "Algo salió mal. Intenta de nuevo.";
}

/**
 * Usuarios que pueden entrar al panel: crear nuevos, cambiarles la
 * contraseña o borrarlos. Usa las funciones de
 * supabase/fase_1_18_usuarios_panel.sql (no hace falta entrar a Supabase).
 */
export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [miId, setMiId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [creando, setCreando] = useState(false);

  const [cambiandoId, setCambiandoId] = useState(null);
  const [claveCambio, setClaveCambio] = useState("");

  async function cargar() {
    setCargando(true);
    setError(null);
    const [{ data, error: e }, { data: sesion }] = await Promise.all([
      supabase.rpc("admin_listar_usuarios"),
      supabase.auth.getUser(),
    ]);
    if (e) setError(mensajeError(e));
    else setUsuarios(data ?? []);
    setMiId(sesion?.user?.id ?? null);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function avisar(texto, tipo = "ok") {
    setAviso({ texto, tipo });
    setTimeout(() => setAviso((a) => (a?.texto === texto ? null : a)), 4000);
  }

  async function crear(e) {
    e.preventDefault();
    const usuario = nuevoUsuario.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
      avisar("El usuario debe tener al menos 3 letras o números, sin espacios (puede llevar punto o guion).", "error");
      return;
    }
    if (nuevaClave.length < 6) {
      avisar("La contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }
    setCreando(true);
    const { error: e2 } = await supabase.rpc("admin_crear_usuario", { p_usuario: usuario, p_clave: nuevaClave });
    setCreando(false);
    if (e2) {
      avisar(mensajeError(e2), "error");
      return;
    }
    avisar(`✓ Usuario "${usuario}" creado. Ya puede entrar al panel con esa contraseña.`);
    setNuevoUsuario("");
    setNuevaClave("");
    cargar();
  }

  async function guardarClave(u) {
    if (claveCambio.length < 6) {
      avisar("La contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }
    // La propia contraseña se cambia por el camino normal de Supabase; la
    // de otros usuarios, con la función del panel.
    const { error: e3 } =
      u.id === miId
        ? await supabase.auth.updateUser({ password: claveCambio })
        : await supabase.rpc("admin_cambiar_clave", { p_id: u.id, p_clave: claveCambio });
    if (e3) {
      avisar(mensajeError(e3), "error");
      return;
    }
    avisar(`✓ Contraseña de "${u.usuario}" cambiada.`);
    setCambiandoId(null);
    setClaveCambio("");
  }

  async function borrar(u) {
    if (!window.confirm(`¿Borrar el usuario "${u.usuario}"? Ya no podrá entrar al panel.`)) return;
    const { error: e4 } = await supabase.rpc("admin_borrar_usuario", { p_id: u.id });
    if (e4) {
      avisar(mensajeError(e4), "error");
      return;
    }
    avisar(`Usuario "${u.usuario}" borrado.`);
    setUsuarios((l) => l.filter((x) => x.id !== u.id));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">👤 Usuarios del panel</h1>
        <p className="text-base text-ink-muted mt-1">
          Personas que pueden entrar al panel de control. Cada una entra con su propio usuario y contraseña.
        </p>
      </div>

      {aviso && (
        <div
          role="status"
          className={[
            "rounded-control border px-4 py-3",
            aviso.tipo === "error" ? "border-terracota/50 bg-terracota/10" : "border-green-500/40 bg-green-500/10",
          ].join(" ")}
        >
          {aviso.texto}
        </div>
      )}

      <form onSubmit={crear} className="admin-card p-4 sm:p-5 flex flex-col gap-4">
        <p className="text-lg font-bold text-ink">Crear un usuario nuevo</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-base font-semibold text-ink">Usuario</span>
            <input
              type="text"
              value={nuevoUsuario}
              onChange={(e) => setNuevoUsuario(e.target.value.replace(/\s/g, ""))}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              placeholder="Ej: maria"
              className="campo-input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-base font-semibold text-ink">Contraseña</span>
            <div className="relative">
              <input
                type={verClave ? "text" : "password"}
                value={nuevaClave}
                onChange={(e) => setNuevaClave(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="campo-input pr-20"
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[40px] px-3 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                {verClave ? "Ocultar" : "Ver"}
              </button>
            </div>
          </label>
        </div>
        <button type="submit" disabled={creando} className="btn-admin-primary self-start">
          {creando ? "Creando…" : "+ Crear usuario"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <p className="text-lg font-bold text-ink">Usuarios actuales</p>
        {cargando && <div className="esqueleto h-20" />}
        {error && <p className="admin-card p-4 text-terracota">{error}</p>}
        {!cargando &&
          !error &&
          usuarios.map((u) => (
            <div key={u.id} className="admin-card p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-ink break-all">
                    {u.usuario}
                    {u.id === miId && <span className="ml-2 text-xs font-bold text-gold uppercase">(tú)</span>}
                  </p>
                  <p className="text-sm text-ink-muted">Último ingreso: {fecha(u.ultimo_ingreso)}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCambiandoId(cambiandoId === u.id ? null : u.id);
                      setClaveCambio("");
                    }}
                    className="min-h-[40px] px-3 rounded-control border-2 border-ink/60 text-ink text-sm font-bold hover:bg-ink hover:text-carbon transition"
                  >
                    🔑 Contraseña
                  </button>
                  {u.id !== miId && (
                    <button
                      type="button"
                      onClick={() => borrar(u)}
                      className="min-h-[40px] px-3 rounded-control border-2 border-terracota text-terracota text-sm font-bold hover:bg-terracota hover:text-ink transition"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>
              {cambiandoId === u.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    guardarClave(u);
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    autoFocus
                    type="text"
                    value={claveCambio}
                    onChange={(e) => setClaveCambio(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Nueva contraseña (mínimo 6)"
                    className="campo-input flex-1"
                  />
                  <button type="submit" className="btn-admin-primary">Guardar</button>
                </form>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
