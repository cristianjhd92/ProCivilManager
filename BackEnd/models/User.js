// File: BackEnd/models/User.js                                                   // Ruta del archivo dentro del proyecto
// Descripción: Esquema de usuarios con normalización de email y un único índice  // Propósito del archivo
// único (con collation ES) definido vía schema.index(). Evita índices duplicados. // Evita duplicidad de índices y refuerza integridad

const mongoose = require('mongoose');                                            // Importa mongoose
const { Schema, model } = mongoose;                                              // Helpers de mongoose

// -----------------------------------------------------------------------------
// Definición del esquema
// -----------------------------------------------------------------------------
const userSchema = new Schema(                                                   // Crea un nuevo Schema
  {
    firstName: {                                                                 // Nombres
      type: String,                                                              // Tipo String
      required: true,                                                            // Obligatorio
      trim: true                                                                 // Recorta espacios
    },
    lastName: {                                                                  // Apellidos
      type: String,                                                              // Tipo String
      required: true,                                                            // Obligatorio
      trim: true                                                                 // Recorta espacios
    },
    email: {                                                                     // Correo electrónico (clave de login)
      type: String,                                                              // Tipo String
      required: true,                                                            // Obligatorio
      // ⚠️ Importante: NO poner unique: true aquí para evitar doble índice       // Evita que Mongoose cree un índice adicional
      lowercase: true,                                                           // Normaliza a minúsculas
      trim: true,                                                                // Recorta espacios
      validate: {                                                                // Validador simple de formato
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),                  // Regex básica de email
        message: 'El email no tiene un formato válido.'                          // Mensaje de error
      }
    },
    phone: {                                                                     // Teléfono (opcional)
      type: String,                                                              // Tipo String
      trim: true                                                                 // Recorta espacios
    },
    password: {                                                                  // Hash de contraseña
      type: String,                                                              // Tipo String
      required: true                                                             // Obligatorio (hash ya generado)
    },
    role: {                                                                      // Rol de usuario
      type: String,                                                              // Tipo String
      enum: ['cliente', 'lider de obra', 'admin'],                               // Valores permitidos
      default: 'cliente',                                                        // Valor por defecto
      index: true                                                                // Índice para filtros por rol
    },
    token: {                                                                     // Token de sesión (si aplica)
      type: String,                                                              // Tipo String
      default: null                                                              // Puede estar vacío
    },
    resetToken: {                                                                // Token de recuperación (opcional)
      type: String,                                                              // Tipo String
      default: null                                                              // Puede estar vacío
    },
    resetTokenExpires: {                                                         // Expiración del token de recuperación
      type: Date,                                                                // Tipo Date
      default: null                                                              // Puede estar vacío
    }
  },
  {
    timestamps: true,                                                            // createdAt / updatedAt automáticos
    versionKey: false                                                            // Oculta __v
  }
);

// -----------------------------------------------------------------------------
// Collation por defecto del esquema (ES, insensible a mayúsculas/acentos)
// -----------------------------------------------------------------------------
userSchema.set('collation', { locale: 'es', strength: 2 });                      // Define collation a nivel de colección

// -----------------------------------------------------------------------------
// Índices (definidos UNA sola vez)
// -----------------------------------------------------------------------------
userSchema.index(                                                                // Define índice único materializado en BD
  { email: 1 },                                                                  // Campo indexado: email ascendente
  { unique: true, collation: { locale: 'es', strength: 2 } }                     // Único + collation ES
);                                                                               // Fin índice de email

// -----------------------------------------------------------------------------
// Hooks (normalización defensiva)
// -----------------------------------------------------------------------------
userSchema.pre('validate', function (next) {                                     // Hook antes de validar
  if (typeof this.email === 'string') {                                          // Si email es String
    this.email = this.email.trim().toLowerCase();                                // Normaliza (trim + lower)
  }
  next();                                                                        // Continúa
});

// -----------------------------------------------------------------------------
// Exportación del modelo
// -----------------------------------------------------------------------------
module.exports = model('User', userSchema);                                      // Exporta el modelo
