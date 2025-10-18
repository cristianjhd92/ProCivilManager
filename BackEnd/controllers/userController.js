// File: BackEnd/controllers/userController.js                                      // Ruta del archivo
// Descripción: Controlador de usuarios: registro, perfil, actualización,           // Resumen del propósito
// cambio de contraseña, recuperación, listado, actualización y borrado (RESTRICT). // Alcance y reglas de integridad
// Nota: el LOGIN ahora vive en controllers/authController.js (access + refresh).   // Importante

const User = require('../models/User');                                            // Modelo User (colación ES + índice unique email)
const Proyectos = require('../models/Proyectos');                                  // Modelo Proyectos (para RESTRICT y $pull en team)
const RefreshToken = require('../models/RefreshToken');                            // 🔐 Modelo de RefreshToken (revocar sesiones al cambiar/resetear pass)
const bcrypt = require('bcryptjs');                                                // Hash/compare de contraseñas
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/ServiceEmail'); // Envío de emails (best-effort)
const crypto = require('crypto');                                                  // Generación de tokens aleatorios para reset
const mongoose = require('mongoose');                                              // Sesiones/transacciones para integridad
// ❌ Eliminado jsonwebtoken: el login ahora está en authController                 // Limpieza de dependencias

// -----------------------------------------------------------------------------
// Helpers y constantes                                                           // Utilidades comunes
// -----------------------------------------------------------------------------

// Valida un email razonable (admite +, %, _, -, puntos y TLD de 2+ letras)       // Comentario general
const isValidEmail = (email) => {                                                  // Abre función utilitaria
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(                  // Regex: local@dominio.tld
    String(email || '')                                                            // Convierte a string y evita null/undefined
  );                                                                               // Fin test
};                                                                                 // Cierra función

// Normaliza email defensivamente (trim + lower-case)                              // Asegura formato consistente
const normalizeEmail = (email) => {                                                // Abre función
  return (typeof email === 'string'                                                // Si es string…
    ? email.trim().toLowerCase()                                                   // …recorta espacios y pasa a minúsculas
    : email);                                                                      // Si no es string, lo retorna tal cual
};                                                                                 // Cierra función

// Asigna rol según dominio del correo (robusta a mayúsculas/vacíos)               // Política simple de roles
const assignRoleFromEmail = (email) => {                                           // Abre función
  const e = normalizeEmail(email);                                                 // Normaliza para comparar dominios
  if (!e) return 'cliente';                                                        // Fallback seguro si email viene vacío
  if (e.endsWith('@procivilmanager.com')) return 'admin';                          // Dominio interno → admin
  if (e.endsWith('@constructoramd.com')) return 'lider de obra';                   // Dominio aliado → líder de obra
  return 'cliente';                                                                // Por defecto → cliente
};                                                                                 // Cierra función

const ALLOWED_ROLES = ['cliente', 'lider de obra', 'admin'];                       // Whitelist de roles válidos

const toSafeUser = (doc) => {                                                      // Quita campos sensibles antes de responder
  if (!doc) return doc;                                                            // Si viene null/undefined, retorna igual
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };   // Asegura POJO
  delete obj.password;                                                             // Oculta hash de contraseña
  delete obj.resetToken;                                                           // Oculta token de reset
  delete obj.resetTokenExpires;                                                    // Oculta expiración de reset
  delete obj.token;                                                                // Oculta token persistente (legacy) si existiera
  delete obj.failedLogin;                                                          // 🔐 Oculta estado/contadores de lockout
  return obj;                                                                      // Devuelve objeto seguro
};                                                                                 // Fin toSafeUser

