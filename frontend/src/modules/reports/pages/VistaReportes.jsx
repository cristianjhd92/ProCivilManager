// File: frontend/src/modules/reports/pages/VistaReportes.jsx                // Ruta del archivo dentro del módulo de reportes.
// Description: Vista de reportes para descargar estadísticas de            // Descripción: permite exportar estadísticas de proyectos
//              proyectos en PDF (jsPDF + autoTable) y en Excel             // a PDF (jsPDF + autoTable) y a Excel (XML 2003 multi-hoja)
//              (formato XML 2003 multi-hoja) sin usar librerías            // sin librerías externas, usando el tema visual PCM (paleta
//              externas de Excel. Usa el tema visual PCM (paleta           // pcm, sombras y animaciones) y ahora adapta colores al rol
//              pcm, sombras personalizadas y animaciones suaves)           // del usuario (admin / líder / cliente / auditor) mediante
//              y se integra con el dashboard/Workspace del sistema.        // las clases .pcm-panel y .pcm-panel--ROL para el header.

// Importa React y el hook useState para manejar estado local del componente.
import React, { useState } from 'react'; // Importa React y el hook useState para estados de descarga.

// Importa la librería jsPDF para generar documentos PDF en el navegador.
import jsPDF from 'jspdf'; // jsPDF sirve para crear documentos PDF desde el navegador.

// Importa el plugin jspdf-autotable para crear tablas dentro del PDF.
import autoTable from 'jspdf-autotable'; // autoTable permite dibujar tablas en el PDF generado.

// Importa íconos desde lucide-react para los elementos visuales de la interfaz.
import {
  FileText,        // Ícono de archivo de texto (para el botón PDF).
  Download,        // Ícono de descarga.
  TrendingUp,      // Ícono de tendencia (para el tip inferior).
  BarChart3,       // Ícono de gráfica principal del header.
  FileSpreadsheet, // Ícono de hoja de cálculo (para el botón Excel).
  CheckCircle      // Ícono de check usado en las listas de beneficios.
} from 'lucide-react'; // Importa todos los íconos necesarios desde lucide-react.

// =====================================================================================
// Utilidades para adaptar estilos según el rol del usuario (tema PCM por rol)
// =====================================================================================

/**
 * Función auxiliar que devuelve las clases base de panel PCM según el rol.
 * Usa las clases globales .pcm-panel y .pcm-panel--ROL para teñir el header:
 *  - admin         → pcm-panel pcm-panel--admin
 *  - lider de obra → pcm-panel pcm-panel--lider
 *  - cliente       → pcm-panel pcm-panel--cliente
 *  - auditor       → pcm-panel pcm-panel--auditor
 *  - otro          → pcm-panel (neutral)
 */
const obtenerClasesRolPanel = (rol) => {
  // Evalúa el valor de rol y devuelve las clases correspondientes.
  switch (rol) {
    case 'admin': // Si el rol es admin (administrador del sistema)...
      return 'pcm-panel pcm-panel--admin'; // Usa la variante azul del panel.
    case 'lider de obra': // Si el rol es líder de obra...
      return 'pcm-panel pcm-panel--lider'; // Usa la variante naranja del panel.
    case 'cliente': // Si el rol es cliente...
      return 'pcm-panel pcm-panel--cliente'; // Usa la variante verde del panel.
    case 'auditor': // Si el rol es auditor...
      return 'pcm-panel pcm-panel--auditor'; // Usa la variante morada del panel.
    default: // Para cualquier otro valor de rol (o si no viene definido)...
      return 'pcm-panel'; // Deja el panel en un estilo neutral PCM.
  }
};

// =====================================================================================
// Utilidades para generar Excel XML 2003
// =====================================================================================

/**
 * Función utilitaria para escapar caracteres especiales en XML.
 * Evita que caracteres como <, >, &, " o ' rompan la estructura del archivo.
 */
