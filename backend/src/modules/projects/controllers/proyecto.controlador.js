// File: BackEnd/src/modules/projects/controllers/proyecto.controlador.js    // Ruta del archivo dentro del backend de PCM.
// Description: Controlador de proyectos para ProCivil Manager (PCM).        // Descripción: gestiona la creación, actualización y
//              Gestiona creación, actualización, eliminación de proyectos,  // eliminación de proyectos, asignación y consumo
//              asignación y uso de materiales, alertas de presupuesto y     // de materiales, alertas de presupuesto y stock,
//              stock, comentarios, asignación de líder de obra, manejo de   // comentarios, asignación de líder, manejo de adjuntos
//              adjuntos y exportación de información de proyectos a PDF.    // y exportación a PDF. Se adapta a los nuevos campos
//                                                                            // (pais, ciudad, esProyectoPropio, criteriosAvance)
//                                                                            // y a las reglas de negocio (duración calculada,
//                                                                            // permisos por rol, alertas a clientes, etc.).

// ============================================================================
// Importación de dependencias y modelos
// ============================================================================

const Proyectos = require('../models/proyecto.modelo');                      // Importa el modelo de Proyectos.
const User = require('../../users/models/usuario.modelo');                   // Importa el modelo de Usuario.
const Material = require('../../inventory/models/material.modelo');          // Importa el modelo de Material (inventario).
const MovimientoInventario = require('../../inventory/models/inventario.modelo'); // Importa el modelo de movimiento de inventario.
const PresupuestoMaterial = require('../../budgets/models/presupuesto.modelo');   // Importa el modelo de presupuesto de materiales por proyecto.
const Alerta = require('../../alerts/models/alerta.modelo');                 // Importa el modelo de Alertas.
const PDFDocument = require('pdfkit');                                       // Importa pdfkit para generar archivos PDF.
const fs = require('fs');                                                    // Módulo nativo de Node para trabajo con el sistema de archivos.
const path = require('path');                                                // Módulo nativo de Node para construir rutas de archivos.
const { sendProjectRequestEmail } = require('../../../core/services/correo.servicio'); // Servicio de envío de correos de proyectos.
const calcularProgresoProyecto = require('../utils/calcularProgresoProyecto'); // Helper centralizado para calcular progreso total y detalle de un proyecto.

// ============================================================================
// Helpers / Utilidades internas
// ============================================================================

// Helper: valida formato de correo electrónico con una expresión regular simple.
const esCorreoValido = (email) => {
  // Retorna true si el correo coincide con el patrón "algo@algo.dominio".
  return /^[\w.-]+@[\w.-]+\.\w+$/.test(email);
};

// Helper: formatea fechas para PDF / respuestas.
// Acepta instancias Date o valores convertibles a Date.
// Retorna cadena en formato local español (ej: "27/11/2025") o '-' si es inválida.
const formatearFecha = (valor) => {
  // Si ya es instancia de Date, se usa tal cual; si no, se intenta construir una nueva fecha.
  const fecha = valor instanceof Date ? valor : new Date(valor);
  // Si la fecha es inválida, retorna un guion.
  if (!fecha || Number.isNaN(fecha.getTime())) return '-';
  // Retorna la fecha en formato local español.
  return fecha.toLocaleDateString('es-ES');
};

// Helper: formatea el campo "team" de un proyecto para mostrar en PDF.
// Soporta formato legado (arreglo de strings) y formato nuevo (arreglo de objetos).
const formatearEquipo = (team = []) => {
  // Si no es arreglo o está vacío, se retorna etiqueta genérica.
  if (!Array.isArray(team) || team.length === 0) {
    return 'Sin asignar';
  }

  // Si el primer elemento es string, se asume formato legado [ "Maestro", "Residente" ].
  if (typeof team[0] === 'string') {
    // Une todos los roles en una cadena separada por comas.
    return team.join(', ');
  }

  // Para formato nuevo, se asume arreglo de objetos con campos estructurados.
  const miembros = team
    .map((miembro) => {
      // Ignora entradas nulas o indefinidas.
      if (!miembro) return null;

      // Normaliza posibles nombres de campos para compatibilidad.
      const nombre = miembro.nombre || miembro.name || '';
      const apellido = miembro.apellido || miembro.apellidos || '';
      const cargo = miembro.cargo || '';
      const tipoDoc = miembro.tipoDocumento || miembro.tipo_doc || '';
      const numDoc = miembro.numeroDocumento || miembro.documento || '';

      // Construye el nombre completo usando solo las partes existentes.
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ');

      // Arreglo para almacenar partes extra (cargo, documento, etc.).
      const partesExtra = [];

      // Agrega el cargo si existe.
      if (cargo) partesExtra.push(cargo);

      // Agrega tipo y número de documento si alguno existe.
      if (tipoDoc || numDoc) {
        partesExtra.push([tipoDoc, numDoc].filter(Boolean).join(' '));
      }

      // Une las partes extra con " - ".
      const detalle = partesExtra.join(' - ');

      // Retorna cadena "Nombre Completo | Detalle", omitiendo vacíos.
      return [nombreCompleto, detalle].filter(Boolean).join(' | ');
    })
    // Filtra los resultados vacíos después del mapeo.
    .filter(Boolean);

  // Si hay miembros formateados, se unen por coma; si no, etiqueta genérica.
  return miembros.length > 0 ? miembros.join(', ') : 'Sin asignar';
};

// Helper: calcula la duración en días entre dos fechas (incluyendo ambos días).
const calcularDuracionDias = (inicio, fin) => {
  // Si alguna fecha es inválida o el fin es anterior al inicio, retorna 0.
  if (!(inicio instanceof Date) || !(fin instanceof Date)) return 0;
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return 0;
  if (fin < inicio) return 0;
  // Milisegundos en un día.
  const MS_POR_DIA = 1000 * 60 * 60 * 24;
  // Diferencia en milisegundos.
  const diffMs = fin.getTime() - inicio.getTime();
  // Duración redondeada hacia abajo +1 día para incluir ambos extremos.
  return Math.floor(diffMs / MS_POR_DIA) + 1;
};

// Plantillas base de criterios de avance por tipo/prioridad.
// NOTA: Esta versión inicial usa una estructura general para obra civil,
//       se puede refinar más adelante por tipo específico (vial, edificaciones, etc.).
const PLANTILLAS_CRITERIOS = {
  // Plantilla genérica por defecto.
  default: [
    {
      codigo: 'ALCANCE_DEFINIDO',
      nombre: 'Alcance del proyecto definido',
      descripcion: 'Acta o documento de alcance del proyecto acordado con el cliente.',
      porcentaje: 10,
    },
    {
      codigo: 'DISENO_APROBADO',
      nombre: 'Diseño aprobado',
      descripcion: 'Planos y memorias de diseño aprobados por las partes involucradas.',
      porcentaje: 20,
    },
    {
      codigo: 'PRESUPUESTO_APROBADO',
      nombre: 'Presupuesto aprobado',
      descripcion: 'Presupuesto firmado/aprobado por el cliente o la administración.',
      porcentaje: 15,
    },
    {
      codigo: 'PERMISOS_Y_LICENCIAS',
      nombre: 'Permisos y licencias',
      descripcion: 'Trámites con curaduría, IDU, alcaldía u otras entidades según aplique.',
      porcentaje: 15,
    },
    {
      codigo: 'INICIO_OBRA',
      nombre: 'Inicio de obra',
      descripcion: 'Acta de inicio firmada y recursos mínimos disponibles en obra.',
      porcentaje: 15,
    },
    {
      codigo: 'AVANCE_FISICO_50',
      nombre: 'Avance físico ≥ 50%',
      descripcion: 'Ejecución física de la obra igual o superior al 50% del alcance contratado.',
      porcentaje: 15,
    },
    {
      codigo: 'ENTREGA_FINAL',
      nombre: 'Entrega final',
      descripcion: 'Acta de entrega final firmada y pendientes menores cerrados.',
      porcentaje: 10,
    },
  ],
  // Plantilla para proyectos viales / espacio público (ejemplo).
  vial: [
    {
      codigo: 'LEVANTAMIENTO_TOP',
      nombre: 'Levantamiento topográfico',
      descripcion: 'Levantamiento topográfico y diagnóstico de estado actual.',
      porcentaje: 15,
    },
    {
      codigo: 'DISENO_GEOMETRICO',
      nombre: 'Diseño geométrico y estructural',
      descripcion: 'Diseño geométrico, estructural de pavimento y drenaje definido.',
      porcentaje: 20,
    },
    {
      codigo: 'PMT_APROBADO',
      nombre: 'PMT aprobado',
      descripcion: 'Plan de Manejo de Tránsito (PMT) aprobado por la autoridad competente.',
      porcentaje: 15,
    },
    {
      codigo: 'PERMISOS_INTERVENCION',
      nombre: 'Permisos de intervención',
      descripcion: 'Permisos de intervención de espacio público, redes y arborización.',
      porcentaje: 15,
    },
    {
      codigo: 'EJECUCION_CAPAS_BASE',
      nombre: 'Ejecución de capas base',
      descripcion: 'Capas de estructura de pavimento ejecutadas al menos al 50%.',
      porcentaje: 20,
    },
    {
      codigo: 'ENTREGA_VIAL',
      nombre: 'Entrega y señalización',
      descripcion: 'Señalización, demarcación y entrega formal de la vía.',
      porcentaje: 15,
    },
  ],
  // Plantilla para proyectos residenciales / edificaciones (ejemplo).
  residencial: [
    {
      codigo: 'DISENO_ARQ',
      nombre: 'Diseño arquitectónico',
      descripcion: 'Diseño arquitectónico revisado y aprobado.',
      porcentaje: 15,
    },
    {
      codigo: 'DISENO_ESTRUC',
      nombre: 'Diseño estructural',
      descripcion: 'Diseño estructural aprobado, incluyendo memorias y planos.',
      porcentaje: 20,
    },
    {
      codigo: 'LICENCIA_CONSTRUCCION',
      nombre: 'Licencia de construcción',
      descripcion: 'Licencia de construcción expedida por curaduría o autoridad competente.',
      porcentaje: 15,
    },
    {
      codigo: 'CIMENTACION',
      nombre: 'Cimentación ejecutada',
      descripcion: 'Cimentación terminada y aprobada en actas de supervisión/interventoría.',
      porcentaje: 20,
    },
    {
      codigo: 'ESTRUCTURA',
      nombre: 'Estructura en obra gris',
      descripcion: 'Estructura principal (viguería, placas, columnas, muros portantes) ejecutada.',
      porcentaje: 20,
    },
    {
      codigo: 'ACABADOS_ENTREGA',
      nombre: 'Acabados y entrega',
      descripcion: 'Acabados principales ejecutados y entrega final firmada.',
      porcentaje: 10,
    },
  ],
};

// Helper: obtiene una plantilla de criterios según tipo y prioridad.
const obtenerPlantillaCriterios = (tipo, prioridad) => {
  // Normaliza tipo y prioridad a minúsculas para comparar.
  const t = (tipo || '').toString().toLowerCase();
  const p = (prioridad || '').toString().toLowerCase();

  // Selecciona plantilla base según algunas palabras clave.
  let base = PLANTILLAS_CRITERIOS.default;                                 // Plantilla por defecto.

  // Si el tipo menciona algo vial.
  if (t.includes('vial') || t.includes('via') || t.includes('carretera')) {
    base = PLANTILLAS_CRITERIOS.vial;
  }
  // Si el tipo menciona algo residencial/vivienda.
  else if (t.includes('resid') || t.includes('vivienda') || t.includes('casa')) {
    base = PLANTILLAS_CRITERIOS.residencial;
  }

  // En esta versión, la prioridad no cambia los porcentajes, pero podría usarse
  // para ajustar descripciones o crear variantes en el futuro.
  // Se devuelve una copia de la plantilla con "cumplido" en false.
  return base.map((criterio) => ({
    codigo: criterio.codigo,
    nombre: criterio.nombre,
    descripcion: criterio.descripcion,
    porcentaje: criterio.porcentaje,
    cumplido: false,
    fechaCumplimiento: null,
  }));
};

// Helper: recalcula el progreso del proyecto a partir de los criterios de avance.
const recalcularProgresoDesdeCriterios = (criterios = []) => {
  // Si no hay criterios definidos, el progreso se considera 0.
  if (!Array.isArray(criterios) || criterios.length === 0) {
    return 0;
  }

  // Suma los porcentajes de criterios que están marcados como cumplidos.
  const totalCumplido = criterios.reduce((acum, criterio) => {
    const porcentaje = Number(criterio.porcentaje) || 0;                   // Asegura número.
    const estaCumplido = criterio.cumplido === true;                      // Normaliza booleano.
    return estaCumplido ? acum + porcentaje : acum;                       // Suma solo si está cumplido.
  }, 0);

  // Limita el valor entre 0 y 100 para evitar desbordes.
  return Math.max(0, Math.min(100, totalCumplido));
};

