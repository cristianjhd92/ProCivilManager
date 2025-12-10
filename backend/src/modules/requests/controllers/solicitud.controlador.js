// File: BackEnd/src/modules/requests/controllers/solicitud.controlador.js
// Description: Controlador para gestionar las solicitudes de proyectos y de
//              materiales en ProCivil Manager (PCM). Permite crear, listar,
//              actualizar el estado, agregar respuestas y generar alertas
//              asociadas, incluyendo emisión en tiempo real vía Socket.io.

// Importa el modelo de Solicitud para interactuar con la colección "solicitudes".
const Solicitud = require('../models/solicitud.modelo');

// Importa el modelo de Alerta para registrar notificaciones dentro del sistema.
const Alerta = require('../../alerts/models/alerta.modelo');

// Importa el modelo de User para buscar administradores, solicitantes, etc.
const User = require('../../users/models/usuario.modelo');

// Importa el modelo de Material para validar materiales cuando la solicitud es de tipo "material".
const Material = require('../../inventory/models/material.modelo');

/**
 * Crea una nueva solicitud.
 *
 * Reglas de negocio:
 *  - tipo = 'proyecto':
 *      → puede crearla un usuario con rol 'cliente' o 'lider de obra'.
 *      → se exige título y descripción.
 *
 *  - tipo = 'material':
 *      → sólo puede crearla un usuario con rol 'lider de obra'.
 *      → se exige lista de materiales válida (cada uno con id y cantidad > 0).
 *
 *  - Se crean alertas de tipo "solicitud" para todos los administradores.
 *  - Se emiten eventos Socket.io para actualizar dashboards en tiempo real.
 */
