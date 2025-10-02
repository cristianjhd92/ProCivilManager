// File: BackEnd/middleware/authMiddleware.js
// Descripción: Middleware de autenticación JWT y autorización por roles.
// - Extrae y verifica el token Bearer.
// - Carga el usuario desde BD para asegurar existencia.
// - Inyecta req.user = { id, email, role }.
// - Incluye helper requireRole(...roles) para proteger rutas.

const jwt = require('jsonwebtoken');                            // JWT para verificar tokens
const User = require('../models/User');                         // Modelo User para validar existencia

// -----------------------------------------------------------------------------
// Extrae token del encabezado Authorization: Bearer <token>
// -----------------------------------------------------------------------------
function extractBearerToken(req) {                              // Función auxiliar para extraer token
  const authHeader = req.headers?.authorization || '';          // Lee el header (puede ser undefined)
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null; // Debe iniciar con "Bearer "
  return authHeader.split(' ')[1] || null;                      // Retorna la segunda parte (token)
}

// -----------------------------------------------------------------------------
// Middleware principal de autenticación
// -----------------------------------------------------------------------------
const authMiddleware = async (req, res, next) => {              // Middleware async
  try {
    // 1) Asegurar que exista la clave de firma
    if (!process.env.JWT_SECRET) {                              // Sin clave → configuración inválida
      return res.status(500).json({ message: 'Config del servidor incompleta (JWT_SECRET faltante)' });
    }

    // 2) Extraer token
    const token = extractBearerToken(req);                      // Obtiene token del header
    if (!token) {                                               // Si no hay token
      return res.status(401).json({ message: 'No token provided' });
    }

    // 3) Verificar token (limitar algoritmos por seguridad)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {     // Verifica firma y expiración
        algorithms: ['HS256']                                   // Restringe algoritmo esperado
      });
    } catch (err) {                                             // Token inválido/expirado
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    // 4) Cargar usuario de la BD para asegurar que sigue existiendo
    const userId = decoded.id || decoded._id;                   // Soporta payload con id/_id
    if (!userId) {                                              // Payload incompleto
      return res.status(401).json({ message: 'Token inválido (sin id de usuario)' });
    }

    const user = await User.findById(userId).select('email role'); // Carga email/role
    if (!user) {                                                // Usuario fue eliminado o no existe
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    // 5) Inyectar usuario normalizado en la request
    req.user = {                                                // Estandariza shape para controladores
      id: String(user._id),                                     // id como string
      email: user.email,                                        // email normalizado
      role: user.role                                           // rol actual
    };

    return next();                                              // Continúa a la ruta protegida
  } catch (error) {                                             // Errores inesperados
    console.error('authMiddleware error:', error);              // Log técnico
    return res.status(500).json({ message: 'Error de autenticación' });
  }
};

// -----------------------------------------------------------------------------
// Helper de autorización por rol: úsalo después de authMiddleware
// ej: router.get('/admin', authMiddleware, requireRole('admin'), handler)
// -----------------------------------------------------------------------------
const requireRole = (...allowedRoles) => {                      // Crea middleware por roles
  return (req, res, next) => {                                  // Middleware resultante
    if (!req.user?.role) {                                      // Si no hay usuario/rol
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    if (!allowedRoles.includes(req.user.role)) {                // Rol no permitido
      return res.status(403).json({ message: 'No tienes permisos para esta operación' });
    }
    return next();                                              // OK
  };
};

// -----------------------------------------------------------------------------
// Exportaciones
// -----------------------------------------------------------------------------
module.exports = { authMiddleware, requireRole };               // Exporta ambos
