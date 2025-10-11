// File: FrontEnd/src/api/tokenStore.js                            // Ruta del archivo (actualizado)
// Descripción: Almacén del access token con 3 niveles de persistencia. // Propósito del módulo
// - Memoria (default, más seguro)                                     // Nivel 1: sólo runtime (evita XSS persistente)
// - sessionStorage (remember: 'session')                              // Nivel 2: persiste hasta cerrar pestaña/ventana
// - localStorage (remember: true | 'local')                           // Nivel 3: persiste entre reinicios del navegador
// Además: sincroniza cambios entre pestañas y expone suscripción simple. // DX y coherencia entre tabs

// ===============================
// Estado en memoria (runtime)
// ===============================
let accessToken = null;                                                // Token residente en memoria (vida de la app)

// ===============================
// Constantes y utilidades
// ===============================
const STORAGE_KEY = 'pm_access_token';                                 // Clave única de almacenamiento (local/session)
const isBrowser = typeof window !== 'undefined';                       // Flag: true si corremos en navegador (no SSR)

// -----------------------------------------------------------------------------
// getStorage(kind): devuelve un storage seguro o null                            // Maneja bloqueos o entornos sin DOM
// kind: 'local' | 'session'
// -----------------------------------------------------------------------------
function getStorage(kind) {                                            // Declaramos helper getStorage
  if (!isBrowser) return null;                                         // En SSR/tests no hay window → null
  try {                                                                // Try/catch por posibles restricciones del navegador
    if (kind === 'local')  return window.localStorage || null;         // Devuelve localStorage si existe
    if (kind === 'session') return window.sessionStorage || null;      // Devuelve sessionStorage si existe
  } catch (_) {                                                        // Safari Private Mode u otras políticas pueden lanzar
    // Silencioso: si falla, retornamos null abajo                     // Evitamos romper la app por almacenamiento
  }
  return null;                                                         // Fallback: sin storage disponible
}                                                                      // Fin getStorage

// -----------------------------------------------------------------------------
// readFrom(storage): lee la clave STORAGE_KEY de un storage dado                 // Safe getItem
// -----------------------------------------------------------------------------
function readFrom(storage) {                                           // Declaramos helper de lectura
  if (!storage) return null;                                           // Si no hay storage, no hay valor
  try {                                                                // Intenta leer
    return storage.getItem(STORAGE_KEY);                               // Retorna el string guardado o null
  } catch (_) {                                                        // Si algo falla (cuotas, políticas)
    return null;                                                       // Devolvemos null para no romper flujo
  }
}                                                                      // Fin readFrom

// -----------------------------------------------------------------------------
// writeTo(storage, value): escribe/elimina STORAGE_KEY en un storage            // Safe setItem/removeItem
// -----------------------------------------------------------------------------
function writeTo(storage, value) {                                     // Declaramos helper de escritura
  if (!storage) return;                                                // Sin storage → nada que hacer
  try {                                                                // Try/catch por seguridad
    if (value == null) storage.removeItem(STORAGE_KEY);                // Si value es null/undefined → borrar clave
    else storage.setItem(STORAGE_KEY, String(value));                  // Si hay valor → guardar como string
  } catch (_) {                                                        // Si storage lleno o bloqueado
    // No interrumpimos la app                                         // Falla silenciosa
  }
}                                                                      // Fin writeTo

// -----------------------------------------------------------------------------
// clearAllStorages(): elimina la clave en localStorage y sessionStorage          // Limpieza centralizada
// -----------------------------------------------------------------------------
function clearAllStorages() {                                          // Declara limpieza total
  writeTo(getStorage('local'),   null);                                // Borra en localStorage
  writeTo(getStorage('session'), null);                                // Borra en sessionStorage
}                                                                      // Fin clearAllStorages

// ===============================
// Inicialización (hidratar memoria)
// ===============================
// Prioridad: sessionStorage > localStorage                             // Coherente con “sesión activa” primero
(function hydrateFromStorages() {                                      // IIFE de hidratación
  const fromSession = readFrom(getStorage('session'));                 // Intenta leer de sessionStorage
  const fromLocal   = readFrom(getStorage('local'));                   // Intenta leer de localStorage
  accessToken = fromSession ?? fromLocal ?? null;                      // Primer valor no nulo gana
})();                                                                  // Ejecuta IIFE

// ===============================
// Suscriptores a cambios (opcional)
// ===============================
let subscribers = [];                                                  // Lista de callbacks suscritos a cambios

function notifySubscribers(token) {                                    // Notifica a todos los oyentes
  subscribers.forEach((fn) => {                                        // Itera callbacks
    try { fn(token); } catch (_) {}                                    // Aíslalos por si alguno lanza
  });                                                                  // Fin foreach
}                                                                      // Fin notifySubscribers

// onTokenChange(cb): registra un callback que se llama en set/clear     // Devuelve unsubscribe() para limpiar
export function onTokenChange(cb) {                                    // Exporta suscripción pública
  if (typeof cb !== 'function') return () => {};                       // Si no es función, retorna noop
  subscribers.push(cb);                                                // Agrega a la lista
  return () => { subscribers = subscribers.filter((f) => f !== cb); }; // Devuelve función de desuscripción
}                                                                      // Fin onTokenChange

