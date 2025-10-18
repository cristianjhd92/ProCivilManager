// File: BackEnd/controllers/authController.js                           // Ruta del archivo
// Descripción: Controlador de autenticación con Access JWT + Refresh.   // Propósito
// - /auth/login: emite access JWT y setea refresh en cookie HttpOnly.    // Login
// - /auth/refresh: rota refresh y emite nuevo access JWT.                // Rotación
// - /auth/logout: revoca el refresh actual y limpia cookie.              // Logout actual
// - /auth/logout-all: revoca todos los refresh del usuario.              // Logout global

const bcrypt = require('bcryptjs');                                      // Comparación de contraseñas
const User = require('../models/User');                                  // Modelo User (con lockout)
const RefreshToken = require('../models/RefreshToken');                  // Modelo RefreshToken

const {                                                                // Utilidades JWT/Refresh centralizadas
  signAccessToken,                                                     // Firma Access JWT
  generateRefreshTokenValue,                                           // Genera valor aleatorio (texto claro)
  hashRefreshToken,                                                    // Hash SHA-256 del refresh
  getRefreshExpiryDate,                                                // Fecha de expiración del refresh
  getRefreshCookieName,                                                // Nombre de la cookie (p.ej. pm_rt)
  getRefreshCookieOptions                                              // Opciones seguras para la cookie
} = require('../utils/jwt');                                           // Utilidades compartidas

// -----------------------------------------------------------------------------
// Helpers internos
// -----------------------------------------------------------------------------

function fullName(u) {                                                           // Calcula nombre completo
  const fn = String(u.firstName || '').trim();                                   // Nombre
  const ln = String(u.lastName  || '').trim();                                   // Apellido
  const n = (fn + ' ' + ln).trim();                                              // Concatena/limpia
  return n || undefined;                                                         // undefined si vacío
}

function sanitizeUser(u) {                                                       // Proyección segura al front
  return {
    id: String(u._id),                                                           // _id → string
    email: u.email,                                                              // Email
    role: u.role || 'cliente',                                                   // Rol (fallback)
    name: fullName(u)                                                            // Nombre calculado
  };
}

function getClientMeta(req) {                                                    // Extrae IP y User-Agent
  const ip =
    req.headers['x-forwarded-for']?.split(',').shift()?.trim() ||                // 1ª IP si hay proxy
    req.socket?.remoteAddress ||                                                 // IP de socket
    req.ip ||                                                                    // IP segun Express
    '0.0.0.0';                                                                   // Fallback
  const ua = req.headers['user-agent'] || 'unknown';                             // User-Agent o 'unknown'
  return { ip, userAgent: ua };                                                  // Objeto meta
}

function setRefreshCookie(res, refreshValue) {                                   // Setea cookie HttpOnly
  const cookieName = getRefreshCookieName();                                     // Nombre cookie
  const cookieOpts = getRefreshCookieOptions();                                  // Opciones (secure, sameSite, etc.)
  res.cookie(cookieName, refreshValue, cookieOpts);                              // Envía Set-Cookie
}

function clearRefreshCookie(res) {                                               // Borra cookie de refresh
  const cookieName = getRefreshCookieName();                                     // Nombre cookie
  const opts = getRefreshCookieOptions();                                        // Mismas opciones que set
  // ⚠️ Importante: usar mismas flags (domain, path, sameSite, secure, httpOnly)
  res.clearCookie(cookieName, {                                                  // Envía Set-Cookie para borrar
    domain: opts.domain,                                                         // Mismo dominio
    path: opts.path,                                                             // Mismo path
    sameSite: opts.sameSite,                                                     // Misma política
    secure: opts.secure,                                                         // Misma seguridad
    httpOnly: opts.httpOnly,                                                     // Misma HttpOnly
  });
}

// -----------------------------------------------------------------------------
// POST /auth/login
// -----------------------------------------------------------------------------
/**
 * Body: { email, password }
 * 200: { token_type:'Bearer', access_token, expires_in, user:{id,email,role,name?} }
 * Set-Cookie: <pm_rt>=<refresh>; HttpOnly; Secure?; SameSite=...; Path=/; Domain=...
 */
