const Proyectos = require('../models/Proyectos');

const getStatsOverview = async (req, res) => {
  try {
    const totalProyectos = await Proyectos.countDocuments();

    const proyectos = await Proyectos.find();

    const presupuestoTotal = proyectos.reduce((sum, p) => sum + (p.budget || 0), 0);

    const proyectosPorEstado = proyectos.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const proyectosPorTipo = proyectos.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {});

    // Proyectos por mes (últimos 6 meses)
    const ahora = new Date();
    const hace6Meses = new Date();
    hace6Meses.setMonth(ahora.getMonth() - 5);
    hace6Meses.setDate(1);

    const proyectosMensuales = await Proyectos.aggregate([
      {
        $match: {
          createdAt: { $gte: hace6Meses }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    const progresoPromedio = proyectos.length
      ? (proyectos.reduce((sum, p) => sum + (p.progress || 0), 0) / proyectos.length).toFixed(2)
      : 0;

    res.json({
      totalProyectos,
      presupuestoTotal,
      proyectosPorEstado,
      proyectosPorTipo,
      proyectosMensuales,
      progresoPromedio
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};


// Obtener los últimos 5 proyectos ordenados por fecha de creación
const getProyectosRecientes = async (req, res) => {
    try {
      const proyectos = await Proyectos.find()
        .sort({ createdAt: -1 }) // Más recientes primero
        .limit(5);               // Solo 5 proyectos
  
      res.json(proyectos);
    } catch (error) {
      console.error('Error al obtener proyectos recientes:', error);
      res.status(500).json({ message: 'Error al obtener proyectos recientes' });
    }
  };
  
  
module.exports = { getStatsOverview , getProyectosRecientes};