exports.crearSolicitud = async (req, res) => {
  try {
    // Extrae del body los datos básicos de la solicitud.
    const { tipo, titulo, descripcion, materiales } = req.body; // tipo = 'proyecto' | 'material'

    // Id del usuario autenticado (viene del middleware de auth).
    const solicitanteId = req.user.id;

    // Rol del usuario autenticado (admin, cliente, lider de obra, etc.).
    const userRole = req.user.role;

    // =========================================================
    // Validaciones según el tipo de solicitud y el rol del usuario
    // =========================================================

    if (tipo === 'proyecto') {
      // Si la solicitud es de tipo proyecto, la pueden crear clientes o líderes de obra.
      if (userRole !== 'cliente' && userRole !== 'lider de obra') {
        return res.status(403).json({
          error: 'Sólo clientes o líderes de obra pueden solicitar nuevos proyectos.',
        });
      }

      // Para proyectos se exige título y descripción obligatorios.
      if (!titulo || !descripcion) {
        return res.status(400).json({
          error:
            'Se requiere un título y una descripción para la solicitud de proyecto.',
        });
      }
    } else if (tipo === 'material') {
      // Si la solicitud es de tipo material, sólo un líder de obra la puede crear.
      if (userRole !== 'lider de obra') {
        return res
          .status(403)
          .json({ error: 'Sólo los líderes de obra pueden solicitar materiales.' });
      }

      // Debe venir un arreglo de materiales con al menos un elemento.
      if (!Array.isArray(materiales) || materiales.length === 0) {
        return res.status(400).json({
          error: 'Debe proporcionar una lista de materiales para la solicitud.',
        });
      }

      // ---------------------------------------------
      // Validación detallada de cada material enviado
      // ---------------------------------------------
      for (const item of materiales) {
        // Verifica si la cantidad es un número o un string numérico.
        const cantidadEsNumero =
          typeof item.cantidad === 'number' || !isNaN(Number(item.cantidad));

        // Debe tener id de material, cantidad numérica y > 0.
        if (!item.material || !cantidadEsNumero || Number(item.cantidad) <= 0) {
          return res.status(400).json({
            error:
              'Cada material debe tener un identificador válido y una cantidad mayor que cero.',
          });
        }
      }

      // ---------------------------------------------
      // Verificar que TODOS los materiales existan en BD
      // ---------------------------------------------
      const idsMateriales = materiales.map((m) => m.material); // Lista de IDs de material.
      const materialesExistentes = await Material.find({
        _id: { $in: idsMateriales }, // Busca en lote por _id.
        isDeleted: { $ne: true },    // Excluye materiales eliminados lógicamente.
      });

      // Si la cantidad encontrada no coincide con la enviada, hay algún ID inválido.
      if (materialesExistentes.length !== idsMateriales.length) {
        return res.status(400).json({
          error:
            'Uno o más materiales de la solicitud no existen o no están disponibles.',
        });
      }
    } else {
      // Si tipo no es ni 'proyecto' ni 'material', se considera inválido.
      return res.status(400).json({ error: 'Tipo de solicitud no válido.' });
    }

    // =========================================================
    // Creación de la solicitud en base de datos
    // =========================================================

    // Construye un nuevo documento de Solicitud con los datos validados.
    const nuevaSolicitud = new Solicitud({
      solicitante: solicitanteId, // Usuario que envía la solicitud.
      tipo,                       // Tipo de solicitud ('proyecto' o 'material').
      titulo,                     // Título (obligatorio para proyecto, opcional para material).
      descripcion,                // Descripción (obligatoria sólo para proyecto).
      materiales,                 // Lista de materiales si aplica (para tipo 'material').
      // El campo proyecto se mantiene opcional y se podría llenar en otros flujos
      // cuando la solicitud se materializa en un proyecto real.
    });

    // Guarda la nueva solicitud en la colección "solicitudes".
    await nuevaSolicitud.save();

    // =========================================================
    // Creación de alertas para administradores
    // =========================================================

    // Busca todos los usuarios con rol 'admin' que no estén marcados como eliminados.
    const admins = await User.find({
      role: 'admin',
      isDeleted: { $ne: true },
    });

    // Construye el nombre del solicitante de forma amigable.
    const nombreSolicitante =
      [req.user.firstName, req.user.lastName].filter(Boolean).join(' ') ||
      req.user.name ||
      req.user.email;

    // Arreglo donde se guardarán las alertas creadas (si hay admins).
    let createdAlertas = [];

    if (admins.length > 0) {
      // Para cada admin se crea una alerta individual.
      const alertPromises = admins.map((admin) =>
        Alerta.create({
          usuario: admin._id,            // Admin destinatario de la alerta.
          tipo: 'solicitud',             // Tipo de alerta (asociada a solicitudes).
          solicitud: nuevaSolicitud._id, // Referencia a la solicitud recién creada.
          message: `Nueva solicitud de ${
            tipo === 'proyecto' ? 'proyecto' : 'materiales'
          } creada por ${nombreSolicitante}`, // Mensaje visible en el panel.
          resolved: false,               // La alerta se marca como pendiente.
        })
      );

      // Espera a que se crean todas las alertas.
      createdAlertas = await Promise.all(alertPromises);
    }

    // =========================================================
    // Emisión en tiempo real vía Socket.io (si está configurado)
    // =========================================================

    // Obtiene la instancia de Socket.io almacenada en la app (si existe).
    const io = req.app?.get('io');

    if (io) {
      // Notifica globalmente que hay una nueva solicitud creada.
      io.emit('solicitud:nueva', {
        solicitudId: nuevaSolicitud._id.toString(),         // ID de la solicitud.
        tipo: nuevaSolicitud.tipo,                          // Tipo de solicitud.
        estado: nuevaSolicitud.estado || 'pendiente',       // Estado actual.
        solicitanteId: solicitanteId.toString(),            // ID del usuario que la creó.
        createdAt: nuevaSolicitud.createdAt || new Date(),  // Marca de tiempo de creación.
      });

      // Notifica a los clientes que se han creado nuevas alertas para admins.
      if (createdAlertas.length > 0) {
        createdAlertas.forEach((alerta) => {
          io.emit('alerta:nueva', {
            alertaId: alerta._id.toString(),                            // ID de la alerta.
            usuarioId: alerta.usuario ? alerta.usuario.toString() : null, // Destinatario de la alerta.
            tipo: alerta.tipo,                                          // Tipo de alerta.
            resolved: alerta.resolved,                                  // Estado de resolución.
            createdAt: alerta.createdAt || new Date(),                  // Fecha de creación.
            solicitudId: alerta.solicitud
              ? alerta.solicitud.toString()
              : null,                                                   // Solicitud asociada.
          });
        });
      }
    }

    // Respuesta final hacia el cliente HTTP con la solicitud creada.
    res
      .status(201)
      .json({ message: 'Solicitud creada correctamente.', solicitud: nuevaSolicitud });
  } catch (error) {
    // Log del error en la consola del servidor.
    console.error('Error al crear solicitud:', error);

    // Respuesta genérica de error para el frontend.
    res.status(500).json({ error: 'Error al crear solicitud.' });
  }
};

