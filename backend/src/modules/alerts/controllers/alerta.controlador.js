// File: BackEnd/src/modules/alerts/controllers/alerta.controlador.js
// Description: Controlador para listar y resolver alertas del sistema.
//              Aplica filtros por query, paginación y restringe la
//              visibilidad según el rol del usuario autenticado. Incluye
//              emisión de eventos por Socket.io cuando una alerta se
//              marca como resuelta.

const Alerta = require('../models/alerta.modelo');  // Importa el modelo Mongoose de alertas

/**
 * Listar alertas con filtros opcionales.
 *
 * Permite filtrar por:
 *  - proyecto: ID del proyecto asociado a la alerta.
 *  - material: ID del material asociado a la alerta.
 *  - solicitud: ID de una solicitud asociada a la alerta.
 *  - tipo: tipo de alerta (presupuesto, stock, asignacion, solicitud, proyecto).
 *  - resolved: true / false (alertas resueltas o pendientes).
 *
 * Además:
 *  - Aplica paginación con page y limit.
 *  - Ordena las alertas por fecha de creación descendente.
 *  - Restringe la visibilidad según el rol del usuario:
 *      * admin: ve todas las alertas.
 *      * otros roles: sólo ven las alertas dirigidas a ese usuario
 *        (alerta.usuario = req.user.id).
 */
exports.listAlertas = async (req, res) => {
  try {
    // Extraemos posibles filtros desde los query params de la URL
    const {
      proyecto,   // ID del proyecto a filtrar (opcional)
      material,   // ID del material a filtrar (opcional)
      tipo,       // Tipo de alerta (opcional)
      resolved,   // "true" o "false" para filtrar por resueltas/pendientes
      page = 1,   // Número de página para paginación (por defecto 1)
      limit = 20, // Tamaño de página (por defecto 20)
      solicitud,  // ID de una solicitud asociada a la alerta (opcional)
    } = req.query;

    // Obtenemos datos del usuario autenticado desde el middleware de auth
    const userRole = req.user?.role; // Rol actual (admin, lider de obra, cliente, etc.)
    const userId = req.user?.id;     // ID del usuario actual (string de Mongo)

    // Objeto base de filtros que se aplicarán a la consulta de Mongoose
    const filter = {};

    // Si viene un proyecto por query, filtramos por ese proyecto específico
    if (proyecto) filter.proyecto = proyecto;

    // Si viene un material por query, filtramos por ese material específico
    if (material) filter.material = material;

    // Si viene una solicitud por query, filtramos por esa solicitud específica
    if (solicitud) filter.solicitud = solicitud;

    // Filtro por tipo de alerta (presupuesto, stock, asignacion, solicitud, proyecto)
    if (tipo) filter.tipo = tipo;

    // Filtro por estado de resolución de la alerta:
    //  - resolved = 'true'  → sólo resueltas
    //  - resolved = 'false' → sólo no resueltas
    if (resolved === 'true') filter.resolved = true;
    if (resolved === 'false') filter.resolved = false;

    // 🔐 Restricción por rol del usuario autenticado:
    //    - Admin: ve todas las alertas (no se aplica filtro por usuario).
    //    - Otros roles (lider de obra, cliente, etc.): sólo ven alertas
    //      donde alerta.usuario coincide con su propio ID.
    //
    //    Esto también implica:
    //    - Alertas "globales" (sin usuario) sólo las ve el admin.
    if (userRole && userRole !== 'admin') {
      filter.usuario = userId;
    }

    // Normalizamos page y limit a enteros con valores por defecto seguros
    const pageNumber =
      Number.parseInt(page, 10) > 0 ? Number.parseInt(page, 10) : 1;
    const limitNumber =
      Number.parseInt(limit, 10) > 0 ? Number.parseInt(limit, 10) : 20;

    // Cálculo del número de documentos a saltar para la paginación
    const skip = (pageNumber - 1) * limitNumber;

    // Contamos el total de alertas que cumplen el filtro (para paginación)
    const total = await Alerta.countDocuments(filter);

    // Buscamos las alertas aplicando filtros, orden, paginación y populate
    const alertas = await Alerta.find(filter)
      .sort({ createdAt: -1 }) // Orden descendente por fecha de creación
      .skip(skip)              // Saltamos los registros de páginas anteriores
      .limit(limitNumber)      // Limitamos al tamaño de página solicitado
      // Poblamos proyecto para obtener título,
      // material para el nombre y usuario para mostrar el destinatario
      .populate('proyecto', 'title')                       // Sólo el campo title del proyecto
      .populate('material', 'nombre')                      // Sólo el nombre del material
      .populate('usuario', 'firstName lastName email role')// Datos básicos del usuario destinatario
      // Traer también datos básicos de la solicitud asociada (si existe)
      .populate('solicitud', 'tipo titulo estado');        // Permite al frontend abrir el detalle de la solicitud

    // Devolvemos las alertas junto con la información de paginación
    res.status(200).json({
      alertas,                           // Lista de alertas encontradas
      total,                             // Total de alertas que cumplen el filtro
      page: pageNumber,                  // Página actual
      pages: Math.ceil(total / limitNumber), // Número total de páginas
    });
  } catch (error) {
    // Log de error para diagnóstico en servidor
    console.error('Error al listar alertas:', error);
    // Respuesta genérica de error al cliente
    res.status(500).json({ message: 'Error al listar alertas' });
  }
};

