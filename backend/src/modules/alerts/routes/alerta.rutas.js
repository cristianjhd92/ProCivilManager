// File: BackEnd/src/modules/alerts/routes/alerta.rutas.js
// Description: Rutas para listar y resolver alertas del sistema en ProCivil Manager (PCM).
//              Todas las rutas están protegidas por autenticación y se restringen
//              según el rol del usuario (admin, líder de obra o cliente).

const express = require('express'); // Importa Express para crear el router HTTP.
const router = express.Router();    // Crea una nueva instancia de router de Express.

// Importa las funciones del controlador de alertas.
const {
  listAlertas,       // Controlador para listar alertas con filtros y paginación.
  resolverAlerta,    // Controlador para marcar una alerta como resuelta.
  marcarAlertaVisto, // Nuevo controlador para marcar una alerta como vista/no vista.
} = require('../controllers/alerta.controlador');

// Middleware de autenticación (verifica el token JWT y adjunta el usuario a req.user).
const auth = require('../../../core/middlewares/autenticacion.middleware');

// Middleware de autorización por roles (verifica que el rol del usuario esté permitido).
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware');

/**
 * GET /api/alertas
 *
 * Listar alertas con filtros opcionales.
 *
 * Reglas:
 *  - La ruta está protegida por autenticación (`auth`).
 *  - Solo los roles: admin, líder de obra y cliente pueden acceder.
 *  - La lógica de qué alertas ve cada rol se controla dentro del controlador:
 *      * admin  → ve todas las alertas (globales y por usuario).
 *      * otros  → solo alertas cuyo campo `usuario` coincida con su id.
 */
router.get(
  '/', // Ruta base: /api/alertas
  auth, // Primero: verificar que el usuario esté autenticado.
  authorizeRoles(['admin', 'lider de obra', 'cliente']), // Luego: validar rol permitido.
  listAlertas // Finalmente: ejecutar el controlador que lista alertas.
);

/**
 * PUT /api/alertas/:id/resolver
 *
 * Marca una alerta como resuelta.
 *
 * Reglas:
 *  - Requiere autenticación (`auth`).
 *  - Roles permitidos: admin, líder de obra y cliente.
 *  - La verificación de "quién puede resolver qué alerta" está en el controlador:
 *      * admin  → puede resolver cualquier alerta.
 *      * otros  → solo pueden resolver alertas cuyo `usuario` sea su propio id.
 */
router.put(
  '/:id/resolver', // Ruta para resolver una alerta concreta (por su id de Mongo).
  auth, // Primero: autenticación vía JWT.
  authorizeRoles(['admin', 'lider de obra', 'cliente']), // Segundo: rol permitido.
  resolverAlerta // Tercero: controlador que marca la alerta como resuelta.
);

/**
 * PUT /api/alertas/:id/visto
 *
 * Marca o desmarca una alerta como vista. Requiere autenticación y valida
 * que el usuario tenga permiso para modificar la alerta (admin o destinatario).
 * Acepta un cuerpo opcional { visto: true|false } para indicar el nuevo
 * estado; si no se envía, se asume true (marcar como vista).
 */
router.put(
  '/:id/visto',
  auth,
  authorizeRoles(['admin', 'lider de obra', 'cliente']),
  marcarAlertaVisto
);

// Exporta el router para que pueda ser montado en server.js bajo, por ejemplo, /api/alertas.
module.exports = router;
