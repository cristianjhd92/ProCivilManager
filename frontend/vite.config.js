// File: frontend/vite.config.js
// Description: Configuración de Vite para el frontend de ProCivil Manager,
//              utilizando React y Tailwind CSS v4 con el plugin oficial
//              @tailwindcss/vite, definiendo el puerto 3000 y abriendo el
//              navegador automáticamente cuando se levanta el servidor de desarrollo.

import { defineConfig } from 'vite';          // Importa la función `defineConfig` para declarar la configuración de Vite con tipado.
import react from '@vitejs/plugin-react';     // Importa el plugin oficial de React para Vite (soporte JSX, Fast Refresh, etc.).
import tailwindcss from '@tailwindcss/vite';  // Importa el plugin oficial de Tailwind CSS v4 para integrarlo con Vite.

// Exporta la configuración principal de Vite utilizando `defineConfig` para mejor DX.
export default defineConfig({
  // Arreglo de plugins que se aplican tanto en desarrollo como en el build de producción.
  plugins: [
    react(),        // Activa el soporte para React (transformación de JSX, HMR, etc.).
    tailwindcss(),  // Habilita Tailwind CSS v4 leyendo `@import "tailwindcss"` y `@config` en tu CSS.
  ],

  // Configuración específica del servidor de desarrollo (`npm run dev`).
  server: {
    port: 3000,  // Define el puerto en el que se levantará el frontend (por defecto era 5173, ahora será 3000).
    open: true,  // Indica a Vite que abra automáticamente el navegador cuando el servidor esté listo.

    // `proxy` permite redirigir ciertas rutas a otro servidor (en este caso, tu backend en Node/Express).
    proxy: {
      // Todas las peticiones que comiencen con `/api` se redirigen al backend.
      '/api': {
        target: 'http://localhost:5000', // URL base del backend (Express escuchando en el puerto 5000).
        changeOrigin: true,              // Ajusta el encabezado `Host` para que coincida con el del backend.
        secure: false,                   // Permite certificados no válidos en HTTPS (no aplica aquí, pero no afecta).
      },
    },
  },
});                                         // Cierra el objeto de configuración y la exportación por defecto.
