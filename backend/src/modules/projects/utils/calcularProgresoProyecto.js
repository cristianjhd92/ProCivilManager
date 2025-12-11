// File: BackEnd/src/modules/projects/utils/calcularProgresoProyecto.js
// Description: Utilidad para centralizar el cálculo del progreso de un proyecto
//              en ProCivil Manager (PCM). Combina criterios de avance
//              (criteriosAvance), tiempo, estado y progreso manual en un
//              porcentaje total 0–100%. Además expone una función para
//              generar plantillas de criterios por tipo de proyecto y prioridad,
//              de forma que al crear un proyecto se puedan inicializar
//              automáticamente estos criterios.

// ============================================================================
// Funciones auxiliares internas: normalización y cálculo base
// ============================================================================

/**
 * Normaliza un valor numérico a un rango 0–100.
 * @param {number} valor Valor a normalizar.
 * @returns {number} Número entre 0 y 100 (redondeado).
 */
function normalizarPorcentaje(valor) {
  if (!Number.isFinite(valor)) return 0;        // Si no es un número finito, devolvemos 0.
  if (valor < 0) return 0;                      // Limitamos inferiormente a 0.
  if (valor > 100) return 100;                  // Limitamos superiormente a 100.
  return Math.round(valor);                     // Redondeamos al entero más cercano.
}

/**
 * Calcula el avance por tiempo con base en startDate y endDate.
 * @param {Date|string|number} start Fecha de inicio.
 * @param {Date|string|number} end Fecha de fin.
 * @param {Date} [ahora=new Date()] Fecha de referencia (para pruebas).
 * @returns {number} Porcentaje de avance de tiempo (0–100).
 */
function calcularAvancePorTiempo(start, end, ahora = new Date()) {
  const inicio = start ? new Date(start) : null;    // Intenta construir la fecha de inicio.
  const fin = end ? new Date(end) : null;           // Intenta construir la fecha de fin.

  if (!inicio || Number.isNaN(inicio.getTime())) {  // Si la fecha de inicio es inválida...
    return 0;                                       // ...devolvemos 0.
  }

  if (!fin || Number.isNaN(fin.getTime())) {        // Si la fecha de fin es inválida...
    return 0;                                       // ...devolvemos 0.
  }

  if (fin.getTime() <= inicio.getTime()) {          // Si la fecha de fin es anterior o igual a inicio...
    return 0;                                       // ...no tiene sentido calcular → 0.
  }

  const transcurrido = ahora.getTime() - inicio.getTime(); // Milisegundos transcurridos desde el inicio.
  const total = fin.getTime() - inicio.getTime();          // Duración total en milisegundos.

  if (transcurrido <= 0) return 0;                 // Si aún no hemos llegado a la fecha de inicio → 0%.
  if (transcurrido >= total) return 100;           // Si ya pasamos la fecha de fin → 100%.

  const porcentaje = (transcurrido / total) * 100; // Calcula el porcentaje transcurrido.
  return normalizarPorcentaje(porcentaje);         // Devuelve el porcentaje normalizado 0–100.
}

/**
 * Mapea el estado del proyecto a un porcentaje de avance aproximado.
 * @param {string} status Estado textual del proyecto.
 * @returns {number} Porcentaje aproximado asociado al estado.
 */
function calcularAvancePorEstado(status) {
  const valor = (status || '').toString().toLowerCase(); // Normaliza a minúsculas.

  switch (valor) {                                       // Mapa simple estado → porcentaje.
    case 'planning':
    case 'planificacion':
    case 'planificación':
      return 10;                                         // Estado inicial de planeación.

    case 'pending':
    case 'pendiente':
      return 20;                                         // Proyecto creado pero sin iniciar obra.

    case 'active':
    case 'en progreso':
    case 'in progress':
    case 'active-project':
      return 60;                                         // Proyecto en ejecución de obra.

    case 'completed':
    case 'completado':
    case 'terminado':
      return 100;                                        // Proyecto culminado.

    case 'cancelled':
    case 'cancelado':
      return 100;                                        // Proyecto cancelado → cerrado (100).

    default:
      return 0;                                          // Estado desconocido o vacío → 0.
  }
}

