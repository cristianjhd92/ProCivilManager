// File: BackEnd/routes/ProyectoRoutes.js                                         // Ruta exacta (coincide con server.js)
// Descripción: Rutas de Proyectos protegidas con JWT y autorización por rol       // Propósito del módulo
// u ownership (para update/delete acepta admin/líder o owner del proyecto).       // Regla de acceso

const express = require('express');                                                // Importa express
const router = express.Router();                                                   // Crea instancia de router

// Controladores de proyectos                                                       // Import de handlers
const {
  getProyectos,                                                                    // GET lista completa
  crearProyecto,                                                                   // POST crear
  getProyectosUsuario,                                                             // GET del owner autenticado
  getProyectosRecientes,                                                           // GET recientes
  updateProyectoById,                                                              // PATCH/PUT actualizar
  deleteProyectoById                                                               // DELETE eliminar
} = require('../controllers/ProyectosController');                                 // Ruta a controladores

// Middlewares de auth/roles                                                        // Import de seguridad
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');   // JWT + roles
const { allowOwnerOrRoles } = require('../middleware/resourceGuards');             // Permite admin/líder o owner

// -----------------------------------------------------------------------------
// Políticas sugeridas:                                                            // Documentación
// - Listar TODOS: admin / líder de obra.                                          // GET /
// - Crear: cualquier usuario autenticado.                                          // POST /
// - Mis proyectos: cualquier usuario autenticado.                                  // GET /mis-proyectos
// - Recientes: admin / líder de obra.                                             // GET /recientes
// - Update/Delete: admin / líder de obra O el owner del proyecto.                 // PATCH/PUT/DELETE /:id
// -----------------------------------------------------------------------------

// GET /proyectos — Lista completa (protegido + roles)
router.get(
  '/',                                                                             // Endpoint base
  authMiddleware,                                                                  // Requiere JWT válido
  requireRole('admin', 'lider de obra'),                                           // Solo admin o líder de obra
  getProyectos                                                                     // Handler
);                                                                                 // Fin GET /

// GET /proyectos/recientes — Últimos 5 (protegido + roles)
router.get(
  '/recientes',                                                                    // Endpoint /recientes
  authMiddleware,                                                                  // Requiere JWT válido
  requireRole('admin', 'lider de obra'),                                           // Solo admin o líder de obra
  getProyectosRecientes                                                            // Handler
);                                                                                 // Fin GET /recientes

// GET /proyectos/mis-proyectos — Proyectos del owner autenticado
router.get(
  '/mis-proyectos',                                                                // Endpoint /mis-proyectos
  authMiddleware,                                                                  // Requiere JWT válido
  getProyectosUsuario                                                              // Handler
);                                                                                 // Fin GET /mis-proyectos

// POST /proyectos — Crear proyecto (cualquier autenticado)
router.post(
  '/',                                                                             // Endpoint POST /
  authMiddleware,                                                                  // Requiere JWT válido
  // requireRole('admin', 'lider de obra', 'cliente'),                             // (Opcional) si quisieras whitelistear roles
  crearProyecto                                                                    // Handler
);                                                                                 // Fin POST /

// (Alias legacy) POST /proyectos/crear — si el front histórico lo usa
router.post(
  '/crear',                                                                        // Alias /crear
  authMiddleware,                                                                  // Requiere JWT válido
  crearProyecto                                                                    // Handler
);                                                                                 // Fin POST /crear

// PATCH /proyectos/:id — Actualización parcial
router.patch(
  '/:id',                                                                          // Endpoint con :id
  authMiddleware,                                                                  // Requiere JWT válido (inyecta req.user)
  allowOwnerOrRoles('admin', 'lider de obra'),                                     // Permite admin/líder O dueño del proyecto
  updateProyectoById                                                               // Handler
);                                                                                 // Fin PATCH /:id

// (Alias) PUT /proyectos/:id — Compatibilidad si el front usa PUT
router.put(
  '/:id',                                                                          // Mismo endpoint con PUT
  authMiddleware,                                                                  // Requiere JWT válido
  allowOwnerOrRoles('admin', 'lider de obra'),                                     // Permite admin/líder O dueño del proyecto
  updateProyectoById                                                               // Handler
);                                                                                 // Fin PUT /:id

// DELETE /proyectos/:id — Eliminar proyecto
router.delete(
  '/:id',                                                                          // Endpoint con :id
  authMiddleware,                                                                  // Requiere JWT válido
  allowOwnerOrRoles('admin', 'lider de obra'),                                     // Permite admin/líder O dueño del proyecto
  deleteProyectoById                                                               // Handler
);                                                                                 // Fin DELETE /:id

// Exporta router
module.exports = router;                                                            // Export del router
