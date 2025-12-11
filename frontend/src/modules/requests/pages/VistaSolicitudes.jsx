// File: frontend/src/modules/requests/pages/VistaSolicitudes.jsx         // Ruta del archivo dentro del módulo de solicitudes.
// Description: Vista para gestión de solicitudes de proyectos y materiales. // Descripción: permite listar, crear y actualizar
//              Administra solicitudes según rol (admin, líder de obra,      // solicitudes de proyectos y materiales según el
//              cliente), permitiendo crear solicitudes y cambiar estados,   // rol (admin / líder / cliente), usando el tema
//              alineado al tema visual ProCivil Manager (paleta pcm,        // visual PCM (pcm-card, pcm-panel por rol, sombras
//              sombras, animaciones) y consumiendo la API REST de PCM.      // y animaciones) y consumiendo la API REST de PCM.

// =====================================================================================
// Importaciones principales de React
// =====================================================================================

import React, { useEffect, useState } from 'react';                          // Importa React y los hooks useEffect/useState para manejar estado y ciclos de vida.

// =====================================================================================
// Importación de servicios de la API central de ProCivil Manager
// =====================================================================================

import {
  obtenerSolicitudes,                                                       // Servicio para obtener la lista de solicitudes desde el backend.
  crearSolicitud,                                                           // Servicio para crear nuevas solicitudes (proyecto o material).
  actualizarEstadoSolicitud,                                                // Servicio para actualizar el estado de una solicitud (solo admin).
  obtenerMateriales                                                         // Servicio para obtener la lista de materiales (para líder de obra).
} from '../../../services/api/api.js';                                      // Importa los servicios desde el módulo central de API.

// =====================================================================================
// Importación de componentes compartidos con tema PCM
// =====================================================================================

import EncabezadoSeccion from '../../workspace/components/EncabezadoSeccion.jsx'; // Encabezado de sección reutilizable (barra + título PCM).
// Importamos el modal de detalle de solicitud para poder ver y responder solicitudes.
import ModalDetalleSolicitud from '../modals/ModalDetalleSolicitud.jsx';

// =====================================================================================
// Subcomponente: Modal de mensajes genéricos (validaciones, éxito, error)
// =====================================================================================