/**
 * Limpia y normaliza un valor de progreso manual (campo proyecto.progress).
 * @param {number} progreso Valor recibido desde la BD.
 * @returns {number} Porcentaje 0–100.
 */
function normalizarProgresoManual(progreso) {
  if (progreso == null) return 0;           // Si viene nulo o indefinido, devolvemos 0.
  const valor = Number(progreso);           // Convertimos a número.
  if (!Number.isFinite(valor)) return 0;    // Si no es número finito, devolvemos 0.
  return normalizarPorcentaje(valor);       // Normalizamos a 0–100.
}

/**
 * Calcula el avance global de criteriosAvance.
 * La fórmula toma los porcentajes de cada criterio y calcula qué proporción
 * de ese total corresponde a criterios marcados como cumplidos.
 *
 * Esto permite que, aunque la suma de porcentajes no sea exactamente 100,
 * si todos los criterios están cumplidos el resultado sea 100%.
 *
 * @param {Array} criteriosArreglo Arreglo de criterios del proyecto.
 * @returns {number} Porcentaje de avance por criterios (0–100).
 */
function calcularAvancePorCriterios(criteriosArreglo) {
  if (!Array.isArray(criteriosArreglo) || criteriosArreglo.length === 0) {
    return 0;                                       // Si no hay criterios, el avance por criterios es 0.
  }

  let sumaTotal = 0;                                // Acumula la suma de porcentajes de todos los criterios válidos.
  let sumaCumplidos = 0;                            // Acumula la suma de porcentajes de criterios cumplidos.

  for (const criterio of criteriosArreglo) {        // Recorre cada criterio del arreglo.
    const porcentaje = Number(criterio.porcentaje); // Toma el porcentaje del criterio actual.

    if (!Number.isFinite(porcentaje) || porcentaje <= 0) {
      continue;                                     // Si el porcentaje no es válido o es <= 0, se ignora.
    }

    sumaTotal += porcentaje;                        // Suma el porcentaje al total posible.

    if (criterio.cumplido) {                        // Si el criterio está marcado como cumplido...
      sumaCumplidos += porcentaje;                  // ...sumamos su porcentaje a los cumplidos.
    }
  }

  if (sumaTotal <= 0) {                             // Si la suma de porcentajes es 0 (mal definidos)...
    return 0;                                       // ...devolvemos 0 para evitar divisiones por 0.
  }

  const porcentaje = (sumaCumplidos / sumaTotal) * 100; // Proporción completada en términos de 0–100%.
  return normalizarPorcentaje(porcentaje);              // Normalizamos el resultado a 0–100.
}

// ============================================================================
// Plantillas de criterios por tipo de proyecto y prioridad
// ============================================================================

/**
 * Mapa base de plantillas de criterios según tipo de proyecto y prioridad.
 * Cada criterio incluye: codigo, nombre, descripcion y porcentaje.
 *
 * NOTA: estos son criterios base a nivel de negocio general para PCM.
 *       Si en el futuro quieres afinarlos por cliente/empresa, se puede
 *       extraer esta configuración a BD o a un archivo JSON externo.
 */
