// controllers/reportController.js
const PDFDocument = require("pdfkit");
const Proyectos = require("../models/Proyectos");

exports.generateStatsReport = async (req, res) => {
  try {
    // --- Reusar la misma lógica de statsController ---
    const totalProyectos = await Proyectos.countDocuments();
    const proyectos = await Proyectos.find();

    const presupuestoTotal = proyectos.reduce((sum, p) => sum + (p.budget || 0), 0);
    const progresoPromedio = proyectos.length
      ? (proyectos.reduce((sum, p) => sum + (p.progress || 0), 0) / proyectos.length).toFixed(2)
      : 0;

    // --- Crear documento PDF ---
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=estadisticas.pdf");
    doc.pipe(res);

    doc.fontSize(20).text("📊 Reporte de Estadísticas", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Total de proyectos: ${totalProyectos}`);
    doc.text(`Presupuesto total: $${presupuestoTotal}`);
    doc.text(`Progreso promedio: ${progresoPromedio}%`);
    doc.moveDown();

    doc.text("Distribución por estado:");
    const proyectosPorEstado = proyectos.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(proyectosPorEstado).forEach(([estado, cantidad]) => {
      doc.text(`- ${estado}: ${cantidad}`);
    });

    doc.moveDown();
    doc.text("Distribución por tipo:");
    const proyectosPorTipo = proyectos.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});
    Object.entries(proyectosPorTipo).forEach(([tipo, cantidad]) => {
      doc.text(`- ${tipo}: ${cantidad}`);
    });

    doc.end();
  } catch (err) {
    console.error("Error generando reporte:", err);
    res.status(500).json({ message: "Error al generar el reporte" });
  }
};