const ModalMensajesSolicitudes = ({                                         // Declara el subcomponente ModalMensajesSolicitudes.
  abierto,                                                                  // Prop booleana que indica si el modal está abierto.
  titulo,                                                                   // Prop con el título a mostrar en el modal.
  mensaje,                                                                  // Prop con el mensaje o cuerpo de texto del modal.
  onCerrar                                                                  // Prop con la función para cerrar el modal.
}) => {
  if (!abierto) return null;                                               // Si no está abierto, no renderiza nada (devuelve null).

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" // Overlay fijo que cubre toda la pantalla con fondo semitransparente.
    >
      <div
        className="pcm-card w-full max-w-md mx-4 animate-scale-in"         // Contenedor del modal usando pcm-card, ancho máximo y animación de entrada.
      >
        <div className="space-y-4">                                       {/* Contenedor interno con separación vertical. */}
          <h3
            className="text-lg font-bold text-pcm-primary"                // Título del modal en color principal PCM.
          >
            {titulo}                                                      {/* Muestra el título recibido por props. */}
          </h3>

          <p
            className="text-sm text-pcm-text whitespace-pre-line"         // Párrafo del mensaje, respetando saltos de línea.
          >
            {mensaje}                                                     {/* Muestra el mensaje recibido por props. */}
          </p>

          <div className="flex justify-end">                              {/* Contenedor del botón alineado a la derecha. */}
            <button
              type="button"                                               // Botón de tipo normal (no envía formularios).
              onClick={onCerrar}                                          // Llama la función onCerrar al hacer clic.
              className="pcm-btn-primary text-sm px-4 py-2 shadow-pcm-soft transition duration-150" // Usa botón primario PCM con sombra suave.
            >
              Entendido                                                   {/* Texto del botón de cierre. */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================================
// Subcomponente: Modal de confirmación de cambio de estado de solicitud
// =====================================================================================

const ModalConfirmarEstadoSolicitud = ({                                   // Declara el subcomponente ModalConfirmarEstadoSolicitud.
  abierto,                                                                 // Prop booleana para indicar si el modal se muestra.
  estadoActual,                                                            // Prop con el estado actual de la solicitud.
  nuevoEstado,                                                             // Prop con el nuevo estado seleccionado.
  onCancelar,                                                              // Prop con función para cancelar/cerrar sin cambios.
  onConfirmar                                                              // Prop con función para confirmar el cambio de estado.
}) => {
  if (!abierto) return null;                                              // Si no está abierto, no renderiza nada.

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" // Overlay oscuro sobre toda la pantalla.
    >
      <div
        className="pcm-card w-full max-w-md mx-4 animate-scale-in"        // Contenedor del modal con tema pcm-card y animación.
      >
        <div className="space-y-4">                                       {/* Contenedor interno con espacio vertical entre elementos. */}
          <h3
            id="modal-confirmar-estado-solicitud"                         // Id accesible del título para aria-labelledby si se usa.
            className="text-lg font-bold text-pcm-primary"                // Estilo de título con color principal PCM.
          >
            Confirmar cambio de estado                                    {/* Texto del encabezado del modal. */}
          </h3>

          <p className="text-sm text-pcm-text">                           {/* Párrafo con el mensaje explicativo. */}
            ¿Seguro que deseas cambiar el estado de esta solicitud de{' '}
            <span className="font-semibold">
              {estadoActual || 'pendiente'}                               {/* Muestra el estado actual resaltado. */}
            </span>{' '}
            a{' '}
            <span className="font-semibold">
              {nuevoEstado}                                               {/* Muestra el nuevo estado resaltado. */}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3">                        {/* Contenedor de botones alineados a la derecha. */}
            <button
              type="button"                                               // Botón de cancelar.
              onClick={onCancelar}                                        // Llama a la función de cancelar.
              className="px-4 py-2 rounded-xl border border-white/15 text-sm
                         text-pcm-muted hover:text-pcm-text hover:bg-white/5
                         transition duration-150"                         // Estilos de botón "ghost" PCM.
            >
              Cancelar                                                    {/* Texto del botón de cancelar. */}
            </button>

            <button
              type="button"                                               // Botón de confirmar.
              onClick={onConfirmar}                                       // Llama a la función de confirmación.
              className="pcm-btn-primary text-sm px-4 py-2 shadow-pcm-soft transition duration-150" // Botón principal PCM.
            >
              Confirmar                                                   {/* Texto del botón principal. */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================================
// Helpers para rol y clases de panel PCM
// =====================================================================================

/**
 * Normaliza un rol a minúsculas sin espacios adicionales.
 * Ejemplos:
 *  - "Admin"           → "admin"
 *  - "  lider de obra" → "lider de obra"
 *  - "CLIENTE"         → "cliente"
 */
const normalizarRol = (rol) => {                                           // Declara helper para normalizar el rol recibido.
  if (typeof rol !== 'string') return '';                                  // Si no es una cadena, devuelve cadena vacía.
  return rol.trim().toLowerCase();                                         // Elimina espacios y pasa todo a minúsculas.
};

/**
 * Devuelve las clases de panel PCM según el rol normalizado.
 * Usa las clases globales:
 *  - .pcm-panel           → base del panel interno
 *  - .pcm-panel--admin    → color azul para administradores
 *  - .pcm-panel--lider    → color naranja para líderes de obra
 *  - .pcm-panel--cliente  → color verde para clientes
 *  - .pcm-panel--auditor  → color morado para auditores
 */
const obtenerClasesRolPanel = (rolNormalizado) => {                        // Declara helper para mapear rol → clases de panel.
  switch (rolNormalizado) {                                               // Evalúa el rol normalizado.
    case 'admin':                                                         // Caso administrador.
      return 'pcm-panel pcm-panel--admin';                                // Devuelve clases de panel azul (admin).
    case 'lider de obra':                                                 // Caso líder de obra.
      return 'pcm-panel pcm-panel--lider';                                // Devuelve clases de panel naranja (líder).
    case 'cliente':                                                       // Caso cliente.
      return 'pcm-panel pcm-panel--cliente';                              // Devuelve clases de panel verde (cliente).
    case 'auditor':                                                       // Caso auditor.
      return 'pcm-panel pcm-panel--auditor';                              // Devuelve clases de panel morado (auditor).
    default:                                                              // Cualquier otro rol o ausencia de rol.
      return 'pcm-panel';                                                 // Devuelve panel neutro PCM.
  }
};

// =====================================================================================
// Componente principal de la vista de solicitudes
// =====================================================================================

const VistaSolicitudes = () => {                                           // Declara el componente funcional VistaSolicitudes.
  const [solicitudes, setSolicitudes] = useState([]);                      // Estado con la lista de solicitudes obtenidas desde el backend.
  const [materiales, setMateriales] = useState([]);                        // Estado con la lista de materiales (solo se usa para líder de obra).
  const [estaCargando, setEstaCargando] = useState(true);                 // Estado que indica si se está cargando la información inicial.

  const [nuevoTipo, setNuevoTipo] = useState('material');                 // Estado para el tipo de solicitud a crear: 'material' o 'proyecto'.
  const [titulo, setTitulo] = useState('');                               // Estado para el título de la nueva solicitud.
  const [descripcion, setDescripcion] = useState('');                     // Estado para la descripción de la nueva solicitud.
  const [items, setItems] = useState([]);                                 // Estado con la lista de ítems de materiales para solicitudes de tipo "material".

  // Estados para filtros y modal de detalle
  const [filtroEstado, setFiltroEstado] = useState('todas');              // Filtro por estado (todas, pendiente, aprobada, rechazada, procesada)
  const [filtroTipo, setFiltroTipo] = useState('todas');                  // Filtro por tipo de solicitud (todas, proyecto, material)
  const [solicitudIdDetalle, setSolicitudIdDetalle] = useState(null);     // ID de la solicitud cuyo detalle se mostrará en el modal
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);  // Bandera para controlar la visibilidad del modal de detalle

  const [modalInfo, setModalInfo] = useState({                            // Estado para el modal de mensajes (validaciones, éxito, error).
    open: false,                                                          // Indica si el modal está visible.
    title: '',                                                            // Título a mostrar.
    message: ''                                                           // Mensaje a mostrar.
  });

  const [confirmEstado, setConfirmEstado] = useState({                    // Estado para el modal de confirmación de cambio de estado (solo admin).
    open: false,                                                          // Indica si el modal está visible.
    solicitudId: null,                                                    // ID de la solicitud en la que se hará el cambio.
    nuevoEstado: '',                                                      // Nuevo estado seleccionado.
    estadoActual: ''                                                      // Estado actual de la solicitud.
  });

  const mostrarModal = (tituloModal, mensajeModal) => {                   // Función de conveniencia para abrir el modal de mensajes.
    setModalInfo({                                                        // Actualiza el estado del modal de mensajes.
      open: true,                                                         // Abre el modal.
      title: tituloModal,                                                 // Asigna el título recibido.
      message: mensajeModal                                               // Asigna el mensaje recibido.
    });
  };

  const usuario = (() => {                                                // IIFE para leer la información del usuario autenticado.
    try {                                                                 // Intenta acceder a localStorage de forma segura.
      if (typeof window === 'undefined') return {};                       // Si no hay window (SSR), devuelve objeto vacío.
      const raw =
        localStorage.getItem('user') ||                                   // Intenta primero con la clave 'user'.
        localStorage.getItem('pcm_usuario') ||                            // Luego con la clave 'pcm_usuario'.
        '{}';                                                             // Si ninguna existe, usa un objeto vacío.
      return JSON.parse(raw);                                             // Parsea el JSON obtenido.
    } catch {                                                             // Si hay error al leer o parsear...
      return {};                                                          // Devuelve objeto vacío para no romper la vista.
    }
  })();

  const rol = normalizarRol(usuario.role || usuario.rol);                // Extrae y normaliza el rol desde el objeto usuario.

  const esAdmin = rol === 'admin';                                       // Flag: true si el usuario es administrador.
  const esLiderObra = rol === 'lider de obra';                           // Flag: true si el usuario es líder de obra.
  const esCliente = rol === 'cliente';                                   // Flag: true si el usuario es cliente.

  const clasesPanelRol = obtenerClasesRolPanel(rol);                     // Calcula las clases de panel PCM basadas en el rol para colorear la vista.

  useEffect(() => {                                                      // Efecto para cargar datos iniciales al montar el componente.
    cargarSolicitudes();                                                 // Carga la lista de solicitudes desde el backend cuando se monta.

    if (esLiderObra) {                                                   // Si el rol es líder de obra...
      cargarMateriales();                                                // Carga también la lista de materiales disponibles.
      setNuevoTipo('material');                                          // Fija el tipo de solicitud a "material".
    } else if (esCliente) {                                              // Si el rol es cliente...
      setNuevoTipo('proyecto');                                          // Fija el tipo de solicitud a "proyecto".
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps              // Se ejecuta solo al montar el componente (decisión intencional).
  }, []);                                                                // Arreglo de dependencias vacío para un solo disparo en el montaje.

  // Efecto: recargar las solicitudes cuando cambian los filtros de estado o tipo.
  useEffect(() => {
    cargarSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroTipo]);

  const cargarSolicitudes = async () => {                                // Función para cargar las solicitudes desde el backend.
    try {
      setEstaCargando(true);                                             // Activa estado de carga antes de la petición.

      // Construye filtros para la API a partir de los select de estado y tipo.
      const params = {};
      if (filtroEstado && filtroEstado !== 'todas') {
        params.estado = filtroEstado;
      }
      if (filtroTipo && filtroTipo !== 'todas') {
        params.tipo = filtroTipo;
      }

      const data = await obtenerSolicitudes(params);                     // Llama al servicio de backend con filtros.

      let lista = [];                                                    // Inicializa arreglo que contendrá las solicitudes finales.
      if (Array.isArray(data)) {                                         // Si la respuesta es un array directamente...
        lista = data;                                                    // Usa ese array.
      } else if (Array.isArray(data?.solicitudes)) {                      // Si viene en la propiedad 'solicitudes'...
        lista = data.solicitudes;                                        // Usa esa lista.
      } else if (Array.isArray(data?.items)) {                            // Si viene en la propiedad 'items'...
        lista = data.items;                                              // Usa esa lista.
      }

      setSolicitudes(lista);                                             // Actualiza el estado con la lista resultante.
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);              // Loguea cualquier error de carga en consola.
      mostrarModal(                                                      // Muestra un mensaje amigable en caso de error de carga.
        'Error al cargar solicitudes',
        'Ocurrió un problema al obtener las solicitudes. Por favor intenta nuevamente.'
      );
    } finally {
      setEstaCargando(false);                                            // Desactiva estado de carga siempre.
    }
  };

  const cargarMateriales = async () => {                                 // Función para cargar la lista de materiales (para líder de obra).
    try {
      const mats = await obtenerMateriales();                            // Llama al servicio de backend para obtener materiales.
      setMateriales(Array.isArray(mats) ? mats : []);                    // Asegura que siempre sea un array.
    } catch (error) {
      console.error('Error al cargar materiales:', error);               // Loguea error si falla la carga de materiales.
    }
  };

  const manejarCambioEstado = async (id, nuevoEstado) => {               // Función para actualizar el estado de una solicitud (solo admin).
    try {
      await actualizarEstadoSolicitud(id, nuevoEstado);                  // Llama al servicio de actualización de estado en backend.
      await cargarSolicitudes();                                         // Recarga la lista para ver cambios reflejados.
    } catch (error) {
      console.error('Error al actualizar estado:', error);               // Loguea error si falla la actualización.
      mostrarModal(                                                      // Muestra modal de error al usuario si algo falla.
        'Error al actualizar estado',
        'No se pudo actualizar el estado de la solicitud. Intenta nuevamente.'
      );
    }
  };

  const manejarSelectEstadoChange = (solicitud, nuevoEstado) => {        // Abre el modal de confirmación al cambiar el select de estado.
    if (nuevoEstado === solicitud.estado) return;                        // Si el estado no cambia, no hace nada.

    setConfirmEstado({                                                   // Crea el estado para mostrar el modal de confirmación.
      open: true,                                                        // Abre el modal.
      solicitudId: solicitud._id,                                        // Guarda el ID de la solicitud.
      nuevoEstado,                                                       // Guarda el nuevo estado elegido.
      estadoActual: solicitud.estado                                     // Guarda el estado actual.
    });
  };

  const manejarAgregarItem = () => {                                     // Maneja la adición de una nueva fila de material en la solicitud.
    setItems((prev) => [...prev, { material: '', cantidad: 1 }]);        // Agrega un nuevo ítem con material vacío y cantidad 1.
  };

  const manejarCambioItem = (indice, campo, valor) => {                  // Maneja los cambios de cada campo dentro de una fila de material.
    const actualizado = [...items];                                      // Clona el array actual de ítems.
    actualizado[indice] = { ...actualizado[indice], [campo]: valor };    // Actualiza el campo correspondiente.
    setItems(actualizado);                                               // Actualiza el estado con la nueva lista.
  };

  // Abre el modal de detalle para la solicitud indicada
  const abrirModalDetalle = (id) => {
    setSolicitudIdDetalle(id);
    setModalDetalleAbierto(true);
  };

  // Cierra el modal de detalle y limpia la solicitud seleccionada
  const cerrarModalDetalle = () => {
    setModalDetalleAbierto(false);
    setSolicitudIdDetalle(null);
  };

  const renderizarBadgeEstado = (estado) => {                            // Renderiza un pequeño "badge" de estado con color según el estado.
    let clasesBase =
      'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-sm'; // Clases base del badge.

    let clasesColor = '';                                                // Inicializa variable para las clases de color.

    switch (estado) {                                                    // Selección del color según el estado de la solicitud.
      case 'pendiente':                                                  // Estado pendiente.
        clasesColor = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'; // Colores amarillos suaves.
        break;
      case 'aprobada':                                                   // Estado aprobada.
        clasesColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'; // Colores verdes suaves.
        break;
      case 'rechazada':                                                  // Estado rechazada.
        clasesColor = 'bg-red-500/15 text-red-300 border-red-500/40';    // Colores rojos suaves.
        break;
      case 'procesada':                                                  // Estado procesada.
        clasesColor = 'bg-blue-500/15 text-blue-300 border-blue-500/40'; // Colores azules suaves.
        break;
      default:                                                           // Cualquier otro estado o vacío.
        clasesColor = 'bg-pcm-bg/60 text-pcm-muted border-white/10';     // Esquema neutro PCM.
    }

    return (
      <span className={`${clasesBase} ${clasesColor}`}>                  {/* Devuelve el span con las clases combinadas. */}
        {estado || 'N/A'}                                               {/* Muestra el estado o N/A si viene vacío. */}
      </span>
    );
  };

  const esProyectoInvalido =                                              // Validación: una solicitud de proyecto es inválida si falta título o descripción.
    nuevoTipo === 'proyecto' &&
    (!titulo.trim() || !descripcion.trim());                            // true cuando falta título o descripción en proyecto.

  const esMaterialInvalido =                                              // Validación: una solicitud de material es inválida si el líder no ha agregado o completado materiales.
    nuevoTipo === 'material' &&
    esLiderObra &&
    (
      items.length === 0 ||                                              // No hay ítems.
      items.some(
        (item) =>
          !item.material ||                                              // Falta material.
          !item.cantidad ||                                              // Falta cantidad.
          Number(item.cantidad) <= 0                                     // Cantidad no válida.
      )
    );

  const deshabilitarEnvio = esProyectoInvalido || esMaterialInvalido;    // El botón de enviar se deshabilita si cualquiera de las validaciones falla.

  const manejarCrearSolicitud = async (evento) => {                      // Maneja el envío del formulario para crear una nueva solicitud.
    evento.preventDefault();                                             // Previene el comportamiento por defecto del formulario.

    try {
      if (nuevoTipo === 'proyecto') {                                    // Caso: nueva solicitud de proyecto.
        if (!titulo.trim() || !descripcion.trim()) {                     // Validación extra de seguridad.
          mostrarModal(
            'Campos incompletos',
            'Debes completar el título y la descripción para la solicitud de proyecto.'
          );
          return;                                                        // Sale si la validación falla.
        }

        await crearSolicitud({                                           // Llama al servicio de creación de solicitud de proyecto.
          tipo: 'proyecto',
          titulo,
          descripcion
        });
      } else if (nuevoTipo === 'material') {                             // Caso: nueva solicitud de material.
        if (!items.length) {                                             // Verifica que existan materiales para enviar.
          mostrarModal(
            'Materiales requeridos',
            'Debes agregar al menos un material a la solicitud.'
          );
          return;                                                        // Sale si no hay ítems.
        }

        for (const item of items) {                                      // Recorre cada ítem para asegurar material y cantidad válida.
          if (!item.material || !item.cantidad || Number(item.cantidad) <= 0) {
            mostrarModal(
              'Materiales incompletos',
              'Debes seleccionar material y una cantidad mayor a cero para todas las filas.'
            );
            return;                                                      // Sale si algún ítem está incompleto.
          }
        }

        const itemsFormateados = items.map((it) => ({                    // Formatea los ítems para enviar al backend con cantidad numérica.
          material: it.material,                                         // ID de material.
          cantidad: Number(it.cantidad)                                  // Cantidad convertida a número.
        }));

        await crearSolicitud({                                           // Llama al servicio de creación de solicitud de material.
          tipo: 'material',
          materiales: itemsFormateados,
          titulo,
          descripcion
        });
      }

      setTitulo('');                                                     // Si todo sale bien, limpia el título.
      setDescripcion('');                                                // Limpia la descripción.
      setItems([]);                                                      // Limpia la lista de materiales.

      await cargarSolicitudes();                                         // Recarga la lista de solicitudes para reflejar la nueva.

      mostrarModal(                                                      // Muestra modal de éxito al usuario.
        'Solicitud enviada',
        'La solicitud se ha enviado correctamente y ahora aparece en la lista de solicitudes.'
      );
    } catch (error) {
      console.error('Error al crear solicitud:', error);                 // Loguea el error en consola.
      mostrarModal(                                                      // Muestra mensaje genérico de error al usuario.
        'Error',
        'Hubo un error al crear la solicitud. Por favor, inténtalo nuevamente.'
      );
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in-soft ${clasesPanelRol}`}> {/* Contenedor principal con separación vertical, animación y color de panel según rol. */}

      <ModalMensajesSolicitudes
        abierto={modalInfo.open}                                         // Controla visibilidad del modal.
        titulo={modalInfo.title}                                         // Pasa el título almacenado.
        mensaje={modalInfo.message}                                      // Pasa el mensaje almacenado.
        onCerrar={() =>
          setModalInfo((prev) => ({ ...prev, open: false }))             // Cierra el modal manteniendo título/mensaje si fuera necesario.
        }
      />

      <ModalConfirmarEstadoSolicitud
        abierto={confirmEstado.open}                                     // Controla visibilidad del modal de confirmación.
        estadoActual={confirmEstado.estadoActual}                        // Pasa el estado actual.
        nuevoEstado={confirmEstado.nuevoEstado}                          // Pasa el nuevo estado elegido.
        onCancelar={() =>
          setConfirmEstado({                                             // Cierra el modal sin aplicar cambios.
            open: false,
            solicitudId: null,
            nuevoEstado: '',
            estadoActual: ''
          })
        }
        onConfirmar={async () => {                                       // Maneja la confirmación asíncrona.
          try {
            await manejarCambioEstado(                                   // Llama a la función que actualiza el estado en backend.
              confirmEstado.solicitudId,
              confirmEstado.nuevoEstado
            );
          } finally {
            setConfirmEstado({                                           // Cierra el modal de confirmación.
              open: false,
              solicitudId: null,
              nuevoEstado: '',
              estadoActual: ''
            });
          }
        }}
      />



      <p className="text-sm text-pcm-muted">                             {/* Descripción corta de la sección. */}
        Gestiona las solicitudes de proyectos y materiales según tu rol en el sistema.
      </p>

      {/* Controles de filtro para estado y tipo */}
      <div className="flex flex-wrap gap-4 my-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-pcm-muted" htmlFor="filtroEstado">
            Estado:
          </label>
          <select
            id="filtroEstado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-pcm-bg/70 border border-white/10 rounded-xl px-2 py-1 text-xs text-pcm-text focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
          >
            <option value="todas">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="procesada">Procesadas</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-pcm-muted" htmlFor="filtroTipo">
            Tipo:
          </label>
          <select
            id="filtroTipo"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-pcm-bg/70 border border-white/10 rounded-xl px-2 py-1 text-xs text-pcm-text focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
          >
            <option value="todas">Todos</option>
            <option value="proyecto">Proyectos</option>
            <option value="material">Materiales</option>
          </select>
        </div>
      </div>

      {estaCargando ? (                                                  // Si está cargando, muestra texto de carga.
        <p className="text-sm text-pcm-muted">Cargando solicitudes...</p> // Mensaje de carga mientras se obtienen los datos.
      ) : (
        <>                                                               {/* Fragmento para agrupar el contenido principal cuando hay datos. */}
          <div className="pcm-card backdrop-blur-sm animate-slide-up-soft p-4 shadow-pcm-soft">
            {/* Tarjeta contenedora de la tabla de solicitudes con tema PCM */}
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">{/* Wrapper con scroll horizontal y vertical limitado */}
              <table className="min-w-full text-sm">                     {/* Tabla principal con ancho mínimo y tipografía pequeña. */}
                <thead className="bg-pcm-bg/60 border-b border-white/10">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold text-pcm-muted uppercase tracking-wider"
                    >
                      Tipo                                                 {/* Columna: tipo de solicitud. */}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold text-pcm-muted uppercase tracking-wider"
                    >
                      Título                                              {/* Columna: título. */}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold text-pcm-muted uppercase tracking-wider"
                    >
                      Solicitante                                         {/* Columna: solicitante. */}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold text-pcm-muted uppercase tracking-wider"
                    >
                      Estado                                              {/* Columna: estado con badge de color. */}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold text-pcm-muted uppercase tracking-wider"
                    >
                      Fecha                                               {/* Columna: fecha de solicitud. */}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold text-pcm-muted uppercase tracking-wider"
                    >
                      Detalle                                             {/* Columna: botón para ver el detalle de la solicitud. */}
                    </th>
                    {esAdmin && (                                         // Columna de acciones sólo visible para admin.
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold text-pcm-muted uppercase tracking-wider"
                      >
                        Acciones                                          {/* Columna: acciones (select de estado). */}
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">              {/* Cuerpo de la tabla con filas separadas por líneas suaves. */}
                  {solicitudes.map((solicitud) => (                      // Recorre cada solicitud y crea una fila.
                    <tr
                      key={solicitud._id}                                // Usa el _id de la solicitud como clave de React.
                      className="bg-pcm-surfaceSoft/40 hover:bg-pcm-surfaceSoft/80 transition duration-150"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-pcm-text">
                        {solicitud.tipo}                                 {/* Celda: tipo de solicitud. */}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-sm text-pcm-text">
                        {solicitud.titulo || '-'}                        {/* Celda: título de la solicitud o '-' si no existe. */}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-sm text-pcm-text">
                        {solicitud.solicitante?.firstName}{' '}
                        {solicitud.solicitante?.lastName}                {/* Celda: nombre completo del solicitante. */}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-sm text-pcm-text">
                        {renderizarBadgeEstado(solicitud.estado)}        {/* Celda: badge del estado. */}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-sm text-pcm-text">
                        {solicitud.fechaSolicitud                        // Celda: fecha formateada o '-' si no existe.
                          ? new Date(solicitud.fechaSolicitud).toLocaleDateString(
                              'es-CO',
                              { dateStyle: 'short' }
                            )
                          : '-'}
                      </td>

                      {/* Celda: botón para abrir el modal de detalle */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-pcm-text">
                        <button
                          type="button"
                          onClick={() => abrirModalDetalle(solicitud._id)}
                          className="text-pcm-primary hover:underline"
                        >
                          Ver detalle
                        </button>
                      </td>

                      {esAdmin && (                                      // Celda: select para cambiar estado (solo admin).
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-pcm-text">
                          <select
                            value={solicitud.estado}                     // Estado actual de la solicitud.
                            onChange={(evento) =>
                              manejarSelectEstadoChange(
                                solicitud,
                                evento.target.value
                              )
                            }                                            // Abre el flujo de confirmación con el nuevo estado.
                            className="bg-pcm-bg/70 border border-white/10 rounded-xl px-2 py-1 text-xs text-pcm-text
                                       focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="aprobada">Aprobada</option>
                            <option value="rechazada">Rechazada</option>
                            <option value="procesada">Procesada</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(esLiderObra || esCliente) && (                               // Formulario para crear nueva solicitud (sólo líder o cliente).
            <form
              onSubmit={manejarCrearSolicitud}                            // Maneja el envío del formulario.
              className="mt-4 pcm-card backdrop-blur-sm space-y-4 text-pcm-text animate-slide-up-soft shadow-pcm-soft"
            >
              <h3 className="text-base md:text-lg font-semibold">        {/* Título del formulario. */}
                Crear nueva solicitud
              </h3>

              <div className="flex flex-col space-y-2">                   {/* Selector de tipo de solicitud (bloqueado según rol). */}
                <label className="text-xs font-medium text-pcm-muted uppercase tracking-wide">
                  Tipo de solicitud
                </label>
                <select
                  value={nuevoTipo}                                       // Valor actual del tipo.
                  onChange={(evento) => setNuevoTipo(evento.target.value)} // Actualiza el tipo al cambiar.
                  disabled={esLiderObra || esCliente}                    // Deshabilitado para líder y cliente (rol fija el tipo).
                  className="bg-pcm-bg/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-pcm-text
                             focus:outline-none focus:ring-2 focus:ring-pcm-primary/70 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="proyecto">Proyecto</option>
                  <option value="material">Material</option>
                </select>
              </div>

              {nuevoTipo === 'proyecto' && (                             // Campos específicos para solicitudes de proyecto.
                <>
                  <div className="flex flex-col space-y-2">               {/* Campo: título del proyecto. */}
                    <label className="text-xs font-medium text-pcm-muted uppercase tracking-wide">
                      Título
                    </label>
                    <input
                      type="text"
                      value={titulo}                                      // Valor actual del título.
                      onChange={(evento) => setTitulo(evento.target.value)} // Actualiza el estado de título.
                      className="bg-pcm-bg/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-pcm-text
                                 placeholder-pcm-muted/70 focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
                      placeholder="Nombre del proyecto"
                    />
                  </div>

                  <div className="flex flex-col space-y-2">              {/* Campo: descripción del proyecto. */}
                    <label className="text-xs font-medium text-pcm-muted uppercase tracking-wide">
                      Descripción
                    </label>
                    <textarea
                      value={descripcion}                                 // Valor actual de la descripción.
                      onChange={(evento) => setDescripcion(evento.target.value)} // Actualiza la descripción.
                      className="bg-pcm-bg/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-pcm-text
                                 placeholder-pcm-muted/70 focus:outline-none focus:ring-2 focus:ring-pcm-primary/70 min-h-20"
                      placeholder="Describe tu proyecto"
                    />
                  </div>
                </>
              )}

              {nuevoTipo === 'material' && esLiderObra && (              // Sección de materiales (tipo 'material' y rol líder de obra).
                <div className="space-y-4">
                  <div className="flex justify-between items-center">     {/* Encabezado de sección de materiales. */}
                    <span className="text-xs font-medium text-pcm-muted uppercase tracking-wide">
                      Materiales solicitados
                    </span>
                    <button
                      type="button"                                      // Botón que no envía el formulario.
                      onClick={manejarAgregarItem}                       // Agrega una nueva fila de material.
                      className="pcm-btn-primary text-xs px-3 py-1 shadow-pcm-soft transition duration-150"
                    >
                      Añadir material                                    {/* Texto del botón para añadir fila. */}
                    </button>
                  </div>

                  {items.map((item, indice) => (                         // Renderiza cada fila de material con select y cantidad.
                    <div
                      key={indice}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    >
                      <select
                        value={item.material}                             // ID del material seleccionado.
                        onChange={(evento) =>
                          manejarCambioItem(
                            indice,
                            'material',
                            evento.target.value
                          )
                        }
                        className="bg-pcm-bg/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-pcm-text
                                   focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
                        required                                          // Marca el campo como requerido.
                      >
                        <option value="">Seleccionar material</option>
                        {materiales.map((material) => (                  // Opciones de material cargadas desde backend.
                          <option key={material._id} value={material._id}>
                            {material.nombre}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"                                           // No permite cantidades menores a 1.
                        value={item.cantidad}                             // Valor actual de la cantidad.
                        onChange={(evento) =>
                          manejarCambioItem(
                            indice,
                            'cantidad',
                            evento.target.value
                          )
                        }
                        className="bg-pcm-bg/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-pcm-text
                                   focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
                        placeholder="Cantidad"
                        required                                           // Marca el campo como requerido.
                      />

                      <div className="hidden md:block" />                {/* Tercera columna reservada para futuras mejoras (unidad, notas, etc.). */}
                    </div>
                  ))}

                  {items.length > 0 && (                                 // Resumen textual de materiales para revisión rápida.
                    <div className="mt-3 text-xs text-pcm-muted space-y-1">
                      <p className="font-semibold text-pcm-text">
                        Resumen de materiales solicitados:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {items.map((item, indice) => {
                          const infoMaterial = materiales.find(          // Busca el nombre del material por ID para mostrarlo legible.
                            (material) => material._id === item.material
                          );

                          return (
                            <li key={`resumen-${indice}`}>
                              {infoMaterial
                                ? infoMaterial.nombre
                                : 'Material sin seleccionar'}
                              {item.cantidad
                                ? ` - Cantidad: ${item.cantidad}`
                                : ''}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">                                     {/* Botón de envío del formulario de solicitud. */}
                <button
                  type="submit"
                  disabled={deshabilitarEnvio}                           // Se deshabilita si las validaciones fallan.
                  className={`pcm-btn-primary w-full text-sm shadow-pcm-soft transition duration-150
                              ${
                                deshabilitarEnvio
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'hover:-translate-y-0.5'
                              }`}
                >
                  Enviar solicitud                                       {/* Texto del botón principal de envío. */}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    {/* Modal de detalle de solicitud */}
    <ModalDetalleSolicitud
      idSolicitud={solicitudIdDetalle}
      abierto={modalDetalleAbierto}
      onClose={cerrarModalDetalle}
      onSolicitudActualizada={cargarSolicitudes}
    />

    </div>
  );
};

export default VistaSolicitudes;                                          // Exporta el componente para poder usarlo en otras partes del panel.