const PLANTILLAS_CRITERIOS = {
  // Proyectos de obra nueva (residencial, comercial, industrial, infraestructura)
  obra_nueva: {
    alta: [
      {
        codigo: 'ESTUDIOS_DISENOS_APROBADOS',
        nombre: 'Estudios y diseños aprobados',
        descripcion:
          'Todos los estudios, diseños y memorias han sido revisados y aprobados por las partes responsables.',
        porcentaje: 15,
      },
      {
        codigo: 'LICENCIAS_PERMISOS_COMPLETOS',
        nombre: 'Licencias y permisos completos',
        descripcion:
          'Se cuenta con todas las licencias urbanísticas, ambientales y permisos de trabajo requeridos.',
        porcentaje: 10,
      },
      {
        codigo: 'CIMENTACION_ESTRUCTURA_TERMINADA',
        nombre: 'Cimentación y estructura terminadas',
        descripcion:
          'La cimentación y la estructura principal de la obra están construidas y recibidas a satisfacción.',
        porcentaje: 30,
      },
      {
        codigo: 'INSTALACIONES_PRINCIPALES_EJECUTADAS',
        nombre: 'Instalaciones principales ejecutadas',
        descripcion:
          'Instalaciones eléctricas, hidrosanitarias y especiales ejecutadas en su totalidad y probadas.',
        porcentaje: 20,
      },
      {
        codigo: 'ACABADOS_PRINCIPALES_COMPLETADOS',
        nombre: 'Acabados principales completados',
        descripcion:
          'Acabados arquitectónicos principales finalizados (pisos, muros, carpintería, etc.).',
        porcentaje: 15,
      },
      {
        codigo: 'ENTREGA_Y_CIERRE',
        nombre: 'Entrega y acta de terminación',
        descripcion:
          'Se entrega la obra al cliente con actas firmadas, manuales y documentación de cierre.',
        porcentaje: 10,
      },
    ],
    media: [
      {
        codigo: 'ALCANCE_DEFINIDO_Y_PRESUPUESTO_APROBADO',
        nombre: 'Alcance definido y presupuesto aprobado',
        descripcion:
          'Se tiene alcance de la obra definido y presupuesto aprobado por el cliente o la gerencia.',
        porcentaje: 20,
      },
      {
        codigo: 'LICENCIAS_MINIMAS_Y_APROBACIONES',
        nombre: 'Licencias mínimas y aprobaciones',
        descripcion:
          'Licencias y aprobaciones básicas necesarias para iniciar obra están obtenidas.',
        porcentaje: 10,
      },
      {
        codigo: 'OBRA_GRUESA_AVANZADA',
        nombre: 'Obra gruesa avanzada',
        descripcion:
          'Cimentación, estructura y muros principales se encuentran ejecutados.',
        porcentaje: 30,
      },
      {
        codigo: 'INSTALACIONES_Y_ACABADOS_INTERMEDIOS',
        nombre: 'Instalaciones y acabados intermedios',
        descripcion:
          'Instalaciones y acabados se encuentran en ejecución con un avance significativo.',
        porcentaje: 25,
      },
      {
        codigo: 'ENTREGA_PARCIAl_Y_PUNCHLIST',
        nombre: 'Entrega parcial y corrección de observaciones',
        descripcion:
          'Se han atendido observaciones y se encuentra en etapa de cierre.',
        porcentaje: 15,
      },
    ],
    baja: [
      {
        codigo: 'ALCANCE_MINIMO_DEFINIDO',
        nombre: 'Alcance mínimo definido',
        descripcion:
          'Se tiene claridad sobre el alcance mínimo, objetivos y entregables de la obra.',
        porcentaje: 30,
      },
      {
        codigo: 'INICIO_DE_OBRA',
        nombre: 'Inicio de obra',
        descripcion:
          'Se ha iniciado la obra con alistamiento de personal, equipos y frentes de trabajo.',
        porcentaje: 30,
      },
      {
        codigo: 'ACTIVIDADES_PRINCIPALES_EJECUTADAS',
        nombre: 'Actividades principales ejecutadas',
        descripcion:
          'Las actividades principales del proyecto se encuentran ejecutadas o en etapa final.',
        porcentaje: 25,
      },
      {
        codigo: 'ENTREGA_BASICA',
        nombre: 'Entrega básica al cliente',
        descripcion:
          'Se entrega la obra sin mayores exigencias adicionales de documentación.',
        porcentaje: 15,
      },
    ],
  },

  // Proyectos de mantenimiento / rehabilitación
  mantenimiento: {
    alta: [
      {
        codigo: 'DIAGNOSTICO_Y_ALCANCE_APROBADO',
        nombre: 'Diagnóstico y alcance aprobado',
        descripcion:
          'Se cuenta con diagnóstico técnico y alcance de intervención aprobado.',
        porcentaje: 20,
      },
      {
        codigo: 'MATERIALES_Y_RECURSOS_EN_SITIO',
        nombre: 'Materiales y recursos en sitio',
        descripcion:
          'Los materiales, equipos y recursos necesarios están en sitio y listos para usar.',
        porcentaje: 25,
      },
      {
        codigo: 'INTERVENCION_PRINCIPAL_EJECUTADA',
        nombre: 'Intervención principal ejecutada',
        descripcion:
          'La intervención de mantenimiento o rehabilitación principal ha sido ejecutada.',
        porcentaje: 40,
      },
      {
        codigo: 'VERIFICACION_Y_ENTREGA',
        nombre: 'Verificación y entrega',
        descripcion:
          'Se realizan pruebas, verificaciones y se hace entrega formal al cliente.',
        porcentaje: 15,
      },
    ],
    media: [
      {
        codigo: 'INSPECCION_INICIAL_REALIZADA',
        nombre: 'Inspección inicial realizada',
        descripcion:
          'Se ha realizado inspección visual y levantamiento de información.',
        porcentaje: 25,
      },
      {
        codigo: 'PLAN_DE_TRABAJO_DEFINIDO',
        nombre: 'Plan de trabajo definido',
        descripcion:
          'Se cuenta con un plan de trabajo, cronograma y recursos definidos.',
        porcentaje: 25,
      },
      {
        codigo: 'EJECUCION_INTERMEDIA',
        nombre: 'Ejecución intermedia de actividades',
        descripcion:
          'El proyecto se encuentra con un avance intermedio en la ejecución de actividades.',
        porcentaje: 30,
      },
      {
        codigo: 'CIERRE_Y_OBSERVACIONES',
        nombre: 'Cierre y observaciones atendidas',
        descripcion:
          'Se atienden observaciones y se cierra el proyecto de mantenimiento.',
        porcentaje: 20,
      },
    ],
    baja: [
      {
        codigo: 'PLAN_BASICO_DE_INTERVENCION',
        nombre: 'Plan básico de intervención',
        descripcion:
          'Se define un plan basic de intervención sin mayores requerimientos formales.',
        porcentaje: 30,
      },
      {
        codigo: 'EJECUCION_BASICA',
        nombre: 'Ejecución básica de actividades',
        descripcion:
          'Se ejecutan las actividades de mantenimiento esenciales.',
        porcentaje: 50,
      },
      {
        codigo: 'ENTREGA_SIMPLE',
        nombre: 'Entrega simple',
        descripcion:
          'Se entrega el trabajo al cliente sin requerir documentación extensa.',
        porcentaje: 20,
      },
    ],
  },

  // Proyectos de consultoría / diseño / interventoría
  consultoria: {
    alta: [
      {
        codigo: 'RECOLECCION_INFORMACION',
        nombre: 'Recolección de información',
        descripcion:
          'Se recopila información técnica, normativa y de campo necesaria para el estudio.',
        porcentaje: 20,
      },
      {
        codigo: 'MODELACION_Y_ANALISIS',
        nombre: 'Modelación y análisis',
        descripcion:
          'Se desarrollan modelos, cálculos y análisis principales del proyecto.',
        porcentaje: 40,
      },
      {
        codigo: 'BORRADOR_ENTREGABLE',
        nombre: 'Borrador de entregable',
        descripcion:
          'Se elabora y socializa un borrador del informe o entregables principales.',
        porcentaje: 20,
      },
      {
        codigo: 'ENTREGABLE_FINAL_Y_CIERRE',
        nombre: 'Entregable final y cierre',
        descripcion:
          'Se entrega el informe final y se realiza cierre formal con el cliente.',
        porcentaje: 20,
      },
    ],
    media: [
      {
        codigo: 'ALCANCE_CONSULTORIA_DEFINIDO',
        nombre: 'Alcance de consultoría definido',
        descripcion:
          'Se define claramente el alcance, objetivos y entregables de la consultoría.',
        porcentaje: 30,
      },
      {
        codigo: 'AVANCE_EN_ANALISIS',
        nombre: 'Avance en análisis y propuestas',
        descripcion:
          'Se desarrollan los análisis principales y propuestas técnicas.',
        porcentaje: 40,
      },
      {
        codigo: 'DOCUMENTO_EN_REVISION',
        nombre: 'Documento en revisión',
        descripcion:
          'El documento o informe se encuentra en revisión con el cliente o equipo interno.',
        porcentaje: 30,
      },
    ],
    baja: [
      {
        codigo: 'DEFINICION_BASIC_DE_ALCANCE',
        nombre: 'Definición básica de alcance',
        descripcion:
          'Solo se exige una definición básica del alcance y entregables.',
        porcentaje: 40,
      },
      {
        codigo: 'DESARROLLO_SIMPLE',
        nombre: 'Desarrollo simple de análisis',
        descripcion:
          'Se generan análisis y documentos sin requerimientos complejos.',
        porcentaje: 40,
      },
      {
        codigo: 'ENTREGA_FINAL_SIMPLE',
        nombre: 'Entrega final simple',
        descripcion:
          'Se entrega el documento final sin etapas amplias de socialización.',
        porcentaje: 20,
      },
    ],
  },

  // Plantilla genérica para tipos de proyecto no categorizados
  generico: {
    alta: [
      {
        codigo: 'PLANIFICACION_COMPLETA',
        nombre: 'Planificación completa',
        descripcion:
          'Se ha realizado toda la planificación necesaria del proyecto.',
        porcentaje: 25,
      },
      {
        codigo: 'EJECUCION_INTERMEDIA',
        nombre: 'Ejecución intermedia',
        descripcion:
          'El proyecto se encuentra en una fase intermedia de ejecución.',
        porcentaje: 35,
      },
      {
        codigo: 'EJECUCION_AVANZADA',
        nombre: 'Ejecución avanzada',
        descripcion:
          'La mayoría de actividades se encuentran ejecutadas.',
        porcentaje: 25,
      },
      {
        codigo: 'CIERRE_PROYECTO',
        nombre: 'Cierre del proyecto',
        descripcion:
          'Se realiza el cierre del proyecto y se entregan resultados.',
        porcentaje: 15,
      },
    ],
    media: [
      {
        codigo: 'INICIO_Y_ALCANCE',
        nombre: 'Inicio y alcance definido',
        descripcion:
          'El proyecto tiene un alcance definido y se encuentra iniciado.',
        porcentaje: 35,
      },
      {
        codigo: 'AVANCE_EJECUCION',
        nombre: 'Avance en ejecución',
        descripcion:
          'Se ejecuta el proyecto con un avance intermedio.',
        porcentaje: 40,
      },
      {
        codigo: 'CIERRE_BASICO',
        nombre: 'Cierre básico',
        descripcion:
          'Se hace un cierre básico con entrega de resultados principales.',
        porcentaje: 25,
      },
    ],
    baja: [
      {
        codigo: 'DEFINICION_MINIMA',
        nombre: 'Definición mínima',
        descripcion:
          'Se tiene una definición mínima del proyecto y sus objetivos.',
        porcentaje: 40,
      },
      {
        codigo: 'EJECUCION_MINIMA',
        nombre: 'Ejecución mínima',
        descripcion:
          'Se ejecutan las actividades esenciales del proyecto.',
        porcentaje: 40,
      },
      {
        codigo: 'CIERRE_MINIMO',
        nombre: 'Cierre mínimo',
        descripcion:
          'Se hace un cierre simple con registro básico de resultados.',
        porcentaje: 20,
      },
    ],
  },
};

