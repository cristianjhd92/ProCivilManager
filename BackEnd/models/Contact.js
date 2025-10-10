// File: BackEnd/models/Contact.js                                                // Ruta del archivo dentro del proyecto
// Descripción: Esquema de contactos (leads) con normalización de email,          // Propósito: almacenar mensajes de contacto del sitio
// validaciones de campos, collation ES, timestamps automáticos y dos índices      // Índices: recientes por createdAt y búsqueda por email
// prácticos (createdAt y email).                                                  // Consistencia con convenciones del proyecto

const mongoose = require('mongoose');                                              // Importa mongoose
const { Schema, model } = mongoose;                                                // Desestructura helpers (Schema, model)

// -----------------------------------------------------------------------------
// Definición del esquema
// -----------------------------------------------------------------------------
const ContactSchema = new Schema(                                                  // Crea un nuevo Schema de Contact
  {
    name: {                                                                        // Nombre de quien escribe
      type: String,                                                                // Tipo String
      required: true,                                                              // Obligatorio
      trim: true,                                                                  // Quita espacios extremos
      minlength: 2,                                                                // Mínimo 2 caracteres
      maxlength: 120                                                               // Máximo razonable
    },
    email: {                                                                       // Correo del contacto
      type: String,                                                                // Tipo String
      required: true,                                                              // Obligatorio
      lowercase: true,                                                             // Normaliza a minúsculas
      trim: true,                                                                  // Quita espacios
      validate: {                                                                  // Validador de formato
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),                    // Regex simple de email
        message: 'El email no tiene un formato válido.'                            // Mensaje si falla
      }
    },
    company: {                                                                     // Empresa (opcional)
      type: String,                                                                // Tipo String
      trim: true,                                                                  // Quita espacios
      maxlength: 120,                                                              // Límite razonable
      default: ''                                                                  // Por defecto vacío
    },
    phone: {                                                                       // Teléfono (opcional)
      type: String,                                                                // Tipo String
      trim: true,                                                                  // Quita espacios
      maxlength: 30                                                                // Evita cadenas excesivas
      // Nota: si quieres validar formato específico, podemos poner un regex aquí // Se deja flexible por variedad de formatos
    },
    projectType: {                                                                 // Tipo de proyecto (opcional)
      type: String,                                                                // Tipo String
      enum: ['residencial', 'comercial', 'industrial', 'infraestructura', 'otro'],// Valores permitidos (sin '' vacío)
      default: 'otro'                                                              // Valor por defecto si no especifica
    },
    message: {                                                                     // Mensaje
      type: String,                                                                // Tipo String
      required: true,                                                              // Obligatorio
      trim: true,                                                                  // Quita espacios
      minlength: 10,                                                               // Al menos 10 chars
      maxlength: 1000                                                              // Tope para evitar spam enorme
    }
    // NO definimos createdAt manualmente, lo aporta timestamps (ver opciones)     // Evita duplicar createdAt
  },
  {
    timestamps: true,                                                              // Crea createdAt / updatedAt automáticos
    versionKey: false                                                              // Oculta __v
  }
);

// -----------------------------------------------------------------------------
// Collation por defecto (ES, insensible a mayúsculas/acentos)
// -----------------------------------------------------------------------------
ContactSchema.set('collation', { locale: 'es', strength: 2 });                     // Alineado a resto del proyecto

// -----------------------------------------------------------------------------
// Índices (definidos UNA sola vez)
// -----------------------------------------------------------------------------
ContactSchema.index({ createdAt: -1 });                                            // Acelera listados por recientes
ContactSchema.index(                                                               // Índice por email (no único)
  { email: 1 },                                                                     // Campo email ascendente
  { collation: { locale: 'es', strength: 2 } }                                      // Case-insensitive básica
);

// -----------------------------------------------------------------------------
// Hooks (normalización defensiva)
// -----------------------------------------------------------------------------
ContactSchema.pre('validate', function (next) {                                     // Antes de validar
  if (typeof this.name === 'string') this.name = this.name.trim();                  // Asegura trim en name
  if (typeof this.company === 'string') this.company = this.company.trim();         // Asegura trim en company
  if (typeof this.message === 'string') this.message = this.message.trim();         // Asegura trim en message
  next();                                                                           // Continúa
});

// -----------------------------------------------------------------------------
// Exportación del modelo
// -----------------------------------------------------------------------------
module.exports = model('Contact', ContactSchema);                                   // Exporta el modelo
