// File: BackEnd/routes/userRoutes.js                                             // Ruta del archivo dentro del proyecto
// Descripción: Rutas de usuarios protegidas con JWT y autorización por roles.    // Propósito del router
// - Endpoints públicos: register, login, forgot/reset password                   // Alcance (públicos)
// - Endpoints autenticados: perfil y cambio de password                          // Alcance (autenticados)
// - Endpoints administrativos: listar/actualizar/eliminar usuarios con roles     // Alcance (admin)

// -----------------------------------------------------------------------------
// Imports y setup
// -----------------------------------------------------------------------------
const express = require('express');                                              // Importa express para crear routers HTTP
const router = express.Router();                                                 // Instancia un router modular de Express

// Importa controladores de usuario (lógica de cada endpoint)                    // Reúne handlers en un solo require
const {
  register,                                                                      // Handler: registrar usuario nuevo
  login,                                                                         // Handler: iniciar sesión (devuelve JWT)
  forgotPassword,                                                                // Handler: solicitar email de recuperación
  resetPassword,                                                                 // Handler: restablecer contraseña con token
  getUserProfile,                                                                // Handler: obtener perfil del usuario autenticado
  updateUserProfile,                                                             // Handler: actualizar datos del perfil propio
  updateUserPassword,                                                            // Handler: cambiar contraseña del usuario autenticado
  getAllUsers,                                                                   // Handler: (admin) listar usuarios
  updateUserById,                                                                // Handler: (admin) actualizar usuario por id
  deleteUserById                                                                 // Handler: (admin) eliminar usuario por id
} = require('../controllers/userController');                                    // Carga desde controllers/userController.js

// Importa middlewares de auth/roles                                              // Protegen rutas y restringen por rol
const { authMiddleware, requireRole } = require('../middleware/authMiddleware'); // authMiddleware valida JWT; requireRole valida rol

// -----------------------------------------------------------------------------
// Rutas públicas (no requieren autenticación)
// -----------------------------------------------------------------------------
router.post('/register', register);                                              // POST /api/user/register → crea usuario
router.post('/login', login);                                                    // POST /api/user/login → autentica y retorna token
router.post('/forgot-password', forgotPassword);                                 // POST /api/user/forgot-password → envía correo de reset
router.post('/reset-password/:token', resetPassword);                            // POST /api/user/reset-password/:token → aplica reset

// -----------------------------------------------------------------------------
// Rutas protegidas (requieren autenticación con JWT)
// -----------------------------------------------------------------------------
router.get('/me', authMiddleware, getUserProfile);                               // GET /api/user/me → datos del usuario (sin campos sensibles)
router.put('/me', authMiddleware, updateUserProfile);                            // PUT /api/user/me → actualiza nombre, email, phone, etc.
router.put('/me/password', authMiddleware, updateUserPassword);                  // PUT /api/user/me/password → cambia la contraseña

// -----------------------------------------------------------------------------
// Rutas administrativas (requieren rol autorizado)
// Sugerido: 'admin' y 'lider de obra'                                           // Política de acceso por roles
// -----------------------------------------------------------------------------
router.get(                                                                      // GET /api/user/users → lista usuarios
  '/users',                                                                      // Path del endpoint
  authMiddleware,                                                                // Requiere JWT válido
  requireRole('admin', 'lider de obra'),                                         // Solo roles permitidos
  getAllUsers                                                                    // Handler que devuelve la lista
);

router.put(                                                                      // PUT /api/user/users/:id → reemplazo/actualización completa
  '/users/:id',                                                                  // Path con parámetro de ruta :id
  authMiddleware,                                                                // Requiere JWT válido
  requireRole('admin', 'lider de obra'),                                         // Solo roles permitidos
  updateUserById                                                                 // Handler que actualiza el usuario destino
);

router.patch(                                                                    // PATCH /api/user/users/:id → actualización parcial
  '/users/:id',                                                                  // Path con parámetro :id
  authMiddleware,                                                                // Requiere JWT válido
  requireRole('admin', 'lider de obra'),                                         // Solo roles permitidos
  updateUserById                                                                 // Reusa el mismo handler (admite parches)
);

router.delete(                                                                   // DELETE /api/user/users/:id → elimina usuario
  '/users/:id',                                                                  // Path con parámetro :id
  authMiddleware,                                                                // Requiere JWT válido
  requireRole('admin', 'lider de obra'),                                         // Solo roles permitidos
  deleteUserById                                                                 // Handler que elimina al usuario
);

// -----------------------------------------------------------------------------
// Exportación del router
// -----------------------------------------------------------------------------
module.exports = router;                                                         // Exporta para montarlo en server.js (prefijo /api/user)