/**
 * Normaliza el tipo de proyecto a una categoría interna.
 * @param {string} type Tipo de proyecto recibido (ej: "residencial", "vial", etc.).
 * @returns {string} Tipo normalizado ("obra_nueva", "mantenimiento", "consultoria" o "generico").
 */
function normalizarTipoProyecto(type) {
  const valor = (type || '').toString().toLowerCase().trim(); // Normaliza el texto.

  // Agrupamos varios textos en categorías internas.
  if (
    valor.includes('residen') ||
    valor.includes('vivienda') ||
    valor.includes('comercial') ||
    valor.includes('industrial') ||
    valor.includes('infraestructura') ||
    valor.includes('edificacion') ||
    valor.includes('edificación') ||
    valor.includes('vial') ||
    valor.includes('via') ||
    valor.includes('carretera') ||
    valor.includes('puente')
  ) {
    return 'obra_nueva';                                     // Se considera una obra nueva.
  }

  if (
    valor.includes('mantenimiento') ||
    valor.includes('rehabilitacion') ||
    valor.includes('rehabilitación') ||
    valor.includes('reparacion') ||
    valor.includes('reparación')
  ) {
    return 'mantenimiento';                                  // Proyectos de mantenimiento.
  }

  if (
    valor.includes('consultor') ||
    valor.includes('diseño') ||
    valor.includes('diseno') ||
    valor.includes('interventor')
  ) {
    return 'consultoria';                                    // Consultoría/diseño/interventoría.
  }

  return 'generico';                                         // Cualquier otro tipo → genérico.
}

