const Contact = require('../models/Contact');
const { sendContactNotification } = require('../services/ServiceEmail');

// Función para validar formato de correo
const isValidEmail = (email) => {
  return /^[\w.-]+@[\w.-]+\.\w+$/.test(email);
};

exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, message, company, phone, projectType } = req.body;

    // Validación básica
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nombre, email y mensaje son obligatorios.' });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }

    if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(email)) {
      return res.status(400).json({ error: 'Correo electrónico inválido.' });
    }

    if (typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres.' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'El mensaje no puede superar los 1000 caracteres.' });
    }

    // Crear y guardar contacto con todos los campos
    const contact = new Contact({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      company: company?.trim() || '',
      phone: phone?.trim() || '',
      projectType: projectType || ''
    });

    await contact.save();

    // Enviar notificación por email (si lo tienes implementado)
    await sendContactNotification(contact);

    res.status(201).json({ message: 'Formulario enviado correctamente' });
  } catch (error) {
    console.error('Error en submitContactForm:', error);
    res.status(500).json({ error: 'Error al enviar el formulario' });
  }
};

// Obtener todos los contactos
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }); // los más recientes primero
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({ error: 'Error al obtener contactos' });
  }
};
