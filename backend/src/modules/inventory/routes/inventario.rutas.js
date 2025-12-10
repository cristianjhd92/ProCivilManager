// File: BackEnd/src/modules/inventory/routes/inventario.rutas.js
// Description: Rutas HTTP para gestionar los movimientos de inventario
//              (entradas, salidas y ajustes) de materiales. Aplica
//              autenticación y control de roles para proteger las
//              operaciones según el perfil del usuario (admin / líder).
//              Se monta bajo el prefijo /api/movimientos en server.js.

const express = require('express');                                      // Importa Express para crear el router HTTP
const router = express.Router();                                         // Crea una instancia de Router para agrupar rutas relacionadas

// Controlador que contiene la lógica de negocio de los movimientos de inventario
const movimientoController = require('../controllers/inventario.controlador');

// Middlewares de seguridad: autenticación (JWT) y autorización por roles
const authMiddleware = require('../../../core/middlewares/autenticacion.middleware');     // Middleware de autenticación (valida JWT y rellena req.user)
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware');   // Middleware de autorización (filtra por roles permitidos)

/**
 * Rutas CRUD para Movimientos de Inventario
 *
 * Prefijo en server.js:
 *   app.use('/api/movimientos', movimientoRoutes);
 *
 * Por lo tanto, las rutas quedan:
 *   POST   /api/movimientos/
 *   GET    /api/movimientos/
 *   GET    /api/movimientos/material/:materialId
 *   PUT    /api/movimientos/:id
 *   DELETE /api/movimientos/:id
 */

// 🟢 Crear movimiento: permitido para admin y líder de obra
router.post(
  '/',                                                                    // Ruta POST /api/movimientos/
  authMiddleware,                                                         // Primero: exige usuario autenticado (valida token JWT)
  authorizeRoles(['admin', 'lider de obra']),                             // Segundo: solo roles admin o líder de obra pueden crear movimientos
  movimientoController.createMovimiento                                   // Tercero: ejecuta la lógica de creación de movimiento
);

// 🔵 Obtener todos los movimientos: cualquier usuario autenticado
router.get(
  '/',                                                                    // Ruta GET /api/movimientos/
  authMiddleware,                                                         // Exige usuario autenticado
  movimientoController.getMovimientos                                     // Devuelve la lista completa de movimientos
);

// 🟣 Obtener movimientos de un material específico: usuario autenticado
router.get(
  '/material/:materialId',                                                // Ruta GET /api/movimientos/material/:materialId
  authMiddleware,                                                         // Exige usuario autenticado
  movimientoController.getMovimientosByMaterial                           // Devuelve solo los movimientos asociados a ese material
);

// 🟠 Actualizar movimiento: SOLO admin
router.put(
  '/:id',                                                                 // Ruta PUT /api/movimientos/:id
  authMiddleware,                                                         // Exige usuario autenticado
  authorizeRoles(['admin']),                                              // Solo rol admin puede modificar un movimiento ya creado
  movimientoController.updateMovimiento                                   // Actualiza tipo/descripcion/observaciones/motivo del movimiento (no stock)
);

// 🔴 Eliminar movimiento: SOLO admin
router.delete(
  '/:id',                                                                 // Ruta DELETE /api/movimientos/:id
  authMiddleware,                                                         // Exige usuario autenticado
  authorizeRoles(['admin']),                                              // Solo administradores pueden eliminar movimientos
  movimientoController.deleteMovimiento                                   // Elimina el registro de movimiento (no revierte stock)
);

// Exporta el router para usarlo en server.js
module.exports = router;
