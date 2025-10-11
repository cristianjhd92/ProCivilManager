// File: FrontEnd/src/api/authApi.js                                   // Ruta del archivo (actualizado)
// Descripción: Funciones de autenticación contra el backend.           // Propósito
// - bootstrapSession → rehidrata sesión desde cookie HttpOnly          // Auto-login en F5/pestaña nueva
// - login            → emite access + setea cookie refresh             // Login normal
// - me               → obtiene el perfil autenticado                    // Perfil
// - logout           → revoca refresh actual y limpia cookie            // Cierre sesión actual
// - logoutAll        → revoca TODOS los refresh                         // Cierre global
// - register         → crea usuario nuevo                               // Registro

import http from './http';                                             // Instancia Axios (baseURL, cookies, auto-refresh)
import {
  getAccessToken,                                                      // Lee access token actual (memoria/storage)
  setAccessToken,                                                      // Guarda access token (memoria / session / local)
  clearAccessToken                                                     // Limpia access token en todos los niveles
} from './tokenStore';                                                 // Almacén de token con 3 niveles

// ---------------------------------------------------------------------
// normalizeHttpError(err): resume errores HTTP a { status, message }    // DX: mensajes consistentes en UI
// ---------------------------------------------------------------------
function normalizeHttpError(err) {                                      // Declara helper de normalización
  const status = err?.response?.status || 0;                            // 0 si no hubo response (red/timeout)
  const message =
    err?.response?.data?.message ||                                     // Mensaje del backend (si existe)
    err?.message ||                                                     // Mensaje genérico de Axios/JS
    'Error de red';                                                     // Fallback genérico
  return { status, message };                                           // Devuelve objeto simple para la UI
}                                                                       // Fin normalizeHttpError

// ---------------------------------------------------------------------
// bootstrapSession({ tryRefresh = true }): intenta rehidratar sesión
// Uso típico: llamarlo al montar la app (F5 / pestaña nueva).
// - Si ya hay access en memoria/storage → no hace nada y retorna ok.
// - Si NO hay access y hay cookie HttpOnly válida → /auth/refresh y setea access.
// - No lanza excepciones: retorna { ok, refreshed, accessToken, user?, error? }.
// ---------------------------------------------------------------------
export async function bootstrapSession(options = {}) {                  // Exporta bootstrap de sesión
  const { tryRefresh = true } = options;                                // Flag para permitir/evitar refresh
  const existing = getAccessToken();                                    // Lee token actual (memoria/storage)

  if (existing) {                                                       // Si ya hay access cargado
    return {                                                            // Retorna sin refrescar
      ok: true,                                                         // Indica éxito
      refreshed: false,                                                 // No fue necesario refrescar
      accessToken: existing,                                            // Devuelve el token actual
      user: null                                                        // (Opcional) puedes llamar me() luego si necesitas datos
    };                                                                  // Fin retorno
  }

  if (!tryRefresh) {                                                    // Si no se permite refrescar
    return { ok: false, refreshed: false, accessToken: null, user: null }; // Retorna “no hay sesión”
  }

  try {                                                                 // Intenta refrescar usando cookie HttpOnly
    // Nota: http tiene withCredentials=true, y su request interceptor NO agrega Authorization en /auth/refresh
    const { data } = await http.post('/api/auth/refresh', null);        // Llama refresh sin body
    const access = data?.access_token;                                  // Extrae nuevo access token
    if (!access) {                                                      // Defensa por si backend no envía token
      return { ok: false, refreshed: false, accessToken: null, user: null }; // Considera que no hay sesión
    }
    setAccessToken(access);                                             // Guarda access en memoria (sin persistir extra)
    return {                                                            // Retorna éxito de bootstrap
      ok: true,                                                         // Hay sesión válida ahora
      refreshed: true,                                                  // Se obtuvo via refresh
      accessToken: access,                                              // Token para siguientes llamadas
      user: data?.user || null                                          // Backend devuelve user (si lo configuraste así)
    };                                                                  // Fin retorno
  } catch (err) {                                                       // Si refresh devuelve 401/403/5xx, etc.
    const error = normalizeHttpError(err);                              // Normaliza error para debug/telemetría
    return { ok: false, refreshed: false, accessToken: null, user: null, error }; // No hay sesión
  }                                                                     // Fin catch
}                                                                       // Fin bootstrapSession

