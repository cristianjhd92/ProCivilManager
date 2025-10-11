// File: BackEnd/middleware/authMiddleware.js                                      // Ruta del archivo
// Descripción: Middleware de autenticación JWT y autorización por roles.         // Propósito general
// - Extrae y verifica el token Bearer desde el header Authorization.             // Origen del token
// - Verifica el JWT con utils/jwt.verifyAccessToken (payload: { sub, role }).    // Fuente de verdad (helpers centralizados)
// - Carga el usuario desde BD para asegurar que aún exista.                      // Integridad
// - Inyecta req.user = { id, email, role, name? }.                               // Contexto para handlers
// - Exporta helper requireRole(...roles) para proteger rutas por rol.            // Autorización por rol

const User = require('../models/User');                                           // Modelo User para validar existencia
const { verifyAccessToken } = require('../utils/jwt');                            // Helper para verificar Access JWT (HS256, exp, iss, aud)

// -----------------------------------------------------------------------------
// Extrae token del encabezado Authorization: Bearer <token>
// -----------------------------------------------------------------------------
function extractBearerToken(req) {                                                // Declara función auxiliar de extracción
  const authHeader = req.headers?.authorization || '';                            // Lee cabecera Authorization (o cadena vacía)
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;               // Si no empieza por "bearer ", retorna null
  return authHeader.split(' ')[1] || null;                                        // Devuelve la segunda parte como token (o null)
}                                                                                 // Cierra extractBearerToken

// -----------------------------------------------------------------------------
// Middleware principal de autenticación
// -----------------------------------------------------------------------------
const authMiddleware = async (req, res, next) => {                                // Declara middleware async
  try {                                                                           // Abre try para manejo de errores
    if (!process.env.JWT_SECRET) {                                                // Si falta la clave secreta en el entorno
      return res.status(500).json({                                               // Responde 500 (configuración inválida)
        message: 'Config del servidor incompleta (JWT_SECRET faltante)'           // Mensaje de error
      });                                                                          // Cierra json
    }                                                                              // Cierra if JWT_SECRET

    const token = extractBearerToken(req);                                        // Intenta extraer token Bearer del header
    if (!token) {                                                                 // Si no hay token
      return res.status(401).json({ message: 'No token provided' });              // 401 No autorizado por ausencia de token
    }                                                                              // Cierra if !token

    let payload;                                                                   // Variable para el payload decodificado
    try {                                                                          // Intenta verificar el token
      payload = verifyAccessToken(token);                                          // Verifica firma/exp/issuer/audience via utils/jwt
    } catch (err) {                                                                // Si falla verificación/expiración
      return res.status(401).json({ message: 'Token inválido o expirado' });      // 401 Token no válido/expirado
    }                                                                              // Cierra catch verify

    const userId = String(payload.sub || '');                                      // Obtiene id (subject) del token (usamos "sub" por estándar)
    if (!userId) {                                                                 // Si el payload carece de subject
      return res.status(401).json({ message: 'Token inválido (sin id de usuario)' });// 401 Payload mal formado
    }                                                                              // Cierra if !userId

    const user = await User.findById(userId).select('email role name');            // Busca usuario y proyecta email/role/name
    if (!user) {                                                                   // Si no existe (borrado o inactivo)
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });// 401 Usuario inválido
    }                                                                              // Cierra if !user

    req.user = {                                                                   // Inyecta identidad normalizada en la request
      id: String(user._id),                                                        // id como string
      email: user.email,                                                           // email normalizado
      role: user.role,                                                             // rol actual
      name: user.name || undefined                                                 // (opcional) nombre si existe en el esquema
    };                                                                             // Cierra objeto req.user

    return next();                                                                 // Continúa con el siguiente middleware/handler
  } catch (error) {                                                                // Captura errores inesperados
    console.error('authMiddleware error:', error);                                 // Log técnico del error
    return res.status(500).json({ message: 'Error de autenticación' });            // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra authMiddleware

// -----------------------------------------------------------------------------
// Helper de autorización por rol: usar después de authMiddleware
// Ejemplo: router.get('/admin', authMiddleware, requireRole('admin'), handler)
// -----------------------------------------------------------------------------
const requireRole = (...allowedRoles) => {                                         // Declara fábrica de middleware por roles
  return (req, res, next) => {                                                     // Middleware resultante
    if (!req.user?.role) {                                                         // Si no hay usuario/rol en req
      return res.status(403).json({ message: 'Acceso denegado' });                 // 403 Prohibido (no autenticado o sin rol)
    }                                                                              // Cierra if sin rol
    if (!allowedRoles.includes(req.user.role)) {                                   // Si su rol no está permitido
      return res.status(403).json({ message: 'No tienes permisos para esta operación' }); // 403 Prohibido (rol insuficiente)
    }                                                                              // Cierra if rol no permitido
    return next();                                                                  // Autorizado → continúa
  };                                                                               // Cierra función middleware
};                                                                                 // Cierra requireRole

// -----------------------------------------------------------------------------
// Exportaciones
// -----------------------------------------------------------------------------
module.exports = {                                                                 // Exporta API del módulo
  authMiddleware,                                                                  // Middleware principal (nombre original)
  requireAuth: authMiddleware,                                                     // Alias para consistencia en rutas (requireAuth)
  requireRole                                                                      // Helper de autorización por rol
};                                                                                 // Fin export
