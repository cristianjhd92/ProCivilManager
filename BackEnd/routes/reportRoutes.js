// File: BackEnd/routes/reportRoutes.js                                            // Ruta del archivo dentro del proyecto
// Descripción: Rutas para exportar estadísticas de proyectos en JSON, PDF y XLSX // Propósito del módulo
// Soporta filtros por query: ownerId, status, startDate, endDate, limit, skip     // Parámetros aceptados
// Política de acceso: requiere JWT y rol 'admin' o 'lider de obra'                // Seguridad aplicada

const express = require('express');                                               // Importa Express para crear rutas
const router = express.Router();                                                  // Crea un enrutador aislado

const {                                                                       // Importa handlers del controlador de reportes
  getStatsJson,                                                                // Devuelve estadísticas en JSON
  generateStatsReportPDF,                                                      // Genera PDF con métricas
  generateStatsReportExcel                                                     // Genera Excel (xlsx-populate)
} = require('../controllers/reportController');                                 // Ruta al controlador de reportes

const { authMiddleware, requireRole } = require('../middleware/authMiddleware'); // Middlewares: JWT y autorización por rol

// -----------------------------------------------------------------------------
// JSON crudo para dashboards/UI                                                  // Descripción del endpoint
// GET /api/reportes/estadisticas.json?status=planning&ownerId=<id>&...          // Ejemplo de uso (prefijo montado en server.js)
// Requiere: JWT + rol admin/lider de obra                                       // Política de acceso
// -----------------------------------------------------------------------------
router.get(                                                                      // Define ruta GET
  '/estadisticas.json',                                                          // Path relativo bajo /api/reportes
  authMiddleware,                                                                // Verifica y decodifica el JWT
  requireRole('admin', 'lider de obra'),                                         // Restringe a roles permitidos
  getStatsJson                                                                   // Handler que responde con JSON
);                                                                                // Fin GET /estadisticas.json

// -----------------------------------------------------------------------------
// PDF resumido (métricas, distribuciones, serie 12m, top owners)                 // Descripción
// GET /api/reportes/estadisticas.pdf?startDate=2025-01-01&endDate=2025-12-31     // Ejemplo de uso
// Requiere: JWT + rol admin/lider de obra                                       // Política de acceso
// -----------------------------------------------------------------------------
router.get(                                                                      // Define ruta GET
  '/estadisticas.pdf',                                                           // Path relativo para PDF
  authMiddleware,                                                                // JWT obligatorio
  requireRole('admin', 'lider de obra'),                                         // Sólo roles autorizados
  generateStatsReportPDF                                                         // Handler que streaméa el PDF
);                                                                                // Fin GET /estadisticas.pdf

// -----------------------------------------------------------------------------
// Excel con múltiples hojas (Resumen, Estado, Tipo, Prioridad, Mensual, Owners,  // Descripción
// Proyectos (muestra), Parámetros). Paginación de muestra con limit/skip.        // Detalle
// GET /api/reportes/estadisticas.xlsx?limit=200&skip=0                           // Ejemplo de uso
// Requiere: JWT + rol admin/lider de obra                                       // Política de acceso
// -----------------------------------------------------------------------------
router.get(                                                                      // Define ruta GET
  '/estadisticas.xlsx',                                                          // Path relativo para XLSX
  authMiddleware,                                                                // JWT obligatorio
  requireRole('admin', 'lider de obra'),                                         // Sólo roles autorizados
  generateStatsReportExcel                                                       // Handler que envía el XLSX
);                                                                                // Fin GET /estadisticas.xlsx

// -----------------------------------------------------------------------------
// Compatibilidad hacia atrás (legacy)                                            // Mantener clientes antiguos
// Antes: GET /api/reportes/stats/pdf → generateStatsReport (antiguo)             // Ruta previa
// Ahora apunta al nuevo generador de PDF                                         // Redirección interna
// -----------------------------------------------------------------------------
router.get(                                                                      // Define ruta GET
  '/stats/pdf',                                                                  // Alias legacy
  authMiddleware,                                                                // JWT obligatorio también en legacy
  requireRole('admin', 'lider de obra'),                                         // Roles autorizados
  generateStatsReportPDF                                                         // Reutiliza el generador nuevo
);                                                                                // Fin GET /stats/pdf

module.exports = router;                                                          // Exporta el enrutador
