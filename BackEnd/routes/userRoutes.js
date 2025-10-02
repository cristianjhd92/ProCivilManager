// File: BackEnd/routes/userRoutes.js                                             
// Descripción: Rutas de usuarios protegidas con JWT y autorización por roles. 
// - Endpoints públicos: register, login, forgot/reset password
// - Endpoints autenticados: perfil y cambio de password
// - Endpoints administrativos: listar/actualizar/eliminar usuarios con roles

const express = require('express');                                              // Importa express para crear el router
const router = express.Router();                                                 // Crea una instancia de router de Express

// Importa los controladores de usuario                                          // Controladores que contienen la lógica de cada ruta
const {
  register,                                                                      // Controlador para registrar un usuario
  login,                                                                         // Controlador para iniciar sesión
  forgotPassword,                                                                // Controlador para solicitar recuperación de contraseña
  resetPassword,                                                                 // Controlador para restablecer contraseña con token
  getUserProfile,                                                                // Controlador para obtener el perfil del usuario autenticado
  updateUserProfile,                                                             // Controlador para actualizar el perfil del usuario autenticado
  updateUserPassword,                                                            // Controlador para cambiar la contraseña del usuario autenticado
  getAllUsers,                                                                   // Controlador para listar todos los usuarios (administrativo)
  updateUserById,                                                                // Controlador para actualizar un usuario por su id
  deleteUserById                                                                 // Controlador para eliminar un usuario por su id
} = require('../controllers/userController');                                    // Importa desde el archivo de controladores de usuario

// Importa middlewares de autenticación y autorización                           // authMiddleware valida JWT, requireRole limita por rol
const { authMiddleware, requireRole } = require('../middleware/authMiddleware'); // Importa los middlewares

// -----------------------------------------------------------------------------
// Rutas públicas (no requieren autenticación)                                   // Sección de rutas abiertas al público
// -----------------------------------------------------------------------------
router.post('/register', register);                                              // POST /register → registrar usuario
router.post('/login', login);                                                    // POST /login → iniciar sesión y obtener token
router.post('/forgot-password', forgotPassword);                                 // POST /forgot-password → solicitar recuperación
router.post('/reset-password/:token', resetPassword);                            // POST /reset-password/:token → confirmar recuperación

// -----------------------------------------------------------------------------
// Rutas protegidas (requieren autenticación con JWT)                            // Sección de rutas disponibles para usuarios logueados
// -----------------------------------------------------------------------------
router.get('/me', authMiddleware, getUserProfile);                               // GET /me → obtener perfil del usuario autenticado
router.put('/me', authMiddleware, updateUserProfile);                            // PUT /me → actualizar perfil del usuario autenticado
router.put('/me/password', authMiddleware, updateUserPassword);                  // PUT /me/password → cambiar contraseña del usuario autenticado

// -----------------------------------------------------------------------------
// Rutas administrativas (requieren rol autorizado)                              // Sección de rutas restringidas a roles específicos
// Roles sugeridos: 'admin' y 'lider de obra'                                    // Política de roles recomendada
// -----------------------------------------------------------------------------
router.get(                                                                      // GET /users → listar todos los usuarios
  '/users',                                                                      // Endpoint de la ruta
  authMiddleware,                                                                // Requiere autenticación JWT
  requireRole('admin', 'lider de obra'),                                         // Solo admin y líder de obra pueden acceder
  getAllUsers                                                                    // Controlador que lista usuarios
);

router.put(                                                                      // PUT /users/:id → actualizar un usuario completo
  '/users/:id',                                                                  // Endpoint con parámetro id de usuario
  authMiddleware,                                                                // Requiere autenticación JWT
  requireRole('admin', 'lider de obra'),                                         // Solo admin y líder de obra autorizados
  updateUserById                                                                 // Controlador que actualiza el usuario
);

router.patch(                                                                    // PATCH /users/:id → actualización parcial
  '/users/:id',                                                                  // Endpoint con parámetro id de usuario
  authMiddleware,                                                                // Requiere autenticación JWT
  requireRole('admin', 'lider de obra'),                                         // Solo admin y líder de obra autorizados
  updateUserById                                                                 // Controlador que realiza la actualización parcial
);

router.delete(                                                                   // DELETE /users/:id → eliminar un usuario
  '/users/:id',                                                                  // Endpoint con parámetro id de usuario
  authMiddleware,                                                                // Requiere autenticación JWT
  requireRole('admin', 'lider de obra'),                                         // Solo admin y líder de obra autorizados
  deleteUserById                                                                 // Controlador que elimina al usuario
);

module.exports = router;                                                         // Exporta el router para ser usado en el servidor principal
