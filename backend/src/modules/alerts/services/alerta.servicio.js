// File: BackEnd/src/modules/alerts/services/alerta.servicio.js
// Description: Servicios de alto nivel para crear alertas relacionadas
//              con proyectos, clientes, solicitudes y asignaciones en
//              ProCivil Manager (PCM). Centraliza la creación de alertas
//              y, opcionalmente, la emisión de eventos por Socket.io.

/* ==============================
 * Importación de dependencias
 * ============================== */

// Importa el modelo de alertas definido con Mongoose.
const Alerta = require('../models/alerta.modelo');

/* ==========================================
 * Helper genérico para crear una alerta
 * ========================================== */

/**
 * Crea una alerta en base de datos y, si se recibe una instancia de
 * Socket.io, emite el evento "alerta:nueva" para que el frontend
 * pueda actualizar en tiempo real los contadores / bandejas.
 *
 * @param {Object} params Parámetros para crear la alerta.
 * @param {string} params.tipo Tipo de alerta ('proyecto', 'presupuesto', etc.).
 * @param {string|null} [params.usuarioId] ID del usuario destinatario (opcional).
 * @param {string|null} [params.proyectoId] ID del proyecto asociado (opcional).
 * @param {string|null} [params.solicitudId] ID de la solicitud asociada (opcional).
 * @param {string|null} [params.materialId] ID del material asociado (opcional).
 * @param {string} params.message Mensaje descriptivo de la alerta.
 * @param {('info'|'advertencia'|'critica')} [params.nivel='info'] Nivel de severidad.
 * @param {number|null} [params.threshold=null] Umbral numérico que disparó la alerta.
 * @param {import('socket.io').Server} [io] Instancia de Socket.io (opcional).
 *
 * @returns {Promise<import('../models/alerta.modelo')>} Documento de alerta creado.
 */
async function crearAlertaGenerica(params, io) {
  // Extraemos parámetros con valores por defecto seguros
  const {
    tipo,
    usuarioId = null,
    proyectoId = null,
    solicitudId = null,
    materialId = null,
    message,
    nivel = 'info',
    threshold = null,
  } = params;

  // Creamos el documento de alerta
  const alerta = new Alerta({
    tipo,
    usuario: usuarioId,
    proyecto: proyectoId,
    solicitud: solicitudId,
    material: materialId,
    message,
    nivel,
    threshold,
  });

  // Guardamos en MongoDB
  await alerta.save();

  // Si nos pasan instancia de Socket.io, emitimos evento en tiempo real
  if (io) {
    io.emit('alerta:nueva', {
      alertaId: alerta._id.toString(),
      usuarioId: alerta.usuario ? alerta.usuario.toString() : null,
      tipo: alerta.tipo,
      nivel: alerta.nivel,
      proyectoId: alerta.proyecto ? alerta.proyecto.toString() : null,
      createdAt: alerta.createdAt.toISOString(),
    });
  }

  return alerta;
}

/* ==========================================
 * Helpers específicos de negocio (proyectos)
 * ========================================== */

/**
 * Crea una alerta para un CLIENTE cuando se crea un nuevo proyecto
 * asociado a su cuenta.
 *
 * Se espera que:
 *  - El controlador de proyectos ya haya creado y guardado el proyecto.
 *  - Se conozca el ID del usuario cliente (clienteId).
 *
 * @param {Object} params Parámetros de negocio.
 * @param {Object} params.proyecto Documento del proyecto (o al menos {_id, title}).
 * @param {string} params.clienteId ID del usuario cliente en MongoDB.
 * @param {import('socket.io').Server} [params.io] Instancia de Socket.io.
 */
async function crearAlertaProyectoCreado({ proyecto, clienteId, io }) {
  if (!proyecto || !proyecto._id || !clienteId) {
    // Si faltan datos críticos, no intentamos crear la alerta
    return null;
  }

  const titulo = proyecto.title || proyecto.nombre || 'Proyecto sin título';

  const message = `Se ha creado el proyecto "${titulo}" asociado a tu cuenta de cliente.`;

  return crearAlertaGenerica(
    {
      tipo: 'proyecto',
      usuarioId: clienteId,
      proyectoId: proyecto._id,
      message,
      nivel: 'info',
      threshold: null,
    },
    io
  );
}

/**
 * Crea una alerta para un CLIENTE cuando cambia el estado de su proyecto.
 *
 * Útil, por ejemplo, para:
 *  - planning  → active
 *  - active    → completed
 *  - active    → cancelled
 *
 * @param {Object} params Parámetros de negocio.
 * @param {Object} params.proyecto Documento del proyecto (o al menos {_id, title, status}).
 * @param {string} params.clienteId ID del usuario cliente en MongoDB.
 * @param {string} params.estadoAnterior Estado anterior del proyecto.
 * @param {string} params.estadoNuevo Estado nuevo del proyecto.
 * @param {import('socket.io').Server} [params.io] Instancia de Socket.io.
 */
async function crearAlertaCambioEstadoProyecto({
  proyecto,
  clienteId,
  estadoAnterior,
  estadoNuevo,
  io,
}) {
  if (!proyecto || !proyecto._id || !clienteId) {
    return null;
  }

  const titulo = proyecto.title || proyecto.nombre || 'Proyecto sin título';

  // Mensaje descriptivo
  const message = `El proyecto "${titulo}" ha cambiado de estado: ${estadoAnterior} → ${estadoNuevo}.`;

  // Definimos nivel según el nuevo estado (puedes ajustar la lógica)
  let nivel = 'info';
  const valorNuevo = (estadoNuevo || '').toString().toLowerCase();

  if (valorNuevo === 'cancelado' || valorNuevo === 'cancelled') {
    nivel = 'critica';
  } else if (valorNuevo === 'active' || valorNuevo === 'en progreso') {
    nivel = 'advertencia';
  }

  return crearAlertaGenerica(
    {
      tipo: 'proyecto',
      usuarioId: clienteId,
      proyectoId: proyecto._id,
      message,
      nivel,
      threshold: null,
    },
    io
  );
}

/**
 * Crea una alerta para el LÍDER DE OBRA cuando se le asigna o remueve
 * un proyecto.
 *
 * @param {Object} params Parámetros de negocio.
 * @param {Object} params.proyecto Documento del proyecto (al menos {_id, title}).
 * @param {string} params.liderId ID del usuario líder de obra.
 * @param {boolean} [params.esRemocion=false] true si es remoción, false si es asignación.
 * @param {import('socket.io').Server} [params.io] Instancia de Socket.io.
 */
async function crearAlertaAsignacionLiderProyecto({
  proyecto,
  liderId,
  esRemocion = false,
  io,
}) {
  if (!proyecto || !proyecto._id || !liderId) {
    return null;
  }

  const titulo = proyecto.title || proyecto.nombre || 'Proyecto sin título';

  const message = esRemocion
    ? `Has sido removido como líder del proyecto "${titulo}".`
    : `Has sido asignado como líder del proyecto "${titulo}".`;

  return crearAlertaGenerica(
    {
      tipo: 'asignacion',
      usuarioId: liderId,
      proyectoId: proyecto._id,
      message,
      nivel: 'info',
      threshold: null,
    },
    io
  );
}

/* ===========================
 * Exportación del servicio
 * =========================== */

module.exports = {
  crearAlertaGenerica,
  crearAlertaProyectoCreado,
  crearAlertaCambioEstadoProyecto,
  crearAlertaAsignacionLiderProyecto,
};
