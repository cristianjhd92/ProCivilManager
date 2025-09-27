const express = require('express');
const router = express.Router();
const { submitContactForm, getContacts } = require('../controllers/contactController');

// Enviar formulario de contacto
router.post('/contact', submitContactForm);

// Obtener todos los contactos
router.get('/contact', getContacts);

module.exports = router;
