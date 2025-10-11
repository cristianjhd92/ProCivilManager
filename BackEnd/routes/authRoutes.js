// File: BackEnd/routes/authRoutes.js                                // Ruta y nombre del archivo (nuevo)
// Descripción: Rutas de autenticación con Access JWT + Refresh.      // Propósito del módulo
// - POST /auth/login       → emite access JWT y setea refresh cookie // Login
// - POST /auth/refresh     → rota refresh y emite nuevo access JWT    // Refresh
// - POST /auth/logout      → revoca refresh actual y limpia cookie    // Logout actual
// - POST /auth/logout-all  → revoca todos los refresh del usuario     // Logout global (requiere JWT)

// -----------------------------------------------------------------------------
// Imports                                                                      // Dependencias del router
// -----------------------------------------------------------------------------
const express = require('express');                                            // Framework HTTP
const router  = express.Router();                                              // Instancia del router

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
// (Opcional) Rate limiting                                                      // Protección de fuerza bruta / abuso
// -----------------------------------------------------------------------------
// Si quieres habilitar rate limit con la librería "express-rate-limit":
// 1) Instala: npm i express-rate-limit
// 2) Descomenta el bloque siguiente:
//
// const rateLimit = require('express-rate-limit');                               // Importa el limitador
// const loginWindowMin = Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MIN || 15); // Ventana en minutos
// const loginMax       = Number(process.env.RATE_LIMIT_LOGIN_MAX || 10);        // Máx. intentos por IP/ventana
// const loginLimiter = rateLimit({                                              // Limita /auth/login
//   windowMs: loginWindowMin * 60 * 1000,
//   max: loginMax,
//   standardHeaders: true,                                                      // Devuelve cabeceras RateLimit-*
//   legacyHeaders: false                                                        // No usar X-RateLimit-* antiguas
// });
// const refreshLimiter = rateLimit({                                            // Limita /auth/refresh (más laxo si quieres)
//   windowMs: 15 * 60 * 1000,
//   max: 60,
//   standardHeaders: true,
//   legacyHeaders: false
// });

// -----------------------------------------------------------------------------
// Definición de rutas                                                           // Endpoints públicos/protegidos
// -----------------------------------------------------------------------------

// POST /auth/login → credenciales → access JWT + refresh cookie
// router.post('/login', loginLimiter, login);                                  // Con rate limit (si lo habilitas)
router.post('/login', login);                                                  // Sin rate limit

// POST /auth/refresh → requiere refresh cookie HttpOnly → rota y devuelve nuevo access
// router.post('/refresh', refreshLimiter, refresh);                            // Con rate limit (si lo habilitas)
router.post('/refresh', refresh);                                              // Sin rate limit

// POST /auth/logout → revoca refresh actual (si cookie presente) y limpia cookie
router.post('/logout', logout);                                                // No requiere JWT; opera con la cookie

// POST /auth/logout-all → revoca todos los refresh del usuario (requiere Access JWT)
router.post('/logout-all', authMiddleware, logoutAll);                         // Protegida con JWT

// -----------------------------------------------------------------------------
// Export del router                                                             // Uso en server.js
// -----------------------------------------------------------------------------
module.exports = router;                                                       // Exporta instancia del router
