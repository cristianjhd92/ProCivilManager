// File: BackEnd/controllers/userController.js                                      // Ruta del archivo
// Descripción: Controlador de usuarios: registro, login, perfil, actualización,    // Resumen del propósito
// cambio de contraseña, recuperación, y borrado con integridad (RESTRICT + $pull). // Alcance y reglas de integridad

const User = require('../models/User');                                            // Modelo User (colación ES + índice unique email)
const Proyectos = require('../models/Proyectos');                                  // Modelo Proyectos (para RESTRICT y $pull en team)
const bcrypt = require('bcryptjs');                                                // Hash/compare de contraseñas
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/ServiceEmail'); // Envío de emails (best-effort)
const crypto = require('crypto');                                                  // Generación de tokens aleatorios
const jwt = require('jsonwebtoken');                                               // Emisión/verificación de JWT
const mongoose = require('mongoose');                                              // Sesiones/transacciones para integridad

// -----------------------------------------------------------------------------
// Helpers y constantes
// -----------------------------------------------------------------------------

const isValidEmail = (email) =>                                                    // Valida un formato básico de email
  /^[\w.-]+@[\w.-]+\.\w{2,}$/.test(String(email));                                 // Regex simple

const normalizeEmail = (email) =>                                                  // Normaliza email defensivamente (trim+lower)
  (typeof email === 'string' ? email.trim().toLowerCase() : email);                // Si no es string, retorna tal cual

const assignRoleFromEmail = (email) => {                                           // Asigna rol según dominio
  if (email.endsWith('@procivilmanager.com')) return 'admin';                      // Dominio interno → admin
  if (email.endsWith('@constructoramd.com')) return 'lider de obra';               // Dominio aliado → líder
  return 'cliente';                                                                // Resto → cliente
};                                                                                 // Fin assignRoleFromEmail

const getRedirectPath = (email) => {                                               // Define ruta sugerida post-login
  if (email.endsWith('@procivilmanager.com')) return '/admin';                     // Admin → /admin
  if (email.endsWith('@constructoramd.com')) return '/proyectos';                  // Líder → /proyectos
  return '/';                                                                      // Cliente → home
};                                                                                 // Fin getRedirectPath

const ALLOWED_ROLES = ['cliente', 'lider de obra', 'admin'];                       // Whitelist de roles válidos

const toSafeUser = (doc) => {                                                      // Quita campos sensibles antes de responder
  if (!doc) return doc;                                                            // Si viene null/undefined, retorna igual
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };   // Asegura POJO
  delete obj.password;                                                             // Oculta hash
  delete obj.resetToken;                                                           // Oculta token reset
  delete obj.resetTokenExpires;                                                    // Oculta expiración
  delete obj.token;                                                                // Oculta token persistente si existiera
  return obj;                                                                      // Retorna versión segura
};                                                                                 // Fin toSafeUser

// -----------------------------------------------------------------------------
// ========== REGISTRO ==========
// -----------------------------------------------------------------------------
exports.register = async (req, res) => {                                           // Handler de registro
  const { firstName, lastName, email, phone, password } = req.body;                // Toma campos del body

  if (!firstName || !lastName || !email || !phone || !password) {                  // Valida presencia
    return res.status(400).json({ message: 'Todos los campos son obligatorios' }); // 400 si falta algo
  }                                                                                // Fin if

  if (!isValidEmail(email)) {                                                      // Valida formato de email
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400 si inválido
  }                                                                                // Fin if

  if (String(password).length < 6) {                                               // Valida longitud mínima
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' }); // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const existingUser = await User.findOne({ email: normalizedEmail });           // Busca duplicado (colación por esquema)
    if (existingUser) {                                                            // Si ya existe
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409 conflicto
    }                                                                              // Fin if

    const hashedPassword = await bcrypt.hash(password, 10);                        // Hashea la contraseña
    const role = assignRoleFromEmail(normalizedEmail);                             // Determina rol

    const user = new User({                                                        // Construye documento
      firstName: String(firstName).trim(),                                         // Limpia nombre
      lastName: String(lastName).trim(),                                           // Limpia apellido
      email: normalizedEmail,                                                      // Email normalizado
      phone: phone ? String(phone).trim() : '',                                    // Teléfono limpio (opcional)
      password: hashedPassword,                                                    // Hash
      role,                                                                        // Rol calculado
      token: null                                                                  // Campo opcional (no usado)
    });                                                                            // Fin new User

    await user.save();                                                             // Persiste

    try {                                                                          // Envío de bienvenida (best-effort)
      await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);    // No bloquea el flujo
    } catch (emailError) {                                                         // Si falla, loguea y sigue
      console.warn('Advertencia: error al enviar correo de bienvenida:', emailError);
    }                                                                              // Fin catch email

    return res.status(201).json({                                                  // Respuesta 201
      message: 'Usuario registrado correctamente',                                  // Mensaje
      user: toSafeUser(user)                                                       // Usuario sin campos sensibles
    });                                                                            // Fin res
  } catch (error) {                                                                // Errores
    console.error('Error en el registro:', error);                                 // Log técnico
    if (error?.code === 11000)                                                     // Índice único (race)
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409
    if (error?.name === 'ValidationError')                                         // Validación de Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400
    return res.status(500).json({ message: 'Error al registrar el usuario' });     // 500
  }                                                                                // Fin catch
};                                                                                 // Fin register

