// File: frontend/src/modules/audit/pages/VistaRegistrosAuditoria.jsx   // Ruta del archivo dentro del módulo de auditoría.
// Description: Vista para mostrar los registros de auditoría del       // Descripción: lista las acciones registradas en el sistema PCM.
//              sistema ProCivil Manager (PCM). Consulta el backend     // Consulta el backend con obtenerRegistrosAuditoria, normaliza
//              mediante obtenerRegistrosAuditoria, normaliza la        // la respuesta, muestra una tabla con fecha, usuario, acción,
//              respuesta para tolerar distintos formatos (array,       // recurso y resumen de detalles, y permite ver el detalle
//              {registros}, {data}) y muestra una tabla con filtros    // completo de cada registro en un modal separado, usando el
//              visuales consistentes con el tema PCM y el panel por    // tema visual PCM y respetando las clases globales (.pcm-card,
//              rol.                                                    // .pcm-panel--ROL, sombras y bordes suaves).

// =========================
//   Importaciones básicas
// =========================
import React, { useEffect, useState } from 'react';                    // Importa React y los hooks useState/useEffect para manejar estado y efectos.
import {
  obtenerRegistrosAuditoria,                                          // Servicio para obtener la lista de registros de auditoría desde el backend.
} from '../../../services/api/api.js';                                 // Importa la función de API con extensión explícita .js (ESM+Vite).

// Íconos para estados de carga y encabezado/auditoría.
import { Loader, ScrollText } from 'lucide-react';                     // Loader: spinner de carga, ScrollText: ícono de registros / logs.

// Importa el modal de detalle de un registro de auditoría (componente en español).
import ModalDetalleRegistroAuditoria from '../modals/ModalDetalleRegistroAuditoria.jsx'; // Modal que muestra la información completa de un registro seleccionado.

// =========================
//   Helpers de normalización
// =========================

/**
 * Normaliza la respuesta de la API de auditoría a un arreglo de registros.
 * Soporta:
 *  - Respuesta como arreglo directo.
 *  - Respuesta como { registros: [...] }.
 *  - Respuesta como { data: [...] }.
 *
 * @param {any} respuestaCruda Respuesta tal cual del backend.
 * @returns {Array} Arreglo de registros de auditoría.
 */
const normalizarRegistrosAuditoria = (respuestaCruda) => {            // Declara helper para normalizar la forma de la respuesta.
  if (Array.isArray(respuestaCruda)) {                                // Si ya es un arreglo...
    return respuestaCruda;                                            // Lo devuelve tal cual.
  }

  if (Array.isArray(respuestaCruda?.registros)) {                     // Si viene como { registros: [...] }...
    return respuestaCruda.registros;                                  // Devuelve la propiedad registros.
  }

  if (Array.isArray(respuestaCruda?.data)) {                          // Si viene como { data: [...] }...
    return respuestaCruda.data;                                       // Devuelve la propiedad data.
  }

  return [];                                                          // En cualquier otro caso devuelve arreglo vacío para evitar errores.
};

// =========================
//   Helper: resumen de detalles
// =========================

/**
 * Devuelve un resumen corto de los detalles para mostrar en la tabla.
 * Si es un objeto, lo serializa y recorta; si es texto, recorta el texto.
 *
 * @param {any} detalles Valor de la propiedad details del registro de auditoría.
 * @returns {string} Texto corto representativo de los detalles.
 */
const obtenerResumenDetalles = (detalles) => {                        // Helper para generar el resumen de los detalles.
  let textoBase = '';                                                 // Variable donde se construye el texto base.

  if (typeof detalles === 'object' && detalles !== null) {            // Si los detalles son un objeto no nulo...
    textoBase = JSON.stringify(detalles);                             // Serializa el objeto a JSON en una sola línea.
  } else if (typeof detalles === 'string') {                          // Si es un string simple...
    textoBase = detalles;                                             // Usa el texto tal cual.
  } else {
    return '-';                                                       // Si no hay detalles, o son de otro tipo, devuelve un guion.
  }

  if (textoBase.length > 120) {                                       // Si el texto es muy largo (> 120 caracteres)...
    return `${textoBase.slice(0, 117)}...`;                           // Lo recorta y agrega "..." al final.
  }

  return textoBase;                                                   // Si no es largo, devuelve el texto completo.
};