const escapeXml = (value) => {
  // Si el valor es null o undefined, lo tratamos como cadena vacía.
  if (value === null || value === undefined) return '';
  // Convertimos a string para trabajar siempre sobre texto.
  const str = String(value);
  // Reemplazamos los caracteres especiales por sus entidades XML.
  return str
    .replace(/&/g, '&amp;')    // & -> &amp;
    .replace(/</g, '&lt;')     // < -> &lt;
    .replace(/>/g, '&gt;')     // > -> &gt;
    .replace(/"/g, '&quot;')   // " -> &quot;
    .replace(/'/g, '&apos;');  // ' -> &apos;
};

/**
 * Determina si un valor puede tratarse como número para Excel.
 * Se usa para decidir si en el XML el tipo de celda será Number o String.
 */
const isNumericCell = (value) => {
  // Si ya es un número y no es NaN, lo consideramos numérico.
  if (typeof value === 'number' && !Number.isNaN(value)) return true;
  // Si es null/undefined/cadena vacía, no lo tratamos como número.
  if (value === null || value === undefined || value === '') return false;
  // Intentamos convertir a número: si no da NaN, se asume numérico.
  const num = Number(value);
  return !Number.isNaN(num);
};

/**
 * Construye la cadena XML de una fila <Row> de Excel XML 2003.
 * Recibe un arreglo de valores (celdas) y los convierte en celdas <Cell> con sus tipos.
 */
const buildXmlRow = (cells) => {
  // Garantiza que tengamos un arreglo; si no, usa arreglo vacío.
  const safeCells = Array.isArray(cells) ? cells : [];

  // Mapea cada valor de celda a su representación <Cell> en XML.
  const cellsXml = safeCells
    .map((value) => {
      // Determina si la celda se tratará como número o como texto.
      const isNumber = isNumericCell(value);
      // Define el tipo para el atributo ss:Type.
      const type = isNumber ? 'Number' : 'String';
      // Si es número y viene como texto, lo convertimos a Number.
      const normalizedValue = isNumber ? Number(value) : value ?? '';
      // Escapamos el contenido de la celda para no romper el XML.
      const safeValue = escapeXml(normalizedValue);
      // Retornamos el fragmento XML de la celda completa.
      return `<Cell><Data ss:Type="${type}">${safeValue}</Data></Cell>`;
    })
    .join(''); // Unimos todas las celdas en una sola cadena.

  // Envolvemos las celdas dentro de una etiqueta <Row>.
  return `<Row>${cellsXml}</Row>`;
};

/**
 * Construye el XML de una hoja de cálculo (<Worksheet>) de Excel XML 2003.
 * Recibe un nombre de hoja y un arreglo de filas (cada fila es un arreglo de celdas).
 * Añade atributos recomendados de Table (conteo de columnas y filas) para compatibilidad.
 */
const buildWorksheetXml = (sheetName, rows) => {
  // Asegura que sheetName sea algo y que no rompa XML.
  const safeName = escapeXml(sheetName || 'Hoja');

  // Asegura que rows sea un arreglo de filas.
  const safeRows = Array.isArray(rows) ? rows : [];

  // Calcula el número de filas y columnas (para atributos ss:Expanded*).
  const rowCount = safeRows.length;
  const columnCount = rowCount > 0 ? (Array.isArray(safeRows[0]) ? safeRows[0].length : 0) : 0;

  // Construye todas las filas de la hoja usando buildXmlRow.
  const rowsXml = safeRows.map((row) => buildXmlRow(row)).join('');

  // Retorna la estructura <Worksheet> completa con su <Table> interno.
  return `
    <Worksheet ss:Name="${safeName}">
      <Table ss:ExpandedColumnCount="${columnCount}" ss:ExpandedRowCount="${rowCount}" x:FullColumns="1" x:FullRows="1">
        ${rowsXml}
      </Table>
    </Worksheet>
  `;
};

/**
 * Genera el contenido completo de un archivo Excel en formato XML 2003.
 * Incluye hasta tres hojas: "Resumen", "Distribución" y "Proyectos recientes".
 *
 * @param {Array} stats - Arreglo de métricas principales (título, valor).
 * @param {Array} pieData - Datos de distribución por tipo (name, value).
 * @param {Array} proyectosRecientes - Listado de proyectos recientes.
 * @returns {string} - Cadena XML lista para guardarse como .xls.
 */
const generateExcelXmlReport = (stats, pieData, proyectosRecientes) => {
  // Normalizamos los arreglos para evitar problemas si vienen undefined o null.
  const safeStats = Array.isArray(stats) ? stats : [];
  const safePie = Array.isArray(pieData) ? pieData : [];
  const safeProjects = Array.isArray(proyectosRecientes) ? proyectosRecientes : [];

  // ---------------- Hoja 1: Resumen ----------------
  // Definimos las filas de la hoja "Resumen".
  const resumenRows = [
    // Fila de encabezado de la hoja.
    ['Métrica', 'Valor'],
    // Filas de datos, una por cada métrica.
    ...safeStats.map((stat) => [
      stat.title ?? '—', // Columna: nombre de la métrica.
      stat.value ?? '—'  // Columna: valor de la métrica.
    ])
  ];

  // ---------------- Hoja 2: Distribución ----------------
  // Inicializamos el arreglo de filas de distribución con el encabezado.
  const distribRows = [
    ['Tipo de proyecto', 'Cantidad', 'Porcentaje']
  ];

  // Calculamos el total de valores para estimar porcentajes.
  const totalPie = safePie.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  // Agregamos una fila por cada elemento de pieData (si existen).
  safePie.forEach((item) => {
    // Valor numérico para la cantidad.
    const rawValue = Number(item.value) || 0;
    // Porcentaje relativo al total (0 si totalPie es 0).
    const pct = totalPie > 0 ? (rawValue / totalPie) * 100 : 0;
    // Redondeamos a un decimal para mostrarlo más limpio.
    const pctRounded = Number(pct.toFixed(1));

    // Agregamos la fila a la hoja de distribución.
    distribRows.push([
      item.name ?? '—', // Nombre del tipo de proyecto.
      rawValue,         // Cantidad (numérica).
      pctRounded        // Porcentaje (numérico; Excel lo puede formatear como % luego).
    ]);
  });

  // ---------------- Hoja 3: Proyectos recientes ----------------
  // Definimos las filas de la hoja "Proyectos recientes".
  const proyectosRows = [
    ['Título', 'Cliente', 'Presupuesto (COP)', 'Progreso (%)']
  ];

  // Agregamos una fila por cada proyecto reciente.
  safeProjects.forEach((p) => {
    // Normalizamos el presupuesto como número (cero si viene vacío).
    const presupuesto = Number(p.budget || 0);
    // Normalizamos el progreso como número (0–100).
    const progreso = Number(p.progress || 0);

    proyectosRows.push([
      p.title || 'Sin título',   // Título del proyecto.
      p.email || 'Sin cliente',  // Cliente / correo asociado.
      presupuesto,               // Presupuesto numérico (Excel puede sumarlo).
      progreso                   // Progreso numérico (Excel puede usarlo en fórmulas).
    ]);
  });

  // ---------------- Armado del Workbook XML ----------------

  // Construimos la hoja de "Resumen" (siempre se incluye).
  const resumenWorksheet = buildWorksheetXml('Resumen', resumenRows);

  // Construimos la hoja de "Distribución" solo si hay datos.
  const distribWorksheet =
    safePie.length > 0 ? buildWorksheetXml('Distribución', distribRows) : '';

  // Construimos la hoja de "Proyectos recientes" solo si hay datos.
  const proyectosWorksheet =
    safeProjects.length > 0
      ? buildWorksheetXml('Proyectos recientes', proyectosRows)
      : '';

  // Unimos las hojas que existan en una sola cadena.
  const worksheetsXml = `${resumenWorksheet}${distribWorksheet}${proyectosWorksheet}`;

  // Plantilla base de un Workbook en formato XML 2003 para Excel.
  // Incluye sección <Styles> mínima para mejorar compatibilidad.
  const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40"
>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Bottom"/>
      <Borders/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
  </Styles>
  ${worksheetsXml}
</Workbook>
`.trim(); // .trim() elimina espacios en blanco al inicio y final.

  // Retornamos la cadena XML final.
  return xml;
};

// =====================================================================================
// Componente principal VistaReportes
// =====================================================================================

/**
 * Componente principal de la vista de reportes.
 * Recibe tres arreglos: stats, pieData y proyectosRecientes (con valores por defecto []).
 */
const VistaReportes = ({ stats = [], pieData = [], proyectosRecientes = [], rolUsuario = 'admin' }) => {
  // Estado para indicar si se está generando el PDF (controla spinner y deshabilita botón).
  const [downloading, setDownloading] = useState(false); // Booleano para el estado de descarga de PDF.

  // Estado para indicar si se está generando el Excel (controla spinner y deshabilita botón).
  const [excelDownloading, setExcelDownloading] = useState(false); // Booleano para la descarga de Excel.

  // Estado para mostrar un mensaje suave relacionado con la exportación a Excel.
  const [excelMessage, setExcelMessage] = useState(''); // Mensaje informativo temporal para Excel.

  // -------------------------------------------------------------------
  // Detección del rol del usuario actual (para adaptar colores por rol)
  // -------------------------------------------------------------------

  // Rol del usuario que se usará para teñir el header de reportes.
  let rolUsuarioActual = 'admin'; // Valor por defecto (admin) si no se encuentra nada en localStorage.

  try {
    // Intenta leer el usuario desde las claves estándar/legacy de PCM en localStorage.
    const rawUser =
      localStorage.getItem('user') ||           // Primero busca bajo la clave 'user'.
      localStorage.getItem('pcm_usuario') ||    // Luego bajo 'pcm_usuario'.
      '{}';                                     // Si no hay nada, usa un objeto vacío en texto.

    const usuarioLocal = JSON.parse(rawUser);   // Parsea la cadena JSON a objeto.

    // Si el objeto tiene la propiedad role en inglés (por ejemplo: "admin")...
    if (usuarioLocal && typeof usuarioLocal.role === 'string') {
      rolUsuarioActual = usuarioLocal.role;     // Usa ese valor como rol.
    } else if (usuarioLocal && typeof usuarioLocal.rol === 'string') {
      // Si no, pero tiene la propiedad rol en español...
      rolUsuarioActual = usuarioLocal.rol;      // Usa esa como rol.
    }
  } catch (error) {
    // Si algo falla al leer o parsear, se mantiene el rol por defecto en 'admin'.
    rolUsuarioActual = 'admin';
  }

  // Obtiene las clases PCM de panel según el rol detectado.
  const clasesPanelRol = obtenerClasesRolPanel(rolUsuarioActual);

  /**
   * Maneja la descarga del reporte en PDF usando jsPDF + autoTable.
   * Mantiene el comportamiento original (solo se pulen comentarios).
   */
  const handleDownloadPDF = () => {
    // Activa el estado de descarga para mostrar el indicador de carga en el botón.
    setDownloading(true);

    // Simula un pequeño retardo para que el spinner sea visible (mejora percepción de UX).
    setTimeout(() => {
      try {
        // Crea una nueva instancia de jsPDF (tamaño A4, orientación vertical por defecto).
        const doc = new jsPDF();

        // Define la paleta de colores del PDF, alineada con la línea gráfica PCM.
        const colors = {
          primary: [37, 99, 235],     // Azul principal.
          secondary: [100, 116, 139], // Gris azulado.
          accent: [139, 92, 246],     // Morado acento.
          success: [16, 185, 129],    // Verde éxito.
          text: [30, 41, 59]          // Color base para texto.
        };

        // === ENCABEZADO MODERNO ===
        doc.setFillColor(...colors.primary);                     // Color de relleno del header.
        doc.rect(0, 0, doc.internal.pageSize.width, 45, 'F');    // Barra superior.

        doc.setTextColor(255, 255, 255);                         // Texto en blanco.
        doc.setFontSize(28);                                     // Tamaño del título.
        doc.setFont('helvetica', 'bold');                        // Fuente negrita.
        doc.text('Reporte de Estadísticas', 14, 20);             // Título.

        doc.setFontSize(11);                                     // Tamaño para la fecha.
        doc.setFont('helvetica', 'normal');                      // Fuente normal.

        // Fecha actual en español (ej: lunes, 20 de noviembre de 2025).
        const fecha = new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        doc.text(`Generado el ${fecha}`, 14, 35);                // Línea de fecha.

        // Posición vertical actual del contenido.
        let currentY = 55;

        // === SECCIÓN: RESUMEN EJECUTIVO ===
        doc.setTextColor(...colors.text);                        // Texto base.
        doc.setFontSize(16);                                     // Tamaño de sección.
        doc.setFont('helvetica', 'bold');                        // Negrita.

        doc.setDrawColor(...colors.primary);                     // Color de la línea decorativa.
        doc.setLineWidth(3);                                     // Grosor de línea.
        doc.line(14, currentY, 18, currentY);                    // Línea vertical corta.

        doc.text('Resumen Ejecutivo', 22, currentY + 1);         // Título de sección.
        currentY += 10;                                          // Espacio antes de la tabla.

        // Tabla de estadísticas (Métrica / Valor).
        const statsTable = Array.isArray(stats)
          ? stats.map((stat) => [stat.title ?? '—', stat.value ?? '—'])
          : [];

        // Crea la tabla de resumen con autoTable.
        autoTable(doc, {
          head: [['Métrica', 'Valor']],
          body: statsTable,
          startY: currentY,
          theme: 'grid',
          headStyles: {
            fillColor: colors.primary,
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'left',
            font: 'helvetica'
          },
          bodyStyles: {
            fontSize: 11,
            textColor: colors.text,
            font: 'helvetica'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: {
            0: { cellWidth: 100, fontStyle: 'bold' },
            1: { cellWidth: 'auto', halign: 'right' }
          },
          margin: { left: 14, right: 14 }
        });

        // Actualiza currentY a la posición final de la tabla + espacio.
        currentY = doc.lastAutoTable.finalY + 15;

        // === SECCIÓN: DISTRIBUCIÓN POR TIPO === (si hay datos)
        if (Array.isArray(pieData) && pieData.length > 0) {
          doc.setFontSize(16);                                   // Tamaño de la cabecera de sección.
          doc.setFont('helvetica', 'bold');                      // Negrita.
          doc.setTextColor(...colors.text);                      // Color de texto.

          doc.setDrawColor(...colors.accent);                    // Color de la línea lateral.
          doc.setLineWidth(3);                                   // Grosor de la línea.
          doc.line(14, currentY, 18, currentY);                  // Línea vertical.

          doc.text('Distribución por Tipo', 22, currentY + 1);   // Título de sección.
          currentY += 10;                                        // Avanza la posición Y.

          // Total para porcentajes.
          const total = pieData.reduce(
            (sum, item) => sum + (Number(item.value) || 0),
            0
          );

          // Filas de la tabla de distribución.
          const pieTable = pieData.map((item) => {
            const rawValue = Number(item.value) || 0;                          // Valor numérico.
            const percentage =
              total > 0 ? ((rawValue / total) * 100).toFixed(1) : '0.0';       // Porcentaje.
            return [
              item.name ?? '—',                                                // Nombre del tipo.
              rawValue.toString(),                                             // Cantidad.
              `${percentage}%`                                                 // Texto del porcentaje.
            ];
          });

          autoTable(doc, {
            head: [['Tipo de Proyecto', 'Cantidad', 'Porcentaje']],
            body: pieTable,
            startY: currentY,
            theme: 'grid',
            headStyles: {
              fillColor: colors.accent,
              textColor: [255, 255, 255],
              fontSize: 12,
              fontStyle: 'bold',
              halign: 'left',
              font: 'helvetica'
            },
            bodyStyles: {
              fontSize: 11,
              textColor: colors.text,
              font: 'helvetica'
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            columnStyles: {
              0: { cellWidth: 90 },
              1: { cellWidth: 45, halign: 'center' },
              2: { cellWidth: 45, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
          });

          currentY = doc.lastAutoTable.finalY + 15; // Espacio después de la tabla.
        }

        // === SECCIÓN: PROYECTOS RECIENTES === (si hay datos)
        if (Array.isArray(proyectosRecientes) && proyectosRecientes.length > 0) {
          doc.setFontSize(16);                                   // Tamaño del título de sección.
          doc.setFont('helvetica', 'bold');                      // Negrita.
          doc.setTextColor(...colors.text);                      // Color de texto.

          doc.setDrawColor(...colors.success);                   // Color de la línea lateral.
          doc.setLineWidth(3);                                   // Grosor de la línea.
          doc.line(14, currentY, 18, currentY);                  // Línea vertical.

          doc.text('Proyectos Recientes', 22, currentY + 1);     // Título de sección.
          currentY += 10;                                        // Avanza Y.

          // Filas de proyectos recientes.
          const proyectosTable = proyectosRecientes.map((p) => [
            p.title || 'Sin título',                             // Título.
            p.email || 'Sin cliente',                            // Cliente.
            `$${Number(p.budget || 0).toLocaleString('es-ES')}`, // Presupuesto formateado.
            `${Number(p.progress || 0)}%`                        // Progreso con porcentaje.
          ]);

          autoTable(doc, {
            head: [['Título', 'Cliente', 'Presupuesto', 'Progreso']],
            body: proyectosTable,
            startY: currentY,
            theme: 'grid',
            headStyles: {
              fillColor: colors.success,
              textColor: [255, 255, 255],
              fontSize: 11,
              fontStyle: 'bold',
              halign: 'left',
              font: 'helvetica'
            },
            bodyStyles: {
              fontSize: 10,
              textColor: colors.text,
              font: 'helvetica'
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            columnStyles: {
              0: { cellWidth: 55 },
              1: { cellWidth: 50 },
              2: { cellWidth: 40, halign: 'right' },
              3: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 },
            didParseCell: (data) => {
              // Aplica un color de texto según el progreso (columna 3 del cuerpo).
              if (data.column.index === 3 && data.cell.section === 'body') {
                const rawText = data.cell.text?.[0] || '';           // Texto crudo de la celda.
                const progress = parseInt(rawText.replace('%', ''), 10); // Extrae el número.

                if (Number.isNaN(progress)) return;                  // Si no es un número, no hace nada.

                // Según el porcentaje, cambia el color de la celda.
                if (progress >= 75) {
                  data.cell.styles.textColor = colors.success;       // Verde para alto avance.
                } else if (progress >= 50) {
                  data.cell.styles.textColor = [245, 158, 11];       // Naranja medio.
                } else if (progress >= 25) {
                  data.cell.styles.textColor = [251, 191, 36];       // Amarillo.
                } else {
                  data.cell.styles.textColor = [239, 68, 68];        // Rojo para bajos avances.
                }
              }
            }
          });
        }

        // === PIE DE PÁGINA (todas las páginas) ===
        const pageCount = doc.internal.getNumberOfPages(); // Número total de páginas.

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);                                   // Cambia a la página i.

          // Línea tenue sobre el pie.
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.5);
          doc.line(
            14,
            doc.internal.pageSize.height - 25,
            doc.internal.pageSize.width - 14,
            doc.internal.pageSize.height - 25
          );

          // Texto "Página X de Y".
          doc.setFontSize(9);
          doc.setTextColor(...colors.secondary);
          doc.setFont('helvetica', 'normal');

          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 15,
            { align: 'center' }
          );

          // Leyenda con nombre del sistema.
          doc.text(
            '2025 - ProCivil Manager - Sistema de Gestión de Proyectos',
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 8,
            { align: 'center' }
          );
        }

        // Lanza la descarga del archivo PDF con el nombre indicado.
        doc.save('reporte_estadisticas.pdf');
      } catch (error) {
        // Si ocurre algún problema, lo mostramos en consola para depuración.
        console.error('Error al generar el PDF de estadísticas:', error);
      } finally {
        // Desactiva el estado de descarga para reactivar el botón.
        setDownloading(false);
      }
    }, 500); // Retardo de 500 ms para que el spinner sea perceptible.
  };

  /**
   * Maneja la descarga del reporte en Excel sin librerías externas.
   * Genera un archivo XML 2003 y lo descarga con extensión .xls.
   */
  const handleDownloadExcel = () => {
    // Activa la bandera de descarga de Excel para manejar estados de UI.
    setExcelDownloading(true);
    // Limpia cualquier mensaje previo antes de generar un nuevo archivo.
    setExcelMessage('');

    // Valida si hay algo que exportar (stats, pieData o proyectos).
    const hasAnyData =
      (Array.isArray(stats) && stats.length > 0) ||
      (Array.isArray(pieData) && pieData.length > 0) ||
      (Array.isArray(proyectosRecientes) && proyectosRecientes.length > 0);

    // Si no hay datos, muestra mensaje y no genera archivo.
    if (!hasAnyData) {
      setExcelMessage('No hay datos para exportar a Excel.'); // Mensaje al usuario.
      setExcelDownloading(false);                             // Libera el estado de descarga.
      // Oculta el mensaje después de algunos segundos.
      setTimeout(() => {
        setExcelMessage('');
      }, 6000);
      return;                                                 // Sale sin generar archivo.
    }

    try {
      // Genera el contenido XML completo del libro de Excel.
      const rawXmlContent = generateExcelXmlReport(stats, pieData, proyectosRecientes);

      // Agrega un BOM UTF-8 al inicio para que Excel detecte bien la codificación.
      const xmlContentWithBom = `\uFEFF${rawXmlContent}`;

      // Crea un Blob con el contenido XML y un tipo MIME compatible con Excel.
      const blob = new Blob([xmlContentWithBom], {
        type: 'application/vnd.ms-excel'
      });

      // Genera una URL temporal para el Blob.
      const url = URL.createObjectURL(blob);

      // Crea un enlace <a> para forzar la descarga del archivo.
      const link = document.createElement('a');
      link.href = url;                                        // Apunta al Blob.
      link.download = 'reporte_estadisticas.xls';             // Nombre del archivo descargado.

      // Agrega el enlace al DOM, dispara el clic y luego lo elimina.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoca la URL temporal para liberar memoria.
      URL.revokeObjectURL(url);

      // Mensaje de éxito para informar al usuario.
      setExcelMessage('Reporte Excel descargado correctamente (formato XML compatible con Excel).');
    } catch (error) {
      // Loguea en consola si ocurre algún problema al generar el Excel.
      console.error('Error al generar el Excel de estadísticas:', error);
      // Mensaje amigable al usuario en caso de error.
      setExcelMessage(
        'Ocurrió un error al generar el archivo Excel. Intenta nuevamente.'
      );
    } finally {
      // Siempre desactiva la bandera de descarga.
      setExcelDownloading(false);
      // Oculta el mensaje después de algunos segundos.
      setTimeout(() => {
        setExcelMessage('');
      }, 6000);
    }
  };

  // =====================================================================================
  // Render de la interfaz de reportes
  // =====================================================================================

  // Retorna el JSX que define la interfaz de la vista de reportes.
  return (
    // Contenedor principal con separación vertical entre secciones y animación suave de entrada.
    <div className="space-y-6 animate-fade-in-soft">
      {/* Header de la sección usando el fondo degradado principal PCM y colores según rol */}
      <div
        className={`pcm-fondo-degradado-principal rounded-pcm-xl p-6 md:p-6 shadow-pcm-soft border border-white/10 ${clasesPanelRol}`}
      >
        {/* Fila para ícono y título */}
        <div className="flex items-center space-x-3 mb-3">
          {/* Fondo translúcido para el ícono con efecto de blur */}
          <div className="bg-white/15 p-3 rounded-xl backdrop-blur-sm shadow-pcm-soft">
            {/* Ícono de gráfica principal en color blanco */}
            <BarChart3 className="text-white" size={28} />
          </div>
          {/* Contenedor de textos del encabezado */}
          <div>
            {/* Título grande de la sección */}
            <h2 className="text-3xl font-bold text-white">
              Reportes y estadísticas
            </h2>
            {/* Subtítulo descriptivo ligero */}
            <p className="text-sm text-white/80">
              Exporta información clave de tus proyectos con un solo clic.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de descarga */}
      {/* Grid responsivo: una columna en móvil y dos columnas en pantallas medianas en adelante */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card PDF */}
        {/* Tarjeta para descarga de reporte en PDF con tema PCM y efecto hover */}
        <div className="group relative bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl shadow-pcm-soft hover:-translate-y-0.5 hover:bg-pcm-surfaceSoft transition-all duration-300 overflow-hidden border border-white/10 animate-slide-up-soft">
          {/* Banda decorativa superior usando color PCM en lugar de gradiente */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-pcm-primary" />

          {/* Contenido interno de la tarjeta */}
          <div className="p-6">
            {/* Fila para ícono y títulos de la tarjeta */}
            <div className="flex items-center space-x-4 mb-6">
              {/* Contenedor del ícono con fondo PCM y animación de escala al hacer hover */}
              <div className="bg-pcm-primary p-4 rounded-xl shadow-pcm-soft group-hover:scale-110 transition duration-300">
                {/* Ícono de archivo de texto (PDF) en color blanco */}
                <FileText className="text-white" size={32} />
              </div>
              {/* Textos de título y subtítulo de la tarjeta */}
              <div>
                {/* Título de la tarjeta PDF */}
                <h3 className="text-2xl font-bold text-pcm-text">Reporte PDF</h3>
                {/* Subtítulo descriptivo en texto pequeño y atenuado */}
                <p className="text-pcm-muted text-sm">
                  Documento profesional para compartir
                </p>
              </div>
            </div>

            {/* Texto descriptivo de lo que incluye el reporte PDF */}
            <p className="text-pcm-muted mb-6 text-sm">
              Descarga un reporte completo en formato PDF con estadísticas, tablas
              y análisis listos para presentar a clientes y supervisores.
            </p>

            {/* Lista de beneficios del reporte PDF */}
            <div className="space-y-3 mb-6">
              {/* Ítem 1: diseño profesional */}
              <div className="flex items-center space-x-2 text-sm text-pcm-muted">
                <CheckCircle size={16} className="text-pcm-accent" />
                <span>Diseño profesional y moderno</span>
              </div>
              {/* Ítem 2: tablas detalladas */}
              <div className="flex items-center space-x-2 text-sm text-pcm-muted">
                <CheckCircle size={16} className="text-pcm-accent" />
                <span>Métricas clave organizadas en tablas claras</span>
              </div>
              {/* Ítem 3: listo para compartir */}
              <div className="flex items-center space-x-2 text-sm text-pcm-muted">
                <CheckCircle size={16} className="text-pcm-accent" />
                <span>Ideal para informes de avance y cierre</span>
              </div>
            </div>

            {/* Botón para descargar el PDF con estados de carga y hover */}
            <button
              onClick={handleDownloadPDF} // Asigna el manejador de clic que genera el PDF.
              disabled={downloading}      // Deshabilita el botón mientras se genera el PDF.
              className="pcm-btn-primary w-full flex items-center justify-center gap-2 text-sm font-semibold
                         transition duration-200 hover:shadow-pcm-tab-glow hover:scale-105 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pcm-primary/70
                         focus-visible:ring-offset-2 focus-visible:ring-offset-pcm-bg
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Renderiza contenido distinto según el estado de descarga */}
              {downloading ? (
                <>
                  {/* Spinner circular animado */}
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card Excel */}
        {/* Tarjeta para descarga en Excel con estilos alineados al tema PCM */}
        <div className="group relative bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl shadow-pcm-soft hover:-translate-y-0.5 hover:bg-pcm-surfaceSoft transition-all duration-300 overflow-hidden border border-white/10 animate-slide-up-soft">
          {/* Banda decorativa superior usando color PCM secundario */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-pcm-secondary" />

          {/* Contenido interno de la tarjeta de Excel */}
          <div className="p-6">
            {/* Encabezado con ícono y texto */}
            <div className="flex items-center space-x-4 mb-6">
              {/* Contenedor del ícono de Excel con color PCM y animación de escala */}
              <div className="bg-pcm-secondary p-4 rounded-xl shadow-pcm-soft group-hover:scale-110 transition duration-300">
                {/* Ícono de hoja de cálculo en color blanco */}
                <FileSpreadsheet className="text-white" size={32} />
              </div>
              {/* Título y subtítulo de la tarjeta Excel */}
              <div>
                <h3 className="text-2xl font-bold text-pcm-text">Reporte Excel</h3>
                <p className="text-pcm-muted text-sm">
                  Datos editables para análisis
                </p>
              </div>
            </div>

            {/* Descripción de las capacidades del reporte Excel */}
            <p className="text-pcm-muted mb-6 text-sm">
              Exporta las métricas, la distribución por tipo y el listado de proyectos
              recientes a un archivo Excel (formato XML 2003) listo para filtros, tablas
              dinámicas y análisis avanzados, sin depender de librerías externas.
            </p>

            {/* Lista de beneficios del reporte en Excel */}
            <div className="space-y-3 mb-4">
              {/* Ítem 1: datos organizados en hojas */}
              <div className="flex items-center space-x-2 text-sm text-pcm-muted">
                <CheckCircle size={16} className="text-pcm-accent" />
                <span>Datos organizados por hojas (Resumen, Distribución, Proyectos)</span>
              </div>
              {/* Ítem 2: fácil de editar */}
              <div className="flex items-center space-x-2 text-sm text-pcm-muted">
                <CheckCircle size={16} className="text-pcm-accent" />
                <span>Fácil de editar y combinar con otros informes en Excel</span>
              </div>
              {/* Ítem 3: compatible con Excel y LibreOffice */}
              <div className="flex items-center space-x-2 text-sm text-pcm-muted">
                <CheckCircle size={16} className="text-pcm-accent" />
                <span>Compatible con Excel moderno y LibreOffice</span>
              </div>
            </div>

            {/* Botón para disparar la exportación a Excel con estados de carga */}
            <button
              onClick={handleDownloadExcel}     // Manejador de clic que genera y descarga el Excel.
              disabled={excelDownloading}       // Deshabilita el botón mientras se genera el archivo.
              className="w-full flex items-center justify-center gap-2 bg-pcm-secondary hover:bg-pcm-accent text-white
                         py-3.5 px-6 rounded-pcm-xl font-semibold shadow-pcm-soft transition duration-200
                         hover:shadow-pcm-tab-glow hover:scale-105 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pcm-secondary/70
                         focus-visible:ring-offset-2 focus-visible:ring-offset-pcm-bg
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Contenido dinámico según estado de generación del Excel */}
              {excelDownloading ? (
                <>
                  {/* Spinner circular animado */}
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Generando Excel...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Descargar Excel</span>
                </>
              )}
            </button>

            {/* Mensaje suave cuando se completa o falla la exportación de Excel */}
            {excelMessage && (
              <p className="mt-3 text-xs text-pcm-muted animate-fade-in-soft">
                {excelMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Información adicional: tip de uso de los reportes */}
      <div className="bg-pcm-surfaceSoft/80 border border-white/10 rounded-pcm-xl p-6 shadow-pcm-soft">
        {/* Contenedor con ícono a la izquierda y texto a la derecha */}
        <div className="flex items-start space-x-3">
          {/* Ícono de tendencia positiva en color pcm-primary */}
          <TrendingUp className="text-pcm-primary mt-1" size={24} />
          {/* Contenedor de los textos del tip */}
          <div>
            {/* Título del tip en negrita */}
            <h4 className="font-semibold text-pcm-text mb-2">
              Tip: sácale provecho a estos reportes
            </h4>
            {/* Lista con viñetas sobre usos recomendados del reporte */}
            <ul className="text-pcm-muted text-sm space-y-1">
              <li>• Presenta avances de obra a clientes y supervisores.</li>
              <li>• Analiza el rendimiento de tu equipo por proyecto.</li>
              <li>• Identifica cuellos de botella y oportunidades de mejora.</li>
              <li>• Mantén un registro histórico de tus contratos y etapas.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente en español para usarlo en el dashboard/Workspace.
export default VistaReportes; // Exportación por defecto del componente VistaReportes.
