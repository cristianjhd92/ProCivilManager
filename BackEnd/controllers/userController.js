const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { sendPasswordResetEmail, sendWelcomeEmail  } = require("../services/ServiceEmail");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Función para asignar rol basado en el email
const assignRoleFromEmail = (email) => {
  if (email.endsWith('@procivilmanager.com')) return 'admin';  
  if (email.endsWith('@constructoramd.com')) return 'lider de obra';  
  return 'cliente';
};

// Función para determinar redirección después del login
const getRedirectPath = (email) => {
  if (email.endsWith('@procivilmanager.com')) return '/admin';
  if (email.endsWith('@constructoramd.com')) return '/proyectos';
  return '/';
};

// ========== REGISTRO ==========
exports.register = async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  // Validaciones básicas
  if (!firstName || !lastName || !email || !phone || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  if (!/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email)) {
    return res.status(400).json({ msseage: 'Correo electrónico inválido' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'El correo ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = assignRoleFromEmail(email);

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role,
      token: null,
    });

    await user.save();

    try {
      await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);
    } catch (emailError) {
      console.error('Error al enviar correo de bienvenida:', emailError);
    }

    res.status(201).json({ message: 'Usuario registrado correctamente', user });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};

// ========== LOGIN ==========
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validaciones
  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Contraseña incorrecta' });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const redirectTo = getRedirectPath(email);

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user,
      token,
      redirectTo,
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

// ========== RECUPERAR CONTRASEÑA ==========
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ msg: "Correo electrónico inválido." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "No existe una cuenta con ese correo." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    user.resetToken = token;
    user.resetTokenExpires = expiresAt;
    await user.save();

    await sendPasswordResetEmail(user.email, token, expiresAt);

    return res.status(200).json({ msg: "Correo de recuperación enviado con éxito." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
};

// ========== RESET DE CONTRASEÑA ==========
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ msg: "La nueva contraseña debe tener al menos 6 caracteres." });
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Token inválido o expirado." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;

    await user.save();

    return res.status(200).json({ msg: "Contraseña actualizada correctamente." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error interno del servidor." });
  }
};

// ========== OBTENER PERFIL DE USUARIO ==========
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetToken -resetTokenExpires');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error al obtener perfil de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ========== ACTUALIZAR PERFIL ==========
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, phone } = req.body;

    if (email && !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email)) {
      return res.status(400).json({ message: 'Correo electrónico inválido' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phone = phone || user.phone;

    await user.save();

    res.status(200).json({ message: 'Información actualizada correctamente', user });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ========== CAMBIAR CONTRASEÑA ==========
exports.updateUserPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Por favor ingresa la contraseña actual y la nueva.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Contraseña cambiada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


// Obtener todos los usuarios (sin contraseña ni tokens)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -resetToken -resetTokenExpires -token');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar usuario por id
exports.updateUserById = async (req, res) => {
  const userId = req.params.id;
  const { firstName, lastName, email, phone, role } = req.body;

  if (email && !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email)) {
    return res.status(400).json({ message: 'Correo electrónico inválido' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    if (role) user.role = role; // opcional actualizar rol

    await user.save();

    res.status(200).json({ message: 'Usuario actualizado correctamente', user });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar usuario por id
exports.deleteUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
