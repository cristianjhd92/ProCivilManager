// File: BackEnd/src/modules/users/controllers/usuario.controlador.js
// Description: Controlador de usuarios para registro, login, perfil y
//              operaciones administrativas (listado, actualización y
//              eliminación lógica). Maneja bloqueo por intentos fallidos,
//              recuperación de contraseña y roles (admin / líder / cliente).

const User = require('../models/usuario.modelo');                         // Modelo Mongoose de usuarios.
// Importamos modelos adicionales para validar relaciones al eliminar usuarios.
// Proyectos se utiliza para verificar si un usuario está asignado como líder o
// como cliente en alguna obra vigente. El modelo Solicitud permite detectar
// solicitudes de proyecto pendientes o en historial que amarran al cliente.
const Proyectos = require('../../projects/models/proyecto.modelo');
const Solicitud = require('../../requests/models/solicitud.modelo');
const bcrypt = require('bcryptjs');                                       // Librería para encriptar y comparar contraseñas.
const {
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require('../../../core/services/correo.servicio');                   // Servicios de correo electrónico (bienvenida y recuperación).
const crypto = require('crypto');                                         // Generador de tokens aleatorios para reset de contraseña.
const jwt = require('jsonwebtoken');                                      // Librería para generar y verificar JWT.
const roleConfig = require('../../../config/roles.json');                 // Configuración de roles por dominio de correo.

// ================================================================
// Helper: construir un objeto de usuario "seguro" para el frontend
//         (sin contraseña ni campos sensibles).
// ================================================================
const buildSafeUser = (user) => {
  // Si por alguna razón el usuario viene null/undefined, devolvemos null.
  if (!user) return null;

  return {
    id: user._id,                                                         // Exponemos el identificador como "id" (más amigable en front).
    firstName: user.firstName,                                            // Nombres.
    lastName: user.lastName,                                              // Apellidos.
    email: user.email,                                                    // Correo electrónico.
    phone: user.phone,                                                    // Teléfono.
    role: user.role,                                                      // Rol de la cuenta (admin | lider de obra | cliente).
    nombreCompleto: user.nombreCompleto,                                  // Virtual definido en el modelo (firstName + lastName).
  };
};

// ================================================================
// Helper: validar complejidad de contraseña
//  - Al menos 8 caracteres
//  - Al menos 1 mayúscula
//  - Al menos 1 minúscula
//  - Al menos 1 número
//  - Al menos 1 carácter especial
// ================================================================
const isPasswordComplex = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*\.\,\?\-_])[A-Za-z\d!@#\$%\^&\*\.\,\?\-_]{8,}$/;
  return regex.test(password);                                            // Devuelve true si cumple el patrón.
};

// ================================================================
// Helper: asignar rol automático a partir del email según roles.json
//  - Si el dominio está configurado → usa el rol definido.
//  - Si no, usa el rol por defecto (default) o 'cliente'.
// ================================================================
const assignRoleFromEmail = (email) => {
  const lower = email.toLowerCase();                                      // Normalizamos a minúsculas.
  const domains = Object.keys(roleConfig);                                // Obtenemos los dominios configurados.

  for (const domain of domains) {                                         // Recorremos cada dominio configurado.
    if (domain !== 'default' && lower.endsWith(domain)) {                 // Si el correo termina en ese dominio (y no es la clave default).
      return roleConfig[domain];                                          // Devolvemos el rol asociado al dominio.
    }
  }

  // Si no coincide ningún dominio específico, devolvemos el rol por defecto.
  return roleConfig['default'] || 'cliente';
};

// ================================================================
// Helper: determinar la ruta de redirección después del login
//  🔹 Se basa en el ROL REAL del usuario, no en el email.
// ================================================================
const getRedirectPath = (role) => {
  // Para admin, líder de obra y cliente usamos el mismo dashboard base (/admin).
  if (role === 'admin' || role === 'lider de obra' || role === 'cliente') {
    return '/admin';
  }

  // Para otros roles futuros o no previstos, redirigimos a raíz.
  return '/';
};