// Helper: normaliza un arreglo de criterios recibido desde el frontend.
const normalizarCriteriosDesdeBody = (criteriosRaw = []) => {
  // Si no viene arreglo, devuelve arreglo vacío.
  if (!Array.isArray(criteriosRaw)) return [];

  // Mapea cada entrada a la estructura esperada.
  return criteriosRaw.map((criterio) => {
    // Convierte porcentaje a número y asegura que esté en rango.
    const porcentajeNum = Math.max(
      0,
      Math.min(100, Number(criterio.porcentaje) || 0)
    );

    // Normaliza bandera de cumplido (acepta boolean o string "true"/"false").
    const cumplidoNormalizado =
      criterio.cumplido === true || criterio.cumplido === 'true';

    // Determina fecha de cumplimiento.
    let fechaCumplimiento = null;
    if (cumplidoNormalizado) {
      // Si viene fecha en el body, se usa; de lo contrario se pone fecha actual.
      fechaCumplimiento = criterio.fechaCumplimiento
        ? new Date(criterio.fechaCumplimiento)
        : new Date();
    }

    // Retorna el objeto de criterio normalizado.
    return {
      codigo: (criterio.codigo || '').toString().trim(),
      nombre: (criterio.nombre || '').toString().trim(),
      descripcion: (criterio.descripcion || '').toString().trim(),
      porcentaje: porcentajeNum,
      cumplido: cumplidoNormalizado,
      fechaCumplimiento,
    };
  });
};

// Helper: normaliza el estado de un proyecto a categorías generales.
// Permite mezclar estados en español/inglés sin dañar los KPIs ni los colores del PDF.
const normalizarEstadoProyecto = (statusRaw) => {
  // Convierte el valor a string minúscula sin espacios extra.
  const estado = (statusRaw || '').toString().trim().toLowerCase();

  // Si no hay estado, se considera "otro".
  if (!estado) return 'otro';

  // Alias típicos de estado "completado".
  const estadosCompletado = [
    'completado',
    'completo',
    'terminado',
    'finalizado',
    'completed',
    'done',
  ];

  // Alias típicos de estado "en proceso".
  const estadosEnProceso = [
    'en progreso',
    'en_progreso',
    'en-progreso',
    'progreso',
    'in progress',
    'in_progress',
    'in-progress',
    'planning',
    'planificacion',
  ];

  // Alias típicos de estado "cancelado".
  const estadosCancelado = [
    'cancelado',
    'cancelled',
    'canceled',
    'anulado',
  ];

  // Clasificación según alias.
  if (estadosCompletado.includes(estado)) return 'completado';
  if (estadosEnProceso.includes(estado)) return 'en_proceso';
  if (estadosCancelado.includes(estado)) return 'cancelado';

  // Cualquier otro valor cae en categoría "otro".
  return 'otro';
};

// ============================================================================
// Controladores de Proyectos (implementación en español)
// ============================================================================

// --------------------------------------------------------------------------
// Obtener todos los proyectos (vista administrativa / líder / cliente).
// --------------------------------------------------------------------------
const obtenerProyectos = async (req, res) => {
  try {
    // Extrae rol e id del usuario autenticado (inyectado por middleware de auth).
    const rolUsuario = req.user?.role;
    const usuarioId = req.user?._id || req.user?.id;
    const emailUsuario = req.user?.email;

    // Construye filtro base según el rol.  Siempre se aplica la eliminación lógica (solo proyectos activos).
    const filtro = { activo: true };

    // Si es líder de obra, solo ve proyectos donde es líder.
    if (rolUsuario === 'lider de obra') {
      filtro.lider = usuarioId;
    }

    // Si es cliente, solo ve proyectos asociados a su cuenta o a su email.
    if (rolUsuario === 'cliente') {
      filtro.$or = [
        { cliente: usuarioId },
        { email: emailUsuario },
      ];
    }

    // Aquí se podrían añadir filtros adicionales por query (país, ciudad, etc.)
    // desde req.query, pero se mantiene simple para no romper la lógica actual.

    // Busca proyectos según el filtro y pobla referencias para enriquecer la respuesta.
    const proyectos = await Proyectos.find(filtro)
      .populate('materiales.material') // Pobla la información del material asignado.
      .populate('materiales.movimientoInventario') // Pobla los movimientos de inventario asociados.
      .populate('lider', 'firstName lastName email role') // Pobla datos básicos del líder.
      .populate('comentarios.usuario', 'firstName lastName email role') // Pobla autores de comentarios.
      .populate('adjuntos.subidoPor', 'firstName lastName email role'); // Pobla quien subió los adjuntos.

    // Envía el listado de proyectos con código HTTP 200 (OK).
    res.status(200).json(proyectos);
  } catch (error) {
    // Registra el error en consola para depuración.
    console.error('Error al obtener proyectos:', error);
    // Envía mensaje genérico de error al cliente.
    res.status(500).json({ message: 'Error al obtener proyectos' });
  }
};

// --------------------------------------------------------------------------
// Obtener los últimos 5 proyectos creados (para tablero administrativo).
// --------------------------------------------------------------------------
const obtenerProyectosRecientes = async (req, res) => {
  try {
    // Aplica filtro por rol para mostrar únicamente proyectos relevantes al usuario.
    const rolUsuario = req.user?.role;
    const usuarioId = req.user?._id || req.user?.id;
    const emailUsuario = req.user?.email;

    // Aplica eliminación lógica por defecto: solo proyectos activos
    const filtroProyectos = { activo: true };
    if (rolUsuario === 'lider de obra') {
      filtroProyectos.lider = usuarioId;
    } else if (rolUsuario === 'cliente') {
      filtroProyectos.$or = [
        { cliente: usuarioId },
        { email: emailUsuario },
      ];
    }

    // Busca proyectos ordenados por la fecha de inicio del proyecto (startDate) en orden
    // descendente. Si startDate no está definido se tomará el valor por defecto que aplica
    // MongoDB (null al final). Esto permite que el tablero y los filtros de recientes
    // utilicen la fecha real de inicio y no la fecha en que fue creado en la base de datos.
    const proyectos = await Proyectos.find(filtroProyectos)
      .sort({ startDate: -1 })
      .limit(5)
      .populate('materiales.material') // Pobla materiales asignados.
      .populate('materiales.movimientoInventario') // Pobla movimientos de inventario.
      .populate('lider', 'firstName lastName email role') // Pobla líder.
      .populate('comentarios.usuario', 'firstName lastName email role') // Pobla autores de comentarios.
      .populate('adjuntos.subidoPor', 'firstName lastName email role'); // Pobla quienes subieron adjuntos.

    // Envía los proyectos recientes filtrados en formato JSON.
    res.json(proyectos);
  } catch (error) {
    // Registra error interno.
    console.error('Error al obtener proyectos recientes:', error);
    // Envía respuesta genérica.
    res.status(500).json({ message: 'Error al obtener proyectos recientes' });
  }
};

