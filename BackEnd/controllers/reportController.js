// File: BackEnd/controllers/reportController.js                                     // Ruta del archivo dentro del proyecto
// Descripción: Reportes de estadísticas de proyectos en PDF, Excel (xlsx-populate) // Propósito del controlador
// y JSON. Soporta filtros y múltiples hojas con métricas y muestra de datos.       // Alcance/funcionalidad

const PDFDocument = require('pdfkit');                                             // Importa pdfkit para generar PDFs por streaming
const XlsxPopulate = require('xlsx-populate');                                     // Importa xlsx-populate para crear archivos .xlsx modernos
const mongoose = require('mongoose');                                              // Importa mongoose para ObjectId y utilidades
const Proyectos = require('../models/Proyectos');                                  // Modelo de Proyectos (fuente de datos)
const User = require('../models/User');                                            // Modelo de Usuarios (referencia; el lookup usa la colección 'users')

// -----------------------------------------------------------------------------   // Separador visual de sección
// Helpers de validación / normalización                                           // Título de sección de helpers
// -----------------------------------------------------------------------------
const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));         // Función: valida que un valor sea un ObjectId válido
const toDateOrNull = (v) => {                                                       // Función: convierte una entrada a Date o null
  if (!v) return null;                                                              // Si no hay valor, retorna null
  const d = new Date(v);                                                            // Intenta construir un objeto Date
  return Number.isNaN(d.getTime()) ? null : d;                                      // Si inválida → null; si válida → Date
};                                                                                  // Cierra toDateOrNull

// Normaliza valores de status (ES/variantes EN) → EN canónico guardado en BD       // Comentario: mapeo de estados para filtro
const normalizeStatusFilter = (s) => {                                              // Define función de normalización de estado entrante
  if (!s) return null;                                                              // Si no hay estado, no filtrar por estado
  const k = String(s).toLowerCase().replace(/_/g, '-').trim();                      // Normaliza separador, minúsculas y espacios
  if (k === 'borrador') return 'planning';                                          // Mapea ES → EN: borrador → planning
  if (k === 'en-progreso' || k === 'en progreso') return 'in-progress';             // Mapea ES → EN: en progreso → in-progress
  if (k === 'en-pausa' || k === 'en pausa') return 'paused';                        // Mapea ES → EN: en pausa → paused
  if (k === 'completado' || k === 'completed' || k === 'done') return 'done';       // Acepta variantes → done
  if (k === 'cancelado' || k === 'cancelled' || k === 'canceled') return 'canceled';// Acepta variantes → canceled
  return s;                                                                         // Si ya es EN válido, lo retorna sin cambios
};                                                                                  // Cierra normalizeStatusFilter

// Traducción EN→ES de estado para mostrar en PDF/Excel                             // Comentario: presentación legible
const prettyStatus = (s) => {                                                       // Función: traduce estado a texto en español
  const k = String(s || '').toLowerCase().replace(/_/g, '-');                       // Normaliza valor recibido
  if (k === 'planning') return 'borrador';                                          // planning → borrador
  if (k === 'in-progress') return 'en progreso';                                     // in-progress → en progreso
  if (k === 'paused') return 'en pausa';                                            // paused → en pausa
  if (k === 'done' || k === 'completed') return 'completado';                       // done/completed → completado
  if (k === 'canceled' || k === 'cancelled') return 'cancelado';                    // canceled/cancelled → cancelado
  return s || '(sin estado)';                                                       // Fallback si viene vacío o desconocido
};                                                                                  // Cierra prettyStatus