// -----------------------------------------------------------------------------
// ========== LOGIN ==========
// -----------------------------------------------------------------------------
exports.login = async (req, res) => {                                              // Handler de login
  const { email, password } = req.body;                                            // Toma credenciales

  if (!email || !password) {                                                       // Valida presencia
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios' }); // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const user = await User.findOne({ email: normalizedEmail });                   // Busca por email
    if (!user) {                                                                   // Si no existe
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404
    }                                                                              // Fin if

    const isMatch = await bcrypt.compare(password, user.password);                 // Compara password
    if (!isMatch) {                                                                // Si no coincide
      return res.status(401).json({ message: 'Contraseña incorrecta' });           // 401
    }                                                                              // Fin if

    const token = jwt.sign(                                                        // Firma JWT
      { id: user._id, email: user.email, role: user.role },                        // Payload mínimo
      process.env.JWT_SECRET,                                                      // Secreto
      { expiresIn: '1h' }                                                          // Expiración
    );                                                                             // Fin sign

    const redirectTo = getRedirectPath(user.email);                                // Ruta sugerida

    return res.status(200).json({                                                  // Respuesta OK
      message: 'Inicio de sesión exitoso',                                         // Mensaje
      user: toSafeUser(user),                                                      // Usuario sin campos sensibles
      token,                                                                       // JWT
      redirectTo                                                                   // Ruta
    });                                                                            // Fin res
  } catch (error) {                                                                // Errores
    console.error('Error en el login:', error);                                    // Log técnico
    return res.status(500).json({ message: 'Error al iniciar sesión' });           // 500
  }                                                                                // Fin catch
};                                                                                 // Fin login