// ================================================================
// REGISTRO DE USUARIO
// ================================================================
exports.register = async (req, res) => {
  // Extraemos datos desde el body.
  let { firstName, lastName, email, phone, password } = req.body;

  // Validaciones básicas de presencia.
  if (!firstName || !lastName || !email || !phone || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  // Normalizamos correo (minúsculas) y teléfono (solo dígitos).
  email = email.toLowerCase().trim();
  phone = phone.replace(/[^\d]/g, '');

  // Validar formato básico de correo.
  if (!/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email)) {
    return res.status(400).json({ message: 'Correo electrónico inválido' });
  }

  // Validar complejidad de contraseña según política.
  if (!isPasswordComplex(password)) {
    return res.status(400).json({
      message:
        'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.',
    });
  }

  try {
    // Verificar si ya existe un usuario con ese correo (aunque esté eliminado lógicamente,
    // la restricción unique del modelo igual lo bloquearía).
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    // Encriptar la contraseña antes de guardar.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Asignar rol automáticamente según el dominio del correo.
    const role = assignRoleFromEmail(email);

    // Crear instancia del modelo User con los datos normalizados.
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      role,
      token: null,                                                       // Campo legacy, se deja null.
    });

    // Guardar el usuario en la base de datos.
    await user.save();

    // Construir objeto seguro para devolver al frontend.
    const safeUser = buildSafeUser(user);

    // Intentar enviar correo de bienvenida (no bloquea el flujo si falla).
    try {
      await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);
    } catch (emailError) {
      console.error('Error al enviar correo de bienvenida:', emailError);
    }

    // Respuesta al cliente con usuario "limpio".
    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: safeUser,
    });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
};

// ================================================================
// LOGIN DE USUARIO
// ================================================================
exports.login = async (req, res) => {
  // Extraemos credenciales desde el body.
  let { email, password } = req.body;

  // Validar presencia de correo y contraseña.
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Correo y contraseña son obligatorios' });
  }

  // Normalizamos correo a minúsculas.
  email = email.toLowerCase().trim();

  try {
    // Buscar usuario por correo y que NO esté eliminado lógicamente.
    const user = await User.findOne({ email, isDeleted: false });

    // Mensaje genérico para no revelar si el usuario existe o no.
    const invalidMsg = 'Credenciales inválidas';

    // Si no se encuentra usuario → error genérico.
    if (!user) {
      return res.status(401).json({ message: invalidMsg });
    }

    // Si la cuenta está bloqueada (status = false), revisar si ya se cumplió el tiempo de gracia.
    if (!user.status) {
      // Si hay fecha del último intento fallido y han pasado más de 15 minutos, desbloqueamos.
      if (
        user.lastFailedLoginAt &&
        Date.now() - new Date(user.lastFailedLoginAt).getTime() >
          15 * 60 * 1000
      ) {
        user.status = true;                                              // Rehabilitamos la cuenta.
        user.loginAttempts = 0;                                          // Reiniciamos contador de intentos.
        await user.save();
      } else {
        // Si aún no ha pasado el tiempo de gracia, se mantiene bloqueada.
        return res.status(403).json({
          message:
            'Cuenta bloqueada. Restablece tu contraseña o espera 15 minutos para intentar de nuevo.',
        });
      }
    }

    // Comparar contraseña ingresada con el hash guardado en base de datos.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Incrementar intentos fallidos.
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      user.lastFailedLoginAt = new Date();

      // Si llega a 3 intentos fallidos, se bloquea la cuenta.
      if (user.loginAttempts >= 3) {
        user.status = false;
        await user.save();
        return res.status(403).json({
          message:
            'Cuenta bloqueada por múltiples intentos fallidos. Restablece tu contraseña o espera 15 minutos para intentar de nuevo.',
        });
      }

      // Guardar cambios y devolver mensaje de credenciales inválidas.
      await user.save();
      return res.status(401).json({ message: invalidMsg });
    }

    // Si la contraseña es correcta, reiniciamos intentos y limpiamos la marca de fallo.
    user.loginAttempts = 0;
    user.lastFailedLoginAt = null;
    await user.save();

    // Generar JWT con los datos esenciales del usuario.
    const token = jwt.sign(
      {
        id: user._id,                                                   // ID de usuario.
        email: user.email,                                              // Correo.
        role: user.role,                                                // Rol actual.
      },
      process.env.JWT_SECRET,                                           // Clave secreta definida en .env.
      { expiresIn: '1h' }                                               // Duración del token.
    );

    // Determinar ruta de redirección según el ROL del usuario.
    const redirectTo = getRedirectPath(user.role);

    // Construir usuario seguro para frontend.
    const safeUser = buildSafeUser(user);

    // Responder con login exitoso, token y ruta de redirección.
    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: safeUser,
      token,
      redirectTo,
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