// --------------------------------------------------------------------------
// Crear un nuevo proyecto.
// --------------------------------------------------------------------------
const crearProyecto = async (req, res) => {
  try {
    // Extrae rol e id del usuario autenticado (para reglas por rol).
    const rolUsuario = req.user?.role;

    // Regla de negocio: los líderes de obra NO pueden crear proyectos directamente.
    if (rolUsuario === 'lider de obra') {
      return res.status(403).json({
        message:
          'Los líderes de obra no pueden crear proyectos directamente. Deben enviar una solicitud de creación al administrador.',
      });
    }

    // Extrae los campos esperados del cuerpo de la solicitud.
    const {
      title,
      pais,
      ciudad,
      location,
      type,
      budget,
      comentario,
      priority,
      startDate,
      endDate,
      email,
      team,
      materiales, // Arreglo de materiales a asignar al proyecto (opcional).
      esProyectoPropio, // true si el proyecto es propio y no de un cliente.
      clienteId, // Id de usuario cliente seleccionado en el frontend (opcional).
      criteriosAvance, // Arreglo opcional de criterios de avance enviados por el frontend.
    } = req.body;

    // Normaliza bandera de proyecto propio.
    const esPropioNormalizado =
      esProyectoPropio === true || esProyectoPropio === 'true';

    // ----------------------------------------------------------------------
    // Validaciones de campos obligatorios de negocio.
    // ----------------------------------------------------------------------

    // Validar presencia de campos mínimos requeridos.
    const faltanCamposMinimos =
      !title ||
      !pais ||
      !ciudad ||
      !location ||
      !type ||
      !budget ||
      !startDate ||
      !endDate ||
      (!esPropioNormalizado && !email);

    if (faltanCamposMinimos) {
      return res.status(400).json({
        message:
          'Faltan campos obligatorios: título, país, ciudad, ubicación, tipo, presupuesto, fechas y, si el proyecto es para un cliente, el correo.',
      });
    }

    // Validar tipos básicos de texto.
    if (
      typeof title !== 'string' ||
      typeof pais !== 'string' ||
      typeof ciudad !== 'string' ||
      typeof location !== 'string' ||
      typeof type !== 'string'
    ) {
      return res.status(400).json({
        message:
          'Título, país, ciudad, ubicación y tipo deben ser cadenas de texto.',
      });
    }

    // Valida presupuesto: numérico y mayor a 0.
    if (Number.isNaN(Number(budget)) || Number(budget) <= 0) {
      return res
        .status(400)
        .json({ message: 'El presupuesto debe ser un número válido mayor a 0' });
    }

    // Valida formato de correo electrónico solo si viene un correo.
    if (email && !esCorreoValido(email)) {
      return res.status(400).json({ message: 'El correo electrónico no es válido' });
    }

    // Convierte las cadenas de fecha a objetos Date.
    const inicio = new Date(startDate);
    const fin = new Date(endDate);

    // Valida que ambas fechas sean válidas.
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return res.status(400).json({ message: 'Las fechas deben ser válidas' });
    }

    // Valida que la fecha de inicio no sea posterior a la fecha de fin.
    if (inicio > fin) {
      return res
        .status(400)
        .json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' });
    }

    // Calcula la duración en días a partir de las fechas.
    const duracionCalculada = calcularDuracionDias(inicio, fin);

    // Valida que "team" sea un arreglo cuando se proporciona.
    if (team && !Array.isArray(team)) {
      return res.status(400).json({ message: 'El equipo debe ser un arreglo' });
    }

    // ----------------------------------------------------------------------
    // Asociar este proyecto a un usuario cliente (por clienteId o por email).
    // ----------------------------------------------------------------------
    let clienteRef = null; // Referencia opcional al usuario cliente.

    // Si el proyecto NO es propio y se envía clienteId, se valida y usa directamente.
    if (!esPropioNormalizado && clienteId) {
      const cliente = await User.findOne({
        _id: clienteId,
        role: 'cliente',
        isDeleted: { $ne: true },
      }).select('_id email');

      if (!cliente) {
        return res.status(400).json({
          message:
            'El cliente seleccionado no es válido o no se encuentra registrado como cliente.',
        });
      }

      clienteRef = cliente._id;
    }

    // Si no hay clienteId y el proyecto NO es propio, se intenta buscar por email (compatibilidad).
    if (!esPropioNormalizado && !clienteRef && email) {
      try {
        const posibleCliente = await User.findOne({
          email, // Mismo correo que el proyecto.
          role: 'cliente', // Rol cliente.
          isDeleted: { $ne: true }, // Excluye usuarios lógicamente eliminados.
        }).select('_id'); // Solo necesitamos el _id.

        if (posibleCliente) {
          clienteRef = posibleCliente._id;
        }
      } catch (errorBusqueda) {
        console.error('Error al buscar cliente para el proyecto:', errorBusqueda);
      }
    }

    // Si es proyecto propio, la referencia a cliente permanece en null.
    const esProyectoPropioFinal = esPropioNormalizado === true;

    // ----------------------------------------------------------------------
    // Validar y normalizar materiales a asignar, si vienen en la petición.
    // ----------------------------------------------------------------------
    let materialesAsignados = []; // Arreglo para almacenar los materiales normalizados.

    // Solo se procesa si "materiales" es un arreglo no vacío.
    if (materiales && Array.isArray(materiales) && materiales.length > 0) {
      // Recorre cada elemento del arreglo de materiales.
      for (const item of materiales) {
        // Valida que cada elemento tenga id de material y cantidad asignada.
        if (!item.material || !item.cantidadAsignada) {
          return res.status(400).json({
            message: 'Cada material debe tener un ID y una cantidad asignada',
          });
        }

        // Verifica que el material exista en la colección de Materiales.
        const material = await Material.findById(item.material);
        if (!material) {
          return res.status(404).json({
            message: `Material con ID ${item.material} no encontrado`,
          });
        }

        // Valida que el stock sea suficiente para la cantidad solicitada.
        if (material.cantidad < item.cantidadAsignada) {
          return res.status(400).json({
            message: `Stock insuficiente para ${material.nombre}. Disponible: ${material.cantidad}, Requerido: ${item.cantidadAsignada}`,
          });
        }

        // Si todo es correcto, se agrega el material normalizado al arreglo de asignados.
        materialesAsignados.push({
          material: item.material, // Referencia al id del material.
          cantidadAsignada: item.cantidadAsignada, // Cantidad reservada.
          cantidadUtilizada: 0, // Por defecto, nada utilizado.
          fechaAsignacion: new Date(), // Fecha de asignación (ahora).
        });
      }
    }

    // ----------------------------------------------------------------------
    // Inicializar criterios de avance y progreso del proyecto.
    // ----------------------------------------------------------------------
    let criteriosIniciales = [];

    // Si vienen criterios desde el body, se normalizan.
    if (Array.isArray(criteriosAvance) && criteriosAvance.length > 0) {
      criteriosIniciales = normalizarCriteriosDesdeBody(criteriosAvance);
    } else {
      // Si no vienen, se genera una plantilla según tipo/prioridad.
      criteriosIniciales = obtenerPlantillaCriterios(type, priority || 'media');
    }

    // Se calcula el progreso inicial a partir de los criterios.
    const progresoInicial = recalcularProgresoDesdeCriterios(criteriosIniciales);

    // ----------------------------------------------------------------------
    // Construir el documento del proyecto con la información validada.
    // ----------------------------------------------------------------------
    const nuevoProyecto = new Proyectos({
      title, // Título del proyecto.
      pais: pais.trim(), // País del proyecto.
      ciudad: ciudad.trim(), // Ciudad del proyecto.
      location: location.trim(), // Ubicación detallada.
      type: type.trim(), // Tipo de proyecto.
      budget: Number(budget), // Presupuesto como número (budgetCurrency se fija a "COP" en el esquema).
      duration: duracionCalculada, // Duración calculada a partir de las fechas.
      comentario: comentario || '', // Comentario general opcional.
      priority: (priority || 'media').toString().trim(), // Prioridad con valor por defecto "media".
      startDate: inicio, // Fecha de inicio.
      endDate: fin, // Fecha de fin.
      email: email || '', // Correo de contacto (puede ir vacío si es proyecto propio).
      cliente: esProyectoPropioFinal ? null : clienteRef, // Referencia al usuario cliente (si aplica).
      esProyectoPropio: esProyectoPropioFinal, // Marca si es proyecto propio.
      team: Array.isArray(team) ? team : [], // Equipo como arreglo (soporta formato legado/nuevo).
      status: 'planning', // Estado inicial del proyecto.
      progress: progresoInicial, // Progreso inicial basado en criterios (normalmente 0%).
      criteriosAvance: criteriosIniciales, // Criterios iniciales de avance.
      materiales: materialesAsignados, // Materiales asignados (si los hay).
      createdAt: new Date(), // Fecha de creación explícita (además del timestamp de Mongoose).
    });

    // Guarda el proyecto en la base de datos.
    const proyectoGuardado = await nuevoProyecto.save();

    // ----------------------------------------------------------------------
    // Crear movimientos de inventario (salida) y actualizar stock.
    // ----------------------------------------------------------------------
    if (materialesAsignados.length > 0) {
      // Recorre cada material asignado por índice.
      for (let i = 0; i < materialesAsignados.length; i++) {
        // Obtiene el ítem de material asignado.
        const item = materialesAsignados[i];
        // Vuelve a obtener el documento de material desde la BD.
        const material = await Material.findById(item.material);

        // Crea un movimiento de inventario tipo "salida".
        const movimiento = new MovimientoInventario({
          material: item.material, // Id de material.
          tipo: 'salida', // Tipo de movimiento: salida de stock.
          cantidad: item.cantidadAsignada, // Cantidad asignada al proyecto.
          motivo: `Asignación a proyecto: ${title}`, // Motivo descriptivo (si el esquema lo soporta).
          proyecto: proyectoGuardado._id, // Referencia al proyecto (si el esquema lo soporta).
          stockAnterior: material.cantidad, // Stock previo (si el esquema lo soporta).
          stockNuevo: material.cantidad - item.cantidadAsignada, // Stock después de la salida.
          fecha: new Date(), // Fecha del movimiento.
        });

        // Guarda el movimiento de inventario.
        const movimientoGuardado = await movimiento.save();

        // Actualiza el stock del material restando la cantidad asignada.
        material.cantidad -= item.cantidadAsignada;
        await material.save();

        // Enlaza el movimiento de inventario en el arreglo de materiales del proyecto.
        proyectoGuardado.materiales[i].movimientoInventario = movimientoGuardado._id;
      }

      // Guarda nuevamente el proyecto con los id de movimientos vinculados.
      await proyectoGuardado.save();
    }

    // ----------------------------------------------------------------------
    // Crear alerta para el cliente cuando se crea el proyecto (si aplica).
    // ----------------------------------------------------------------------
    if (!esProyectoPropioFinal && clienteRef) {
      try {
        await Alerta.create({
          proyecto: proyectoGuardado._id, // Id del proyecto.
          usuario: clienteRef, // Id del cliente asociado.
          tipo: 'solicitud', // Tipo de alerta (se reutiliza "solicitud").
          message: `Se ha creado el proyecto ${title} asociado a tu cuenta. Ya puedes consultarlo en tu panel de proyectos.`, // Mensaje al cliente.
          resolved: false, // Inicialmente no resuelta.
        });
      } catch (errorAlertaCreacion) {
        console.error(
          'Error al crear alerta de creación de proyecto para el cliente:',
          errorAlertaCreacion
        );
      }
    }

    // ----------------------------------------------------------------------
    // Enviar correo de notificación de nuevo proyecto (si hay email válido).
    // ----------------------------------------------------------------------
    const datosCorreoProyecto = {
      name: title, // Nombre del proyecto.
      email: email || '', // Correo de contacto.
      phone: '', // Teléfono no capturado aquí.
      projectType: type, // Tipo de proyecto.
      location: `${location} - ${ciudad}, ${pais}`, // Ubicación combinada.
      message: comentario || 'No hay mensaje adicional', // Comentario opcional o mensaje por defecto.
    };

    if (datosCorreoProyecto.email && esCorreoValido(datosCorreoProyecto.email)) {
      try {
        // Intenta enviar el correo usando el servicio personalizado.
        await sendProjectRequestEmail(datosCorreoProyecto);
      } catch (errorCorreo) {
        // Si falla el envío de correo, se registra pero no se tumba la creación del proyecto.
        console.error('Error enviando correo:', errorCorreo);
      }
    }

    // ----------------------------------------------------------------------
    // Poblar materiales y movimientos antes de devolver el proyecto creado.
    // ----------------------------------------------------------------------
    await proyectoGuardado.populate('materiales.material'); // Pobla los materiales.
    await proyectoGuardado.populate('materiales.movimientoInventario'); // Pobla los movimientos.

    // Envía la respuesta con código 201 (Creado) y los datos del proyecto.
    res.status(201).json({
      message: 'Proyecto creado exitosamente',
      proyecto: proyectoGuardado,
    });
  } catch (error) {
    // Registra el error en consola para depuración.
    console.error('Error en crearProyecto:', error);
    // Envía respuesta genérica 500.
    res.status(500).json({ message: 'Error al registrar el proyecto' });
  }
};

// --------------------------------------------------------------------------
// Obtener proyectos asociados al usuario autenticado (vista cliente).
// --------------------------------------------------------------------------
const obtenerProyectosUsuario = async (req, res) => {
  try {
    // Extrae el correo electrónico desde el payload del usuario (inyectado por el middleware de auth).
    const emailUsuario = req.user?.email;
    const usuarioId = req.user?._id || req.user?.id;

    // Valida existencia y formato del correo.
    if (!emailUsuario || !esCorreoValido(emailUsuario)) {
      return res
        .status(401)
        .json({ message: 'No autorizado, token inválido o email no válido' });
    }

    // Busca proyectos usando tanto el campo "email" como la referencia "cliente".
    const proyectosUsuario = await Proyectos.find({
      $or: [{ email: emailUsuario }, { cliente: usuarioId }],
    })
      .populate('materiales.material') // Pobla materiales.
      .populate('materiales.movimientoInventario') // Pobla movimientos.
      .populate('lider', 'firstName lastName email role') // Pobla líder.
      .populate('comentarios.usuario', 'firstName lastName email role') // Pobla autores de comentarios.
      .populate('adjuntos.subidoPor', 'firstName lastName email role'); // Pobla subidores de adjuntos.

    // Devuelve el listado de proyectos de este usuario.
    res.status(200).json(proyectosUsuario);
  } catch (error) {
    // Registra el error en consola.
    console.error('Error al obtener proyectos del usuario:', error);
    // Envía mensaje genérico de error.
    res.status(500).json({ message: 'Error al obtener proyectos del usuario' });
  }
};

// --------------------------------------------------------------------------
// Obtener detalle de un proyecto por ID (para modales y vistas internas).
// --------------------------------------------------------------------------
const obtenerProyectoPorId = async (req, res) => {
  try {
    // Id del proyecto desde parámetros de ruta.
    const proyectoId = req.params.id;
    // Datos del usuario autenticado.
    const rolUsuario = req.user?.role;
    const usuarioId = req.user?._id || req.user?.id;
    const emailUsuario = req.user?.email;

    // Valida que venga un id mínimo.
    if (!proyectoId) {
      return res.status(400).json({ message: 'Debe proporcionar el ID del proyecto' });
    }

    // Busca el proyecto y llena todas las referencias necesarias para el modal de detalle.
    const proyecto = await Proyectos.findById(proyectoId)
      .populate('materiales.material')
      .populate('materiales.movimientoInventario')
      .populate('lider', 'firstName lastName email role')     // Corrige lastName duplicado.
      .populate('comentarios.usuario', 'firstName lastName email role')
      .populate('adjuntos.subidoPor', 'firstName lastName email role')
      .populate('cliente', 'firstName lastName email role');

    // Si no se encuentra, 404.
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Si no hay rol, algo anda mal con el token.
    if (!rolUsuario) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Reglas de acceso según rol:
    // - admin y auditor: pueden ver cualquier proyecto.
    // - líder de obra: solo proyectos donde es líder.
    // - cliente: solo proyectos asociados a su usuario o a su correo.
    if (rolUsuario === 'lider de obra') {
      const esLiderDelProyecto =
        proyecto.lider && proyecto.lider._id?.toString() === (usuarioId || '').toString();

      if (!esLiderDelProyecto) {
        return res.status(403).json({
          message:
            'No tienes permisos para ver los detalles de este proyecto. No eres el líder asignado.',
        });
      }
    } else if (rolUsuario === 'cliente') {
      const esClientePorRef =
        proyecto.cliente && proyecto.cliente._id?.toString() === (usuarioId || '').toString();

      const esClientePorEmail =
        proyecto.email &&
        emailUsuario &&
        proyecto.email.toLowerCase() === emailUsuario.toLowerCase();

      if (!esClientePorRef && !esClientePorEmail) {
        return res.status(403).json({
          message:
            'No tienes permisos para ver los detalles de este proyecto. No está asociado a tu cuenta.',
        });
      }
    } else if (rolUsuario !== 'admin' && rolUsuario !== 'auditor') {
      // Cualquier otro rol distinto a admin/auditor/líder/cliente no puede ver detalles.
      return res.status(403).json({
        message: 'No tienes permisos para ver los detalles de este proyecto',
      });
    }

    // Si pasa las validaciones, se devuelve el proyecto completo.
    return res.status(200).json(proyecto);
  } catch (error) {
    console.error('Error al obtener proyecto por ID:', error);
    return res.status(500).json({ message: 'Error al obtener el proyecto' });
  }
};

