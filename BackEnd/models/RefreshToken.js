// File: BackEnd/models/RefreshToken.js                          // Ruta y nombre del archivo (actualizado)

// Descripción: Modelo Mongoose para administrar Refresh Tokens   // Propósito del módulo
// - Guarda SOLO el hash (SHA-256) del refresh token              // Seguridad: nunca persistir el token en claro
// - Controla expiración (TTL), revocación y rotación             // Reglas de negocio de sesión
// - Relaciona cada token con un usuario (user ObjectId)          // Dueño del token

const mongoose = require('mongoose');                             // Importa Mongoose (ODM de MongoDB)
const crypto   = require('crypto');                               // Módulo nativo para hashing (SHA-256)

// -----------------------------------------------------------------------------
// Definición del esquema                                                         // Estructura del documento
// -----------------------------------------------------------------------------
const RefreshTokenSchema = new mongoose.Schema(                    // Crea un nuevo Schema
  {                                                                // Inicio de campos
    user: {                                                        // Referencia al usuario dueño del token
      type: mongoose.Schema.Types.ObjectId,                        // Tipo ObjectId de Mongo
      ref: 'User',                                                 // Referencia al modelo 'User'
      required: true,                                              // Obligatorio
      index: true                                                  // Índice para consultas por usuario
    },
    tokenHash: {                                                   // Hash (SHA-256) del refresh token
      type: String,                                                // Guardamos cadena hex del hash
      required: true,                                              // Obligatorio
      unique: true,                                                // Único: no se repiten hashes
      index: true                                                  // Índice para búsqueda rápida por hash
    },
    createdAt: {                                                   // Fecha de creación del token
      type: Date,                                                  // Tipo fecha
      default: Date.now                                            // Por defecto: ahora
    },
    lastUsedAt: {                                                  // Última vez que se usó para refrescar
      type: Date,                                                  // Tipo fecha
      default: null                                                // Nulo hasta su primer uso
    },
    expiresAt: {                                                   // Fecha de expiración (vida útil del token)
      type: Date,                                                  // Tipo fecha
      required: true,                                              // Obligatorio (se fija al emitir)
      index: true                                                  // Índice (además lo usaremos como TTL)
    },
    revokedAt: {                                                   // Marca de revocación (logout/rotación)
      type: Date,                                                  // Tipo fecha
      default: null                                                // Null si no está revocado
    },
    revokedByIp: {                                                 // IP que revocó el token (logout/rotación)
      type: String,                                                // Cadena
      default: null                                                // Null si no se registró
    },
    replacedBy: {                                                  // Si se rota, referencia al nuevo RT
      type: mongoose.Schema.Types.ObjectId,                        // Tipo ObjectId
      ref: 'RefreshToken',                                         // Referencia al mismo modelo
      default: null                                                // Null si no ha sido reemplazado
    },
    createdByIp: {                                                 // IP desde la que se emitió el token
      type: String,                                                // Cadena (almacenamos tal cual)
      default: ''                                                  // Vacío si no se proporciona
    },
    userAgent: {                                                   // User-Agent del cliente que lo emitió
      type: String,                                                // Cadena
      default: ''                                                  // Vacío si no se proporciona
    },

    // --- Compatibilidad hacia atrás (opcional) --------------------------------
    // Si tenías documentos previos con el campo "ip", lo mantenemos para no romper lecturas antiguas.
    ip: {                                                          // (DEPRECATED) IP histórica (no usar en nuevos writes)
      type: String,                                                // Cadena
      default: undefined                                           // Undefined si no existe
    }
  },                                                               // Fin de campos
  {
    collection: 'refresh_tokens',                                  // Nombre explícito de la colección
    versionKey: false                                              // Desactiva __v (opcional)
  }
);                                                                 // Fin del Schema

// -----------------------------------------------------------------------------
// TTL por expiresAt: cuando llega la fecha, Mongo elimina el doc automáticamente // Mantenimiento automático
// -----------------------------------------------------------------------------
RefreshTokenSchema.index(                                          // Crea índice TTL
  { expiresAt: 1 },                                                // Campo a monitorear
  { expireAfterSeconds: 0 }                                        // Expira justo al pasar expiresAt
);                                                                 // Fin índice TTL

// -----------------------------------------------------------------------------
// Método estático para hashear un token en claro (helpers del modelo)            // Utilidad reusable
// -----------------------------------------------------------------------------
RefreshTokenSchema.statics.hashToken = function (plain) {          // Define método estático hashToken
  return crypto                                                   // Usa módulo crypto
    .createHash('sha256')                                         // Algoritmo SHA-256
    .update(String(plain))                                        // Agrega el contenido (token en claro)
    .digest('hex');                                               // Obtiene hash en formato hex
};                                                                 // Fin hashToken

// -----------------------------------------------------------------------------
// Exporta el modelo compilado                                                     // Uso en el resto del proyecto
// -----------------------------------------------------------------------------
module.exports = mongoose.model('RefreshToken', RefreshTokenSchema); // Exporta modelo 'RefreshToken'
