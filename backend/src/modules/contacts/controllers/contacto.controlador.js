// File: BackEnd/src/modules/contacts/controllers/contacto.controlador.js
// Description: Controlador para gestionar el formulario de contacto de ProCivil Manager (PCM).
//              Permite recibir y validar los datos enviados desde el frontend, guardar el
//              mensaje en la colección "contactos" y disparar una notificación por correo
//              al equipo PCM. Incluye también un endpoint para listar los contactos.

// Importa el modelo Contacto, que representa cada mensaje del formulario en MongoDB.
const Contacto = require('../models/contacto.modelo'); // Modelo Mongoose para la colección de contactos

// Importa el servicio encargado de enviar correos de notificación.
const {
  sendContactNotification: enviarNotificacionContacto, // Alias en español para el servicio de email
} = require('../../../core/services/correo.servicio'); // Servicio de email encargado de enviar notificaciones

/**
 * Función auxiliar para validar el formato de correo electrónico.
 * Debe mantenerse coherente con la validación definida en el modelo Contacto.
 *
 * @param {string} correo - Correo electrónico a validar.
 * @returns {boolean} true si el correo cumple el patrón básico, false en caso contrario.
 */
const esCorreoValido = (correo) => {
  // Regex simple que verifica que haya texto antes y después de "@",
  // y un dominio con punto. No es perfecta, pero evita la mayoría de errores.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
};

/**
 * Controlador para procesar el envío del formulario de contacto.
 *
 * Flujo:
 *  1. Extrae los campos del body (nombre, correo, mensaje, empresa, telefono, tipoProyecto).
 *  2. Realiza validaciones básicas en backend (longitudes mínimas, formato de correo, etc.).
 *  3. Crea una instancia de Contacto y la guarda en MongoDB.
 *  4. Intenta enviar un correo de notificación (si el servicio está implementado).
 *  5. Devuelve respuesta 201 si todo va bien, o errores 400/500 según el caso.
 */
exports.enviarFormularioContacto = async (req, res) => {
  try {
    // Extrae los campos enviados desde el frontend (JSON en el body).
    const {
      nombre,        // Nombre de la persona que contacta
      correo,        // Correo electrónico
      mensaje,       // Mensaje principal
      empresa,       // Empresa (opcional)
      telefono,      // Teléfono (opcional)
      tipoProyecto,  // Tipo de proyecto (opcional)
    } = req.body;

    // 🔎 Validación básica en el controlador (antes de tocar la base de datos):

    // Verificar que los campos obligatorios estén presentes
    if (!nombre || !correo || !mensaje) {
      return res
        .status(400)
        .json({ error: 'Nombre, correo y mensaje son obligatorios.' });
    }

    // El nombre debe ser string y tener al menos 2 caracteres reales (trim)
    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res
        .status(400)
        .json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }

    // Validar que el correo sea string y cumpla el patrón básico
    if (typeof correo !== 'string' || !esCorreoValido(correo.trim())) {
      return res
        .status(400)
        .json({ error: 'Correo electrónico inválido.' });
    }

    // El mensaje debe ser string y tener al menos 10 caracteres útiles
    if (typeof mensaje !== 'string' || mensaje.trim().length < 10) {
      return res
        .status(400)
        .json({ error: 'El mensaje debe tener al menos 10 caracteres.' });
    }

    // Validar longitud máxima de mensaje (lado backend, además del modelo)
    if (mensaje.length > 1000) {
      return res
        .status(400)
        .json({ error: 'El mensaje no puede superar los 1000 caracteres.' });
    }

    // 🧹 Normalización de campos opcionales:
    const empresaNormalizada =
      typeof empresa === 'string' ? empresa.trim() : '';
    const telefonoNormalizado =
      typeof telefono === 'string' ? telefono.trim() : '';
    const tipoProyectoNormalizado =
      typeof tipoProyecto === 'string' ? tipoProyecto.trim() : '';

    // Crear instancia del modelo Contacto con todos los campos recibidos
    const contacto = new Contacto({
      nombre: nombre.trim(),                   // Nombre sin espacios al inicio/fin
      correo: correo.trim(),                   // Correo limpio (el modelo aplica lowercase)
      mensaje: mensaje.trim(),                 // Mensaje sin espacios sobrantes
      empresa: empresaNormalizada,             // Empresa opcional ya normalizada
      telefono: telefonoNormalizado,           // Teléfono opcional ya normalizado
      tipoProyecto: tipoProyectoNormalizado,   // Tipo de proyecto opcional normalizado
    });

    // Guardar el documento en la base de datos (puede lanzar errores de validación Mongoose)
    await contacto.save();

    // Intentar enviar una notificación por correo. Si falla, se LOGUEA pero
    // no se revierte ni se cambia la respuesta al cliente (el mensaje ya está guardado).
    try {
      if (typeof enviarNotificacionContacto === 'function') {
        await enviarNotificacionContacto(contacto);
      }
    } catch (emailError) {
      // Log en servidor para diagnóstico. No se envía error al cliente.
      console.error(
        'Error al enviar la notificación de contacto:',
        emailError
      );
    }

    // Respuesta de éxito al frontend
    res
      .status(201) // Código 201: creado correctamente
      .json({ message: 'Formulario enviado con éxito.' });
  } catch (error) {
    // Log amplio en consola para poder depurar problemas en el servidor
    console.error('Error en enviarFormularioContacto:', error);

    // Si el error viene de Mongoose por validación de esquema, respondemos 400 (petición inválida)
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error:
          'Los datos enviados no son válidos. Verifica la información e inténtalo de nuevo.',
      });
    }

    // Cualquier otro error inesperado se reporta como 500 (error interno)
    res
      .status(500)
      .json({ error: 'Error al enviar el formulario' });
  }
};

/**
 * Controlador para obtener todos los contactos almacenados.
 *
 * Nota:
 *  - Es recomendable proteger esta ruta con autenticación y rol "admin"
 *    desde el archivo de rutas (contacto.rutas.js), ya que contiene datos
 *    sensibles como correos y teléfonos.
 *
 * Flujo:
 *  1. Consulta todos los documentos de Contacto.
 *  2. Ordena por createdAt descendente (más recientes primero).
 *  3. Devuelve el arreglo de contactos en JSON.
 */
exports.obtenerContactos = async (req, res) => {
  try {
    // Consulta a la colección de contactos y ordena por fecha de creación
    const contactos = await Contacto.find().sort({ createdAt: -1 });

    // Respuesta de éxito con la lista de contactos
    res.status(200).json(contactos);
  } catch (error) {
    // Log de error para diagnóstico en consola
    console.error('Error al obtener contactos:', error);

    // Respuesta genérica al cliente
    res
      .status(500)
      .json({ error: 'Error al obtener contactos' });
  }
};