// --------------------------------------------------------------------------
// Obtener el progreso calculado de un proyecto (API específica).
// --------------------------------------------------------------------------
const obtenerProgresoDeProyecto = async (req, res) => {
  try {
    // Id del proyecto desde parámetros.
    const proyectoId = req.params.id;
    // Datos del usuario autenticado.
    const rolUsuario = req.user?.role;
    const usuarioId = req.user?._id || req.user?.id;
    const emailUsuario = req.user?.email;

    if (!proyectoId) {
      return res.status(400).json({ message: 'Debe proporcionar el ID del proyecto' });
    }

    // Para el cálculo no necesitamos poblar todo, solo el documento base.
    const proyecto = await Proyectos.findById(proyectoId);

    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Validaciones de acceso iguales que en obtenerProyectoPorId.
    if (!rolUsuario) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    if (rolUsuario === 'lider de obra') {
      const esLiderDelProyecto =
        proyecto.lider && proyecto.lider.toString() === (usuarioId || '').toString();

      if (!esLiderDelProyecto) {
        return res.status(403).json({
          message:
            'No tienes permisos para consultar el progreso de este proyecto. No eres el líder asignado.',
        });
      }
    } else if (rolUsuario === 'cliente') {
      const esClientePorRef =
        proyecto.cliente && proyecto.cliente.toString() === (usuarioId || '').toString();

      const esClientePorEmail =
        proyecto.email &&
        emailUsuario &&
        proyecto.email.toLowerCase() === emailUsuario.toLowerCase();

      if (!esClientePorRef && !esClientePorEmail) {
        return res.status(403).json({
          message:
            'No tienes permisos para consultar el progreso de este proyecto. No está asociado a tu cuenta.',
        });
      }
    } else if (rolUsuario !== 'admin' && rolUsuario !== 'auditor') {
      return res.status(403).json({
        message: 'No tienes permisos para consultar el progreso de este proyecto',
      });
    }

    // --------------------------------------------------------------------
    // Cálculo del progreso usando el helper centralizado.
    // --------------------------------------------------------------------
    let resultadoProgreso;

    try {
      // Si el helper existe y es función, se usa.
      if (typeof calcularProgresoProyecto === 'function') {
        resultadoProgreso = calcularProgresoProyecto(proyecto);
      } else {
        throw new Error('calcularProgresoProyecto no es una función');
      }
    } catch (errorCalculo) {
      // Fallback: usa los criterios almacenados y el helper local.
      console.warn(
        'No se pudo usar calcularProgresoProyecto, se usa fallback local:',
        errorCalculo
      );

      const criterios = Array.isArray(proyecto.criteriosAvance)
        ? proyecto.criteriosAvance
        : [];

      const progresoTotal = recalcularProgresoDesdeCriterios(criterios);

      resultadoProgreso = {
        progresoTotal,
        criterios,
        resumen: {
          criteriosTotales: criterios.length,
          criteriosCumplidos: criterios.filter((c) => c.cumplido === true).length,
        },
      };
    }

    // Si el progreso calculado es numérico y difiere del guardado, se actualiza.
    if (
      resultadoProgreso &&
      typeof resultadoProgreso.progresoTotal === 'number' &&
      Number.isFinite(resultadoProgreso.progresoTotal) &&
      proyecto.progress !== resultadoProgreso.progresoTotal
    ) {
      proyecto.progress = resultadoProgreso.progresoTotal;
      await proyecto.save();
    }

    // Construye la respuesta API.
    return res.status(200).json({
      proyectoId: proyecto._id,
      titulo: proyecto.title,
      progresoGuardado: proyecto.progress,
      progresoCalculado: resultadoProgreso.progresoTotal,
      resumen: resultadoProgreso.resumen || null,
      criterios: resultadoProgreso.criterios || proyecto.criteriosAvance || [],
    });
  } catch (error) {
    console.error('Error al obtener progreso del proyecto:', error);
    return res.status(500).json({ message: 'Error al obtener el progreso del proyecto' });
  }
};

// --------------------------------------------------------------------------
// Actualizar un proyecto por ID.
// --------------------------------------------------------------------------
const actualizarProyectoPorId = async (req, res) => {
  // Extrae el id de proyecto desde los parámetros de la ruta.
  const proyectoId = req.params.id;

  // Extrae rol e id del usuario autenticado.
  const rolUsuario = req.user?.role;

  // Extrae campos actualizables desde el cuerpo de la solicitud.
  const {
    title,
    pais,
    ciudad,
    location,
    type,
    budget,
    // duration se ignora a propósito (campo calculado).
    comentario,
    priority,
    startDate,
    endDate,
    status,
    progress, // Progreso manual (se usa solo cuando no se mandan criterios).
    team,
    materiales, // Arreglo opcional de materiales actualizado.
    esProyectoPropio, // Cambio de bandera de proyecto propio.
    clienteId, // Cambio de cliente asociado.
    criteriosAvance, // Criterios de avance actualizados.
  } = req.body;

  try {
    // Busca el proyecto por id y pobla la referencia de materiales.
    const proyecto = await Proyectos.findById(proyectoId).populate('materiales.material');

    // Si no se encuentra, responde 404.
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Guarda el estado anterior para detectar cambios y disparar alertas.
    const estadoAnterior = proyecto.status;

    // ----------------------------------------------------------------------
    // Regla de permisos: el líder de obra no puede editar info básica.
    // ----------------------------------------------------------------------
    const intentaEditarBasicos =
      title ||
      pais ||
      ciudad ||
      location ||
      type ||
      priority ||
      budget ||
      startDate ||
      endDate ||
      comentario;

    if (rolUsuario === 'lider de obra' && intentaEditarBasicos) {
      return res.status(403).json({
        message:
          'No tienes permisos para editar la información básica del proyecto (título, país, ciudad, ubicación, tipo, prioridad, fechas, presupuesto o descripción). Comunícate con un administrador.',
      });
    }

    // ----------------------------------------------------------------------
    // Actualiza campos básicos del proyecto solo si fueron enviados.
    // (Para admin/usuarios autorizados).
    // ----------------------------------------------------------------------
    if (title) {
      proyecto.title = title;                                              // Actualiza título si viene.
    }
    if (pais) {
      proyecto.pais = pais;                                                // Actualiza país si viene.
    }
    if (ciudad) {
      proyecto.ciudad = ciudad;                                            // Actualiza ciudad si viene.
    }
    if (location) {
      proyecto.location = location;                                        // Actualiza ubicación si viene.
    }
    if (type) {
      proyecto.type = type;                                                // Actualiza tipo si viene.
    }
    if (typeof budget !== 'undefined') {
      proyecto.budget = budget;                                            // Actualiza presupuesto (mantiene compatibilidad de tipo).
    }
    if (comentario) {
      proyecto.comentario = comentario;                                    // Actualiza comentario general.
    }
    if (priority) {
      proyecto.priority = priority;                                        // Actualiza prioridad.
    }
    if (startDate) {
      proyecto.startDate = new Date(startDate);                            // Actualiza fecha de inicio si viene.
    }
    if (endDate) {
      proyecto.endDate = new Date(endDate);                                // Actualiza fecha de fin si viene.
    }
    if (status) {
      proyecto.status = status;                                            // Actualiza estado.
    }
    if (team) {
      proyecto.team = team;                                                // Actualiza equipo (arreglo legado/nuevo).
    }

    // Recalcula duración si las fechas cambiaron o existían.
    if (proyecto.startDate && proyecto.endDate) {
      proyecto.duration = calcularDuracionDias(proyecto.startDate, proyecto.endDate);
    }

    // ----------------------------------------------------------------------
    // Actualizar banderas de proyecto propio / cliente asociado.
    // ----------------------------------------------------------------------
    if (typeof esProyectoPropio !== 'undefined' || clienteId) {
      // Normaliza bandera de proyecto propio.
      const esPropioNormalizado =
        esProyectoPropio === true || esProyectoPropio === 'true';

      if (esPropioNormalizado) {
        // Si ahora se marca como propio, se desasocia el cliente.
        proyecto.esProyectoPropio = true;
        proyecto.cliente = null;
      } else {
        // Si no es propio, se marca la bandera y se procesa clienteId si viene.
        proyecto.esProyectoPropio = false;

        if (clienteId) {
          const cliente = await User.findOne({
            _id: clienteId,
            role: 'cliente',
            isDeleted: { $ne: true },
          }).select('_id');

          if (!cliente) {
            return res.status(400).json({
              message:
                'El cliente seleccionado no es válido o no se encuentra registrado como cliente.',
            });
          }

          proyecto.cliente = cliente._id;
        }
      }
    }

    // ----------------------------------------------------------------------
    // Actualizar criterios de avance y recalcular progreso si se envían.
    // ----------------------------------------------------------------------
    if (Array.isArray(criteriosAvance)) {
      const criteriosNormalizados = normalizarCriteriosDesdeBody(criteriosAvance);
      proyecto.criteriosAvance = criteriosNormalizados;
      proyecto.progress = recalcularProgresoDesdeCriterios(criteriosNormalizados);
    } else if (typeof progress !== 'undefined') {
      // Si no se enviaron criterios pero sí un valor de progreso, se respeta manualmente.
      proyecto.progress = progress;                                        // Actualiza progreso (permite 0 correctamente).
    }

    // ----------------------------------------------------------------------
    // Actualizar asignación de materiales si se envía arreglo "materiales".
    // ----------------------------------------------------------------------
    if (materiales && Array.isArray(materiales)) {
      // Primero se regresan al inventario los materiales anteriormente asignados.
      for (const item of proyecto.materiales) {
        // Busca el documento de material a partir del material poblado.
        const material = await Material.findById(item.material._id);
        if (material) {
          // Calcula la cantidad a devolver (asignado - utilizado).
          const cantidadDevolver = item.cantidadAsignada - item.cantidadUtilizada;

          // Aumenta el stock del material con esa cantidad.
          material.cantidad += cantidadDevolver;
          await material.save();

          // Crea un movimiento de inventario tipo "entrada".
          const movimiento = new MovimientoInventario({
            material: material._id, // Id del material.
            tipo: 'entrada', // Movimiento tipo entrada al inventario.
            cantidad: cantidadDevolver, // Cantidad devuelta.
            motivo: `Devolución por actualización de proyecto: ${proyecto.title}`, // Motivo descriptivo.
            proyecto: proyecto._id, // Referencia al proyecto.
            stockAnterior: material.cantidad - cantidadDevolver, // Stock previo a la devolución.
            stockNuevo: material.cantidad, // Stock posterior.
            fecha: new Date(), // Fecha del movimiento.
          });
          // Guarda el movimiento de inventario.
          await movimiento.save();
        }
      }

      // Ahora se construye el nuevo arreglo de materiales asignados.
      const nuevosMateriales = []; // Arreglo para materiales actualizados.

      // Recorre los materiales enviados en la actualización.
      for (const item of materiales) {
        // Busca el material relacionado.
        const material = await Material.findById(item.material);
        if (!material) {
          // Si no existe, responde error 404.
          return res.status(404).json({
            message: `Material con ID ${item.material} no encontrado`,
          });
        }

        // Verifica que el stock sea suficiente.
        if (material.cantidad < item.cantidadAsignada) {
          return res.status(400).json({
            message: `Stock insuficiente para ${material.nombre}. Disponible: ${material.cantidad}, Requerido: ${item.cantidadAsignada}`,
          });
        }

        // Descuenta la cantidad asignada del stock.
        material.cantidad -= item.cantidadAsignada;
        await material.save();

        // Crea un movimiento de inventario tipo "salida".
        const movimiento = new MovimientoInventario({
          material: material._id, // Id de material.
          tipo: 'salida', // Tipo de movimiento: salida.
          cantidad: item.cantidadAsignada, // Cantidad asignada.
          motivo: `Actualización de proyecto: ${proyecto.title}`, // Motivo descriptivo.
          proyecto: proyecto._id, // Referencia al proyecto.
          stockAnterior: material.cantidad + item.cantidadAsignada, // Stock previo.
          stockNuevo: material.cantidad, // Stock final.
          fecha: new Date(), // Fecha del movimiento.
        });
        // Guarda el movimiento de inventario y obtiene el documento.
        const movimientoGuardado = await movimiento.save();

        // Agrega el material al arreglo de nuevos materiales.
        nuevosMateriales.push({
          material: item.material, // Id de material.
          cantidadAsignada: item.cantidadAsignada, // Cantidad asignada.
          cantidadUtilizada: item.cantidadUtilizada || 0, // Cantidad ya utilizada o 0.
          fechaAsignacion: new Date(), // Fecha de asignación actualizada.
          movimientoInventario: movimientoGuardado._id, // Id del movimiento asociado.
        });
      }

      // Reemplaza el arreglo de materiales del proyecto por el nuevo.
      proyecto.materiales = nuevosMateriales;
    }

    // Guarda el proyecto con todos los cambios.
    await proyecto.save();

    // Pobla materiales y movimientos para devolver la información enriquecida.
    await proyecto.populate('materiales.material');
    await proyecto.populate('materiales.movimientoInventario');

    // ----------------------------------------------------------------------
    // Si el estado cambió y existe un cliente asociado, crear alerta.
    // ----------------------------------------------------------------------
    if (status && status !== estadoAnterior) {
      try {
        // Determina el destinatario de la alerta:
        // 1) Usa el campo "cliente" si ya existe en el proyecto.
        // 2) Si no, intenta encontrar un usuario cliente por el email del proyecto.
        let clienteDestinoId = proyecto.cliente || null; // Candidato inicial.

        // Si no hay cliente asociado pero sí hay email, se busca un usuario cliente.
        if (!clienteDestinoId && proyecto.email) {
          const posibleCliente = await User.findOne({
            email: proyecto.email, // Correo que figura en el proyecto.
            role: 'cliente', // Solo rol cliente.
            isDeleted: { $ne: true }, // Excluye lógicamente eliminados.
          }).select('_id'); // Solo se necesita el id.

          if (posibleCliente) {
            clienteDestinoId = posibleCliente._id; // Usa el id encontrado.
          }
        }

        // Solo crea alerta si hay un usuario destinatario válido.
        if (clienteDestinoId) {
          // Construye el mensaje para el cliente.
          const mensaje = `Tu proyecto ${proyecto.title} pasó a estado ${proyecto.status}.`;

          // Crea el documento de alerta para este cambio de estado.
          await Alerta.create({
            proyecto: proyecto._id, // Id del proyecto.
            usuario: clienteDestinoId, // Id del usuario destinatario.
            tipo: 'solicitud', // Tipo de alerta (se reutiliza "solicitud").
            message: mensaje, // Mensaje legible para el usuario.
            resolved: false, // Inicialmente no resuelta.
          });
        }
      } catch (errorAlerta) {
        // Si falla la creación de alerta, se registra pero no rompe la actualización del proyecto.
        console.error(
          'Error al crear alerta por cambio de estado del proyecto:',
          errorAlerta
        );
      }
    }

    // Envía respuesta exitosa con el proyecto actualizado.
    res.status(200).json({
      message: 'Proyecto actualizado correctamente',
      proyecto,
    });
  } catch (error) {
    // Registra el error en consola.
    console.error('Error al actualizar proyecto:', error);
    // Envía mensaje genérico de error.
    res.status(500).json({ message: 'Error al actualizar proyecto' });
  }
};

