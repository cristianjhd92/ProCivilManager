// File: BackEnd/src/modules/requests/routes/solicitud.rutas.js
// Description: Define las rutas HTTP para gestionar las solicitudes de
//              proyectos y de materiales en ProCivil Manager (PCM). Aplica
//              autenticación y control de roles para que cada endpoint
//              sólo sea accesible por el tipo de usuario permitido.

const express = require('express');                            // Importa Express para crear el router HTTP.
const router = express.Router();                               // Crea una instancia de Router para agrupar rutas relacionadas.

// Importa las funciones del controlador de solicitudes.
const {
  crearSolicitud,                                              // Crea una nueva solicitud (proyecto o materiales).
  obtenerSolicitudes,                                          // Obtiene listado de solicitudes según el rol del usuario.
  actualizarEstadoSolicitud,                                   // Cambia el estado de una solicitud (pendiente, aprobada, etc.).
  agregarRespuestaSolicitud,                                   // Agrega una respuesta al hilo de la solicitud.
  obtenerSolicitudPorId                                        // Obtiene el detalle puntual de una solicitud.
} = require('../controllers/solicitud.controlador');

// Middleware de autenticación: valida el JWT y rellena req.user.
const auth = require('../../../core/middlewares/autenticacion.middleware');

// Middleware de autorización: limita el acceso a ciertos roles.
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware');

/**
 * Rutas para gestionar las solicitudes de proyectos y materiales.
 *
 * Prefijo esperado en server.js:
 *   app.use('/api/solicitudes', solicitudRoutes);
 *
 * Entonces las rutas quedan así:
 *   POST    /api/solicitudes                 → crearSolicitud
 *   GET     /api/solicitudes                 → obtenerSolicitudes
 *   GET     /api/solicitudes/:id             → obtenerSolicitudPorId
 *   POST    /api/solicitudes/:id/respuestas  → agregarRespuestaSolicitud
 *   PUT     /api/solicitudes/:id             → actualizarEstadoSolicitud
 */

// --------------------------------------------------------------------
// Crear nueva solicitud
// --------------------------------------------------------------------
// - Requiere autenticación (cualquier rol con sesión activa).
// - La lógica interna del controlador valida si el rol puede crear
//   una solicitud de tipo 'proyecto' (cliente o líder de obra) o
//   de tipo 'material' (sólo líder de obra).
router.post(
  '/',                                                         // Ruta POST /api/solicitudes.
  auth,                                                        // Primero: exige usuario autenticado.
  crearSolicitud                                               // Segundo: delega en el controlador la creación.
);

// --------------------------------------------------------------------
// Listar solicitudes visibles para el usuario autenticado
// --------------------------------------------------------------------
// - Admin: ve todas las solicitudes (de cualquier tipo).
// - Cualquier otro rol (cliente, líder, etc.):
//     → sólo ve las solicitudes donde él mismo es el solicitante.
// - Se pueden aplicar filtros adicionales por query (?estado=...&tipo=...).
router.get(
  '/',                                                         // Ruta GET /api/solicitudes.
  auth,                                                        // Requiere usuario autenticado.
  obtenerSolicitudes                                           // Controlador arma el filtro según rol y query params.
);

// --------------------------------------------------------------------
// Obtener detalle puntual de una solicitud por ID
// --------------------------------------------------------------------
// - Admin: puede ver cualquier solicitud.
// - Cualquier otro rol: sólo puede ver la solicitud si él mismo
//   es el solicitante (validación en el controlador).
router.get(
  '/:id',                                                      // Ruta GET /api/solicitudes/:id.
  auth,                                                        // Requiere usuario autenticado.
  obtenerSolicitudPorId                                        // Devuelve el detalle completo si el rol/propiedad lo permite.
);

// --------------------------------------------------------------------
// Agregar respuesta a una solicitud
// --------------------------------------------------------------------
// - Puede responder:
//     * Rol 'admin'.
//     * Rol 'lider de obra'.
//     * El propio solicitante (cliente o líder), según valida
//       el controlador internamente.
// - El controlador registra la respuesta en el historial y genera
//   una alerta al solicitante (si quien responde no es él mismo),
//   además de emitir eventos Socket.io.
router.post(
  '/:id/respuestas',                                           // Ruta POST /api/solicitudes/:id/respuestas.
  auth,                                                        // Requiere usuario autenticado.
  agregarRespuestaSolicitud                                    // La autorización fina se gestiona en el controlador.
);

// --------------------------------------------------------------------
// Actualizar estado de una solicitud
// --------------------------------------------------------------------
// - Sólo rol 'admin' puede cambiar el estado (pendiente, aprobada,
//   rechazada, procesada).
// - El controlador genera una alerta para el solicitante indicando
//   el nuevo estado y emite evento Socket.io.
router.put(
  '/:id',                                                      // Ruta PUT /api/solicitudes/:id.
  auth,                                                        // Requiere usuario autenticado.
  authorizeRoles(['admin']),                                   // Sólo administradores pueden cambiar el estado.
  actualizarEstadoSolicitud                                    // Aplica el cambio de estado y registra la alerta.
);

// Exporta el router para ser montado en server.js.
module.exports = router;