// Construye filtros $match para agregaciones                                       // Comentario: filtro central reutilizable
const buildFilters = (query) => {                                                   // Función: genera objeto de filtros desde req.query
  const { ownerId, status, startDate, endDate } = query;                            // Extrae posibles filtros de la consulta
  const match = {};                                                                 // Inicializa objeto de filtros

  if (ownerId && isValidObjectId(ownerId))                                          // Si ownerId está presente y es válido
    match.owner = new mongoose.Types.ObjectId(ownerId);                             // Filtra por propietario específico

  if (typeof status === 'string' && status.trim())                                  // Si viene un estado no vacío
    match.status = normalizeStatusFilter(status.trim());                            // Normaliza a EN canónico y lo aplica

  const start = toDateOrNull(startDate);                                            // Intenta convertir startDate a Date
  const end = toDateOrNull(endDate);                                                // Intenta convertir endDate a Date
  if (start || end) {                                                               // Si al menos uno es válido
    match.createdAt = {};                                                           // Prepara filtro por createdAt
    if (start) match.createdAt.$gte = start;                                        // Límite inferior (inclusive)
    if (end) {                                                                      // Si hay límite superior
      const endIncl = new Date(end);                                                // Copia del fin
      if (endIncl.getHours() === 0 && endIncl.getMinutes() === 0 && endIncl.getSeconds() === 0) {
        endIncl.setHours(23, 59, 59, 999);                                          // Ajusta a fin de día si venía “plano”
      }
      match.createdAt.$lte = endIncl;                                               // Límite superior (inclusive)
    }
  }
  return match;                                                                      // Retorna el objeto de filtros
};                                                                                  // Cierra buildFilters