// ---------------------------------------------------------------------
// login: POST /api/auth/login
// Body: { email, password }
// Respuesta esperada:
//   { token_type: "Bearer", access_token: "<jwt>", expires_in: "15m", user: {...} } + Set-Cookie pm_rt (HttpOnly)
// Param remember:
//   - true  | 'local'   → guarda access en localStorage
//   - 'session'         → guarda access en sessionStorage
//   - false | undefined → solo memoria (default)
// ---------------------------------------------------------------------
export async function login({ email, password, remember = false }) {    // remember: controla persistencia del access
  try {                                                                 // Manejo de errores
    const { data } = await http.post('/api/auth/login', {               // Llama endpoint de login
      email,                                                            // Email ingresado
      password                                                          // Password ingresado
    });                                                                 // Fin POST

    const access = data?.access_token;                                  // Extrae access token
    if (!access) throw new Error('El backend no devolvió access_token'); // Defensa ante cambios

    setAccessToken(access, { remember });                               // Guarda token con el modo elegido

    return {                                                            // Payload útil para la UI
      user: data?.user || null,                                         // Usuario saneado
      accessToken: access,                                              // JWT de acceso
      tokenType: data?.token_type || 'Bearer',                          // Tipo (por claridad)
      expiresIn: data?.expires_in || '15m'                              // Duración declarada
    };                                                                  // Fin retorno
  } catch (err) {                                                       // Captura
    throw normalizeHttpError(err);                                      // Re-lanza { status, message }
  }
}                                                                       // Fin login

// ---------------------------------------------------------------------
// me: GET /api/user/me
// - Requiere Authorization Bearer <access> (http.js lo agrega si hay token).
// ---------------------------------------------------------------------
export async function me() {                                            // Perfil del usuario autenticado
  try {                                                                 // Manejo de errores
    const { data } = await http.get('/api/user/me');                    // Llama endpoint protegido
    return data;                                                        // Devuelve usuario seguro
  } catch (err) {                                                       // Captura
    throw normalizeHttpError(err);                                      // Re-lanza { status, message }
  }
}                                                                       // Fin me

// ---------------------------------------------------------------------
// logout: POST /api/auth/logout
// - Revoca el refresh actual en backend (cookie HttpOnly).
// - Limpia el access token local (memoria + storages).
// ---------------------------------------------------------------------
export async function logout() {                                        // Cerrar sesión actual
  try {                                                                 // Manejo de errores
    await http.post('/api/auth/logout');                                 // Solicita revocar refresh y limpiar cookie
  } catch (err) {                                                       // Si falla, igualmente limpiaremos local
    // (Opcional) console.warn('logout error:', err);                   // Log no intrusivo
  } finally {                                                           // Siempre ejecutar limpieza local
    clearAccessToken();                                                 // Borra access en memoria/session/local
  }
}                                                                       // Fin logout

// ---------------------------------------------------------------------
// logoutAll: POST /api/auth/logout-all
// - Requiere Authorization Bearer (http.js lo inyecta).
// - Revoca TODOS los refresh del usuario en backend (todas las sesiones).
// - Limpia el access token local.
// ---------------------------------------------------------------------
export async function logoutAll() {                                     // Cierre de sesión global
  try {                                                                 // Manejo de errores
    await http.post('/api/auth/logout-all');                             // Revoca todos los refresh del usuario
  } catch (err) {                                                       // Si falla, igual limpiamos
    // (Opcional) console.warn('logoutAll error:', err);                // Log no intrusivo
  } finally {                                                           // Limpieza local garantizada
    clearAccessToken();                                                 // Borra access en memoria/session/local
  }
}                                                                       // Fin logoutAll

// ---------------------------------------------------------------------
// register: POST /api/user/register
// Body: { firstName, lastName, email, phone, password }
// Respuesta 201: { message, user }
// ---------------------------------------------------------------------
export async function register(payload) {                                // Registro de usuario
  try {                                                                  // Manejo de errores
    const { data } = await http.post('/api/user/register', payload);     // Llama endpoint público
    return data?.user || null;                                           // Devuelve usuario creado (sin sensibles)
  } catch (err) {                                                        // Captura
    throw normalizeHttpError(err);                                       // Re-lanza { status, message }
  }
}                                                                        // Fin register
