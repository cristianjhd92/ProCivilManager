// File: frontend/src/services/api/api.js
// Description: Funciones de acceso a la API REST del backend de ProCivil Manager (PCM).
//              Gestiona llamadas para estadísticas, proyectos, usuarios, almacenes,
//              materiales, movimientos, presupuestos, alertas, solicitudes, auditoría,
//              adjuntos y comentarios. Incluye también suscripción a alertas en tiempo
//              real usando una instancia compartida de Socket.io.

// =========================
// Importación del cliente Socket.io compartido
// =========================

// Importa la instancia de Socket.io configurada para toda la app (con autenticación por token).
// Se usa para recibir eventos en tiempo real, por ejemplo, nuevas alertas.
import clienteSocket from '../realtime/socket.js'; // Instancia única de Socket.io para eventos en tiempo real.

// ===================================================================
//   URL base de la API (Vite 7 + React 19)
// ===================================================================

// Lee la URL base de la API desde las variables de entorno de Vite.
// En desarrollo se puede definir en `.env` como:
//   VITE_API_URL=http://localhost:5000/api
// Si no está definida, se usa por defecto la API local en localhost.
const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // URL base para todas las peticiones al backend.

// ===================================================================
//   Autenticación (headers con JWT)
// ===================================================================

/**
 * Construye los encabezados de autenticación con el token JWT.
 * Lee el token desde localStorage y, si existe, agrega:
 *   Authorization: Bearer <token>
 *
 * @returns {{ Authorization?: string }} Encabezados de autenticación,
 *          o un objeto vacío si no hay token almacenado.
 */
const obtenerEncabezadosAutenticacion = () => {
  // Recupera el token JWT almacenado en el navegador (se guarda al iniciar sesión).
  const token = localStorage.getItem('token');
  // Si hay token, arma el header Authorization; si no, devuelve objeto vacío.
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ===================================================================
//   Helper genérico de manejo de respuestas JSON
// ===================================================================

/**
 * Maneja una respuesta HTTP esperada en formato JSON:
 *  - Intenta parsear el JSON.
 *  - Si la respuesta no es OK, arma un mensaje legible y lanza Error.
 *  - Si es OK, devuelve el JSON (o null si no se pudo parsear).
 *
 * @param {Response} res Respuesta de fetch.
 * @param {string} [mensajeErrorPorDefecto] Mensaje de error por defecto.
 * @returns {Promise<any>} Datos JSON devueltos por el backend.
 * @throws {Error} Error con mensaje adecuado para mostrar en UI.
 */
const manejarRespuestaJson = async (
  res,
  mensajeErrorPorDefecto = 'Error al procesar la solicitud'
) => {
  // Variable donde intentaremos guardar el JSON devuelto por el backend.
  let data = null;

  try {
    // Intentamos parsear el cuerpo como JSON.
    data = await res.json();
  } catch (e) {
    // Si falla el parseo (por ejemplo, status 204 sin contenido),
    // dejamos data en null y continuamos.
  }

  // Si el HTTP status NO es 2xx, construimos un mensaje de error.
  if (!res.ok) {
    // Intentamos extraer un mensaje de error que pueda haber enviado el backend.
    const mensajeBackend =
      data &&
      (data.message || data.error || data.errorMessage || data.msg);

    // Priorizamos el mensaje del backend; si no, el mensaje por defecto; si no, un genérico.
    const mensaje =
      mensajeBackend || mensajeErrorPorDefecto || `Error HTTP ${res.status}`;

    // Si la respuesta indica que la sesión expiró (401), limpiamos credenciales y lanzamos un
    // mensaje específico para que el frontend redireccione al login. De esta forma se evita
    // que la aplicación permanezca en un estado no autenticado sin feedback al usuario.
    if (res.status === 401) {
      try {
        // Eliminamos cualquier rastro del token y del usuario almacenado en el navegador.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('pcm_usuario');
      } catch (e) {
        // Ignoramos errores silenciosamente (por ejemplo, si localStorage no está disponible).
      }
      // Lanzamos un error con un mensaje claro para que la UI redirija al login.
      throw new Error('Sesión expirada. Por favor vuelve a iniciar sesión.');
    }

    // Lanzamos un Error con ese mensaje, para que el componente que llamó pueda capturarlo.
    throw new Error(mensaje);
  }

  // Si todo va bien, devolvemos el JSON (o null si no había contenido).
  return data;
};

// ===================================================================
//   📊 ESTADÍSTICAS (Dashboard / Reportes)
// ===================================================================

/**
 * Obtiene el resumen de estadísticas para el dashboard principal:
 *  - KPIs (stats) con título, valor, ícono y gradiente de color.
 *  - Datos para gráfica de línea por mes.
 *  - Datos para gráfica de pastel por tipo de proyecto.
 *
 * El backend debe devolver algo similar a:
 *  {
 *    totalProyectos: number,
 *    presupuestoTotal: number,
 *    progresoPromedio: number,
 *    proyectosMensuales: [{ _id: { month, year }, total }],
 *    proyectosPorTipo: { "Vivienda": 3, "Vías": 2, ... }
 *  }
 *
 * @returns {Promise<{stats: Array, datosLinea: Array, datosPastel: Array}>}
 */
export const obtenerResumenEstadisticas = async () => {
  // Hace petición GET al endpoint de resumen de estadísticas.
  const res = await fetch(`${API_URL}/stats/overview`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye encabezados de autenticación (Bearer token).
    },
  });

  // Maneja errores y parseo JSON de forma uniforme.
  const data = await manejarRespuestaJson(
    res,
    'Error al obtener las estadísticas del dashboard'
  );

  // Extrae valores principales con fallback a 0.
  const totalProyectos = data?.totalProyectos ?? 0;
  const presupuestoTotal = data?.presupuestoTotal ?? 0;
  const progresoPromedio = data?.progresoPromedio ?? 0;

  // Verifica que proyectosMensuales sea un arreglo; si no, usa arreglo vacío.
  const proyectosMensuales = Array.isArray(data?.proyectosMensuales)
    ? data.proyectosMensuales
    : [];

  // Objeto con conteo por tipo de proyecto; fallback a objeto vacío.
  const proyectosPorTipo = data?.proyectosPorTipo || {};

  // ─────────────────────────────────────────────────────────────
  // 🎨 Construcción de tarjetas KPI con paleta PCM
  // ─────────────────────────────────────────────────────────────
  const stats = [
    {
      title: 'Proyectos Totales', // Texto que se muestra en la tarjeta KPI.
      value: totalProyectos, // Valor numérico total de proyectos.
      icon: 'Building2', // Nombre del ícono (el componente de UI elegirá el ícono concreto).
      color: 'from-pcm-primary to-pcm-secondary', // Clases de color para gradiente (se combinan con bg/gradient en la UI).
    },
    {
      title: 'Presupuesto Total', // Segundo KPI: presupuesto global.
      value: presupuestoTotal, // Valor del presupuesto; la UI decidirá cómo formatearlo.
      icon: 'DollarSign', // Ícono relacionado con dinero.
      color: 'from-emerald-500 to-green-500', // Gradiente verde (coherente con la idea de dinero).
    },
    {
      title: 'Progreso Promedio', // Tercer KPI: avance promedio de los proyectos.
      value: progresoPromedio, // Valor numérico del progreso (%).
      icon: 'Clock', // Ícono de reloj (tiempo/avance).
      color: 'from-pcm-secondary to-pcm-accent', // Gradiente usando secundarios PCM.
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // 📈 Datos para gráfica de línea por mes
  // ─────────────────────────────────────────────────────────────
  const datosLinea = proyectosMensuales.map((item) => ({
    // Etiqueta de eje X (mes/año) construida desde _id.
    month: `${item._id.month}/${item._id.year}`,
    // Cantidad de proyectos en ese mes (eje Y).
    proyectos: item.total,
  }));

  // ─────────────────────────────────────────────────────────────
  // 🥧 Datos para gráfica de pastel por tipo de proyecto
  // ─────────────────────────────────────────────────────────────
  const coloresPastel = [
    '#f97316', // Aproximado a pcm.primary (naranja).
    '#fbbf24', // Aproximado a pcm.secondary (amarillo/dorado).
    '#ef4444', // Aproximado a pcm.accent (rojo).
    '#0f172a', // Aproximado a pcm.surfaceSoft (azul oscuro).
  ];

  // Convierte el objeto { tipo: valor } en arreglo para Recharts u otra librería.
  const datosPastel = Object.entries(proyectosPorTipo).map(
    ([name, value], index) => ({
      name, // Nombre del tipo de proyecto (ej. "Vivienda").
      value, // Cantidad de proyectos de ese tipo.
      color: coloresPastel[index % coloresPastel.length], // Color rotando la paleta.
    })
  );

  // Devuelve KPIs, datos de línea y de pastel al componente de UI.
  return { stats, datosLinea, datosPastel };
};

// ===================================================================
//   📁 PROYECTOS (CRUD + PDF)
// ===================================================================

/**
 * Obtener proyectos recientes para el dashboard.
 * @returns {Promise<Array>} Lista de proyectos recientes.
 */
export const obtenerProyectosRecientes = async () => {
  // Petición GET al endpoint de proyectos recientes.
  const res = await fetch(`${API_URL}/proyectos/recientes`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye el token si existe.
    },
  });

  // Devuelve el JSON o lanza error manejable.
  return await manejarRespuestaJson(
    res,
    'Error al obtener los proyectos recientes'
  );
};

