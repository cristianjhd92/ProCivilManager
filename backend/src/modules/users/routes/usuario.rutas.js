// File: BackEnd/src/modules/users/routes/usuario.rutas.js
// Description: Rutas HTTP para gestionar usuarios: registro, login,
//              recuperación y reseteo de contraseña, perfil del usuario
//              autenticado y operaciones administrativas de listado,
//              actualización y eliminación lógica de usuarios, así como
//              obtención de clientes activos para autocompletar en
//              formularios de proyectos.

// =======================
// Importaciones básicas
// =======================
const express = require('express');                               // Importa Express para crear el router HTTP.
const router = express.Router();                                  // Crea una instancia de Router para agrupar las rutas de usuario.

// Importa las funciones del controlador de usuarios
const {
  register,                                                       // Controlador para registrar un nuevo usuario.
  login,                                                          // Controlador para iniciar sesión.
  forgotPassword,                                                 // Controlador para solicitar recuperación de contraseña.
  resetPassword,                                                  // Controlador para aplicar un reset de contraseña con token.
  getUserProfile,                                                 // Controlador para obtener el perfil del usuario autenticado.
  updateUserProfile,                                              // Controlador para actualizar los datos del perfil.
  updateUserPassword,                                             // Controlador para cambiar la contraseña desde el perfil.
  getAllUsers,                                                    // Controlador para listar usuarios (uso admin).
  updateUserById,                                                 // Controlador para actualizar un usuario por ID (admin).
  deleteUserById,                                                 // Controlador para eliminar lógicamente un usuario por ID (admin).
  obtenerClientesActivos                                          // 🆕 Controlador para listar clientes activos (autocomplete).
} = require('../controllers/usuario.controlador');

// Middlewares de autenticación y autorización
const auth = require('../../../core/middlewares/autenticacion.middleware');           // Middleware que valida el JWT y rellena req.user.
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); // Middleware que restringe el acceso por roles (admin, líder, cliente).

// ================================================================
// RUTAS PÚBLICAS (NO REQUIEREN TOKEN)
// ================================================================

// Registro de usuario
// Ejemplo: POST /api/auth/register
router.post(
  '/register',                                                    // Endpoint público para crear un nuevo usuario.
  register                                                        // Llama al controlador de registro.
);

// Inicio de sesión
// Ejemplo: POST /api/auth/login
router.post(
  '/login',                                                       // Endpoint público para iniciar sesión.
  login                                                           // Llama al controlador de login.
);

// Solicitar recuperación de contraseña
// Ejemplo: POST /api/auth/forgot-password
router.post(
  '/forgot-password',                                             // Endpoint público para solicitar correo de recuperación.
  forgotPassword                                                  // Llama al controlador que genera token de reset y envía el correo.
);

// Aplicar reset de contraseña usando un token recibido por correo
// Ejemplo: POST /api/auth/reset-password/:token
router.post(
  '/reset-password/:token',                                       // Endpoint público para aplicar el cambio de contraseña con token.
  resetPassword                                                   // Llama al controlador que valida token y actualiza contraseña.
);

// ================================================================
// RUTAS PROTEGIDAS PARA EL USUARIO AUTENTICADO
// (requieren JWT válido a través de auth middleware)
// ================================================================

// Obtener perfil del usuario autenticado
// Ejemplo: GET /api/auth/me
router.get(
  '/me',                                                          // Ruta para obtener la información del usuario logueado.
  auth,                                                           // Primero: valida el token y rellena req.user.
  getUserProfile                                                  // Segundo: devuelve el perfil desde el controlador.
);

// Actualizar perfil del usuario autenticado
// Ejemplo: PUT /api/auth/me
router.put(
  '/me',                                                          // Ruta para actualizar datos del perfil (nombre, email, teléfono).
  auth,                                                           // Requiere usuario autenticado.
  updateUserProfile                                               // Controlador que aplica los cambios.
);

// Cambiar contraseña desde el perfil
// Ejemplo: PUT /api/auth/me/password
router.put(
  '/me/password',                                                 // Ruta para que el usuario cambie su propia contraseña.
  auth,                                                           // Requiere usuario autenticado.
  updateUserPassword                                              // Controlador que valida contraseña actual y guarda la nueva.
);

// ================================================================
// RUTAS ADMINISTRATIVAS DE GESTIÓN DE USUARIOS
// (solo accesibles para rol 'admin')
// ================================================================

// Listar usuarios con paginación, búsqueda y filtro por rol
// Ejemplo: GET /api/auth/users?page=1&limit=10&search=texto&role=cliente
router.get(
  '/users',                                                       // Ruta para obtener listado de usuarios.
  auth,                                                           // Requiere usuario autenticado.
  authorizeRoles(['admin']),                                      // Solo rol admin puede acceder a esta ruta.
  getAllUsers                                                     // Controlador que devuelve la lista paginada.
);

// 🆕 Obtener clientes activos para autocompletar "correo del cliente" en proyectos
// Ejemplo: GET /api/auth/users/clientes-activos?search=torres
// - Devuelve solo usuarios con rol 'cliente', activos y no eliminados.
// - Permite filtrar por nombre, apellido o correo usando el query param "search".
router.get(
  '/users/clientes-activos',                                      // Ruta para alimentar el autocomplete de clientes.
  auth,                                                           // Requiere usuario autenticado.
  authorizeRoles(['admin']),                                      // Solo admin crea proyectos, así que solo él necesita esta lista.
  obtenerClientesActivos                                          // Controlador que devuelve el listado de clientes activos.
);

// Actualizar usuario por ID (operación de administración)
// Ejemplo: PUT /api/auth/users/64f1c2...
router.put(
  '/users/:id',                                                   // Ruta con parámetro :id del usuario a actualizar.
  auth,                                                           // Requiere usuario autenticado.
  authorizeRoles(['admin']),                                      // Solo admin puede modificar usuarios.
  updateUserById                                                  // Controlador que aplica cambios de datos y rol.
);

// Eliminar usuario por ID (eliminación lógica)
// Ejemplo: DELETE /api/auth/users/64f1c2...
router.delete(
  '/users/:id',                                                   // Ruta con parámetro :id del usuario a eliminar lógicamente.
  auth,                                                           // Requiere usuario autenticado.
  authorizeRoles(['admin']),                                      // Solo admin puede eliminar usuarios.
  deleteUserById                                                  // Controlador que marca isDeleted=true y aplica reglas de último admin.
);

// Exporta el router para montarlo en server.js.
// Ejemplo de uso:
//   const userRoutesPath = './src/modules/users/routes/usuario.rutas';
//   app.use('/api/auth', require(userRoutesPath));
module.exports = router;                                          // Deja disponible el router para ser utilizado en la app principal.
