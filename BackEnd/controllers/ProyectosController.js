// File: BackEnd/controllers/ProyectosController.js                                   // Ruta del archivo dentro del proyecto
// Descripción: Controlador de Proyectos con integridad referencial hacia User.       // Propósito general
// - Crea proyectos resolviendo owner por id/email y team por ids/emails.             // Entradas soportadas
// - Usa transacciones para atomicidad en creación.                                    // Atomicidad en POST
// - Lecturas con populate para enriquecer respuestas.                                 // Mejora de respuestas
// - Endpoints seguros para validar tipos/fechas/estados y unicidad {owner,title}.     // Reglas de negocio/validación

const mongoose = require('mongoose');                                                // Importa mongoose para sesiones/transacciones y ObjectId
const Proyectos = require('../models/Proyectos');                                    // Modelo Proyectos (owner/team como ObjectId)
const User = require('../models/User');                                              // Modelo User (para resolver owner/client/team)
const { sendProjectRequestEmail } = require('../services/ServiceEmail');             // Servicio de correo (manejado con try/catch)

// -----------------------------------------------------------------------------
// Utilidades                                                                    // Sección de helpers locales
// -----------------------------------------------------------------------------

const isValidEmail = (email) => /^[\w.-]+@[\w.-]+\.\w+$/.test(String(email));       // Valida formato básico de email

const toDateOrNull = (value) => {                                                   // Intenta convertir valor a Date
  if (!value) return null;                                                          // Si no hay valor, retorna null
  const d = new Date(value);                                                        // Construye Date
  return isNaN(d.getTime()) ? null : d;                                             // Retorna null si inválida
};                                                                                  // Cierra toDateOrNull

// ===== Estados: aceptar ES/EN y guardar en EN canónico (enum del Schema) =====   // Normalización de status
const STATUS_CANONICALS = Proyectos.schema.path('status')?.enumValues || [];        // Enum real del modelo (p.ej. ['planning','in-progress','paused','done','canceled'])

// Mapa de alias (ES y variantes EN) → valor canónico del modelo                   // Permite inputs flexibles del front
const STATUS_ALIASES = {                                                            // Tabla de equivalencias
  // ---- Español → Inglés canónico ----
  'borrador': 'planning',
  'en progreso': 'in-progress',
  'en_progreso': 'in-progress',
  'en-progreso': 'in-progress',
  'en pausa': 'paused',
  'en_pausa': 'paused',
  'completado': 'done',
  'finalizado': 'done',
  'cancelado': 'canceled',

  // ---- Inglés variantes → Inglés canónico ----
  'planning': 'planning',                                                           // ya canónico
  'in-progress': 'in-progress',                                                     // canónico
  'in_progress': 'in-progress',                                                     // alias underscore
  'paused': 'paused',                                                               // canónico
  'done': 'done',                                                                   // canónico
  'completed': 'done',                                                              // alias aceptado
  'canceled': 'canceled',                                                           // canónico (US)
  'cancelled': 'canceled',                                                          // alias (UK) → US
};                                                                                  // Fin STATUS_ALIASES

const normalizeStatus = (s) => {                                                    // Normaliza valor recibido (ES/EN → EN canónico)
  if (s == null) return undefined;                                                  // Deja undefined si no viene
  const key = String(s).trim().toLowerCase();                                       // Lower + trim
  return STATUS_ALIASES[key] || key;                                                // Mapea alias o deja tal cual
};                                                                                  // Cierra normalizeStatus

const isValidStatus = (s) => {                                                      // Valida contra enum canónico del modelo
  const norm = normalizeStatus(s);                                                  // Normaliza primero
  return typeof norm === 'string' && STATUS_CANONICALS.includes(norm);              // Debe existir en el enum del Schema
};                                                                                  // Cierra isValidStatus

// Deduplicación de ObjectId: Set por string y luego reconstrucción a ObjectId       // Para evitar duplicados por referencia
const dedupeObjectIds = (ids) => {                                                  // Recibe arreglo de ObjectId o strings
  const asStrings = ids.map((x) => String(x));                                      // Convierte cada id a string
  const unique = Array.from(new Set(asStrings));                                    // Dedup por string
  return unique.map((id) => new mongoose.Types.ObjectId(id));                       // Retorna como ObjectId[]
};                                                                                  // Cierra dedupeObjectIds