/**
 * Normaliza el texto de prioridad a "alta" | "media" | "baja".
 * @param {string} priority Prioridad recibida.
 * @returns {string} Prioridad normalizada.
 */
function normalizarPrioridad(priority) {
  const valor = (priority || '').toString().toLowerCase().trim(); // Normaliza texto.

  if (valor.includes('alta') || valor === 'high') {          // Palabras que indican prioridad alta.
    return 'alta';
  }

  if (valor.includes('baja') || valor === 'low') {           // Palabras que indican prioridad baja.
    return 'baja';
  }

  // Si no se reconoce, asumimos "media" como valor por defecto.
  return 'media';
}

/**
 * Genera una copia de la plantilla de criterios según tipo de proyecto y prioridad.
 * Cada criterio se inicializa con cumplido = false y fechaCumplimiento = null.
 *
 * @param {string} type Tipo de proyecto (residencial, vial, mantenimiento, etc.).
 * @param {string} priority Prioridad del proyecto (alta, media, baja).
 * @returns {Array} Arreglo de criterios listo para guardarse en el proyecto.
 */
function generarCriteriosPorTipoYPrioridad(type, priority) {
  const tipoNormalizado = normalizarTipoProyecto(type);      // Normaliza el tipo a categoría interna.
  const prioridadNormalizada = normalizarPrioridad(priority); // Normaliza la prioridad.

  const plantillasPorTipo =
    PLANTILLAS_CRITERIOS[tipoNormalizado] ||                 // Plantillas específicas para el tipo.
    PLANTILLAS_CRITERIOS.generico;                           // O plantilla genérica si no existe el tipo.

  // Intentamos tomar la plantilla para la prioridad; si no existe, usamos "media" o "alta" como fallback.
  const plantillaBase =
    plantillasPorTipo[prioridadNormalizada] ||
    plantillasPorTipo.media ||
    plantillasPorTipo.alta ||
    plantillasPorTipo.baja;

  if (!plantillaBase) {                                      // Si por alguna razón no hay plantilla...
    return [];                                               // ...devolvemos un arreglo vacío.
  }

  // Devolvemos una copia nueva de los criterios, añadiendo campos de estado.
  return plantillaBase.map((item) => ({
    codigo: item.codigo,                                     // Código interno del criterio.
    nombre: item.nombre,                                     // Nombre legible para el usuario.
    descripcion: item.descripcion,                           // Descripción detallada.
    porcentaje: item.porcentaje,                             // Porcentaje de aporte al avance.
    cumplido: false,                                         // Inicialmente no está cumplido.
    fechaCumplimiento: null,                                 // Sin fecha de cumplimiento inicial.
  }));
}

