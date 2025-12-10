// File: BackEnd/src/modules/reports/routes/reporte.rutas.js
// Description: Rutas HTTP para generar reportes PDF de estadísticas
//              de proyectos en ProCivil Manager (PCM). Actualmente
//              expone un endpoint para descargar un reporte global
//              de indicadores de proyectos en formato PDF.

// Importa Express para crear el router HTTP.
const express = require('express');                                       // Importa Express
const router = express.Router();                                          // Crea una instancia de Router para agrupar rutas de reportes

// Importa la función del controlador que genera el PDF de estadísticas de proyectos.
const { generarReporteEstadisticas } = require('../controllers/reporte.controlador'); // Controlador de reportes

// Middleware de autenticación (valida token JWT y rellena req.user).
const authMiddleware = require('../../../core/middlewares/autenticacion.middleware'); // Middleware de autenticación

// Middleware de autorización (restringe acceso según rol).
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); // Middleware de autorización por roles

/**
 * Rutas de reportes de estadísticas (PDF) para PCM.
 *
 * Prefijo recomendado en server.js:
 *   const reporteRoutes = require('./src/modules/reports/routes/reporte.rutas');
 *   app.use('/api/reportes', reporteRoutes);
 *
 * URL resultante:
 *   GET /api/reportes/stats/pdf  →  Descarga el PDF con estadísticas globales.
 */

// 📊 Generar y descargar reporte PDF de estadísticas de proyectos
router.get(
  '/stats/pdf',                                                           // Ruta relativa: /api/reportes/stats/pdf
  authMiddleware,                                                         // 1️⃣ Exige usuario autenticado (token JWT válido)
  authorizeRoles(['admin', 'lider de obra']),                             // 2️⃣ Restricción de roles: admin y líder de obra
  generarReporteEstadisticas                                              // 3️⃣ Ejecuta el controlador que construye y envía el PDF
);

// Exporta el router para que pueda ser montado en server.js
module.exports = router;                                                  // Exporta las rutas de reportes como módulo CommonJS
