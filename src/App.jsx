import { Routes, Route, Link, Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import NavBar from "./components/NavBar";
import BottomNav from "./components/BottomNav";
import BotonWhatsAppFlotante from "./components/BotonWhatsAppFlotante";
import AdminHeader from "./admin/AdminHeader";
import Home from "./pages/Home";
import CatalogoProductos from "./pages/CatalogoProductos";
import CategoriaPagina from "./pages/CategoriaPagina";
import ProductoDetalle from "./pages/ProductoDetalle";
import Fabricacion from "./pages/Fabricacion";
import Telas from "./pages/Telas";
import Contacto from "./pages/Contacto";
import ProductForm from "./admin/ProductForm";
import AdminProductosLista from "./admin/AdminProductosLista";
import AdminCategorias from "./admin/AdminCategorias";
import AdminTelas from "./admin/AdminTelas";
import AdminEtiquetas from "./admin/AdminEtiquetas";
import AdminContenido from "./admin/AdminContenido";
import AdminAcceso from "./admin/AdminAcceso";
import AdminOpiniones from "./admin/AdminOpiniones";
import AdminEstadisticas from "./admin/AdminEstadisticas";
import { registrarVisita } from "./lib/estadisticas";

// Íconos de pestaña (favicon): el logo de la mueblería en el sitio público,
// y un engranaje dorado en el panel de administración — así, con varias
// pestañas abiertas, se distingue de un vistazo cuál es el panel interno y
// cuál es la página que ven los clientes.
const FAVICON_SITIO = {
  icon: "/favicon.ico",
  "16": "/favicon-16x16.png",
  "32": "/favicon-32x32.png",
  "48": "/favicon-48x48.png",
  apple: "/apple-touch-icon.png",
};
const FAVICON_ADMIN = {
  icon: "/favicon-admin.ico",
  "16": "/favicon-admin-16x16.png",
  "32": "/favicon-admin-32x32.png",
  "48": "/favicon-admin-48x48.png",
  apple: "/apple-touch-icon-admin.png",
};

function usarFaviconSegunRuta(esAdmin) {
  useEffect(() => {
    const set = esAdmin ? FAVICON_ADMIN : FAVICON_SITIO;
    const enlaces = [
      { selector: 'link[rel="icon"][sizes="16x16"]', href: set["16"] },
      { selector: 'link[rel="icon"][sizes="32x32"]', href: set["32"] },
      { selector: 'link[rel="icon"][sizes="48x48"]', href: set["48"] },
      { selector: 'link[rel="icon"][type="image/x-icon"]', href: set.icon },
      { selector: 'link[rel="apple-touch-icon"]', href: set.apple },
    ];
    for (const { selector, href } of enlaces) {
      const el = document.querySelector(selector);
      if (el) el.href = href;
    }
  }, [esAdmin]);
}

// Al navegar a otra página, arrancar siempre desde arriba (antes, si
// tocabas un mueble a mitad del catálogo, el detalle se abría a mitad
// de página). Si solo cambia el "#ancla", no se toca el scroll.
function ScrollArriba() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

// `key={id}` hace que al pasar de un mueble a otro (por ejemplo desde
// "Muebles con esta tela") la página se reinicie por completo — antes
// se quedaban la foto, el contador y el color del mueble anterior.
function ProductoRuta() {
  const { id } = useParams();
  return <ProductoDetalle key={id} />;
}

export default function App() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/admin");
  const esDetalleProducto = pathname.startsWith("/producto/");
  // En el detalle de producto no se muestra la barra inferior: esa página
  // ya tiene su propio botón fijo de WhatsApp abajo, y dos barras fijas
  // superpuestas se verían mal en móvil.
  const ocultarBottomNav = esAdmin || esDetalleProducto;

  usarFaviconSegunRuta(esAdmin);

  // Estadísticas: cada página del sitio público que se abre cuenta como
  // una visita (el panel admin nunca se cuenta).
  useEffect(() => {
    if (!esAdmin) registrarVisita(pathname);
  }, [pathname, esAdmin]);

  const contenido = (
    <>
      {esAdmin ? <AdminHeader /> : <NavBar />}

      {/* pb-16 deja espacio para que la barra inferior móvil no tape el
          contenido; en desktop no aplica porque BottomNav está oculto. */}
      <div className={ocultarBottomNav ? "" : "pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:pb-0"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<CatalogoProductos />} />
          <Route path="/categoria/:slug" element={<CategoriaPagina />} />
          <Route path="/producto/:id" element={<ProductoRuta />} />
          <Route path="/fabricacion" element={<Fabricacion />} />
          <Route path="/telas" element={<Telas />} />
          <Route path="/contacto" element={<Contacto />} />
          {/* Rutas viejas: redirigen para no romper enlaces guardados */}
          <Route path="/ubicacion" element={<Navigate to="/contacto" replace />} />
          <Route path="/metodos-pago" element={<Navigate to="/contacto" replace />} />
          <Route path="/admin/productos" element={<AdminProductosLista />} />
          <Route path="/admin/productos/nuevo" element={<NuevoProducto />} />
          <Route path="/admin/productos/:id/editar" element={<EditarProducto />} />
          <Route path="/admin/categorias" element={<AdminCategorias />} />
          <Route path="/admin/telas" element={<AdminTelas />} />
          <Route path="/admin/etiquetas" element={<AdminEtiquetas />} />
          <Route path="/admin/contenido" element={<AdminContenido />} />
          <Route path="/admin/opiniones" element={<AdminOpiniones />} />
          <Route path="/admin/estadisticas" element={<AdminEstadisticas />} />
          <Route path="/admin" element={<Navigate to="/admin/productos" replace />} />
          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </div>

      {!ocultarBottomNav && <BottomNav />}
      {!esAdmin && !esDetalleProducto && pathname !== "/contacto" && <BotonWhatsAppFlotante />}
    </>
  );

  return (
    <div className="min-h-screen bg-carbon">
      <ScrollArriba />
      {/* El panel solo se ve después de iniciar sesión. */}
      {esAdmin ? <AdminAcceso>{contenido}</AdminAcceso> : contenido}
    </div>
  );
}

