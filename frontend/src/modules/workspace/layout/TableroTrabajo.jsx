// File: frontend/src/modules/workspace/layout/TableroTrabajo.jsx
// Description: Layout principal interno del panel de trabajo (workspace) de ProCivil Manager (PCM).
//              Gestiona la estructura general del dashboard (barra lateral, encabezado y contenido),
//              construye el menú de secciones según el rol del usuario (admin / líder de obra / cliente / auditor),
//              carga datos globales desde la API central y decide qué vista interna se muestra en cada
//              momento (VistaDashboard, VistaProyectos, VistaSolicitudes, VistaUsuarios, etc.), aplicando
//              el tema visual PCM (clases .pcm-*, colores por rol) y soportando navegación móvil con menú
//              lateral desplegable. El encabezado superior se oculta al hacer scroll hacia abajo y
//              reaparece al subir. Integra modales autónomos para detalle/creación/edición/eliminación de proyectos y para edición/eliminación de usuarios.

/* Importaciones principales de React y React Router */
import React, {                         // Importa React y hooks fundamentales.
  useEffect,                            // Hook para efectos secundarios (cargar datos, suscripciones, etc.).
  useState,                             // Hook para manejar estado local del componente.
  useRef,                               // Hook para referenciar nodos DOM (contenedor con scroll y última posición).
} from 'react';
import { useNavigate } from 'react-router-dom'; // Hook para navegación programática (logout, cambios de ruta).

/* Importaciones de íconos (reservados para futuros usos en header/layout) */
import {
  Menu,                                // Ícono de menú hamburguesa (uso potencial en encabezado).
  X,                                   // Ícono de cerrar (uso potencial).
  LogOut,                              // Ícono de logout (uso potencial).
  Bell,                                // Ícono de campana para alertas (uso potencial).
  Users,                               // Ícono de usuarios (uso potencial).
} from 'lucide-react';

/* Layout y componentes compartidos del workspace (específicos del módulo) */
import BarraNavegacion from '../components/BarraNavegacion.jsx';   // Barra lateral / navegación principal interna del workspace.
import EncabezadoSeccion from '../components/EncabezadoSeccion.jsx'; // Encabezado superior de cada sección interna.

/* Vistas internas del workspace */
import VistaDashboard from '../../status/pages/VistaDashboard.jsx';                       // Vista de dashboard principal.
import VistaProyectos from '../../projects/pages/VistaProyectos.jsx';                     // Vista de gestión de proyectos.
import VistaSolicitudes from '../../requests/pages/VistaSolicitudes.jsx';                 // Vista de gestión de solicitudes.
import VistaUsuarios from '../../users/pages/VistaUsuarios.jsx';                          // Vista de administración de usuarios.
import ModalEditarUsuario from '../../users/modals/ModalEditarUsuario.jsx';               // Modal autónomo para editar usuarios.
import ModalEliminarUsuario from '../../users/modals/ModalEliminarUsuario.jsx';           // Modal autónomo para eliminar usuarios.
// Modales autónomos para gestión de proyectos (detalle, creación, edición y eliminación).
import ModalDetalleProyecto from '../../projects/modals/ModalDetalleProyecto.jsx';        // Modal de detalle de proyecto.
import ModalCrearProyecto from '../../projects/modals/ModalCrearProyecto.jsx';            // Modal para crear nuevos proyectos.
import ModalEditarProyecto from '../../projects/modals/ModalEditarProyecto.jsx';          // Modal para editar proyectos existentes.
import ModalEliminarProyecto from '../../projects/modals/ModalEliminarProyecto.jsx';      // Modal de confirmación para eliminar proyectos.
import VistaBandejaEntrada from '../../mail/pages/VistaBandejaEntrada.jsx';               // Vista de bandeja de entrada/contacto.
import VistaReportes from '../../reports/pages/VistaReportes.jsx';                        // Vista de reportes y estadísticas.
import VistaAlmacenes from '../../warehouses/pages/VistaAlmacenes.jsx';                   // Vista de almacenes.
import VistaMateriales from '../../inventory/pages/VistaMateriales.jsx';                  // Vista de materiales.
import VistaRegistrosAuditoria from '../../audit/pages/VistaRegistrosAuditoria.jsx';      // Vista de registros de auditoría.
import VistaPerfil from '../../profile/pages/VistaPerfil.jsx';                            // Vista de perfil de usuario.
import VistaAlertas from '../../alerts/pages/VistaAlertas.jsx';                           // Vista de alertas del sistema.
import HistorialSolicitudesCliente from '../../requests/pages/HistorialSolicitudesCliente.jsx'; // Historial de solicitudes para cliente.
import SolicitarProyecto from '../../projects/pages/SolicitarProyecto.jsx';               // Vista interna para solicitar un nuevo proyecto.
import HistorialProyectosCliente from '../../projects/pages/HistorialProyectosCliente.jsx';     // Historial de proyectos para cliente.

/* Servicios de API (datos globales) */
import {
  obtenerResumenEstadisticas,          // Servicio para KPIs y datos agregados.
  obtenerProyectosRecientes,           // Servicio para proyectos recientes.
  obtenerProyectos,                    // Servicio para lista completa de proyectos.
  obtenerUsuarios,                     // Servicio para lista de usuarios.
  obtenerMensajesContacto,             // Servicio para mensajes de contacto/bandeja.
  obtenerAlmacenes,                    // Servicio para almacenes.
  obtenerMateriales,                   // Servicio para materiales.
  obtenerAlertas,                      // Servicio para alertas.
  obtenerSolicitudes,                  // Servicio para solicitudes.
  suscribirseAlertasTiempoReal,        // Suscripción a alertas en tiempo real vía sockets.
} from '../../../services/api/api.js'; // Importa funciones de la capa de servicios central.

/**
 * Componente principal del dashboard (layout del workspace).
 * Renderiza el panel completo con barra de navegación (BarraNavegacion), encabezado (EncabezadoSeccion)
 * y el contenido de la sección activa, además de controlar modales de usuarios, modales de proyectos
 * y sincronizar datos globales con el backend.
 */
