// File: BackEnd/src/modules/inventory/routes/material.rutas.js
// Description: Rutas HTTP para gestionar los materiales de inventario en ProCivil Manager (PCM).
//              Expone operaciones CRUD protegidas por autenticación y autorización por rol,
//              apuntando al controlador de inventario de materiales. Se integra con la capa
//              de seguridad para que solo ciertos roles puedan crear, actualizar o eliminar
//              materiales, mientras que cualquier usuario autenticado puede consultarlos.
//              ⚠️ Nota: en updateMaterial el rol "lider de obra" solo puede editar campos
//              menores (nombre, categoría, unidad, almacén, etc.); los campos de stock y
//              precio solo pueden ser modificados por un administrador (lógica en controlador).

const express = require('express');                                // Importa Express para crear el router de la API
const router = express.Router();                                   // Crea una instancia de Router para agrupar rutas de materiales

// Importa el controlador que contiene la lógica de negocio de materiales.
const materialController = require('../controllers/material.controlador'); // Controlador de inventario de materiales

// Importa el middleware de autenticación para validar el token JWT en cada petición protegida.
const authMiddleware = require('../../../core/middlewares/autenticacion.middleware');    // Middleware que verifica el token y coloca el usuario en req.user

// Importa el middleware de autorización por roles para restringir acceso según el rol del usuario.
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware');   // Middleware que permite el acceso solo a ciertos roles

// ============================================================================
// Rutas CRUD para Materiales
// Prefijo en server.js: app.use('/api/materiales', materialRoutes);
// Por lo tanto, las rutas finales quedan como:
//   POST   /api/materiales/
//   GET    /api/materiales/
//   GET    /api/materiales/:id
//   PUT    /api/materiales/:id
//   DELETE /api/materiales/:id
// ============================================================================

/**
 * Crear un nuevo material de inventario.
 *
 * - Ruta: POST /api/materiales/
 * - Seguridad:
 *   - Requiere usuario autenticado (authMiddleware).
 *   - Solo rol "admin" puede crear nuevos materiales.
 * - Controlador: materialController.createMaterial
 */
router.post(
  '/',                                                              // Endpoint base para crear materiales
  authMiddleware,                                                   // Verifica que el usuario esté autenticado
  authorizeRoles(['admin']),                                        // Restringe la acción a usuarios con rol admin
  materialController.createMaterial                                 // Ejecuta la lógica de creación de material
);

/**
 * Listar todos los materiales activos.
 *
 * - Ruta: GET /api/materiales/
 * - Seguridad:
 *   - Requiere usuario autenticado, sin restricción adicional de rol.
 * - Controlador: materialController.getMateriales
 */
router.get(
  '/',                                                              // Endpoint base para listar materiales
  authMiddleware,                                                   // Obliga a que el usuario tenga un token válido
  materialController.getMateriales                                  // Devuelve el listado de materiales (excluyendo isDeleted = true)
);

/**
 * Obtener un material específico por su ID.
 *
 * - Ruta: GET /api/materiales/:id
 * - Seguridad:
 *   - Requiere usuario autenticado, cualquier rol.
 * - Controlador: materialController.getMaterialById
 */
router.get(
  '/:id',                                                           // Endpoint con parámetro de ruta :id
  authMiddleware,                                                   // Verifica autenticación del usuario
  materialController.getMaterialById                                // Busca y devuelve el material si existe y no está eliminado
);

/**
 * Actualizar un material existente.
 *
 * - Ruta: PUT /api/materiales/:id
 * - Seguridad:
 *   - Requiere usuario autenticado.
 *   - Permitido para roles "admin" y "lider de obra".
 * - Comportamiento:
 *   - El controlador (updateMaterial) valida internamente:
 *       🔹 admin: puede modificar cualquier campo.
 *       🔹 lider de obra: NO puede tocar cantidad, stockMinimo ni precioUnitario,
 *          solo campos menores (nombre, categoría, unidad, almacén, etc.).
 * - Controlador: materialController.updateMaterial
 */
router.put(
  '/:id',                                                           // Endpoint con parámetro :id del material
  authMiddleware,                                                   // Verifica el token JWT y establece req.user
  authorizeRoles(['admin', 'lider de obra']),                       // Permite solo a administradores y líderes de obra
  materialController.updateMaterial                                 // Actualiza los campos del material permitido por el controlador
);

/**
 * Eliminar (lógicamente) un material.
 *
 * - Ruta: DELETE /api/materiales/:id
 * - Seguridad:
 *   - Requiere usuario autenticado.
 *   - Solo rol "admin" puede eliminar materiales.
 * - Comportamiento:
 *   - Realiza eliminación lógica marcando isDeleted = true, sin borrar el documento.
 * - Controlador: materialController.deleteMaterial
 */
router.delete(
  '/:id',                                                           // Endpoint con parámetro :id del material a eliminar
  authMiddleware,                                                   // Requiere usuario autenticado
  authorizeRoles(['admin']),                                        // Solo administradores pueden eliminar materiales
  materialController.deleteMaterial                                 // Marca el material como eliminado lógicamente
);

// Exporta el router para que pueda ser utilizado en server.js u otros módulos.
module.exports = router;                                            // Exporta las rutas de materiales como módulo CommonJS