exports.login = async (req, res, next) => {                                     // Handler login
  try {                                                                         // Try/catch principal
    const { email, password } = req.body || {};                                 // Lee body
    if (!email || !password) {                                                  // Validación básica
      const err = new Error('Email y password son requeridos');                 // Error semántico
      err.status = 400;                                                         // 400 Bad Request
      throw err;                                                                // Corta flujo
    }

    const user = await User.findOne({ email })                                  // Busca por email
      .collation({ locale: 'es', strength: 2 })                                 // Insensible a mayúsculas/acentos
      .exec();                                                                  // Ejecuta consulta

    if (!user) {                                                                // No encontrado
      const err = new Error('Credenciales inválidas');                          // Mensaje genérico
      err.status = 401;                                                         // 401 Unauthorized
      throw err;                                                                // No revelar existencia
    }

    try {                                                                       // Verifica lockout activo
      user.assertNotLocked();                                                   // Lanza si bloqueado
    } catch (e) {                                                               // Captura bloqueo
      if (e?.code === 'ACCOUNT_LOCKED') {                                       // Código semántico
        return res.status(423).json({ ok: false, message: e.message });         // 423 Locked
      }
      throw e;                                                                  // Propaga otros errores
    }

    const ok = await bcrypt.compare(String(password), String(user.password));   // Compara hash
    if (!ok) {                                                                  // Password incorrecta
      await user.registerFailedLogin();                                         // Incrementa intentos / bloquea
      if (user.isLocked) {                                                      // Si disparó bloqueo ahora
        return res.status(423).json({ ok: false, message: 'Cuenta bloqueada temporalmente. Intenta más tarde.' });
      }
      const err = new Error('Credenciales inválidas');                          // 401 genérico
      err.status = 401;
      throw err;
    }

    await user.resetLoginCounters();                                            // Limpia métricas tras éxito

    const accessToken = signAccessToken({ id: user._id, role: user.role });     // Firma Access JWT

    const rtValue   = generateRefreshTokenValue();                              // Genera refresh claro
    const rtHash    = hashRefreshToken(rtValue);                                // Hash para BD
    const expiresAt = getRefreshExpiryDate();                                   // Expiración
    const meta      = getClientMeta(req);                                       // IP y UA

    await RefreshToken.create({                                                 // Inserta RT en BD
      user: user._id,                                                           // Dueño
      tokenHash: rtHash,                                                        // Hash
      expiresAt,                                                                // Vencimiento
      createdAt: new Date(),                                                    // Marca de creación
      createdByIp: meta.ip,                                                     // IP creadora
      userAgent: meta.userAgent                                                 // UA creador
    });

    setRefreshCookie(res, rtValue);                                             // Set-Cookie (HttpOnly)

    return res.status(200).json({                                               // Respuesta de éxito
      token_type: 'Bearer',                                                     // Bearer
      access_token: accessToken,                                                // JWT
      expires_in: process.env.JWT_ACCESS_EXPIRES || '15m',                      // Vida aprox
      user: sanitizeUser(user),                                                 // Proyección segura
    });
  } catch (err) {                                                               // Manejo de error
    if (err?.code === 'ACCOUNT_LOCKED') {                                       // Bloqueo activo
      return res.status(423).json({ ok: false, message: err.message });         // 423 Locked
    }
    if (err?.status) {                                                          // Errores 4xx previstos
      return res.status(err.status).json({ ok: false, message: err.message });  // Responder sin stack
    }
    return next(err);                                                           // 5xx → handler global
  }
};

// -----------------------------------------------------------------------------
// POST /auth/refresh
// -----------------------------------------------------------------------------
/**
 * Requiere cookie HttpOnly con el refresh actual.
 * Flujo:
 *  - Leer cookie → si falta: 401 + clear cookie (sin throw).
 *  - Buscar en BD por hash, no revocado y sin expirar → si falla: 401 + clear cookie (sin throw).
 *  - Rotar: crear nuevo RT, marcar el actual como revoked + replacedBy.
 *  - Emitir nuevo access y setear nueva cookie.
 */
