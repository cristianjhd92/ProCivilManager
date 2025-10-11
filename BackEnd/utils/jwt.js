// File: BackEnd/utils/jwt.js                                               // Ruta y nombre del archivo (nuevo)
// Descripción: Helpers centralizados para JWT de acceso y refresh tokens.  // Propósito del módulo
// - Firma/verifica Access Tokens (JWT).                                     // Acceso
// - Genera valores de Refresh Token (random), calcula expiración y hash.    // Sesión
// - Expone opciones de cookie para RT leídas desde .env.                    // Cookies

const jwt    = require('jsonwebtoken');                                      // Librería para firmar/verificar JWT
const crypto = require('crypto');                                            // Módulo nativo para generar aleatorios y hash

// -----------------------------------------------------------------------------
// Carga de configuración desde variables de entorno                            // Parametrización por .env
// -----------------------------------------------------------------------------
const {
  JWT_SECRET,                                                                // Secreto para firmar/verificar JWT (obligatorio)
  JWT_ACCESS_EXPIRES = '15m',                                                // Duración del access token (ej. "15m", "1h")
  JWT_ISSUER,                                                                // (Opcional) Claim iss (emisor)
  JWT_AUDIENCE,                                                              // (Opcional) Claim aud (audiencia)
  REFRESH_TOKEN_TTL_DAYS = '30',                                             // Vida del refresh token en días
  REFRESH_TOKEN_COOKIE = 'pm_rt',                                            // Nombre de la cookie de RT
  REFRESH_COOKIE_DOMAIN = 'localhost',                                       // Dominio cookie RT
  REFRESH_COOKIE_PATH = '/',                                                 // Path cookie RT
  REFRESH_COOKIE_HTTPONLY = 'true',                                          // HttpOnly cookie RT
  REFRESH_COOKIE_SECURE = 'false',                                           // Secure cookie RT (true en prod https)
  REFRESH_COOKIE_SAMESITE = 'Lax'                                            // SameSite cookie RT (Lax/Strict/None)
} = process.env;                                                             // Lectura de env

// -----------------------------------------------------------------------------
// Validación temprana del secreto JWT                                           // Falla rápido si falta
// -----------------------------------------------------------------------------
if (!JWT_SECRET) {                                                           // Si no hay secreto
  console.warn('⚠️  JWT_SECRET no está definido en el entorno (.env).');      // Advertencia en consola (no bloquea arranque)
}                                                                            // Fin validación temprana

// -----------------------------------------------------------------------------
// Utilidad: normalizar booleanos de strings de .env                            // "true"/"false" → boolean
// -----------------------------------------------------------------------------
const asBool = (v) => String(v).toLowerCase() === 'true';                    // Convierte string a booleano real

// -----------------------------------------------------------------------------
// Helper: opciones por defecto para firmar/verificar JWT                       // Reusas en sign/verify
// -----------------------------------------------------------------------------
function getJwtSignOptions() {                                               // Construye opciones de firma
  const opts = {                                                             // Objeto base
    algorithm: 'HS256',                                                      // Algoritmo de HMAC-SHA256
    expiresIn: JWT_ACCESS_EXPIRES || '15m'                                   // Tiempo de expiración del access token
  };                                                                         // Cierre base
  if (JWT_ISSUER)   opts.issuer   = JWT_ISSUER;                              // Incluye iss si está definido
  if (JWT_AUDIENCE) opts.audience = JWT_AUDIENCE;                            // Incluye aud si está definido
  return opts;                                                               // Devuelve opciones listas
}                                                                            // Fin getJwtSignOptions

function getJwtVerifyOptions() {                                             // Construye opciones de verificación
  const opts = { algorithms: ['HS256'] };                                    // Restringe a HS256 por seguridad
  if (JWT_ISSUER)   opts.issuer   = JWT_ISSUER;                              // Verifica iss si fue configurado
  if (JWT_AUDIENCE) opts.audience = JWT_AUDIENCE;                            // Verifica aud si fue configurado
  return opts;                                                               // Devuelve opciones
}                                                                            // Fin getJwtVerifyOptions

// -----------------------------------------------------------------------------
// Firma de Access Token                                                         // Salida: string JWT
// -----------------------------------------------------------------------------
/**
 * signAccessToken
 * @param {Object} user Minimal: { id: string, role?: string }                 // Datos mínimos del sujeto
 * @returns {string} token JWT firmado
 */
function signAccessToken(user = {}) {                                         // Firma un JWT de acceso
  if (!JWT_SECRET) throw new Error('JWT_SECRET ausente.');                    // Asegura que hay secreto
  const payload = {                                                           // Cuerpo del token
    sub: String(user.id || user._id || ''),                                   // Subject: id del usuario (string)
    role: user.role || undefined                                              // Rol opcional (evitar PII innecesaria)
  };                                                                          // Cierre payload
  if (!payload.sub) throw new Error('Usuario sin id para firmar JWT.');       // Valida que haya sub
  return jwt.sign(payload, JWT_SECRET, getJwtSignOptions());                  // Firma y devuelve el JWT
}                                                                             // Fin signAccessToken

// -----------------------------------------------------------------------------
// Verificación de Access Token                                                  // Devuelve payload decodificado o lanza
// -----------------------------------------------------------------------------
/**
 * verifyAccessToken
 * @param {string} token JWT recibido (header Authorization Bearer)
 * @returns {Object} payload decodificado (si es válido)
 * @throws Error con .name = 'TokenExpiredError' | 'JsonWebTokenError' etc.
 */
