// File: frontend/src/modules/projects/modals/ModalEliminarProyecto.jsx   // Ruta del archivo dentro del módulo de proyectos.
// Description: Modal de confirmación para eliminar proyectos desde el     // Descripción: modal interno del workspace que muestra
//              panel de administración. Muestra un mensaje de advertencia,// advertencias antes de eliminar un proyecto, obliga a
//              obliga a confirmar la acción mediante una casilla de       // marcar una casilla de confirmación, ejecuta la
//              verificación, ejecuta la eliminación usando el servicio    // eliminación en el sistema (servicio deleteProject) y
//              correspondiente y notifica al padre para actualizar la     // notifica al componente padre. Usa el tema visual PCM, con
//              lista de proyectos, usando el tema visual global PCM y     // paneles adaptados al rol (.pcm-panel, .pcm-panel--ROL)
//              paneles que se adaptan al rol del usuario.                 // y conservando acentos rojos por tratarse de acción crítica.

// =======================================================================
// Importaciones principales de React
// =======================================================================

import React, {
  useState,                                                                // Hook para manejar estados locales.
  useEffect                                                                // Hook para manejar efectos (listeners de teclado, etc.).
} from 'react';

// =======================================================================
// Importación de íconos desde lucide-react
// =======================================================================

import {
  X,                                                                      // Ícono de cerrar para el botón de cierre del modal.
  Trash2,                                                                  // Ícono de papelera para resaltar la acción de eliminar.
  AlertTriangle,                                                           // Ícono de advertencia para el encabezado del modal.
  FolderMinus                                                              // Ícono opcional para representar eliminación de proyecto/archivos.
} from 'lucide-react';                                                     // Se importa todo desde el paquete lucide-react.

// =======================================================================
// Importación de servicios de API de ProCivil Manager
// =======================================================================

import {
  deleteProject                                                            // Servicio que elimina un proyecto por su identificador.
} from '../../../services/api/api.js';                                     // Ruta relativa hacia la capa de servicios de API.

// =======================================================================
// Funciones auxiliares para aplicar colores según el rol del usuario
// =======================================================================

/**
 * obtenerClasesRolPanel
 * Devuelve las clases base de panel PCM según el rol del usuario:
 *  - admin         → .pcm-panel .pcm-panel--admin
 *  - lider de obra → .pcm-panel .pcm-panel--lider
 *  - cliente       → .pcm-panel .pcm-panel--cliente
 *  - auditor       → .pcm-panel .pcm-panel--auditor
 *  - otro          → .pcm-panel
 */
const obtenerClasesRolPanel = (rol) => {                                   // Función que mapea el rol a clases de panel PCM.
  switch (rol) {                                                           // Evalúa el rol recibido.
    case 'admin':                                                          // Si el usuario es admin...
      return 'pcm-panel pcm-panel--admin';                                 // Devuelve las clases de panel para admin.
    case 'lider de obra':                                                  // Si el usuario es líder de obra...
      return 'pcm-panel pcm-panel--lider';                                 // Devuelve las clases de panel para líder.
    case 'cliente':                                                        // Si el usuario es cliente...
      return 'pcm-panel pcm-panel--cliente';                               // Devuelve las clases de panel para cliente.
    case 'auditor':                                                        // Si el usuario es auditor...
      return 'pcm-panel pcm-panel--auditor';                               // Devuelve las clases de panel para auditor.
    default:                                                               // Cualquier otro rol o valor desconocido...
      return 'pcm-panel';                                                  // Devuelve solo la clase base de panel.
  }
};

// =======================================================================
// Componente principal del modal para eliminar proyectos
// =======================================================================

/**
 * ModalEliminarProyecto
 * Modal de confirmación que se muestra antes de eliminar un proyecto.
 *
 * Props esperadas (en inglés) que se renombran internamente a español:
 *  - projectToDelete: objeto del proyecto que se pretende eliminar.
 *  - onClose: función para cerrar el modal sin eliminar.
 *  - onDeleted: función que se ejecuta cuando la eliminación se completa.
 */
