// File: BackEnd/routes/statsRoutes.js                                            // Ruta exacta (coincide con server.js -> app.use('/api/stats', statsRoutes))
// Descripción: Rutas de estadísticas (overview/agregados). Protegidas con JWT    // Propósito del módulo
// y roles para acceso sólo de personal interno (admin / líder de obra).          // Política de acceso

const express = require('express');                                               // Importa Express para crear el router
const router = express.Router();                                                  // Instancia un Router de Express

const { getStatsOverview } = require('../controllers/statsController');           // Importa el handler que calcula el overview

const { authMiddleware, requireRole } = require('../middleware/authMiddleware');  // Middlewares: autenticación y autorización por rol

// -----------------------------------------------------------------------------
// GET /api/stats/overview                                                         // Ruta final (montada bajo /api/stats en server.js)
// Devuelve métricas de alto nivel (totales, distribuciones, etc.)                 // Descripción del endpoint
// Requiere: JWT válido + rol 'admin' o 'lider de obra'                            // Política de acceso
// -----------------------------------------------------------------------------
router.get(                                                                       // Define ruta GET
  '/overview',                                                                    // Endpoint relativo dentro del prefijo /api/stats
  authMiddleware,                                                                 // Verifica JWT y adjunta req.user
  requireRole('admin', 'lider de obra'),                                          // Restringe a roles autorizados
  getStatsOverview                                                                // Controlador que responde con el resumen
);                                                                                 // Fin definición GET /overview

module.exports = router;                                                          // Exporta el router para uso en server.js
