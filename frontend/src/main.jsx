// File: frontend/src/main.jsx
// Description: Punto de entrada principal del frontend de ProCivil Manager.
//              Monta la aplicación React sobre el elemento #root de index.html,
//              envolviendo el componente App con React.StrictMode y BrowserRouter
//              para habilitar el enrutamiento general (sitio público + workspace).

// =========================
// Importaciones principales
// =========================
import React from 'react';                     // Importa React para poder usar JSX.
import ReactDOM from 'react-dom/client';       // Importa createRoot para montar la app.
import { BrowserRouter } from 'react-router-dom'; // Importa el router basado en historial HTML5.

// Importa los estilos globales de PCM (Tailwind v4 + helpers personalizados).
import './index.css';                          // Hoja de estilos principal del frontend.

// Importa el componente raíz de la aplicación (definido en src/App.jsx).
import App from './App.jsx';                   // Componente que contiene todas las rutas y layouts.

// =========================
// Montaje de la aplicación
// =========================

// Busca en el DOM el contenedor donde se montará React (definido en index.html).
const rootElement = document.getElementById('root'); // Debe existir un <div id="root"></div> en index.html.

// Si por alguna razón no existe el contenedor, lanza un error explícito.
if (!rootElement) {                             // Valida que el elemento realmente exista.
  throw new Error('No se encontró el elemento raíz con id "root" en el DOM.'); // Ayuda a depurar problemas de montaje.
}

// Crea la raíz de React 18/19 a partir del elemento DOM.
const root = ReactDOM.createRoot(rootElement);  // Inicializa el root concurrente de React.

// Renderiza la aplicación React dentro del contenedor raíz.
root.render(
  <React.StrictMode>                            {/* Activa comprobaciones adicionales en desarrollo. */}
    {/* BrowserRouter provee el contexto de enrutamiento para todas las rutas
        del sitio público y del workspace interno de ProCivil Manager. */}
    <BrowserRouter>
      {/* Componente raíz que define layouts, rutas y providers globales. */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