// Collation español consistente con índices (para comparaciones de texto)           // Útil en consultas previas a insertar
const ES_COLLATION = { locale: 'es', strength: 2 };                                 // Fuerza comparación case-insensitive básica

// -----------------------------------------------------------------------------
// GET /proyectos  — Obtener todos los proyectos (según tu política de acceso)   // Listado general
// -----------------------------------------------------------------------------
const getProyectos = async (req, res) => {                                          // Handler de lectura
  try {                                                                             // Manejo de errores
    const proyectos = await Proyectos                                               // Inicia consulta
      .find()                                                                       // Sin filtro (ajusta según rol si quieres)
      .populate('owner client team', 'firstName lastName email role');              // Enriquecer con datos de User
    return res.status(200).json(proyectos);                                         // Respuesta OK
  } catch (error) {                                                                 // En caso de error
    console.error('Error getProyectos:', error);                                    // Log técnico
    return res.status(500).json({ message: 'Error al obtener proyectos' });         // Mensaje genérico
  }                                                                                 // Fin catch
};                                                                                  // Fin getProyectos

// -----------------------------------------------------------------------------
// GET /proyectos/recientes  — Últimos 5 por fecha de creación                   // Listado de recientes
// -----------------------------------------------------------------------------
const getProyectosRecientes = async (req, res) => {                                 // Handler recientes
  try {                                                                             // Manejo de errores
    const proyectos = await Proyectos                                               // Inicia consulta
      .find()                                                                       // Sin filtro (ajusta por rol si deseas)
      .sort({ createdAt: -1 })                                                      // Más recientes primero
      .limit(5)                                                                     // Límite 5
      .populate('owner client team', 'firstName lastName email role');              // Populate
    return res.status(200).json(proyectos);                                         // Respuesta OK
  } catch (error) {                                                                 // En caso de error
    console.error('Error getProyectosRecientes:', error);                           // Log técnico
    return res.status(500).json({ message: 'Error al obtener proyectos recientes' });// Error genérico
  }                                                                                 // Fin catch
};                                                                                  // Fin getProyectosRecientes