function NuevoProducto() {
  const navigate = useNavigate();
  return <ProductForm onGuardado={(_id, aviso) => navigate("/admin/productos", { state: { aviso } })} />;
}

function EditarProducto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true);
      const { data: productoData, error: errorProducto } = await supabase
        .from("productos")
        .select("*")
        .eq("id", id)
        .single();
      if (!activo) return;
      if (errorProducto) {
        setError(errorProducto.message);
      } else {
        setProducto(productoData);
      }
      setCargando(false);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [id]);

  if (cargando) return <p className="text-center text-ink-muted text-lg py-16">Cargando…</p>;
  if (error || !producto) {
    return (
      <p className="text-center text-terracota text-lg py-16">
        No se pudo cargar el producto{error ? `: ${error}` : ""}.
      </p>
    );
  }

  // `key` fuerza a que el formulario se vuelva a montar si se navega
  // directamente de "editar producto A" a "editar producto B".
  return (
    <ProductForm
      key={producto.id}
      productoExistente={producto}
      onGuardado={(_id, aviso) => navigate("/admin/productos", { state: { aviso } })}
    />
  );
}

function NoEncontrado() {
  return (
    <div className="contenedor py-20 flex flex-col items-center text-center gap-4">
      <img src="/assets/logo.png" alt="" className="w-16 h-16 object-contain opacity-80" />
      <h1 className="text-2xl font-extrabold text-ink">Página no encontrada</h1>
      <p className="text-ink-muted max-w-md">
        La dirección que abriste no existe o fue movida. Puedes volver al inicio o ver todos nuestros muebles.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <Link to="/" className="btn-outline">Volver al inicio</Link>
        <Link to="/catalogo" className="btn-gold-glass">Ver catálogo</Link>
      </div>
    </div>
  );
}
