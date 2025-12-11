// File: BackEnd/src/modules/audit/routes/auditoria.rutas.js
// Description: Rutas HTTP para consultar los registros de auditoría del sistema.
//              Exponen un endpoint sólo de lectura, protegido por autenticación
//              y restringido al rol "admin" mediante middleware y lógica en el
//              controlador.

// Importa Express para crear un router modular.
const express = require('express');                           // Importa el módulo express
const router = express.Router();                              // Crea una instancia de router de Express

// Importa el controlador de auditoría.
const { obtenerAuditLogs } = require('../controllers/auditoria.controlador'); 
// Función que devuelve los logs de auditoría

// Importa el middleware de autenticación (verifica el token JWT).
const auth = require('../../../core/middlewares/autenticacion.middleware');         
// Middleware que valida el token y rellena req.user

// Importa el middleware de autorización por roles.
// Se usa como defensa en profundidad para garantizar que sólo admin accede a estas rutas.
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); 
// Middleware que permite sólo ciertos roles

/**
 * Rutas para los registros de auditoría. Sólo lectura.
 *
 * Base sugerida en server.js:
 *   app.use('/api/auditlogs', auditRoutes);
 *
 * Endpoints resultantes:
 *   GET /api/auditlogs
 *     - Requiere autenticación (JWT válido).
 *     - Sólo usuarios con rol "admin" pueden acceder.
 *     - Devuelve la lista de logs de auditoría ordenados por fecha.
 */

// Ruta GET para listar todos los registros de auditoría.
// Middlewares en orden:
//   1) auth           → verifica el token y coloca el usuario en req.user.
//   2) authorizeRoles → asegura que el rol sea "admin".
//   3) obtenerAuditLogs → ejecuta la lógica de negocio (consulta en base de datos).
router.get(
  '/',                                                        // Ruta relativa: /api/auditlogs/
  auth,                                                       // Primero: autenticación obligatoria
  authorizeRoles(['admin']),                                  // Segundo: sólo usuarios admin pueden continuar
  obtenerAuditLogs                                            // Tercero: controlador que devuelve los logs
);

// Exporta el router para que pueda ser montado en server.js con app.use(...)
module.exports = router;                                      // Exporta el router como módulo CommonJS