// ================================================================
// RECUPERAR CONTRASEÑA (solicitar email con enlace de reset)
// ================================================================
exports.forgotPassword = async (req, res) => {
  const rawEmail = req.body.email;                                       // Correo sobre el que se solicita recuperación.

  // Validación básica de correo.
  if (!rawEmail || !rawEmail.includes('@')) {
    return res.status(400).json({ msg: 'Correo electrónico inválido.' });
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    // Buscar usuario por correo y que no esté eliminado lógicamente.
    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return res
        .status(404)
        .json({ msg: 'No existe una cuenta activa con ese correo.' });
    }

    // Generar token aleatorio de 32 bytes (hex).
    const token = crypto.randomBytes(32).toString('hex');
    // Token válido por 1 hora desde ahora.
    const expiresAt = new Date(Date.now() + 3600000);

    // Guardar token y fecha de expiración en el usuario.
    user.resetToken = token;
    user.resetTokenExpires = expiresAt;
    await user.save();

    // Enviar correo de recuperación al usuario.
    await sendPasswordResetEmail(user.email, token, expiresAt);

    return res
      .status(200)
      .json({ msg: 'Correo de recuperación enviado con éxito.' });
  } catch (err) {
    console.error('Error en forgotPassword:', err);
    res.status(500).json({ msg: 'Error interno del servidor.' });
  }
};

// ================================================================
// RESET DE CONTRASEÑA (cuando el usuario entra desde el enlace)
// ================================================================
exports.resetPassword = async (req, res) => {
  const { token } = req.params;                                          // Token de reset que viene en la URL.
  const { newPassword } = req.body;                                      // Nueva contraseña elegida por el usuario.

  // Validar longitud mínima (aquí se exige 8, se podría unificar con isPasswordComplex).
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      msg: 'La nueva contraseña debe tener al menos 8 caracteres.',
    });
  }

  try {
    // Buscar usuario con ese token y que no haya expirado.
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },                            // Fecha de expiración posterior a ahora.
    });

    if (!user) {
      return res.status(400).json({ msg: 'Token inválido o expirado.' });
    }

    // Encriptar la nueva contraseña.
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar campos de reset.
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;

    // Desbloquear la cuenta y resetear intentos fallidos.
    user.loginAttempts = 0;
    user.status = true;

    await user.save();

    return res.status(200).json({
      msg: 'Contraseña actualizada y cuenta desbloqueada correctamente.',
    });
  } catch (err) {
    console.error('Error en resetPassword:', err);
    return res.status(500).json({ msg: 'Error interno del servidor.' });
  }
};

