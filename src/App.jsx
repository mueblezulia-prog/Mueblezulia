import { Routes, Route, Link, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Catalogo from "./pages/Catalogo";
import ProductoDetalle from "./pages/ProductoDetalle";
import Fabricacion from "./pages/Fabricacion";
import Contacto from "./pages/Contacto";
import ProductForm from "./admin/ProductForm";

export default function App() {
  return (
    <div className="min-h-screen bg-carbon">
      <NavBar />

      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
        <Route path="/fabricacion" element={<Fabricacion />} />
        <Route path="/contacto" element={<Contacto />} />
        {/* Rutas viejas: redirigen a /contacto para no romper enlaces guardados */}
        <Route path="/ubicacion" element={<Navigate to="/contacto" replace />} />
        <Route path="/metodos-pago" element={<Navigate to="/contacto" replace />} />
        <Route path="/admin/productos/nuevo" element={<ProductForm />} />
        <Route path="/admin/productos/:id/editar" element={<EditarProducto />} />
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </div>
  );
}

function EditarProducto() {
  // Fase 1: placeholder de ruta — cargar el producto por id y pasarlo
  // como `productoExistente` a ProductForm queda listo para conectar
  // en cuanto el panel admin tenga listado + autenticación (ver README).
  return <ProductForm />;
}

function NoEncontrado() {
  return (
    <div className="p-8 text-center">
      <p className="text-xl text-ink-muted mb-4">Página no encontrada.</p>
      <Link to="/" className="text-gold font-bold">
        Volver al catálogo
      </Link>
    </div>
  );
}