/**
 * Permite marcar una alerta como resuelta.
 *
 * Casos de uso:
 *  - Silenciar alertas de presupuesto una vez revisadas.
 *  - Marcar como atendidas las alertas de stock o solicitudes.
 *
 * Reglas de seguridad:
 *  - La ruta debe estar protegida por autenticación.
 *  - Admin puede resolver cualquier alerta.
 *  - Otros roles sólo pueden resolver alertas dirigidas a ellos
 *    (alerta.usuario = req.user.id). Si la alerta no tiene usuario
 *    (alerta global), sólo admin la puede resolver.
 *
 * Además, emite un evento Socket.io "alerta:resuelta" para que
 * el frontend pueda actualizar dashboards/badges en tiempo real.
 */
exports.resolverAlerta = async (req, res) => {
  // Extraemos el ID de la alerta desde los parámetros de la ruta
  const { id } = req.params;

  try {
    // Validamos que exista un usuario autenticado antes de continuar
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    // Buscamos la alerta por su ID en la base de datos
    const alerta = await Alerta.findById(id);

    // Si no existe la alerta, devolvemos 404
    if (!alerta) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }

    // Obtenemos rol e ID del usuario que intenta resolver la alerta
    const userRole = req.user.role;
    const userId = req.user.id;

    // 🔐 Reglas de autorización:
    //  - Si NO es admin:
    //      * Sólo puede resolver alertas que estén dirigidas a él
    //        (alerta.usuario = su ID).
    //      * Si la alerta no tiene usuario (alerta "global"),
    //        sólo el admin puede resolverla.
    if (userRole !== 'admin') {
      // Si la alerta no tiene usuario asignado o no coincide con el actual, denegamos
      if (!alerta.usuario || alerta.usuario.toString() !== userId) {
        return res
          .status(403)
          .json({ message: 'No tienes permiso para resolver esta alerta.' });
      }
    }

    // Marcamos la alerta como resuelta
    alerta.resolved = true;

    // Al resolverla, también tiene sentido marcarla como vista
    // y registrar la fecha de visualización si aún no se había marcado.
    if (!alerta.visto) {
      alerta.visto = true;
      alerta.fechaVisto = new Date();
    }

    // Guardamos el cambio en la base de datos
    await alerta.save();

    // 🛰 Emisión de evento en tiempo real vía Socket.io para actualizar
    //     dashboards / badges de alertas en el frontend sin recargar.
    //
    // Obtenemos la instancia de Socket.io que se guardó en server.js con app.set('io', io)
    const io = req.app?.get('io');

    // Si existe la instancia de Socket.io, emitimos el evento
    if (io) {
      io.emit('alerta:resuelta', {
        alertaId: alerta._id.toString(),                         // ID de la alerta resuelta
        usuarioId: alerta.usuario ? alerta.usuario.toString() : null, // ID del destinatario (si aplica)
        tipo: alerta.tipo,                                       // Tipo de alerta (presupuesto, stock, solicitud, proyecto, etc.)
        resolved: true,                                          // Estado actualizado
        updatedAt: new Date().toISOString(),                     // Sello de tiempo para que el cliente pueda sincronizar
      });
    }

    // Respondemos al cliente con la alerta actualizada
    res.status(200).json({
      message: 'Alerta marcada como resuelta',
      alerta,
    });
  } catch (error) {
    // Log de error en servidor para depuración
    console.error('Error al resolver alerta:', error);
    // Respuesta genérica de error al cliente
    res.status(500).json({ message: 'Error al resolver alerta' });
  }
};

