// File: BackEnd/src/core/middlewares/autorizarRoles.middleware.jss
// Description: Middleware de autorización por rol para ProCivil Manager (PCM).
//              Permite restringir el acceso a ciertas rutas según el rol del
//              usuario autenticado (admin, líder de obra, cliente, etc.).
//              Debe ejecutarse SIEMPRE después de authMiddleware, que es quien
//              rellena req.user con la información del token JWT.

/**
 * Middleware de autorización basado en roles.
 *
 * Uso típico en rutas:
 *   const auth = require('./autenticacion.middleware');
 *   const authorizeRoles = require('./autorizarRoles.middleware');
 *
 *   router.get(
 *     '/ruta-protegida',
 *     auth,                                 // 1) Verifica el token y rellena req.user
 *     authorizeRoles(['admin']),           // 2) Verifica que req.user.role sea 'admin'
 *     controlador                          // 3) Lógica de la ruta (solo si pasó los dos anteriores)
 *   );
 *
 * @param {string|string[]} allowedRoles - Rol o lista de roles autorizados para la ruta.
 * @returns {Function} Middleware Express (req, res, next).
 */
module.exports = function authorizeRoles(allowedRoles) {
  // Normalizamos allowedRoles:
  //  - Si viene como string, lo convertimos en un array de un solo elemento.
  //  - Si ya es array, lo usamos tal cual.
  //  Trabajaremos internamente siempre con un array de strings.
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Devolvemos el middleware real que Express va a ejecutar por cada petición.
  return (req, res, next) => {
    // Si por alguna razón authMiddleware no se ejecutó antes (o falló),
    // req.user estará undefined y no podremos saber quién es el usuario.
    if (!req.user || !req.user.role) {
      // 403 → Acceso prohibido (la solicitud puede venir con token ausente/incorrecto,
      // pero este middleware asume que la autenticación ya se validó antes).
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Normalizamos el rol del usuario:
    //  - Convertimos a string por seguridad.
    //  - Hacemos trim() para evitar problemas con espacios accidentales.
    const userRole = String(req.user.role).trim();

    // Normalizamos la lista de roles autorizados:
    //  - Filtramos valores nulos o undefined.
    //  - Convertimos todos a string y quitamos espacios.
    const normalizedAllowed = rolesArray
      .filter(Boolean)                         // Quitamos entradas nulas/undefined.
      .map((role) => String(role).trim());     // Aseguramos que todos sean strings recortados.

    // Comprobamos si el rol del usuario está dentro de la lista de roles autorizados.
    const isAllowed = normalizedAllowed.includes(userRole);

    // Si el rol del usuario NO está dentro de los permitidos, rechazamos la petición.
    if (!isAllowed) {
      return res
        .status(403)                           // 403 → el usuario no tiene permisos suficientes.
        .json({ message: 'No tienes permisos para realizar esta acción' });
    }

    // Si el rol está permitido, continuamos con el siguiente middleware/controlador.
    next();
  };
};