/**
 * Obtiene las solicitudes disponibles para el usuario autenticado.
 *
 * Reglas:
 *  - Admin: puede ver TODAS las solicitudes (de cualquier tipo y solicitante).
 *  - Cualquier otro rol (cliente, líder de obra, etc.):
 *      → sólo ve las solicitudes donde él mismo es el solicitante.
 *      → opcionalmente puede filtrar por estado y tipo con query params.
 *
 * Filtros opcionales:
 *  - estado (ej: ?estado=pendiente)
 *  - tipo   (ej: ?tipo=material)
 */
exports.obtenerSolicitudes = async (req, res) => {
  try {
    // Extrae filtros opcionales desde query string (?estado=...&tipo=...).
    const { estado, tipo } = req.query;

    // Rol del usuario autenticado.
    const userRole = req.user.role;

    // ID del usuario autenticado.
    const userId = req.user.id;

    // Objeto filtro base para la consulta a MongoDB.
    const filter = {};

    // Si se envía estado, se agrega al filtro.
    if (estado) filter.estado = estado;

    // Si se envía tipo, se agrega al filtro.
    if (tipo) filter.tipo = tipo;

    // Lógica de filtrado según rol.
    if (userRole === 'admin') {
      // Admin: sin restricciones adicionales, ve todo según filtros.
    } else {
      // Cualquier otro rol:
      //  - sólo ve sus propias solicitudes (solicitante = userId).
      filter.solicitante = userId;
    }

    // Consulta en base de datos según el filtro armado.
    const solicitudes = await Solicitud.find(filter)
      .sort({ createdAt: -1 }) // Ordena de más reciente a más antigua.
      .populate('solicitante', 'firstName lastName email role') // Datos básicos del solicitante.
      .populate('materiales.material', 'nombre descripcion');   // Información de cada material.

    // Devuelve el listado al frontend.
    res.json(solicitudes);
  } catch (error) {
    // Log de error en servidor.
    console.error('Error al obtener solicitudes:', error);

    // Respuesta genérica de error al cliente.
    res.status(500).json({ error: 'Error al obtener solicitudes.' });
  }
};

/**
 * Actualiza el estado de una solicitud existente.
 *
 * Reglas:
 *  - Sólo un usuario con rol 'admin' puede cambiar el estado.
 *  - Estados válidos: 'pendiente', 'aprobada', 'rechazada', 'procesada'.
 *  - Se actualiza la fecha de actualización y se genera una alerta
 *    dirigida al solicitante informando el nuevo estado.
 *  - Se emite un evento Socket.io para notificar el cambio.
 */
