// File: frontend/src/services/realtime/socket.js
// Description: Cliente compartido de Socket.io para todo el frontend de ProCivil Manager (PCM).
//              Crea una única conexión al servidor de sockets usando la URL definida
//              en VITE_SOCKET_URL (archivo .env) o, en su defecto, "http://localhost:5000"
//              para entorno de desarrollo local. Envía el token JWT en el handshake
//              para que el backend pueda autenticar la conexión del usuario.

// =========================
// Importaciones principales
// =========================

// Importa la función `io` desde la librería oficial de cliente de Socket.io.
import { io } from 'socket.io-client'; // Permite crear el cliente de Socket.io en el navegador.

// =====================================
// URL base del servidor de Socket.io
// =====================================

// Constante que define la URL base del servidor de Socket.io.
const URL_SERVIDOR_SOCKET =
  // Primero intenta leer la URL desde la variable de entorno de Vite.
  import.meta.env.VITE_SOCKET_URL ||
  // Si no está definida, usa la URL por defecto del backend en local.
  'http://localhost:5000'; // URL a la que se conectará el cliente de Socket.io (backend PCM).

// =====================================
// Función auxiliar para obtener el token
// =====================================

/**
 * Obtiene el token JWT almacenado en localStorage.
 * @returns {string|null} Devuelve el token si existe o null si no se puede leer.
 */
const obtenerToken = () => {
  // Protegemos el acceso a localStorage con try/catch por si no existe (por ejemplo SSR o entornos restringidos).
  try {
    // Devuelve el valor asociado a la clave "token" en localStorage.
    return localStorage.getItem('token');
  } catch (error) {
    // Si algo falla (por ejemplo, no existe `localStorage`), devolvemos null para evitar romper la app.
    return null;
  }
};

// =====================================
// Instancia única de Socket.io (cliente)
// =====================================

// Creamos la instancia del cliente de Socket.io, pero sin conectarla de inmediato.
const clienteSocket = io(URL_SERVIDOR_SOCKET, {
  transports: ['websocket', 'polling'], // Intenta primero "websocket" y usa "polling" como respaldo.
  autoConnect: false,                   // No se conecta automáticamente al crear la instancia.
  reconnection: true,                   // Habilita intentos de reconexión automática.
  reconnectionAttempts: Infinity,       // Permite intentos de reconexión ilimitados.
  reconnectionDelay: 2000,              // Tiempo base entre intentos de reconexión (en milisegundos).
});

// ======================================================
// Función para inicializar la conexión del socket con JWT
// ======================================================

/**
 * Inicializa o reintenta la conexión del socket usando el token JWT
 * almacenado en localStorage. Si no hay token, no se establece la conexión.
 * Es recomendable llamarla:
 *   - Después de un inicio de sesión exitoso.
 *   - Después de renovar el token.
 *   - Al cargar el panel, si ya hay sesión activa en localStorage.
 */
export const inicializarConexionSocket = () => {
  // Obtiene el token de autenticación actual desde localStorage.
  const token = obtenerToken();

  // Si no hay token, no intentamos conectar el socket.
  if (!token) {
    // Mostramos un mensaje de advertencia en la consola para depuración.
    console.warn('[PCM] Socket.io: no hay token, no se conecta aún.');

    // Si por alguna razón la conexión está activa, la cerramos
    // para evitar conexiones anónimas al servidor de sockets.
    if (clienteSocket.connected) {
      clienteSocket.disconnect(); // Fuerza la desconexión del socket activo.
    }

    // Terminamos la función sin intentar conectar.
    return;
  }

  // Si hay token, lo añadimos en el handshake de autenticación.
  // En el backend se podrá leer como `socket.handshake.auth.token`.
  clienteSocket.auth = {
    token, // Asignamos el token JWT actual al objeto `auth` del cliente.
  };

  // Solo intentamos conectar si todavía no está conectado.
  if (!clienteSocket.connected) {
    clienteSocket.connect(); // Inicia la conexión al servidor de Socket.io.
  }
};

// =======================================
// Logs básicos de conexión (para depurar)
// =======================================

// Escucha el evento "connect" que se dispara cuando la conexión se establece correctamente.
clienteSocket.on('connect', () => {
  // Imprime en consola un mensaje indicando que el socket está conectado
  // y muestra el ID asignado por el servidor (si está disponible).
  console.log(
    `[PCM] Socket.io conectado. ID: ${clienteSocket.id || 'sin-id'}`
  );
});

// Escucha el evento "disconnect" que se dispara cuando la conexión se cierra.
clienteSocket.on('disconnect', (motivo) => {
  // Imprime en consola una advertencia con el motivo de la desconexión.
  console.warn(`[PCM] Socket.io desconectado. Motivo: ${motivo}`);
});

// Escucha el evento "connect_error" que se dispara cuando ocurre un error al conectar.
clienteSocket.on('connect_error', (error) => {
  // Imprime en consola un mensaje de error con el detalle del problema.
  console.error('[PCM] Error de conexión Socket.io:', error);
});

// =======================================
// Inicialización automática al importar
// =======================================

// Cuando se importa este archivo (por ejemplo, al entrar al panel principal),
// intentamos establecer la conexión usando el token actual, si existe.
// Es importante que la aplicación vuelva a llamar a `inicializarConexionSocket()`
// cuando el usuario inicie sesión, cierre sesión o renueve su token.
inicializarConexionSocket(); // Llama una vez a la función de inicialización cuando se carga el módulo.

// =========================
// Exportación por defecto
// =========================

// Exporta la instancia compartida del cliente de Socket.io para que
// cualquier parte del frontend pueda suscribirse a eventos o emitirlos.
export default clienteSocket;