// -----------------------------------------------------------------------------
// POST /proyectos  — Crear proyecto con integridad referencial (transacción)    // Crea con FK lógicas
// Body soportado:                                                                // Cuerpo permitido
// {                                                                              // Abre ejemplo
//   title, location, type, budget, duration, description, priority,              // Campos informativos
//   startDate, endDate, status?, progress?,                                      // Fechas/estado/avance (status/progress opcionales)
//   ownerId | ownerEmail,                                                        // Owner por id o email (requerido uno)
//   clientId? | clientEmail?,                                                    // Client opcional por id o email
//   teamIds?: [], teamEmails?: []                                                // Team por ids y/o emails
// }                                                                              // Cierra ejemplo
// -----------------------------------------------------------------------------
const crearProyecto = async (req, res) => {                                        // Handler crear
  const session = await mongoose.startSession();                                   // Abre sesión para transacción
  session.startTransaction();                                                      // Inicia transacción
  try {                                                                            // Bloque try
    const {                                                                       // Extrae campos del body
      title, location, type, budget, duration, description, priority,              // Campos informativos
      startDate, endDate, status, progress,                                        // Fechas/estado/avance
      ownerId, ownerEmail,                                                         // Owner por id/email
      clientId, clientEmail,                                                       // Client opcional
      teamIds = [], teamEmails = []                                                // Team por ids/emails
    } = req.body;                                                                  // Cierra destructuring

    if (!title)                                                                    // Título requerido
      return res.status(400).json({ message: 'El título es obligatorio' });        // 400 si falta

    if (!ownerId && !ownerEmail)                                                   // Owner requerido (id o email)
      return res.status(400).json({ message: 'Debes indicar ownerId o ownerEmail' }); // 400 si faltan ambos

    if (budget != null && (isNaN(Number(budget)) || Number(budget) < 0))           // budget numérico ≥ 0
      return res.status(400).json({ message: 'El presupuesto debe ser un número válido (>= 0)' }); // 400

    if (duration != null && (isNaN(Number(duration)) || Number(duration) < 0))     // duration numérico ≥ 0
      return res.status(400).json({ message: 'La duración debe ser un número válido (>= 0)' });   // 400

    const start = toDateOrNull(startDate);                                         // Normaliza startDate
    const end = toDateOrNull(endDate);                                             // Normaliza endDate
    if ((startDate && !start) || (endDate && !end))                                // Si se envían pero son inválidas
      return res.status(400).json({ message: 'Las fechas deben ser válidas' });    // 400
    if (start && end && start > end)                                               // start <= end
      return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' }); // 400

    // ----- Resolver owner por id o email -----
    let owner = null;                                                              // Inicializa owner
    if (ownerId) {                                                                 // Si viene ownerId
      owner = await User.findById(ownerId).session(session);                       // Busca por id (en sesión)
    } else {                                                                       // Si no, viene ownerEmail
      if (!isValidEmail(ownerEmail))                                               // Valida formato de email
        return res.status(400).json({ message: 'ownerEmail no es válido' });       // 400 si inválido
      owner = await User.findOne({                                                 // Busca por email
        email: String(ownerEmail).toLowerCase().trim()                             // Normaliza email para el match
      }).session(session);                                                         // En sesión
    }
    if (!owner)                                                                    // Debe existir User como owner
      return res.status(400).json({ message: 'Owner no encontrado (ownerId/ownerEmail inválido)' }); // 400

    // ====== PRECHEQUEO DE DUPLICADO {owner,title} (ANTES de validar team) ====== // Evita 400 por team y respeta 409
    const normalizedTitle = String(title).trim();                                   // Normaliza título
    const dup = await Proyectos                                                    // Busca duplicado con misma collation del índice
      .findOne({ owner: owner._id, title: normalizedTitle })
      .collation(ES_COLLATION);                                                    // Colación ES (case-insensitive básica)
    if (dup) {                                                                     // Si ya existe
      return res.status(409).json({ message: 'Ya existe un proyecto con ese título para este owner' }); // 409
    }

    // ----- Resolver client (opcional) -----
    let client = null;                                                             // Inicializa client
    if (clientId || clientEmail) {                                                 // Solo si lo envían
      client = clientId                                                            // Si hay id
        ? await User.findById(clientId).session(session)                           // Busca por id (en sesión)
        : (isValidEmail(clientEmail)                                               // Si hay email válido
           ? await User.findOne({ email: String(clientEmail).toLowerCase().trim() }).session(session) // Busca por email
           : null);                                                                // Si no es válido, null
      if (!client && (clientId || clientEmail))                                    // Si indicaron cliente pero no existe
        return res.status(400).json({ message: 'Cliente indicado no existe' });    // 400
    }

    // ----- Resolver team desde ids/emails (después del prechequeo de duplicado) -----
    const teamFromIds = Array.isArray(teamIds) && teamIds.length                   // Team por ids (si vienen)
      ? (await User.find({ _id: { $in: teamIds } }).session(session)).map(u => u._id) // Proyecta _ids válidos
      : [];                                                                         // Si no, vacío
    if (Array.isArray(teamIds) && teamIds.length && teamFromIds.length !== teamIds.length) // Confirma existencia 1:1
      return res.status(400).json({ message: 'Algunos teamIds no existen' });      // 400

    const normTeamEmails = Array.isArray(teamEmails)                                // Normaliza teamEmails
      ? teamEmails.map(e => String(e).toLowerCase().trim()).filter(Boolean)         // lower+trim+borra vacíos
      : [];                                                                          // Vacío si no vienen
    for (const e of normTeamEmails) {                                               // Valida cada email
      if (!isValidEmail(e))                                                         // Si no es válido
        return res.status(400).json({ message: `Email inválido en teamEmails: ${e}` }); // 400
    }
    const teamFromEmails = normTeamEmails.length                                    // Team por emails (si vienen)
      ? (await User.find({ email: { $in: normTeamEmails } }).session(session)).map(u => u._id) // _ids por email
      : [];                                                                          // Vacío si no hay emails
    if (normTeamEmails.length && teamFromEmails.length !== normTeamEmails.length)    // Confirma existencia 1:1
      return res.status(400).json({ message: 'Algunas teamEmails no corresponden a usuarios' }); // 400

    const teamDedup = dedupeObjectIds([...teamFromIds, ...teamFromEmails]);         // Dedup correcto del team

    // ----- Normalizaciones de prioridad/estado/progreso -----
    const safePriority = ['alta','media','baja'].includes(priority) ? priority : 'media'; // Prioridad segura

    // Status: aceptar ES/EN → EN; solo si viene en el body (default lo pone el Schema) // Política de status
    let normalizedStatus = undefined;                                               // Undefined si no lo envían
    if (typeof status !== 'undefined') {                                            // Si el cliente envía status
      if (!isValidStatus(status)) {                                                 // Validamos contra enum del Schema (EN)
        return res.status(400).json({                                               // 400 si inválido
          message: 'Estado inválido. Usa: borrador, en progreso, en pausa, completado, cancelado (o planning, in-progress, paused, done, canceled)'
        });
      }
      normalizedStatus = normalizeStatus(status);                                   // Normaliza a EN canónico
    }

    // Progress: opcional; validamos rango si lo envían                               // Evita imponer valor si el Schema ya define default
    let safeProgress;                                                                // undefined si no lo envían
    if (progress != null) {                                                          // Si viene progress
      const n = Number(progress);                                                    // Convierte a número
      if (Number.isNaN(n) || n < 0 || n > 100)                                       // Valida rango 0..100
        return res.status(400).json({ message: 'El progreso debe estar entre 0 y 100' }); // 400
      safeProgress = n;                                                              // Asigna progreso validado
    }

    // ----- Construcción del documento a insertar -----
    const doc = {                                                                    // Solo seteamos campos presentes/válidos
      title: normalizedTitle,                                                        // Título limpio (ya normalizado)
      owner: owner._id,                                                              // Owner como ObjectId
      client: client ? client._id : null,                                            // Client (opcional)
      team: teamDedup,                                                               // Team deduplicado
      location: location ? String(location).trim() : undefined,                      // Ubicación
      type: type ? String(type).trim() : undefined,                                  // Tipo
      budget: budget != null ? Number(budget) : undefined,                           // Presupuesto opcional
      duration: duration != null ? Number(duration) : undefined,                     // Duración opcional
      description: description ? String(description).trim() : undefined,             // Descripción
      priority: safePriority,                                                        // Prioridad normalizada
      startDate: start || undefined,                                                 // Fecha inicio (si válida)
      endDate: end || undefined                                                      // Fecha fin (si válida)
    };                                                                               // Cierra doc

    if (typeof normalizedStatus !== 'undefined') doc.status = normalizedStatus;      // Solo setea status si lo enviaron (EN)
    if (typeof safeProgress !== 'undefined') doc.progress = safeProgress;            // Solo setea progress si lo enviaron

    // ----- Crear dentro de la transacción -----
    const [proyecto] = await Proyectos.create([doc], { session });                   // Inserta en sesión

    // ----- Email opcional (no bloquea) -----
    try {                                                                            // Intenta enviar notificación
      await sendProjectRequestEmail({                                                // Llama servicio de email
        name: proyecto.title,                                                        // Título del proyecto
        email: owner.email,                                                          // Email del owner (si tu plantilla lo usa)
        phone: owner.phone || '',                                                    // Teléfono (si existe)
        projectType: proyecto.type || '',                                            // Tipo de proyecto
        location: proyecto.location || '',                                           // Ubicación
        message: proyecto.description || 'Proyecto creado'                           // Mensaje
      });                                                                            // Fin sendProjectRequestEmail
    } catch (emailError) {                                                           // Captura error de correo
      console.warn('Advertencia: fallo envío de correo (no bloquea creación):', emailError); // Log no bloqueante
    }                                                                                // Fin catch email

    await session.commitTransaction();                                               // Confirma transacción
    session.endSession();                                                            // Cierra sesión

    // ----- Responder con populate para comodidad del front -----
    const populated = await Proyectos                                                // Relee para popular respuesta
      .findById(proyecto._id)                                                        // Busca por id
      .populate('owner client team', 'firstName lastName email role');               // Populate de relaciones
    return res.status(201).json({ message: 'Proyecto creado exitosamente', proyecto: populated }); // 201 OK
  } catch (error) {                                                                  // En caso de error
    await session.abortTransaction();                                                // Revierte transacción
    session.endSession();                                                            // Cierra sesión
    console.error('Error crearProyecto:', error);                                    // Log técnico
    if (error?.code === 11000)                                                       // Duplicado índice {owner,title}
      return res.status(409).json({ message: 'Ya existe un proyecto con ese título para este owner' }); // 409
    if (error?.name === 'ValidationError')                                           // Error de validación Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors });               // 400
    return res.status(500).json({ message: 'Error al registrar el proyecto' });      // 500 genérico
  }                                                                                  // Fin catch
};                                                                                   // Fin crearProyecto

