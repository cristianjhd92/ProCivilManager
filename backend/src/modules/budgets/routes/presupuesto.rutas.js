// File: BackEnd/src/modules/budgets/routes/presupuesto.rutas.js
// Description: Definición de rutas HTTP para gestionar el presupuesto
//              de materiales por proyecto. Expone endpoints para crear/
//              actualizar el presupuesto y para consultarlo, protegiendo
//              el acceso mediante autenticación y roles (admin / líder).

const express = require('express');                                        // Importa Express para crear el router
const router = express.Router();                                           // Crea una instancia de router de Express

// Importa las funciones del controlador de presupuesto
// Nota: el archivo real se llama "presupuesto.controlador.js"
//       y expone las funciones createOrUpdatePresupuesto y getPresupuesto.
const {
  createOrUpdatePresupuesto,                                              // Controlador para crear o actualizar el presupuesto
  getPresupuesto                                                          // Controlador para obtener el presupuesto de un proyecto
} = require('../controllers/presupuesto.controlador');

const auth = require('../../../core/middlewares/autenticacion.middleware');       // Middleware de autenticación (valida JWT y rellena req.user)
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); // Middleware para verificar permisos según el rol

/**
 * Rutas para la gestión de presupuesto de materiales.
 *
 * Prefijo configurado en server.js:
 *   app.use('/api/presupuestos', presupuestoRoutes);
 *
 * Por lo tanto:
 *   POST /api/presupuestos/:proyectoId  → crear o actualizar presupuesto
 *   GET  /api/presupuestos/:proyectoId  → obtener presupuesto de un proyecto
 */

// 🟠 Crear o actualizar el presupuesto de un proyecto
// - Requiere usuario autenticado.
// - Solo usuarios con rol "admin" o "lider de obra" pueden modificar presupuestos.
router.post(
  '/:proyectoId',                                                         // URL con el id del proyecto como parámetro
  auth,                                                                   // Primero se valida el token JWT
  authorizeRoles(['admin', 'lider de obra']),                             // Luego se valida que el rol sea admin o líder de obra
  createOrUpdatePresupuesto                                               // Finalmente se ejecuta el controlador
);

// 🔵 Obtener el presupuesto de un proyecto
// - También protegido por autenticación y rol.
// - Si en el futuro quieres que el cliente pueda ver el presupuesto,
//   podrías añadir 'cliente' al arreglo de roles permitidos.
router.get(
  '/:proyectoId',                                                         // Misma ruta, pero método GET
  auth,                                                                   // Valida que el usuario esté autenticado
  authorizeRoles(['admin', 'lider de obra']),                             // Solo admin o líder de obra pueden consultar este recurso
  getPresupuesto                                                          // Controlador que devuelve el presupuesto + sumaDetalle
);

module.exports = router;                                                  // Exporta el router para usarlo en server.js