// -----------------------------------------------------------------------------   // Separador visual
// Agregación central: totales, distribuciones, serie mensual, top owners          // Título de la sección de agregaciones
// -----------------------------------------------------------------------------
const aggregateStats = async (match) => {                                           // Función: ejecuta agregación con $facet
  const now = new Date();                                                           // Fecha/hora actual
  const start12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);             // Inicio de la ventana de 12 meses
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Fin del mes actual (último día 23:59:59)

  const result = await Proyectos.aggregate([                                        // Inicia pipeline de agregación
    { $match: match },                                                              // Primer etapa: filtra por criterios
    {
      $facet: {                                                                     // Facetas paralelas para métricas
        totals: [                                                                   // Faceta: totales globales
          {
            $group: {                                                               // Agrupa todos los documentos
              _id: null,                                                            // Sin partición (único grupo)
              totalProjects: { $sum: 1 },                                           // Total de proyectos (conteo)
              totalBudget: { $sum: { $ifNull: ['$budget', 0] } },                   // Suma de presupuestos (tratando nulls)
              avgProgress: { $avg: { $ifNull: ['$progress', 0] } },                 // Promedio de progreso (%)
              minBudget: { $min: { $ifNull: ['$budget', null] } },                  // Presupuesto mínimo
              maxBudget: { $max: { $ifNull: ['$budget', null] } }                   // Presupuesto máximo
            }
          }
        ],
        byStatus: [                                                                  // Faceta: distribución por estado
          { $group: { _id: { $ifNull: ['$status', '(sin estado)'] }, count: { $sum: 1 } } }, // Agrupa por estado o marcador vacío
          { $sort: { count: -1, _id: 1 } }                                          // Ordena por frecuencia desc y luego por nombre
        ],
        byType: [                                                                    // Faceta: distribución por tipo
          { $group: { _id: { $ifNull: ['$type', '(sin tipo)'] }, count: { $sum: 1 } } },      // Agrupa por tipo
          { $sort: { count: -1, _id: 1 } }                                          // Ordena por frecuencia
        ],
        byPriority: [                                                                // Faceta: distribución por prioridad
          { $group: { _id: { $ifNull: ['$priority', '(sin prioridad)'] }, count: { $sum: 1 } } }, // Agrupa por prioridad
          { $sort: { count: -1, _id: 1 } }                                          // Ordena por frecuencia
        ],
        monthlySeries: [                                                             // Faceta: serie mensual 12 meses
          { $match: { createdAt: { $gte: start12, $lte: endMonth } } },             // Filtra por ventana temporal
          {
            $group: {                                                                // Agrupa por año/mes
              _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },     // Clave compuesta (año, mes)
              count: { $sum: 1 },                                                   // Conteo de proyectos
              sumBudget: { $sum: { $ifNull: ['$budget', 0] } }                       // Suma de presupuestos del mes
            }
          },
          { $sort: { '_id.y': 1, '_id.m': 1 } }                                     // Orden cronológico ascendente
        ],
        topOwners: [                                                                 // Faceta: top 5 owners
          {
            $group: {                                                                // Agrupa por owner _id
              _id: '$owner',                                                        // Llave: propietario
              count: { $sum: 1 },                                                   // Conteo de proyectos por owner
              sumBudget: { $sum: { $ifNull: ['$budget', 0] } }                      // Presupuesto acumulado por owner
            }
          },
          { $sort: { count: -1, sumBudget: -1 } },                                  // Ordena por # proyectos y luego por presupuesto
          { $limit: 5 },                                                            // Limita a los 5 principales
          {
            $lookup: {                                                               // Join con colección users
              from: 'users',                                                        // Colección destino
              localField: '_id',                                                    // Campo local (owner _id)
              foreignField: '_id',                                                  // Campo remoto _id
              as: 'owner'                                                           // Resultado en arreglo 'owner'
            }
          },
          { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },        // Desanida el documento owner (si existe)
          {
            $project: {                                                              // Proyección final amigable
              _id: 0,                                                                // Oculta _id intermedio
              ownerId: '$_id',                                                       // Devuelve ownerId
              ownerName: {                                                           // Nombre completo limpio
                $trim: { input: { $concat: [{ $ifNull: ['$owner.firstName', ''] }, ' ', { $ifNull: ['$owner.lastName', ''] }] } }
              },
              ownerEmail: '$owner.email',                                            // Email del owner
              count: 1,                                                              // # proyectos
              sumBudget: 1                                                           // Suma presupuesto
            }
          }
        ]
      }
    }
  ]);                                                                               // Finaliza pipeline de agregación

  const facet = result[0] || {};                                                    // Toma el primer documento (facetas) o {}
  const totals = facet.totals?.[0] || {                                             // Normaliza totales con valores por defecto
    totalProjects: 0,                                                               // Default: 0 proyectos
    totalBudget: 0,                                                                 // Default: 0 presupuesto
    avgProgress: 0,                                                                 // Default: 0% progreso
    minBudget: null,                                                                // Default: null mínimo
    maxBudget: null                                                                 // Default: null máximo
  };                                                                                // Cierra objeto de totales

  return {                                                                          // Retorna objeto unificado de métricas
    totals,                                                                         // Totales globales
    byStatus: facet.byStatus || [],                                                 // Distribución por estado
    byType: facet.byType || [],                                                     // Distribución por tipo
    byPriority: facet.byPriority || [],                                             // Distribución por prioridad
    monthlySeries: facet.monthlySeries || [],                                       // Serie mensual
    topOwners: facet.topOwners || []                                                // Top owners
  };                                                                                // Cierra return
};                                                                                  // Cierra aggregateStats

// -----------------------------------------------------------------------------   // Separador visual
// JSON: /reportes/estadisticas.json                                               // Endpoint JSON para dashboards/UI
// -----------------------------------------------------------------------------
exports.getStatsJson = async (req, res) => {                                       // Exporta handler getStatsJson
  try {                                                                             // Bloque principal try
    const match = buildFilters(req.query);                                          // Construye filtros desde querystring
    const stats = await aggregateStats(match);                                      // Ejecuta agregación central
    return res.status(200).json(stats);                                            // Responde 200 con JSON de métricas
  } catch (err) {                                                                   // Manejo de errores
    console.error('Error getStatsJson:', err);                                      // Log técnico del error
    return res.status(500).json({ message: 'Error al generar estadísticas' });      // Respuesta 500 genérica
  }                                                                                 // Fin catch
};                                                                                  // Fin getStatsJson

