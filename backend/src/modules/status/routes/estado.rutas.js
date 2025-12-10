// File: BackEnd/src/modules/status/routes/estado.rutas.js
// Description: Rutas HTTP para exponer las estadísticas agregadas de proyectos
//              de ProCivil Manager (PCM). Estas métricas se consumen desde el
//              dashboard (total de proyectos, presupuesto, distribución por
//              estado/tipo, proyectos mensuales, proyectos recientes, etc.).

// Importa Express para poder crear un router modular de rutas HTTP.
const express = require('express');                                       // Importa el módulo express.
const router = express.Router();                                          // Crea una nueva instancia de Router.

// Importa los controladores que calculan las estadísticas y proyectos recientes.
const {
  getStatsOverview,                                                       // Controlador para resumen global de estadísticas.
  getProyectosRecientes,                                                  // Controlador para proyectos recientes.
} = require('../controllers/estado.controlador');

// Importa el middleware de autenticación basado en JWT (rellena req.user si el token es válido).
const auth = require('../../../core/middlewares/autenticacion.middleware');          // Middleware que valida el token.

// Importa el middleware de autorización por rol para restringir acceso según el perfil.
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); // Middleware para limitar por rol.

/**
 * Rutas de estadísticas de proyectos para el dashboard.
 *
 * Prefijo típico en server.js:
 *   app.use('/api/stats', statsRoutes);
 *
 * Endpoints resultantes:
 *   GET /api/stats/overview  → Resumen global de estadísticas de proyectos.
 *   GET /api/stats/recent    → Últimos proyectos creados (para el dashboard).
 */

// 🔹 Resumen global de estadísticas para el dashboard.
router.get(
  '/overview',                                                            // Ruta relativa: /overview (con prefijo /api/stats).
  auth,                                                                   // Primero: exige que el usuario esté autenticado vía JWT.
  authorizeRoles(['admin', 'lider de obra', 'cliente']),                 // Segundo: permite admin, líder de obra y cliente.
  getStatsOverview                                                        // Tercero: ejecuta la lógica del controlador que arma las métricas.
);

// 🔹 Listado de proyectos recientes (últimos 5 creados).
router.get(
  '/recent',                                                              // Ruta relativa: /recent (con prefijo /api/stats).
  auth,                                                                   // Autenticación obligatoria.
  authorizeRoles(['admin', 'lider de obra', 'cliente']),                 // Mismos roles permitidos que overview.
  getProyectosRecientes                                                   // Controlador que devuelve los proyectos recientes.
);

// Exporta el router para poder montarlo en server.js (app.use('/api/stats', statsRoutes)).
module.exports = router;                                                  // Exporta el router en formato CommonJS.
