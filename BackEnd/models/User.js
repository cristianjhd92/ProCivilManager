// File: BackEnd/models/User.js                                                   // Ruta del archivo dentro del proyecto
// Descripción: Esquema de usuarios con normalización de email, índice único      // Propósito del archivo
// (collation ES) y BLOQUEO TEMPORAL por intentos fallidos (lockout + backoff).   // Seguridad: lockout (423) y helpers

const mongoose = require('mongoose');                                            // Importa mongoose
const { Schema, model } = mongoose;                                              // Extrae helpers Schema/model

// -----------------------------------------------------------------------------
// Parámetros de lockout desde .env (con defaults seguros)                        // Lee tiempos/umbrales del .env
// -----------------------------------------------------------------------------
const MAX_ATTEMPTS   = parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '3', 10);    // Intentos requeridos para bloquear (3)
const WINDOW_MIN     = parseInt(process.env.LOCKOUT_WINDOW_MINUTES || '3', 10);  // Ventana de conteo de fallos (min)
const BASE_LOCK_MIN  = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '5', 10);// Duración base del primer bloqueo (min)
const BACKOFF_MULTI  = parseFloat(process.env.LOCKOUT_BACKOFF_MULTIPLIER || '2');// Factor de backoff (x2)
const MAX_LOCK_MIN   = parseInt(process.env.LOCKOUT_MAX_DURATION_MINUTES || '1440', 10); // Tope de bloqueo (24h)

// Helper: minutos → milisegundos
function minutes(n) { return n * 60 * 1000; }                                    // Convierte minutos a ms

// -----------------------------------------------------------------------------
// Definición del esquema                                                         // Campos del usuario
// -----------------------------------------------------------------------------
const userSchema = new Schema(
  {
    firstName: {                                                                 // Nombres
      type: String,                                                              // Tipo String
      required: true,                                                            // Obligatorio
      trim: true                                                                 // Quita espacios a los lados
    },
    lastName: {                                                                  // Apellidos
      type: String,                                                              // Tipo String
      required: true,                                                            // Obligatorio
      trim: true                                                                 // Quita espacios
    },
    email: {                                                                     // Correo (clave de login)
      type: String,                                                              // String
      required: true,                                                            // Obligatorio
      // ⚠️ No uses unique: true aquí para evitar doble índice en Mongoose       // El índice único se define abajo con collation
      lowercase: true,                                                           // Normaliza a minúsculas
      trim: true,                                                                // Limpia espacios
      validate: {                                                                // Validador básico de formato
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),                  // Regex simple de email
        message: 'El email no tiene un formato válido.'                          // Mensaje en caso de fallo
      }
    },
    phone: {                                                                     // Teléfono (opcional)
      type: String,                                                              // String
      trim: true                                                                 // Limpia espacios
    },
    password: {                                                                  // Hash de contraseña
      type: String,                                                              // String (hash)
      required: true                                                             // Obligatorio
    },
    role: {                                                                      // Rol del usuario
      type: String,                                                              // String
      enum: ['cliente', 'lider de obra', 'admin'],                               // Valores permitidos
      default: 'cliente',                                                        // Valor por defecto
      index: true                                                                // Índice útil para filtros por rol
    },
    token: {                                                                     // Token de sesión (si lo usas)
      type: String,                                                              // String
      default: null                                                              // Puede estar vacío
    },
    resetToken: {                                                                // Token de recuperación (opcional)
      type: String,                                                              // String
      default: null                                                              // Puede estar vacío
    },
    resetTokenExpires: {                                                         // Expiración del token de recuperación
      type: Date,                                                                // Date
      default: null                                                              // Puede estar vacío
    },

    // =========================
    // Seguridad: lockout por intentos fallidos
    // =========================
    failedLogin: {                                                               // Subdocumento de seguridad
      attempts:   { type: Number, default: 0 },                                  // Intentos acumulados dentro de la ventana
      lastAt:     { type: Date },                                                // Fecha del último intento (para ventana)
      lockUntil:  { type: Date },                                                // Si > ahora → cuenta bloqueada
      lockCount:  { type: Number, default: 0 },                                  // Número de bloqueos históricos (para backoff)
    },
  },
  {
    timestamps: true,                                                            // createdAt/updatedAt automáticos
    versionKey: false                                                            // Oculta __v
  }
);

// -----------------------------------------------------------------------------
// Collation por defecto del esquema (ES, insensible a mayúsculas/acentos)        // Para comparaciones y el índice único
// -----------------------------------------------------------------------------
userSchema.set('collation', { locale: 'es', strength: 2 });                      // Collation español (i/case, i/acentos)

