// File: FrontEnd/vite.config.js                                                // Ruta del archivo en el frontend
// Descripción: Config de Vite con React y PROXY a la API del backend,          // Propósito del archivo
// incluyendo proxy para WebSocket de Socket.io en desarrollo.                  // Nota: evita errores CORS en dev

import { defineConfig } from "vite";                                            // Importa defineConfig desde Vite
import react from "@vitejs/plugin-react";                                       // Plugin oficial de React para Vite

export default defineConfig({                                                   // Exporta la configuración principal de Vite
  plugins: [                                                                    // Arreglo de plugins que usará Vite
    react({                                                                     // Plugin de React
      include: [/\.[jt]sx?$/],                                                  // Procesa JS/TS con o sin JSX
      jsxRuntime: "automatic",                                                  // Runtime automático de JSX (no requiere import React)
    }),                                                                         // Fin configuración plugin react
  ],                                                                            // Cierra arreglo de plugins

  server: {                                                                     // Sección de servidor de desarrollo
    port: 3000,                                                                 // Puerto donde corre el front (coincide con CORS_ORIGIN)
    proxy: {                                                                    // Proxy para evitar CORS en dev (opción B)
      "/api": {                                                                 // Prefijo HTTP para rutas REST del backend
        target: "http://localhost:5000",                                        // URL del backend (PORT=5000)
        changeOrigin: true,                                                     // Ajusta el header Origin para el backend
        secure: false,                                                          // Permite HTTP no TLS en desarrollo
      },                                                                        // Cierra la entrada de proxy /api

      "/socket.io": {                                                           // Prefijo WS que usa Socket.io por defecto
        target: "http://localhost:5000",                                        // URL del backend (donde vive Socket.io servidor)
        ws: true,                                                               // Habilita proxy de WebSockets (indispensable)
        changeOrigin: true,                                                     // Ajusta Origin también para WS
        secure: false,                                                          // Permite WS no TLS en desarrollo
      },                                                                        // Cierra la entrada de proxy /socket.io
    },                                                                          // Cierra objeto proxy
  },                                                                            // Cierra server

  esbuild: {                                                                    // Configuración de esbuild
    loader: "jsx",                                                              // Trata archivos .js como JSX cuando aplique
    include: /src\/.*\.[jt]sx?$/,                                               // Aplica a todo JS/TS dentro de src
    jsx: "automatic",                                                           // Runtime automático de JSX
  },                                                                            // Cierra esbuild

  optimizeDeps: {                                                               // Pre-empaquetado de dependencias
    esbuildOptions: { loader: { ".js": "jsx" } },                               // Trata dependencias .js como JSX
  },                                                                            // Cierra optimizeDeps
});                                                                              // Cierra export default