// --------------------------------------------------------------------------
// Registrar uso de material asignado dentro de un proyecto.
// (No toca el stock global de inventario).
// --------------------------------------------------------------------------
const registrarUsoDeMaterial = async (req, res) => {
  // Extrae el id del proyecto desde los parámetros de la ruta.
  const { proyectoId } = req.params;
  // Extrae el id de material y la cantidad utilizada desde el cuerpo.
  const { materialId, cantidadUtilizada } = req.body;

  try {
    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Busca la entrada del material dentro del arreglo proyecto.materiales.
    const materialProyecto = proyecto.materiales.find(
      (m) => m.material.toString() === materialId
    );

    // Si no se encuentra, se informa que el material no está asignado a ese proyecto.
    if (!materialProyecto) {
      return res.status(404).json({
        message: 'Material no asignado a este proyecto',
      });
    }

    // Normaliza la cantidad utilizada recibida a número seguro.
    const cantidadUtilizadaNumero = Number(cantidadUtilizada);             // Convierte el valor recibido a número.
    // Valida que la cantidad sea un número válido y positivo.
    if (!Number.isFinite(cantidadUtilizadaNumero) || cantidadUtilizadaNumero <= 0) {
      return res.status(400).json({
        message: 'La cantidad utilizada debe ser un número mayor a 0',
      });
    }

    // Toma la cantidad ya utilizada (normalizada a número) o 0.
    const utilizadaActual = Number(materialProyecto.cantidadUtilizada) || 0; // Cantidad actualmente registrada como utilizada.
    // Calcula la nueva cantidad utilizada sumando la actual más la enviada.
    const nuevaCantidadUtilizada = utilizadaActual + cantidadUtilizadaNumero; // Suma de la cantidad previa más la nueva.

    // Valida que la cantidad utilizada no supere la cantidad asignada.
    if (nuevaCantidadUtilizada > materialProyecto.cantidadAsignada) {
      return res.status(400).json({
        message: 'La cantidad utilizada no puede exceder la cantidad asignada',
      });
    }

    // Actualiza la cantidad utilizada en el documento del proyecto.
    materialProyecto.cantidadUtilizada = nuevaCantidadUtilizada;
    await proyecto.save();

    // 🔄 También actualizamos el inventario global del material. Al consumir materiales en un proyecto
    //     se debería descontar del stock total disponible para que los demás proyectos o solicitudes
    //     reflejen correctamente la disponibilidad. Si el documento de material no existe ya se validó
    //     previamente cuando se asignó, así que aquí simplemente se resta la cantidad utilizada. No
    //     permitimos que la cantidad quede negativa.
    try {
      const materialDoc = await Material.findById(materialId);
      if (materialDoc) {
        const nuevaCantidadInventario = (Number(materialDoc.cantidad) || 0) - cantidadUtilizadaNumero;
        materialDoc.cantidad = nuevaCantidadInventario < 0 ? 0 : nuevaCantidadInventario;
        await materialDoc.save();
      }
    } catch (err) {
      console.error('Error al actualizar el stock del material tras registrar uso:', err);
      // No detenemos el flujo; el consumo en el proyecto ya quedó registrado. Si esta operación
      // falla, el stock se puede revisar y ajustar manualmente por un administrador.
    }

    // Envía respuesta exitosa con la entrada de material actualizada.
    res.status(200).json({
      message: 'Uso de material registrado correctamente',
      material: materialProyecto,
    });
  } catch (error) {
    // Registra el error en consola.
    console.error('Error al registrar uso de material:', error);
    // Envía mensaje genérico de error.
    res.status(500).json({ message: 'Error al registrar uso de material' });
  }
};

// --------------------------------------------------------------------------
// Obtener costo de materiales consumidos vs presupuesto y generar alerta.
// --------------------------------------------------------------------------
const obtenerCostoDeMateriales = async (req, res) => {
  // Extrae el id del proyecto desde los parámetros de la ruta.
  const { proyectoId } = req.params;

  try {
    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Determina el posible destinatario de alertas de presupuesto (líder del proyecto).
    const usuarioDestino = proyecto.lider || null;

    // Calcula el costo total de materiales usando el método de instancia del proyecto.
    const costoConsumido = await proyecto.calcularCostoMateriales();

    // Busca un documento de presupuesto de materiales asociado a este proyecto.
    const presupuesto = await PresupuestoMaterial.findOne({ proyecto: proyectoId });

    // Inicializa variables derivadas.
    let porcentajeEjecutado = null;
    let diferencia = null;
    let alertaPresupuesto = false;
    let totalPresupuesto = null;

    // Si existe un presupuesto registrado, se procesan los datos.
    if (presupuesto) {
      totalPresupuesto = presupuesto.totalPresupuesto; // Extrae el valor total del presupuesto.

      if (totalPresupuesto > 0) {
        // Calcula el porcentaje ejecutado.
        porcentajeEjecutado = (costoConsumido / totalPresupuesto) * 100;
        // Calcula la diferencia entre presupuesto y costo consumido.
        diferencia = totalPresupuesto - costoConsumido;

        // Define umbral para alertas (80% del presupuesto).
        const UMBRAL_ALERTA = 0.8;

        // Si el porcentaje ejecutado supera o iguala el umbral, se activa alerta.
        if (porcentajeEjecutado >= UMBRAL_ALERTA * 100) {
          alertaPresupuesto = true;

          // Busca una alerta no resuelta existente de este tipo para el mismo proyecto.
          let alerta = await Alerta.findOne({
            proyecto: proyectoId,
            tipo: 'presupuesto',
            resolved: false,
          });

          // Si no existe alerta, se crea una nueva.
          if (!alerta) {
            await Alerta.create({
              proyecto: proyectoId, // Id del proyecto.
              usuario: usuarioDestino || undefined, // Líder si está definido.
              tipo: 'presupuesto', // Tipo de alerta.
              message: `El costo de materiales ha alcanzado el ${porcentajeEjecutado.toFixed(
                1
              )}% del presupuesto`, // Mensaje para el usuario.
              threshold: porcentajeEjecutado, // Se guarda el porcentaje ejecutado.
            });
          }
        }
      }
    }

    // Construye el objeto de respuesta.
    const respuesta = {
      proyectoId: proyecto._id, // Id del proyecto.
      titulo: proyecto.title, // Título del proyecto.
      costoConsumido, // Costo total de materiales consumidos.
    };

    // Si existe un presupuesto, se agregan datos adicionales.
    if (totalPresupuesto !== null) {
      respuesta.presupuestoTotal = totalPresupuesto; // Presupuesto total.
      respuesta.porcentajeEjecutado =
        porcentajeEjecutado != null ? porcentajeEjecutado.toFixed(2) : null; // Porcentaje ejecutado.
      respuesta.diferencia = diferencia; // Diferencia presupuesto - costo.
      respuesta.alertaPresupuesto = alertaPresupuesto; // Bandera de alerta.
    } else {
      // Si no hay presupuesto, se devuelven nulos y alerta en falso.
      respuesta.presupuestoTotal = null;
      respuesta.porcentajeEjecutado = null;
      respuesta.diferencia = null;
      respuesta.alertaPresupuesto = false;
    }

    // Envía los datos calculados.
    return res.status(200).json(respuesta);
  } catch (error) {
    // Registra el error.
    console.error('Error al obtener costo de materiales:', error);
    // Envía respuesta de error genérico.
    res.status(500).json({ message: 'Error al obtener costo de materiales' });
  }
};

// --------------------------------------------------------------------------
// Verificar disponibilidad de materiales y generar alertas de bajo stock.
// --------------------------------------------------------------------------
const verificarDisponibilidadDeMateriales = async (req, res) => {
  // Extrae el id del proyecto desde los parámetros.
  const { proyectoId } = req.params;

  try {
    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Determina el posible destinatario de alertas de stock (líder del proyecto).
    const usuarioDestino = proyecto.lider || null;

    // Calcula materiales faltantes usando el método de instancia del proyecto.
    const faltantes = await proyecto.verificarDisponibilidad();

    // Recorre cada material asignado al proyecto para revisar stock mínimo.
    for (const item of proyecto.materiales) {
      // Obtiene el documento de material desde la base de datos.
      const material = await Material.findById(item.material);
      if (material && material.stockMinimo !== undefined) {
        // Si el stock actual está en o por debajo del mínimo definido.
        if (material.cantidad <= material.stockMinimo) {
          // Verifica si ya existe una alerta no resuelta de stock para este proyecto-material.
          const existente = await Alerta.findOne({
            proyecto: proyectoId,
            material: material._id,
            tipo: 'stock',
            resolved: false,
          });

          // Si no existe alerta, se crea una nueva.
          if (!existente) {
            // Calcula el porcentaje de stock actual respecto al mínimo (evita división por cero).
            const porcentaje = (material.cantidad / (material.stockMinimo || 1)) * 100;

            await Alerta.create({
              proyecto: proyectoId, // Id del proyecto.
              material: material._id, // Id del material.
              usuario: usuarioDestino || undefined, // Líder si existe.
              tipo: 'stock', // Tipo de alerta.
              message: `El stock del material ${material.nombre} ha caído al nivel mínimo`, // Mensaje para el usuario.
              threshold: porcentaje, // Porcentaje de referencia.
            });
          }
        }
      }
    }

    // Envía resumen de disponibilidad.
    res.status(200).json({
      proyectoId: proyecto._id, // Id del proyecto.
      titulo: proyecto.title, // Título del proyecto.
      disponible: faltantes.length === 0, // true si no hay faltantes.
      materialesFaltantes: faltantes, // Listado de faltantes.
    });
  } catch (error) {
    // Registra error en el servidor.
    console.error('Error al verificar disponibilidad de materiales:', error);
    // Envía error genérico.
    res.status(500).json({ message: 'Error al verificar disponibilidad de materiales' });
  }
};

// --------------------------------------------------------------------------
// Agregar un comentario a un proyecto.
// --------------------------------------------------------------------------
const agregarComentarioAProyecto = async (req, res) => {
  try {
    // Extrae el id del proyecto desde los parámetros.
    const proyectoId = req.params.id;
    // Extrae el contenido del comentario desde el cuerpo.
    const { contenido } = req.body;

    // Valida que el contenido exista, sea string y no sea solo espacios.
    if (!contenido || typeof contenido !== 'string' || !contenido.trim()) {
      return res
        .status(400)
        .json({ message: 'El contenido del comentario es requerido' });
    }

    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Agrega el nuevo comentario al arreglo de comentarios del proyecto.
    proyecto.comentarios.push({
      usuario: req.user.id, // Id del usuario autenticado (del middleware de auth).
      contenido: contenido.trim(), // Contenido del comentario sin espacios extra.
      fecha: new Date(), // Fecha de creación del comentario.
    });

    // Guarda el proyecto con el nuevo comentario.
    await proyecto.save();

    // Pobla los datos del usuario en los comentarios.
    await proyecto.populate('comentarios.usuario', 'firstName lastName email role');

    // Recupera el último comentario agregado (el recién creado).
    const nuevoComentario = proyecto.comentarios[proyecto.comentarios.length - 1];

    // Devuelve el comentario creado con código 201 (Creado).
    return res.status(201).json(nuevoComentario);
  } catch (error) {
    // Registra error interno.
    console.error('Error al agregar comentario:', error);
    // Envía respuesta genérica.
    return res.status(500).json({ message: 'Error al agregar comentario al proyecto' });
  }
};

