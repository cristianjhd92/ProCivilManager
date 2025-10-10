// File: BackEnd/controllers/contactController.js                                   // Ruta del archivo dentro del proyecto
// Descripción: Controlador para recepción/listado de formularios de contacto.      // Propósito general
// - Valida entrada (name/email/message), normaliza email, limita tamaños.          // Reglas de validación
// - projectType se valida/normaliza según enum del Schema (fallback a 'otro').     // Consistencia con el modelo
// - Envía notificación por email sin bloquear la creación del registro.            // Experiencia robusta

const Contact = require('../models/Contact');                                      // Importa el modelo Contact
const { sendContactNotification } = require('../services/ServiceEmail');           // Servicio de email (notificación)

// -----------------------------------------------------------------------------
// Helpers                                                                       // Utilidades locales
// -----------------------------------------------------------------------------
const isValidEmail = (email) =>                                                    // Valida formato básico de email
  /^[\w.-]+@[\w.-]+\.\w+$/.test(String(email));                                    // Regex simple (usuario@dominio.tld)

// Lee los valores válidos del enum directamente del Schema para no desalinearnos  // Fuente de la verdad
const ALLOWED_TYPES = Contact.schema.path('projectType')?.enumValues || [];        // p.ej. ['residencial','comercial','industrial','infraestructura','otro']

// Normaliza projectType (lower/trim); si no es válido, regresa 'otro'             // Fallback seguro
const normalizeProjectType = (t) => {                                              // Función de normalización
  const v = (t == null ? '' : String(t)).trim().toLowerCase();                     // Convierte y sanea
  return ALLOWED_TYPES.includes(v) ? v : 'otro';                                   // Valida contra enum, fallback
};                                                                                 // Cierra normalizeProjectType

// -----------------------------------------------------------------------------
// POST /contact — Guardar envío del formulario y notificar por email             // Crear contacto (lead)
// -----------------------------------------------------------------------------
exports.submitContactForm = async (req, res) => {                                  // Handler principal de envío
  try {                                                                            // Manejo de errores
    const { name, email, message, company, phone, projectType } = req.body;        // Extrae campos del body

    // ----- Validaciones de presencia y formato --------------------------------
    if (!name || !email || !message) {                                             // name/email/message obligatorios
      return res.status(400).json({ error: 'Nombre, email y mensaje son obligatorios.' }); // 400 si faltan
    }                                                                              // Fin if presencia

    if (typeof name !== 'string' || name.trim().length < 2) {                      // Nombre mínimo 2 chars
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' }); // 400 si inválido
    }                                                                              // Fin if name

    if (!isValidEmail(email)) {                                                    // Email con formato válido
      return res.status(400).json({ error: 'Correo electrónico inválido.' });      // 400 si formato inválido
    }                                                                              // Fin if email

    if (typeof message !== 'string' || message.trim().length < 10) {               // Mensaje mínimo 10 chars
      return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres.' }); // 400 si corto
    }                                                                              // Fin if message min

    if (message.length > 1000) {                                                   // Límite superior anti-spam
      return res.status(400).json({ error: 'El mensaje no puede superar los 1000 caracteres.' }); // 400 si largo
    }                                                                              // Fin if message max

    // ----- Normalizaciones -----------------------------------------------------
    const normalizedEmail = String(email).trim().toLowerCase();                    // Email lower+trim
    const normalizedName = String(name).trim();                                     // Name trim
    const normalizedMessage = String(message).trim();                               // Message trim
    const normalizedCompany = company ? String(company).trim() : '';                // Company opcional trim
    const normalizedPhone = phone ? String(phone).trim() : '';                      // Phone opcional trim
    const normalizedType = normalizeProjectType(projectType);                       // projectType validado/normalizado

    // ----- Construcción y persistencia -----------------------------------------
    const contact = new Contact({                                                   // Crea documento Contact
      name: normalizedName,                                                         // Nombre saneado
      email: normalizedEmail,                                                       // Email saneado
      message: normalizedMessage,                                                   // Mensaje saneado
      company: normalizedCompany,                                                   // Empresa (opcional)
      phone: normalizedPhone,                                                       // Teléfono (opcional)
      projectType: normalizedType                                                   // Tipo (enum + fallback)
    });                                                                             // Cierra new Contact

    await contact.save();                                                           // Guarda en MongoDB

    // ----- Notificación por email (no bloqueante) ------------------------------
    try {                                                                           // Intenta enviar correo
      await sendContactNotification(contact);                                       // Llama servicio de notificación
    } catch (notifyErr) {                                                           // Si falla, no bloquea
      console.warn('Advertencia: fallo en sendContactNotification:', notifyErr);    // Log de advertencia
    }                                                                              // Fin catch notificación

    return res.status(201).json({ message: 'Formulario enviado correctamente' });   // 201 OK
  } catch (error) {                                                                 // Captura errores no previstos
    console.error('Error en submitContactForm:', error);                            // Log técnico
    return res.status(500).json({ error: 'Error al enviar el formulario' });        // 500 genérico
  }                                                                                 // Fin catch
};                                                                                  // Fin submitContactForm

// -----------------------------------------------------------------------------
// GET /contact — Listar contactos (más recientes primero)                        // Lectura de leads
// -----------------------------------------------------------------------------
exports.getContacts = async (req, res) => {                                        // Handler de listado
  try {                                                                            // Manejo de errores
    const contacts = await Contact                                                 // Consulta en Contact
      .find()                                                                      // Sin filtro (puede agregarse paginación)
      .sort({ createdAt: -1 });                                                    // Recientes primero (usa índice)
    return res.status(200).json(contacts);                                         // 200 con resultados
  } catch (error) {                                                                // Captura de errores
    console.error('Error al obtener contactos:', error);                           // Log técnico
    return res.status(500).json({ error: 'Error al obtener contactos' });          // 500 genérico
  }                                                                                // Fin catch
};                                                                                 // Fin getContacts