/**
 * Marcar una alerta como vista/no vista.
 *
 * Este controlador permite al usuario marcar una alerta como leída (visto = true) o
 * desmarcarla (visto = false). Al marcar una alerta como vista también se
 * actualiza la fecha de visualización (fechaVisto). Si se marca como no
 * vista, se elimina la fechaVisto para dejar constancia de que el usuario
 * aún no la ha revisado.
 *
 * Reglas de autorización:
 *  - El administrador puede marcar cualquier alerta como vista o no vista.
 *  - Otros roles solo pueden modificar alertas dirigidas a ellos (alerta.usuario).
 *    Las alertas globales (sin usuario) solo las puede marcar el admin.
 */
exports.marcarAlertaVisto = async (req, res) => {
  const { id } = req.params;
  // Se espera un booleano en el cuerpo; si no se envía, se asume true.
  const { visto } = req.body;

  try {
    // Verifica autenticación
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    // Busca la alerta por su ID
    const alerta = await Alerta.findById(id);
    if (!alerta) {
      return res.status(404).json({ message: 'Alerta no encontrada' });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Restricciones: sólo admin o destinatario puede actualizar la alerta
    if (userRole !== 'admin') {
      // Si la alerta no tiene usuario asignado o no coincide con el actual, no tiene permiso
      if (!alerta.usuario || alerta.usuario.toString() !== userId) {
        return res.status(403).json({ message: 'No tienes permiso para modificar esta alerta.' });
      }
    }

    // Determina el nuevo valor de visto: por defecto true si no se envía
    const nuevoVisto = typeof visto === 'boolean' ? visto : true;
    alerta.visto = nuevoVisto;
    if (nuevoVisto) {
      // Si se marca como vista y no tiene fecha de visto, regístrala
      alerta.fechaVisto = alerta.fechaVisto || new Date();
    } else {
      // Si se marca como no vista, borramos la fecha
      alerta.fechaVisto = undefined;
    }

    await alerta.save();

    // Emitimos evento en tiempo real para sincronizar interfaces
    const io = req.app?.get('io');
    if (io) {
      io.emit('alerta:vista', {
        alertaId: alerta._id.toString(),
        usuarioId: alerta.usuario ? alerta.usuario.toString() : null,
        visto: alerta.visto,
        fechaVisto: alerta.fechaVisto,
      });
    }

    return res.status(200).json({
      message: `Alerta marcada como ${nuevoVisto ? 'vista' : 'no vista'}`,
      alerta,
    });
  } catch (error) {
    console.error('Error al marcar alerta como vista:', error);
    return res.status(500).json({ message: 'Error al actualizar la alerta' });
  }
};