/**
 * Formatea la fecha de creación del registro en formato legible
 * para Colombia (fecha y hora cortas).
 *
 * @param {string|Date} createdAt Fecha original del registro.
 * @returns {string} Texto en formato local o "-" si no hay fecha.
 */
const formatearFechaRegistro = (createdAt) => {                       // Helper para formatear la fecha del registro.
  if (!createdAt) {                                                   // Si no hay valor de fecha...
    return '-';                                                       // Devuelve un guion como valor por defecto.
  }

  const fecha = new Date(createdAt);                                  // Construye un objeto Date con el valor recibido.

  if (Number.isNaN(fecha.getTime())) {                                // Si la fecha no es válida...
    return '-';                                                       // Devuelve un guion para evitar mostrar algo incorrecto.
  }

  return fecha.toLocaleString('es-CO', {                              // Devuelve la fecha/hora locale para Colombia.
    dateStyle: 'short',                                               // Fecha corta: dd/mm/aa.
    timeStyle: 'short',                                               // Hora corta: hh:mm.
  });
};

/**
 * Construye el nombre completo del usuario o texto genérico.
 *
 * @param {object} user Objeto user con firstName y lastName.
 * @returns {string} Nombre completo o etiquetas por defecto.
 */
const obtenerNombreUsuario = (user) => {                              // Helper para obtener el nombre del usuario asociado.
  if (!user) {                                                        // Si no hay objeto user...
    return 'Sistema';                                                 // Se considera una acción generada por el sistema.
  }

  const nombre = `${user.firstName || ''} ${user.lastName || ''}`     // Intenta armar "Nombre Apellido".
    .trim();                                                          // Quita espacios sobrantes.

  if (nombre) {                                                       // Si quedó algún nombre útil...
    return nombre;                                                    // Devuelve el nombre armado.
  }

  return 'Usuario sin nombre';                                        // Texto genérico si no hay nombre definido.
};

// =========================
//   Componente principal
// =========================

/**
 * Componente VistaRegistrosAuditoria
 *
 * Vista para mostrar los registros de auditoría del sistema.
 * Cada registro incluye:
 *  - Usuario que realizó la acción.
 *  - Acción ejecutada.
 *  - Recurso afectado.
 *  - Resumen de los detalles (en la tabla).
 *  - Detalle completo (en un modal aparte).
 *
 * Se asume que el acceso a esta vista está restringido a administradores
 * o auditores a nivel de rutas (por ejemplo, usando rutas protegidas
 * tipo RutaAdmin o RutaAuditor dentro del workspace).
 */