// ============================================================================
// Función principal exportada: cálculo de progreso total del proyecto
// ============================================================================

/**
 * Calcula el progreso total de un proyecto combinando varios criterios:
 *  - Criterios de avance (criteriosAvance): principal motor del avance.
 *  - Tiempo transcurrido entre startDate y endDate.
 *  - Estado textual del proyecto (planning, active, completed, etc.).
 *  - Progreso manual (campo progress) que puede usarse como ajuste fino.
 *
 * @param {Object} proyecto Documento de proyecto o POJO con al menos:
 *   - startDate: fecha de inicio
 *   - endDate: fecha de fin
 *   - status: estado textual
 *   - progress: progreso manual (0–100)
 *   - criteriosAvance: arreglo de criterios de avance (opcional)
 * @param {Object} [opciones] Configuración opcional de pesos.
 * @param {Object} [opciones.pesos] Pesos de cada criterio (tiempo, estado, manual, criterios).
 * @returns {{
 *   progresoTotal: number,
 *   detalle: { tiempo: number, estado: number, manual: number, criterios: number }
 * }} Progreso general y desagregado.
 */
function calcularProgresoProyecto(proyecto, opciones = {}) {
  if (!proyecto) {                                           // Si el proyecto no existe...
    return {                                                 // ...devolvemos todo en cero.
      progresoTotal: 0,
      detalle: {
        tiempo: 0,
        estado: 0,
        manual: 0,
        criterios: 0,
      },
    };
  }

  // Pesos por defecto: damos mayor importancia a criteriosAvance,
  // luego al tiempo, y un peso menor al estado y al progreso manual.
  const pesos = opciones.pesos || {
    criterios: 0.6,   // Peso del avance por criterios de avance.
    tiempo: 0.2,      // Peso del avance por tiempo transcurrido.
    estado: 0.1,      // Peso del avance según estado textual.
    manual: 0.1,      // Peso del progreso manual.
  };

  // Calcula cada componente de avance de forma independiente.
  const avanceCriterios = calcularAvancePorCriterios(proyecto.criteriosAvance); // 0–100.
  const avanceTiempo = calcularAvancePorTiempo(proyecto.startDate, proyecto.endDate); // 0–100.
  const avanceEstado = calcularAvancePorEstado(proyecto.status);               // 0–100.
  const avanceManual = normalizarProgresoManual(proyecto.progress);           // 0–100.

  // Suma total de pesos para normalizar el promedio ponderado.
  const sumaPesos =
    (pesos.criterios || 0) +
    (pesos.tiempo || 0) +
    (pesos.estado || 0) +
    (pesos.manual || 0);

  // Si por alguna razón la suma de pesos es 0, usamos solo el avance por criterios
  // y, si tampoco hay criterios, usamos el manual como último recurso.
  if (sumaPesos === 0) {
    const fallbackCriterios = normalizarPorcentaje(avanceCriterios); // Normalizamos criterios.
    const fallbackManual = normalizarPorcentaje(avanceManual);       // Normalizamos manual.
    const usado = fallbackCriterios || fallbackManual;               // Prefiere criterios, luego manual.

    return {
      progresoTotal: usado,
      detalle: {
        tiempo: normalizarPorcentaje(avanceTiempo),
        estado: normalizarPorcentaje(avanceEstado),
        manual: fallbackManual,
        criterios: fallbackCriterios,
      },
    };
  }

  // Calculamos el promedio ponderado de los cuatro componentes.
  const valorTotal =
    ((avanceCriterios * (pesos.criterios || 0)) +
      (avanceTiempo * (pesos.tiempo || 0)) +
      (avanceEstado * (pesos.estado || 0)) +
      (avanceManual * (pesos.manual || 0))) /
    sumaPesos;

  // Normalizamos el resultado total para garantizar un valor 0–100.
  const progresoTotal = normalizarPorcentaje(valorTotal);

  // Devolvemos el progreso general y el desglose por componente.
  return {
    progresoTotal,
    detalle: {
      tiempo: normalizarPorcentaje(avanceTiempo),
      estado: normalizarPorcentaje(avanceEstado),
      manual: normalizarPorcentaje(avanceManual),
      criterios: normalizarPorcentaje(avanceCriterios),
    },
  };
}

// ============================================================================
// Exportación del helper (CommonJS)
// ============================================================================

module.exports = {
  calcularProgresoProyecto,        // Exporta la función principal para uso en controladores/servicios.
  generarCriteriosPorTipoYPrioridad, // Exporta helper para inicializar criterios al crear proyectos.
};