exports.actualizarEstadoSolicitud = async (req, res) => {
  try {
    // ID de la solicitud a actualizar (viene en la URL /:id).
    const { id } = req.params;

    // Nuevo estado enviado en el cuerpo de la petición.
    const { estado } = req.body;

    // Rol del usuario autenticado.
    const userRole = req.user.role;

    // Sólo un admin puede actualizar el estado.
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Sólo los administradores pueden actualizar el estado de una solicitud.',
      });
    }

    // Busca la solicitud y popula el solicitante para poder notificarlo.
    const solicitud = await Solicitud.findById(id).populate('solicitante');
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    // Lista de estados permitidos para validar el nuevo valor.
    const estadosValidos = ['pendiente', 'aprobada', 'rechazada', 'procesada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }

    // Actualiza el estado y la fecha de última actualización.
    solicitud.estado = estado;
    solicitud.fechaActualizacion = new Date();

    // Guarda los cambios en la base de datos.
    await solicitud.save();

    // Código corto para mostrar en el texto de la alerta (últimos 6 caracteres del _id).
    const codigoCorto = solicitud._id.toString().slice(-6);

    // Crea una alerta para el solicitante informando el cambio de estado.
    const nuevaAlerta = await Alerta.create({
      usuario: solicitud.solicitante._id,                  // Usuario destinatario.
      tipo: 'solicitud',                                  // Tipo de alerta.
      solicitud: solicitud._id,                           // Solicitud asociada.
      message: `Tu solicitud #${codigoCorto} ha sido ${estado}.`, // Mensaje visible.
      resolved: false,                                    // Se crea como pendiente.
    });

    // Obtiene la instancia de Socket.io (si existe en la app).
    const io = req.app?.get('io');

    if (io) {
      // Emite evento global de solicitud actualizada.
      io.emit('solicitud:actualizada', {
        solicitudId: solicitud._id.toString(),                 // ID de la solicitud.
        estado: solicitud.estado,                              // Nuevo estado.
        solicitanteId: solicitud.solicitante._id.toString(),   // ID del solicitante.
        updatedAt: solicitud.fechaActualizacion,               // Fecha de actualización.
      });

      // Emite evento de nueva alerta asociada a esta actualización.
      io.emit('alerta:nueva', {
        alertaId: nuevaAlerta._id.toString(),                  // ID de la alerta.
        usuarioId: nuevaAlerta.usuario
          ? nuevaAlerta.usuario.toString()
          : null,                                              // Destinatario.
        tipo: nuevaAlerta.tipo,                                // Tipo de alerta.
        resolved: nuevaAlerta.resolved,                        // Estado de resolución.
        createdAt: nuevaAlerta.createdAt || new Date(),        // Fecha de creación.
        solicitudId: nuevaAlerta.solicitud
          ? nuevaAlerta.solicitud.toString()
          : null,                                              // Solicitud asociada.
      });
    }

    // Respuesta al cliente con la solicitud actualizada.
    res.json({ message: 'Estado actualizado correctamente.', solicitud });
  } catch (error) {
    // Log de error interno.
    console.error('Error al actualizar el estado de la solicitud:', error);

    // Respuesta genérica de error al cliente.
    res
      .status(500)
      .json({ error: 'Error al actualizar el estado de la solicitud.' });
  }
};

/**
 * Agrega una respuesta al historial de una solicitud.
 *
 * Pensado para que:
 *  - Administradores y líderes de obra puedan responder solicitudes.
 *  - El propio solicitante (cliente o líder) también pueda responder
 *    dentro del hilo de su solicitud.
 *  - Se genere una alerta al solicitante indicando que tiene
 *    una nueva respuesta disponible (si quien responde no es él mismo).
 *  - Se emita un evento Socket.io para refrescar el detalle en tiempo real.
 */