// --------------------------------------------------------------------------
// Asignar líder de obra a un proyecto.
// Solo admins pueden hacerlo (validado por middlewares de ruta).
// --------------------------------------------------------------------------
const asignarLiderAProyecto = async (req, res) => {
  try {
    // Extrae el id del proyecto desde los parámetros.
    const proyectoId = req.params.id;
    // Extrae el id del líder desde el cuerpo.
    const { liderId } = req.body;

    // Valida presencia del id de líder.
    if (!liderId) {
      return res.status(400).json({ message: 'Debe proporcionar el ID del líder' });
    }

    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Busca el usuario por id.
    const usuario = await User.findById(liderId);
    // Valida que exista y tenga rol de líder de obra.
    if (!usuario || usuario.role !== 'lider de obra') {
      return res
        .status(400)
        .json({ message: 'El usuario seleccionado no es un líder de obra válido' });
    }

    // Verifica si se está reasignando el mismo líder al mismo proyecto.
    const esMismoLider = proyecto.lider && proyecto.lider.toString() === liderId;

    // Cuenta cuántos proyectos tiene asignados este líder actualmente.
    const proyectosAsignadosAntes = await Proyectos.countDocuments({ lider: liderId });

    // Asigna el líder al proyecto.
    proyecto.lider = liderId;
    await proyecto.save();

    // Crea una alerta de asignación para el líder.
    await Alerta.create({
      proyecto: proyecto._id, // Id del proyecto.
      usuario: liderId, // Id del líder.
      tipo: 'asignacion', // Tipo de alerta.
      message: `Se te ha asignado el proyecto ${proyecto.title}`, // Mensaje para el líder.
    });

    // Obtiene de nuevo la lista de proyectos que tiene ese líder (después de la asignación).
    const proyectosLider = await Proyectos.find({ lider: liderId }).select('_id title');

    // Pobla la información básica del líder para devolverla en la respuesta.
    await proyecto.populate('lider', 'firstName lastName email role');

    // Devuelve el proyecto actualizado, mensaje de confirmación y resumen de asignación.
    return res.status(200).json({
      message: 'Líder asignado correctamente',
      proyecto,
      resumenAsignacion: {
        totalAntes: proyectosAsignadosAntes,
        totalDespues: proyectosLider.length,
        proyectosLider: proyectosLider.map((p) => ({
          id: p._id,
          titulo: p.title,
        })),
        mismoLider: esMismoLider,
      },
    });
  } catch (error) {
    // Registra el error.
    console.error('Error al asignar líder:', error);
    // Devuelve respuesta genérica de error.
    return res.status(500).json({ message: 'Error al asignar líder al proyecto' });
  }
};

// --------------------------------------------------------------------------
// Remover líder de un proyecto.
// Solo admins pueden hacerlo (validado por middlewares).
// --------------------------------------------------------------------------
const removerLiderDeProyecto = async (req, res) => {
  try {
    // Extrae el id del proyecto desde los parámetros.
    const proyectoId = req.params.id;

    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Guarda el id del líder anterior, si existía.
    const liderAnterior = proyecto.lider;

    // Elimina la referencia al líder en el proyecto.
    proyecto.lider = null;
    await proyecto.save();

    // Si había líder asignado, se notifica la remoción mediante alerta.
    if (liderAnterior) {
      await Alerta.create({
        proyecto: proyecto._id, // Id del proyecto.
        usuario: liderAnterior, // Id del líder removido.
        tipo: 'asignacion', // Tipo de alerta.
        message: `Se te ha removido del proyecto ${proyecto.title}`, // Mensaje para el usuario.
      });
    }

    // Devuelve mensaje de éxito y el proyecto actualizado.
    return res
      .status(200)
      .json({ message: 'Líder removido correctamente', proyecto });
  } catch (error) {
    // Registra error en consola.
    console.error('Error al remover líder:', error);
    // Devuelve error genérico.
    return res.status(500).json({ message: 'Error al remover líder del proyecto' });
  }
};

// --------------------------------------------------------------------------
// Agregar uno o varios adjuntos a un proyecto (usa Multer para archivos).
// --------------------------------------------------------------------------
const agregarAdjuntosAProyecto = async (req, res) => {
  try {
    // Extrae el id del proyecto desde los parámetros.
    const proyectoId = req.params.id;

    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Valida que efectivamente se hayan recibido archivos.
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No se recibieron archivos para adjuntar' });
    }

    // La descripción puede venir en el cuerpo (se aplica a todos los archivos de esta petición).
    const descripcion = req.body.descripcion || '';
    // Id del usuario que sube los archivos (se toma del middleware de auth si existe).
    const userId = req.user ? req.user.id : null;

    // Mapea cada archivo subido a un subdocumento de adjunto.
    const nuevosAdjuntos = req.files.map((file) => {
      // Construye una ruta relativa normalizada con barras hacia adelante.
      const relativePath = path
        .join('uploads', 'proyectos', proyectoId, file.filename) // uploads/proyectos/<id>/<archivo>.
        .replace(/\\/g, '/'); // Reemplaza backslashes por slashes para compatibilidad.

      // Retorna el objeto de adjunto.
      return {
        nombreOriginal: file.originalname, // Nombre original del archivo.
        nombreArchivo: file.filename, // Nombre con el que se almacena.
        tipoMime: file.mimetype, // Tipo MIME.
        size: file.size, // Tamaño en bytes.
        ruta: relativePath, // Ruta relativa para servir/descargar el archivo.
        descripcion, // Descripción opcional.
        fechaSubida: new Date(), // Fecha de subida.
        subidoPor: userId, // Id del usuario que sube (si existe).
      };
    });

    // Concatena los nuevos adjuntos a los existentes.
    proyecto.adjuntos = proyecto.adjuntos.concat(nuevosAdjuntos);
    await proyecto.save();

    // Vuelve a obtener el proyecto con referencias pobladas para la respuesta.
    const proyectoActualizado = await Proyectos.findById(proyectoId)
      .populate('materiales.material')
      .populate('materiales.movimientoInventario')
      .populate('lider', 'firstName lastName email role')
      .populate('comentarios.usuario', 'firstName lastName email role')
      .populate('adjuntos.subidoPor', 'firstName lastName email role');

    // Envía respuesta exitosa con el proyecto actualizado.
    return res.status(201).json({
      message: 'Archivos adjuntados correctamente',
      proyecto: proyectoActualizado,
    });
  } catch (error) {
    // Registra el error.
    console.error('Error al adjuntar archivos al proyecto:', error);
    // Envía error genérico.
    return res.status(500).json({ message: 'Error al adjuntar archivos al proyecto' });
  }
};

// --------------------------------------------------------------------------
// Eliminar un adjunto de un proyecto (subdocumento + archivo físico).
// --------------------------------------------------------------------------
const eliminarAdjuntoDeProyecto = async (req, res) => {
  try {
    // Extrae id de proyecto y de adjunto desde los parámetros.
    const proyectoId = req.params.id;
    const adjuntoId = req.params.adjuntoId;

    // Busca el proyecto.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Busca el subdocumento de adjunto por su id.
    const adjunto = proyecto.adjuntos.id(adjuntoId);
    if (!adjunto) {
      return res.status(404).json({ message: 'Adjunto no encontrado' });
    }

    // Obtiene la ruta relativa almacenada.
    const storedPath = adjunto.ruta || '';
    // Si tiene slash inicial, se remueve para evitar dobles separadores.
    const relativePath = storedPath.startsWith('/') ? storedPath.substring(1) : storedPath;

    // Construye la ruta absoluta al archivo físico.
    const filePath = path.join(__dirname, '..', relativePath);

    // Intenta eliminar el archivo físico; ignora el error si el archivo no existe.
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error al eliminar archivo físico:', err);
      }
    });

    // Elimina el subdocumento del adjunto del arreglo.
    adjunto.remove();
    await proyecto.save();

    // Vuelve a obtener el proyecto con referencias pobladas.
    const proyectoActualizado = await Proyectos.findById(proyectoId)
      .populate('materiales.material')
      .populate('materiales.movimientoInventario')
      .populate('lider', 'firstName lastName email role')
      .populate('comentarios.usuario', 'firstName lastName email role')
      .populate('adjuntos.subidoPor', 'firstName lastName email role');

    // Envía respuesta exitosa.
    return res.status(200).json({
      message: 'Adjunto eliminado correctamente',
      proyecto: proyectoActualizado,
    });
  } catch (error) {
    // Registra el error.
    console.error('Error al eliminar adjunto del proyecto:', error);
    // Envía error genérico.
    return res.status(500).json({ message: 'Error al eliminar adjunto del proyecto' });
  }
};

// --------------------------------------------------------------------------
// Actualizar un adjunto de un proyecto (descripción y opcionalmente archivo).
// --------------------------------------------------------------------------
const actualizarAdjuntoDeProyecto = async (req, res) => {
  try {
    // Extrae id de proyecto y de adjunto desde los parámetros.
    const proyectoId = req.params.id;
    const adjuntoId = req.params.adjuntoId;
    // Extrae la nueva descripción desde el cuerpo.
    const { descripcion } = req.body;

    // Busca el proyecto.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Busca el subdocumento de adjunto por su id.
    const adjunto = proyecto.adjuntos.id(adjuntoId);
    if (!adjunto) {
      return res.status(404).json({ message: 'Adjunto no encontrado' });
    }

    // Actualiza la descripción si se envió una cadena.
    if (typeof descripcion === 'string') {
      adjunto.descripcion = descripcion;
    }

    // Si se adjunta un nuevo archivo, se reemplaza el anterior.
    if (req.file) {
      // Construye ruta absoluta al archivo anterior para eliminarlo.
      const storedPath = adjunto.ruta || '';
      const relativeOld = storedPath.startsWith('/') ? storedPath.substring(1) : storedPath;
      const oldFilePath = path.join(__dirname, '..', relativeOld);

      // Elimina el archivo anterior si existe; ignora errores de "no encontrado".
      fs.unlink(oldFilePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error al eliminar archivo anterior:', err);
        }
      });

      // Construye la nueva ruta relativa para el archivo de reemplazo.
      const newRelativePath = path
        .join('uploads', 'proyectos', proyectoId, req.file.filename)
        .replace(/\\/g, '/');

      // Actualiza los metadatos del adjunto con la información del nuevo archivo.
      adjunto.nombreOriginal = req.file.originalname;
      adjunto.nombreArchivo = req.file.filename;
      adjunto.tipoMime = req.file.mimetype;
      adjunto.size = req.file.size;
      adjunto.ruta = newRelativePath;
      adjunto.fechaSubida = new Date();

      // Actualiza el usuario que sube si viene en la request.
      if (req.user && req.user.id) {
        adjunto.subidoPor = req.user.id;
      }
    }

    // Guarda el proyecto con el adjunto actualizado.
    await proyecto.save();

    // Vuelve a obtener el proyecto con referencias pobladas.
    const proyectoActualizado = await Proyectos.findById(proyectoId)
      .populate('materiales.material')
      .populate('materiales.movimientoInventario')
      .populate('lider', 'firstName lastName email role')
      .populate('comentarios.usuario', 'firstName lastName email role')
      .populate('adjuntos.subidoPor', 'firstName lastName email role');

    // Envía respuesta exitosa.
    return res.status(200).json({
      message: 'Adjunto actualizado correctamente',
      proyecto: proyectoActualizado,
    });
  } catch (error) {
    // Registra error.
    console.error('Error al actualizar adjunto del proyecto:', error);
    // Envía error genérico.
    return res.status(500).json({ message: 'Error al actualizar adjunto del proyecto' });
  }
};

