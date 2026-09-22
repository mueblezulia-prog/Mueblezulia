import { Routes, Route, Link, Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import NavBar from "./components/NavBar";
import BottomNav from "./components/BottomNav";
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

export default function App() {
  const { pathname } = useLocation();
  const esAdmin = pathname.startsWith("/admin");
  const esDetalleProducto = pathname.startsWith("/producto/");
  // En el detalle de producto no se muestra la barra inferior: esa página
  // ya tiene su propio botón fijo de WhatsApp abajo, y dos barras fijas
  // superpuestas se verían mal en móvil.
  const ocultarBottomNav = esAdmin || esDetalleProducto;

  usarFaviconSegunRuta(esAdmin);

  return (
    <div className="min-h-screen bg-carbon">
      {esAdmin ? <AdminHeader /> : <NavBar />}

      {/* pb-16 deja espacio para que la barra inferior móvil no tape el
          contenido; en desktop no aplica porque BottomNav está oculto. */}
      <div className={ocultarBottomNav ? "" : "pb-16 sm:pb-0"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<CatalogoProductos />} />
          <Route path="/categoria/:slug" element={<CategoriaPagina />} />
          <Route path="/producto/:id" element={<ProductoDetalle />} />
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
          <Route path="/admin" element={<Navigate to="/admin/productos" replace />} />
          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </div>

      {!ocultarBottomNav && <BottomNav />}
    </div>
  );
}

function NuevoProducto() {
  const navigate = useNavigate();
  return <ProductForm onGuardado={() => navigate("/admin/productos")} />;
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
      onGuardado={() => navigate("/admin/productos")}
    />
  );
}

function NoEncontrado() {
  return (
    <div className="p-8 text-center">
      <p className="text-xl text-ink-muted mb-4">Página no encontrada.</p>
      <Link to="/" className="text-gold font-bold">
        Volver al inicio
      </Link>
    </div>
  );
}