// -----------------------------------------------------------------------------   // Separador visual
// PDF: /reportes/estadisticas.pdf (resumen)                                        // Endpoint para reporte PDF
// -----------------------------------------------------------------------------
exports.generateStatsReportPDF = async (req, res) => {                              // Exporta handler PDF
  try {                                                                             // Bloque principal try
    const match = buildFilters(req.query);                                          // Construye filtros para el PDF
    const { totals, byStatus, byType, byPriority, monthlySeries, topOwners } =      // Desestructura métricas de la agregación
      await aggregateStats(match);                                                  // Llama a agregación central

    res.setHeader('Content-Type', 'application/pdf');                               // Define header de tipo de contenido
    res.setHeader('Content-Disposition', 'attachment; filename=estadisticas.pdf');  // Define header de descarga con nombre

    const doc = new PDFDocument({ margin: 48 });                                    // Crea documento PDF con márgenes
    doc.pipe(res);                                                                  // Conecta el stream del PDF a la respuesta

    doc.fontSize(20).text('📊 Reporte de Estadísticas de Proyectos', { align: 'center' }); // Título centrado
    doc.moveDown();                                                                 // Agrega espacio vertical

    const { ownerId, status, startDate, endDate } = req.query;                      // Extrae filtros de la URL
    const rango = [startDate && `desde ${startDate}`, endDate && `hasta ${endDate}`]// Construye fragmentos de rango
      .filter(Boolean).join(' ');                                                   // Une fragmentos presentes
    if (ownerId || status || rango) {                                               // Si hay algún filtro activo
      doc.fontSize(10).fillColor('#666').text(                                      // Texto pequeño en gris
        `Filtros: ${[                                                               // Prefijo “Filtros: ”
          ownerId && `ownerId=${ownerId}`,                                          // Muestra ownerId si aplica
          status && `status=${status}`,                                             // Muestra status si aplica
          rango && `rango=${rango}`                                                 // Muestra rango si aplica
        ].filter(Boolean).join(' | ')}`                                             // Une con separador “ | ”
      );                                                                            // Cierra text()
      doc.fillColor('black').moveDown(0.5);                                         // Restaura color y agrega espacio
    }                                                                               // Cierra if de filtros

    const presupuestoTotal = totals.totalBudget || 0;                               // Calcula presupuesto total seguro
    const progresoProm = totals.totalProjects ? (totals.avgProgress || 0) : 0;      // Calcula progreso promedio seguro

    doc.fontSize(14).text(`Total de proyectos: ${totals.totalProjects}`);           // Imprime total de proyectos
    doc.text(`Presupuesto total: $${Number(presupuestoTotal).toLocaleString('es-CO')}`); // Imprime presupuesto con formato local
    doc.text(`Progreso promedio: ${Number(progresoProm).toFixed(2)}%`);             // Imprime promedio de progreso en %
    if (totals.minBudget != null || totals.maxBudget != null) {                     // Si existen min o max
      doc.text(                                                                      // Imprime rango min–max
        `Presupuesto (min–max): $${Number(totals.minBudget || 0).toLocaleString('es-CO')} – $${Number(totals.maxBudget || 0).toLocaleString('es-CO')}`
      );                                                                            // Cierra text()
    }                                                                               // Cierra if min/max
    doc.moveDown();                                                                 // Espacio vertical

    doc.fontSize(12).text('Distribución por estado:');                              // Encabezado sección estados
    if (!byStatus.length) doc.text('— sin datos —');                                // Si no hay datos, lo indica
    byStatus.forEach(r => doc.text(`• ${prettyStatus(r._id)}: ${r.count}`));        // Lista cada estado con conteo
    doc.moveDown();                                                                 // Espacio vertical

    doc.fontSize(12).text('Distribución por tipo:');                                // Encabezado sección tipos
    if (!byType.length) doc.text('— sin datos —');                                  // Si no hay datos, lo indica
    byType.forEach(r => doc.text(`• ${r._id}: ${r.count}`));                        // Lista cada tipo con conteo
    doc.moveDown();                                                                 // Espacio vertical

    doc.fontSize(12).text('Distribución por prioridad:');                           // Encabezado sección prioridades
    if (!byPriority.length) doc.text('— sin datos —');                              // Si no hay datos, lo indica
    byPriority.forEach(r => doc.text(`• ${r._id}: ${r.count}`));                    // Lista cada prioridad con conteo
    doc.moveDown();                                                                 // Espacio vertical

    doc.fontSize(12).text('Serie mensual (últimos 12 meses):');                     // Encabezado serie mensual
    if (!monthlySeries.length) doc.text('— sin datos —');                           // Si no hay datos, lo indica
    monthlySeries.forEach(({ _id, count, sumBudget }) => {                          // Recorre cada punto de la serie
      const label = `${String(_id.m).padStart(2, '0')}/${_id.y}`;                   // Etiqueta mes/año (mm/yyyy)
      doc.text(`• ${label}: ${count} proyectos — $${Number(sumBudget || 0).toLocaleString('es-CO')}`); // Línea con datos
    });                                                                             // Cierra forEach
    doc.moveDown();                                                                 // Espacio vertical

    doc.fontSize(12).text('Top 5 owners:');                                         // Encabezado top owners
    if (!topOwners.length) doc.text('— sin datos —');                               // Si no hay datos, lo indica
    topOwners.forEach((o, i) => {                                                   // Recorre ranking de owners
      const linea = `${i + 1}. ${o.ownerName || '(sin nombre)'} <${o.ownerEmail || 's/correo'}> — ` + // Construye encabezado de línea
        `${o.count} proyectos — $${Number(o.sumBudget || 0).toLocaleString('es-CO')}`; // Añade conteo y presupuesto
      doc.text(`• ${linea}`);                                                       // Escribe línea con viñeta
    });                                                                             // Cierra forEach

    doc.end();                                                                      // Finaliza y envía el PDF
  } catch (err) {                                                                   // Manejo de errores
    console.error('Error generando reporte PDF:', err);                             // Log técnico del error
    return res.status(500).json({ message: 'Error al generar el reporte PDF' });    // Respuesta 500 genérica
  }                                                                                 // Fin catch
};                                                                                  // Fin generateStatsReportPDF