// --------------------------------------------------------------------------
// Eliminar un proyecto por ID (con devolución de materiales y cierre de alertas).
// --------------------------------------------------------------------------
const eliminarProyectoPorId = async (req, res) => {
  // Extrae el id del proyecto desde los parámetros.
  const proyectoId = req.params.id;

  try {
    // Busca el proyecto y pobla materiales para poder revertir inventario.
    const proyecto = await Proyectos.findById(proyectoId).populate('materiales.material');

    // Si no existe, responde 404.
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Primero, devuelve los materiales asignados al inventario global.
    for (const item of proyecto.materiales) {
      // Busca el material correspondiente.
      const material = await Material.findById(item.material._id);
      if (material) {
        // Calcula la cantidad a devolver (asignado - utilizado).
        const cantidadDevolver = item.cantidadAsignada - item.cantidadUtilizada;

        // Aumenta el stock del material.
        material.cantidad += cantidadDevolver;
        await material.save();

        // Registra un movimiento de inventario tipo "entrada".
        const movimiento = new MovimientoInventario({
          material: material._id, // Id de material.
          tipo: 'entrada', // Movimiento de entrada.
          cantidad: cantidadDevolver, // Cantidad devuelta.
          motivo: `Devolución por eliminación de proyecto: ${proyecto.title}`, // Motivo descriptivo.
          proyecto: proyecto._id, // Id del proyecto.
          stockAnterior: material.cantidad - cantidadDevolver, // Stock anterior.
          stockNuevo: material.cantidad, // Stock actual.
          fecha: new Date(), // Fecha del movimiento.
        });
        // Guarda el movimiento de inventario.
        await movimiento.save();
      }
    }

    // Luego realiza una eliminación lógica: marca el proyecto como inactivo.
    // Esto conserva el registro en la base de datos para fines de auditoría,
    // pero lo excluye de los listados y consultas habituales.
    proyecto.activo = false;
    await proyecto.save();

    // Marca todas las alertas no resueltas de este proyecto como resueltas.
    await Alerta.updateMany(
      { proyecto: proyectoId, resolved: false }, // Filtro (alertas del proyecto sin resolver).
      { $set: { resolved: true } } // Actualización (marcarlas como resueltas).
    );

    // Envía mensaje de éxito.
    res.status(200).json({
      message: 'Proyecto eliminado correctamente y materiales devueltos al inventario',
    });
  } catch (error) {
    // Registra error interno.
    console.error('Error al eliminar proyecto:', error);
    // Envía respuesta genérica de error.
    res.status(500).json({ message: 'Error al eliminar proyecto' });
  }
};

