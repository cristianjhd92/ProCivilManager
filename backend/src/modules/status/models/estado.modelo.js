// File: BackEnd/src/modules/status/models/estado.modelo.js
// Description: Modelo lógico (no Mongoose) para representar el resumen de
//              estadísticas de proyectos que consume el dashboard de PCM.
//              Se encarga de normalizar y dar forma consistente a la
//              respuesta de overview (totales, distribuciones, series, etc.).

/**
 * Crea un objeto normalizado de resumen de estadísticas de proyectos.
 *
 * @param {Object} params
 * @param {number} params.totalProyectos        - Número total de proyectos.
 * @param {number} params.presupuestoTotal      - Suma de budget de todos los proyectos.
 * @param {Object} params.proyectosPorEstado    - Mapa estado → cantidad.
 * @param {Object} params.proyectosPorTipo      - Mapa tipo → cantidad.
 * @param {Array}  params.proyectosMensuales    - Serie de agregados por año/mes.
 * @param {number} params.progresoPromedio      - Porcentaje promedio de avance global.
 * @returns {Object} Objeto listo para enviarse como JSON al frontend.
 */
const crearResumenEstadoProyectos = ({
  totalProyectos = 0,
  presupuestoTotal = 0,
  proyectosPorEstado = {},
  proyectosPorTipo = {},
  proyectosMensuales = [],
  progresoPromedio = 0,
}) => {
  return {
    // Total de proyectos registrados en el sistema.
    totalProyectos: Number(totalProyectos) || 0,

    // Suma global de budgets de todos los proyectos (en COP).
    presupuestoTotal: Number(presupuestoTotal) || 0,

    // Distribución por estado (status): { planning: 3, completed: 2, ... }.
    proyectosPorEstado:
      proyectosPorEstado && typeof proyectosPorEstado === 'object'
        ? proyectosPorEstado
        : {},

    // Distribución por tipo (type): { residencial: 4, vial: 1, ... }.
    proyectosPorTipo:
      proyectosPorTipo && typeof proyectosPorTipo === 'object'
        ? proyectosPorTipo
        : {},

    // Serie temporal de proyectos creados por mes (últimos ~6 meses).
    // Cada item típico: { _id: {year, month}, total }
    proyectosMensuales: Array.isArray(proyectosMensuales)
      ? proyectosMensuales
      : [],

    // Progreso promedio global del portafolio, en porcentaje (0–100).
    progresoPromedio: Number(progresoPromedio) || 0,

    // Marca de tiempo de generación del resumen (útil para debug en frontend).
    generadoEn: new Date(),
  };
};

// Exporta el "modelo" lógico para que pueda usarse en el controlador.
module.exports = {
  crearResumenEstadoProyectos, // Factory que normaliza el resumen de estadísticas.
};