// -----------------------------------------------------------------------------
// GET /proyectos/mis-proyectos  — Proyectos del usuario autenticado             // Listado del owner autenticado
// -----------------------------------------------------------------------------
const getProyectosUsuario = async (req, res) => {                                   // Handler my projects
  try {                                                                             // Manejo de errores
    const userId = req.user?.id || req.user?._id;                                   // Toma id del token/middleware
    if (!userId)                                                                    // Si no hay id
      return res.status(401).json({ message: 'No autorizado' });                    // 401
    const proyectosUsuario = await Proyectos                                        // Consulta por owner
      .find({ owner: userId })                                                      // Filtro por owner
      .sort({ createdAt: -1 })                                                      // Ordena por recientes
      .populate('owner client team', 'firstName lastName email role');              // Populate
    return res.status(200).json(proyectosUsuario);                                  // OK
  } catch (error) {                                                                 // En caso de error
    console.error('Error getProyectosUsuario:', error);                             // Log técnico
    return res.status(500).json({ message: 'Error al obtener proyectos del usuario' }); // 500
  }                                                                                 // Fin catch
};                                                                                  // Fin getProyectosUsuario

// -----------------------------------------------------------------------------
// PATCH/PUT /proyectos/:id  — Actualizar proyecto por ID con validaciones       // Actualización con reglas
// -----------------------------------------------------------------------------
const updateProyectoById = async (req, res) => {                                    // Handler update
  try {                                                                             // Manejo de errores
    const proyectoId = req.params.id;                                               // Toma id de la URL
    const {                                                                         // Campos editables
      title, location, type, budget, duration, description, priority,               // Strings/números/enum
      startDate, endDate, status, progress,                                         // Fechas/estado/avance
      ownerId, ownerEmail, clientId, clientEmail,                                   // Cambios de owner/client
      teamIds, teamEmails                                                           // Reemplazo de team
    } = req.body;                                                                    // Cierra destructuring

    const proyecto = await Proyectos.findById(proyectoId);                          // Busca proyecto
    if (!proyecto)                                                                  // Si no existe
      return res.status(404).json({ message: 'Proyecto no encontrado' });           // 404

    // ----- Resolver owner si viene cambio (solo para conocer el owner efectivo) -----
    let effectiveOwnerId = proyecto.owner;                                          // Por defecto, el actual
    if (ownerId || ownerEmail) {                                                    // Si piden cambiar owner
      let owner = null;                                                             // Resuelve owner
      if (ownerId) owner = await User.findById(ownerId);                            // Por id
      else if (ownerEmail) {                                                        // Por email
        if (!isValidEmail(ownerEmail))                                              // Valida formato
          return res.status(400).json({ message: 'ownerEmail no es válido' });      // 400
        owner = await User.findOne({ email: String(ownerEmail).toLowerCase().trim() }); // Busca por email
      }
      if (!owner)                                                                   // Debe existir
        return res.status(400).json({ message: 'Owner indicado no existe' });       // 400
      effectiveOwnerId = owner._id;                                                 // Owner “nuevo” para prechequeo
      proyecto.owner = owner._id;                                                   // Asigna al documento
    }

    // ----- Prechequeo duplicado {owner,title} (antes de validar team) -----
    const effectiveTitle = (title ? String(title).trim() : String(proyecto.title).trim()); // Título que quedará
    const dup = await Proyectos                                                    // Busca otro doc con mismo {owner,title}
      .findOne({ _id: { $ne: proyectoId }, owner: effectiveOwnerId, title: effectiveTitle })
      .collation(ES_COLLATION);                                                    // Colación ES
    if (dup) {                                                                     // Si existe alguno
      return res.status(409).json({ message: 'Ya existe un proyecto con ese título para este owner' }); // 409
    }

    // ----- Resolver client si envían cambio de client (opcional) -----
    if (clientId || clientEmail) {                                                  // Cambio de client (opcional)
      let client = null;                                                            // Resuelve client
      if (clientId) client = await User.findById(clientId);                         // Por id
      else if (clientEmail) {                                                       // Por email
        if (!isValidEmail(clientEmail))                                             // Valida formato
          return res.status(400).json({ message: 'clientEmail no es válido' });     // 400
        client = await User.findOne({ email: String(clientEmail).toLowerCase().trim() }); // Busca por email
      }
      if (!client && (clientId || clientEmail))                                     // Si indicaron pero no existe
        return res.status(400).json({ message: 'Cliente indicado no existe' });     // 400
      proyecto.client = client ? client._id : null;                                 // Asigna o limpia
    }

    // ----- Team (reemplazo completo si lo envían) — lo dejamos después del 409 -----
    if (teamIds || teamEmails) {                                                    // Si envían team
      const ids = Array.isArray(teamIds) ? teamIds : [];                            // Normaliza ids
      const emails = Array.isArray(teamEmails)                                      // Normaliza emails (lower+trim)
        ? teamEmails.map(e => String(e).toLowerCase().trim()).filter(Boolean)
        : [];
      for (const e of emails) {                                                     // Valida emails
        if (!isValidEmail(e))                                                       // Si inválido
          return res.status(400).json({ message: `Email inválido en teamEmails: ${e}` }); // 400
      }
      const fromIds = ids.length                                                    // _id por ids
        ? (await User.find({ _id: { $in: ids } })).map(u => u._id)
        : [];
      if (ids.length && fromIds.length !== ids.length)                              // Verifica que existan todos
        return res.status(400).json({ message: 'Algunos teamIds no existen' });     // 400
      const fromEmails = emails.length                                              // _id por emails
        ? (await User.find({ email: { $in: emails } })).map(u => u._id)
        : [];
      if (emails.length && fromEmails.length !== emails.length)                     // Verifica que existan todos
        return res.status(400).json({ message: 'Algunas teamEmails no corresponden a usuarios' }); // 400
      proyecto.team = dedupeObjectIds([...fromIds, ...fromEmails]);                 // Dedup correcto
    }

    // ----- Campos simples -----
    if (title) proyecto.title = effectiveTitle;                                     // Título (ya normalizado)
    if (location) proyecto.location = String(location).trim();                      // Ubicación (si viene)
    if (type) proyecto.type = String(type).trim();                                  // Tipo (si viene)
    if (description != null) proyecto.description = String(description).trim();     // Descripción (si viene)

    // ----- Números -----
    if (budget != null) {                                                           // Presupuesto (si viene)
      const n = Number(budget);                                                     // Convierte
      if (Number.isNaN(n) || n < 0)                                                 // Valida
        return res.status(400).json({ message: 'El presupuesto debe ser un número válido (>= 0)' }); // 400
      proyecto.budget = n;                                                          // Asigna
    }
    if (duration != null) {                                                         // Duración (si viene)
      const n = Number(duration);                                                   // Convierte
      if (Number.isNaN(n) || n < 0)                                                 // Valida
        return res.status(400).json({ message: 'La duración debe ser un número válido (>= 0)' }); // 400
      proyecto.duration = n;                                                        // Asigna
    }

    // ----- Fechas -----
    if (startDate) {                                                                // startDate (si viene)
      const d = toDateOrNull(startDate);                                            // Convierte
      if (!d) return res.status(400).json({ message: 'Fecha de inicio inválida' }); // 400
      proyecto.startDate = d;                                                       // Asigna
    }
    if (endDate) {                                                                  // endDate (si viene)
      const d = toDateOrNull(endDate);                                              // Convierte
      if (!d) return res.status(400).json({ message: 'Fecha de fin inválida' });    // 400
      proyecto.endDate = d;                                                         // Asigna
    }
    if (proyecto.startDate && proyecto.endDate && proyecto.startDate > proyecto.endDate) // Regla temporal
      return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' }); // 400

    // ----- Prioridad -----
    if (priority) {                                                                 // Prioridad (si viene)
      if (!['alta','media','baja'].includes(priority))                              // Valida enum
        return res.status(400).json({ message: 'Prioridad inválida (alta, media, baja)' }); // 400
      proyecto.priority = priority;                                                 // Asigna
    }

    // ----- Status (ES/EN aceptado → guardamos EN canónico) -----
    if (typeof status !== 'undefined') {                                            // Si viene status
      if (!isValidStatus(status))                                                   // Validamos contra enum del modelo (EN)
        return res.status(400).json({                                               // 400 si inválido
          message: 'Estado inválido. Usa: borrador, en progreso, en pausa, completado, cancelado (o planning, in-progress, paused, done, canceled)'
        });
      proyecto.status = normalizeStatus(status);                                    // Guarda EN canónico
    }

    // ----- Progress -----
    if (progress != null) {                                                         // Avance (si viene)
      const n = Number(progress);                                                   // Convierte
      if (Number.isNaN(n) || n < 0 || n > 100)                                      // Valida rango
        return res.status(400).json({ message: 'El progreso debe estar entre 0 y 100' }); // 400
      proyecto.progress = n;                                                        // Asigna
    }

    await proyecto.save();                                                          // Persiste cambios

    const populated = await Proyectos.findById(proyecto._id)                        // Relee populado
      .populate('owner client team', 'firstName lastName email role');              // Populate
    return res.status(200).json({ message: 'Proyecto actualizado correctamente', proyecto: populated }); // OK
  } catch (error) {                                                                 // En caso de error
    console.error('Error updateProyectoById:', error);                              // Log
    if (error?.code === 11000)                                                      // Choque por índice único {owner,title}
      return res.status(409).json({ message: 'Ya existe un proyecto con ese título para este owner' }); // 409
    if (error?.name === 'ValidationError')                                          // Error de validación
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors });               // 400
    return res.status(500).json({ message: 'Error al actualizar proyecto' });       // 500
  }                                                                                 // Fin catch
};                                                                                  // Fin updateProyectoById

