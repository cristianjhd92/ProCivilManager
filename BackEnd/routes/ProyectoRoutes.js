const express = require('express');
const router = express.Router();
const { getProyectos, crearProyecto, getProyectosUsuario, getProyectosRecientes,  updateProyectoById, deleteProyectoById } = require('../controllers/ProyectosController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', getProyectos);
router.post('/crear', crearProyecto);
router.get('/recientes', getProyectosRecientes);
router.put('/:id', updateProyectoById);     
router.delete('/:id', deleteProyectoById);

// Ruta protegida para obtener proyectos del usuario autenticado
router.get('/mis-proyectos', authMiddleware, getProyectosUsuario);

module.exports = router;