const ModalEliminarProyecto = ({
  projectToDelete: proyectoAEliminar,                                      // Alias en español para la prop projectToDelete.
  onClose: alCerrar,                                                       // Alias en español para la función de cierre onClose.
  onDeleted: alEliminado                                                   // Alias en español para el callback posterior a la eliminación.
}) => {
  // Si no hay proyecto a eliminar, el modal no se muestra.
  if (!proyectoAEliminar) return null;                                     // Retorna null para no renderizar nada sin proyecto.

  // Estado local que indica si actualmente se está ejecutando la eliminación.
  const [eliminando, setEliminando] = useState(false);                     // true mientras se ejecuta el proceso de eliminación.

  // Estado local para almacenar mensajes de error que se mostrarán en el modal.
  const [mensajeError, setMensajeError] = useState(null);                  // Texto de error amigable para el usuario.

  // Estado local para la casilla de verificación de confirmación explícita.
  const [confirmado, setConfirmado] = useState(false);                     // true cuando el usuario marca la casilla de confirmación.

  // ---------------------------------------------------------------------
  // Detección del rol del usuario actual para aplicar colores por rol
  // ---------------------------------------------------------------------

  let rolUsuarioActual = 'admin';                                          // Define rol por defecto (admin) para el diseño del panel.

  try {                                                                    // Intenta leer el usuario desde localStorage.
    const usuarioLocal = JSON.parse(localStorage.getItem('user') || '{}'); // Parsea el objeto user almacenado (si existe).
    if (usuarioLocal && typeof usuarioLocal.role === 'string') {          // Verifica que tenga una propiedad role válida.
      rolUsuarioActual = usuarioLocal.role;                                // Asigna el rol encontrado (admin, lider de obra, cliente, auditor, etc.).
    }
  } catch (error) {                                                        // Si ocurre cualquier error al leer o parsear...
    rolUsuarioActual = 'admin';                                            // Mantiene admin como rol por defecto para no romper el diseño.
  }

  const clasesPanelRol = obtenerClasesRolPanel(rolUsuarioActual);         // Calcula las clases de panel PCM según el rol actual.

  // ---------------------------------------------------------------------
  // Cierre por tecla ESC
  // ---------------------------------------------------------------------

  useEffect(() => {                                                        // Efecto para escuchar la tecla ESC.
    const manejarKeyDown = (evento) => {                                   // Función que se ejecuta cuando se presiona una tecla.
      if (evento.key === 'Escape' && !eliminando) {                        // Si la tecla es ESC y no se está eliminando...
        if (typeof alCerrar === 'function') {                              // Verifica que alCerrar sea una función válida.
          alCerrar();                                                      // Cierra el modal.
        }
      }
    };

    window.addEventListener('keydown', manejarKeyDown);                    // Agrega el listener al presionar teclas.

    return () => {
      window.removeEventListener('keydown', manejarKeyDown);               // Limpia el listener al desmontar el componente.
    };
  }, [alCerrar, eliminando]);                                              // Dependencias: función de cierre y estado eliminando.

  // ---------------------------------------------------------------------
  // Cierre por clic en el overlay (fondo oscuro)
  // ---------------------------------------------------------------------

  const manejarClickOverlay = () => {                                      // Función que maneja los clics sobre el overlay.
    if (eliminando) return;                                                // Si está eliminando, no permite cerrar.
    if (typeof alCerrar === 'function') {                                  // Verifica que exista función de cierre.
      alCerrar();                                                          // Cierra el modal.
    }
  };

  // =====================================================================
  // Handler principal para ejecutar la eliminación del proyecto
  // =====================================================================

  /**
   * manejarEliminarProyecto
   * Ejecuta la eliminación llamando al servicio deleteProject, valida que
   * haya proyecto, que tenga identificador y que el usuario haya marcado
   * la casilla de confirmación. Si todo sale bien, notifica al padre y
   * cierra el modal.
   */
  const manejarEliminarProyecto = async () => {                            // Declara la función async para eliminar.
    // Reinicia el mensaje de error antes de validar.
    setMensajeError(null);                                                 // Limpia mensajes de error previos.

    // Validación: debe estar marcada la casilla de confirmación.
    if (!confirmado) {                                                     // Si la casilla no está marcada...
      setMensajeError(                                                     // Configura un mensaje pidiendo confirmación explícita.
        'Por favor marca la casilla de confirmación para eliminar el proyecto.'
      );
      return;                                                              // No continúa con la eliminación.
    }

    // Validación: el proyecto debe tener un identificador (_id) válido.
    if (!proyectoAEliminar._id) {                                          // Si no hay _id en el proyecto...
      setMensajeError(                                                     // Muestra mensaje indicando que falta información clave.
        'No se encontró un identificador válido para el proyecto. No es posible eliminarlo.'
      );
      return;                                                              // No llama al servicio porque no hay forma de identificar el recurso.
    }

    try {
      // Marca el inicio del proceso de eliminación.
      setEliminando(true);                                                 // Activa el estado de carga para deshabilitar botones.

      // Llama al servicio de API para eliminar el proyecto en el sistema.
      await deleteProject(proyectoAEliminar._id);                          // Ejecuta la eliminación usando el _id.

      // Si el padre proporcionó un callback para cuando se elimine, se llama.
      if (typeof alEliminado === 'function') {                             // Verifica que alEliminado sea una función.
        alEliminado(proyectoAEliminar._id, proyectoAEliminar);             // Notifica al padre enviando el _id y el objeto completo.
      }

      // Finalmente, si hay función de cierre, se cierra el modal.
      if (typeof alCerrar === 'function') {                                // Verifica que alCerrar sea una función.
        alCerrar();                                                        // Cierra el modal después de eliminar.
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);                 // Registra el error en consola para depuración.

      // Asigna un mensaje genérico de error para el usuario final.
      setMensajeError(
        'Ocurrió un error al intentar eliminar el proyecto. Intenta de nuevo o verifica tu conexión.'
      );
    } finally {
      // Desactiva el estado de carga independientemente del resultado.
      setEliminando(false);                                                // Libera los botones para permitir reintentos.
    }
  };

  // =====================================================================
  // Render principal del modal de eliminación
  // =====================================================================

  // Extrae algunos datos útiles del proyecto para mostrarlos en el texto.
  const tituloProyecto =                                                   // Determina el título a mostrar del proyecto.
    proyectoAEliminar.title ||                                             // Prioriza la propiedad title.
    proyectoAEliminar.nombre ||                                            // Luego nombre (por compatibilidad).
    'este proyecto';                                                       // Valor por defecto cuando no hay títulos claros.

  const tipoProyecto = proyectoAEliminar.type || null;                     // Tipo de proyecto si está disponible.
  const ubicacionProyecto = proyectoAEliminar.location || null;            // Ubicación si fue definida.

  return (                                                                 // Devuelve la estructura JSX del modal.
    // Capa oscura de fondo que cubre toda la pantalla y centra el modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" // Overlay de fondo.
      role="dialog"                                                       // Rol de diálogo para accesibilidad.
      aria-modal="true"                                                   // Indica que es un modal que bloquea el fondo.
      aria-labelledby="titulo-modal-eliminar-proyecto"                    // Asocia el título como encabezado del diálogo.
      onClick={manejarClickOverlay}                                       // Permite cerrar al hacer clic en el fondo oscuro.
    >
      {/* Contenedor principal del modal con fondo de panel PCM por rol, borde rojo y sombra suave. */}
      <div
        className={`pcm-panel-fondo ${clasesPanelRol} backdrop-blur-xl rounded-pcm-xl border border-red-500/40 shadow-pcm-soft w-full max-w-lg max-h-[80vh] overflow-hidden animate-fade-in-soft`} // Panel PCM con acento rojo por ser acción crítica.
        onClick={(evento) => evento.stopPropagation()}                     // Detiene la propagación para que los clics dentro NO cierren el modal.
      >
        {/* Layout interno en columna: encabezado, cuerpo y pie del modal. */}
        <div className="flex flex-col h-full">
          {/* Encabezado del modal con icono de advertencia, títulos y botón de cierre. */}
          <div className="pcm-panel-header flex items-center justify-between p-5 border-b border-white/10">
            {/* Lado izquierdo: icono de advertencia y textos descriptivos. */}
            <div className="flex items-center gap-3">
              {/* Contenedor del ícono de advertencia en rojo suave. */}
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={22} />                                {/* Ícono de advertencia. */}
              </div>
              {/* Bloque de título y subtítulo. */}
              <div>
                <h3
                  id="titulo-modal-eliminar-proyecto"                     // ID usado en aria-labelledby.
                  className="text-lg font-bold text-pcm-text"
                >
                  Eliminar proyecto                                       {/* Título principal del modal. */}
                </h3>
                <p className="text-sm text-pcm-muted">
                  Esta acción no se puede deshacer.                       {/* Subtítulo de advertencia. */}
                </p>
              </div>
            </div>

            {/* Botón de cierre en la esquina superior derecha. */}
            <button
              type="button"                                               // Evita comportamiento de submit.
              onClick={alCerrar}                                          // Llama al callback de cierre.
              className="p-2 rounded-full text-pcm-muted hover:text-pcm-accent hover:bg-white/5 transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={eliminando}                                       // Deshabilita mientras se está eliminando.
            >
              <X size={20} />                                             {/* Ícono de X para cerrar. */}
            </button>
          </div>

          {/* Cuerpo del modal con descripción, detalles y casilla de confirmación. */}
          <div className="flex-1 overflow-y-auto p-5 pcm-scroll-y">
            {/* Bloque de texto principal de advertencia. */}
            <div className="space-y-4 text-sm text-pcm-text">
              {/* Resumen del proyecto que se va a eliminar. */}
              <div className="bg-pcm-surfaceSoft/80 border border-red-500/30 rounded-2xl p-4 flex gap-3">
                {/* Ícono que complementa la metáfora de eliminación de proyecto/archivos. */}
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400 shrink-0">
                  <FolderMinus size={22} />                               {/* Ícono de carpeta con eliminación. */}
                </div>
                {/* Texto con la información del proyecto. */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-300">
                    Proyecto a eliminar                                   {/* Etiqueta pequeña. */}
                  </p>
                  <p className="text-base font-semibold text-pcm-text">
                    {tituloProyecto}                                      {/* Título del proyecto. */}
                  </p>

                  {/* Línea con tipo de proyecto y ubicación si están disponibles. */}
                  {(tipoProyecto || ubicacionProyecto) && (
                    <p className="text-xs text-pcm-muted">
                      {tipoProyecto && (
                        <span>
                          Tipo:&nbsp;
                          <span className="text-pcm-accent font-medium">
                            {tipoProyecto}
                          </span>
                        </span>
                      )}
                      {tipoProyecto && ubicacionProyecto && ' · '}
                      {ubicacionProyecto && (
                        <span>
                          Ubicación:&nbsp;
                          <span className="text-pcm-accent font-medium">
                            {ubicacionProyecto}
                          </span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Mensaje de advertencia más detallado sobre las consecuencias. */}
              <div className="bg-pcm-bg/70 rounded-2xl p-4 border border-white/10 space-y-2">
                <p>
                  Al eliminar este proyecto, se retirará de los paneles de
                  administración y del tablero de trabajo. Dependiendo de la
                  configuración del sistema de ProCivil Manager, también pueden
                  eliminarse o quedar desvinculados:
                </p>
                <ul className="list-disc list-inside text-pcm-muted text-xs space-y-1">
                  <li>Registros de seguimiento y estados asociados.</li>
                  <li>Alertas o notificaciones ligadas a este proyecto.</li>
                  <li>
                    Vinculaciones con usuarios del equipo (residente, maestro,
                    auxiliares, etc.).
                  </li>
                  <li>Archivos adjuntos y documentos relacionados.</li>
                </ul>
                <p className="text-xs text-red-300 font-semibold">
                  Esta operación es definitiva y no podrás recuperar la
                  información desde la interfaz de ProCivil Manager.
                </p>
              </div>

              {/* Casilla de confirmación obligatoria. */}
              <div className="mt-2">
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"                                       // Casilla de verificación estándar.
                    checked={confirmado}                                  // Valor vinculado al estado local.
                    onChange={(evento) => setConfirmado(evento.target.checked)} // Actualiza el estado confirmado.
                    className="mt-0.5 accent-red-500"                     // Estilo básico del checkbox.
                    disabled={eliminando}                                 // Deshabilita mientras se elimina.
                  />
                  <span className="text-pcm-text">
                    Confirmo que deseo eliminar definitivamente el proyecto{' '}
                    <span className="font-semibold text-red-300">
                      {tituloProyecto}
                    </span>{' '}
                    y entiendo que esta acción no se puede deshacer.
                  </span>
                </label>
              </div>

              {/* Mensaje de error si algo sale mal. */}
              {mensajeError && (
                <div className="mt-3 text-xs text-red-300 bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-2">
                  {mensajeError}                                          {/* Muestra el mensaje de error actual. */}
                </div>
              )}
            </div>
          </div>

          {/* Pie del modal con botones de acción: Cancelar y Eliminar. */}
          <div className="flex justify-end gap-3 p-5 border-t border-white/10 bg-pcm-bg/80">
            {/* Botón de cancelar: cierra el modal sin eliminar. */}
            <button
              type="button"
              onClick={alCerrar}                                           // Llama al callback de cierre.
              className="px-5 py-2.5 rounded-xl border border-white/15 bg-pcm-bg/70 hover:bg-pcm-bg text-pcm-text text-sm font-semibold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={eliminando}                                       // Deshabilita durante la eliminación.
            >
              Cancelar
            </button>

            {/* Botón de eliminación definitiva: dispara manejarEliminarProyecto. */}
            <button
              type="button"
              onClick={manejarEliminarProyecto}                            // Ejecuta la eliminación al hacer clic.
              className="pcm-btn-danger px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={eliminando}                                       // Evita clics múltiples mientras se elimina.
            >
              <Trash2 size={18} />                                        {/* Ícono de papelera. */}
              {eliminando ? 'Eliminando...' : 'Eliminar proyecto'}        {/* Texto dinámico según estado. */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente para poder usarlo en otras partes de la aplicación.
export default ModalEliminarProyecto;                                      // Exportación por defecto del modal en español.