function verifyAccessToken(token) {                                           // Verifica un JWT de acceso
  if (!JWT_SECRET) throw new Error('JWT_SECRET ausente.');                    // Asegura secreto
  if (!token)      throw new Error('Token no provisto.');                     // Asegura token
  return jwt.verify(token, JWT_SECRET, getJwtVerifyOptions());                // Verifica firma/exp y devuelve payload
}                                                                             // Fin verifyAccessToken

// -----------------------------------------------------------------------------
// Decodificar sin verificar (solo para logs/debug, NO para auth)               // Útil en diagnósticos
// -----------------------------------------------------------------------------
function decodeAccessToken(token) {                                           // Decodifica JWT sin verificar
  try {                                                                       // Intenta decodificar
    return jwt.decode(String(token || ''), { json: true });                   // Devuelve objeto o null
  } catch {                                                                   // Si falla
    return null;                                                              // Retorna null
  }                                                                           // Fin catch
}                                                                             // Fin decodeAccessToken

// -----------------------------------------------------------------------------
// Refresh Tokens: generación de valor aleatorio y hash                          // Persistiremos SOLO el hash
// -----------------------------------------------------------------------------
/**
 * generateRefreshTokenValue
 * Genera un valor aleatorio criptográficamente seguro para usar como RT.
 * @returns {string} refreshToken (valor en claro para cookie)                 // NO guardar en BD
 */
function generateRefreshTokenValue() {                                        // Genera RT aleatorio
  return crypto.randomBytes(48).toString('hex');                              // 48 bytes → 96 chars hex (suficiente entropía)
}                                                                             // Fin generateRefreshTokenValue

/**
 * hashRefreshToken
 * Hashea el RT en claro con SHA-256 (hex) para persistir en BD.
 * @param {string} plain valor en claro
 * @returns {string} hash hex
 */
function hashRefreshToken(plain) {                                            // Hashea RT
  return crypto.createHash('sha256')                                          // Crea hasher SHA-256
    .update(String(plain))                                                    // Alimenta con el token claro
    .digest('hex');                                                           // Devuelve hash hex
}                                                                             // Fin hashRefreshToken

/**
 * getRefreshExpiryDate
 * Calcula la fecha de expiración del RT según REFRESH_TOKEN_TTL_DAYS.
 * @returns {Date} expiresAt
 */
function getRefreshExpiryDate() {                                             // Calcula vencimiento RT
  const days = Number(REFRESH_TOKEN_TTL_DAYS || '30');                        // Lee días de TTL
  const d = new Date();                                                       // Fecha actual
  d.setDate(d.getDate() + (Number.isFinite(days) ? days : 30));               // Suma días (fallback 30)
  return d;                                                                   // Devuelve Date de expiración
}                                                                             // Fin getRefreshExpiryDate

// -----------------------------------------------------------------------------
// Cookie del Refresh Token: opciones derivadas de .env                          // Para usar en res.cookie(name, value, opts)
// -----------------------------------------------------------------------------
/**
 * getRefreshCookieName
 * @returns {string} nombre de la cookie (por defecto pm_rt)
 */
function getRefreshCookieName() {                                             // Nombre de la cookie RT
  return REFRESH_TOKEN_COOKIE || 'pm_rt';                                     // Devuelve nombre (fallback)
}                                                                             // Fin getRefreshCookieName

/**
 * getRefreshCookieOptions
 * @returns {Object} opciones seguras para res.cookie(...)
 */
function getRefreshCookieOptions() {                                          // Opciones para cookie RT
  const maxAgeMs = Number(REFRESH_TOKEN_TTL_DAYS || '30') *                   // TTL en días →
                   24 * 60 * 60 * 1000;                                       // → milisegundos
  return {                                                                     // Objeto de opciones
    httpOnly: asBool(REFRESH_COOKIE_HTTPONLY),                                // No accesible por JS (protege XSS)
    secure:   asBool(REFRESH_COOKIE_SECURE),                                  // Solo por HTTPS (en prod debe ser true)
    sameSite: REFRESH_COOKIE_SAMESITE || 'Lax',                               // CSRF: Lax/Strict/None (None requiere secure)
    domain:   REFRESH_COOKIE_DOMAIN || 'localhost',                           // Dominio para cookie
    path:     REFRESH_COOKIE_PATH || '/',                                     // Path donde aplica
    maxAge:   Number.isFinite(maxAgeMs) ? maxAgeMs : (30 * 24 * 60 * 60 * 1000) // Duración en ms (fallback 30d)
  };                                                                           // Fin objeto
}                                                                              // Fin getRefreshCookieOptions

// -----------------------------------------------------------------------------
// Exportaciones                                                                 // API pública del helper
// -----------------------------------------------------------------------------
module.exports = {                                                             // Exporta funciones utilitarias
  // Access JWT
  signAccessToken,                                                             // Firmar access token
  verifyAccessToken,                                                           // Verificar access token
  decodeAccessToken,                                                           // Decodificar sin verificar (debug)

  // Refresh helpers
  generateRefreshTokenValue,                                                   // Generar RT (valor en claro)
  hashRefreshToken,                                                            // Hashear RT (persistencia)
  getRefreshExpiryDate,                                                        // Calcular expiresAt

  // Cookie RT
  getRefreshCookieName,                                                        // Nombre de cookie
  getRefreshCookieOptions,                                                     // Opciones de cookie

  // Opcionalmente expón opciones JWT si te sirven en tests                     // Conveniencia para pruebas
  getJwtSignOptions,                                                           // Opciones de firma
  getJwtVerifyOptions                                                          // Opciones de verificación
};                                                                             // Fin exports