const TableroTrabajo = () => {
  const navigate = useNavigate();                       // Hook para navegación (logout y cambios de ruta si es necesario).

  // ===============================
  // Estado de usuario autenticado
  // ===============================
  const [usuarioActual, setUsuarioActual] = useState(null); // Datos del usuario logueado.
  const [rolUsuario, setRolUsuario] = useState('admin');    // Rol del usuario logueado (admin, líder, cliente, auditor).

  // ===============================
  // Estado de navegación interna
  // ===============================
  const [seccionActiva, setSeccionActiva] = useState('dashboard'); // Sección actualmente visible.
  const [cargandoDashboard, setCargandoDashboard] = useState(true); // Indicador de carga general del dashboard.
  const [errorDashboard, setErrorDashboard] = useState(null);       // Mensaje de error general del dashboard.

  // Menú lateral móvil (hamburguesa)
  const [menuLateralAbierto, setMenuLateralAbierto] = useState(false); // true → barra de navegación móvil visible.

  // ===============================
  // Datos globales
  // ===============================
  const [proyectos, setProyectos] = useState([]);                   // Lista completa de proyectos.
  const [proyectosRecientes, setProyectosRecientes] = useState([]); // Proyectos recientes para el dashboard.
  const [usuarios, setUsuarios] = useState([]);                     // Lista de usuarios (admin, líderes, clientes, auditores).
  const [solicitudes, setSolicitudes] = useState([]);               // Lista de solicitudes.
  const [almacenes, setAlmacenes] = useState([]);                   // Lista de almacenes.
  const [materiales, setMateriales] = useState([]);                 // Lista de materiales.
  const [alertas, setAlertas] = useState([]);                       // Lista de alertas.
  const [alertasSinLeer, setAlertasSinLeer] = useState(0);          // Contador de alertas pendientes/sin leer.
  const [mensajesContacto, setMensajesContacto] = useState([]);     // Mensajes de contacto (bandeja de entrada).

  // Estadísticas agregadas para KPIs y gráficos del dashboard.
  const [statsKpi, setStatsKpi] = useState([]);       // KPIs principales.
  const [datosLinea, setDatosLinea] = useState([]);   // Datos para gráfico de línea.
  const [datosPastel, setDatosPastel] = useState([]); // Datos para gráfico tipo pastel.

  // ===============================
  // Estado para modales de usuarios
  // ===============================
  const [usuarioSeleccionadoParaEditar, setUsuarioSeleccionadoParaEditar] =
    useState(null);                                      // ID del usuario que se está editando.
  const [formularioEdicionUsuario, setFormularioEdicionUsuario] =
    useState(null);                                      // Datos del formulario de edición de usuario.
  const [usuarioSeleccionadoParaEliminar, setUsuarioSeleccionadoParaEliminar] =
    useState(null);                                      // Objeto del usuario seleccionado para eliminar.

  // ===============================
  // Estado para modales de proyectos
  // ===============================
  const [modalCrearProyectoAbierto, setModalCrearProyectoAbierto] =
    useState(false);                                     // Controla apertura/cierre del modal de creación de proyectos.
  const [proyectoSeleccionadoParaDetalle, setProyectoSeleccionadoParaDetalle] =
    useState(null);                                      // Proyecto seleccionado para ver detalle en el modal correspondiente.
  const [proyectoSeleccionadoParaEditar, setProyectoSeleccionadoParaEditar] =
    useState(null);                                      // Proyecto seleccionado para edición en el modal de proyectos.
  const [formularioEdicionProyecto, setFormularioEdicionProyecto] =
    useState(null);                                      // Datos del formulario controlado de edición de proyecto.
  const [proyectoSeleccionadoParaEliminar, setProyectoSeleccionadoParaEliminar] =
    useState(null);                                      // Proyecto seleccionado para eliminar en el modal de confirmación.

  // ==========================================================
  // Estado y refs para comportamiento del encabezado (header)
  // ==========================================================
  const [mostrarEncabezado, setMostrarEncabezado] = useState(true); // true = header visible, false = oculto al hacer scroll.
  const contenedorScrollRef = useRef(null);                         // Referencia al <section> principal con overflow-y-auto.
  const ultimoScrollRef = useRef(0);                                // Última posición de scroll para detectar dirección.

  // =====================================================
  // Función reutilizable: cargar datos globales del dashboard
  // =====================================================
  const cargarDatosDashboard = async () => {            // Declara la función asíncrona que carga todos los datos globales.
    setCargandoDashboard(true);                         // Activa indicador de carga del dashboard.
    setErrorDashboard(null);                            // Limpia cualquier error previo.

    try {
      // Ejecuta en paralelo las peticiones principales al backend.
      const [
        resumenEstadisticas,
        proyectosRecientesApi,
        proyectosApi,
        usuariosApi,
        solicitudesApi,
        almacenesApi,
        materialesApi,
        alertasApi,
        mensajesContactoApi,
      ] = await Promise.all([
        obtenerResumenEstadisticas().catch((error) => {
          console.error('Error obteniendo resumen de estadísticas:', error);
          return null;
        }),
        obtenerProyectosRecientes().catch((error) => {
          console.error('Error obteniendo proyectos recientes:', error);
          return [];
        }),
        obtenerProyectos().catch((error) => {
          console.error('Error obteniendo proyectos:', error);
          return [];
        }),
        obtenerUsuarios().catch((error) => {
          console.error('Error obteniendo usuarios:', error);
          return [];
        }),
        obtenerSolicitudes().catch((error) => {
          console.error('Error obteniendo solicitudes:', error);
          return [];
        }),
        obtenerAlmacenes().catch((error) => {
          console.error('Error obteniendo almacenes:', error);
          return [];
        }),
        obtenerMateriales().catch((error) => {
          console.error('Error obteniendo materiales:', error);
          return [];
        }),
        obtenerAlertas().catch((error) => {
          console.error('Error obteniendo alertas:', error);
          return [];
        }),
        obtenerMensajesContacto().catch((error) => {
          console.error('Error obteniendo mensajes de contacto:', error);
          return [];
        }),
      ]);

      // Actualiza KPIs y datos de gráficas si hay resumen.
      if (resumenEstadisticas) {
        setStatsKpi(resumenEstadisticas.stats || []);        // KPIs principales.
        setDatosLinea(resumenEstadisticas.datosLinea || []); // Datos para gráfico de línea.
        setDatosPastel(resumenEstadisticas.datosPastel || []); // Datos para gráfico tipo pastel.
      }

      // Actualiza listas con la información disponible (o arrays vacíos).
      setProyectosRecientes(proyectosRecientesApi || []);  // Proyectos recientes.
      setProyectos(proyectosApi || []);                    // Lista completa de proyectos.
      setUsuarios(usuariosApi || []);                      // Lista de usuarios.
      setSolicitudes(solicitudesApi || []);                // Lista de solicitudes.
      setAlmacenes(almacenesApi || []);                    // Lista de almacenes.
      setMateriales(materialesApi || []);                  // Lista de materiales.
      setMensajesContacto(mensajesContactoApi || []);      // Mensajes de contacto.

      // Normaliza la estructura de alertas según cómo venga la respuesta de la API.
      const alertasNormalizadas = Array.isArray(alertasApi)
        ? alertasApi
        : Array.isArray(alertasApi?.alertas)
        ? alertasApi.alertas
        : Array.isArray(alertasApi?.data)
        ? alertasApi.data
        : [];

      setAlertas(alertasNormalizadas);                     // Guarda la lista normalizada de alertas.

      // Calcula cuántas alertas están pendientes/sin resolver.
      const sinLeer = alertasNormalizadas.filter((alerta) => {
        const estado = (alerta?.estado || '').toLowerCase(); // Normaliza el estado de la alerta.
        const resuelta = alerta?.resuelta === true;          // Marca si está resuelta.
        const cerrada = alerta?.cerrada === true;            // Marca si está cerrada.

        return (
          !resuelta &&
          !cerrada &&
          estado !== 'resuelta' &&
          estado !== 'cerrada'
        );
      }).length;

      setAlertasSinLeer(sinLeer);                         // Actualiza contador de alertas sin leer.
    } catch (error) {
      console.error('Error general cargando el dashboard:', error); // Log de error general.
      setErrorDashboard(
        'Ocurrió un error al cargar el panel. Intenta de nuevo más tarde.', // Mensaje amigable para el usuario.
      );
    } finally {
      setCargandoDashboard(false);                        // Desactiva indicador de carga.
    }
  };

  // =====================================================
  // Efecto: leer usuario desde localStorage al montar
  // =====================================================
  useEffect(() => {                                      // Efecto que se ejecuta al montar el componente.
    try {
      const userJson = localStorage.getItem('user');     // Lee el usuario almacenado en localStorage.
      if (userJson) {
        const userParsed = JSON.parse(userJson);         // Parsea el JSON con los datos del usuario.
        setUsuarioActual(userParsed);                    // Actualiza estado de usuario actual.

        const rolNormalizado = (userParsed?.role || 'admin') // Obtiene el rol enviado desde backend.
          .toString()
          .toLowerCase();                                // Lo normaliza a minúsculas.
        setRolUsuario(rolNormalizado);                   // Guarda el rol normalizado para el tema visual y menú.
      }
    } catch (error) {
      console.error('Error leyendo usuario desde localStorage:', error); // Log si hay problema con localStorage.
    }
  }, []);                                                // Solo al montar.

  // =====================================================
  // Efecto: cargar datos iniciales del dashboard
  // =====================================================
  useEffect(() => {                                      // Efecto para cargar datos globales al inicio.
    cargarDatosDashboard();                              // Llama a la función que agrupa todas las peticiones.
  }, []);                                                // Solo al montar.

  // =====================================================
  // Efecto: suscribirse a alertas en tiempo real vía sockets
  // =====================================================
  useEffect(() => {                                      // Efecto para suscripción a sockets de alertas.
    const cancelarSuscripcion = suscribirseAlertasTiempoReal((alertaNueva) => {
      // Cuando llega una alerta nueva, se agrega al listado y se incrementa el contador.
      setAlertas((prev) => [alertaNueva, ...(prev || [])]); // Agrega al inicio la alerta nueva.
      setAlertasSinLeer((prev) => (prev || 0) + 1);          // Incrementa contador de alertas sin leer.
    });

    return () => {
      if (typeof cancelarSuscripcion === 'function') {   // Verifica que la función de cancelación exista.
        cancelarSuscripcion();                           // Cancela la suscripción cuando el componente se desmonta.
      }
    };
  }, []);                                                // Solo al montar.

  // =====================================================
  // Efecto: mostrar/ocultar encabezado según scroll
  // =====================================================
  useEffect(() => {                                      // Efecto que controla la visibilidad del encabezado.
    const nodo = contenedorScrollRef.current;            // Nodo del contenedor con scroll interno.

    const manejarScroll = () => {                        // Función que se ejecuta en cada evento de scroll.
      const scrollActual = nodo ? nodo.scrollTop : window.scrollY; // Lee scroll interno o global.
      const ultimoScroll = ultimoScrollRef.current;      // Lee último valor de scroll almacenado.

      if (scrollActual > ultimoScroll && scrollActual > 40) {
        // Scroll hacia abajo y desplazamiento suficiente → ocultar header.
        setMostrarEncabezado(false);
      } else if (scrollActual < ultimoScroll - 10) {
        // Scroll hacia arriba → mostrar header de nuevo.
        setMostrarEncabezado(true);
      }

      ultimoScrollRef.current = scrollActual;            // Actualiza la referencia con el valor actual.
    };

    if (nodo) {
      nodo.addEventListener('scroll', manejarScroll);    // Listener en el contenedor interno con overflow.
    }
    window.addEventListener('scroll', manejarScroll);    // Listener extra por si hay scroll global (seguridad).

    return () => {
      if (nodo) {
        nodo.removeEventListener('scroll', manejarScroll); // Limpia listener interno.
      }
      window.removeEventListener('scroll', manejarScroll); // Limpia listener global.
    };
  }, []);                                                // Solo al montar.

  // ======================================
  // Handlers de sincronización de usuarios
  // ======================================

  // Maneja la actualización de un usuario que viene desde ModalEditarUsuario
  // o desde la vista Mi Perfil (vía callback onPerfilActualizado):
  // 1) Actualiza la lista local para que la tabla cambie de inmediato.
  // 2) Si el usuario editado es el mismo que está logueado, actualiza también
  //    usuarioActual, rolUsuario y localStorage para que el rol/theme cambie en vivo.
  // 3) Recarga la lista completa de usuarios desde el backend para quedar
  //    100% sincronizados (por si allá se hacen más cambios/normalizaciones).
  const manejarUsuarioActualizadoEnLista = async (usuarioActualizado) => {
    if (!usuarioActualizado) return;                           // Seguridad si llega undefined/null.

    const idActualizado = usuarioActualizado._id || usuarioActualizado.id; // Normaliza el ID del usuario actualizado.

    // 1) Actualización inmediata en la lista local de usuarios.
    setUsuarios((listaPrev) =>
      (listaPrev || []).map((usuario) =>
        (usuario._id || usuario.id) === idActualizado
          ? {
              ...usuario,              // Conserva campos locales ya derivados.
              ...usuarioActualizado,   // Superpone lo que viene del backend.
            }
          : usuario,                   // El resto queda igual.
      ),
    );

    // 2) Si el usuario actualizado es el mismo que está autenticado, actualiza
    //    también el estado global (usuarioActual, rolUsuario) y el localStorage.
    const idUsuarioActual = usuarioActual?._id || usuarioActual?.id; // ID del usuario actualmente logueado.

    if (idUsuarioActual && idUsuarioActual === idActualizado) {
      const nuevoUsuario = {
        ...(usuarioActual || {}),                             // Datos previos del usuario en sesión.
        ...usuarioActualizado,                               // Datos recién actualizados desde el backend.
      };

      setUsuarioActual(nuevoUsuario);                        // Actualiza el usuario actual en estado.

      const nuevoRolNormalizado = (nuevoUsuario.role || 'admin')
        .toString()
        .toLowerCase();                                      // Normaliza el rol actualizado.

      setRolUsuario(nuevoRolNormalizado);                    // Actualiza el rol para que el tema/menú cambie en vivo.

      try {
        localStorage.setItem('user', JSON.stringify(nuevoUsuario));       // Persiste el nuevo usuario en localStorage.
        localStorage.setItem('pcm_usuario', JSON.stringify(nuevoUsuario)); // Mantiene también la clave estándar PCM.
      } catch (error) {
        console.error(
          'Error actualizando usuario en localStorage tras edición:',
          error,
        );
      }
    }

    // 3) Recarga desde el backend para quedar exactamente igual que la API.
    try {
      const usuariosApi = await obtenerUsuarios();           // Vuelve a consultar la lista completa.
      if (Array.isArray(usuariosApi)) {
        setUsuarios(usuariosApi);                            // Reemplaza la lista local por la oficial.
      }
    } catch (error) {
      console.error(
        'Error recargando usuarios después de actualizar uno:',
        error,
      );
      // Si falla, al menos queda la actualización optimista aplicada en memoria.
    }
  };

  const manejarUsuarioEliminadoEnLista = (idUsuarioEliminado) => {
    // Filtra el usuario eliminado de la lista local de usuarios.
    setUsuarios((listaPrev) =>
      (listaPrev || []).filter(
        (usuario) => usuario._id !== idUsuarioEliminado, // Solo mantiene usuarios cuyo _id sea diferente.
      ),
    );
  };

  // Handler específico para actualizaciones que vienen desde la vista Mi Perfil.
  const manejarPerfilActualizadoDesdePerfil = (usuarioActualizado) => {
    if (!usuarioActualizado) return;                         // Seguridad básica.
    manejarUsuarioActualizadoEnLista(usuarioActualizado);    // Reutiliza la lógica principal de sincronización.
  };

  // ======================================================
  // Handlers para abrir/cerrar modales de usuarios
  // ======================================================
  const abrirModalEditarUsuario = (usuario) => {
    // Abre el modal de edición cargando el usuario seleccionado en el formulario.
    if (!usuario) return;                                 // Seguridad por si llega undefined/null.
    const idUsuario = usuario._id || usuario.id;          // Soporta _id de Mongo o id genérico.

    setUsuarioSeleccionadoParaEditar(idUsuario);          // Guarda el ID del usuario que se va a editar.
    setFormularioEdicionUsuario({                         // Inicializa el formulario de edición con datos actuales.
      firstName: usuario.firstName || '',
      lastName: usuario.lastName || '',
      email: usuario.email || '',
      phone: usuario.phone || '',
      role: usuario.role || 'cliente',                    // Fallback a 'cliente' si no viene rol definido.
    });
  };

  const cerrarModalEditarUsuario = () => {
    // Cierra el modal de edición y limpia el formulario.
    setUsuarioSeleccionadoParaEditar(null);               // Borra el ID seleccionado.
    setFormularioEdicionUsuario(null);                    // Limpia los datos del formulario.
  };

  const abrirModalEliminarUsuario = (usuario) => {
    // Abre el modal de confirmación de eliminación con el usuario seleccionado.
    if (!usuario) return;                                 // Seguridad adicional.
    setUsuarioSeleccionadoParaEliminar(usuario);          // Guarda el objeto completo del usuario a eliminar.
  };

  const cerrarModalEliminarUsuario = () => {
    // Cierra el modal de eliminación limpiando el usuario seleccionado.
    setUsuarioSeleccionadoParaEliminar(null);             // Limpia la referencia al usuario a eliminar.
  };

  const manejarConfirmacionEliminarUsuario = (idUsuarioEliminado) => {
    // Se ejecuta cuando el modal confirma la eliminación en backend.
    manejarUsuarioEliminadoEnLista(idUsuarioEliminado);   // Sincroniza la lista local usando el handler existente.
  };

  // ======================================================
  // Handlers para abrir/cerrar modales de proyectos
  // ======================================================

  const abrirModalDetalleProyecto = (proyecto) => {
    // Abre el modal de detalle de proyecto asignando el proyecto seleccionado.
    if (!proyecto) return;                                // Seguridad adicional frente a llamados sin proyecto.
    setProyectoSeleccionadoParaDetalle(proyecto);         // Guarda el proyecto para mostrarlo en el modal de detalle.
  };

  const cerrarModalDetalleProyecto = () => {
    // Cierra el modal de detalle limpiando el proyecto seleccionado.
    setProyectoSeleccionadoParaDetalle(null);             // Limpia el proyecto en detalle.
  };

  const abrirModalCrearProyecto = () => {
    // Abre el modal de creación de proyecto.
    setModalCrearProyectoAbierto(true);                   // Marca el modal de creación como abierto.
  };

  const cerrarModalCrearProyecto = () => {
    // Cierra el modal de creación de proyecto.
    setModalCrearProyectoAbierto(false);                  // Marca el modal de creación como cerrado.
  };

  const abrirModalEditarProyecto = (proyecto) => {
    // Abre el modal de edición de proyecto inicializando el formulario local.
    if (!proyecto) return;                                // Seguridad frente a valores nulos/indefinidos.

    // Prepara un objeto de formulario con campos básicos del proyecto.
    const formularioInicial = {
      ...proyecto,                                        // Copia el proyecto completo como base.
      startDate: proyecto.startDate || '',                // Normaliza fecha de inicio.
      endDate: proyecto.endDate || '',                    // Normaliza fecha de fin.
    };

    setProyectoSeleccionadoParaEditar(proyecto);          // Guarda el proyecto de referencia para el modal.
    setFormularioEdicionProyecto(formularioInicial);      // Inicializa el formulario controlado de edición.
  };

  const cerrarModalEditarProyecto = () => {
    // Cierra el modal de edición de proyecto y limpia los estados relacionados.
    setProyectoSeleccionadoParaEditar(null);              // Limpia el proyecto seleccionado para editar.
    setFormularioEdicionProyecto(null);                   // Limpia el formulario de edición.
  };

  const abrirModalEliminarProyecto = (proyecto) => {
    // Abre el modal de confirmación de eliminación de proyecto.
    if (!proyecto) return;                                // Seguridad ante valores no válidos.
    setProyectoSeleccionadoParaEliminar(proyecto);        // Guarda el proyecto que se desea eliminar.
  };

  const cerrarModalEliminarProyecto = () => {
    // Cierra el modal de eliminación de proyecto limpiando el estado.
    setProyectoSeleccionadoParaEliminar(null);            // Limpia el proyecto a eliminar.
  };

  // ======================================================
  // Handlers de sincronización de proyectos tras CRUD
  // ======================================================

  const manejarProyectoCreado = (proyectoNuevo) => {
    // Sincroniza el estado local cuando se crea un proyecto desde el modal.
    if (!proyectoNuevo) return;                           // Si no llega nada, no hace cambios.

    setProyectos((listaPrev) => [                         // Inserta el proyecto nuevo al inicio de la lista principal.
      proyectoNuevo,
      ...(listaPrev || []),
    ]);

    setProyectosRecientes((listaPrev) => [                // Inserta también en la lista de recientes.
      proyectoNuevo,
      ...(listaPrev || []),
    ]);

    // Refresca KPIs y datos globales del dashboard para reflejar el nuevo proyecto.
    cargarDatosDashboard().catch((error) => {
      console.error('Error recargando dashboard tras crear proyecto:', error);
    });

    cerrarModalCrearProyecto();                           // Cierra el modal de creación al finalizar.
  };

  const manejarProyectoEditado = (proyectoActualizado) => {
    // Sincroniza el estado local cuando se edita un proyecto desde el modal.
    if (!proyectoActualizado) return;                     // No hace nada si no viene proyecto actualizado.

    const idActualizado = proyectoActualizado._id || proyectoActualizado.id; // Obtiene el identificador del proyecto.

    setProyectos((listaPrev) =>
      (listaPrev || []).map((proyecto) =>
        (proyecto._id || proyecto.id) === idActualizado   // Compara por _id o id genérico.
          ? { ...proyecto, ...proyectoActualizado }       // Mezcla datos antiguos con los nuevos.
          : proyecto,                                     // Mantiene el resto de proyectos tal cual.
      ),
    );

    setProyectosRecientes((listaPrev) =>
      (listaPrev || []).map((proyecto) =>
        (proyecto._id || proyecto.id) === idActualizado   // Igual comparación para la lista de recientes.
          ? { ...proyecto, ...proyectoActualizado }       // Actualiza el proyecto en recientes.
          : proyecto,
      ),
    );

    // Refresca estadísticas generales tras la edición.
    cargarDatosDashboard().catch((error) => {
      console.error('Error recargando dashboard tras editar proyecto:', error);
    });

    cerrarModalEditarProyecto();                          // Cierra el modal de edición al terminar.
  };

  const manejarProyectoEliminado = (idProyectoEliminado) => {
    // Sincroniza el estado local cuando se confirma eliminación de un proyecto.
    if (!idProyectoEliminado) return;                     // No hace nada si no llega ID.

    setProyectos((listaPrev) =>
      (listaPrev || []).filter(
        (proyecto) => (proyecto._id || proyecto.id) !== idProyectoEliminado, // Filtra el proyecto eliminado.
      ),
    );

    setProyectosRecientes((listaPrev) =>
      (listaPrev || []).filter(
        (proyecto) => (proyecto._id || proyecto.id) !== idProyectoEliminado, // Filtra también en recientes.
      ),
    );

    // Refresca datos generales tras la eliminación.
    cargarDatosDashboard().catch((error) => {
      console.error('Error recargando dashboard tras eliminar proyecto:', error);
    });

    cerrarModalEliminarProyecto();                        // Cierra el modal de confirmación.
  };

  // ==============================================
  // Derivados de rol para construir el menú
  // ==============================================
  const construirMenuPorRol = (rol) => {                  // Función que crea las entradas de menú según el rol.
    const rolNormalizado = (rol || '').toLowerCase();     // Normaliza el rol a minúsculas.

    const esAdmin = rolNormalizado === 'admin';           // Flag de administrador.
    const esLider = rolNormalizado === 'lider de obra';   // Flag de líder de obra.
    const esCliente = rolNormalizado === 'cliente';       // Flag de cliente.
    const esAuditor = rolNormalizado === 'auditor';       // Flag de auditor.

    // Menú base mínimo (dashboard para todos).
    const base = {
      dashboard: { titulo: 'Dashboard Principal' },       // Siempre existe el dashboard.
    };

    if (esAdmin) {
      // Menú completo para administrador.
      return {
        ...base,
        perfil: { titulo: 'Mi Perfil' },
        users: { titulo: 'Usuarios' },
        projects: { titulo: 'Proyectos' },
        solicitudes: { titulo: 'Solicitudes' },
        almacenes: { titulo: 'Almacenes' },
        materials: { titulo: 'Materiales' },
        inbox: { titulo: 'Bandeja de Entrada' },
        reports: { titulo: 'Reportes y Estadísticas' },
        audit: { titulo: 'Auditoría' },
        alertas: { titulo: 'Alertas' },
      };
    }

    if (esLider) {
      // Menú para líder de obra.
      return {
        ...base,
        perfil: { titulo: 'Mi Perfil' },
        projects: { titulo: 'Proyectos' },
        solicitudes: { titulo: 'Solicitudes' },
        almacenes: { titulo: 'Almacenes' },
        materials: { titulo: 'Materiales' },
        alertas: { titulo: 'Alertas' },
      };
    }

    if (esCliente) {
      // Menú para cliente.
      return {
        ...base,
        perfil: { titulo: 'Mi Perfil' },
        // Lista las obras pasadas o vigentes del cliente.
        historialProyectos: { titulo: 'Historial de Proyectos' },
        // Muestra las solicitudes realizadas por el cliente (proyectos o materiales).
        historialSolicitudes: { titulo: 'Historial de Solicitudes' },
        // Permite acceder al buzón de mensajes/consultas con el equipo de PCM.
        contact: { titulo: 'Contacto / Bandeja' },
        // Nueva acción: generar una nueva solicitud de obra.  Esta opción muestra el
        // formulario de SolicitarProyecto para que el cliente ingrese los datos
        // generales y, opcionalmente, materiales a cotizar.
        solicitarProyecto: { titulo: 'Solicitar Proyecto' },
      };
    }

    if (esAuditor) {
      // Menú para auditor.
      return {
        ...base,
        perfil: { titulo: 'Mi Perfil' },
        projects: { titulo: 'Proyectos' },
        reports: { titulo: 'Reportes y Auditoría' },
        audit: { titulo: 'Registros de Auditoría' },
      };
    }

    // Fallback genérico si no se reconoce el rol.
    return {
      ...base,
      perfil: { titulo: 'Mi Perfil' },
    };
  };

  const menuPorRol = construirMenuPorRol(rolUsuario);     // Calcula menú según el rol del usuario.

  // ======================================
  // Derivados visuales según rol (.pcm-panel--ROL)
  // ======================================
  const temaRol = (() => {                                // Función autoejecutable para mapear rol → clases PCM.
    const rol = (rolUsuario || '').toLowerCase();         // Normaliza el rol a minúsculas.

    if (rol === 'admin') {
      return {
        clasePanel: 'pcm-panel pcm-panel--admin pcm-panel-fondo',
        claseHeaderRol: 'pcm-panel-header pcm-panel-header--admin',
      };
    }

    if (rol === 'lider de obra') {
      return {
        clasePanel: 'pcm-panel pcm-panel--lider pcm-panel-fondo',
        claseHeaderRol: 'pcm-panel-header pcm-panel-header--lider',
      };
    }

    if (rol === 'cliente') {
      return {
        clasePanel: 'pcm-panel pcm-panel--cliente pcm-panel-fondo',
        claseHeaderRol: 'pcm-panel-header pcm-panel-header--cliente',
      };
    }

    if (rol === 'auditor') {
      return {
        clasePanel: 'pcm-panel pcm-panel--auditor pcm-panel-fondo',
        claseHeaderRol: 'pcm-panel-header pcm-panel-header--auditor',
      };
    }

    // Fallback para roles no reconocidos.
    return {
      clasePanel: 'pcm-panel pcm-panel--admin pcm-panel-fondo',
      claseHeaderRol: 'pcm-panel-header pcm-panel-header--admin',
    };
  })();

  const clasePanelRol =
    temaRol.clasePanel || 'pcm-panel pcm-panel--admin pcm-panel-fondo'; // Clases para el contenedor principal.
  const claseHeaderRol =
    (temaRol && temaRol.claseHeaderRol) || '';                          // Clases extra del encabezado según rol.

  // ======================================
  // Título legible según sección activa
  // ======================================
  const obtenerTituloSeccion = (claveSeccion) => {        // Función que devuelve el título visible de cada sección.
    switch (claveSeccion) {
      case 'dashboard':
        return 'Dashboard Principal';
      case 'perfil':
        return 'Mi Perfil';
      case 'users':
        return 'Gestión de Usuarios';
      case 'projects':
        return 'Gestión de Proyectos';
      case 'solicitudes':
        return 'Gestión de Solicitudes';
      case 'almacenes':
        return 'Gestión de Almacenes';
      case 'materials':
        return 'Gestión de Materiales';
      case 'inbox':
        return 'Bandeja de Entrada';
      case 'reports':
        return 'Reportes y Estadísticas';
      case 'audit':
        return 'Registros de Auditoría';
      case 'historialProyectos':
        return 'Historial de Proyectos';
      case 'historialSolicitudes':
        return 'Historial de Solicitudes';
      case 'alertas':
        return 'Centro de Alertas';
      case 'solicitarProyecto':
        // Título para la vista donde el cliente o líder solicita una nueva obra.
        return 'Solicitar Proyecto';
      case 'contact':
        return 'Contacto';
      default:
        return 'Dashboard Principal';
    }
  };

  const tituloSeccion = obtenerTituloSeccion(seccionActiva); // Calcula el título a mostrar en el encabezado.

  // ======================================
  // Handlers de navegación y logout
  // ======================================
  const manejarCambioSeccion = (nuevaSeccion) => {
    // Maneja la navegación entre secciones internas.
    setSeccionActiva(nuevaSeccion || 'dashboard');        // Cambia sección activa, con fallback a dashboard.
    setMenuLateralAbierto(false);                         // Cierra el menú móvil al navegar.
  };

  const manejarCerrarSesion = () => {                     // Maneja el cierre de sesión del usuario.
    try {
      localStorage.removeItem('token');                   // Limpia token de autenticación.
      localStorage.removeItem('user');                    // Limpia datos de usuario.
      localStorage.removeItem('pcm_usuario');             // Limpia también la clave estándar PCM.
    } catch (error) {
      console.error('Error limpiando localStorage en logout:', error); // Log de error si algo falla.
    } finally {
      navigate('/login');                                 // Redirige a la pantalla de login.
    }
  };

  // ======================================
  // Renderizado de la sección activa
  // ======================================
  const renderizarSeccionActiva = () => {                 // Función que decide qué vista interna renderizar.
    switch (seccionActiva) {
      case 'dashboard':
        return (
          <VistaDashboard
            proyectos={proyectos}
            solicitudes={solicitudes}
            almacenes={almacenes}
            materiales={materiales}
            usuarios={usuarios}
            alertasSinLeer={alertasSinLeer}
            rolUsuario={rolUsuario}
            estaCargando={cargandoDashboard}
            alNavegarSeccion={manejarCambioSeccion}
            proyectosRecientes={proyectosRecientes}
            statsKpi={statsKpi}
            datosLinea={datosLinea}
            datosPastel={datosPastel}
          />
        );

      case 'perfil':
        return (
          <VistaPerfil
            usuarioActual={usuarioActual}                        // Pasa el usuario logueado a la vista de perfil.
            onPerfilActualizado={manejarPerfilActualizadoDesdePerfil} // Callback para sincronizar datos globales al actualizar.
          />
        );

      case 'users':
        return (
          <VistaUsuarios
            users={usuarios}                              // Lista de usuarios cargada desde el backend.
            rolUsuario={rolUsuario}                       // Para adaptar bordes/colores al rol del usuario logueado.
            onEditUser={abrirModalEditarUsuario}          // 👉 Abre el modal de edición con el usuario seleccionado.
            onDeleteUser={abrirModalEliminarUsuario}      // 👉 Abre el modal de confirmación de eliminación.
          />
        );

      case 'projects':
        return (
          <VistaProyectos
            proyectos={proyectos}
            rolUsuario={rolUsuario}
            onViewDetails={abrirModalDetalleProyecto}           // Abre modal de detalle al hacer clic en "Ver detalle".
            onEditProject={abrirModalEditarProyecto}            // Abre modal de edición al hacer clic en "Editar".
            onDeleteProject={abrirModalEliminarProyecto}        // Abre modal de eliminación al hacer clic en "Eliminar".
            onCreateProject={abrirModalCrearProyecto}           // Abre modal de creación al hacer clic en "Nuevo proyecto".
          />
        );

      case 'solicitudes':
        return <VistaSolicitudes rolUsuario={rolUsuario} />;

      case 'solicitarProyecto':
        return <SolicitarProyecto rolUsuario={rolUsuario} />;

      case 'almacenes':
        return (
          <VistaAlmacenes
            almacenes={almacenes}                         // Lista de almacenes cargada en el Tablero.
            rolUsuario={rolUsuario}                       // Para colores y comportamiento según rol.
          />
        );

      case 'materials':
        return <VistaMateriales rolUsuario={rolUsuario} />;

      case 'inbox':
        return <VistaBandejaEntrada mensajes={mensajesContacto} />;

      case 'reports':
        return (
          <VistaReportes
            stats={statsKpi}
            pieData={datosPastel}
            proyectosRecientes={proyectosRecientes}
            rolUsuario={rolUsuario}
          />
        );

      case 'audit':
        return <VistaRegistrosAuditoria />;

      case 'historialSolicitudes':
        return <HistorialSolicitudesCliente rolUsuario={rolUsuario} />;

      case 'historialProyectos':
        return <HistorialProyectosCliente rolUsuario={rolUsuario} />;

      case 'alertas':
        return <VistaAlertas />;

      case 'contact':
        return <VistaBandejaEntrada mensajes={mensajesContacto} />;

      default:
        // Fallback → vuelve al dashboard por defecto.
        return (
          <VistaDashboard
            proyectos={proyectos}
            solicitudes={solicitudes}
            almacenes={almacenes}
            materiales={materiales}
            usuarios={usuarios}
            alertasSinLeer={alertasSinLeer}
            rolUsuario={rolUsuario}
            estaCargando={cargandoDashboard}
            alNavegarSeccion={manejarCambioSeccion}
            proyectosRecientes={proyectosRecientes}
            statsKpi={statsKpi}
            datosLinea={datosLinea}
            datosPastel={datosPastel}
          />
        );
    }
  };

  // ======================================
  // Render principal del layout
  // ======================================
  return (
    <div className={`pcm-page ${clasePanelRol}`}>          {/* Contenedor principal del workspace con tema por rol. */}
      {/* Barra de navegación lateral (desktop) y deslizable (móvil) */}
      <BarraNavegacion
        usuarioActual={usuarioActual}                      // Datos del usuario logueado.
        rolUsuario={rolUsuario}                            // Rol actual para adaptar colores/iconografía.
        seccionActiva={seccionActiva}                      // Sección seleccionada actualmente.
        secciones={menuPorRol}                             // Objeto de secciones ya filtrado por rol (para el mapa del menú).
        establecerSeccionActiva={manejarCambioSeccion}     // Setter que cambia la sección activa desde la barra.
        alCerrarSesion={manejarCerrarSesion}               // Callback para ejecutar el logout desde el botón de la barra.
        menuAbierto={menuLateralAbierto}                   // Estado del menú en móvil (abierto/cerrado).
        onToggleMenu={() => setMenuLateralAbierto((prev) => !prev)} // Alterna la visibilidad del menú móvil.
        alertasSinLeer={alertasSinLeer}                    // Contador de alertas sin leer para badges.
      />

      {/* Contenedor de contenido desplazado a la derecha del sidebar en escritorio */}
      <div className="lg:pl-72 transition-all duration-300">
        {/* Contenido principal del workspace */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Encabezado superior del workspace, se puede ocultar según scroll */}
          <EncabezadoSeccion
            mostrar={mostrarEncabezado}                      // Controla si el encabezado está visible.
            tituloSeccion={tituloSeccion}                    // Título legible de la sección actual.
            rolUsuario={rolUsuario}                          // Rol actual para colores del header.
            usuarioActual={usuarioActual}                    // Información del usuario logueado (nombre, etc.).
            alertasSinLeer={alertasSinLeer}                  // Número de alertas pendientes.
            onLogout={manejarCerrarSesion}                   // Handler para cierre de sesión.
            claseHeaderRol={claseHeaderRol}                  // Clases PCM específicas según rol (barra de color, etc.).
            onToggleMenu={() => setMenuLateralAbierto((prev) => !prev)} // Control del menú en vista móvil.
          />

          {/* Contenedor con scroll para el contenido de la sección activa */}
          <section
            ref={contenedorScrollRef}                        // Referencia usada para detectar scroll interno.
            className="flex-1 overflow-y-auto pcm-scroll-y px-4 pb-6 pt-4 lg:px-6" // Aplica scroll interno personalizado PCM.
          >
            {/* Muestra mensaje de error general si algo falló al cargar el dashboard */}
            {errorDashboard && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-200">
                {errorDashboard}
              </div>
            )}

            {/* Contenido principal de la sección activa con animación de entrada */}
            <div className="animate-page-in">
              {renderizarSeccionActiva()}
            </div>
          </section>
        </main>

        {/* Modales específicos para gestión de proyectos (detalle, creación, edición y eliminación) */}
        {proyectoSeleccionadoParaDetalle && (
          <ModalDetalleProyecto
            selectedProject={proyectoSeleccionadoParaDetalle} // Proyecto mostrado en el modal de detalle.
            onClose={cerrarModalDetalleProyecto}              // Cierra el modal de detalle.
          />
        )}

        <ModalCrearProyecto
          isOpen={modalCrearProyectoAbierto}                  // Controla apertura/cierre del modal de creación.
          onClose={cerrarModalCrearProyecto}                  // Cierra el modal sin crear.
          onSave={manejarProyectoCreado}                      // Maneja sincronización tras creación exitosa.
        />

        <ModalEditarProyecto
          projectToEdit={proyectoSeleccionadoParaEditar}      // Proyecto que se está editando.
          editProjectForm={formularioEdicionProyecto}         // Datos del formulario de edición de proyecto.
          setEditProjectForm={setFormularioEdicionProyecto}   // Setter para actualizar el formulario desde el modal.
          onClose={cerrarModalEditarProyecto}                 // Cierra el modal sin guardar cambios.
          onSave={manejarProyectoEditado}                     // Maneja sincronización tras edición exitosa.
        />

        <ModalEliminarProyecto
          projectToDelete={proyectoSeleccionadoParaEliminar}  // Proyecto que se desea eliminar.
          onClose={cerrarModalEliminarProyecto}               // Cierra el modal sin eliminar.
          onDeleted={manejarProyectoEliminado}                // Maneja sincronización tras eliminación exitosa.
        />

        {/* Modales específicos para gestión de usuarios (edición + eliminación) */}
        <ModalEditarUsuario
          selectedUser={usuarioSeleccionadoParaEditar}        // ID del usuario a editar.
          editUserForm={formularioEdicionUsuario}             // Datos del formulario de edición.
          setEditUserForm={setFormularioEdicionUsuario}       // Setter para actualizar el formulario desde el modal.
          onClose={cerrarModalEditarUsuario}                  // Cierra el modal sin guardar.
          onSave={manejarUsuarioActualizadoEnLista}           // Sincroniza la lista local cuando el backend responde OK.
          rolUsuario={rolUsuario}                             // Aplica colores según rol actual del operador.
        />

        <ModalEliminarUsuario
          userToDelete={usuarioSeleccionadoParaEliminar}      // Objeto del usuario a eliminar.
          onClose={cerrarModalEliminarUsuario}                // Cierra el modal sin eliminar.
          onConfirm={manejarConfirmacionEliminarUsuario}      // Sincroniza lista tras eliminación exitosa en backend.
          rolUsuario={rolUsuario}                             // Aplica colores según rol actual del operador.
        />
      </div>
    </div>
  );
};

// Exporta el layout principal del workspace para uso en las rutas internas.
export default TableroTrabajo;
