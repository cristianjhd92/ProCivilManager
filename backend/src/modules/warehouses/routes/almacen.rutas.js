// File: BackEnd/src/modules/warehouses/routes/almacen.rutas.js
// Description: Rutas HTTP para gestionar almacenes en ProCivil Manager (PCM).
//              Expone operaciones CRUD protegidas por autenticación JWT y
//              autorización basada en roles. Solo el administrador puede
//              crear, actualizar o eliminar (lógicamente) almacenes; cualquier
//              usuario autenticado puede consultarlos.

const express = require('express');                            // Importa Express para crear el router
const router = express.Router();                               // Crea una instancia de router de Express

// Importa el controlador de almacenes con la lógica de cada operación
// Nota: el nombre del archivo del controlador es "almacen.controlador.js"
const almacenController = require('../controllers/almacen.controlador');

// Middlewares de seguridad
const authMiddleware = require('../../../core/middlewares/autenticacion.middleware');  // Middleware para validar JWT y poblar req.user
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); // Middleware para restringir acceso por rol

// -----------------------------------------------------------------------------
// Rutas CRUD para Almacenes
// -----------------------------------------------------------------------------

/**
 * @route   POST /api/almacenes
 * @desc    Crear un nuevo almacén en el sistema.
 * @access  Privado (solo ADMIN)
 *
 * Flujo:
 *  1. authMiddleware → valida el token JWT.
 *  2. authorizeRoles(['admin']) → solo permite rol "admin".
 *  3. almacenController.createAlmacen → crea el registro en MongoDB.
 */
router.post(
  '/',
  authMiddleware,                    // Verifica que el usuario esté autenticado
  authorizeRoles(['admin']),         // Restringe la ruta únicamente a administradores
  almacenController.createAlmacen    // Controlador que realiza la creación
);

/**
 * @route   GET /api/almacenes
 * @desc    Listar todos los almacenes registrados (no eliminados lógicamente),
 *          con posibilidad de filtrar por ciudad/departamento/activo.
 * @access  Privado (cualquier usuario autenticado)
 *
 * Flujo:
 *  1. authMiddleware → valida el token JWT.
 *  2. almacenController.getAlmacenes → devuelve el listado de almacenes.
 */
router.get(
  '/',
  authMiddleware,                    // Requiere usuario autenticado (cualquier rol)
  almacenController.getAlmacenes     // Controlador que retorna el listado
);

/**
 * @route   GET /api/almacenes/:id
 * @desc    Obtener el detalle de un almacén específico por su ID
 *          (siempre que no esté eliminado lógicamente).
 * @access  Privado (cualquier usuario autenticado)
 *
 * Flujo:
 *  1. authMiddleware → valida el token JWT.
 *  2. almacenController.getAlmacenById → busca el almacén por ID.
 */
router.get(
  '/:id',
  authMiddleware,                    // Requiere usuario autenticado
  almacenController.getAlmacenById   // Controlador que retorna el almacén solicitado
);

/**
 * @route   PUT /api/almacenes/:id
 * @desc    Actualizar los datos de un almacén existente (no eliminado lógicamente).
 * @access  Privado (solo ADMIN)
 *
 * Flujo:
 *  1. authMiddleware → valida el token JWT.
 *  2. authorizeRoles(['admin']) → solo permite rol "admin".
 *  3. almacenController.updateAlmacen → aplica la actualización.
 */
router.put(
  '/:id',
  authMiddleware,                    // Verifica autenticación
  authorizeRoles(['admin']),         // Solo administradores pueden modificar
  almacenController.updateAlmacen    // Controlador que actualiza el almacén
);

/**
 * @route   DELETE /api/almacenes/:id
 * @desc    Eliminar lógicamente un almacén por su ID
 *          (marca isDeleted=true y activo=false).
 * @access  Privado (solo ADMIN)
 *
 * Flujo:
 *  1. authMiddleware → valida el token JWT.
 *  2. authorizeRoles(['admin']) → solo permite rol "admin".
 *  3. almacenController.deleteAlmacen → marca el almacén como eliminado lógicamente.
 */
router.delete(
  '/:id',
  authMiddleware,                    // Verifica autenticación
  authorizeRoles(['admin']),         // Solo administradores pueden eliminar
  almacenController.deleteAlmacen    // Controlador que realiza la eliminación lógica
);

// Exporta el router para ser montado en server.js bajo /api/almacenes
module.exports = router;
