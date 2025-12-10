// File: BackEnd/src/modules/reports/controllers/reporte.controlador.js
// Description: Controlador para generar un reporte PDF con estadísticas
//              globales de los proyectos de ProCivil Manager (PCM), incluyendo
//              totales, presupuesto, progreso promedio y distribuciones por
//              estado y por tipo de proyecto. Registra también la generación
//              del reporte en la colección de reportes y en la auditoría.

// Importa PDFKit para crear documentos PDF en memoria/stream.
const PDFDocument = require('pdfkit');                                      // Creador de documentos PDF

// Modelo de Proyectos, fuente de datos para el reporte.
const Proyecto = require('../../projects/models/proyecto.modelo');          // Modelo de proyectos

// Modelo de Reporte para registrar en BD que se generó un reporte.
const Reporte = require('../models/reporte.modelo');                        // Modelo de reportes generados

// Modelo de auditoría para dejar trazabilidad adicional de la acción.
const AuditLog = require('../../audit/models/auditoria.modelo');            // Modelo de logs de auditoría

/**
 * Genera un reporte PDF con estadísticas de proyectos.
 *
 * Salida:
 *  - PDF descargable con:
 *    * Total de proyectos.
 *    * Presupuesto total.
 *    * Progreso promedio.
 *    * Distribución por estado.
 *    * Distribución por tipo de proyecto.
 *
 * Seguridad:
 *  - La ruta debe estar protegida por autenticación y role (admin / líder de obra)
 *    desde reporte.rutas.js.
 */