// ================================================================
// OBTENER PERFIL DE USUARIO AUTENTICADO
// ================================================================
exports.getUserProfile = async (req, res) => {
  try {
    // Buscar usuario por ID del token y excluir campos sensibles (se refuerza
    // además lo que ya hace el toJSON del modelo).
    const user = await User.findById(req.user.id).select(
      '-password -resetToken -resetTokenExpires -token'
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Devolvemos el documento (el front recibe también el virtual nombreCompleto).
    res.status(200).json(user);
  } catch (error) {
    console.error('Error al obtener perfil de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ================================================================
// ACTUALIZAR PERFIL DEL USUARIO AUTENTICADO
// ================================================================
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;                                         // ID del usuario autenticado.
    const { firstName, lastName, email, phone } = req.body;             // Datos a actualizar.

    // Si viene email, validamos formato.
    if (email && !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email.toLowerCase())) {
      return res.status(400).json({ message: 'Correo electrónico inválido' });
    }

    // Buscar usuario en base de datos.
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar campos si se enviaron; si no, mantener los existentes.
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;

    // Normalizar correo y teléfono si se proporcionan.
    user.email = email ? email.toLowerCase().trim() : user.email;
    user.phone = phone ? phone.replace(/[^\d]/g, '') : user.phone;

    // Guardar cambios.
    await user.save();

    // Construir usuario seguro para devolver al frontend.
    const safeUser = buildSafeUser(user);

    res.status(200).json({
      message: 'Información actualizada correctamente',
      user: safeUser,
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ================================================================
// CAMBIAR CONTRASEÑA DESDE EL PERFIL (USUARIO AUTENTICADO)
// ================================================================
exports.updateUserPassword = async (req, res) => {
  try {
    const userId = req.user.id;                                         // ID del usuario autenticado.
    const { currentPassword, newPassword } = req.body;                  // Contraseña actual y nueva.

    // Validar que se envíen ambas contraseñas.
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Por favor ingresa la contraseña actual y la nueva.',
      });
    }

    // Validar complejidad de la nueva contraseña.
    if (!isPasswordComplex(newPassword)) {
      return res.status(400).json({
        message:
          'La nueva contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.',
      });
    }

    // Buscar usuario en base de datos.
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que la contraseña actual coincida.
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta.' });
    }

    // Encriptar y guardar la nueva contraseña.
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Contraseña cambiada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ================================================================
// OBTENER TODOS LOS USUARIOS (ADMIN) CON PAGINACIÓN Y BÚSQUEDA
// ================================================================
exports.getAllUsers = async (req, res) => {
  try {
    // Página actual (por defecto 1).
    const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
    // Límite de registros por página (por defecto 10).
    const limit =
      parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 10;
    // Texto de búsqueda (se normaliza a minúsculas).
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';
    // Filtro opcional por rol (?role=cliente|admin|lider de obra).
    const roleFilter = req.query.role ? req.query.role : null;

    // Filtro base: solo usuarios no eliminados lógicamente.
    const filter = { isDeleted: false };

    if (roleFilter) {
      filter.role = roleFilter;
    }

    // Si hay cadena de búsqueda, armamos filtro por nombre, apellido o correo.
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Cálculo del offset para paginación.
    const skip = (page - 1) * limit;

    // Consulta de usuarios con paginación y exclusión de campos sensibles.
    const users = await User.find(filter)
      .select('-password -resetToken -resetTokenExpires -token')
      .skip(skip)
      .limit(limit)
      .exec();

    // Conteo total de usuarios que cumplen el filtro.
    const total = await User.countDocuments(filter);

    // Respuesta con listado y metadatos de paginación.
    res.status(200).json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ================================================================
// ACTUALIZAR USUARIO POR ID (ADMIN)
// ================================================================
exports.updateUserById = async (req, res) => {
  const userId = req.params.id;                                           // ID del usuario a modificar (desde la ruta).
  const { firstName, lastName, email, phone, role } = req.body;          // Datos que pueden actualizarse.

  // Validar formato de correo si viene en la petición.
  if (email && !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email.toLowerCase())) {
    return res.status(400).json({ message: 'Correo electrónico inválido' });
  }

  try {
    // Buscar usuario por ID.
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si se envía un email distinto, verificar que no esté en uso por otro usuario.
    if (email && email.toLowerCase().trim() !== user.email) {
      const exists = await User.findOne({
        email: email.toLowerCase().trim(),
        isDeleted: false,
      });
      if (exists) {
        return res
          .status(400)
          .json({ message: 'Ya existe un usuario con ese correo' });
      }
      user.email = email.toLowerCase().trim();
    }

    // Actualizar nombres y teléfono si se envían.
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone ? phone.replace(/[^\d]/g, '') : user.phone;

    // Si viene un rol, se actualiza (validado por enum del modelo User).
    if (role) {
      user.role = role;
    }

    // Guardar cambios.
    await user.save();

    // Construir usuario seguro para devolver al frontend.
    const safeUser = buildSafeUser(user);

    res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: safeUser,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ================================================================
// ELIMINAR USUARIO POR ID (ELIMINACIÓN LÓGICA, SOLO ADMIN)
// ================================================================
exports.deleteUserById = async (req, res) => {
  const userId = req.params.id;                                           // ID del usuario a eliminar lógicamente.

  try {
    // Buscar usuario por ID.
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Regla de seguridad: no permitir eliminar al último administrador.
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({
        role: 'admin',
        isDeleted: false,
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'No se puede eliminar el último administrador del sistema',
        });
      }
    }

    // Si el usuario es líder de obra o cliente, verificamos primero que no
    // tenga obras o solicitudes asociadas. La eliminación sólo procede si
    // no existen referencias que lo amarren en el sistema.
    const rol = (user.role || '').toLowerCase().trim();
    try {
      // Para líderes de obra: no permitir eliminar si tiene proyectos asignados.
      if (rol === 'lider de obra' || rol === 'líder de obra' || rol.includes('lider')) {
        const obrasAsignadas = await Proyectos.countDocuments({
          lider: user._id,
          isDeleted: { $ne: true },
        });
        if (obrasAsignadas > 0) {
          return res.status(400).json({
            message: `No se puede eliminar el líder de obra porque tiene ${obrasAsignadas} proyecto(s) asignado(s).`,
          });
        }
      }

      // Para clientes: no permitir eliminar si tiene proyectos vinculados o solicitudes
      // de proyecto asociadas. Se cuentan proyectos antiguos que utilicen el correo
      // como identificador y los proyectos nuevos que referencian al cliente.
      if (rol === 'cliente') {
        // Proyectos con referencia directa al cliente.
        const obrasCliente = await Proyectos.countDocuments({
          cliente: user._id,
          isDeleted: { $ne: true },
        });
        // Proyectos legacy que almacenan el correo del cliente.
        const obrasPorCorreo = await Proyectos.countDocuments({
          cliente: { $exists: false },
          email: user.email,
          isDeleted: { $ne: true },
        });
        // Solicitudes de tipo proyecto donde el usuario actuó como solicitante.
        const solicitudesProyecto = await Solicitud.countDocuments({
          tipo: 'proyecto',
          solicitante: user._id,
        });
        const totalEnlazados = obrasCliente + obrasPorCorreo + solicitudesProyecto;
        if (totalEnlazados > 0) {
          return res.status(400).json({
            message: `No se puede eliminar el cliente porque tiene ${totalEnlazados} proyecto(s) o solicitud(es) asociadas.`,
          });
        }
      }
    } catch (errValid) {
      console.error('Error al validar relaciones del usuario:', errValid);
      return res.status(500).json({ message: 'Error al validar referencias de usuario.' });
    }

    // Marcamos el usuario como eliminado (eliminación lógica).
    user.isDeleted = true;
    await user.save();

    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ================================================================
// OBTENER CLIENTES ACTIVOS PARA AUTOCOMPLETE (CORREO DEL CLIENTE)
// ================================================================
// Pensado para el formulario de proyectos:
//  - Lista solo usuarios con rol 'cliente', activos y no eliminados.
//  - Permite filtrar por nombre, apellido o correo (query ?search=...).
//  - Ideal para alimentar el campo "correo del cliente" con autocompletado.
exports.obtenerClientesActivos = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';

    const filter = {
      role: 'cliente',                                                   // Solo clientes.
      isDeleted: false,                                                  // No eliminados lógicamente.
      status: true,                                                      // Cuenta activa.
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const clientes = await User.find(filter)
      .select('firstName lastName email phone role')                      // Suficiente para autocompletar.
      .limit(20)                                                          // Límite razonable para el dropdown.
      .exec();

    // El front recibirá también el virtual nombreCompleto gracias al toJSON del modelo.
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes activos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