// -----------------------------------------------------------------------------   // Separador visual
// Excel (xlsx-populate): /reportes/estadisticas.xlsx                               // Endpoint para reporte Excel
// -----------------------------------------------------------------------------
exports.generateStatsReportExcel = async (req, res) => {                            // Exporta handler Excel
  try {                                                                             // Bloque principal try
    const match = buildFilters(req.query);                                          // Construye filtros para Excel
    const { totals, byStatus, byType, byPriority, monthlySeries, topOwners } =      // Desestructura métricas
      await aggregateStats(match);                                                  // Ejecuta agregación central

    const limit = Math.min(Number(req.query.limit || 50), 1000);                    // Límite de filas de muestra (máx 1000)
    const skip = Math.max(Number(req.query.skip || 0), 0);                          // Offset inicial (no negativo)
    const sampleProjection = {                                                      // Proyección de campos útiles en la muestra
      title: 1, owner: 1, client: 1, status: 1, type: 1, priority: 1,               // Campos de texto/enum
      budget: 1, progress: 1, startDate: 1, endDate: 1, createdAt: 1                // Campos numéricos/fechas
    };                                                                              // Cierra sampleProjection

    const sample = await Proyectos.aggregate([                                      // Pipeline para obtener muestra tabular
      { $match: match },                                                            // Aplica filtros
      { $sort: { createdAt: -1 } },                                                 // Ordena por recientes
      { $skip: skip },                                                              // Salta primeras N filas
      { $limit: limit },                                                            // Toma hasta 'limit' filas
      { $project: sampleProjection },                                               // Limita campos
      { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'owner' } }, // Join para owner
      { $lookup: { from: 'users', localField: 'client', foreignField: '_id', as: 'client' } },// Join para client
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },            // Desanida owner (si existe)
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },           // Desanida client (si existe)
      {
        $project: {                                                                 // Proyección final amigable para Excel
          title: 1, status: 1, type: 1, priority: 1, budget: 1, progress: 1,        // Deja campos principales
          startDate: 1, endDate: 1, createdAt: 1,                                   // Deja fechas
          ownerName: { $trim: { input: { $concat: [{ $ifNull: ['$owner.firstName', ''] }, ' ', { $ifNull: ['$owner.lastName', ''] }] } } }, // Nombre owner
          ownerEmail: '$owner.email',                                               // Email owner
          clientName: { $trim: { input: { $concat: [{ $ifNull: ['$client.firstName', ''] }, ' ', { $ifNull: ['$client.lastName', ''] }] } } }, // Nombre cliente
          clientEmail: '$client.email'                                              // Email cliente
        }
      }
    ]);                                                                             // Finaliza aggregate para muestra

    const workbook = await XlsxPopulate.fromBlankAsync();                           // Crea un libro Excel en blanco de manera asíncrona

    const styleHeader = (sheet, headerRangeA1) => {                                 // Helper: estilo encabezado/congelar fila
      sheet.range(headerRangeA1).style({ bold: true });                             // Aplica negrita al rango del encabezado
      sheet.freezePanes(2, 1);                                                      // Congela la primera fila
    };                                                                              // Cierra styleHeader
    const setColWidths = (sheet, widths) => widths.forEach((w, i) => sheet.column(i + 1).width(w)); // Helper: setea anchos de columnas
    const moneyFmt = '#,##0';                                                       // Formato de miles para moneda simple
    const percentFmt = '0.00%';                                                     // Formato de porcentaje con 2 decimales
    const dateFmt = 'yyyy-mm-dd hh:mm';                                             // Formato de fecha/hora ISO compacto

    const sResumen = workbook.sheet(0);                                             // Obtiene la primera hoja por defecto
    sResumen.name('Resumen');                                                       // Renombra la hoja a "Resumen"
    const presupuestoTotal = totals.totalBudget || 0;                               // Normaliza total de presupuesto
    const progresoProm = totals.totalProjects ? (totals.avgProgress || 0) : 0;      // Normaliza promedio de progreso

    const resumenData = [                                                           // Arreglo 2D: datos de resumen
      ['Métrica', 'Valor'],                                                         // Encabezados
      ['Total de proyectos', totals.totalProjects],                                 // Fila: total proyectos
      ['Presupuesto total', presupuestoTotal],                                      // Fila: presupuesto total
      ['Progreso promedio', progresoProm / 100],                                    // Fila: progreso (fracción para %)
      ['Presupuesto mínimo', totals.minBudget ?? 0],                                // Fila: presupuesto mínimo
      ['Presupuesto máximo', totals.maxBudget ?? 0],                                // Fila: presupuesto máximo
    ];                                                                              // Cierra resumenData
    sResumen.cell('A1').value(resumenData);                                         // Inserta la matriz empezando en A1
    styleHeader(sResumen, 'A1:B1');                                                 // Aplica estilo de encabezado
    setColWidths(sResumen, [28, 32]);                                               // Ajusta anchos de columnas
    sResumen.cell('B2').style('numberFormat', '0');                                 // Entero para total de proyectos
    sResumen.cell('B3').style('numberFormat', moneyFmt);                            // Miles para presupuesto total
    sResumen.cell('B4').style('numberFormat', percentFmt);                          // Porcentaje para progreso promedio
    sResumen.cell('B5').style('numberFormat', moneyFmt);                            // Miles para mínimo
    sResumen.cell('B6').style('numberFormat', moneyFmt);                            // Miles para máximo

    const sEstado = workbook.addSheet('Por estado');                                // Crea hoja "Por estado"
    const byStatusData = [['Estado', 'Cantidad'],                                   // Encabezados por estado
      ...(byStatus.length ? byStatus : [{ _id: '(sin estado)', count: 0 }])         // Usa datos o placeholder vacío
        .map(r => [prettyStatus(r._id), r.count])];                                 // Mapea cada fila a [estadoES, cantidad]
    sEstado.cell('A1').value(byStatusData);                                         // Inserta datos en A1
    styleHeader(sEstado, 'A1:B1');                                                  // Formatea encabezado y congela
    setColWidths(sEstado, [25, 15]);                                                // Define anchos de columnas

    const sTipo = workbook.addSheet('Por tipo');                                    // Crea hoja "Por tipo"
    const byTypeData = [['Tipo', 'Cantidad'],                                       // Encabezados por tipo
      ...(byType.length ? byType : [{ _id: '(sin tipo)', count: 0 }])               // Datos o placeholder
        .map(r => [r._id, r.count])];                                               // Mapea a [tipo, cantidad]
    sTipo.cell('A1').value(byTypeData);                                             // Inserta datos
    styleHeader(sTipo, 'A1:B1');                                                    // Formatea encabezado
    setColWidths(sTipo, [25, 15]);                                                  // Ajusta anchos

    const sPrio = workbook.addSheet('Por prioridad');                               // Crea hoja "Por prioridad"
    const byPrioData = [['Prioridad', 'Cantidad'],                                  // Encabezados por prioridad
      ...(byPriority.length ? byPriority : [{ _id: '(sin prioridad)', count: 0 }])  // Datos o placeholder
        .map(r => [r._id, r.count])];                                               // Mapea a [prioridad, cantidad]
    sPrio.cell('A1').value(byPrioData);                                             // Inserta datos
    styleHeader(sPrio, 'A1:B1');                                                    // Formatea encabezado
    setColWidths(sPrio, [18, 15]);                                                  // Ajusta anchos

    const sMensual = workbook.addSheet('Mensual (12m)');                            // Crea hoja "Mensual (12m)"
    const mensualData = [['Mes', 'Proyectos', 'Presupuesto'],                       // Encabezados de serie mensual
      ...monthlySeries.map(({ _id, count, sumBudget }) =>                           // Recorre serie
        [`${String(_id.m).padStart(2, '0')}/${_id.y}`, count, sumBudget])           // Fila con mm/yyyy, conteo, suma
    ];                                                                              // Cierra mensualData
    sMensual.cell('A1').value(mensualData);                                         // Inserta datos
    styleHeader(sMensual, 'A1:C1');                                                 // Formatea encabezado
    setColWidths(sMensual, [12, 14, 18]);                                           // Ajusta anchos de columnas
    for (let r = 2; r <= mensualData.length; r++)                                   // Recorre filas de datos
      sMensual.cell(`C${r}`).style('numberFormat', moneyFmt);                       // Aplica formato miles a presupuesto

    const sOwners = workbook.addSheet('Top owners');                                 // Crea hoja "Top owners"
    const ownersData = [['Owner', 'Email', '# Proyectos', 'Presupuesto acumulado'],  // Encabezados
      ...(topOwners.length ? topOwners : []).map(o => [                              // Mapea cada owner (si hay datos)
        (o.ownerName || '(sin nombre)').trim(),                                     // Columna: nombre del owner
        o.ownerEmail || '',                                                         // Columna: email del owner
        o.count || 0,                                                               // Columna: # proyectos
        o.sumBudget || 0                                                            // Columna: presupuesto acumulado
      ])
    ];                                                                              // Cierra ownersData
    sOwners.cell('A1').value(ownersData);                                           // Inserta datos en hoja
    styleHeader(sOwners, 'A1:D1');                                                  // Formatea encabezado
    setColWidths(sOwners, [32, 34, 14, 22]);                                        // Ajusta anchos
    for (let r = 2; r <= ownersData.length; r++)                                    // Recorre filas de datos
      sOwners.cell(`D${r}`).style('numberFormat', moneyFmt);                        // Aplica formato miles a acumulado

    const sSample = workbook.addSheet('Proyectos (muestra)');                        // Crea hoja para muestra tabular
    const sampleHeaders = ['Título', 'Owner', 'Owner email', 'Cliente', 'Cliente email', 'Estado', 'Tipo', 'Prioridad', 'Presupuesto', 'Progreso', 'Inicio', 'Fin', 'Creado']; // Encabezados
    const sampleRows = sample.map(p => ([                                            // Mapea cada proyecto de muestra a fila
      p.title || '',                                                                 // Col A: título
      p.ownerName || '',                                                             // Col B: nombre owner
      p.ownerEmail || '',                                                            // Col C: email owner
      p.clientName || '',                                                            // Col D: nombre cliente
      p.clientEmail || '',                                                           // Col E: email cliente
      prettyStatus(p.status || ''),                                                  // Col F: estado legible ES
      p.type || '',                                                                  // Col G: tipo
      p.priority || '',                                                              // Col H: prioridad
      p.budget || 0,                                                                 // Col I: presupuesto
      (p.progress ?? 0) / 100,                                                       // Col J: progreso como fracción para %
      p.startDate ? new Date(p.startDate) : '',                                      // Col K: fecha inicio
      p.endDate ? new Date(p.endDate) : '',                                          // Col L: fecha fin
      p.createdAt ? new Date(p.createdAt) : ''                                       // Col M: fecha de creación
    ]));                                                                             // Cierra mapeo de filas
    const sampleData = [sampleHeaders, ...sampleRows];                               // Combina encabezados + filas
    sSample.cell('A1').value(sampleData);                                           // Inserta toda la matriz
    styleHeader(sSample, 'A1:M1');                                                  // Formatea encabezado y congela fila
    setColWidths(sSample, [32, 28, 30, 28, 30, 16, 18, 12, 16, 12, 16, 16, 20]);    // Ajusta anchos de 13 columnas
    for (let r = 2; r <= sampleData.length; r++) {                                   // Recorre filas de datos
      sSample.cell(`I${r}`).style('numberFormat', moneyFmt);                         // Formato miles en Presupuesto
      sSample.cell(`J${r}`).style('numberFormat', '0.00%');                          // Formato porcentaje en Progreso
      ['K', 'L', 'M'].forEach(col =>                                                // Recorre columnas de fecha
        sSample.cell(`${col}${r}`).style('numberFormat', dateFmt)                    // Aplica formato de fecha/hora
      );                                                                             // Cierra forEach de columnas
    }                                                                                // Cierra for de filas

    const sParams = workbook.addSheet('Parámetros');                                 // Crea hoja de trazabilidad de parámetros
    const { ownerId, status, startDate, endDate } = req.query;                       // Relee filtros originales
    const paramsData = [                                                             // Matriz clave/valor de parámetros
      ['Clave', 'Valor'],                                                            // Encabezados
      ['ownerId', ownerId || ''],                                                    // ownerId usado (si aplica)
      ['status', status || ''],                                                      // status usado (si aplica)
      ['startDate', startDate || ''],                                                // startDate usado
      ['endDate', endDate || ''],                                                    // endDate usado
      ['limit', String(limit)],                                                      // Límite de muestra
      ['skip', String(skip)],                                                        // Offset de muestra
      ['generado', new Date().toISOString()]                                         // Marca temporal ISO de generación
    ];                                                                               // Cierra paramsData
    sParams.cell('A1').value(paramsData);                                            // Inserta matriz en hoja
    styleHeader(sParams, 'A1:B1');                                                   // Formatea encabezado
    setColWidths(sParams, [24, 44]);                                                 // Ajusta anchos de columnas

    const buffer = await workbook.outputAsync();                                     // Genera el archivo .xlsx como buffer en memoria
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); // Header de tipo Excel
    res.setHeader('Content-Disposition', 'attachment; filename=estadisticas.xlsx');  // Header para descarga con nombre
    return res.status(200).send(buffer);                                             // Envía buffer como respuesta 200
  } catch (err) {                                                                    // Manejo de errores
    console.error('Error generando reporte Excel:', err);                            // Log técnico del error
    return res.status(500).json({ message: 'Error al generar el reporte Excel' });   // Respuesta 500 genérica
  }                                                                                  // Fin catch
};                                                                                    // Fin generateStatsReportExcel
