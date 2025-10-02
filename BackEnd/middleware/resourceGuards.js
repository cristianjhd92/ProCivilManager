// File: BackEnd/middleware/resourceGuards.js                                   // Ruta del archivo
// Descripción: Guardas de recursos basadas en ownership/roles.                  // Propósito del módulo
// Permite acceso si el usuario tiene uno de los roles permitidos                // Resumen
// o si es el propietario (owner) del proyecto indicado en :id.                  // Alcance

const mongoose = require('mongoose');                                            // Importa mongoose para validar ObjectId
const Proyectos = require('../models/Proyectos');                                // Importa el modelo Proyectos para consultar owner

// Permite si el usuario tiene uno de los roles permitidos o si es owner del proyecto. // Descripción de la función
// Uso: allowOwnerOrRoles('admin','lider de obra')                                // Ejemplo de uso
const allowOwnerOrRoles = (...rolesPermitidos) => {                              // Define un factory de middleware con roles variables
  return async (req, res, next) => {                                             // Retorna el middleware asíncrono (Express)
    try {                                                                        // Manejo de errores con try/catch
      const user = req.user;                                                     // Toma el usuario inyectado por authMiddleware
      if (!user) return res.status(401).json({ message: 'No autorizado' });      // Si no hay usuario autenticado → 401

      // Si el rol del usuario está explícitamente permitido, pasa directo        // Comentario de intención
      if (rolesPermitidos.includes(user.role)) return next();                    // Bypass por rol permitido

      // Si no tiene rol permitido, validamos que sea el owner del recurso        // Comentario de intención
      const { id } = req.params;                                                 // Extrae el parámetro :id de la ruta
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {                         // Revisa que exista y sea un ObjectId válido
        return res.status(400).json({ message: 'ID de proyecto inválido' });     // Si no es válido → 400
      }

      const proyecto = await Proyectos.findById(id).select('owner');             // Busca el proyecto y solo trae el campo owner
      if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' }); // Si no existe → 404

      const usuarioId = String(user.id || user._id);                              // Normaliza el id del usuario (string)
      const ownerId = String(proyecto.owner);                                     // Normaliza el owner del proyecto (string)

      if (usuarioId !== ownerId) {                                               // Compara si el usuario es el owner
        return res.status(403).json({                                            // Si no lo es → 403 (forbidden)
          message: 'No tienes permisos para modificar este proyecto'              // Mensaje de error
        });
      }

      return next();                                                             // Es el owner (o ya estaba permitido por rol) → continúa
    } catch (err) {                                                              // Captura excepciones inesperadas
      console.error('Error en allowOwnerOrRoles:', err);                         // Log del error para diagnóstico
      return res.status(500).json({ message: 'Error de autorización' });         // Respuesta genérica 500
    }                                                                            // Fin catch
  };                                                                             // Fin del middleware retornado
};                                                                               // Fin de allowOwnerOrRoles

module.exports = { allowOwnerOrRoles };                                          // Exporta el guard para usarlo en las rutas