// -----------------------------------------------------------------------------
// ========== RECUPERAR CONTRASEÑA ==========
// -----------------------------------------------------------------------------
exports.forgotPassword = async (req, res) => {                                     // Inicio handler forgot
  const { email } = req.body;                                                      // Toma email

  if (!email || !isValidEmail(email)) {                                            // Valida formato
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const user = await User.findOne({ email: normalizedEmail });                   // Busca usuario
    if (!user) {                                                                   // Si no existe
      return res.status(404).json({ message: 'No existe una cuenta con ese correo' }); // 404
    }                                                                              // Fin if

    const token = crypto.randomBytes(32).toString('hex');                          // Genera token
    const expiresAt = new Date(Date.now() + 3600000);                              // +1h

    user.resetToken = token;                                                       // Asigna token
    user.resetTokenExpires = expiresAt;                                            // Asigna expiración
    await user.save();                                                             // Persiste

    await sendPasswordResetEmail(user.email, token, expiresAt);                    // Envía email
    return res.status(200).json({ message: 'Correo de recuperación enviado con éxito' }); // 200
  } catch (err) {                                                                  // Errores
    console.error('forgotPassword error:', err);                                   // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin forgotPassword

// -----------------------------------------------------------------------------
// ========== RESET DE CONTRASEÑA ==========
// -----------------------------------------------------------------------------
exports.resetPassword = async (req, res) => {                                      // Handler reset
  const { token } = req.params;                                                    // Toma token URL
  const { newPassword } = req.body;                                                // Toma nueva password

  if (!newPassword || String(newPassword).length < 6) {                            // Valida longitud
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' }); // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const user = await User.findOne({                                              // Busca usuario
      resetToken: token,                                                           // Token coincide
      resetTokenExpires: { $gt: new Date() }                                       // No expirado
    });                                                                            // Fin findOne

    if (!user) {                                                                   // Si no existe
      return res.status(400).json({ message: 'Token inválido o expirado' });       // 400
    }                                                                              // Fin if

    const hashedPassword = await bcrypt.hash(newPassword, 10);                     // Hashea nueva
    user.password = hashedPassword;                                                // Asigna hash
    user.resetToken = null;                                                        // Limpia token
    user.resetTokenExpires = null;                                                 // Limpia expiración
    await user.save();                                                             // Persiste

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' }); // 200
  } catch (err) {                                                                  // Errores
    console.error('resetPassword error:', err);                                    // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin resetPassword

// -----------------------------------------------------------------------------
// ========== OBTENER PERFIL DE USUARIO ==========
// -----------------------------------------------------------------------------
exports.getUserProfile = async (req, res) => {                                     // Handler perfil
  try {                                                                            // Bloque principal
    const user = await User.findById(req.user.id)                                  // Busca por id del token
      .select('-password -resetToken -resetTokenExpires -token');                  // Excluye sensibles
    if (!user) {                                                                   // Si no existe
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404
    }                                                                              // Fin if
    return res.status(200).json(user);                                             // 200 con usuario seguro
  } catch (error) {                                                                // Errores
    console.error('Error al obtener perfil de usuario:', error);                   // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin getUserProfile

// -----------------------------------------------------------------------------
// ========== ACTUALIZAR PERFIL ==========
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
    if (typeof phone !== 'undefined') user.phone = String(phone).trim();           // Actualiza teléfono
    if (email) user.email = normalizeEmail(email);                                 // Normaliza email si viene

    await user.save();                                                             // Persiste

    return res.status(200).json({                                                  // Respuesta 200
      message: 'Información actualizada correctamente',                             // Mensaje
      user: toSafeUser(user)                                                       // Usuario seguro
    });                                                                            // Fin res
  } catch (error) {                                                                // Errores
    console.error('Error al actualizar perfil:', error);                           // Log técnico
    if (error?.code === 11000)                                                     // Duplicidad email
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409
    if (error?.name === 'ValidationError')                                         // Validación Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin updateUserProfile

// -----------------------------------------------------------------------------
// ========== CAMBIAR CONTRASEÑA ==========
// -----------------------------------------------------------------------------
exports.updateUserPassword = async (req, res) => {                                 // Handler cambio password
  try {                                                                            // Bloque principal
    const userId = req.user.id;                                                    // Id del token
    const { currentPassword, newPassword } = req.body;                             // Body

    if (!currentPassword || !newPassword) {                                        // Requiere ambos
      return res.status(400).json({ message: 'Por favor ingresa la contraseña actual y la nueva' }); // 400
    }                                                                              // Fin if
    if (String(newPassword).length < 6) {                                          // Valida longitud
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' }); // 400
    }                                                                              // Fin if

    const user = await User.findById(userId);                                      // Busca usuario
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404

    const isMatch = await bcrypt.compare(currentPassword, user.password);          // Verifica actual
    if (!isMatch) {                                                                // Si no coincide
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });    // 400
    }                                                                              // Fin if

    const hashedPassword = await bcrypt.hash(newPassword, 10);                     // Hashea nueva
    user.password = hashedPassword;                                                // Asigna hash
    await user.save();                                                             // Persiste

    return res.status(200).json({ message: 'Contraseña cambiada correctamente' }); // 200
  } catch (error) {                                                                // Errores
    console.error('Error al cambiar contraseña:', error);                          // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin updateUserPassword

// -----------------------------------------------------------------------------
// ========== OBTENER TODOS LOS USUARIOS (sin campos sensibles) ==========
// -----------------------------------------------------------------------------
exports.getAllUsers = async (req, res) => {                                        // Handler listado
  try {                                                                            // Bloque principal
    const users = await User.find()                                                // Trae todos
      .select('-password -resetToken -resetTokenExpires -token');                  // Excluye sensibles
    return res.status(200).json(users);                                            // 200 con lista
  } catch (error) {                                                                // Errores
    console.error('Error al obtener usuarios:', error);                            // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500
  }                                                                                // Fin catch
};                                                                                 // Fin getAllUsers

// -----------------------------------------------------------------------------
// ========== ACTUALIZAR USUARIO POR ID ==========
// -----------------------------------------------------------------------------
exports.updateUserById = async (req, res) => {                                     // Handler update por id
  const userId = req.params.id;                                                    // Id de URL
  const { firstName, lastName, email, phone, role } = req.body;                    // Campos

  if (email && !isValidEmail(email)) {                                             // Valida email si viene
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400
  }                                                                                // Fin if

  try {                                                                            // Bloque principal
    const user = await User.findById(userId);                                      // Busca usuario
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404

    if (firstName) user.firstName = String(firstName).trim();                      // Nombre
    if (lastName)  user.lastName  = String(lastName).trim();                       // Apellido
    if (typeof phone !== 'undefined') user.phone = String(phone).trim();           // Teléfono
    if (email) user.email = normalizeEmail(email);                                 // Email normalizado

    if (role) {                                                                     // Cambio de rol (opcional)
      if (!ALLOWED_ROLES.includes(role)) {                                          // Valida whitelist
        return res.status(400).json({ message: 'Rol inválido' });                   // 400
      }                                                                             // Fin if
      user.role = role;                                                             // Asigna
    }                                                                               // Fin if

    await user.save();                                                              // Persiste

    return res.status(200).json({                                                   // Respuesta 200
      message: 'Usuario actualizado correctamente',                                  // Mensaje
      user: toSafeUser(user)                                                        // Usuario seguro
    });                                                                             // Fin res
  } catch (error) {                                                                 // Errores
    console.error('Error al actualizar usuario:', error);                           // Log técnico
    if (error?.code === 11000)                                                     // Duplicidad
      return res.status(409).json({ message: 'El correo ya está registrado' });     // 409
    if (error?.name === 'ValidationError')                                          // Validación
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400
    return res.status(500).json({ message: 'Error interno del servidor' });         // 500
  }                                                                                 // Fin catch
};                                                                                  // Fin updateUserById

// -----------------------------------------------------------------------------
// ========== ELIMINAR USUARIO POR ID (RESTRICT + limpieza de team) ==========
// -----------------------------------------------------------------------------
exports.deleteUserById = async (req, res) => {                                     // Handler delete + integridad
  const userId = req.params.id;                                                    // Id URL

  const session = await mongoose.startSession();                                   // Abre sesión
  session.startTransaction();                                                      // Inicia tx
  try {                                                                            // Bloque principal
    const user = await User.findById(userId).session(session);                     // Busca dentro de tx
    if (!user) {                                                                   // Si no existe
      await session.abortTransaction();                                            // Revierte
      session.endSession();                                                        // Cierra
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404
    }                                                                              // Fin if

    const owns = await Proyectos.exists({ owner: userId }).session(session);       // ¿Es owner?
    if (owns) {                                                                    // Si posee proyectos
      await session.abortTransaction();                                            // Revierte
      session.endSession();                                                        // Cierra
      return res.status(409).json({                                                // RESTRICT (409)
        message: 'No se puede eliminar: el usuario es owner de uno o más proyectos. Reasigna el owner y vuelve a intentar.'
      });                                                                          // Fin json
    }                                                                              // Fin if

    await Proyectos.updateMany(                                                    // Limpia team
      { team: userId },                                                            // Donde aparece
      { $pull: { team: userId } },                                                 // Lo saca del array
      { session }                                                                  // Dentro de tx
    );                                                                             // Fin updateMany

    await User.findByIdAndDelete(userId).session(session);                         // Elimina usuario

    await session.commitTransaction();                                             // Confirma tx
    session.endSession();                                                          // Cierra sesión

    return res.status(200).json({ message: 'Usuario eliminado correctamente' });   // 200
  } catch (error) {                                                                // Errores
    await session.abortTransaction();                                              // Revierte tx
    session.endSession();                                                          // Cierra sesión
    console.error('Error al eliminar usuario:', error);                            // Log técnico
    return res.status(500).json({ message: 'Error al eliminar usuario' });         // 500
  }                                                                                // Fin catch
};                                                                                 // Fin deleteUserById
