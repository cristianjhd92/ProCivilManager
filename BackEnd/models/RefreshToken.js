// File: BackEnd/models/RefreshToken.js                          // Ruta del archivo
// Descripción: Modelo Mongoose para Refresh Tokens               // Guarda SOLO hash, controla TTL y revocación

'use strict';                                                    // Modo estricto

const mongoose = require('mongoose');                            // ODM para MongoDB
const crypto   = require('crypto');                              // Módulo nativo para hashing (SHA-256)

// -----------------------------------------------------------------------------
// Definición del esquema
// -----------------------------------------------------------------------------
const RefreshTokenSchema = new mongoose.Schema(                  // Crea nuevo Schema para refresh_tokens
  {                                                              // Inicio de definición de campos
    user: {                                                      // Dueño del token (FK → User._id)
      type: mongoose.Schema.Types.ObjectId,                      // Tipo ObjectId
      ref: 'User',                                               // Referencia al modelo User
      required: true,                                            // Obligatorio
      index: true,                                               // Índice para consultas por usuario
    },
    tokenHash: {                                                 // Hash del refresh token (NUNCA almacenar en claro)
      type: String,                                              // Cadena hex del SHA-256
      required: true,                                            // Obligatorio
      unique: true,                                              // Único (crea índice automáticamente)
      // index: true                                             // ❌ Redundante: 'unique' ya crea índice
    },
    createdAt: {                                                 // Fecha de emisión del refresh
      type: Date,                                                // Tipo fecha
      default: Date.now,                                         // Por defecto: ahora
    },
    lastUsedAt: {                                                // Última vez que se usó en /auth/refresh
      type: Date,                                                // Tipo fecha
      default: null,                                             // Null hasta su primer uso
    },
    expiresAt: {                                                 // Momento exacto de expiración del refresh
      type: Date,                                                // Tipo fecha
      required: true,                                            // Obligatorio
      // index: true                                             // ❌ No declarar: el índice TTL (abajo) ya cubre este campo
    },
    revokedAt: {                                                 // Marca de revocación (logout/rotación)
      type: Date,                                                // Tipo fecha
      default: null,                                             // Null si no está revocado
    },
    revokedByIp: {                                               // IP que realizó la revocación
      type: String,                                              // Cadena
      default: null,                                             // Opcional
    },
    replacedBy: {                                                // RT nuevo que reemplazó a este (rotación)
      type: mongoose.Schema.Types.ObjectId,                      // ObjectId del refresh sucesor
      ref: 'RefreshToken',                                       // Misma colección/modelo
      default: null,                                             // Null si no fue reemplazado
    },
    createdByIp: {                                               // IP desde la que se emitió el refresh
      type: String,                                              // Cadena
      default: '',                                               // Vacío si no se registró
    },
    userAgent: {                                                 // User-Agent del cliente al emitir
      type: String,                                              // Cadena
      default: '',                                               // Vacío si no se registró
    },

    // --- Compatibilidad hacia atrás (si existía 'ip' histórico) ----------------
    ip: {                                                        // (DEPRECATED) Campo legado, no escribir en nuevos docs
      type: String,                                              // Cadena
      default: undefined,                                        // Solo aparece si ya existía
    },
  },
  {
    collection: 'refresh_tokens',                                // Nombre fijo de la colección
    versionKey: false,                                           // Desactiva __v
  }
);

// -----------------------------------------------------------------------------
// Índice TTL: elimina el documento automáticamente cuando se supera expiresAt
// -----------------------------------------------------------------------------
RefreshTokenSchema.index(                                       // Define índice
  { expiresAt: 1 },                                             // Clave del índice
  { expireAfterSeconds: 0 }                                     // Expira exactamente al llegar a expiresAt
);

// -----------------------------------------------------------------------------
// Helper: hashear un token en claro con SHA-256 (no se guarda el token plano)
// -----------------------------------------------------------------------------
RefreshTokenSchema.statics.hashToken = function (plain) {       // Método estático utilitario
  return crypto                                                 // Usa crypto nativo
    .createHash('sha256')                                       // Configura algoritmo SHA-256
    .update(String(plain))                                      // Alimenta con el token en claro
    .digest('hex');                                             // Devuelve hash en hexadecimal
};

// -----------------------------------------------------------------------------
// Exporta el modelo compilado
// -----------------------------------------------------------------------------
module.exports = mongoose.model('RefreshToken', RefreshTokenSchema); // Compila y exporta el modelo