// -----------------------------------------------------------------------------
// Índices (definidos UNA sola vez)                                               // Define índice único + collation
// -----------------------------------------------------------------------------
userSchema.index(
  { email: 1 },                                                                  // Índice por email asc
  { unique: true, collation: { locale: 'es', strength: 2 } }                     // Único con collation ES
);

// -----------------------------------------------------------------------------
// Hooks (normalización defensiva)                                                // Limpia email antes de validar
// -----------------------------------------------------------------------------
userSchema.pre('validate', function (next) {                                     // Hook pre-validate
  if (typeof this.email === 'string') {                                          // Si hay email
    this.email = this.email.trim().toLowerCase();                                // Normaliza (trim + lower)
  }
  next();                                                                        // Continúa
});

// -----------------------------------------------------------------------------
// Virtuales y Métodos de bloqueo (lockout)                                       // API del modelo para lockout
// -----------------------------------------------------------------------------

// Virtual: ¿está bloqueada la cuenta AHORA?
userSchema.virtual('isLocked').get(function () {                                 // Virtual de solo lectura
  return !!(this.failedLogin?.lockUntil && this.failedLogin.lockUntil > new Date()); // true si lockUntil futuro
});

// Resetea contadores tras login o reset de contraseña exitosos
userSchema.methods.resetLoginCounters = async function (opts = {}) {             // Llama tras login OK o reset pass OK
  this.failedLogin = this.failedLogin || {};                                     // Asegura objeto
  this.failedLogin.attempts  = 0;                                                // Reinicia intentos
  this.failedLogin.lastAt    = undefined;                                        // Limpia marca temporal
  this.failedLogin.lockUntil = undefined;                                        // Quita bloqueo activo
  // No tocamos lockCount para mantener el historial (backoff);                   // Si quieres “olvidar”, ponlo en 0 aquí
  await this.save(opts);                                                         // Persiste cambios
};

// Registra un fallo e impone bloqueo si corresponde (3 intentos por defecto)
userSchema.methods.registerFailedLogin = async function (opts = {}) {            // Llama cuando la contraseña NO coincide
  const now = new Date();                                                        // Timestamp actual
  const fl  = this.failedLogin || {};                                            // Alias corto

  // Reinicia conteo si pasó la ventana; si no, incrementa
  if (!fl.lastAt || (now - fl.lastAt) > minutes(WINDOW_MIN)) {                   // Fuera de ventana → reinicia
    fl.attempts = 1;                                                             // Primer intento de la nueva ventana
  } else {                                                                       // Dentro de ventana
    fl.attempts = (fl.attempts || 0) + 1;                                        // Suma 1 intento
  }

  fl.lastAt = now;                                                               // Actualiza última marca

  // ¿Se alcanza el umbral de bloqueo?
  if (fl.attempts >= MAX_ATTEMPTS) {                                             // Alcanza 3 intentos (o el valor que esté en .env)
    const nextLockCount = (fl.lockCount || 0) + 1;                               // Aumenta contador de bloqueos
    const rawMinutes   = BASE_LOCK_MIN * Math.pow(BACKOFF_MULTI, nextLockCount - 1); // Backoff: 5, 10, 20, 40, ...
    const lockMinutes  = Math.min(rawMinutes, MAX_LOCK_MIN);                     // Aplica tope máximo (24h)
    fl.lockUntil = new Date(now.getTime() + minutes(lockMinutes));               // Calcula vencimiento del bloqueo
    fl.lockCount = nextLockCount;                                                // Guarda lockCount actualizado
    fl.attempts  = 0;                                                            // Reinicia intentos tras bloquear
  }

  this.failedLogin = fl;                                                         // Escribe subdocumento
  await this.save(opts);                                                         // Persiste cambios
};

// Verifica bloqueo activo y corta el flujo si aplica (para usar ANTES de validar password)
userSchema.methods.assertNotLocked = function () {                               // Llama al principio del login
  if (this.failedLogin?.lockUntil && this.failedLogin.lockUntil > new Date()) {  // ¿Sigue bloqueada?
    const seconds = Math.ceil((this.failedLogin.lockUntil.getTime() - Date.now()) / 1000); // Segs restantes
    const minutesLeft = Math.max(1, Math.ceil(seconds / 60));                    // A minutos aproximados
    const err = new Error(`Cuenta bloqueada temporalmente. Intenta en ~${minutesLeft} min.`); // Mensaje estándar
    err.code = 'ACCOUNT_LOCKED';                                                 // Código semántico para manejo en controlador
    throw err;                                                                   // Interrumpe el proceso de login
  }
};

// -----------------------------------------------------------------------------
// Exportación del modelo                                                          // Exporta el modelo Mongoose
// -----------------------------------------------------------------------------
module.exports = model('User', userSchema);                                      // Exporta con nombre 'User'