/**
 * Obtener todos los proyectos.
 * @returns {Promise<Array>} Lista de proyectos.
 */
export const obtenerProyectos = async () => {
  // Petición GET al endpoint general de proyectos.
  const res = await fetch(`${API_URL}/proyectos`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye encabezados de autenticación.
    },
  });

  // Devuelve el listado de proyectos (arreglo).
  return await manejarRespuestaJson(
    res,
    'Error al obtener la lista de proyectos'
  );
};

/**
 * Crear un nuevo proyecto (admin / líder de obra).
 * @param {Object} datosProyecto Datos del proyecto.
 * @returns {Promise<Object>} Proyecto creado.
 */
export const crearProyecto = async (datosProyecto) => {
  // Petición POST al endpoint de creación de proyecto.
  const res = await fetch(`${API_URL}/proyectos/crear`, {
    method: 'POST', // Método HTTP POST.
    headers: {
      'Content-Type': 'application/json', // Indica que el body está en JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(datosProyecto), // Convierte los datos del proyecto a JSON.
  });

  // Devuelve el proyecto creado o lanza error.
  return await manejarRespuestaJson(res, 'Error al crear el proyecto');
};

/**
 * Actualizar un proyecto existente.
 * @param {string} idProyecto ID del proyecto.
 * @param {Object} datosProyecto Datos a actualizar.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const actualizarProyecto = async (idProyecto, datosProyecto) => {
  // Petición PUT al endpoint de actualización de proyecto.
  const res = await fetch(`${API_URL}/proyectos/${idProyecto}`, {
    method: 'PUT', // Método HTTP PUT.
    headers: {
      'Content-Type': 'application/json', // Body en formato JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(datosProyecto), // Datos del proyecto en JSON.
  });

  // Devuelve el proyecto actualizado o lanza error.
  return await manejarRespuestaJson(
    res,
    'Error al actualizar el proyecto'
  );
};

/**
 * Eliminar un proyecto por ID.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<void>}
 */
export const eliminarProyecto = async (idProyecto) => {
  // Petición DELETE al endpoint de eliminación de proyecto.
  const res = await fetch(`${API_URL}/proyectos/${idProyecto}`, {
    method: 'DELETE', // Método HTTP DELETE.
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Solo validamos que no haya error; no necesitamos el cuerpo.
  await manejarRespuestaJson(res, 'Error al eliminar el proyecto');
};

// -------------------------------------------------------------------
//   🧾 DESCARGA DE PDFs DE PROYECTOS
// -------------------------------------------------------------------

/**
 * Descargar en PDF el listado de proyectos.
 * Inicia una descarga en el navegador con nombre "Proyectos.pdf".
 */
export const descargarProyectosPDF = async () => {
  try {
    // Petición GET al endpoint de exportación a PDF.
    const response = await fetch(`${API_URL}/proyectos/exportar/pdf`, {
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye el token si el endpoint está protegido.
      },
    });

    // Si el status no es OK, lanzamos error.
    if (!response.ok) {
      throw new Error('Error al descargar el PDF');
    }

    // Convierte la respuesta a Blob (archivo binario).
    const blob = await response.blob();
    // Crea una URL temporal para el archivo.
    const url = window.URL.createObjectURL(blob);
    // Crea un elemento <a> para iniciar la descarga.
    const a = document.createElement('a');
    // Asigna la URL al enlace.
    a.href = url;
    // Nombre del archivo descargado.
    a.download = 'Proyectos.pdf';
    // Inserta el enlace en el DOM de forma temporal.
    document.body.appendChild(a);
    // Simula clic para disparar la descarga.
    a.click();
    // Elimina el enlace del DOM.
    a.remove();
    // Libera la URL temporal para no consumir memoria.
    window.URL.revokeObjectURL(url);
  } catch (error) {
    // Muestra error en consola para depuración.
    console.error('Error al descargar PDF:', error);
    // Propaga el error para que la UI pueda mostrarlo.
    throw error;
  }
};

/**
 * Descargar en PDF un proyecto específico por ID.
 * @param {string} id ID del proyecto.
 */
export const descargarProyectoPorIdPDF = async (id) => {
  try {
    // Petición GET al endpoint de exportación de un proyecto por ID.
    const response = await fetch(`${API_URL}/proyectos/${id}/export-pdf`, {
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye token si el endpoint está protegido.
      },
    });

    // Validamos que la respuesta sea OK.
    if (!response.ok) {
      throw new Error('Error al descargar el PDF del proyecto');
    }

    // Convertimos la respuesta a Blob.
    const blob = await response.blob();
    // Creamos URL temporal.
    const url = window.URL.createObjectURL(blob);
    // Creamos enlace <a>.
    const a = document.createElement('a');
    // Asignamos la URL.
    a.href = url;
    // Nombre del archivo incorpora el ID del proyecto.
    a.download = `Proyecto_${id}.pdf`;
    // Insertamos el enlace en el DOM.
    document.body.appendChild(a);
    // Simulamos clic para descargar.
    a.click();
    // Limpiamos el DOM.
    a.remove();
    // Liberamos la URL temporal.
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al descargar PDF del proyecto:', error);
    throw error;
  }
};

// ===================================================================
//   👥 USUARIOS (CRUD)
// ===================================================================

/**
 * Obtener el listado de usuarios.
 * Normaliza la respuesta a siempre devolver un arreglo.
 * @returns {Promise<Array>} Lista de usuarios.
 */
export const obtenerUsuarios = async (opciones = {}) => {
  /**
   * Obtiene la lista de usuarios del backend.
   *
   * Por defecto, el endpoint de la API devuelve los usuarios paginados
   * con un límite de 10 registros. Esto puede ocasionar que no se
   * reciban todos los usuarios cuando existen más de 10 en la base.
   * Para evitarlo, se admite un parámetro opcional "limit" que
   * controla cuántos usuarios se solicitan de una vez. Si no se
   * especifica, se usa un límite amplio (1000) para traer todos.
   *
   * También es posible incluir otros parámetros de consulta como
   * page, search o role, que se concatenarán en la URL.
   */
  const {
    page = 1,
    limit = 1000,
    search = '',
    role,
    ...extraParams
  } = opciones;

  // Construye la cadena de query a partir de los parámetros.
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  // Agrega cualquier otro parámetro adicional recibido.
  Object.entries(extraParams).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null) {
      params.append(clave, valor);
    }
  });

  // Petición GET al endpoint de usuarios con la query construida.
  const res = await fetch(`${API_URL}/user/users?${params.toString()}`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Maneja errores y devuelve la respuesta cruda.
  const data = await manejarRespuestaJson(
    res,
    'Error al obtener la lista de usuarios'
  );

  // Caso 1: si ya es un arreglo, lo devolvemos tal cual.
  if (Array.isArray(data)) {
    return data;
  }
  // Caso 2: si viene como { users: [...] } devolvemos esa propiedad.
  if (Array.isArray(data.users)) {
    return data.users;
  }
  // Si el formato no coincide, devolvemos arreglo vacío.
  return [];
};

