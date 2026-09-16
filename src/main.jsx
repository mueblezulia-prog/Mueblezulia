import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Cuando se publica una nueva versión del sitio (nuevo deploy en Railway),
// los nombres de los archivos JS cambian. Si alguien deja la pestaña
// abierta desde antes del deploy y luego usa algo que carga un módulo
// "bajo demanda" (como el conversor de fotos HEIC de iPhone), el
// navegador intenta buscar el archivo viejo, que ya no existe, y
// aparece "Failed to fetch dynamically imported module". En vez de
// dejar esa pantalla rota, recargamos la página automáticamente para
// traer la versión nueva — la persona simplemente vuelve a intentar
// la acción y ya funciona.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
