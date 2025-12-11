// File: BackEnd/src/modules/users/models/usuario.modelo.js
// Description: Modelo Mongoose para los usuarios del sistema ProCivil Manager (PCM).
//              Define datos básicos de perfil, credenciales de acceso, rol de usuario,
//              manejo de intentos de login, bloqueo de cuenta y eliminación lógica.

const mongoose = require('mongoose');                           // Importa Mongoose para definir esquemas y modelos.

// 📄 Definición del esquema de usuario
const userSchema = new mongoose.Schema(
  {
    // Nombres del usuario (ejemplo: "Cristian Alexander")
    firstName: {
      type: String,                                             // Cadena de texto.
      required: true,                                           // Obligatorio para crear el usuario.
      trim: true,                                               // Elimina espacios en blanco al inicio y al final.
    },

    // Apellidos del usuario (ejemplo: "Hernández Díaz")
    lastName: {
      type: String,                                             // Cadena de texto.
      required: true,                                           // Obligatorio para crear el usuario.
      trim: true,                                               // Elimina espacios en blanco al inicio y al final.
    },

    // Correo electrónico principal del usuario
    email: {
      type: String,                                             // Cadena de texto.
      required: true,                                           // Obligatorio.
      unique: true,                                             // No se pueden repetir correos en la colección.
      lowercase: true,                                          // Se almacena siempre en minúsculas.
      trim: true,                                               // Limpia espacios en los extremos.
      // Nota: la validación de formato de email se hace normalmente en el servicio/controlador.
    },

    // Teléfono de contacto (opcional)
    phone: {
      type: String,                                             // Cadena de texto.
      trim: true,                                               // Limpia espacios si se envía.
      // No es obligatorio, el usuario puede no registrar teléfono.
    },

    // Contraseña del usuario (ya debe llegar encriptada al guardar)
    password: {
      type: String,                                             // Cadena de texto encriptada (bcrypt u otro).
      required: true,                                           // Obligatoria para autenticación.
      // Importante: nunca guardar contraseñas en texto plano.
    },

    // Rol del usuario dentro del sistema:
    //  - 'cliente'      → acceso a sus proyectos / solicitudes.
    //  - 'lider de obra'→ acceso a módulos de obra e inventario asociado.
    //  - 'admin'        → acceso administrativo completo.
    role: {
      type: String,                                             // Cadena de texto.
      enum: ['cliente', 'lider de obra', 'admin'],              // Valores permitidos.
      default: 'cliente',                                       // Si no se especifica, se asume cliente.
    },

    // Token de sesión o de autenticación persistente (opcional).
    // Se puede usar para mantener la sesión iniciada o invalidar tokens antiguos.
    token: {
      type: String,                                             // Cadena de texto.
      default: null,                                            // Sin token por defecto.
    },

    // Token para recuperación de contraseña (reset password)
    resetToken: {
      type: String,                                             // Cadena de texto.
      default: null,                                            // Solo se rellena cuando se solicita un reset.
    },

    // Fecha de expiración del resetToken
    resetTokenExpires: {
      type: Date,                                               // Fecha/hora en que expira el token.
      default: null,                                            // Sin fecha por defecto.
    },

    // Número de intentos de login fallidos consecutivos.
    // Se usa para bloquear la cuenta tras cierto número de intentos.
    loginAttempts: {
      type: Number,                                             // Contador numérico.
      default: 0,                                               // Inicia en 0.
    },

    // Fecha del último intento de login fallido.
    // Permite desbloquear automáticamente tras un tiempo (ej. 15 minutos).
    lastFailedLoginAt: {
      type: Date,                                               // Fecha/hora del último fallo de login.
      // No se establece valor por defecto: solo se actualiza cuando ocurre un fallo.
    },

    // Estado general de la cuenta:
    //  true  → cuenta activa, permite login (si las credenciales son correctas).
    //  false → cuenta bloqueada (por decisiones administrativas o seguridad).
    status: {
      type: Boolean,                                            // Valor booleano.
      default: true,                                            // Por defecto, las cuentas se crean activas.
    },

    // Eliminación lógica del usuario:
    //  - false → usuario visible y operativo en el sistema.
    //  - true  → usuario marcado como eliminado (no aparece en listados ni se usa).
    // Importante: los controladores deben filtrar por { isDeleted: { $ne: true } }
    // para ignorar estos registros.
    isDeleted: {
      type: Boolean,                                            // Valor booleano.
      default: false,                                           // Por defecto, el usuario NO está eliminado.
    },
  },
  {
    // timestamps agrega automáticamente:
    //  - createdAt → fecha de creación del documento.
    //  - updatedAt → fecha de la última modificación.
    timestamps: true,
  }
);

/* ==========================================================
 * Virtuales y transformaciones de salida (JSON / Object)
 * ========================================================== */

/**
 * Virtual: nombreCompleto
 *
 * Devuelve el nombre del usuario en formato:
 *   "Nombres Apellidos"
 *
 * Útil para:
 *  - Mostrar quién creó una solicitud.
 *  - Mostrar destinatarios en alertas.
 *  - Listar clientes en el campo "correo del cliente" de proyectos.
 */
userSchema.virtual('nombreCompleto').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

// Configuración al convertir documentos a JSON (respuestas de la API)
userSchema.set('toJSON', {
  virtuals: true,                                               // Incluye virtuales como nombreCompleto.
  transform: (doc, ret) => {
    // Elimina campos sensibles antes de enviar al cliente.
    delete ret.password;                                        // Nunca exponer la contraseña.
    delete ret.token;                                           // Token interno de sesión.
    delete ret.resetToken;                                      // Token de reset de contraseña.
    delete ret.resetTokenExpires;                               // Expiración del reset.
    delete ret.__v;                                             // Versión interna de Mongoose.

    return ret;                                                 // Devuelve el objeto limpio.
  },
});

// Configuración al convertir documentos a objetos simples (.toObject())
userSchema.set('toObject', {
  virtuals: true,                                               // También incluir virtuales aquí.
});

/* ===========================
 * Exportación del modelo
 * =========================== */

// Exporta el modelo "User" para usarlo en controladores y servicios.
// Mongoose.model(nombreModelo, esquema) registra el modelo en la conexión actual de MongoDB.
module.exports = mongoose.model('User', userSchema);
