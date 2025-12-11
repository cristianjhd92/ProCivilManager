// File: BackEnd/src/modules/projects/routes/proyecto.rutas.js
// Description: Define las rutas HTTP para gestionar proyectos, incluyendo
//              creación, listado, actualización, eliminación, manejo de
//              materiales, comentarios, líderes de obra y archivos adjuntos.
//              Los permisos se controlan por rol (admin, líder de obra,
//              cliente, auditor) según corresponda a cada operación.

const express = require('express');                          // Importa Express para crear el router HTTP.
const router = express.Router();                             // Crea una instancia de router de Express.

// Importa los controladores de proyectos con los nombres en español
const {
  obtenerProyectos,                                          // Obtener todos los proyectos (filtra según rol usando req.user).
  crearProyecto,                                             // Crear un nuevo proyecto.
  obtenerProyectosUsuario,                                  // Obtener proyectos asociados al usuario autenticado.
  obtenerProyectosRecientes,                                // Obtener últimos proyectos (para dashboard admin/líder/auditor).
  actualizarProyectoPorId,                                  // Actualizar proyecto por ID.
  eliminarProyectoPorId,                                    // Eliminar proyecto por ID (devolviendo materiales al inventario).
  registrarUsoDeMaterial,                                   // Registrar uso de materiales en un proyecto.
  obtenerCostoDeMateriales,                                 // Consultar costo de materiales vs presupuesto.
  verificarDisponibilidadDeMateriales,                      // Verificar disponibilidad de materiales.
  exportarProyectoPorIdAPDF,                                // Exportar un proyecto individual a PDF.
  exportarProyectosAPDF,                                    // Exportar todos los proyectos a PDF.
  // Funciones para comentarios y líder de obra
  agregarComentarioAProyecto,                               // Agregar comentario a un proyecto.
  asignarLiderAProyecto,                                    // Asignar líder de obra a un proyecto.
  removerLiderDeProyecto,                                   // Remover líder de obra de un proyecto.
  // Funciones para gestión de adjuntos
  agregarAdjuntosAProyecto,                                 // Agregar archivos adjuntos a un proyecto.
  eliminarAdjuntoDeProyecto,                                // Eliminar archivo adjunto de un proyecto.
  actualizarAdjuntoDeProyecto,                              // Actualizar archivo adjunto de un proyecto.
  // Nuevas funciones para detalle y progreso de proyecto
  obtenerProyectoPorId,                                     // Obtener los detalles de un proyecto por ID.
  obtenerProgresoDeProyecto                                 // Obtener el progreso calculado de un proyecto.
} = require('../controllers/proyecto.controlador');         // Ruta relativa al controlador de proyectos.

// Middlewares de autenticación y autorización
const authMiddleware = require('../../../core/middlewares/autenticacion.middleware'); // Middleware que valida el token JWT y adjunta req.user.
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); // Middleware que restringe acceso según roles permitidos.

// Dependencias para subida de archivos (multer + sistema de archivos)
const multer = require('multer');                            // Librería para manejar uploads multipart/form-data.
const path = require('path');                                // Módulo nativo para trabajar con rutas de archivos.
const fs = require('fs');                                    // Módulo nativo para operaciones sobre el sistema de archivos.

// ====================================================================
// Configuración de almacenamiento para archivos de proyectos (multer)
// ====================================================================

