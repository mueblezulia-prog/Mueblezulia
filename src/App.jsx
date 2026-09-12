import { Routes, Route, Link } from "react-router-dom";
import Catalogo from "./pages/Catalogo";
import ProductoDetalle from "./pages/ProductoDetalle";
import ProductForm from "./admin/ProductForm";

export default function App() {
  return (
    <div className="min-h-screen bg-carbon">
      <header className="flex items-center justify-between px-4 py-3 border-b border-carbon-border">
        <Link to="/" className="text-lg font-extrabold text-ink">Mueble Zulia</Link>
        <Link
          to="/admin/productos/nuevo"
          className="min-h-tap flex items-center px-4 rounded-control border border-carbon-border text-ink-muted text-sm font-semibold"
        >
          Panel Admin
        </Link>
      </header>

      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
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
