// File: BackEnd/src/modules/contacts/routes/contacto.rutas.js
// Description: Rutas para gestionar el formulario de contacto y la consulta de
//              mensajes recibidos en ProCivil Manager (PCM). El envío del
//              formulario es público y la lectura de contactos está restringida
//              a usuarios con rol "admin".

// Importa Express para crear un enrutador (router) modular.
const express = require('express');                            // Trae el módulo express
const router = express.Router();                               // Crea una instancia de router

// Importa los controladores que manejan la lógica de negocio de contacto.
const {
  enviarFormularioContacto,                                    // Controlador para recibir el formulario de contacto
  obtenerContactos                                             // Controlador para listar los contactos guardados
} = require('../controllers/contacto.controlador');

// Importa el middleware de autenticación (verifica JWT y añade req.user).
const auth = require('../../../core/middlewares/autenticacion.middleware');           // Middleware para autenticar al usuario

// Importa el middleware de autorización por roles.
const authorizeRoles = require('../../../core/middlewares/autorizarRoles.middleware'); // Middleware para restringir por rol (admin, etc.)

/**
 * RUTA: POST /api/contacto
 * Descripción:
 *  - Recibe los datos del formulario de contacto desde el frontend público.
 *  - NO requiere autenticación: cualquier visitante puede enviar un mensaje.
 *  - La lógica de validación y guardado está en enviarFormularioContacto.
 */
router.post(
  '/contacto',                                                 // URL del endpoint relativo a /api
  enviarFormularioContacto                                     // Controlador que procesa y guarda el formulario
);

/**
 * RUTA: GET /api/contact
 * Descripción:
 *  - Devuelve la lista de contactos almacenados en la BD.
 *  - Esta información es sensible (correos, teléfonos, mensajes), por lo que
 *    se restringe únicamente a usuarios autenticados con rol "admin".
 */
router.get(
  '/contact',                                                  // URL del endpoint relativo a /api
  auth,                                                        // Primero valida el JWT y carga req.user
  authorizeRoles(['admin']),                                   // Solo permite acceso a usuarios con rol 'admin'
  obtenerContactos                                             // Controlador que consulta y devuelve los contactos
);

// Exporta el router para que server.js pueda montarlo bajo el prefijo /api.
module.exports = router;                                       // Exporta el router en formato CommonJS
