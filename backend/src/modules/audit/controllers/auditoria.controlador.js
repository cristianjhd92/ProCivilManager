// File: BackEnd/src/modules/audit/controllers/auditoria.controlador.js
// Description: Controlador para acceder a los registros de auditoría del sistema.
//              Sólo permite que usuarios con rol "admin" consulten el historial
//              de acciones. Devuelve los registros ordenados por fecha de creación
//              descendente y con información básica del usuario asociado a cada
//              acción (nombre, correo y rol).

const AuditLog = require('../models/auditoria.modelo');      // Modelo de auditoría (acciones registradas en el sistema)

/**
 * Obtener todos los registros de auditoría.
 *
 * Requisitos:
 *  - La ruta debe estar protegida por authMiddleware para que req.user exista.
 *  - Solo usuarios con rol "admin" pueden acceder a este recurso.
 *
 * Respuesta:
 *  - 200 OK: devuelve un arreglo de logs de auditoría (JSON).
 *  - 401: cuando el usuario no está autenticado.
 *  - 403: cuando el usuario autenticado no tiene rol admin.
 *  - 500: error interno del servidor al consultar la base de datos.
 */
exports.obtenerAuditLogs = async (req, res) => {
  try {
    // ✅ Verificación defensiva: asegurarnos de que req.user exista
    //    Esto asume que authMiddleware ya decodificó el token y colocó el usuario en req.user.
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error:
          'No autenticado. Debes iniciar sesión para acceder a los registros de auditoría.',
      });
    }

    const userRole = req.user.role;                             // Rol del usuario autenticado (admin, líder de obra, cliente, etc.)

    // 🔐 Solo los administradores pueden ver el historial de auditoría
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permiso para ver los registros de auditoría.',
      });
    }

    // 🔎 Consulta de los registros de auditoría:
    //  - find() sin filtro → trae todos los registros.
    //  - sort({ createdAt: -1 }) → ordena del más reciente al más antiguo.
    //  - populate('user', ...) → añade datos básicos del usuario que generó cada registro.
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })                               // Orden descendente por fecha de creación
      .populate('user', 'firstName lastName email role');    // Trae campos básicos del usuario referenciado

    // ✅ Devolvemos directamente el arreglo de logs
    return res.status(200).json(logs);
  } catch (error) {
    // Log de error para diagnóstico en consola del servidor
    console.error('Error al obtener logs de auditoría:', error);

    // Respuesta genérica al cliente
    return res.status(500).json({
      error: 'Error al obtener logs de auditoría.',
    });
  }
};
