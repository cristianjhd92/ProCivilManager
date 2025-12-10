// File: BackEnd/src/core/middlewares/autenticacion.middleware.js
// Description: Middleware de autenticación para ProCivil Manager (PCM).
//              Valida el token JWT enviado en la cabecera Authorization,
//              decodifica el payload y lo expone en req.user. Si el token
//              no existe, es inválido o está expirado, devuelve un 401.

const jwt = require('jsonwebtoken');                           // Importa la librería jsonwebtoken para verificar tokens JWT.

/**
 * Middleware de autenticación basado en JWT.
 *
 * Flujo:
 *  1. Lee la cabecera Authorization (debe venir como "Bearer <token>").
 *  2. Si no existe o no empieza con "Bearer", responde 401 (no autorizado).
 *  3. Verifica el token usando el secreto JWT configurado en .env.
 *  4. Si es válido, guarda el payload decodificado en req.user y llama a next().
 *  5. Si falla la verificación (token inválido/expirado), responde 401.
 */
const authMiddleware = (req, res, next) => {
  // Obtiene la cabecera Authorization de la petición HTTP (puede ser undefined).
  const authHeaderRaw = req.headers.authorization;

  // Normaliza la cabecera a string vacío si no viene y la recorta de espacios.
  const authHeader = (authHeaderRaw || '').trim();

  // Si NO hay cabecera o no comienza con el esquema "Bearer " (en cualquier combinación de mayúsculas/minúsculas),
  // se considera que no se envió un token válido.
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res
      .status(401)                                             // Código 401 → no autenticado.
      .json({ message: 'No se proporcionó token de autenticación.' }); // Mensaje claro en español.
  }

  // Extrae el token JWT tomando la segunda parte de "Bearer <token>".
  const token = authHeader.split(' ')[1];

  // Antes de verificar el token, comprobamos que exista la variable de entorno JWT_SECRET.
  if (!process.env.JWT_SECRET) {
    // Si no está configurado el secreto, es un problema de servidor, no del cliente.
    console.error('❌ JWT_SECRET no está definido en las variables de entorno.');
    return res
      .status(500)                                             // Código 500 → error interno de servidor.
      .json({ message: 'Error de configuración del servidor (JWT).' });
  }

  try {
    // Verifica y decodifica el token usando el secreto configurado.
    // Si el token es válido, "decoded" contendrá el payload que se generó
    // al momento del login (por ejemplo: { id, role, email, iat, exp }).
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adjunta el payload decodificado al objeto de la petición.
    // De esta forma, controladores y otros middlewares pueden acceder a req.user
    // para saber quién está haciendo la solicitud y qué rol tiene.
    req.user = decoded;

    // Llama al siguiente middleware o controlador en la cadena.
    next();
  } catch (error) {
    // Si la verificación falla (token inválido, expirado, manipulado, etc.),
    // se devuelve un 401 indicando que el token ya no es aceptado.
    // console.error('Token inválido o expirado:', error); // Se puede habilitar en debug si se requiere.
    return res
      .status(401)                                             // Código 401 → token rechazado.
      .json({ message: 'Token inválido o expirado.' });        // Mensaje claro para el frontend.
  }
};

// Exporta el middleware para poder usarlo en las rutas protegidas del backend.
module.exports = authMiddleware;