// -----------------------------------------------------------------------------
// DELETE /proyectos/:id  — Eliminar proyecto por ID                             // Eliminación simple
// -----------------------------------------------------------------------------
const deleteProyectoById = async (req, res) => {                                   // Handler delete
  try {                                                                             // Manejo de errores
    const proyectoId = req.params.id;                                               // Id URL
    const proyecto = await Proyectos.findByIdAndDelete(proyectoId);                 // Elimina por id
    if (!proyecto)                                                                  // Si no existe
      return res.status(404).json({ message: 'Proyecto no encontrado' });           // 404
    return res.status(200).json({ message: 'Proyecto eliminado correctamente' });   // OK
  } catch (error) {                                                                 // En caso de error
    console.error('Error deleteProyectoById:', error);                              // Log
    return res.status(500).json({ message: 'Error al eliminar proyecto' });         // 500
  }                                                                                 // Fin catch
};                                                                                  // Fin deleteProyectoById

// -----------------------------------------------------------------------------
// Exportaciones                                                                 // Exporta handlers
// -----------------------------------------------------------------------------
module.exports = {                                                                // Exporta objeto de controladores
  getProyectos,                                                                   // Lista general
  crearProyecto,                                                                  // Crea con FK lógicas + transacción
  getProyectosUsuario,                                                            // Lista del owner autenticado
  getProyectosRecientes,                                                          // Lista recientes
  updateProyectoById,                                                             // Actualiza proyecto
  deleteProyectoById                                                              // Elimina proyecto
};                                                                                // Fin export
