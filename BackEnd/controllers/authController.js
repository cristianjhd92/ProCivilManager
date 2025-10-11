// File: BackEnd/controllers/authController.js                           // Ruta del archivo (nuevo)
// Descripción: Controlador de autenticación con Access JWT + Refresh.   // Propósito
// - /auth/login: emite access JWT y setea refresh en cookie HttpOnly.    // Login
// - /auth/refresh: rota refresh y emite nuevo access JWT.                // Rotación
// - /auth/logout: revoca el refresh actual y limpia cookie.              // Logout actual
// - /auth/logout-all: revoca todos los refresh del usuario.              // Logout global

const bcrypt = require('bcryptjs');                                      // Importa bcrypt para comparar contraseñas
const User = require('../models/User');                                  // Importa el modelo User
const RefreshToken = require('../models/RefreshToken');                  // Importa el modelo RefreshToken

const {                                                                // Importa utilidades relacionadas con JWT/Refresh
  signAccessToken,                                                     // Función para firmar el Access JWT
  generateRefreshTokenValue,                                           // Genera un valor aleatorio de refresh (texto claro)
  hashRefreshToken,                                                    // Hashea el valor del refresh para persistir en BD
  getRefreshExpiryDate,                                                // Calcula la fecha de expiración del refresh
  getRefreshCookieName,                                                // Obtiene el nombre de la cookie desde .env
  getRefreshCookieOptions                                              // Obtiene opciones seguras de cookie desde .env
} = require('../utils/jwt');                                           // Ruta del utilitario

// -----------------------------------------------------------------------------
// Helpers internos                                                             // Sección de utilidades internas
// -----------------------------------------------------------------------------

function sanitizeUser(u) {                                                     // Normaliza los datos del usuario para el front
  return {                                                                     // Devuelve un objeto seguro
    id: String(u._id),                                                         // id del usuario como string
    email: u.email,                                                            // email del usuario
    role: u.role || 'user',                                                    // rol del usuario (user por defecto)
    name: u.name || undefined                                                  // nombre si existe en el esquema
  };                                                                           // Fin del objeto devuelto
}                                                                              // Fin de sanitizeUser

function getClientMeta(req) {                                                  // Obtiene metadatos del cliente (IP y User-Agent)
  const ip =                                                                    // Determina IP del cliente
    req.headers['x-forwarded-for']?.split(',').shift()?.trim() ||              // Toma la primera IP de X-Forwarded-For si existe
    req.socket?.remoteAddress ||                                               // O la IP remota del socket
    req.ip ||                                                                  // O la IP según Express
    '0.0.0.0';                                                                 // Fallback por si no hay nada
  const ua = req.headers['user-agent'] || 'unknown';                           // Obtiene el User-Agent o 'unknown'
  return { ip, userAgent: ua };                                                // Devuelve objeto con ip y userAgent
}                                                                              // Fin de getClientMeta

function setRefreshCookie(res, refreshValue) {                                 // Setea la cookie HttpOnly del refresh token
  const cookieName = getRefreshCookieName();                                   // Obtiene el nombre de la cookie
  const cookieOpts = getRefreshCookieOptions();                                // Obtiene las opciones (secure, httpOnly, etc.)
  res.cookie(cookieName, refreshValue, cookieOpts);                            // Envía la cookie al cliente
}                                                                              // Fin de setRefreshCookie

function clearRefreshCookie(res) {                                             // Limpia/borra la cookie de refresh
  const cookieName = getRefreshCookieName();                                   // Obtiene el nombre de la cookie
  const { domain, path } = getRefreshCookieOptions();                          // Extrae domain y path para limpieza precisa
  res.clearCookie(cookieName, { domain, path });                               // Borra la cookie en el cliente
}                                                                              // Fin de clearRefreshCookie

// -----------------------------------------------------------------------------
// POST /auth/login                                                              // Endpoint de inicio de sesión
// -----------------------------------------------------------------------------
/**
 * Body esperado: { email: string, password: string }                           // Contrato de entrada
 * Respuesta (200):                                                              // Contrato de salida
 *   {
 *     token_type: "Bearer",
 *     access_token: "<jwt>",
 *     expires_in: "<config JWT_ACCESS_EXPIRES>",
 *     user: { id, email, role, name? }
 *   }
 * Set-Cookie: pm_rt=<refresh>; HttpOnly; ... (según .env)                      // Cookie con refresh token
 */
