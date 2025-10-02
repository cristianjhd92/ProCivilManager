// File: BackEnd/controllers/userController.js                                      // Ruta del archivo
// Descripción: Controlador de usuarios con normalización de email, unicidad,       // Resumen del propósito
// manejo de contraseñas y JWT, y reglas de integridad referencial con Proyectos.   // Incluye RESTRICT al eliminar owners y $pull en team

const User = require('../models/User');                                            // Importa el modelo User
const Proyectos = require('../models/Proyectos');                                  // Importa el modelo Proyectos (para validaciones FK)
const bcrypt = require('bcryptjs');                                                // Librería para hash de contraseñas
const { sendPasswordResetEmail, sendWelcomeEmail } = require("../services/ServiceEmail"); // Servicio de envío de correos
const crypto = require('crypto');                                                  // Utilidad para generar tokens aleatorios
const jwt = require('jsonwebtoken');                                               // Librería para emitir y verificar JWT
const mongoose = require('mongoose');                                              // Mongoose (para sesiones/transacciones)

// -----------------------------------------------------------------------------
// Helpers y constantes
// -----------------------------------------------------------------------------

const isValidEmail = (email) => /^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(String(email)); // Valida formato básico de email
const normalizeEmail = (email) => (typeof email === 'string'                       // Normaliza email a lower + trim
  ? email.trim().toLowerCase()
  : email);                                                                         // Si no es string, retorna tal cual

const assignRoleFromEmail = (email) => {                                           // Asigna rol según dominio del correo
  if (email.endsWith('@procivilmanager.com')) return 'admin';                      // Dominio interno → admin
  if (email.endsWith('@constructoramd.com')) return 'lider de obra';               // Dominio aliado → líder de obra
  return 'cliente';                                                                // Resto → cliente
};                                                                                 // Cierra assignRoleFromEmail

const getRedirectPath = (email) => {                                               // Determina ruta post-login
  if (email.endsWith('@procivilmanager.com')) return '/admin';                     // Admin → /admin
  if (email.endsWith('@constructoramd.com')) return '/proyectos';                  // Líder → /proyectos
  return '/';                                                                      // Otros → /
};                                                                                 // Cierra getRedirectPath

const ALLOWED_ROLES = ['cliente', 'lider de obra', 'admin'];                       // Lista blanca de roles válidos