exports.generarReporteEstadisticas = async (req, res) => {
  try {
    // ===============================
    // 1. Obtener datos base de Mongo
    // ===============================

    // Cuenta el total de proyectos en la colección.
    const totalProyectos = await Proyecto.countDocuments();                // Total de proyectos registrados

    // Si no hay proyectos, generamos un PDF sencillo indicando esta situación.
    if (totalProyectos === 0) {
      // Configuramos cabeceras HTTP para indicar que la respuesta es un PDF descargable.
      res.setHeader('Content-Type', 'application/pdf');                    // Tipo de contenido: PDF
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=estadisticas-proyectos.pdf'                  // Nombre sugerido para el archivo
      );

      // Creamos el documento PDF con márgenes estándar.
      const docEmpty = new PDFDocument({
        size: 'A4',                                                        // Tamaño hoja A4
        margins: { top: 50, bottom: 50, left: 50, right: 50 },             // Márgenes
      });

      // Enlazamos la salida del PDF con la respuesta HTTP.
      docEmpty.pipe(res);                                                 // Pipe del PDF hacia la respuesta

      // Encabezado simple.
      docEmpty
        .fontSize(22)                                                     // Tamaño de letra grande para el título
        .font('Helvetica-Bold')                                           // Fuente en negrita
        .text('📊 Reporte de Estadísticas', {                              // Título principal del reporte
          align: 'left',
        });

      docEmpty.moveDown();                                                // Deja un espacio en blanco

      // Texto informativo indicando que no hay datos.
      docEmpty
        .fontSize(12)                                                     // Tamaño de texto estándar
        .font('Helvetica')                                                // Fuente normal
        .text(
          'Actualmente no hay proyectos registrados en el sistema. ' +
            'Una vez crees proyectos desde el módulo de gestión, ' +
            'podrás generar aquí un reporte con estadísticas detalladas.',
          {
            align: 'left',                                                // Alineación a la izquierda
          }
        );

      // Finaliza el documento y envía la respuesta.
      docEmpty.end();                                                     // Cierra el documento PDF
      return;                                                             // Sale de la función después de enviar el PDF vacío
    }

    // Si sí hay proyectos, se traen todos para calcular métricas.
    const proyectos = await Proyecto.find();                              // Recupera todos los proyectos (sin filtros adicionales)

    // Suma acumulada del presupuesto de todos los proyectos (maneja budget nulo con || 0).
    const presupuestoTotal = proyectos.reduce(
      (sum, p) => sum + (p.budget || 0),                                  // Suma el campo budget o 0
      0
    );

    // Cálculo del progreso promedio (en porcentaje).
    const progresoPromedio = proyectos.length
      ? (
          proyectos.reduce(
            (sum, p) => sum + (p.progress || 0),                           // Suma los progress o 0
            0
          ) / proyectos.length
        ).toFixed(2)                                                       // Redondea a 2 decimales
      : 0;

    // Agrupación de proyectos por estado (status).
    const proyectosPorEstado = proyectos.reduce((acc, p) => {
      const key = p.status || 'Sin estado';                               // Evita undefined como clave
      acc[key] = (acc[key] || 0) + 1;                                     // Incrementa el contador para ese estado
      return acc;                                                         // Devuelve el acumulador
    }, {});

    // Agrupación de proyectos por tipo (type).
    const proyectosPorTipo = proyectos.reduce((acc, p) => {
      const key = p.type || 'Sin tipo';                                   // Evita undefined como clave
      acc[key] = (acc[key] || 0) + 1;                                     // Incrementa el contador para ese tipo
      return acc;                                                         // Devuelve el acumulador
    }, {});

    // =====================================
    // 2. Crear documento PDF con diseño UI
    // =====================================

    // Crea un nuevo documento PDF:
    //  - Tamaño A4.
    //  - Márgenes definidos.
    //  - bufferPages:true → permite recorrer las páginas al final (para numerarlas).
    const doc = new PDFDocument({
      size: 'A4',                                                         // Tamaño del documento
      margins: { top: 50, bottom: 50, left: 50, right: 50 },              // Márgenes del documento
      bufferPages: true,                                                  // Permite revisar las páginas al final
    });

    // Cabeceras HTTP para indicar PDF descargable.
    res.setHeader('Content-Type', 'application/pdf');                     // Tipo de contenido: PDF
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=estadisticas-proyectos.pdf'                   // Nombre sugerido del archivo
    );

    // Enlaza el stream de PDF con la respuesta HTTP.
    doc.pipe(res);                                                        // Conecta el PDF con la respuesta

    // Paleta de colores utilizada en el diseño del PDF.
    const colors = {
      primary: '#2563eb',                                                 // Azul principal
      secondary: '#64748b',                                               // Gris azulado
      accent: '#8b5cf6',                                                  // Morado de acento
      success: '#10b981',                                                 // Verde éxito
      background: '#f8fafc',                                              // Fondo claro
      text: '#1e293b',                                                    // Texto principal
      lightGray: '#e2e8f0',                                              // Gris claro para líneas/fondos
      darkGray: '#475569',                                               // Gris oscuro
    };

    // ==============================
    // 2.1 Encabezado moderno
    // ==============================

    // Dibuja un rectángulo de fondo para el header (de borde a borde).
    doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);            // Fondo del encabezado

    // Título principal del reporte en blanco.
    doc
      .fillColor('#ffffff')                                              // Color de texto: blanco
      .fontSize(32)                                                      // Tamaño de fuente grande
      .font('Helvetica-Bold')                                            // Fuente en negrita
      .text('📊 Reporte de Estadísticas', 50, 40, {                       // Título en la parte superior
        align: 'left',
      });

    // Subtítulo con la fecha de generación del reporte.
    doc
      .fontSize(12)                                                      // Fuente más pequeña para la fecha
      .font('Helvetica')                                                 // Fuente normal
      .fillColor('#e0e7ff')                                              // Azul claro para contraste
      .text(
        `Generado el ${new Date().toLocaleDateString('es-ES', {          // Fecha en formato español
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        50,
        85
      );

    // Agrega espacio vertical antes de las tarjetas de métricas.
    doc.moveDown(4);                                                     // Baja la posición Y

    // ==============================
    // 2.2 Sección de métricas (cards)
    // ==============================

    const cardY = 160;                                                   // Posición Y inicial de las tarjetas
    const cardWidth = 160;                                               // Ancho de cada tarjeta
    const cardHeight = 100;                                              // Alto de cada tarjeta
    const cardSpacing = 20;                                              // Separación horizontal entre tarjetas

    // Tarjeta 1: Total de proyectos.
    drawCard(
      doc,                                                               // Documento PDF
      50,                                                                // Posición X
      cardY,                                                             // Posición Y
      cardWidth,                                                         // Ancho
      cardHeight,                                                        // Alto
      colors.primary,                                                    // Color principal de la tarjeta
      '📁',                                                              // Icono a mostrar
      'Total Proyectos',                                                 // Etiqueta
      totalProyectos.toString()                                          // Valor como texto
    );

    // Tarjeta 2: Presupuesto total.
    drawCard(
      doc,
      50 + cardWidth + cardSpacing,                                      // X = tarjeta 1 + espacio
      cardY,
      cardWidth,
      cardHeight,
      colors.success,
      '💰',
      'Presupuesto Total',
      `$${presupuestoTotal.toLocaleString('es-ES')}`                     // Presupuesto formateado
    );

    // Tarjeta 3: Progreso promedio.
    drawCard(
      doc,
      50 + (cardWidth + cardSpacing) * 2,                                // X = tarjeta 1 + tarjeta 2 + 2 espacios
      cardY,
      cardWidth,
      cardHeight,
      colors.accent,
      '📈',
      'Progreso Promedio',
      `${progresoPromedio}%`                                             // Porcentaje redondeado a 2 decimales
    );

    // =====================================
    // 2.3 Sección de distribución por estado
    // =====================================

    const sectionY = cardY + cardHeight + 50;                            // Posición Y debajo de las tarjetas
    doc.y = sectionY;                                                    // Actualiza la coordenada Y del documento

    // Dibuja el encabezado de sección: "Distribución por Estado".
    drawSectionHeader(doc, '📊 Distribución por Estado', colors.primary);
    doc.moveDown(0.5);                                                   // Espacio debajo del título

    // Línea horizontal gris clara bajo el título de sección.
    doc.rect(50, doc.y, doc.page.width - 100, 1).fill(colors.lightGray);
    doc.moveDown();                                                      // Baja la posición Y para el contenido

    // Mapa de colores para estados conocidos (el resto usará secondary).
    const statusColors = {
      activo: colors.success,
      'en progreso': colors.accent,
      completado: colors.primary,
      pausado: '#f59e0b',
      cancelado: '#ef4444',
    };

    let index = 0;                                                       // Índice para alternar fondos de fila

    // Recorre cada estado y cantidad para dibujar la fila.
    Object.entries(proyectosPorEstado).forEach(([estado, cantidad]) => {
      const yPos = doc.y;                                                // Guarda la Y actual para esta fila
      const percentage = ((cantidad / totalProyectos) * 100).toFixed(1); // Porcentaje de proyectos en este estado

      // Determina el color de la barra según el estado (fallback a secondary).
      const barColor =
        statusColors[String(estado).toLowerCase()] || colors.secondary;

      // Fondo alterno (rayado suave) para cada segunda fila.
      if (index % 2 === 0) {
        doc.rect(50, yPos - 5, doc.page.width - 100, 35).fill('#f8fafc');
      }

      // Círculo de color como "bullet" indicador del estado.
      doc.circle(70, yPos + 10, 8).fill(barColor);

      // Texto del estado (capitalizando la primera letra).
      doc
        .fillColor(colors.text)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(
          estado.charAt(0).toUpperCase() + estado.slice(1),
          95,
          yPos + 3
        );

      // Texto con cantidad y porcentaje.
      doc
        .font('Helvetica')
        .fillColor(colors.secondary)
        .text(`${cantidad} proyectos (${percentage}%)`, 95, yPos + 18, {
          width: 200,                                                   // Ancho máximo para el texto
        });

      // Parámetros de la barra de progreso visual (derecha).
      const barWidth = 150;                                             // Ancho total de la barra
      const barHeight = 8;                                              // Alto de la barra
      const barX = doc.page.width - 50 - barWidth;                      // X para alinear a la derecha
      const filledWidth = (cantidad / totalProyectos) * barWidth;       // Largo proporcional

      // Barra de fondo (gris claro).
      doc.roundedRect(barX, yPos + 10, barWidth, barHeight, 4).fill(colors.lightGray);

      // Barra "rellena" proporcional al porcentaje.
      if (filledWidth > 0) {
        doc
          .roundedRect(barX, yPos + 10, filledWidth, barHeight, 4)
          .fill(barColor);
      }

      // Agrega espacio vertical entre filas.
      doc.moveDown(2);
      index++;                                                          // Avanza índice para alternar fondos
    });

    // ===================================
    // 2.4 Sección de distribución por tipo
    // ===================================

    doc.moveDown(2);                                                    // Espacio entre secciones
    drawSectionHeader(doc, '🏗️ Distribución por Tipo', colors.accent);
    doc.moveDown(0.5);                                                  // Pequeño espacio

    // Línea separadora bajo el encabezado de sección.
    doc.rect(50, doc.y, doc.page.width - 100, 1).fill(colors.lightGray);
    doc.moveDown();                                                     // Avanza Y para la tabla

    // Paleta de colores rotativa para los distintos tipos de proyecto.
    const typeColors = [
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#06b6d4',
    ];

    let typeIndex = 0;                                                  // Índice para recorrer colores

    // Recorre cada tipo y cantidad de proyectos.
    Object.entries(proyectosPorTipo).forEach(([tipo, cantidad]) => {
      const yPos = doc.y;                                               // Y actual para esta fila
      const percentage = ((cantidad / totalProyectos) * 100).toFixed(1);// Porcentaje de ese tipo
      const barColor = typeColors[typeIndex % typeColors.length];      // Escoge color cíclicamente

      // Fondo alterno para filas pares.
      if (typeIndex % 2 === 0) {
        doc.rect(50, yPos - 5, doc.page.width - 100, 35).fill('#f8fafc');
      }

      // Círculo de color indicador del tipo.
      doc.circle(70, yPos + 10, 8).fill(barColor);

      // Texto con el nombre del tipo (capitalizando primera letra).
      doc
        .fillColor(colors.text)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(
          tipo.charAt(0).toUpperCase() + tipo.slice(1),
          95,
          yPos + 3
        );

      // Texto con cantidad y porcentaje.
      doc
        .font('Helvetica')
        .fillColor(colors.secondary)
        .text(`${cantidad} proyectos (${percentage}%)`, 95, yPos + 18, {
          width: 200,
        });

      // Parámetros para la barra de progreso a la derecha.
      const barWidth = 150;
      const barHeight = 8;
      const barX = doc.page.width - 50 - barWidth;
      const filledWidth = (cantidad / totalProyectos) * barWidth;

      // Barra de fondo.
      doc.roundedRect(barX, yPos + 10, barWidth, barHeight, 4).fill(colors.lightGray);

      // Barra "rellena" si hay cantidad.
      if (filledWidth > 0) {
        doc
          .roundedRect(barX, yPos + 10, filledWidth, barHeight, 4)
          .fill(barColor);
      }

      // Espacio vertical entre filas.
      doc.moveDown(2);
      typeIndex++;                                                      // Avanza el índice para el siguiente color
    });

    // ===========================
    // 2.5 Pie de página numerado
    // ===========================

    // Obtiene el rango de páginas acumuladas gracias a bufferPages:true.
    const pageRange = doc.bufferedPageRange();                          // Rango de páginas en buffer
    const pageCount = pageRange.count;                                  // Número total de páginas generadas

    // Recorre todas las páginas para dibujar el pie (número de página y leyenda).
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);                                             // Cambia a la página i

      // Línea superior del pie de página.
      doc
        .rect(50, doc.page.height - 70, doc.page.width - 100, 1)
        .fill(colors.lightGray);

      // Texto con número de página centrado.
      doc
        .fontSize(9)
        .fillColor(colors.secondary)
        .text(
          `Página ${i + 1} de ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

      // Leyenda con nombre del sistema en el pie.
      doc.text(
        '© 2025 - Sistema de Gestión de Proyectos ProCivil Manager',
        50,
        doc.page.height - 35,
        { align: 'center' }
      );
    }

    // ========================================================
    // 3. Registrar en BD que se generó el reporte (opcional)
    // ========================================================

    try {
      // Determina el id del usuario autenticado (acepta id o _id por seguridad).
      const usuarioId =
        (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : null;

      // Crea un registro en la colección de reportes.
      await Reporte.create({
        usuario: usuarioId,                                            // Usuario que generó el reporte
        tipoReporte: 'estadisticas_proyectos_global',                  // Tipo de reporte
        formato: 'pdf',                                                // Formato del archivo
        filtros: {},                                                   // Por ahora sin filtros específicos
        ubicacionArchivo: null,                                        // No se guarda el archivo físicamente
        tamanoBytes: null,                                             // No se calcula tamaño del stream
        estado: 'generado',                                            // Estado del reporte
      });

      // Registra también la acción en la auditoría general.
      await AuditLog.create({
        user: usuarioId,                                               // Usuario que realiza la acción
        action: 'generar_reporte_estadisticas_proyectos',             // Acción realizada
        resource: 'reporte_estadisticas_proyectos_pdf',               // Recurso afectado
        details: {                                                     // Detalle adicional
          tipoReporte: 'estadisticas_proyectos_global',
          formato: 'pdf',
        },
      });
    } catch (registroError) {
      // Cualquier error al registrar el reporte o la auditoría no debe romper la generación del PDF.
      console.error('Error al registrar el reporte generado o la auditoría:', registroError);
    }

    // ======================================
    // 4. Finalizar el documento y responder
    // ======================================

    // Finaliza el documento PDF y envía el stream al cliente.
    doc.end();                                                          // Cierra y envía el PDF
  } catch (err) {
    // Log de error en servidor por si algo falla al generar el reporte.
    console.error('Error generando reporte:', err);

    // Respuesta HTTP de error genérico al frontend.
    res.status(500).json({ message: 'Error al generar el reporte' });
  }
};