exports.agregarRespuestaSolicitud = async (req, res) => {
  try {
    // ID de la solicitud a la que se va a responder.
    const { id } = req.params;

    // Mensaje de respuesta enviado por el usuario.
    const { mensaje } = req.body;

    // ID del usuario que responde.
    const userId = req.user.id;

    // Rol del usuario autenticado.
    const userRole = req.user.role;

    // Validar que el mensaje no venga vacío o sólo con espacios.
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'El mensaje de respuesta es obligatorio.' });
    }

    // Busca la solicitud y pobla el solicitante para poder notificarlo.
    const solicitud = await Solicitud.findById(id).populate('solicitante');
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    // Verifica si el usuario autenticado es el solicitante.
    const esSolicitante =
      solicitud.solicitante &&
      solicitud.solicitante._id &&
      solicitud.solicitante._id.toString() === userId;

    // Reglas de autorización:
    //  - Admin y líder de obra pueden responder cualquier solicitud.
    //  - El solicitante (sea cliente o líder) puede responder su propia solicitud.
    if (
      userRole !== 'admin' &&
      userRole !== 'lider de obra' &&
      !esSolicitante
    ) {
      return res.status(403).json({
        error:
          'No tienes permiso para responder esta solicitud. Sólo administradores, líderes de obra o el solicitante pueden responder.',
      });
    }

    // Agrega la nueva respuesta al arreglo "respuestas" de la solicitud.
    solicitud.respuestas.push({
      autor: userId,           // Usuario que responde.
      mensaje: mensaje.trim(), // Contenido limpio de espacios.
      fecha: new Date(),       // Fecha/hora actual.
    });

    // Actualiza la fecha de última actualización de la solicitud.
    solicitud.fechaActualizacion = new Date();

    // Guarda los cambios de la solicitud.
    await solicitud.save();

    // Variable para almacenar la alerta si se crea (puede ser null).
    let nuevaAlerta = null;

    // Evita crear alerta si el que responde es el mismo solicitante.
    if (
      solicitud.solicitante &&
      solicitud.solicitante._id.toString() !== userId.toString()
    ) {
      // Código corto para identificar la solicitud en el mensaje.
      const codigoCorto = solicitud._id.toString().slice(-6);

      // Crea una alerta dirigida al solicitante indicando que hay nueva respuesta.
      nuevaAlerta = await Alerta.create({
        usuario: solicitud.solicitante._id, // Destinatario de la alerta.
        tipo: 'solicitud',                 // Tipo de alerta.
        solicitud: solicitud._id,          // Referencia a la solicitud.
        message: `Tienes una nueva respuesta en la solicitud #${codigoCorto}.`, // Mensaje visible.
        resolved: false,                   // Pendiente por defecto.
      });
    }

    // Obtiene la instancia de Socket.io, si está configurada en la app.
    const io = req.app?.get('io');

    if (io) {
      // Emite evento indicando que la solicitud ha sido respondida/actualizada.
      io.emit('solicitud:respuesta', {
        solicitudId: solicitud._id.toString(),                // ID de la solicitud.
        solicitanteId: solicitud.solicitante._id.toString(),  // ID del solicitante.
        updatedAt: solicitud.fechaActualizacion,              // Fecha de actualización.
      });

      // Si se creó una alerta nueva para el solicitante, se emite evento.
      if (nuevaAlerta) {
        io.emit('alerta:nueva', {
          alertaId: nuevaAlerta._id.toString(),               // ID de la alerta.
          usuarioId: nuevaAlerta.usuario
            ? nuevaAlerta.usuario.toString()
            : null,                                           // Usuario destinatario.
          tipo: nuevaAlerta.tipo,                             // Tipo de alerta.
          resolved: nuevaAlerta.resolved,                     // Estado de la alerta.
          createdAt: nuevaAlerta.createdAt || new Date(),     // Fecha de creación.
          solicitudId: nuevaAlerta.solicitud
            ? nuevaAlerta.solicitud.toString()
            : null,                                           // Solicitud asociada.
        });
      }
    }

    // Respuesta HTTP al cliente con la solicitud ya actualizada.
    res.json({
      message: 'Respuesta agregada correctamente a la solicitud.',
      solicitud,
    });
  } catch (error) {
    // Log del error interno.
    console.error('Error al agregar respuesta a la solicitud:', error);

    // Respuesta genérica al cliente.
    res.status(500).json({ error: 'Error al agregar respuesta a la solicitud.' });
  }
};

/**
 * Obtiene el detalle de una solicitud puntual por ID.
 *
 * Reglas de acceso:
 *  - Admin:
 *      → puede ver cualquier solicitud.
 *  - Cualquier otro rol (cliente, líder de obra, etc.):
 *      → sólo puede ver la solicitud si él mismo es el solicitante.
 */
exports.obtenerSolicitudPorId = async (req, res) => {
  try {
    // ID de la solicitud recibido en la URL.
    const { id } = req.params;

    // Rol del usuario autenticado.
    const userRole = req.user.role;

    // ID del usuario autenticado.
    const userId = req.user.id;

    // Busca la solicitud y pobla solicitante, materiales y autores de respuestas.
    const solicitud = await Solicitud.findById(id)
      .populate('solicitante', 'firstName lastName email role')       // Datos del solicitante.
      .populate('materiales.material', 'nombre descripcion')          // Info de materiales.
      .populate('respuestas.autor', 'firstName lastName email role'); // Datos de quienes respondieron.

    // Si no se encontró la solicitud, responde 404.
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    // Si es admin, puede ver cualquier solicitud sin más validaciones.
    if (userRole === 'admin') {
      return res.json(solicitud);
    }

    // Para cualquier otro rol, se valida que sea el solicitante de esa solicitud.
    const esSolicitante =
      solicitud.solicitante &&
      solicitud.solicitante._id &&
      solicitud.solicitante._id.toString() === userId;

    if (!esSolicitante) {
      return res
        .status(403)
        .json({ error: 'No tienes permiso para ver esta solicitud.' });
    }

    // Si pasa la validación, se devuelve el detalle completo.
    res.json(solicitud);
  } catch (error) {
    // Log en servidor.
    console.error('Error al obtener detalle de la solicitud:', error);

    // Respuesta genérica al cliente.
    res.status(500).json({ error: 'Error al obtener detalle de la solicitud.' });
  }
};
