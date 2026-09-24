import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * Puerta del panel: si no has iniciado sesión, muestra la pantalla de
 * acceso; si ya iniciaste, muestra el panel normal. La sesión queda
 * guardada en ese navegador (no hay que entrar cada vez).
 *
 * El usuario se crea UNA vez en Supabase → Authentication → Users.
 */
export default function AdminAcceso({ children }) {
  const [sesion, setSesion] = useState(undefined); // undefined = revisando

  useEffect(() => {
    let activo = true;
    supabase.auth.getSession().then(({ data }) => activo && setSesion(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion ?? null);
    });
    return () => {
      activo = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  // Este navegador es del admin: sus visitas al sitio no se cuentan en
  // las estadísticas (para no inflar los números con tus propias pruebas).
  useEffect(() => {
    if (sesion) {
      try {
        localStorage.setItem("mz_admin", "1");
      } catch {
        /* sin almacenamiento: no pasa nada */
      }
    }
  }, [sesion]);

  if (sesion === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-carbon-border border-t-gold animate-spin" aria-label="Cargando" />
      </div>
    );
  }

  if (!sesion) return <PantallaLogin />;

  return children;
}

function PantallaLogin() {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState(null);

  async function entrar(e) {
    e.preventDefault();
    if (!correo.trim() || !clave) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    setEntrando(true);
    setError(null);
    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
    setEntrando(false);
    if (errorLogin) {
      setError(
        /invalid/i.test(errorLogin.message)
          ? "Correo o contraseña incorrectos."
          : `No se pudo entrar: ${errorLogin.message}`
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center blur-md scale-110 opacity-40"
        style={{ backgroundImage: "url(/assets/interior-tienda.jpg)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-carbon/80" aria-hidden="true" />

      <form onSubmit={entrar} className="w-full max-w-sm glass rounded-card p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex flex-col items-center text-center gap-2 mb-2">
          <img src="/assets/logo.png" alt="" className="w-14 h-14 object-contain" />
          <h1 className="text-2xl font-extrabold text-ink">Panel de Mueble Zulia</h1>
          <p className="text-sm text-ink-muted">Inicia sesión para administrar el sitio.</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-base font-semibold text-ink">Correo</span>
          <input
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="campo-input"
            placeholder="tucorreo@gmail.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-base font-semibold text-ink">Contraseña</span>
          <div className="relative">
            <input
              type={verClave ? "text" : "password"}
              autoComplete="current-password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
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

        {error && (
          <p role="alert" className="text-sm text-ink bg-terracota/15 border border-terracota/40 rounded-control px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={entrando} className="btn-admin-primary w-full mt-1">
          {entrando ? "Entrando…" : "Entrar"}
        </button>

        <Link to="/" className="text-center text-sm text-ink-muted hover:text-ink font-semibold min-h-tap flex items-center justify-center">
          ← Volver al sitio
        </Link>
      </form>
    </div>
  );
}
