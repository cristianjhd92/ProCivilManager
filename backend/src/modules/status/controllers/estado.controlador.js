// File: BackEnd/src/modules/status/controllers/estado.controlador.js
// Description: Controlador de estadísticas globales de proyectos para
//              ProCivil Manager (PCM). Calcula métricas agregadas para
//              el dashboard (overview) y lista de proyectos recientes,
//              usando la colección Proyectos como fuente de datos.

const Proyectos = require('../../projects/models/proyecto.modelo'); // Modelo Mongoose de proyectos.
const {
  crearResumenEstadoProyectos,                                     // Modelo lógico para normalizar la respuesta de overview.
} = require('../models/estado.modelo');

/**
 * getStatsOverview
 *
 * Endpoint que devuelve un resumen global de estadísticas de proyectos:
 *  - Total de proyectos
 *  - Presupuesto total (suma de budget)
 *  - Distribución por estado
 *  - Distribución por tipo
 *  - Proyectos creados por mes (últimos ~6 meses)
 *  - Progreso promedio (%)
 */
const getStatsOverview = async (req, res) => {
  try {
    // 📌 1. Construir un filtro de proyectos según el rol del usuario.
    //     Si el rol es 'admin' o no se provee usuario, no se aplica filtro adicional.
    const rolUsuario = req.user?.role;
    const usuarioId = req.user?._id || req.user?.id;
    const emailUsuario = req.user?.email;

    const filtroProyectos = {};
    if (rolUsuario === 'lider de obra') {
      // Para líderes de obra, sólo proyectos donde figura como líder.
      filtroProyectos.lider = usuarioId;
    } else if (rolUsuario === 'cliente') {
      // Para clientes, proyectos asociados a su identificador de cliente o correo.
      filtroProyectos.$or = [
        { cliente: usuarioId },
        { email: emailUsuario },
      ];
    }

    // 📌 1. Contar el total de proyectos visibles para el usuario.
    const totalProyectos = await Proyectos.countDocuments(filtroProyectos);

    // 📌 2. Obtener los proyectos filtrados para calcular métricas agregadas.
    const proyectos = await Proyectos.find(filtroProyectos);

    // 📌 3. Presupuesto total: suma del campo "budget" de todos los proyectos.
    const presupuestoTotal = proyectos.reduce(
      (sum, p) => sum + (Number(p.budget) || 0),             // Cada budget se normaliza a número, usa 0 si falta.
      0
    );

    // 📌 4. Distribución por estado (status).
    //     Objeto tipo { "planning": 3, "completed": 2, ... }.
    const proyectosPorEstado = proyectos.reduce((acc, p) => {
      const estado = p.status || 'sin estado';               // Fallback por si algún proyecto no tiene estado definido.
      acc[estado] = (acc[estado] || 0) + 1;                 // Incrementa el contador para ese estado.
      return acc;                                            // Devuelve el acumulador.
    }, {});

    // 📌 5. Distribución por tipo (type).
    //     Objeto tipo { "residencial": 4, "vial": 1, ... }.
    const proyectosPorTipo = proyectos.reduce((acc, p) => {
      const tipo = p.type || 'sin tipo';                     // Fallback si no hay tipo definido.
      acc[tipo] = (acc[tipo] || 0) + 1;                      // Incrementa el contador para ese tipo.
      return acc;                                            // Devuelve el acumulador.
    }, {});

    // 📌 6. Proyectos por mes.
    //     Agregación MongoDB: agrupa por año/mes de createdAt.
    //     Aplica el mismo filtro de proyectos según rol para no incluir
    //     proyectos que el usuario no debería visualizar. Si se desea
    //     limitar a los últimos N meses, se puede ajustar aquí; en este
    //     caso no se acota explícitamente el rango temporal, permitiendo
    //     al frontend filtrar por año según sea necesario.
    const proyectosMensuales = await Proyectos.aggregate([
      {
        $match: filtroProyectos,
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // 📌 7. Progreso promedio (%).
    //     Promedio del campo "progress" de todos los proyectos (0–100).
    let progresoPromedio = 0;                                // Valor por defecto.

    if (proyectos.length > 0) {
      const sumaProgreso = proyectos.reduce(
        (sum, p) => sum + (Number(p.progress) || 0),         // Normaliza cada progress a número (0 si falta).
        0
      );

      // Se calcula el promedio y se redondea a 2 decimales.
      progresoPromedio = Number(
        (sumaProgreso / proyectos.length).toFixed(2)
      );
    }

    // 📦 8. Construir el resumen normalizado usando el modelo lógico.
    const resumen = crearResumenEstadoProyectos({
      totalProyectos,
      presupuestoTotal,
      proyectosPorEstado,
      proyectosPorTipo,
      proyectosMensuales,
      progresoPromedio,
    });

    // 📤 9. Enviar respuesta JSON al frontend.
    res.status(200).json(resumen);
  } catch (error) {
    // 🚨 Log en servidor para seguimiento de errores.
    console.error('Error al obtener estadísticas:', error);
    // Respuesta genérica de error para el cliente.
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

/**
 * getProyectosRecientes
 *
 * Devuelve los últimos 5 proyectos creados, ordenados de más reciente
 * a más antiguo. Se usa típicamente en el dashboard para mostrar
 * un listado corto de "Proyectos recientes".
 */
const getProyectosRecientes = async (req, res) => {
  try {
    // 🔎 Busca proyectos según el rol del usuario.
    const rolUsuario = req.user?.role;
    const usuarioId = req.user?._id || req.user?.id;
    const emailUsuario = req.user?.email;

    const filtroProyectos = {};
    if (rolUsuario === 'lider de obra') {
      filtroProyectos.lider = usuarioId;
    } else if (rolUsuario === 'cliente') {
      filtroProyectos.$or = [
        { cliente: usuarioId },
        { email: emailUsuario },
      ];
    }

    // Busca proyectos, ordena por createdAt descendente y limita a 5.
    const proyectos = await Proyectos.find(filtroProyectos)
      .sort({ createdAt: -1 })
      .limit(5);

    // 📤 Devuelve el arreglo de proyectos filtrados por rol.
    res.status(200).json(proyectos);
  } catch (error) {
    // 🚨 Log de error en servidor.
    console.error('Error al obtener proyectos recientes:', error);
    // Respuesta genérica de error.
    res.status(500).json({ message: 'Error al obtener proyectos recientes' });
  }
};

// Exporta las funciones del controlador para que puedan usarse en las rutas.
module.exports = {
  getStatsOverview,                                         // Resumen global de estadísticas para el dashboard.
  getProyectosRecientes,                                    // Listado corto de proyectos recientes.
};
