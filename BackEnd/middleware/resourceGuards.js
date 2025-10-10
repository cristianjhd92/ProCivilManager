// File: BackEnd/middleware/resourceGuards.js                                      // Ruta del archivo
// Descripción: Guardas de recursos basadas en ownership/roles.                    // Propósito del módulo
// Permite el acceso si el usuario tiene alguno de los roles permitidos            // Criterio 1: rol
// o si es el propietario (owner) del proyecto indicado en el parámetro :id.       // Criterio 2: ownership

const mongoose = require('mongoose');                                              // Importa mongoose para validar ObjectId
const Proyectos = require('../models/Proyectos');                                  // Modelo Proyectos para consultar el owner

// allowOwnerOrRoles('admin','lider de obra')                                       // Ejemplo de uso en rutas
// Devuelve un middleware que autoriza por rol o por propiedad del recurso         // Firma general
const allowOwnerOrRoles = (...rolesPermitidos) => {                                // Factory de middleware (recibe 0..n roles)
  return async (req, res, next) => {                                               // Middleware asíncrono para Express
    try {                                                                          // Manejo de errores
      const user = req.user;                                                       // Usuario inyectado por authMiddleware
      if (!user) {                                                                 // Si no existe (ruta sin auth)
        return res.status(401).json({ message: 'No autorizado' });                 // 401 → requiere autenticación
      }

      // Si el rol del usuario está entre los permitidos, autoriza inmediatamente   // Bypass por rol
      if (rolesPermitidos.includes(user.role)) {                                   // Comprueba el rol actual del usuario
        return next();                                                             // Tiene rol suficiente → continúa
      }

      // Si no tiene rol permitido, verificamos propiedad del recurso               // Rama de ownership
      const { id } = req.params;                                                   // Extrae el :id de la ruta (id del proyecto)
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {                           // Valida presencia y formato de ObjectId
        return res.status(400).json({ message: 'ID de proyecto inválido' });       // 400 → parámetro inválido
      }

      const proyecto = await Proyectos                                             // Consulta el proyecto por ID
        .findById(id)                                                              // Busca el documento
        .select('owner');                                                          // Solo necesitamos el campo owner
      if (!proyecto) {                                                             // Si no existe
        return res.status(404).json({ message: 'Proyecto no encontrado' });        // 404 → no existe el recurso
      }

      const usuarioId = String(user.id || user._id);                               // Normaliza id del usuario a string
      const ownerId = String(proyecto.owner);                                      // Normaliza id del owner a string

      if (usuarioId !== ownerId) {                                                 // Compara igualdad de owner
        return res.status(403).json({                                              // Si no coincide → prohibido
          message: 'No tienes permisos para modificar este proyecto'               // Mensaje consistente
        });
      }

      return next();                                                               // Es el owner → autoriza
    } catch (err) {                                                                // Captura errores inesperados
      console.error('Error en allowOwnerOrRoles:', err);                           // Log técnico para diagnóstico
      return res.status(500).json({ message: 'Error de autorización' });           // 500 genérico
    }                                                                              // Fin catch
  };                                                                               // Fin del middleware retornado
};                                                                                 // Fin de la factory allowOwnerOrRoles

module.exports = { allowOwnerOrRoles };                                            // Exporta el guard para uso en rutas
