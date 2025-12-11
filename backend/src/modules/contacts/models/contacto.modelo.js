// File: BackEnd/src/modules/contacts/models/contacto.modelo.js
// Description: Modelo de Mongoose para almacenar los mensajes del formulario
//              de contacto de ProCivil Manager (PCM). Permite registrar datos
//              básicos del remitente (nombre, correo, empresa, teléfono),
//              el tipo de proyecto de interés y el mensaje enviado.

// Importa Mongoose para definir el esquema y el modelo.
const mongoose = require('mongoose');                        // ORM para MongoDB (manejo de esquemas y modelos)
const { Schema, model } = mongoose;                          // Extrae Schema y model para escribir más limpio

/**
 * Definición del esquema de contacto.
 * Cada documento representa un mensaje enviado desde el formulario de contacto.
 */
const ContactoSchema = new Schema(
  {
    // Nombre de la persona que envía el mensaje.
    nombre: {
      type: String,                                          // Tipo texto
      required: true,                                        // Obligatorio
      minlength: 2,                                          // Mínimo 2 caracteres
      trim: true                                             // Elimina espacios al inicio y al final
    },

    // Correo electrónico de contacto.
    correo: {
      type: String,                                          // Tipo texto (email en formato string)
      required: true,                                        // Obligatorio
      trim: true,                                            // Limpia espacios sobrantes
      lowercase: true,                                       // Almacena siempre en minúsculas
      // Validación básica de formato de correo electrónico.
      validate: {
        validator: function (valor) {
          // Regex simple para validar estructura general del email.
          // No es perfecta, pero evita la mayoría de errores de tipeo.
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
        },
        message: 'El correo electrónico no tiene un formato válido.'
      }
    },

    // Nombre de la empresa (opcional).
    empresa: {
      type: String,                                          // Texto libre
      trim: true                                             // Quita espacios al inicio y final
    },

    // Teléfono de contacto (opcional).
    telefono: {
      type: String,                                          // Se guarda como string para permitir ceros iniciales, "+", etc.
      trim: true,                                            // Elimina espacios alrededor
      // Validación opcional muy ligera para teléfono:
      // - Permite dígitos, espacios, guiones y el símbolo "+"
      // - No aplica si el campo está vacío (campo opcional)
      validate: {
        validator: function (valor) {
          if (!valor) return true;                           // Si no se envía teléfono, no se valida nada
          return /^[0-9+\-\s]{6,20}$/.test(valor);
        },
        message: 'El teléfono solo puede contener dígitos, espacios, guiones y el símbolo +.'
      }
    },

    // Tipo de proyecto en el que está interesado el contacto.
    tipoProyecto: {
      type: String,                                          // Tipo texto
      // Lista de valores permitidos:
      // - residencial, comercial, industrial, infraestructura
      // - '' (cadena vacía) cuando el usuario no especifica tipo de proyecto
      enum: ['residencial', 'comercial', 'industrial', 'infraestructura', ''],
      default: ''                                            // Por defecto: sin especificar
    },

    // Mensaje enviado por el usuario.
    mensaje: {
      type: String,                                          // Texto libre con límites de tamaño
      required: true,                                        // Obligatorio
      minlength: 10,                                         // Al menos 10 caracteres (evita mensajes demasiado cortos)
      maxlength: 1000,                                       // Máximo 1000 caracteres (control de tamaño)
      trim: true                                             // Limpia espacios al inicio y final
    }
  },
  {
    // timestamps: true añade automáticamente:
    //  - createdAt: fecha/hora de creación del registro
    //  - updatedAt: fecha/hora de última actualización
    timestamps: true
  }
);

/**
 * Exporta el modelo "Contacto" basado en el esquema ContactoSchema.
 * La colección en MongoDB se llamará "contactos" (Mongoose pluraliza automáticamente).
 */
module.exports = model('Contacto', ContactoSchema);          // Exporta el modelo para usarlo en controladores