// -----------------------------------------------------------------------------
// detectCurrentMode(): detecta persistencia actual                                 // 'session' | 'local' | null
// Útil para conservar el modo en refrescos si no se especifica remember.
// -----------------------------------------------------------------------------
function detectCurrentMode() {                                         // Declara detección de modo
  const hadSession = readFrom(getStorage('session')) != null;          // ¿Hay token en sessionStorage?
  if (hadSession) return 'session';                                    // Sí → modo session
  const hadLocal = readFrom(getStorage('local')) != null;              // ¿Hay token en localStorage?
  if (hadLocal) return 'local';                                        // Sí → modo local
  return null;                                                         // Ninguno → sólo memoria
}                                                                      // Fin detectCurrentMode

// ===============================
// API principal
// ===============================

// -----------------------------------------------------------------------------
// setAccessToken(token, { remember }): establece el token y su persistencia
// - token: string|null → si null, equivale a clearAccessToken()
// - remember:
//     * true  | 'local'   → guarda en localStorage
//     * 'session'         → guarda en sessionStorage
//     * false | undefined → sólo memoria (default)
//     * undefined (en refresh)   → conserva modo previamente detectado
// -----------------------------------------------------------------------------
export function setAccessToken(token, options = {}) {                  // Exporta setter principal
  if (!token) {                                                        // Si viene vacío/falsy
    clearAccessToken();                                                // Limpiamos todo
    return;                                                            // Y terminamos
  }

  const normalized = String(token);                                    // Normaliza a string
  accessToken = normalized;                                            // Guarda SIEMPRE en memoria

  const { remember } = options;                                        // Lee opción remember (puede ser undefined)
  let mode;                                                            // Modo de persistencia final
  if (remember === true || remember === 'local') mode = 'local';       // true/'local' → localStorage
  else if (remember === 'session') mode = 'session';                   // 'session' → sessionStorage
  else mode = detectCurrentMode();                                     // undefined → conservar modo previo si existía

  clearAllStorages();                                                  // Limpia duplicados previos (coherencia)

  if (mode === 'local')   writeTo(getStorage('local'),   normalized);  // Persiste en localStorage si aplica
  if (mode === 'session') writeTo(getStorage('session'), normalized);  // Persiste en sessionStorage si aplica

  notifySubscribers(accessToken);                                      // Notifica cambios a listeners
}                                                                      // Fin setAccessToken

// -----------------------------------------------------------------------------
// getAccessToken(): string|null → devuelve el token en memoria o rehidrata de storages si está vacío
// -----------------------------------------------------------------------------
export function getAccessToken() {                                     // Exporta getter
  if (accessToken) return accessToken;                                 // Si ya lo tenemos, devuelve
  const fromSession = readFrom(getStorage('session'));                 // Lee sessionStorage
  const fromLocal   = readFrom(getStorage('local'));                   // Lee localStorage
  accessToken = fromSession ?? fromLocal ?? null;                      // Rehidrata memoria con lo encontrado
  return accessToken;                                                  // Devuelve (puede ser null)
}                                                                      // Fin getAccessToken

// -----------------------------------------------------------------------------
// clearAccessToken(): limpia token en memoria y storages, y notifica
// -----------------------------------------------------------------------------
export function clearAccessToken() {                                   // Exporta cleaner
  accessToken = null;                                                  // Limpia en memoria
  clearAllStorages();                                                  // Limpia en storages
  notifySubscribers(accessToken);                                      // Notifica con null
}                                                                      // Fin clearAccessToken

// -----------------------------------------------------------------------------
// isAuthenticated(): boolean → indica si hay token presente (no valida firma/exp)
// -----------------------------------------------------------------------------
export function isAuthenticated() {                                    // Exporta helper booleano
  return Boolean(getAccessToken());                                    // true si hay string no vacío
}                                                                      // Fin isAuthenticated

// ===============================
// Sincronización entre pestañas
// ===============================
// Nota: el evento 'storage' sólo se dispara entre pestañas en cambios de localStorage.
// Para sessionStorage no hay sincronización entre tabs (es por pestaña).
if (isBrowser && typeof window.addEventListener === 'function') {      // Si estamos en navegador
  window.addEventListener('storage', (evt) => {                        // Escucha cambios de storage entre pestañas
    if (evt.key !== STORAGE_KEY) return;                               // Ignora otras claves
    const sessionVal = readFrom(getStorage('session'));                // Toma valor actual de sessionStorage (esta pestaña)
    const localVal   = readFrom(getStorage('local'));                  // Toma valor actual de localStorage (sincronizado)
    const next = sessionVal ?? localVal ?? null;                       // Prioridad: session > local > null
    if (accessToken !== next) {                                        // Si hay cambio real
      accessToken = next;                                              // Actualiza memoria
      notifySubscribers(accessToken);                                  // Notifica a suscriptores
    }
  });                                                                  // Fin listener 'storage'
}                                                                      // Fin if navegador