exports.login = async (req, res, next) => {                                     // Exporta handler login (async)
  try {                                                                         // Manejo de errores con try/catch
    const { email, password } = req.body || {};                                 // Extrae email y password del body
    if (!email || !password) {                                                  // Valida que ambos existan
      const err = new Error('Email y password son requeridos');                 // Crea error semántico
      err.status = 400;                                                         // Asigna status 400 (Bad Request)
      throw err;                                                                // Lanza el error
    }

    const user = await User.findOne({ email })                                  // Busca usuario por email
      .collation({ locale: 'es', strength: 2 })                                 // Aplica collation ES (insensible a mayúsculas/acentos)
      .exec();                                                                  // Ejecuta la consulta

    if (!user) {                                                                // Si no encuentra usuario
      const err = new Error('Credenciales inválidas');                          // Mensaje genérico (no revelar detalle)
      err.status = 401;                                                         // 401 Unauthorized
      throw err;                                                                // Lanza el error
    }

    const ok = await bcrypt.compare(String(password), String(user.password));   // Compara la contraseña con el hash
    if (!ok) {                                                                  // Si la comparación falla
      const err = new Error('Credenciales inválidas');                          // Mensaje genérico
      err.status = 401;                                                         // 401 Unauthorized
      throw err;                                                                // Lanza el error
    }

    const accessToken = signAccessToken({ id: user._id, role: user.role });     // Firma el Access JWT con id y rol

    const rtValue = generateRefreshTokenValue();                                 // Genera valor en claro del refresh token
    const rtHash  = hashRefreshToken(rtValue);                                   // Lo hashea para persistir en BD
    const expiresAt = getRefreshExpiryDate();                                    // Calcula fecha de expiración
    const meta = getClientMeta(req);                                             // Obtiene IP y User-Agent

    await RefreshToken.create({                                                  // Inserta registro de refresh en BD
      user: user._id,                                                            // Referencia al usuario
      tokenHash: rtHash,                                                         // Guarda el hash del token
      expiresAt,                                                                 // Fecha de expiración
      createdAt: new Date(),                                                     // Marca de creación
      createdByIp: meta.ip,                                                      // IP que lo creó
      userAgent: meta.userAgent                                                  // User-Agent del cliente
      // revokedAt: null, replacedBy: null                                       // Campos nulos por defecto
    });                                                                          // Fin de create

    setRefreshCookie(res, rtValue);                                              // Envía cookie HttpOnly con el valor en claro

    return res.status(200).json({                                                // Responde 200 OK con payload
      token_type: 'Bearer',                                                      // Indica tipo de token
      access_token: accessToken,                                                 // Entrega el Access JWT
      expires_in: process.env.JWT_ACCESS_EXPIRES || '15m',                       // Expira según .env (fallback 15m)
      user: sanitizeUser(user)                                                   // Devuelve datos mínimos del usuario
    });                                                                          // Fin de respuesta 200
  } catch (err) {                                                                // Captura de errores
    return next(err);                                                            // Delega al manejador global de errores
  }                                                                              // Fin del catch
};                                                                               // Fin de exports.login

// -----------------------------------------------------------------------------
// POST /auth/refresh                                                            // Endpoint de rotación de refresh
// -----------------------------------------------------------------------------
/**
 * Requiere cookie HttpOnly con el refresh actual.                               // Condición de entrada
 * Flujo:                                                                        // Descripción del flujo
 *  - Leer cookie, validar existencia.
 *  - Buscar token por hash y vigencia; si no existe → 401 + clear cookie.
 *  - Rotar: crear nuevo RT, marcar actual como revoked y replacedBy (o eliminar).
 *  - Emitir nuevo access JWT y setear nueva cookie.
 */
exports.refresh = async (req, res, next) => {                                   // Exporta handler refresh (async)
  try {                                                                         // Manejo de errores con try/catch
    const cookieName = getRefreshCookieName();                                   // Obtiene nombre de la cookie
    const rtClear = req.cookies?.[cookieName];                                   // Lee el valor en claro desde la cookie
    if (!rtClear) {                                                              // Si no vino la cookie
      const err = new Error('Refresh token ausente');                            // Crea error semántico
      err.status = 401;                                                          // 401 Unauthorized
      throw err;                                                                 // Lanza el error
    }

    const rtHash = hashRefreshToken(rtClear);                                    // Hashea el valor claro para buscar en BD
    const now = new Date();                                                      // Obtiene el tiempo actual

    const current = await RefreshToken.findOne({                                 // Busca un refresh válido
      tokenHash: rtHash,                                                         // Coincidencia por hash
      revokedAt: null,                                                           // Que no esté revocado
      expiresAt: { $gt: now }                                                    // Y no esté expirado
    }).populate('user', 'email role name');                                      // Trae datos mínimos del usuario

    if (!current || !current.user) {                                             // Si no existe o está huérfano
      clearRefreshCookie(res);                                                   // Limpia cookie inválida/expirada
      const err = new Error('Refresh token inválido o expirado');                // Mensaje genérico
      err.status = 401;                                                          // 401 Unauthorized
      throw err;                                                                 // Lanza el error
    }

    const meta = getClientMeta(req);                                             // Lee IP y User-Agent del cliente
    const newValue = generateRefreshTokenValue();                                 // Genera nuevo valor en claro
    const newHash  = hashRefreshToken(newValue);                                  // Hashea nuevo valor
    const newExpires = getRefreshExpiryDate();                                    // Nueva fecha de expiración

    const replacement = await RefreshToken.create({                               // Inserta el nuevo refresh en BD
      user: current.user._id,                                                    // Mismo usuario
      tokenHash: newHash,                                                        // Hash del nuevo refresh
      expiresAt: newExpires,                                                     // Fecha de expiración nueva
      createdAt: now,                                                            // Marca de creación
      createdByIp: meta.ip,                                                      // IP creadora
      userAgent: meta.userAgent                                                  // User-Agent creador
    });                                                                          // Fin de create

    current.revokedAt = now;                                                     // Marca el actual como revocado
    current.replacedBy = replacement._id;                                        // Enlaza con el nuevo refresh
    current.revokedByIp = meta.ip;                                               // Guarda IP que revoca
    await current.save();                                                        // Persiste cambios del actual

    const accessToken = signAccessToken({                                        // Firma nuevo Access JWT
      id: current.user._id,                                                      // Id del usuario
      role: current.user.role                                                    // Rol del usuario
    });                                                                          // Fin de signAccessToken

    setRefreshCookie(res, newValue);                                             // Envía cookie con el nuevo refresh

    return res.status(200).json({                                                // Responde 200 OK
      token_type: 'Bearer',                                                      // Tipo Bearer
      access_token: accessToken,                                                 // Access token nuevo
      expires_in: process.env.JWT_ACCESS_EXPIRES || '15m',                       // Expiración declarada
      user: sanitizeUser(current.user)                                           // Usuario saneado
    });                                                                          // Fin de respuesta
  } catch (err) {                                                                // Captura de errores
    return next(err);                                                            // Delega al manejador global
  }                                                                              // Fin del catch
};                                                                               // Fin de exports.refresh

