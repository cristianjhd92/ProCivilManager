const Proyectos = require('../models/Proyectos');
const { sendProjectRequestEmail } = require('../services/ServiceEmail');

// Utilidad para validar email
const isValidEmail = (email) => {
  return /^[\w.-]+@[\w.-]+\.\w+$/.test(email);
};

// Obtener todos los proyectos
const getProyectos = async (req, res) => {
  try {
    const proyectos = await Proyectos.find();
    res.status(200).json(proyectos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proyectos' });
  }
};

// Obtener los últimos 5 proyectos ordenados por fecha de creación (Admin)
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




const crearProyecto = async (req, res) => {
 // console.log('--- crearProyecto invoked ---');
  try {
    const {
      title,
      location,
      type,
      budget,
      duration,
      description,
      priority,
      startDate,
      endDate,
      email,
      team
    } = req.body;

    //console.log('Datos recibidos:', req.body);

    // Validación de campos obligatorios
    if (!title || !location || !type || !budget || !duration || !startDate || !endDate || !email) {
     // console.log('Faltan campos obligatorios');
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    // Validación de tipo y formato de datos
    if (typeof title !== 'string' || typeof location !== 'string' || typeof type !== 'string') {
     // console.log('Título, ubicación o tipo no son cadenas de texto');
      return res.status(400).json({ message: 'Título, ubicación y tipo deben ser cadenas de texto' });
    }

    if (isNaN(Number(budget)) || Number(budget) <= 0) {
    //  console.log('Presupuesto inválido:', budget);
      return res.status(400).json({ message: 'El presupuesto debe ser un número válido mayor a 0' });
    }

    if (isNaN(Number(duration)) || Number(duration) <= 0) {
    //  console.log('Duración inválida:', duration);
      return res.status(400).json({ message: 'La duración debe ser un número válido mayor a 0' });
    }

    if (!isValidEmail(email)) {
     // console.log('Email no válido:', email);
      return res.status(400).json({ message: 'El correo electrónico no es válido' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//console.log('Fecha inválida:', startDate, endDate);
      return res.status(400).json({ message: 'Las fechas deben ser válidas' });
    }

    if (start > end) {
    //  console.log('Fecha de inicio posterior a fecha de fin');
      return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' });
    }

    if (team && !Array.isArray(team)) {
     // console.log('Equipo no es arreglo:', team);
      return res.status(400).json({ message: 'El equipo debe ser un arreglo' });
    }

    const nuevoProyecto = new Proyectos({
      title,
      location,
      type,
      budget: Number(budget),
      duration: Number(duration),
      description: description || '',
      priority: priority || 'media',
      startDate: start,
      endDate: end,
      email,
      team: Array.isArray(team) ? team : [],
      status: 'planning',
      progress: 0,
      createdAt: new Date()
    });

    //console.log('Guardando proyecto en BD...');
    const proyectoGuardado = await nuevoProyecto.save();
   // console.log('Proyecto guardado:', proyectoGuardado);

    // Preparar datos para el correo
    const projectData = {
      name: title,
      email,
      phone: '', // si tienes teléfono lo agregas aquí
      projectType: type,
      location,
      message: description || 'No hay mensaje adicional'
    };

    try {
      //console.log('Enviando correo con datos:', projectData);
      await sendProjectRequestEmail(projectData);
      //console.log('Correo enviado correctamente');
    } catch (emailError) {
      console.error('Error enviando correo:', emailError);
    }

    res.status(201).json({
      message: 'Proyecto creado exitosamente',
      proyecto: proyectoGuardado
    });
  } catch (error) {
    //console.error('Error en crearProyecto:', error);
    res.status(500).json({ message: 'Error al registrar el proyecto' });
  }
};





// Obtener proyectos del usuario autenticado
const getProyectosUsuario = async (req, res) => {
  try {
    const emailUsuario = req.user?.email;

    if (!emailUsuario || !isValidEmail(emailUsuario)) {
      return res.status(401).json({ message: 'No autorizado, token inválido o email no válido' });
    }

    const proyectosUsuario = await Proyectos.find({ email: emailUsuario });
    res.status(200).json(proyectosUsuario);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proyectos del usuario' });
  }
};

// Actualizar proyecto por ID
const updateProyectoById = async (req, res) => {
  const proyectoId = req.params.id;
  const { title, location, type, budget, duration, description, priority, startDate, endDate, status, progress, team } = req.body;

  try {
    const proyecto = await Proyectos.findById(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    // Actualizamos solo lo que venga en el body
    proyecto.title = title || proyecto.title;
    proyecto.location = location || proyecto.location;
    proyecto.type = type || proyecto.type;
    proyecto.budget = budget || proyecto.budget;
    proyecto.duration = duration || proyecto.duration;
    proyecto.description = description || proyecto.description;
    proyecto.priority = priority || proyecto.priority;
    proyecto.startDate = startDate ? new Date(startDate) : proyecto.startDate;
    proyecto.endDate = endDate ? new Date(endDate) : proyecto.endDate;
    proyecto.status = status || proyecto.status;
    proyecto.progress = progress ?? proyecto.progress;
    proyecto.team = team || proyecto.team;

    await proyecto.save();

    res.status(200).json({ message: 'Proyecto actualizado correctamente', proyecto });
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    res.status(500).json({ message: 'Error al actualizar proyecto' });
  }
};

// Eliminar proyecto por ID
const deleteProyectoById = async (req, res) => {
  const proyectoId = req.params.id;

  try {
    const proyecto = await Proyectos.findByIdAndDelete(proyectoId);
    if (!proyecto) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }
    res.status(200).json({ message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    console.error("Error al eliminar proyecto:", error);
    res.status(500).json({ message: 'Error al eliminar proyecto' });
  }
};

module.exports = {
  getProyectos,
  crearProyecto,
  getProyectosUsuario,
  getProyectosRecientes,
  updateProyectoById,
  deleteProyectoById
};

