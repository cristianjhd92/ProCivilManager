// File: FrontEnd/src/socket.js                                                 // Ruta del archivo en el front
// Descripción: Inicializa cliente de Socket.io. Funciona con o sin proxy       // Propósito: manejar conexión WS en dev y prod
// - Si VITE_API_URL está definido → conecta directo al backend                  // Modo directo (Opción A CORS habilitado)
// - Si NO está definido → conecta al mismo origen (Vite) con proxy WS           // Modo proxy (Opción B con /socket.io en vite.config)

import { io } from "socket.io-client";                                          // Importa cliente de Socket.io

const API_URL = import.meta.env.VITE_API_URL || "";                             // Lee VITE_API_URL (si no existe, usa cadena vacía)

// Si API_URL es cadena vacía, io("") → mismo origen (http://localhost:3000)     // Explicación del comportamiento por defecto
// y gracias al proxy de Vite para "/socket.io" el WS termina en el backend.     // Proxy WS configurado en vite.config.js

export const socket = io(API_URL, {                                             // Inicializa la conexión del cliente
  path: "/socket.io",                                                           // Ruta por defecto de Socket.io (consistente con el proxy)
  transports: ["websocket"],                                                    // Fuerza WebSocket (recomendado en dev)
  withCredentials: true,                                                        // Permite credenciales si el backend las requiere
});                                                                              // Exporta la instancia de socket para consumo en la app

// Ejemplo de uso:                                                               // Pequeño ejemplo de suscripción
// socket.on('connect', () => { console.log('WS conectado:', socket.id); });     // Log de conexión
// socket.on('mensaje', (data) => { console.log('Mensaje:', data); });           // Handler de evento 'mensaje'
