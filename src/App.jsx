import { Routes, Route, Link } from "react-router-dom";
import Catalogo from "./pages/Catalogo";
import ProductoDetalle from "./pages/ProductoDetalle";
import ProductForm from "./admin/ProductForm";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Catalogo />} />
      <Route path="/producto/:id" element={<ProductoDetalle />} />
      <Route path="/admin/productos/nuevo" element={<ProductForm />} />
      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  );
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
