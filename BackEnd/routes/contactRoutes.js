// File: BackEnd/routes/contactRoutes.js                                         // Ruta exacta (coincide con server.js -> app.use('/api', contactRoutes))
// Descripción: Rutas de contacto (leads). POST público para recibir mensajes     // Propósito del módulo
// desde el sitio y GET protegido para listar contactos en el panel interno.      // Política de acceso

// -----------------------------------------------------------------------------
// Imports y setup                                                                // Dependencias y creación del router
// -----------------------------------------------------------------------------
const express = require('express');                                               // Importa Express
const router = express.Router();                                                  // Instancia un Router

// Controladores                                                                 // Lógica de cada endpoint
const {
  submitContactForm,                                                              // POST /contact → recibe y persiste lead
  getContacts                                                                     // GET /contact  → lista leads (protegido)
} = require('../controllers/contactController');                                  // Importa controladores

// Middlewares de seguridad                                                       // Autenticación/autorización
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');  // JWT + roles

// -----------------------------------------------------------------------------
// POST /contact — Recibir formulario de contacto (público)                       // Público para que el sitio pueda enviar
// Montado en server.js bajo /api → ruta final: POST /api/contact                 // Documentación de la ruta efectiva
// -----------------------------------------------------------------------------
router.post(                                                                      // Define ruta POST
  '/contact',                                                                     // Endpoint relativo
  submitContactForm                                                               // Handler que valida, guarda y notifica
);                                                                                // Fin POST /contact

// -----------------------------------------------------------------------------
// GET /contact — Listar todos los contactos (protegido)                          // Solo staff autorizado
// Requiere: JWT válido + rol 'admin' o 'lider de obra'                           // Política de acceso
// Ruta final (según server.js): GET /api/contact                                 // Documentación de la ruta efectiva
// -----------------------------------------------------------------------------
router.get(                                                                       // Define ruta GET
  '/contact',                                                                     // Endpoint relativo
  authMiddleware,                                                                 // Verifica y decodifica JWT → req.user
  requireRole('admin', 'lider de obra'),                                          // Limita acceso a roles autorizados
  getContacts                                                                     // Handler que retorna los leads ordenados
);                                                                                // Fin GET /contact

// -----------------------------------------------------------------------------
// Exportación                                                                     // Para ser usado en server.js
// -----------------------------------------------------------------------------
module.exports = router;                                                          // Exporta el router
