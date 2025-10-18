// File: BackEnd/routes/authRoutes.js                                // Ruta y nombre del archivo
// Descripción: Rutas de autenticación con Access JWT + Refresh.      // Propósito del módulo
// - POST /auth/login       → emite access JWT y setea refresh cookie // Login
// - POST /auth/refresh     → rota refresh y emite nuevo access JWT    // Refresh
// - POST /auth/logout      → revoca refresh actual y limpia cookie    // Logout
// - POST /auth/logout-all  → revoca todos los refresh del usuario     // Logout global (requiere JWT)

// -----------------------------------------------------------------------------
// Imports                                                                      // Dependencias del router
// -----------------------------------------------------------------------------
const express = require('express');                                            // Framework HTTP
const router  = express.Router();                                              // Instancia del router

// ✅ Limiters centralizados (IP + usuario) para /auth/login
const { loginIpLimiter, loginUserLimiter } = require('../middleware/rateLimit');

// Controladores (handlers)                                                     // Lógica de cada endpoint
const {
  login,                                                                       // Handler de login
  refresh,                                                                     // Handler de refresh
  logout,                                                                      // Handler de logout actual
  logoutAll                                                                    // Handler de logout global (todas las sesiones)
} = require('../controllers/authController');                                  // Importa desde controllers/authController

// Middleware de autenticación                                                  // Para proteger /logout-all
const { authMiddleware } = require('../middleware/authMiddleware');            // Valida Access JWT en Authorization

// -----------------------------------------------------------------------------
// Definición de rutas                                                           // Endpoints públicos/protegidos
// -----------------------------------------------------------------------------

// POST /auth/login → credenciales → access JWT + refresh cookie
router.post('/login', loginIpLimiter, loginUserLimiter, login);                // ✅ Rate limit (3 intentos/ventana) aplicado

// POST /auth/refresh → requiere refresh cookie HttpOnly → rota y devuelve nuevo access
router.post('/refresh', refresh);                                              // Sin rate limit (o define uno suave si quieres)

// POST /auth/logout → revoca refresh actual (si cookie presente) y limpia cookie
router.post('/logout', logout);                                                // No requiere JWT; opera con la cookie

// POST /auth/logout-all → revoca todos los refresh del usuario (requiere Access JWT)
router.post('/logout-all', authMiddleware, logoutAll);                         // Protegida con JWT

// -----------------------------------------------------------------------------
// Export del router                                                             // Uso en server.js
// -----------------------------------------------------------------------------
module.exports = router;                                                       // Exporta instancia del router