// -----------------------------------------------------------------------------
// ========== REGISTRO ==========                                                 // Crea un usuario nuevo
// -----------------------------------------------------------------------------
exports.register = async (req, res) => {                                           // Handler de registro
  const { firstName, lastName, email, phone, password } = req.body;                // Toma campos del body

  // 📌 phone pasa a ser OPCIONAL (coherente con el tratamiento posterior)
  if (!firstName || !lastName || !email || !password) {                            // Valida presencia mínima
    return res.status(400).json({ message: 'Faltan campos obligatorios' });        // 400 si falta algo
  }                                                                                // Fin if

  if (!isValidEmail(email)) {                                                      // Valida formato de email
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400 si inválido
  }                                                                                // Fin if

  if (String(password).length < 6) {                                               // Valida longitud mínima de contraseña
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' }); // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const existingUser = await User.findOne({ email: normalizedEmail });           // Busca duplicado (colación por esquema)
    if (existingUser) {                                                            // Si ya existe ese correo
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409 conflicto
    }                                                                              // Fin if

    const hashedPassword = await bcrypt.hash(password, 10);                        // Hashea la contraseña
    const role = assignRoleFromEmail(normalizedEmail);                             // Determina rol según dominio

    const user = new User({                                                        // Construye documento
      firstName: String(firstName).trim(),                                         // Limpia nombre
      lastName: String(lastName).trim(),                                           // Limpia apellido
      email: normalizedEmail,                                                      // Email normalizado
      phone: phone ? String(phone).trim() : '',                                    // Teléfono limpio (opcional)
      password: hashedPassword,                                                    // Hash de contraseña
      role,                                                                        // Rol calculado
      token: null                                                                  // Campo opcional legacy (se mantiene null)
    });                                                                            // Fin new User

    await user.save();                                                             // Persiste usuario

    try {                                                                          // Envío de bienvenida (best-effort, no bloquea)
      await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);    // Ignora error de envío
    } catch (emailError) {                                                         // Si falla el correo, solo se loguea
      console.warn('Advertencia: error al enviar correo de bienvenida:', emailError);
    }                                                                              // Fin catch email

    return res.status(201).json({                                                  // Respuesta 201 Created
      message: 'Usuario registrado correctamente',                                  // Mensaje de éxito
      user: toSafeUser(user)                                                       // Usuario sin campos sensibles
    });                                                                            // Fin res
  } catch (error) {                                                                // Captura errores
    console.error('Error en el registro:', error);                                 // Log técnico
    if (error?.code === 11000)                                                     // Índice único (race condition)
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409
    if (error?.name === 'ValidationError')                                         // Validación de Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400
    return res.status(500).json({ message: 'Error al registrar el usuario' });     // 500 genérico
  }                                                                                // Fin catch
};                                                                                 // Fin register

// -----------------------------------------------------------------------------
// ========== RECUPERAR CONTRASEÑA ==========                                      // Inicia flujo de reset por email
// -----------------------------------------------------------------------------
exports.forgotPassword = async (req, res) => {                                     // Inicio handler forgot
  const { email } = req.body;                                                      // Toma email del body

  if (!email || !isValidEmail(email)) {                                            // Valida formato de email
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400 si inválido
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const user = await User.findOne({ email: normalizedEmail });                   // Busca usuario por email

    // 🛡️ Anti-enumeración: respondemos 200 aunque no exista
    if (!user) {                                                                   // Si no existe
      return res.status(200).json({ message: 'Si existe una cuenta, se envió el correo de recuperación' }); // 200 neutro
    }                                                                              // Fin if

    const token = crypto.randomBytes(32).toString('hex');                          // Genera token aleatorio
    const expiresAt = new Date(Date.now() + 3600000);                              // Expira en 1 hora

    user.resetToken = token;                                                       // Asigna token al usuario
    user.resetTokenExpires = expiresAt;                                            // Asigna expiración
    await user.save();                                                             // Persiste cambios

    await sendPasswordResetEmail(user.email, token, expiresAt);                    // Envía email con link de reset
    return res.status(200).json({ message: 'Si existe una cuenta, se envió el correo de recuperación' }); // 200 OK (neutro)
  } catch (err) {                                                                  // Captura errores
    console.error('forgotPassword error:', err);                                   // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500 genérico
  }                                                                                // Fin catch
};                                                                                 // Fin forgotPassword