// Configura cómo y dónde se van a guardar los archivos adjuntos de cada proyecto.
// IMPORTANTE: Se alinea con el controlador, que espera rutas del tipo
// "uploads/proyectos/<id>/<archivo>" relativas a BackEnd/src/modules/projects.
const storage = multer.diskStorage({
  // Directorio destino según el ID de proyecto en la URL
  destination: (req, file, cb) => {                          // Función que define la carpeta de destino.
    const projectId = req.params.id;                         // Lee el ID del proyecto desde los parámetros de la ruta.

    // Carpeta final: BackEnd/src/modules/projects/uploads/proyectos/<projectId>
    const uploadPath = path.join(
      __dirname,                                             // BackEnd/src/modules/projects/routes
      '..',                                                  // BackEnd/src/modules/projects
      'uploads',                                             // Subcarpeta "uploads"
      'proyectos',                                           // Subcarpeta "proyectos" (en español, igual que en el controlador).
      projectId                                              // Subcarpeta con el ID del proyecto.
    );

    fs.mkdirSync(uploadPath, { recursive: true });           // Crea la carpeta (y las intermedias) si no existen.
    cb(null, uploadPath);                                    // Devuelve al callback la ruta donde se guardará el archivo.
  },
  // Nombre del archivo físico en disco
  filename: (req, file, cb) => {                             // Función que define el nombre final del archivo.
    const timestamp = Date.now();                            // Marca de tiempo para evitar nombres repetidos.
    const random = Math.round(Math.random() * 1e9);          // Número aleatorio extra para unicidad.
    const ext = path.extname(file.originalname);             // Obtiene la extensión original del archivo (.pdf, .jpg, etc.).
    const safeName = `${timestamp}-${random}${ext}`;         // Construye un nombre seguro con timestamp + random + extensión.
    cb(null, safeName);                                      // Devuelve el nombre de archivo a multer.
  }
});

// Instancia de multer con el storage anterior y límites de tamaño
const upload = multer({
  storage,                                                   // Usa la configuración de almacenamiento definida arriba.
  limits: {
    fileSize: 20 * 1024 * 1024                               // Limita el tamaño máximo a 20 MB por archivo.
  }
});

// ====================================================================
// Rutas generales de proyectos
// ====================================================================

// Obtener todos los proyectos
// Ahora requiere autenticación para poder aplicar las reglas por rol en el controlador:
// - admin / auditor: ven todos.
// - líder de obra: solo proyectos donde es líder.
// - cliente: solo proyectos asociados a su cuenta/email.
router.get(
  '/',                                                        // Endpoint: GET /api/proyectos/
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra', 'cliente', 'auditor']), // Roles permitidos para esta vista general.
  obtenerProyectos                                            // Controlador que devuelve la lista de proyectos filtrada según rol.
);

// Obtener los proyectos más recientes (por fecha de creación)
// Usado para dashboard principal de admin / líder / auditor (no para clientes).
router.get(
  '/recientes',                                               // Endpoint: GET /api/proyectos/recientes
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra', 'auditor']),      // Clientes no deberían ver el resumen global de recientes.
  obtenerProyectosRecientes                                   // Controlador que devuelve los últimos proyectos creados.
);

// Crear nuevo proyecto
// Regla de negocio actual: SOLO el rol admin puede crear proyectos directamente.
// Los líderes de obra deben enviar una solicitud; el controlador también valida esto.
router.post(
  '/crear',                                                   // Endpoint: POST /api/proyectos/crear
  authMiddleware,                                             // Requiere usuario autenticado (valida JWT y rellena req.user).
  authorizeRoles(['admin']),                                  // Solo admin puede crear proyectos.
  crearProyecto                                               // Controlador que crea el proyecto y descuenta materiales del inventario.
);

// ====================================================================
// Rutas de exportación (PDF)
// ====================================================================

// Exportar todos los proyectos a un PDF consolidado.
// Solo admin y auditor (informe ejecutivo de todo el portafolio).
router.get(
  '/exportar/pdf',                                            // Endpoint: GET /api/proyectos/exportar/pdf
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'auditor']),                       // Limita a admin/auditor por sensibilidad de la información.
  exportarProyectosAPDF                                       // Controlador que genera un PDF con el listado de proyectos.
);

