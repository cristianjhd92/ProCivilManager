// File: BackEnd/middleware/authMiddleware.js                                      // Ruta del archivo
// Descripción: Middleware de autenticación JWT y autorización por roles.         // Propósito general
// - Extrae y verifica el token Bearer desde el header Authorization.             // Origen del token
// - Verifica el JWT con utils/jwt.verifyAccessToken (payload: { sub, role }).    // Fuente de verdad (helpers centralizados)
// - Carga el usuario desde BD para asegurar que aún exista.                      // Integridad de sesión
// - Inyecta req.user = { id, email, role, name? }.                               // Contexto para handlers
// - Exporta helper requireRole(...roles) para proteger rutas por rol.            // Autorización por rol
// Notas:
// - El modelo User usa firstName/lastName, no "name": aquí construimos name opcionalmente. // Alineación con tu esquema

const User = require('../models/User');                                           // Importa el modelo User (para verificar existencia)
const { verifyAccessToken } = require('../utils/jwt');                            // Importa helper para validar Access JWT

// -----------------------------------------------------------------------------
// Extrae token del encabezado Authorization: Bearer <token> (case-insensitive)   // Utilidad de parsing
// -----------------------------------------------------------------------------
function extractBearerToken(req) {                                                // Declara función extractora
  const authHeader = req.headers?.authorization || '';                            // Lee header Authorization (o '')
  const match = authHeader.match(/^Bearer\s+(.+)$/i);                             // Busca patrón "Bearer <token>"
  return match ? match[1] : null;                                                 // Devuelve el token o null si no coincide
}                                                                                 // Fin extractBearerToken

// -----------------------------------------------------------------------------
// Middleware principal de autenticación                                           // Verifica JWT y carga usuario
// -----------------------------------------------------------------------------
const authMiddleware = async (req, res, next) => {                                // Declara middleware async
  try {                                                                           // Manejo de errores
    if (!process.env.JWT_SECRET) {                                                // Valida config mínima (secreto JWT)
      return res.status(500).json({                                               // Responde 500 si falta secreto
        message: 'Config del servidor incompleta (JWT_SECRET faltante)'           // Mensaje explícito
      });                                                                          // Fin respuesta
    }                                                                              // Fin if

    const token = extractBearerToken(req);                                        // Intenta extraer Bearer token del header
    if (!token) {                                                                 // Si no hay token → no autenticado
      return res.status(401).json({ message: 'Token no provisto' });              // 401 Unauthorized
    }                                                                              // Fin if

    let payload;                                                                   // Variable para payload verificado
    try {                                                                          // Intenta verificar
      payload = verifyAccessToken(token);                                          // Verifica firma, exp, iss/aud (si aplica)
    } catch (_err) {                                                               // Si falla verificación/expiración
      return res.status(401).json({ message: 'Token inválido o expirado' });      // 401 con mensaje estándar
    }                                                                              // Fin catch verificación

    const userId = String(payload.sub || '');                                      // Obtiene subject (id de usuario) del payload
    if (!userId) {                                                                 // Si el token no trae sub válido
      return res.status(401).json({ message: 'Token inválido (sin id de usuario)' });// 401 por payload mal formado
    }                                                                              // Fin if

    const user = await User.findById(userId)                                       // Busca usuario por id en BD
      .select('email role firstName lastName');                                     // Proyecta campos mínimos necesarios
    if (!user) {                                                                   // Si no existe (borrado/inactivo)
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });// 401 sesión inválida
    }                                                                              // Fin if

    const name = [user.firstName, user.lastName]                                   // Construye nombre completo opcional
      .filter(Boolean)                                                             // Filtra valores falsy
      .join(' ')                                                                   // Une con espacio
      .trim() || undefined;                                                        // Si queda vacío → undefined

    req.user = {                                                                   // Inyecta identidad en la request
      id: String(user._id),                                                        // id del usuario como string
      email: user.email,                                                           // email normalizado
      role: user.role,                                                             // rol actual
      name                                                                          // nombre completo (opcional)
    };                                                                             // Fin req.user

    return next();                                                                 // Continúa al siguiente middleware/handler
  } catch (error) {                                                                // Captura errores inesperados
    console.error('authMiddleware error:', error);                                 // Log técnico
    return res.status(500).json({ message: 'Error de autenticación' });            // 500 genérico
  }                                                                                // Fin catch
};                                                                                 // Fin authMiddleware

// -----------------------------------------------------------------------------
// Helper de autorización por rol: usar después de authMiddleware                 // requireRole(...)
// Ejemplo: router.get('/admin', authMiddleware, requireRole('admin'), handler)  // Uso típico
// -----------------------------------------------------------------------------
const requireRole = (...allowedRoles) => {                                         // Fábrica de middleware de roles
  return (req, res, next) => {                                                     // Devuelve middleware concreto
    if (!req.user?.role) {                                                         // Si no hay usuario/rol en req
      return res.status(403).json({ message: 'Acceso denegado' });                 // 403 Forbidden
    }                                                                              // Fin if
    if (!allowedRoles.includes(req.user.role)) {                                   // Si su rol no está permitido
      return res.status(403).json({ message: 'No tienes permisos para esta operación' }); // 403
    }                                                                              // Fin if
    return next();                                                                  // Autorizado → pasa
  };                                                                               // Fin middleware por rol
};                                                                                 // Fin requireRole

// -----------------------------------------------------------------------------
// Exportaciones                                                                  // API del módulo
// -----------------------------------------------------------------------------
module.exports = {                                                                 // Exporta símbolos
  authMiddleware,                                                                  // Middleware principal (alias requireAuth)
  requireAuth: authMiddleware,                                                     // Alias por consistencia en rutas
  requireRole                                                                      // Helper de autorización por rol
};                                                                                 // Fin export