// -----------------------------------------------------------------------------
// ========== REGISTRO ==========
// -----------------------------------------------------------------------------
exports.register = async (req, res) => {                                           // Handler de registro de usuario
  const { firstName, lastName, email, phone, password } = req.body;                // Extrae campos del body

  if (!firstName || !lastName || !email || !phone || !password) {                  // Valida presencia de campos
    return res.status(400).json({ message: 'Todos los campos son obligatorios' }); // Responde 400 si falta algo
  }                                                                                // Cierra if de presencia

  if (!isValidEmail(email)) {                                                      // Valida formato de email
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400 si formato inválido
  }                                                                                // Cierra if email

  if (String(password).length < 6) {                                               // Valida longitud mínima de contraseña
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' }); // 400 si muy corta
  }                                                                                // Cierra if password

  try {                                                                            // Bloque try para manejo de errores
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const existingUser = await User.findOne({ email: normalizedEmail });           // Busca duplicado por email
    if (existingUser) {                                                            // Si ya existe
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409 por conflicto de unicidad
    }                                                                              // Cierra if duplicado

    const hashedPassword = await bcrypt.hash(password, 10);                        // Genera hash de contraseña
    const role = assignRoleFromEmail(normalizedEmail);                             // Determina rol por dominio

    const user = new User({                                                        // Construye documento User
      firstName: String(firstName).trim(),                                         // Normaliza nombre
      lastName: String(lastName).trim(),                                           // Normaliza apellido
      email: normalizedEmail,                                                      // Email normalizado
      phone: phone ? String(phone).trim() : '',                                    // Teléfono normalizado (opcional)
      password: hashedPassword,                                                    // Contraseña hasheada
      role,                                                                        // Rol asignado
      token: null,                                                                 // Token persistente (no usado)
    });                                                                            // Cierra new User

    await user.save();                                                             // Persiste en MongoDB

    try {                                                                          // Intenta enviar correo de bienvenida
      await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);    // Envío de email (no crítico)
    } catch (emailError) {                                                         // Si falla el email
      console.warn('Advertencia: error al enviar correo de bienvenida:', emailError); // Log de advertencia
    }                                                                              // Cierra catch del email

    return res.status(201).json({ message: 'Usuario registrado correctamente', user }); // 201 con el usuario creado
  } catch (error) {                                                                // Captura de errores
    console.error('Error en el registro:', error);                                 // Log técnico
    if (error?.code === 11000) {                                                   // Código Mongo para duplicidad
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409 si rompió índice único
    }                                                                              // Cierra if duplicidad
    if (error?.name === 'ValidationError') {                                       // Error de validación de Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400 con detalles
    }                                                                              // Cierra if ValidationError
    return res.status(500).json({ message: 'Error al registrar el usuario' });     // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra register

// -----------------------------------------------------------------------------
// ========== LOGIN ==========
// -----------------------------------------------------------------------------
exports.login = async (req, res) => {                                              // Handler de login
  const { email, password } = req.body;                                            // Extrae credenciales

  if (!email || !password) {                                                       // Valida presencia
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios' }); // 400 si falta uno
  }                                                                                // Cierra if

  try {                                                                            // Bloque principal
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const user = await User.findOne({ email: normalizedEmail });                   // Busca usuario por email
    if (!user) {                                                                   // Si no existe
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404 no encontrado
    }                                                                              // Cierra if !user

    const isMatch = await bcrypt.compare(password, user.password);                 // Compara contraseña con hash
    if (!isMatch) {                                                                // Si no coincide
      return res.status(401).json({ message: 'Contraseña incorrecta' });           // 401 no autorizado
    }                                                                              // Cierra if !isMatch

    const token = jwt.sign(                                                        // Firma JWT
      { id: user._id, email: user.email, role: user.role },                        // Payload con datos mínimos
      process.env.JWT_SECRET,                                                      // Clave secreta del .env
      { expiresIn: '1h' }                                                          // Expiración 1 hora
    );                                                                             // Cierra jwt.sign

    const redirectTo = getRedirectPath(user.email);                                // Determina ruta post-login

    return res.status(200).json({                                                  // Respuesta OK
      message: 'Inicio de sesión exitoso',                                         // Mensaje
      user,                                                                        // Usuario (sin password por select del modelo)
      token,                                                                       // Token JWT
      redirectTo                                                                   // Ruta de redirección sugerida
    });                                                                            // Cierra res
  } catch (error) {                                                                // Captura de errores
    console.error('Error en el login:', error);                                    // Log técnico
    return res.status(500).json({ message: 'Error al iniciar sesión' });           // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra login

// -----------------------------------------------------------------------------
// ========== RECUPERAR CONTRASEÑA ==========
// -----------------------------------------------------------------------------
exports.forgotPassword = async (req, res) => {                                     // Handler de solicitud de reset
  const { email } = req.body;                                                      // Extrae email

  if (!email || !isValidEmail(email)) {                                            // Valida formato
    return res.status(400).json({ msg: 'Correo electrónico inválido.' });          // 400 si inválido
  }                                                                                // Cierra if

  try {                                                                            // Bloque principal
    const normalizedEmail = normalizeEmail(email);                                 // Normaliza email
    const user = await User.findOne({ email: normalizedEmail });                   // Busca usuario
    if (!user) {                                                                   // Si no existe
      return res.status(404).json({ msg: 'No existe una cuenta con ese correo.' });// 404
    }                                                                              // Cierra if !user

    const token = crypto.randomBytes(32).toString('hex');                          // Genera token aleatorio
    const expiresAt = new Date(Date.now() + 3600000);                              // Expira en 1 hora

    user.resetToken = token;                                                       // Asigna token
    user.resetTokenExpires = expiresAt;                                            // Asigna expiración
    await user.save();                                                             // Persiste cambios

    await sendPasswordResetEmail(user.email, token, expiresAt);                    // Envía correo con instrucciones
    return res.status(200).json({ msg: 'Correo de recuperación enviado con éxito.' }); // 200 OK
  } catch (err) {                                                                  // Captura errores
    console.error('forgotPassword error:', err);                                   // Log técnico
    return res.status(500).json({ msg: 'Error interno del servidor.' });           // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra forgotPassword

// -----------------------------------------------------------------------------
// ========== RESET DE CONTRASEÑA ==========
// -----------------------------------------------------------------------------
exports.resetPassword = async (req, res) => {                                      // Handler de reset de contraseña
  const { token } = req.params;                                                    // Toma token desde URL
  const { newPassword } = req.body;                                                // Toma nueva contraseña

  if (!newPassword || String(newPassword).length < 6) {                            // Valida longitud
    return res.status(400).json({ msg: 'La nueva contraseña debe tener al menos 6 caracteres.' }); // 400
  }                                                                                // Cierra if

  try {                                                                            // Bloque principal
    const user = await User.findOne({                                              // Busca usuario con token válido
      resetToken: token,                                                           // Token igual
      resetTokenExpires: { $gt: new Date() },                                      // No expirado
    });                                                                            // Cierra findOne

    if (!user) {                                                                   // Si no encuentra
      return res.status(400).json({ msg: 'Token inválido o expirado.' });          // 400
    }                                                                              // Cierra if !user

    const hashedPassword = await bcrypt.hash(newPassword, 10);                     // Hashea nueva contraseña
    user.password = hashedPassword;                                                // Asigna nueva contraseña
    user.resetToken = null;                                                        // Limpia token
    user.resetTokenExpires = null;                                                 // Limpia expiración
    await user.save();                                                             // Persiste

    return res.status(200).json({ msg: 'Contraseña actualizada correctamente.' }); // 200 OK
  } catch (err) {                                                                  // Captura de errores
    console.error('resetPassword error:', err);                                    // Log técnico
    return res.status(500).json({ msg: 'Error interno del servidor.' });           // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra resetPassword

// -----------------------------------------------------------------------------
// ========== OBTENER PERFIL DE USUARIO ==========
// -----------------------------------------------------------------------------
exports.getUserProfile = async (req, res) => {                                     // Handler para obtener perfil
  try {                                                                            // Bloque principal
    const user = await User.findById(req.user.id)                                  // Busca por id del token
      .select('-password -resetToken -resetTokenExpires');                         // Excluye campos sensibles
    if (!user) {                                                                   // Si no existe
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404
    }                                                                              // Cierra if !user
    return res.status(200).json(user);                                             // 200 con el usuario
  } catch (error) {                                                                // Captura de errores
    console.error('Error al obtener perfil de usuario:', error);                   // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra getUserProfile

// -----------------------------------------------------------------------------
// ========== ACTUALIZAR PERFIL ==========
// -----------------------------------------------------------------------------
exports.updateUserProfile = async (req, res) => {                                  // Handler para actualizar perfil propio
  try {                                                                            // Bloque principal
    const userId = req.user.id;                                                    // Id desde el token
    const { firstName, lastName, email, phone } = req.body;                        // Campos que se pueden actualizar

    if (email && !isValidEmail(email)) {                                           // Valida email si viene
      return res.status(400).json({ message: 'Correo electrónico inválido' });     // 400 si inválido
    }                                                                              // Cierra if

    const user = await User.findById(userId);                                      // Busca usuario actual
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404 si no existe

    if (firstName) user.firstName = String(firstName).trim();                      // Actualiza nombre (limpio)
    if (lastName)  user.lastName  = String(lastName).trim();                       // Actualiza apellido (limpio)
    if (typeof phone !== 'undefined') user.phone = String(phone).trim();           // Actualiza teléfono si viene

    if (email) {                                                                   // Si viene email
      const normalizedEmail = normalizeEmail(email);                               // Normaliza
      user.email = normalizedEmail;                                                // Asigna
    }                                                                              // Cierra if email

    await user.save();                                                             // Persiste cambios

    return res.status(200).json({ message: 'Información actualizada correctamente', user }); // 200 OK
  } catch (error) {                                                                // Captura de errores
    console.error('Error al actualizar perfil:', error);                           // Log técnico
    if (error?.code === 11000)                                                     // 11000 duplicidad
      return res.status(409).json({ message: 'El correo ya está registrado' });    // 409 conflicto
    if (error?.name === 'ValidationError')                                         // Validación Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400 con detalles
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra updateUserProfile

// -----------------------------------------------------------------------------
// ========== CAMBIAR CONTRASEÑA ==========
// -----------------------------------------------------------------------------
exports.updateUserPassword = async (req, res) => {                                 // Handler para cambiar contraseña propia
  try {                                                                            // Bloque principal
    const userId = req.user.id;                                                    // Id desde token
    const { currentPassword, newPassword } = req.body;                             // Toma passwords

    if (!currentPassword || !newPassword) {                                        // Requiere ambos
      return res.status(400).json({ message: 'Por favor ingresa la contraseña actual y la nueva.' }); // 400
    }                                                                              // Cierra if
    if (String(newPassword).length < 6) {                                          // Valida longitud mínima
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' }); // 400
    }                                                                              // Cierra if

    const user = await User.findById(userId);                                      // Busca usuario
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404 si no existe

    const isMatch = await bcrypt.compare(currentPassword, user.password);          // Compara contraseña actual
    if (!isMatch) {                                                                // Si no coincide
      return res.status(400).json({ message: 'Contraseña actual incorrecta.' });   // 400
    }                                                                              // Cierra if

    const hashedPassword = await bcrypt.hash(newPassword, 10);                     // Hashea nueva contraseña
    user.password = hashedPassword;                                                // Asigna hash
    await user.save();                                                             // Persiste

    return res.status(200).json({ message: 'Contraseña cambiada correctamente.' });// 200 OK
  } catch (error) {                                                                // Captura de errores
    console.error('Error al cambiar contraseña:', error);                          // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra updateUserPassword

// -----------------------------------------------------------------------------
// ========== OBTENER TODOS LOS USUARIOS (sin campos sensibles) ==========
// -----------------------------------------------------------------------------
exports.getAllUsers = async (req, res) => {                                        // Handler para listar usuarios
  try {                                                                            // Bloque principal
    const users = await User.find()                                                // Busca todos
      .select('-password -resetToken -resetTokenExpires -token');                  // Excluye campos sensibles
    return res.status(200).json(users);                                            // 200 OK con la lista
  } catch (error) {                                                                // Captura de errores
    console.error('Error al obtener usuarios:', error);                            // Log técnico
    return res.status(500).json({ message: 'Error interno del servidor' });        // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra getAllUsers

// -----------------------------------------------------------------------------
// ========== ACTUALIZAR USUARIO POR ID ==========
// -----------------------------------------------------------------------------
exports.updateUserById = async (req, res) => {                                     // Handler para actualizar usuario por id
  const userId = req.params.id;                                                    // Toma id de la URL
  const { firstName, lastName, email, phone, role } = req.body;                    // Extrae campos a actualizar

  if (email && !isValidEmail(email)) {                                             // Valida email si viene
    return res.status(400).json({ message: 'Correo electrónico inválido' });       // 400 si inválido
  }                                                                                // Cierra if

  try {                                                                            // Bloque principal
    const user = await User.findById(userId);                                      // Busca usuario por id
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });  // 404 si no existe

    if (firstName) user.firstName = String(firstName).trim();                      // Actualiza nombre
    if (lastName)  user.lastName  = String(lastName).trim();                       // Actualiza apellido
    if (typeof phone !== 'undefined') user.phone = String(phone).trim();           // Actualiza teléfono
    if (email) user.email = normalizeEmail(email);                                  // Normaliza y asigna email

    if (role) {                                                                     // Si se intenta cambiar el rol
      if (!ALLOWED_ROLES.includes(role)) {                                          // Valida contra la whitelist
        return res.status(400).json({ message: 'Rol inválido' });                   // 400 si no está permitido
      }                                                                             // Cierra if whitelist
      user.role = role;                                                             // Asigna rol válido
    }                                                                               // Cierra if role

    await user.save();                                                              // Persiste cambios

    return res.status(200).json({ message: 'Usuario actualizado correctamente', user }); // 200 OK
  } catch (error) {                                                                 // Captura de errores
    console.error('Error al actualizar usuario:', error);                           // Log técnico
    if (error?.code === 11000)                                                     // Duplicidad (email)
      return res.status(409).json({ message: 'El correo ya está registrado' });     // 409 conflicto
    if (error?.name === 'ValidationError')                                          // Validación Mongoose
      return res.status(400).json({ message: 'Datos inválidos', details: error.errors }); // 400 con detalles
    return res.status(500).json({ message: 'Error interno del servidor' });         // 500 genérico
  }                                                                                 // Cierra catch
};                                                                                  // Cierra updateUserById

// -----------------------------------------------------------------------------
// ========== ELIMINAR USUARIO POR ID (RESTRICT + limpieza de team) ==========
// -----------------------------------------------------------------------------
exports.deleteUserById = async (req, res) => {                                     // Handler para eliminar usuario con integridad
  const userId = req.params.id;                                                    // Toma id desde URL

  const session = await mongoose.startSession();                                   // Inicia una sesión de Mongo
  session.startTransaction();                                                      // Inicia la transacción
  try {                                                                            // Bloque principal
    const user = await User.findById(userId).session(session);                     // Busca el usuario dentro de la sesión
    if (!user) {                                                                   // Si no existe
      await session.abortTransaction();                                            // Revierte transacción
      session.endSession();                                                        // Cierra sesión
      return res.status(404).json({ message: 'Usuario no encontrado' });           // 404
    }                                                                              // Cierra if !user

    const owns = await Proyectos.exists({ owner: userId }).session(session);       // Verifica si es owner de algún proyecto
    if (owns) {                                                                    // Si posee proyectos
      await session.abortTransaction();                                            // Revierte
      session.endSession();                                                        // Cierra
      return res.status(409).json({                                                // Responde 409 (RESTRICT)
        message: 'No se puede eliminar: el usuario es owner de uno o más proyectos. Reasigna el owner y vuelve a intentar.'
      });                                                                          // Cierra json
    }                                                                              // Cierra if owns

    await Proyectos.updateMany(                                                    // Limpia referencias en team
      { team: userId },                                                            // Donde el usuario esté en team
      { $pull: { team: userId } },                                                 // Quítalo del arreglo
      { session }                                                                  // Dentro de la misma sesión
    );                                                                             // Cierra updateMany

    await User.findByIdAndDelete(userId).session(session);                         // Elimina el usuario

    await session.commitTransaction();                                             // Confirma transacción
    session.endSession();                                                          // Cierra sesión

    return res.status(200).json({ message: 'Usuario eliminado correctamente' });   // 200 OK
  } catch (error) {                                                                // Captura de errores
    await session.abortTransaction();                                              // Revierte transacción
    session.endSession();                                                          // Cierra sesión
    console.error('Error al eliminar usuario:', error);                            // Log técnico
    return res.status(500).json({ message: 'Error al eliminar usuario' });         // 500 genérico
  }                                                                                // Cierra catch
};                                                                                 // Cierra deleteUserById