// Exportar un proyecto individual a PDF por ID.
// También restringido a admin/auditor por ahora (podemos abrir luego por rol).
router.get(
  '/:id/export-pdf',                                          // Endpoint: GET /api/proyectos/:id/export-pdf
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'auditor']),                       // Solo admin/auditor exportan por ahora.
  exportarProyectoPorIdAPDF                                   // Controlador que genera un PDF con los detalles de un proyecto.
);

// ====================================================================
// Rutas de materiales asociados al proyecto
// ====================================================================

// Registrar uso de material en un proyecto (consumo en obra)
// Admin y líder de obra pueden registrar uso (afecta solo cantidadUtilizada del proyecto).
router.post(
  '/:proyectoId/materiales/uso',                              // Endpoint: POST /api/proyectos/:proyectoId/materiales/uso
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra']),                 // Solo admin o líder de obra pueden registrar uso de materiales.
  registrarUsoDeMaterial                                      // Controlador que actualiza cantidadUtilizada del material en el proyecto.
);

// Obtener costo total de materiales y comparación con presupuesto
// Admin, líder de obra y auditor pueden ver esta información para control de costos.
router.get(
  '/:proyectoId/materiales/costo',                            // Endpoint: GET /api/proyectos/:proyectoId/materiales/costo
  authMiddleware,                                             // Requiere usuario autenticicado.
  authorizeRoles(['admin', 'lider de obra', 'auditor']),      // El auditor también puede revisar costos.
  obtenerCostoDeMateriales                                    // Controlador que calcula el costo y puede generar alertas de presupuesto.
);

// Verificar disponibilidad de materiales vs requerimientos del proyecto
// Admin, líder de obra y auditor validan si el inventario cubre el proyecto.
router.get(
  '/:proyectoId/materiales/disponibilidad',                   // Endpoint: GET /api/proyectos/:proyectoId/materiales/disponibilidad
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra', 'auditor']),      // Auditor con capacidad de revisar inventario.
  verificarDisponibilidadDeMateriales                         // Controlador que compara asignado vs disponible y genera alertas de stock.
);

// ====================================================================
// Ruta para obtener el progreso calculado de un proyecto
// ====================================================================

// Obtener el progreso de un proyecto por ID (usa calcularProgresoProyecto en el controlador).
// El controlador valida el acceso por rol (admin/auditor ven todo; líder/cliente solo lo suyo).
router.get(
  '/:id/progreso',                                            // Endpoint: GET /api/proyectos/:id/progreso
  authMiddleware,                                             // Requiere usuario autenticado.
  obtenerProgresoDeProyecto                                   // Controlador que devuelve { progresoTotal, detalle } para el proyecto.
);

// ====================================================================
// Rutas específicas por usuario (cliente / líder / admin)
// ====================================================================

// Obtener proyectos del usuario autenticado (por email y/o referencia cliente).
// Principalmente para clientes (historial), pero no se restringe por rol aquí:
// el controlador filtra por email/cliente de req.user, así que no expone otros proyectos.
router.get(
  '/mis-proyectos',                                           // Endpoint: GET /api/proyectos/mis-proyectos
  authMiddleware,                                             // Exige usuario autenticado.
  obtenerProyectosUsuario                                     // Controlador que filtra proyectos por el email/id de req.user.
);

// ====================================================================
// Rutas CRUD por ID de proyecto
// ====================================================================

// Obtener un proyecto por ID (detalle completo para modales / vistas)
// El controlador aplica la lógica fina por rol:
// - admin/auditor: cualquier proyecto.
// - líder: solo donde es líder.
// - cliente: solo los asociados a su cuenta/email.
router.get(
  '/:id',                                                     // Endpoint: GET /api/proyectos/:id
  authMiddleware,                                             // Requiere usuario autenticado.
  obtenerProyectoPorId                                        // Controlador que devuelve el detalle del proyecto (materiales, cliente, etc.).
);