/**
 * Actualizar un usuario.
 * @param {string} idUsuario ID del usuario.
 * @param {Object} datosUsuario Datos a actualizar.
 * @returns {Promise<Object>} Usuario actualizado.
 */
export const actualizarUsuario = async (idUsuario, datosUsuario) => {
  // Petición PUT al endpoint de actualización de usuario.
  const res = await fetch(`${API_URL}/user/users/${idUsuario}`, {
    method: 'PUT', // Método HTTP PUT.
    headers: {
      'Content-Type': 'application/json', // Se envía JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(datosUsuario), // Datos del usuario en JSON.
  });

  // Devuelve el usuario actualizado.
  return await manejarRespuestaJson(
    res,
    'Error al actualizar el usuario'
  );
};

/**
 * Eliminar un usuario por ID.
 * @param {string} idUsuario ID del usuario.
 * @returns {Promise<void>}
 */
export const eliminarUsuario = async (idUsuario) => {
  // Petición DELETE al endpoint de eliminación de usuario.
  const res = await fetch(`${API_URL}/user/users/${idUsuario}`, {
    method: 'DELETE', // Método HTTP DELETE.
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Validamos que la operación sea exitosa.
  await manejarRespuestaJson(res, 'Error al eliminar el usuario');
};

// ===================================================================
//   📧 CONTACTOS (mensajes desde landing)
// ===================================================================

/**
 * Obtener correos de contacto enviados desde el formulario público.
 * @returns {Promise<Array>} Lista de mensajes de contacto.
 */
export const obtenerMensajesContacto = async () => {
  // Petición GET al endpoint de contacto.
  const res = await fetch(`${API_URL}/contact`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye Authorization si existe token.
    },
  });

  // Devuelve la lista de correos o lanza error.
  return await manejarRespuestaJson(
    res,
    'Error al obtener los mensajes de contacto'
  );
};

// ===================================================================
//   🏢 ALMACENES (CRUD)
// ===================================================================

/**
 * Listar almacenes.
 * @returns {Promise<Array>} Lista de almacenes.
 */
export const obtenerAlmacenes = async () => {
  // Petición GET al endpoint de almacenes.
  const res = await fetch(`${API_URL}/almacenes`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Devuelve los almacenes.
  return await manejarRespuestaJson(
    res,
    'Error al obtener la lista de almacenes'
  );
};

/**
 * Crear un almacén.
 * @param {Object} data Datos del almacén.
 * @returns {Promise<Object>} Almacén creado.
 */
export const crearAlmacen = async (data) => {
  // Petición POST al endpoint de creación de almacén.
  const res = await fetch(`${API_URL}/almacenes`, {
    method: 'POST', // Método HTTP POST.
    headers: {
      'Content-Type': 'application/json', // Indica JSON en el body.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(data), // Datos del almacén en JSON.
  });

  // Devuelve el almacén creado.
  return await manejarRespuestaJson(
    res,
    'Error al crear el almacén'
  );
};

/**
 * Actualizar un almacén.
 * @param {string} id ID del almacén.
 * @param {Object} data Datos a actualizar.
 * @returns {Promise<Object>} Almacén actualizado.
 */
export const actualizarAlmacen = async (id, data) => {
  // Petición PUT al endpoint de actualización de almacén.
  const res = await fetch(`${API_URL}/almacenes/${id}`, {
    method: 'PUT', // Método HTTP PUT.
    headers: {
      'Content-Type': 'application/json', // Indica JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(data), // Datos actualizados del almacén.
  });

  // Devuelve el almacén actualizado.
  return await manejarRespuestaJson(
    res,
    'Error al actualizar el almacén'
  );
};

/**
 * Eliminar un almacén.
 * @param {string} id ID del almacén.
 * @returns {Promise<void>}
 */
export const eliminarAlmacen = async (id) => {
  // Petición DELETE al endpoint de eliminación de almacén.
  const res = await fetch(`${API_URL}/almacenes/${id}`, {
    method: 'DELETE', // Método HTTP DELETE.
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Verifica que TODO salió bien.
  await manejarRespuestaJson(res, 'Error al eliminar el almacén');
};

// ===================================================================
//   🧱 MATERIALES (CRUD)
// ===================================================================

/**
 * Listar materiales.
 * @returns {Promise<Array>} Lista de materiales.
 */
export const obtenerMateriales = async () => {
  // Petición GET al endpoint de materiales.
  const res = await fetch(`${API_URL}/materiales`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Devuelve la lista de materiales.
  return await manejarRespuestaJson(
    res,
    'Error al obtener la lista de materiales'
  );
};

/**
 * Crear un material.
 * @param {Object} data Datos del material.
 * @returns {Promise<Object>} Material creado.
 */
export const crearMaterial = async (data) => {
  // Petición POST al endpoint de creación de material.
  const res = await fetch(`${API_URL}/materiales`, {
    method: 'POST', // Método HTTP POST.
    headers: {
      'Content-Type': 'application/json', // Indica JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(data), // Datos del material en JSON.
  });

  // Devuelve el material creado.
  return await manejarRespuestaJson(
    res,
    'Error al crear el material'
  );
};

/**
 * Actualizar un material.
 * @param {string} id ID del material.
 * @param {Object} data Datos a actualizar.
 * @returns {Promise<Object>} Material actualizado.
 */
export const actualizarMaterial = async (id, data) => {
  // Petición PUT al endpoint de actualización de material.
  const res = await fetch(`${API_URL}/materiales/${id}`, {
    method: 'PUT', // Método HTTP PUT.
    headers: {
      'Content-Type': 'application/json', // Indica JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(data), // Datos actualizados.
  });

  // Devuelve el material actualizado.
  return await manejarRespuestaJson(
    res,
    'Error al actualizar el material'
  );
};

/**
 * Eliminar un material.
 * @param {string} id ID del material.
 * @returns {Promise<void>}
 */
export const eliminarMaterial = async (id) => {
  // Petición DELETE al endpoint de eliminación de material.
  const res = await fetch(`${API_URL}/materiales/${id}`, {
    method: 'DELETE', // Método HTTP DELETE.
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Verifica que la eliminación fue correcta.
  await manejarRespuestaJson(res, 'Error al eliminar el material');
};

// ===================================================================
//   📦 MOVIMIENTOS DE INVENTARIO
// ===================================================================

/**
 * Obtener todos los movimientos de inventario.
 * Siempre devuelve un arreglo, aún si hay error (arreglo vacío).
 * @returns {Promise<Array>} Lista de movimientos.
 */
export const obtenerMovimientosInventario = async () => {
  try {
    // Petición GET al endpoint de movimientos.
    const res = await fetch(`${API_URL}/movimientos`, {
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    });

    // Si hay error HTTP, se captura en el catch.
    const data = await manejarRespuestaJson(
      res,
      'Error al obtener los movimientos de inventario'
    );

    // Aseguramos que siempre se devuelva un arreglo.
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Error al obtener movimientos:', error);
    return []; // Se devuelve arreglo vacío para no romper la UI.
  }
};

/**
 * Crear un movimiento de inventario (entrada, salida o ajuste).
 * @param {Object} data Datos del movimiento.
 * @returns {Promise<Object>} Movimiento creado.
 */
export const crearMovimientoInventario = async (data) => {
  try {
    // Petición POST al endpoint de movimientos.
    const res = await fetch(`${API_URL}/movimientos`, {
      method: 'POST', // Método HTTP POST.
      headers: {
        'Content-Type': 'application/json', // Indica JSON.
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
      body: JSON.stringify(data), // Datos del movimiento.
    });

    // Devuelve el movimiento creado.
    return await manejarRespuestaJson(
      res,
      'Error al crear el movimiento'
    );
  } catch (error) {
    console.error('❌ Error al crear movimiento:', error);
    throw error; // Propaga el error para que el componente lo maneje.
  }
};

/**
 * Actualizar un movimiento existente (por ejemplo, tipo o descripción).
 * @param {string} id ID del movimiento.
 * @param {Object} data Datos a actualizar.
 * @returns {Promise<Object>} Movimiento actualizado.
 */
export const actualizarMovimientoInventario = async (id, data) => {
  try {
    // Petición PUT al endpoint de movimientos.
    const res = await fetch(`${API_URL}/movimientos/${id}`, {
      method: 'PUT', // Método HTTP PUT.
      headers: {
        'Content-Type': 'application/json', // Indica JSON.
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
      body: JSON.stringify(data), // Datos actualizados del movimiento.
    });

    // Devuelve el movimiento actualizado.
    return await manejarRespuestaJson(
      res,
      'Error al actualizar el movimiento'
    );
  } catch (error) {
    console.error('❌ Error al actualizar movimiento:', error);
    throw error;
  }
};

/**
 * Eliminar un movimiento.
 * @param {string} id ID del movimiento.
 * @returns {Promise<any>} Respuesta del backend.
 */
export const eliminarMovimientoInventario = async (id) => {
  try {
    // Petición DELETE al endpoint de movimientos.
    const res = await fetch(`${API_URL}/movimientos/${id}`, {
      method: 'DELETE', // Método HTTP DELETE.
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    });

    // Devuelve la respuesta del backend (mensaje o similar).
    return await manejarRespuestaJson(
      res,
      'Error al eliminar el movimiento'
    );
  } catch (error) {
    console.error('❌ Error al eliminar movimiento:', error);
    throw error;
  }
};

// ===================================================================
//   🧮 PRESUPUESTOS Y COSTOS
// ===================================================================

/**
 * Obtener el presupuesto de materiales para un proyecto.
 * Devuelve el presupuesto completo con sus líneas y el total calculado.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<Object>} Presupuesto del proyecto.
 */
export const obtenerPresupuestoProyecto = async (idProyecto) => {
  // Petición GET al endpoint de presupuesto por proyecto.
  const res = await fetch(`${API_URL}/presupuestos/${idProyecto}`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al obtener el presupuesto del proyecto'
  );
};

/**
 * Crear o actualizar el presupuesto de un proyecto.
 * @param {string} idProyecto ID del proyecto.
 * @param {Object} data Datos del presupuesto (total + items).
 * @returns {Promise<Object>} Presupuesto guardado/actualizado.
 */
export const guardarPresupuestoProyecto = async (idProyecto, data) => {
  // Petición POST al endpoint de guardado de presupuesto.
  const res = await fetch(`${API_URL}/presupuestos/${idProyecto}`, {
    method: 'POST', // Método HTTP POST.
    headers: {
      'Content-Type': 'application/json', // Indica JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(data), // Datos del presupuesto.
  });

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al guardar el presupuesto del proyecto'
  );
};

/**
 * Obtiene el detalle completo de un proyecto por su ID. Incluye las
 * referencias pobladas de materiales, cliente y líder según el backend.
 *
 * @param {string} idProyecto ID del proyecto a consultar.
 * @returns {Promise<Object>} Proyecto completo.
 */
export const obtenerProyectoPorId = async (idProyecto) => {
  const res = await fetch(`${API_URL}/proyectos/${idProyecto}`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(),
    },
  });
  return await manejarRespuestaJson(res, 'Error al obtener el proyecto');
};

/**
 * Registra el uso (consumo) de un material asignado a un proyecto. Este
 * servicio incrementa la cantidad utilizada en el proyecto y descuenta
 * dicha cantidad del stock global del material. Sólo usuarios con rol
 * admin o líder de obra pueden registrar el consumo.
 *
 * @param {string} idProyecto ID del proyecto.
 * @param {string} idMaterial ID del material asignado al proyecto.
 * @param {number} cantidad Cantidad a consumir (se sumará a la utilizada).
 * @returns {Promise<Object>} Objeto con el material actualizado.
 */
export const registrarUsoMaterialProyecto = async (
  idProyecto,
  idMaterial,
  cantidad
) => {
  const res = await fetch(`${API_URL}/proyectos/${idProyecto}/materiales/uso`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...obtenerEncabezadosAutenticacion(),
    },
    body: JSON.stringify({ materialId: idMaterial, cantidadUtilizada: cantidad }),
  });
  return await manejarRespuestaJson(res, 'Error al registrar el uso del material');
};

/**
 * Calcular el costo consumido de materiales de un proyecto y comparar con
 * el presupuesto (si existe).
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<Object>} Resumen de costos vs presupuesto.
 */
export const obtenerCostoMaterialesProyecto = async (idProyecto) => {
  // Petición GET al endpoint de cálculo de costos.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/materiales/costo`,
    {
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al calcular el costo de materiales del proyecto'
  );
};

/**
 * Verificar disponibilidad de materiales y generar alertas de stock.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<Object>} Estado de disponibilidad de materiales.
 */
export const obtenerDisponibilidadMaterialesProyecto = async (idProyecto) => {
  // Petición GET al endpoint de disponibilidad de materiales.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/materiales/disponibilidad`,
    {
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al verificar la disponibilidad de materiales'
  );
};

// ===================================================================
//   🚨 ALERTAS (HTTP + tiempo real)
// ===================================================================

/**
 * Listar alertas con filtros opcionales.
 * @param {Object} params Filtros opcionales.
 * @returns {Promise<Object|Array>} Lista de alertas o estructura paginada.
 */
export const obtenerAlertas = async (params = {}) => {
  // Construye querystring a partir de params.
  const query = new URLSearchParams(params).toString();
  // Petición GET al endpoint de alertas con o sin query.
  const res = await fetch(
    `${API_URL}/alertas${query ? `?${query}` : ''}`,
    {
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al obtener la lista de alertas'
  );
};

/**
 * Marcar una alerta como resuelta.
 * @param {string} id ID de la alerta.
 * @returns {Promise<Object>} Alerta actualizada.
 */
export const resolverAlerta = async (id) => {
  // Petición PUT al endpoint de resolución de alerta.
  const res = await fetch(`${API_URL}/alertas/${id}/resolver`, {
    method: 'PUT', // Método HTTP PUT.
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Devuelve la alerta actualizada.
  return await manejarRespuestaJson(
    res,
    'Error al marcar la alerta como resuelta'
  );
};

/**
 * Marcar una alerta como vista/no vista.
 * Nota: aquí solo se hace la llamada al backend; el toggle de `visto`
 * en el estado de React lo manejas en la vista (como ya lo estás haciendo).
 *
 * @param {string} id ID de la alerta.
 * @returns {Promise<Object>} Alerta actualizada.
 */
export const marcarAlertaVisto = async (id) => {
  // Petición PUT al endpoint que marca la alerta como vista.
  // Si tu backend usa otra ruta (por ejemplo /marcar-vista o /toggle-visto),
  // únicamente cambia esta URL respetando la firma de la función.
  const res = await fetch(`${API_URL}/alertas/${id}/visto`, {
    method: 'PUT', // Método HTTP PUT.
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    // No se envía body porque asumimos que el backend hace el toggle internamente.
  });

  // Maneja la respuesta devolviendo la alerta actualizada o lanzando error.
  return await manejarRespuestaJson(
    res,
    'Error al marcar la alerta como vista'
  );
};

/**
 * Suscripción a alertas en tiempo real (evento "alerta:nueva").
 * El backend debería emitir un payload con forma coherente a obtenerAlertas(), por ejemplo:
 *   {
 *     _id: string,
 *     titulo: string,
 *     tipo: string,
 *     prioridad: string,
 *     estado: string,
 *     proyecto?: string | { _id, nombre },
 *     creadoEn: string,
 *     ...
 *   }
 *
 * @param {Function} callback Función a ejecutar cuando llega una nueva alerta.
 * @returns {Function} Función para desuscribirse (ideal para cleanup en useEffect).
 */
export const suscribirseAlertasTiempoReal = (callback) => {
  // Manejador que envuelve el callback recibido.
  const manejador = (payload) => {
    // Verifica que callback sea una función antes de ejecutarlo.
    if (typeof callback === 'function') {
      callback(payload);
    }
  };

  // Se suscribe al evento "alerta:nueva" en el socket compartido.
  clienteSocket.on('alerta:nueva', manejador);

  // Devuelve una función para desuscribirse (pensado para cleanup en useEffect).
  return () => {
    clienteSocket.off('alerta:nueva', manejador);
  };
};

// ===================================================================
//   💬 COMENTARIOS Y LIDERAZGO EN PROYECTOS
// ===================================================================

/**
 * Agregar un comentario a un proyecto.
 * @param {string} idProyecto ID del proyecto.
 * @param {string} contenido Contenido del comentario.
 * @returns {Promise<Object>} Comentario creado.
 */
export const agregarComentarioProyecto = async (idProyecto, contenido) => {
  // Petición POST al endpoint de comentarios del proyecto.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/comentarios`,
    {
      method: 'POST', // Método HTTP POST.
      headers: {
        'Content-Type': 'application/json', // Indica JSON.
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
      body: JSON.stringify({ contenido }), // Envía el contenido del comentario.
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al agregar el comentario al proyecto'
  );
};

/**
 * Asignar un líder de obra a un proyecto (solo admin).
 * @param {string} idProyecto ID del proyecto.
 * @param {string} idLider ID del líder.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const asignarLiderObra = async (idProyecto, idLider) => {
  // Petición PUT al endpoint de asignación de líder.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/asignar-lider`,
    {
      method: 'PUT', // Método HTTP PUT.
      headers: {
        'Content-Type': 'application/json', // Indica JSON.
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
      // El backend espera la clave "liderId" para identificar al líder a asignar.  Usamos idLider
      // como nombre local pero lo enviamos bajo la propiedad correcta para evitar
      // errores como "Debe proporcionar el ID del líder".
      body: JSON.stringify({ liderId: idLider }), // Envía el ID del líder con el nombre esperado por el backend.
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al asignar el líder de obra'
  );
};

/**
 * Remover el líder de obra de un proyecto (solo admin).
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const removerLiderObra = async (idProyecto) => {
  // Petición PUT al endpoint de remoción de líder.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/remover-lider`,
    {
      method: 'PUT', // Método HTTP PUT.
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al remover el líder de obra'
  );
};

// ===================================================================
//   📎 ADJUNTOS DE PROYECTO (archivos)
// ===================================================================

/**
 * Subir uno o varios archivos a un proyecto.
 * Campo de formulario en el backend: "archivos".
 * @param {string} idProyecto ID del proyecto.
 * @param {File|File[]} archivos Archivo o lista de archivos.
 * @param {string} [descripcion] Descripción opcional.
 * @returns {Promise<Object>} Proyecto actualizado con los adjuntos.
 */
export const subirArchivosProyecto = async (
  idProyecto,
  archivos,
  descripcion = ''
) => {
  // FormData para enviar archivos y campos de texto.
  const formData = new FormData();

  // Si es un arreglo de archivos, agregamos cada uno con el mismo nombre de campo.
  if (Array.isArray(archivos)) {
    archivos.forEach((file) => formData.append('archivos', file));
  } else if (archivos) {
    // Si es un solo archivo, también lo agregamos.
    formData.append('archivos', archivos);
  }

  // Si se proporciona descripción, la agregamos también.
  if (descripcion) {
    formData.append('descripcion', descripcion);
  }

  // Petición POST al endpoint de adjuntos del proyecto.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/adjuntos`,
    {
      method: 'POST', // Método HTTP POST.
      headers: {
        // No se debe fijar 'Content-Type' manualmente: el navegador lo define con boundary.
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
      body: formData, // Cuerpo con archivos + descripción.
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al subir los archivos del proyecto'
  );
};

/**
 * Actualizar un adjunto (descripción y/o reemplazar archivo).
 * Campo de archivo en el backend: "archivo".
 * @param {string} idProyecto ID del proyecto.
 * @param {string} idAdjunto ID del adjunto.
 * @param {{ descripcion?: string, file?: File }} payload Datos a actualizar.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const actualizarAdjuntoProyecto = async (
  idProyecto,
  idAdjunto,
  payload = {}
) => {
  // FormData para envío mixto (texto + archivo).
  const formData = new FormData();

  // Si se incluye una nueva descripción, la agregamos.
  if (payload.descripcion !== undefined) {
    formData.append('descripcion', payload.descripcion);
  }

  // Si se incluye un nuevo archivo, lo agregamos con nombre "archivo".
  if (payload.file) {
    formData.append('archivo', payload.file);
  }

  // Petición PUT al endpoint de actualización de adjunto.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/adjuntos/${idAdjunto}`,
    {
      method: 'PUT', // Método HTTP PUT.
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
      body: formData, // Enviamos FormData sin Content-Type manual.
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al actualizar el archivo adjunto del proyecto'
  );
};

/**
 * Eliminar un adjunto de un proyecto.
 * @param {string} idProyecto ID del proyecto.
 * @param {string} idAdjunto ID del adjunto.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const eliminarAdjuntoProyecto = async (idProyecto, idAdjunto) => {
  // Petición DELETE al endpoint de adjuntos.
  const res = await fetch(
    `${API_URL}/proyectos/${idProyecto}/adjuntos/${idAdjunto}`,
    {
      method: 'DELETE', // Método HTTP DELETE.
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    }
  );

  // Maneja respuesta del backend.
  return await manejarRespuestaJson(
    res,
    'Error al eliminar el archivo adjunto del proyecto'
  );
};

// ===================================================================
//   📨 SOLICITUDES (proyectos / materiales)
// ===================================================================

/**
 * Obtener las solicitudes filtradas por estado o tipo.
 * @param {Object} params Filtros opcionales (estado, tipo, etc.).
 * @returns {Promise<Array|Object>} Lista de solicitudes o estructura paginada.
 */
export const obtenerSolicitudes = async (params = {}) => {
  // Construye la querystring con los filtros recibidos.
  const query = new URLSearchParams(params).toString();
  // Petición GET al endpoint de solicitudes.
  const res = await fetch(
    `${API_URL}/solicitudes${query ? `?${query}` : ''}`,
    {
      headers: {
        ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
      },
    }
  );

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al obtener la lista de solicitudes'
  );
};

/**
 * Crear una nueva solicitud de proyecto o materiales.
 * @param {Object} data Datos de la solicitud.
 * @returns {Promise<Object>} Solicitud creada.
 */
export const crearSolicitud = async (data) => {
  // Petición POST al endpoint de solicitudes.
  const res = await fetch(`${API_URL}/solicitudes`, {
    method: 'POST', // Método HTTP POST.
    headers: {
      'Content-Type': 'application/json', // Indica JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify(data), // Datos de la solicitud.
  });

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al crear la solicitud'
  );
};

/**
 * Actualizar el estado de una solicitud (solo administradores).
 * Estados típicos: 'pendiente', 'aprobada', 'rechazada', 'procesada'.
 * @param {string} id ID de la solicitud.
 * @param {string} estado Nuevo estado.
 * @returns {Promise<Object>} Solicitud actualizada.
 */
export const actualizarEstadoSolicitud = async (id, estado) => {
  // Petición PUT al endpoint de actualización de solicitud.
  const res = await fetch(`${API_URL}/solicitudes/${id}`, {
    method: 'PUT', // Método HTTP PUT.
    headers: {
      'Content-Type': 'application/json', // Indica JSON.
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
    body: JSON.stringify({ estado }), // Envía el nuevo estado en el body.
  });

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al actualizar el estado de la solicitud'
  );
};

/**
 * Obtener el detalle de una solicitud por su ID.
 * @param {string} id ID de la solicitud a consultar.
 * @returns {Promise<Object>} Solicitud con sus campos y respuestas.
 */
export const obtenerSolicitudPorId = async (id) => {
  // Llama al endpoint GET /solicitudes/:id para traer los detalles de la solicitud.
  const res = await fetch(`${API_URL}/solicitudes/${id}`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(),
    },
  });
  return await manejarRespuestaJson(res, 'Error al obtener la solicitud');
};

/**
 * Agregar una respuesta/comentario a una solicitud existente.
 * @param {string} id ID de la solicitud a la que se agregará la respuesta.
 * @param {string} contenido Texto de la respuesta/comentario.
 * @returns {Promise<Object>} Respuesta creada.
 */
export const agregarRespuestaSolicitud = async (id, contenido) => {
  const res = await fetch(`${API_URL}/solicitudes/${id}/respuestas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...obtenerEncabezadosAutenticacion(),
    },
    body: JSON.stringify({ contenido }),
  });
  return await manejarRespuestaJson(res, 'Error al agregar la respuesta');
};

// ===================================================================
//   📚 REGISTROS DE AUDITORÍA
// ===================================================================

/**
 * Obtener todos los registros de auditoría.
 * Solo disponible para administradores.
 * @returns {Promise<Array>} Lista de registros de auditoría.
 */
export const obtenerRegistrosAuditoria = async () => {
  // Petición GET al endpoint de auditoría.
  const res = await fetch(`${API_URL}/auditlogs`, {
    headers: {
      ...obtenerEncabezadosAutenticacion(), // Incluye autenticación.
    },
  });

  // Maneja la respuesta.
  return await manejarRespuestaJson(
    res,
    'Error al obtener los registros de auditoría'
  );
};

// ===================================================================
//   🔁 Aliases en inglés para compatibilidad con modales de proyectos
// ===================================================================

/**
 * Alias en inglés para crear un proyecto.
 * Reusa la función crearProyecto definida arriba.
 * @param {Object} datosProyecto Datos del proyecto.
 * @returns {Promise<Object>} Proyecto creado.
 */
export const createProject = (datosProyecto) => {
  // Delegamos toda la lógica en la función en español.
  return crearProyecto(datosProyecto);
};

/**
 * Alias en inglés para actualizar un proyecto.
 * Reusa la función actualizarProyecto.
 * @param {string} idProyecto ID del proyecto.
 * @param {Object} datosProyecto Datos a actualizar.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const updateProject = (idProyecto, datosProyecto) => {
  // Llama a la función original que hace el PUT al backend.
  return actualizarProyecto(idProyecto, datosProyecto);
};

/**
 * Alias en inglés para eliminar un proyecto.
 * Reusa la función eliminarProyecto.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<void>}
 */
export const deleteProject = (idProyecto) => {
  // Utiliza la función existente que hace el DELETE.
  return eliminarProyecto(idProyecto);
};

/**
 * Alias en inglés para descargar el PDF de un proyecto por ID.
 * Reusa descargarProyectoPorIdPDF.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<void>}
 */
export const downloadProyectoByIdPDF = (idProyecto) => {
  // Reusa el servicio que ya descarga el PDF por ID.
  return descargarProyectoPorIdPDF(idProyecto);
};

/**
 * Alias en inglés para obtener el presupuesto de un proyecto.
 * Reusa obtenerPresupuestoProyecto.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<Object>} Presupuesto del proyecto.
 */
export const fetchPresupuesto = (idProyecto) => {
  // Devuelve el presupuesto del proyecto desde el backend.
  return obtenerPresupuestoProyecto(idProyecto);
};

/**
 * Alias en inglés para obtener el costo de materiales de un proyecto.
 * Reusa obtenerCostoMaterialesProyecto.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<Object>} Resumen de costos.
 */
export const fetchCostoMateriales = (idProyecto) => {
  // Devuelve el costo global de materiales del proyecto.
  return obtenerCostoMaterialesProyecto(idProyecto);
};

/**
 * Alias en inglés para listar usuarios.
 * Reusa obtenerUsuarios.
 * @returns {Promise<Array>} Lista de usuarios.
 */
export const fetchUsers = () => {
  // Reusa el servicio de usuarios existente.
  return obtenerUsuarios();
};

/**
 * Alias en inglés para agregar comentario a un proyecto.
 * Reusa agregarComentarioProyecto.
 * @param {string} idProyecto ID del proyecto.
 * @param {string} contenido Contenido del comentario.
 * @returns {Promise<Object>} Comentario creado.
 */
export const addComentario = (idProyecto, contenido) => {
  // Envía el comentario al endpoint de comentarios del proyecto.
  return agregarComentarioProyecto(idProyecto, contenido);
};

/**
 * Alias en inglés para asignar líder de obra.
 * Reusa asignarLiderObra.
 * @param {string} idProyecto ID del proyecto.
 * @param {string} idLider ID del líder.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const assignLeader = (idProyecto, idLider) => {
  // Llama al endpoint que asigna el líder.
  return asignarLiderObra(idProyecto, idLider);
};

/**
 * Alias en inglés para remover líder de obra.
 * Reusa removerLiderObra.
 * @param {string} idProyecto ID del proyecto.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const removeLeader = (idProyecto) => {
  // Llama al endpoint que limpia el líder.
  return removerLiderObra(idProyecto);
};

/**
 * Alias en inglés para subir archivos de proyecto.
 * Reusa subirArchivosProyecto con la misma firma.
 * @param {string} idProyecto ID del proyecto.
 * @param {File|File[]} archivos Archivo o lista de archivos.
 * @param {string} [descripcion] Descripción opcional.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const uploadProjectFiles = (idProyecto, archivos, descripcion = '') => {
  // Reusa la función que arma el FormData y hace el POST.
  return subirArchivosProyecto(idProyecto, archivos, descripcion);
};

/**
 * Alias en inglés para eliminar un adjunto de proyecto.
 * Reusa eliminarAdjuntoProyecto.
 * @param {string} idProyecto ID del proyecto.
 * @param {string} idAdjunto ID del adjunto.
 * @returns {Promise<Object>} Proyecto actualizado.
 */
export const deleteAdjunto = (idProyecto, idAdjunto) => {
  // Utiliza la función que hace el DELETE del adjunto.
  return eliminarAdjuntoProyecto(idProyecto, idAdjunto);
};