// --------------------------------------------------------------------------
// Exportar listado de todos los proyectos a un PDF (informe ejecutivo).
// --------------------------------------------------------------------------
const exportarProyectosAPDF = async (req, res) => {
  try {
    // Busca todos los proyectos ordenados por fecha de creación (más recientes primero).
    const proyectos = await Proyectos.find().sort({ createdAt: -1 });

    // Si no hay proyectos, responde con 404.
    if (!proyectos || proyectos.length === 0) {
      return res.status(404).json({ message: 'No hay proyectos para exportar' });
    }

    // Asegura que exista el directorio de exportación para evitar errores ENOENT.
    const exportDir = path.join(__dirname, '..', 'exports'); // Ejemplo: BackEnd/src/modules/projects/exports.
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir); // Crea la carpeta si no existe.
    }

    // Crea instancia del documento PDF con márgenes y tamaño A4.
    const doc = new PDFDocument({
      margin: 40, // Margen de página.
      size: 'A4', // Tamaño A4.
      bufferPages: true, // Permite añadir pie de página con numeración.
    });

    // Construye la ruta de archivo con timestamp para evitar colisiones.
    const filePath = path.join(exportDir, `Proyectos_${Date.now()}.pdf`);

    // Crea stream de escritura y conecta la salida del PDF.
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Define la paleta de colores del informe.
    const colors = {
      primary: '#2563EB', // Azul principal.
      secondary: '#64748B', // Gris secundario.
      accent: '#8B5CF6', // Morado de acento.
      success: '#10B981', // Verde (éxito).
      warning: '#F59E0B', // Amarillo (advertencia).
      danger: '#EF4444', // Rojo (peligro).
      text: '#1E293B', // Color de texto principal.
      lightBg: '#F8FAFC', // Fondo claro.
    };

    // ----------------------------------------------------------------------
    // ENCABEZADO del PDF (título y fecha).
    // ----------------------------------------------------------------------
    doc.rect(0, 0, doc.page.width, 50).fill(colors.primary); // Dibuja barra de encabezado.

    doc
      .fillColor('#FFFFFF') // Texto blanco sobre el encabezado azul.
      .fontSize(28) // Tamaño para el título.
      .font('Helvetica-Bold') // Fuente en negrita.
      .text('LISTADO DE PROYECTOS', 40, 22); // Texto del título.

    const fecha = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }); // Fecha actual en formato largo.

    doc
      .fontSize(11) // Tamaño más pequeño para la fecha.
      .font('Helvetica') // Fuente regular.
      .text(`Generado: ${fecha}`, 40, 40); // Fecha de generación.

    doc.moveDown(2); // Espacio después del encabezado.

    // ----------------------------------------------------------------------
    // RESUMEN (KPIs).
    // ----------------------------------------------------------------------
    const totalProyectos = proyectos.length; // Número total de proyectos.

    // Cuenta proyectos con estado "completado" usando helper de normalización.
    const completados = proyectos.filter(
      (p) => normalizarEstadoProyecto(p.status) === 'completado'
    ).length;

    // Cuenta proyectos "en proceso" usando helper de normalización.
    const enProceso = proyectos.filter(
      (p) => normalizarEstadoProyecto(p.status) === 'en_proceso'
    ).length;

    // Suma presupuestos usando 0 como valor por defecto cuando esté indefinido o nulo.
    const presupuestoTotal = proyectos.reduce(
      (sum, p) => sum + (p.budget || 0),
      0
    );

    // Dibuja caja de resumen con KPIs.
    const startY = doc.y; // Posición vertical actual.
    doc.roundedRect(40, startY, 515, 50, 3).fill(colors.lightBg); // Fondo de la caja.

    // Total de proyectos.
    doc
      .fillColor(colors.text) // Color de texto.
      .fontSize(10) // Tamaño para etiqueta.
      .font('Helvetica-Bold') // Fuente en negrita.
      .text('Total Proyectos', 55, startY + 12, { width: 100 }) // Etiqueta.
      .fontSize(16) // Tamaño para valor.
      .fillColor(colors.primary) // Color del valor.
      .font('Helvetica') // Fuente regular.
      .text(totalProyectos.toString(), 55, startY + 26); // Valor numérico.

    // Proyectos completados.
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica-Bold')
      .text('Completados', 170, startY + 12, { width: 100 })
      .fontSize(16)
      .fillColor(colors.success)
      .font('Helvetica')
      .text(completados.toString(), 170, startY + 26);

    // Proyectos en proceso.
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica-Bold')
      .text('En Proceso', 285, startY + 12, { width: 100 })
      .fontSize(16)
      .fillColor(colors.warning)
      .font('Helvetica')
      .text(enProceso.toString(), 285, startY + 26);

    // Presupuesto total (en millones).
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica-Bold')
      .text('Presupuesto', 400, startY + 12, { width: 150 })
      .fontSize(16)
      .fillColor(colors.accent)
      .font('Helvetica')
      .text(`$${(presupuestoTotal / 1_000_000).toFixed(1)}M`, 400, startY + 26);

    doc.moveDown(4); // Espacio después del resumen.

    // ----------------------------------------------------------------------
    // TÍTULO de la sección de lista de proyectos.
    // ----------------------------------------------------------------------
    const titleY = doc.y; // Posición vertical del título de sección.
    doc
      .moveTo(40, titleY) // Comienzo de la línea.
      .lineTo(48, titleY) // Final de la línea.
      .lineWidth(3) // Grosor de la línea.
      .strokeColor(colors.primary) // Color de la línea.
      .stroke(); // Traza la línea.

    doc
      .fontSize(16) // Tamaño para el título de sección.
      .font('Helvetica-Bold') // Fuente en negrita.
      .fillColor(colors.text) // Color de texto.
      .text('Proyectos', 52, titleY - 5); // Texto del título.

    doc.moveDown(1); // Espacio antes de las tarjetas.

    // ----------------------------------------------------------------------
    // BUCLE de tarjetas de proyectos.
    // ----------------------------------------------------------------------
    proyectos.forEach((proyecto) => {
      // Si estamos muy cerca del final de página, se agrega una nueva.
      if (doc.y > 650) {
        doc.addPage();
      }

      const cardY = doc.y; // Parte superior de la tarjeta actual.

      // Dibuja fondo de tarjeta.
      doc.roundedRect(40, cardY, 515, 115, 3).fill(colors.lightBg);

      // Elige color de borde según estado del proyecto usando helper.
      const categoriaEstado = normalizarEstadoProyecto(proyecto.status);   // Clasifica el estado del proyecto.
      let statusColor = colors.secondary;                                  // Color por defecto para estados "otros".
      if (categoriaEstado === 'completado') statusColor = colors.success;  // Verde si está completado.
      else if (categoriaEstado === 'en_proceso') statusColor = colors.warning; // Amarillo si está en proceso.
      else if (categoriaEstado === 'cancelado') statusColor = colors.danger;   // Rojo si está cancelado.

      // Dibuja banda de color al lado izquierdo de la tarjeta.
      doc.rect(40, cardY, 5, 115).fill(statusColor);

      // Título del proyecto (truncado para evitar desbordes).
      const tituloProyecto = (proyecto.title || '').substring(0, 60);
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(colors.text)
        .text(tituloProyecto, 55, cardY + 12, { width: 450 });

      // ---------------- Columna izquierda: información básica ----------------
      let leftY = cardY + 32; // Posición vertical inicial en la columna izquierda.
      doc.fontSize(9).fillColor(colors.secondary); // Tamaño y color de texto.

      // Ubicación (usa ciudad y país cuando existan).
      const ubicacionTexto = proyecto.location
        ? `${proyecto.location} - ${proyecto.ciudad || ''} ${proyecto.pais || ''}`.trim()
        : `${proyecto.ciudad || ''} ${proyecto.pais || ''}`.trim();

      doc.font('Helvetica-Bold').text('Ubicación: ', 55, leftY, { continued: true });
      doc.font('Helvetica').text(ubicacionTexto || '-');

      // Tipo.
      leftY += 11;
      doc.font('Helvetica-Bold').text('Tipo: ', 55, leftY, { continued: true });
      doc.font('Helvetica').text(proyecto.type || '-');

      // Presupuesto.
      leftY += 11;
      doc.font('Helvetica-Bold').text('Presupuesto: ', 55, leftY, { continued: true });
      const budgetValue = proyecto.budget || 0;
      doc
        .fillColor(colors.accent)
        .font('Helvetica')
        .text(`$${budgetValue.toLocaleString('es-ES')}`);

      // Duración.
      leftY += 11;
      doc.fillColor(colors.secondary);
      doc.font('Helvetica-Bold').text('Duración: ', 55, leftY, { continued: true });
      doc
        .font('Helvetica')
        .text(proyecto.duration != null ? `${proyecto.duration} días` : '-');

      // Prioridad.
      leftY += 11;
      doc.font('Helvetica-Bold').text('Prioridad: ', 55, leftY, { continued: true });
      doc.font('Helvetica').text(proyecto.priority || '-');

      // ---------------- Columna derecha: estado y fechas ----------------
      let rightY = cardY + 32; // Posición vertical en la columna derecha.

      // Estado.
      doc.font('Helvetica-Bold').text('Estado: ', 300, rightY, { continued: true });
      doc.fillColor(statusColor).font('Helvetica').text(proyecto.status || '-');

      // Progreso.
      rightY += 11;
      doc.fillColor(colors.secondary);
      doc.font('Helvetica-Bold').text('Progreso: ', 300, rightY, { continued: true });
      const progressValue = proyecto.progress != null ? proyecto.progress : 0;
      doc.font('Helvetica').text(`${progressValue}%`);

      // Barra de progreso (fondo).
      doc
        .rect(380, rightY - 4, 160, 7)
        .strokeColor('#CCCCCC')
        .lineWidth(0.5)
        .stroke();

      // Barra de progreso (relleno).
      doc.rect(380, rightY - 4, (160 * progressValue) / 100, 7).fill(colors.success);

      // Fecha de inicio.
      rightY += 11;
      doc.fillColor(colors.secondary);
      doc.font('Helvetica-Bold').text('Inicio: ', 300, rightY, { continued: true });
      doc.font('Helvetica').text(formatearFecha(proyecto.startDate));

      // Fecha de fin.
      rightY += 11;
      doc.font('Helvetica-Bold').text('Fin: ', 300, rightY, { continued: true });
      doc.font('Helvetica').text(formatearFecha(proyecto.endDate));

      // Email.
      rightY += 11;
      doc.font('Helvetica-Bold').text('Email: ', 300, rightY, { continued: true });
      doc.font('Helvetica').text((proyecto.email || '').substring(0, 25));

      // Equipo (formateado y truncado).
      rightY += 11;
      const equipoRaw = formatearEquipo(proyecto.team);
      const equipoText = equipoRaw.substring(0, 25);
      doc.font('Helvetica-Bold').text('Equipo: ', 300, rightY, { continued: true });
      doc.font('Helvetica').text(equipoText);

      // Ajusta la posición vertical después de terminar la tarjeta.
      doc.y = cardY + 125;
    });

    // ----------------------------------------------------------------------
    // PIE DE PÁGINA: numeración y texto adicional en cada página.
    // ----------------------------------------------------------------------
    const range = doc.bufferedPageRange(); // Obtiene rango de páginas almacenadas.
    for (let i = range.start; i < range.start + range.count; i++) {
      // Cambia a cada página por índice.
      doc.switchToPage(i);

      const bottom = doc.page.height - 30; // Posición de base del pie de página.

      // Dibuja línea horizontal de separación.
      doc
        .moveTo(40, bottom)
        .lineTo(doc.page.width - 40, bottom)
        .strokeColor('#E2E8F0')
        .lineWidth(0.5)
        .stroke();

      // Texto de número de página.
      doc
        .fontSize(8)
        .fillColor(colors.secondary)
        .font('Helvetica')
        .text(`Página ${i + 1} de ${range.count}`, 40, bottom + 10, {
          width: doc.page.width - 80,
          align: 'center',
        });

      // Texto de copyright.
      doc
        .fontSize(7)
        .text('© 2025 - Sistema de Gestión de Proyectos', 40, bottom + 18, {
          width: doc.page.width - 80,
          align: 'center',
        });
    }

    // Finaliza el documento PDF.
    doc.end();

    // Cuando termine de escribir el archivo, se dispara la descarga.
    writeStream.on('finish', () => {
      // Usa res.download de Express para enviar el archivo.
      res.download(filePath, 'Proyectos.pdf', (err) => {
        if (err) {
          // Registra error si falla la descarga.
          console.error('Error al descargar PDF:', err);
          // Devuelve error al cliente.
          res.status(500).json({ message: 'Error al descargar el PDF' });
        }
        // Elimina el archivo temporal del disco.
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    // Registra error en consola.
    console.error('Error al exportar proyectos a PDF:', error);
    // Devuelve mensaje genérico de error.
    res.status(500).json({ message: 'Error al exportar proyectos a PDF' });
  }
};

// --------------------------------------------------------------------------
// Exportar un proyecto específico a PDF.
// --------------------------------------------------------------------------
const exportarProyectoPorIdAPDF = async (req, res) => {
  try {
    // Extrae id de proyecto desde los parámetros.
    const proyectoId = req.params.id;

    // Busca el proyecto por id.
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Asegura que exista el directorio de exportación.
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Construye la ruta de salida del archivo para este proyecto.
    const filePath = path.join(exportDir, `Proyecto_${proyecto._id}.pdf`);

    // Crea documento PDF para el proyecto individual.
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      bufferPages: true,
    });

    // Conecta el PDF a un stream de escritura en disco.
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Reutiliza la misma paleta de colores.
    const colors = {
      primary: '#2563EB',
      secondary: '#64748B',
      accent: '#8B5CF6',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      text: '#1E293B',
      lightBg: '#F8FAFC',
    };

    // ----------------------------------------------------------------------
    // ENCABEZADO del PDF individual.
    // ----------------------------------------------------------------------
    doc.rect(0, 0, doc.page.width, 50).fill(colors.primary);

    doc
      .fillColor('#FFFFFF')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('DETALLES DEL PROYECTO', 40, 22);

    const fecha = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Generado: ${fecha}`, 40, 40);

    doc.moveDown(2);

    // ----------------------------------------------------------------------
    // CAJA DE TÍTULO DEL PROYECTO.
    // ----------------------------------------------------------------------
    const titleY = doc.y;
    doc.roundedRect(40, titleY, 515, 35, 3).fill(colors.lightBg);

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(colors.text)
      .text(proyecto.title || '-', 55, titleY + 15, { width: 495 });

    doc.moveDown(3);

    // ----------------------------------------------------------------------
    // SECCIÓN DE INFORMACIÓN GENERAL.
    // ----------------------------------------------------------------------
    const sectionY = doc.y;
    doc
      .moveTo(40, sectionY)
      .lineTo(48, sectionY)
      .lineWidth(3)
      .strokeColor(colors.primary)
      .stroke();

    doc
      .fontSize(15)
      .font('Helvetica-Bold')
      .fillColor(colors.text)
      .text('Información General', 52, sectionY - 4);

    doc.moveDown(1);

    // Caja de información.
    const infoY = doc.y;
    doc.roundedRect(40, infoY, 515, 130, 3).fill(colors.lightBg);

    doc.fontSize(10).fillColor(colors.secondary);

    // Columna izquierda: ubicación, tipo, presupuesto, duración, prioridad, email.
    let leftY = infoY + 15;

    const ubicacionTexto = proyecto.location
      ? `${proyecto.location} - ${proyecto.ciudad || ''} ${proyecto.pais || ''}`.trim()
      : `${proyecto.ciudad || ''} ${proyecto.pais || ''}`.trim();

    doc.font('Helvetica-Bold').text('Ubicación:', 55, leftY, { continued: true });
    doc.font('Helvetica').text(` ${ubicacionTexto || '-'}`);

    leftY += 13;
    doc.font('Helvetica-Bold').text('Tipo:', 55, leftY, { continued: true });
    doc.font('Helvetica').text(` ${proyecto.type || '-'}`);

    leftY += 13;
    doc.font('Helvetica-Bold').text('Presupuesto:', 55, leftY);
    const budgetValue = proyecto.budget || 0;
    doc
      .fillColor(colors.accent)
      .fontSize(13)
      .font('Helvetica')
      .text(`$${budgetValue.toLocaleString('es-ES')}`, 140, leftY);

    leftY += 13;
    doc.fontSize(10).fillColor(colors.secondary);
    doc.font('Helvetica-Bold').text('Duración:', 55, leftY, { continued: true });
    doc
      .font('Helvetica')
      .text(proyecto.duration != null ? ` ${proyecto.duration} días` : ' -');

    leftY += 13;
    doc.font('Helvetica-Bold').text('Prioridad:', 55, leftY, { continued: true });
    doc.font('Helvetica').text(` ${proyecto.priority || '-'}`);

    leftY += 13;
    doc.font('Helvetica-Bold').text('Email:', 55, leftY, { continued: true });
    doc.font('Helvetica').text(` ${proyecto.email || '-'}`);

    // Columna derecha: estado, progreso, fechas, equipo.
    let rightY = infoY + 15;

    // Estado.
    doc.font('Helvetica-Bold').text('Estado:', 320, rightY, { continued: true });
    const categoriaEstado = normalizarEstadoProyecto(proyecto.status);     // Clasifica el estado para color.
    let statusColor = colors.secondary;                                    // Color por defecto para otros estados.
    if (categoriaEstado === 'completado') statusColor = colors.success;    // Verde si completado.
    else if (categoriaEstado === 'en_proceso') statusColor = colors.warning; // Amarillo si en proceso.
    else if (categoriaEstado === 'cancelado') statusColor = colors.danger;   // Rojo si cancelado.
    doc.fillColor(statusColor).font('Helvetica').text(` ${proyecto.status || '-'}`);

    // Progreso.
    rightY += 13;
    doc.fillColor(colors.secondary);
    doc.font('Helvetica-Bold').text('Progreso:', 320, rightY, { continued: true });
    const progressValue = proyecto.progress != null ? proyecto.progress : 0;
    doc.font('Helvetica').text(` ${progressValue}%`);

    // Barra de progreso (fondo).
    rightY += 8;
    doc
      .rect(320, rightY, 220, 13)
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .stroke();

    // Barra de progreso (relleno).
    doc.rect(320, rightY, (220 * progressValue) / 100, 13).fill(colors.success);

    // Texto de porcentaje dentro de la barra.
    doc
      .fontSize(9)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .text(`${progressValue}%`, 320, rightY + 3, {
        width: 220,
        align: 'center',
      });

    // Fecha de inicio.
    rightY += 18;
    doc.fontSize(10).fillColor(colors.secondary).font('Helvetica');

    doc.font('Helvetica-Bold').text('Inicio:', 320, rightY, { continued: true });
    doc.font('Helvetica').text(` ${formatearFecha(proyecto.startDate)}`);

    // Fecha de fin.
    rightY += 13;
    doc.font('Helvetica-Bold').text('Fin:', 320, rightY, { continued: true });
    doc.font('Helvetica').text(` ${formatearFecha(proyecto.endDate)}`);

    // Equipo.
    rightY += 13;
    const equipoText = formatearEquipo(proyecto.team);
    doc.font('Helvetica-Bold').text('Equipo:', 320, rightY, { continued: true });
    doc.font('Helvetica').text(` ${equipoText}`);

    doc.moveDown(10);

    // ----------------------------------------------------------------------
    // SECCIÓN DE DESCRIPCIÓN.
    // ----------------------------------------------------------------------
    const descY = doc.y;
    doc
      .moveTo(40, descY)
      .lineTo(48, descY)
      .lineWidth(3)
      .strokeColor(colors.accent)
      .stroke();

    doc
      .fontSize(15)
      .font('Helvetica-Bold')
      .fillColor(colors.text)
      .text('Descripción', 52, descY - 4);

    doc.moveDown(1);

    const descripcion = proyecto.comentario || 'Sin descripción proporcionada';
    const descBoxY = doc.y;

    doc.roundedRect(40, descBoxY, 515, 80, 3).fill(colors.lightBg);

    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica')
      .text(descripcion, 55, descBoxY + 15, {
        width: 495,
        align: 'justify',
      });

    // ----------------------------------------------------------------------
    // PIE DE PÁGINA (para una sola página).
    // ----------------------------------------------------------------------
    const bottom = doc.page.height - 30;

    doc
      .moveTo(40, bottom)
      .lineTo(doc.page.width - 40, bottom)
      .strokeColor('#E2E8F0')
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8)
      .fillColor(colors.secondary)
      .font('Helvetica')
      .text('Página 1 de 1', 40, bottom + 10, {
        width: doc.page.width - 80,
        align: 'center',
      });

    doc
      .fontSize(7)
      .text('© 2025 - Sistema de Gestión de Proyectos', 40, bottom + 18, {
        width: doc.page.width - 80,
        align: 'center',
      });

    // Finaliza el documento PDF.
    doc.end();

    // Cuando termine de escribir, se dispara la descarga.
    writeStream.on('finish', () => {
      res.download(filePath, `Proyecto_${proyecto._id}.pdf`, (err) => {
        if (err) {
          console.error('Error al enviar el PDF:', err);
          res.status(500).json({ message: 'Error al enviar el PDF' });
        }
        // Elimina el archivo temporal del disco.
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    // Registra error interno.
    console.error('Error al exportar proyecto:', error);
    // Envía respuesta genérica.
    res.status(500).json({ message: 'Error al exportar proyecto' });
  }
};

// ============================================================================
// Exportación de controladores
// ============================================================================
//
// NOTA IMPORTANTE:
// Se exportan tanto los nombres nuevos en español como ALIAS con los nombres
// antiguos para mantener compatibilidad con rutas existentes.
//
module.exports = {
  // Nombres nuevos en español (recomendados a futuro).
  obtenerProyectos,
  obtenerProyectosRecientes,
  crearProyecto,
  obtenerProyectosUsuario,
  obtenerProyectoPorId,
  obtenerProgresoDeProyecto,
  actualizarProyectoPorId,
  eliminarProyectoPorId,
  registrarUsoDeMaterial,
  obtenerCostoDeMateriales,
  verificarDisponibilidadDeMateriales,
  exportarProyectosAPDF,
  exportarProyectoPorIdAPDF,
  agregarComentarioAProyecto,
  asignarLiderAProyecto,
  removerLiderDeProyecto,
  agregarAdjuntosAProyecto,
  eliminarAdjuntoDeProyecto,
  actualizarAdjuntoDeProyecto,

  // Aliases con los nombres antiguos (compatibilidad existente).
  getProyectos: obtenerProyectos,
  getProyectosRecientes: obtenerProyectosRecientes,
  getProyectosUsuario: obtenerProyectosUsuario,
  getProyectoById: obtenerProyectoPorId,
  getProgresoProyecto: obtenerProgresoDeProyecto,
  updateProyectoById: actualizarProyectoPorId,
  deleteProyectoById: eliminarProyectoPorId,
  registrarUsoMaterial: registrarUsoDeMaterial,
  getCostoMateriales: obtenerCostoDeMateriales,
  verificarDisponibilidadMateriales: verificarDisponibilidadDeMateriales,
  exportarProyectosPDF: exportarProyectosAPDF,
  exportProyectoByIdToPDF: exportarProyectoPorIdAPDF,
  addComentarioProyecto: agregarComentarioAProyecto,
  asignarLiderProyecto: asignarLiderAProyecto,
  removerLiderProyecto: removerLiderDeProyecto,
  addAdjuntosProyecto: agregarAdjuntosAProyecto,
  deleteAdjuntoProyecto: eliminarAdjuntoDeProyecto,
  updateAdjuntoProyecto: actualizarAdjuntoDeProyecto,
};