// -----------------------------------------------------------------------------
// POST /auth/logout                                                             // Endpoint para cerrar sesión actual
// -----------------------------------------------------------------------------
/**
 * Requiere cookie HttpOnly con el refresh actual.                               // Condición
 * Efecto:
 *  - Revoca (o elimina) el refresh de BD si existe.                             // Acción en BD
 *  - Limpia cookie.                                                             // Acción en cliente
 */
exports.logout = async (req, res, next) => {                                     // Exporta handler logout (async)
  try {                                                                          // Manejo de errores con try/catch
    const cookieName = getRefreshCookieName();                                   // Obtiene nombre de la cookie
    const rtClear = req.cookies?.[cookieName];                                   // Lee cookie del request
    if (rtClear) {                                                               // Si existe cookie
      const rtHash = hashRefreshToken(rtClear);                                  // Hashea valor para buscar
      const doc = await RefreshToken.findOne({                                   // Busca refresh activo
        tokenHash: rtHash,                                                       // Por hash
        revokedAt: null                                                          // Y no revocado
      });                                                                        // Fin de consulta
      if (doc) {                                                                 // Si encontró documento
        doc.revokedAt = new Date();                                              // Marca como revocado ahora
        doc.revokedByIp = getClientMeta(req).ip;                                 // Anota IP que revoca
        await doc.save();                                                        // Guarda cambios
      }
    }
    clearRefreshCookie(res);                                                     // Limpia cookie en el cliente
    return res.status(200).json({ ok: true, message: 'Sesión cerrada' });       // Responde OK
  } catch (err) {                                                                // Captura error
    return next(err);                                                            // Delega al manejador global
  }                                                                              // Fin del catch
};                                                                               // Fin de exports.logout

// -----------------------------------------------------------------------------
// POST /auth/logout-all                                                         // Endpoint para cerrar todas las sesiones
// -----------------------------------------------------------------------------
/**
 * Requiere estar autenticado con Access JWT (usa tu authMiddleware).            // Condición
 * Efecto:
 *  - Revoca todos los refresh tokens del usuario en BD.                         // Acción en BD
 *  - Limpia cookie local.                                                       // Acción en cliente
 */
exports.logoutAll = async (req, res, next) => {                                  // Exporta handler logout-all (async)
  try {                                                                          // Manejo de errores con try/catch
    const uid = req.user?.id || req.user?._id;                                   // Obtiene id del usuario del access token
    if (!uid) {                                                                  // Si no hay usuario en req
      const err = new Error('No autenticado');                                   // Error semántico
      err.status = 401;                                                          // 401 Unauthorized
      throw err;                                                                 // Lanza error
    }
    await RefreshToken.updateMany(                                               // Revoca en masa
      { user: uid, revokedAt: null },                                            // Filtra tokens activos del usuario
      { $set: { revokedAt: new Date(), revokedByIp: getClientMeta(req).ip } }    // Setea marca de revocado e IP
    );                                                                           // Fin de updateMany
    clearRefreshCookie(res);                                                     // Limpia cookie local
    return res.status(200).json({ ok: true, message: 'Sesiones cerradas' });    // Responde OK
  } catch (err) {                                                                // Captura error
    return next(err);                                                            // Delega al manejador global
  }                                                                              // Fin del catch
};                                                                               // Fin de exports.logoutAll