// -----------------------------------------------------------------------------
// ========== RESET DE CONTRASEÑA ==========                                       // Aplica nueva contraseña con token válido
// -----------------------------------------------------------------------------
exports.resetPassword = async (req, res) => {                                      // Handler reset
  const { token } = req.params;                                                    // Toma token desde la URL
  const { newPassword } = req.body;                                                // Toma nueva contraseña del body

  if (!newPassword || String(newPassword).length < 6) {                            // Valida longitud mínima
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' }); // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const user = await User.findOne({                                              // Busca usuario con token válido
      resetToken: token,                                                           // Token coincide
      resetTokenExpires: { $gt: new Date() }                                       // Y no está expirado
    });                                                                            // Fin findOne

    if (!user) {                                                                   // Si no hay coincidencia
      return res.status(400).json({ message: 'Token inválido o expirado' });       // 400
    }                                                                              // Fin if

    const hashedPassword = await bcrypt.hash(newPassword, 10);                     // Hashea nueva contraseña
    user.password = hashedPassword;                                                // Asigna hash
    user.resetToken = null;                                                        // Limpia token
    user.resetTokenExpires = null;                                                 // Limpia expiración

    // 🔒 Limpia contadores/bloqueos tras un reset exitoso
    await user.resetLoginCounters();                                               // ← Mejora de UX/seguridad

    await user.save();                                                             // Persiste cambios

    // 🔐 Seguridad: revoca TODAS las sesiones (refresh tokens) del usuario
    try {                                                                          // Best-effort: no bloquear respuesta
      await RefreshToken.updateMany(                                               // Revoca en masa
        { user: user._id, revokedAt: null },                                       // Tokens activos del usuario
        { $set: { revokedAt: new Date(), revokedByIp: (req.ip || req.connection?.remoteAddress || '') } }
      );
    } catch (revErr) {
      console.warn('Advertencia: no se pudieron revocar todos los refresh tokens tras reset:', revErr);
    }

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' }); // 200 OK
  } catch (err) {                                                                  // Captura errores
    console.error('resetPassword error:', err);                                    // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin resetPassword

// -----------------------------------------------------------------------------
// ========== OBTENER PERFIL DE USUARIO ==========                                 // Devuelve datos del usuario autenticado
// -----------------------------------------------------------------------------
exports.getUserProfile = async (req, res) => {                                     // Handler perfil
  try {                                                                            // Bloque principal
    const user = await User.findById(req.user.id)                                  // Busca por id del token
      .select('-password -resetToken -resetTokenExpires -token -failedLogin');     // 🔐 Excluye campos sensibles/lockout
    if (!user) {                                                                   // Si no existe
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404
    }                                                                              // Fin if
    return res.status(200).json(user);                                             // Devuelve usuario seguro
  } catch (error) {                                                                // Captura errores
    console.error('Error al obtener perfil de usuario:', error);                   // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin getUserProfile

// -----------------------------------------------------------------------------
// ========== ACTUALIZAR PERFIL ==========                                          // Permite editar datos propios
// -----------------------------------------------------------------------------
exports.updateUserProfile = async (req, res) => {                                  // Handler update propio
  try {                                                                            // Bloque principal
    const userId = req.user.id;                                                    // Id del token
    const { firstName, lastName, email, phone } = req.body;                        // Campos editables

    if (email && !isValidEmail(email)) {                                           // Valida email si viene
      return res.status(400).json({ message: 'Correo electrónico inválido' });     // 400
    }                                                                              // Fin if

    const user = await User.findById(userId);                                      // Busca usuario
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404

    if (firstName) user.firstName = String(firstName).trim();                      // Actualiza nombre
    if (lastName)  user.lastName  = String(lastName).trim();                       // Actualiza apellido
    if (typeof phone !== 'undefined') user.phone = String(phone).trim();           // Actualiza teléfono (si viene)
    if (email) user.email = normalizeEmail(email);                                 // Normaliza email si viene

    await user.save();                                                             // Persiste cambios

    return res.status(200).json({                                                  // Respuesta 200
      message: 'Información actualizada correctamente',                             // Mensaje
      user: toSafeUser(user)                                                       // Usuario sin sensibles
    });                                                                            // Fin res
  } catch (error) {                                                                // Captura errores
    console.error('Error al actualizar perfil:', error);                           // Log técnico
    if (error?.code === 11000)                                                     // Duplicidad de email
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409
    if (error?.name === 'ValidationError')                                         // Validación de Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin updateUserProfile

// -----------------------------------------------------------------------------
// ========== CAMBIAR CONTRASEÑA ==========                                          // Requiere contraseña actual
// -----------------------------------------------------------------------------
exports.updateUserPassword = async (req, res) => {                                 // Handler cambio password
  try {                                                                            // Bloque principal
    const userId = req.user.id;                                                    // Id del token
    const { currentPassword, newPassword } = req.body;                             // Body con contraseñas

    if (!currentPassword || !newPassword) {                                        // Requiere ambos campos
      return res.status(400).json({ message: 'Por favor ingresa la contraseña actual y la nueva' }); // 400
    }                                                                              // Fin if
    if (String(newPassword).length < 6) {                                          // Valida longitud mínima
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' }); // 400
    }                                                                              // Fin if

    const user = await User.findById(userId);                                      // Busca usuario
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404

    const isMatch = await bcrypt.compare(currentPassword, user.password);          // Compara contraseña actual
    if (!isMatch) {                                                                // Si no coincide
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });    // 400
    }                                                                              // Fin if

    const hashedPassword = await bcrypt.hash(newPassword, 10);                     // Hashea nueva contraseña
    user.password = hashedPassword;                                                // Asigna hash

    // 🔒 Limpia contadores/bloqueos tras cambio de contraseña exitoso
    await user.resetLoginCounters();                                               // ← IMPORTANTE para UX

    await user.save();                                                             // Persiste

    // 🔐 Seguridad: revoca TODAS las sesiones (refresh tokens) del usuario
    try {                                                                          // Best-effort: no bloquear respuesta
      await RefreshToken.updateMany(                                               // Revoca en masa
        { user: user._id, revokedAt: null },                                       // Tokens activos del usuario
        { $set: { revokedAt: new Date(), revokedByIp: (req.ip || req.connection?.remoteAddress || '') } }
      );
    } catch (revErr) {
      console.warn('Advertencia: no se pudieron revocar todos los refresh tokens tras cambio de contraseña:', revErr);
    }

    return res.status(200).json({ message: 'Contraseña cambiada correctamente' }); // 200 OK
  } catch (error) {                                                                // Captura errores
    console.error('Error al cambiar contraseña:', error);                          // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin updateUserPassword

// -----------------------------------------------------------------------------
// ========== OBTENER TODOS LOS USUARIOS (sin campos sensibles) ==========          // Admin/Líder
// -----------------------------------------------------------------------------
exports.getAllUsers = async (req, res) => {                                        // Handler listado
  try {                                                                            // Bloque principal
    const users = await User.find()                                                // Trae todos los usuarios
      .select('-password -resetToken -resetTokenExpires -token -failedLogin');     // 🔐 Excluye sensibles/lockout
    return res.status(200).json(users);                                            // 200 con lista segura
  } catch (error) {                                                                // Captura errores
    console.error('Error al obtener usuarios:', error);                            // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin getAllUsers

// -----------------------------------------------------------------------------
// ========== ACTUALIZAR USUARIO POR ID ==========                                   // Admin/Líder
// -----------------------------------------------------------------------------
exports.updateUserById = async (req, res) => {                                     // Handler update por id
  const userId = req.params.id;                                                    // Id en la URL
  const { firstName, lastName, email, phone, role } = req.body;                    // Campos editables

  if (email && !isValidEmail(email)) {                                             // Valida email si viene
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const user = await User.findById(userId);                                      // Busca usuario
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404

    if (firstName) user.firstName = String(firstName).trim();                      // Actualiza nombre
    if (lastName)  user.lastName  = String(lastName).trim();                       // Actualiza apellido
    if (typeof phone !== 'undefined') user.phone = String(phone).trim();           // Actualiza teléfono
    if (email) user.email = normalizeEmail(email);                                 // Normaliza email

    if (role) {                                                                     // Cambio de rol (opcional)
      if (!ALLOWED_ROLES.includes(role)) {                                          // Valida whitelist
        return res.status(400).json({ message: 'Rol inválido' });                   // 400
      }                                                                             // Fin if
      user.role = role;                                                             // Asigna nuevo rol
    }                                                                               // Fin if

    await user.save();                                                              // Persiste cambios

    return res.status(200).json({                                                   // Respuesta 200 OK
      message: 'Usuario actualizado correctamente',                                  // Mensaje
      user: toSafeUser(user)                                                        // Usuario seguro
    });                                                                             // Fin res
  } catch (error) {                                                                 // Captura errores
    console.error('Error al actualizar usuario:', error);                           // Log técnico
    if (error?.code === 11000)                                                     // Duplicidad de email
      return res.status(409).json({ message: 'El correo ya está registrado' });     // 409
    if (error?.name === 'ValidationError')                                          // Validación de Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400
    return res.status(500).json({ message: 'Error interno del servidor' });         // 500
  }                                                                                 // Fin catch
};                                                                                  // Fin updateUserById

// -----------------------------------------------------------------------------
// ========== ELIMINAR USUARIO POR ID (RESTRICT + limpieza de team) ==========       // Admin/Líder
// -----------------------------------------------------------------------------
exports.deleteUserById = async (req, res) => {                                     // Handler delete + integridad
  const userId = req.params.id;                                                    // Id de la URL

  const session = await mongoose.startSession();                                   // Abre sesión de DB
  session.startTransaction();                                                      // Inicia transacción
  try {                                                                            // Bloque principal
    const user = await User.findById(userId).session(session);                     // Busca usuario dentro de la tx
    if (!user) {                                                                   // Si no existe
      await session.abortTransaction();                                            // Revierte la transacción
      session.endSession();                                                        // Cierra la sesión
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404
    }                                                                              // Fin if

    const owns = await Proyectos.exists({ owner: userId }).session(session);       // ¿Es owner de algún proyecto?
    if (owns) {                                                                    // Si posee proyectos como owner
      await session.abortTransaction();                                            // Revierte
      session.endSession();                                                        // Cierra
      return res.status(409).json({                                                // RESTRICT (409)
        message: 'No se puede eliminar: el usuario es owner de uno o más proyectos. Reasigna el owner y vuelve a intentar.'
      });                                                                          // Fin json
    }                                                                              // Fin if

    await Proyectos.updateMany(                                                    // Limpia referencias en team
      { team: userId },                                                            // Donde aparece en el array
      { $pull: { team: userId } },                                                 // Lo saca del array team
      { session }                                                                  // Dentro de la transacción
    );                                                                             // Fin updateMany

    await User.findByIdAndDelete(userId).session(session);                         // Elimina el usuario

    await session.commitTransaction();                                             // Confirma la transacción
    session.endSession();                                                          // Cierra la sesión

    return res.status(200).json({ message: 'Usuario eliminado correctamente' });   // 200 OK
  } catch (error) {                                                                // Captura errores
    await session.abortTransaction();                                              // Revierte transacción
    session.endSession();                                                          // Cierra sesión
    console.error('Error al eliminar usuario:', error);                            // Log técnico
    return res.status(500).json({ message: 'Error al eliminar usuario' });         // 500
  }                                                                                // Fin catch
};                                                                                 // Fin deleteUserById