// =======================================================
// FUNCIONES AUXILIARES PARA EL DISEÑO DEL PDF (UI helpers)
// =======================================================

/**
 * Dibuja una "card" (tarjeta) de métrica en el PDF.
 *
 * @param {PDFDocument} doc  - Instancia de PDFKit.
 * @param {number} x         - Coordenada X de la tarjeta.
 * @param {number} y         - Coordenada Y de la tarjeta.
 * @param {number} width     - Ancho de la tarjeta.
 * @param {number} height    - Alto de la tarjeta.
 * @param {string} color     - Color principal de la tarjeta (icono/borde).
 * @param {string} icon      - Emoji o texto que actúa como icono.
 * @param {string} label     - Texto descriptivo de la métrica.
 * @param {string} value     - Valor numérico o texto mostrado como KPI.
 */
function drawCard(doc, x, y, width, height, color, icon, label, value) {
  // Dibuja una sombra sutil para la tarjeta (ligero desplazamiento).
  doc.rect(x + 2, y + 2, width, height).fill('#00000010');

  // Fondo blanco de la tarjeta con bordes redondeados.
  doc.roundedRect(x, y, width, height, 8).fill('#ffffff');

  // Borde de la tarjeta usando el color principal.
  doc.lineWidth(2).roundedRect(x, y, width, height, 8).stroke(color);

  // Icono principal en la parte superior izquierda de la tarjeta.
  doc.fontSize(28).fillColor(color).text(icon, x + 15, y + 15);

  // Etiqueta descriptiva de la métrica (debajo del icono).
  doc
    .fontSize(10)
    .fillColor('#64748b')
    .font('Helvetica')
    .text(label, x + 15, y + 55, { width: width - 30 });

  // Valor numérico o texto grande que representa la métrica.
  doc
    .fontSize(20)
    .fillColor('#1e293b')
    .font('Helvetica-Bold')
    .text(value, x + 15, y + 70, { width: width - 30 });
}

/**
 * Dibuja el encabezado de sección (título con barra de color a la izquierda).
 *
 * @param {PDFDocument} doc - Instancia de PDFKit.
 * @param {string} title    - Título de la sección.
 * @param {string} color    - Color de la barra decorativa.
 */
function drawSectionHeader(doc, title, color) {
  const y = doc.y;                                                      // Guarda la Y actual del documento

  // Barrita vertical de color a la izquierda del título.
  doc.rect(50, y, 4, 24).fill(color);

  // Título en texto, alineado un poco más a la derecha.
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text(title, 65, y + 3);
}