const VistaRegistrosAuditoria = () => {                               // Declara el componente funcional principal para la vista de auditoría.

  // =========================
  //   Estados locales
  // =========================

  const [registrosAuditoria, setRegistrosAuditoria] = useState([]);   // Almacena el arreglo de registros de auditoría obtenidos del backend.
  const [cargando, setCargando] = useState(true);                     // Indica si se están cargando los registros (true = en proceso de carga).
  const [error, setError] = useState(null);                           // Guarda un mensaje de error si la carga falla (null = sin error).

  const [registroSeleccionado, setRegistroSeleccionado] = useState(null); // Guarda el registro seleccionado para ver en el modal de detalle.

  // =========================
  //   Carga inicial de logs
  // =========================

  useEffect(() => {                                                   // useEffect que se ejecuta una sola vez al montar el componente.
    const cargarRegistros = async () => {                             // Función asíncrona interna para cargar los registros de auditoría.
      try {
        setCargando(true);                                            // Activa el estado de carga antes de llamar al backend.
        setError(null);                                               // Limpia cualquier error anterior almacenado en estado.

        const respuesta = await obtenerRegistrosAuditoria();          // Llama al servicio de auditoría para obtener los registros desde el backend.
        const normalizados = normalizarRegistrosAuditoria(respuesta); // Normaliza la respuesta a un arreglo de registros.

        setRegistrosAuditoria(normalizados);                          // Actualiza el estado con los registros normalizados.
      } catch (err) {
        console.error('Error al cargar registros de auditoría:', err); // Muestra el error completo en la consola para depuración.
        setError('Error al cargar los registros de auditoría.');      // Mensaje amigable para mostrar en la interfaz de usuario.
      } finally {
        setCargando(false);                                           // Desactiva el estado de carga al finalizar (éxito o error).
      }
    };

    cargarRegistros();                                                // Ejecuta la función de carga inicial.
  }, []);                                                             // Dependencias vacías → solo al montar el componente.

  // =========================
  //   Handler para reintentar
  // =========================

  const manejarReintento = () => {                                    // Función que maneja el clic en "Reintentar" cuando hay un error.
    setCargando(true);                                                // Vuelve a activar el estado de carga.
    setError(null);                                                   // Limpia el mensaje de error previo.

    (async () => {                                                    // Función asíncrona autoejecutable (IIFE) para reutilizar la lógica de carga.
      try {
        const respuesta = await obtenerRegistrosAuditoria();          // Vuelve a solicitar los registros de auditoría al backend.
        const normalizados = normalizarRegistrosAuditoria(respuesta); // Normaliza nuevamente la respuesta.
        setRegistrosAuditoria(normalizados);                          // Actualiza el estado con la lista normalizada.
      } catch (err) {
        console.error('Error al recargar registros de auditoría:', err); // Loguea el error en consola.
        setError('Error al recargar los registros de auditoría.');    // Mensaje amigable si vuelve a fallar la carga.
      } finally {
        setCargando(false);                                           // Apaga el indicador de carga pase lo que pase.
      }
    })();                                                             // Ejecuta inmediatamente la función asíncrona.
  };

  // =========================
  //   Render principal
  // =========================

  return (                                                            // Devuelve el JSX principal de la vista.
    <div className="space-y-6 animate-fade-in-soft">                  {/* Contenedor general con separación vertical y animación suave de entrada. */}
      {/* Tarjeta principal con tema PCM dentro del panel por rol */}
      <div className="pcm-card p-6 backdrop-blur-sm">                 {/* Usa helper .pcm-card (fondo, borde, sombra, radio) + padding extra. */}
        {/* Encabezado de la sección con ícono, título, subtítulo y badge de cantidad */}
        <div className="mb-4 flex items-center justify-between gap-4">
          {/* Bloque de título con ícono */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pcm-surfaceSoft border border-pcm-borderSoft shadow-pcm-soft">
              {/* Contenedor circular para el ícono principal de auditoría. */}
              <ScrollText className="h-5 w-5 text-pcm-primary" />     {/* Ícono de pergamino para representar registros / logs de auditoría. */}
            </div>
            <div>
              <h2 className="text-lg font-bold text-pcm-text sm:text-xl">
                Registros de auditoría                                {/* Título principal de la vista. */}
              </h2>
              <p className="mt-0.5 text-xs text-pcm-muted">
                Historial de acciones realizadas dentro de ProCivil Manager. {/* Subtítulo explicativo en contexto PCM. */}
              </p>
            </div>
          </div>

          {/* Badge con el total de registros cuando hay datos y no hay error */}
          {!cargando && !error && registrosAuditoria.length > 0 && (
            <div className="inline-flex items-center rounded-full border border-pcm-borderSoft bg-pcm-surface px-3 py-1 text-[11px] text-pcm-muted whitespace-nowrap shadow-pcm-soft">
              {/* Chip con el conteo total de registros cargados. */}
              {registrosAuditoria.length} registros                   {/* Muestra el total de registros de auditoría. */}
            </div>
          )}
        </div>

        {/* Contenido según estado de carga / error / datos */}
        {cargando ? (                                                  // Si está en estado de carga, muestra un spinner centrado.
          <div className="flex h-40 items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-pcm-primary" />{/* Spinner con color de marca PCM. */}
          </div>
        ) : error ? (                                                  // Si hay error, muestra tarjeta de error con botón de reintento.
          <div className="rounded-pcm-xl border border-red-500/70 bg-red-950/50 p-4 text-center text-sm text-red-100 shadow-pcm-soft">
            {/* Tarjeta de error con colores rojos suaves y borde destacado. */}
            <p className="mb-2">
              {error}                                                 {/* Mensaje de error guardado en el estado. */}
            </p>
            <button
              type="button"                                           // Botón simple tipo button (no submit de formulario).
              onClick={manejarReintento}                              // Llama a la función de reintento cuando se hace clic.
              className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-red-700"
              // Usa transición general (no transition-colors) y tonos rojos para hover.
            >
              Reintentar                                               {/* Texto del botón de reintento. */}
            </button>
          </div>
        ) : registrosAuditoria.length === 0 ? (                        // Si NO hay error y el arreglo de registros está vacío...
          <div className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-bg/70 p-4 text-center shadow-pcm-soft">
            <p className="text-sm text-pcm-muted">
              No hay registros de auditoría disponibles.               {/* Mensaje amigable cuando no hay registros. */}
            </p>
          </div>
        ) : (
          // Tabla con los registros de auditoría cuando hay datos
          <div className="overflow-x-auto rounded-pcm-xl border border-pcm-borderSoft/70 bg-pcm-surfaceSoft/40">
            {/* Contenedor con scroll horizontal suave y borde PCM. */}
            <table className="min-w-full divide-y divide-pcm-borderSoft/60">
              {/* Encabezado de la tabla */}
              <thead className="bg-pcm-bg/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-pcm-muted">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-pcm-muted">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-pcm-muted">
                    Acción
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-pcm-muted">
                    Recurso
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-pcm-muted">
                    Detalles (resumen)
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de la tabla */}
              <tbody className="divide-y divide-pcm-borderSoft/50 bg-pcm-bg/60">
                {registrosAuditoria.map((registro) => (              // Recorre cada registro de auditoría.
                  <tr
                    key={registro._id || registro.id}               // Usa el _id o id del registro como clave única.
                    className="cursor-pointer transition duration-150 hover:bg-pcm-surfaceSoft/60"
                    // Fila interactiva: cambia suavemente el fondo al hacer hover.
                    onClick={() => setRegistroSeleccionado(registro)} // Al hacer clic en la fila, abre el modal con ese registro.
                  >
                    {/* Columna fecha: formateada en español (Colombia) */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-pcm-text sm:text-sm">
                      {formatearFechaRegistro(registro.createdAt)}  {/* Usa helper que formatea fecha/hora. */}
                    </td>

                    {/* Columna usuario: nombre y apellido o "Sistema" si no hay usuario */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-pcm-text sm:text-sm">
                      {obtenerNombreUsuario(registro.user)}         {/* Usa helper para construir el nombre del usuario. */}
                    </td>

                    {/* Columna acción ejecutada */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-pcm-text sm:text-sm">
                      {registro.action || '-'}                      {/* Acción o "-" si viene vacío. */}
                    </td>

                    {/* Columna recurso afectado */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-pcm-text sm:text-sm">
                      {registro.resource || '-'}                    {/* Nombre del recurso o "-" si no viene definido. */}
                    </td>

                    {/* Columna detalles: resumen corto para no saturar la tabla */}
                    <td className="max-w-xs truncate whitespace-nowrap px-4 py-3 text-[11px] text-pcm-text sm:text-xs md:text-sm">
                      {obtenerResumenDetalles(registro.details)}    {/* Muestra un resumen corto de los detalles del registro. */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle de auditoría: muestra el registro completo seleccionado */}
      <ModalDetalleRegistroAuditoria
        estaAbierto={!!registroSeleccionado}                        // El modal está abierto solo si hay un registro seleccionado.
        registroAuditoria={registroSeleccionado}                    // Pasa el registro seleccionado al modal para mostrar su detalle.
        alCerrar={() => setRegistroSeleccionado(null)}              // Al cerrar el modal, limpia la selección (vuelve a null).
      />
    </div>
  );
};

// Exporta el componente para usarlo en el dashboard/admin.
export default VistaRegistrosAuditoria;                              // Exportación por defecto de la vista de registros de auditoría.
