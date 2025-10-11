// File: FrontEnd/src/api/http.js                                       // Ruta del archivo (actualizado)
// Descripción: Instancia de Axios con baseURL de Vite, envío de cookies // Propósito del módulo
// (withCredentials), inyección de Bearer access token y auto-refresh     // Funciones clave
// del access cuando el backend responde 401 usando la cookie HttpOnly.   // Flujo de sesión

import axios from 'axios';                                               // Cliente HTTP Axios
import {                                                                // Helpers de token
  getAccessToken,                                                        // Lee access token en memoria (o storages)
  setAccessToken,                                                        // Guarda access token (y persiste si corresponde)
  clearAccessToken                                                       // Limpia access token (logout local)
} from './tokenStore';                                                   // Almacén del token

// -----------------------------------------------------------------------------
// Configuración base de Axios                                                   // Base URL/timeout/cookies
// -----------------------------------------------------------------------------
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; // URL base (desde Vite .env o default local)

const http = axios.create({                                              // Crea la instancia dedicada de Axios
  baseURL: BASE_URL,                                                     // Prefijo común (ej: http://localhost:5000)
  withCredentials: true,                                                 // 🔐 Enviar/recibir cookies (refresh HttpOnly)
  timeout: 20000                                                         // Timeout de 20s (ajustable)
});                                                                       // Fin create

// -----------------------------------------------------------------------------
// Interceptor de REQUEST: agrega Authorization si hay access token              // Evita enviarlo a rutas de auth
// -----------------------------------------------------------------------------
http.interceptors.request.use(                                           // Registra interceptor de requests
  (config) => {                                                          // Callback para requests salientes
    const token = getAccessToken();                                      // Lee token actual
    const url = config.url || '';                                        // URL del request (parcial o completa)
    const isAuthCall =                                                   // Determina si es endpoint de auth
      url.includes('/auth/login')  ||                                    // /auth/login → NO mandar Authorization
      url.includes('/auth/logout') ||                                    // /auth/logout → NO mandar Authorization
      url.includes('/auth/refresh');                                     // /auth/refresh → NO mandar Authorization

    if (token && !isAuthCall) {                                          // Si tenemos token y no es ruta de auth
      config.headers = config.headers || {};                             // Asegura objeto headers
      config.headers.Authorization = `Bearer ${token}`;                  // Inyecta Authorization: Bearer <token>
    }
    return config;                                                       // Continúa el flujo normal
  },
  (error) => Promise.reject(error)                                       // Si algo falla en la preparación, rechaza
);                                                                       // Fin interceptor de request

// -----------------------------------------------------------------------------
// Anti "tormenta" de refresh: cola de reintentos durante la renovación          // Sincroniza varios 401 simultáneos
// -----------------------------------------------------------------------------
let isRefreshing = false;                                                // Flag: indica si hay un refresh corriendo
let refreshSubscribers = [];                                             // Cola: callbacks que esperan el nuevo token

const subscribeTokenRefresh = (cb) => {                                  // Registra un callback en la cola
  refreshSubscribers.push(cb);                                           // Encola callback
};                                                                        // Fin subscribeTokenRefresh

const onRefreshed = (newToken) => {                                      // Notifica a toda la cola con el token nuevo
  refreshSubscribers.forEach((cb) => cb(newToken));                      // Ejecuta callbacks (puede ser null si falló)
  refreshSubscribers = [];                                               // Limpia la cola
};                                                                        // Fin onRefreshed

// -----------------------------------------------------------------------------
// Interceptor de RESPONSE: si 401 no-auth → intenta /auth/refresh una vez       // Reintenta el request original
// -----------------------------------------------------------------------------
http.interceptors.response.use(                                          // Registra interceptor de respuestas
  (response) => response,                                                // Respuestas OK pasan sin cambios
  async (error) => {                                                     // Manejo centralizado de errores
    const { config, response } = error || {};                            // Extrae config original y respuesta
    const status = response?.status;                                     // Código de estado HTTP
    const originalRequest = config;                                      // Alias del request que falló

    // Condiciones para NO refrescar: sin response (error red), no 401, o rutas de auth
    const isAuthRoute =                                                  
      originalRequest?.url?.includes('/auth/login')  ||                 // /auth/login
      originalRequest?.url?.includes('/auth/refresh') ||                // /auth/refresh
      originalRequest?.url?.includes('/auth/logout');                   // /auth/logout

    if (!response || status !== 401 || isAuthRoute) {                    // Si no es candidato a refresh
      return Promise.reject(error);                                      // Propaga el error tal cual
    }

    // Evitar bucle de reintentos infinitos (una sola vez)
    if (originalRequest._retry) {                                        // Si ya se reintentó antes
      clearAccessToken();                                                // Limpia access local
      return Promise.reject(error);                                      // Aborta
    }
    originalRequest._retry = true;                                       // Marca el request como reintentado

    // Si YA hay un refresh en curso, nos suscribimos a su resultado
    if (isRefreshing) {                                                  // Otro refresh está ejecutándose
      return new Promise((resolve, reject) => {                          // Devolvemos una promesa en espera
        subscribeTokenRefresh((newToken) => {                            // Nos suscribimos a la cola
          if (!newToken) {                                               // Si el refresh global falló
            return reject(error);                                        // Rechazamos propagando el error original
          }
          originalRequest.headers = originalRequest.headers || {};       // Asegura headers
          originalRequest.headers.Authorization = `Bearer ${newToken}`;  // Inserta el nuevo Bearer
          resolve(http(originalRequest));                                // Reintenta el request original
        });
      });
    }

    // Caso principal: iniciar el refresh ahora
    isRefreshing = true;                                                 // Activamos flag de refresh
    try {                                                                // Bloque principal
      // Hacemos refresh con axios “crudo” (no la instancia http) para aislar interceptores
      const refreshResp = await axios.post(                              // Llamada al backend
        `${BASE_URL}/api/auth/refresh`,                                  // Endpoint de refresh absoluto
        null,                                                            // Body vacío
        { withCredentials: true }                                        // Importante: enviar cookies HttpOnly
      );

      const newAccess = refreshResp?.data?.access_token;                 // Extrae el nuevo access token
      if (!newAccess) {                                                  // Si backend no devolvió token
        throw new Error('Refresh sin access_token');                     // Lanzamos error semántico
      }

      setAccessToken(newAccess);                                         // Guardamos el token (preserva modo previo)
      onRefreshed(newAccess);                                            // Despertamos a la cola con el token nuevo

      originalRequest.headers = originalRequest.headers || {};           // Asegura headers del request original
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;     // Inyecta nuevo Authorization
      return http(originalRequest);                                      // Reintenta y retorna su promesa

    } catch (refreshErr) {                                               // Si el refresh falla (401/403/5xx)
      onRefreshed(null);                                                 // Despierta cola informando fallo
      clearAccessToken();                                                // Limpia access local (sesión inválida)
      // (Opcional) aquí puedes redirigir a /login usando tu router.     // Ej: navigate('/login')
      return Promise.reject(refreshErr);                                 // Propaga el error de refresh
    } finally {
      isRefreshing = false;                                              // Libera el flag de refresh
    }
  }
);                                                                       // Fin interceptor de response

// -----------------------------------------------------------------------------
// Export: instancia HTTP preconfigurada
// -----------------------------------------------------------------------------
export default http;                                                     // Exporta instancia lista para usar en apis
