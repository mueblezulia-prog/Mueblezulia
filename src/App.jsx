import { Routes, Route, Link } from "react-router-dom";
import NavBar from "./components/NavBar";
import Catalogo from "./pages/Catalogo";
import ProductoDetalle from "./pages/ProductoDetalle";
import Fabricacion from "./pages/Fabricacion";
import MetodosPago from "./pages/MetodosPago";
import Ubicacion from "./pages/Ubicacion";
import ProductForm from "./admin/ProductForm";

export default function App() {
  return (
    <div className="min-h-screen bg-carbon">
      <NavBar />

      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/producto/:id" element={<ProductoDetalle />} />
        <Route path="/fabricacion" element={<Fabricacion />} />
        <Route path="/metodos-pago" element={<MetodosPago />} />
        <Route path="/ubicacion" element={<Ubicacion />} />
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