exports.refresh = async (req, res, next) => {                                   // Handler refresh
  try {                                                                         // Try/catch principal
    const cookieName = getRefreshCookieName();                                   // Nombre cookie
    const rtClear = req.cookies?.[cookieName];                                   // Valor claro desde cookie
    if (!rtClear) {                                                              // Si no hay cookie
      clearRefreshCookie(res);                                                   // Limpia por si acaso
      return res.status(401).json({ ok: false, message: 'Refresh token ausente' }); // 401 directo
    }

    const rtHash = hashRefreshToken(rtClear);                                    // Hash para lookup
    const now = new Date();                                                      // Timestamp

    const current = await RefreshToken.findOne({                                 // Busca RT válido
      tokenHash: rtHash,                                                         // Coincide hash
      revokedAt: null,                                                           // No revocado
      expiresAt: { $gt: now }                                                    // No expirado
    }).populate('user', 'email role firstName lastName');                        // Carga usuario

    if (!current || !current.user) {                                             // RT inválido/huérfano
      clearRefreshCookie(res);                                                   // Limpia cookie
      return res.status(401).json({ ok: false, message: 'Refresh token inválido o expirado' }); // 401 directo
    }

    const meta = getClientMeta(req);                                             // IP/UA cliente
    const newValue   = generateRefreshTokenValue();                               // Nuevo valor claro
    const newHash    = hashRefreshToken(newValue);                                // Hash nuevo
    const newExpires = getRefreshExpiryDate();                                    // Nueva expiración

    const replacement = await RefreshToken.create({                               // Crea RT reemplazo
      user: current.user._id,                                                    // Mismo usuario
      tokenHash: newHash,                                                        // Hash
      expiresAt: newExpires,                                                     // Vencimiento
      createdAt: now,                                                            // Creado ahora
      lastUsedAt: now,                                                           // (opcional) primera “uso”
      createdByIp: meta.ip,                                                      // IP
      userAgent: meta.userAgent                                                  // UA
    });

    current.revokedAt  = now;                                                    // Marca actual revocado
    current.replacedBy = replacement._id;                                        // Enlaza reemplazo
    current.revokedByIp= meta.ip;                                                // IP que revoca
    await current.save();                                                        // Persiste cambios

    const accessToken = signAccessToken({                                        // Firma nuevo access
      id: current.user._id,                                                      // _id usuario
      role: current.user.role                                                    // Rol
    });

    setRefreshCookie(res, newValue);                                             // Set-Cookie con RT nuevo

    return res.status(200).json({                                                // Respuesta 200
      token_type: 'Bearer',                                                      // Bearer
      access_token: accessToken,                                                 // JWT nuevo
      expires_in: process.env.JWT_ACCESS_EXPIRES || '15m',                       // Vida aprox
      user: sanitizeUser(current.user),                                          // Usuario saneado
    });
  } catch (err) {                                                                // Errores inesperados
    return next(err);                                                            // 5xx → handler global
  }
};

// -----------------------------------------------------------------------------
// POST /auth/logout
// -----------------------------------------------------------------------------
/**
 * Requiere cookie HttpOnly con el refresh actual.
 * Efecto:
 *  - Revoca (si existe en BD) el refresh del cliente.
 *  - Limpia cookie.
 */
exports.logout = async (req, res, next) => {                                     // Handler logout
  try {                                                                          // Try/catch
    const cookieName = getRefreshCookieName();                                   // Nombre cookie
    const rtClear = req.cookies?.[cookieName];                                   // Lee cookie
    if (rtClear) {                                                               // Si hay valor
      const rtHash = hashRefreshToken(rtClear);                                  // Hash para lookup
      const doc = await RefreshToken.findOne({ tokenHash: rtHash, revokedAt: null }); // Busca activo
      if (doc) {                                                                 // Si existe
        doc.revokedAt = new Date();                                              // Marca revocado
        doc.revokedByIp = getClientMeta(req).ip;                                 // IP que revoca
        await doc.save();                                                        // Persiste
      }
    }
    clearRefreshCookie(res);                                                     // Limpia cookie
    return res.status(200).json({ ok: true, message: 'Sesión cerrada' });       // OK
  } catch (err) {                                                                // Error
    return next(err);                                                            // 5xx → handler global
  }
};

// -----------------------------------------------------------------------------
// POST /auth/logout-all
// -----------------------------------------------------------------------------
/**
 * Requiere Access JWT (middleware previo).
 * Efecto:
 *  - Revoca TODOS los refresh tokens activos del usuario.
 *  - Limpia cookie local.
 */
exports.logoutAll = async (req, res, next) => {                                  // Handler logout-all
  try {                                                                          // Try/catch
    const uid = req.user?.id || req.user?._id;                                   // Id del usuario (del JWT)
    if (!uid) {                                                                  // Falta usuario
      const err = new Error('No autenticado');                                   // Semántico
      err.status = 401;                                                          // 401
      throw err;                                                                 // Corta
    }
    await RefreshToken.updateMany(                                               // Revoca en masa
      { user: uid, revokedAt: null },                                            // RT activos del usuario
      { $set: { revokedAt: new Date(), revokedByIp: getClientMeta(req).ip } }    // Marca revocados
    );
    clearRefreshCookie(res);                                                     // Limpia cookie local
    return res.status(200).json({ ok: true, message: 'Sesiones cerradas' });    // OK
  } catch (err) {                                                                // Error
    return next(err);                                                            // 5xx → handler global
  }
};