// Actualizar proyecto por ID
// Admin y líder de obra pueden actualizar. El control fino de qué
// campos puede editar cada rol se hace dentro de actualizarProyectoPorId.
router.put(
  '/:id',                                                     // Endpoint: PUT /api/proyectos/:id
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra']),                 // Permite solo a admin o líder de obra.
  actualizarProyectoPorId                                     // Controlador que actualiza datos del proyecto y reasigna materiales.
);

// Eliminar un proyecto por ID
// Solo admin y líder de obra, devolviendo materiales al inventario.
router.delete(
  '/:id',                                                     // Endpoint: DELETE /api/proyectos/:id
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra']),                 // Permiso solo para admin o líder de obra.
  eliminarProyectoPorId                                       // Controlador que elimina el proyecto y devuelve materiales al inventario.
);

// ====================================================================
// Rutas para gestión de archivos adjuntos del proyecto
// ====================================================================

// Subir uno o varios archivos a un proyecto
// Campo de formulario: "archivos" (input type="file" multiple)
// Admin y líder de obra pueden adjuntar documentos (actas, planos, etc.).
router.post(
  '/:id/adjuntos',                                            // Endpoint: POST /api/proyectos/:id/adjuntos
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra']),                 // Solo admin o líder de obra pueden adjuntar archivos.
  upload.array('archivos', 10),                               // Usa multer: acepta hasta 10 archivos en el campo "archivos".
  agregarAdjuntosAProyecto                                    // Controlador que registra metadatos y rutas de los archivos.
);

// Actualizar un adjunto (descripción y/o reemplazar archivo)
// Campo de archivo (opcional): "archivo".
router.put(
  '/:id/adjuntos/:adjuntoId',                                 // Endpoint: PUT /api/proyectos/:id/adjuntos/:adjuntoId
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra']),                 // Solo admin o líder de obra pueden modificar adjuntos.
  upload.single('archivo'),                                   // Usa multer: permite un único archivo opcional en el campo "archivo".
  actualizarAdjuntoDeProyecto                                 // Controlador que actualiza descripción y/o reemplaza el archivo físico.
);

// Eliminar un adjunto de un proyecto
// Admin y líder de obra pueden borrar documentos asociados.
router.delete(
  '/:id/adjuntos/:adjuntoId',                                 // Endpoint: DELETE /api/proyectos/:id/adjuntos/:adjuntoId
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra']),                 // Solo admin o líder de obra.
  eliminarAdjuntoDeProyecto                                   // Controlador que elimina el registro y el archivo físico.
);

// ====================================================================
// Rutas para comentarios y asignación de líder
// ====================================================================

// Agregar un comentario a un proyecto
// Solo admin y líder de obra pueden comentar. El cliente ve los comentarios
// en modo lectura desde el frontend.
router.post(
  '/:id/comentarios',                                         // Endpoint: POST /api/proyectos/:id/comentarios
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin', 'lider de obra']),                 // Solo admin/líder pueden crear comentarios.
  agregarComentarioAProyecto                                  // Controlador que agrega el comentario al arreglo comentarios[].
);

// Asignar un líder de obra a un proyecto
// Solo admin puede definir o cambiar el líder.
router.put(
  '/:id/asignar-lider',                                       // Endpoint: PUT /api/proyectos/:id/asignar-lider
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin']),                                  // Solo el rol admin puede asignar líder.
  asignarLiderAProyecto                                       // Controlador que asigna el líder y crea alerta para ese usuario.
);

// Remover líder de un proyecto
// Solo admin puede quitar el líder.
router.put(
  '/:id/remover-lider',                                       // Endpoint: PUT /api/proyectos/:id/remover-lider
  authMiddleware,                                             // Requiere usuario autenticado.
  authorizeRoles(['admin']),                                  // Solo el rol admin puede remover el líder.
  removerLiderDeProyecto                                      // Controlador que limpia el campo lider y genera alerta al líder removido.
);

module.exports = router;                                      // Exporta el router para ser usado en server.js.
