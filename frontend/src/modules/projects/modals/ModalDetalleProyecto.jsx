// File: frontend/src/modules/projects/modals/ModalDetalleProyecto.jsx
// Description: Modal de detalle de proyecto para ProCivil Manager (PCM). Muestra
//              información general del proyecto, materiales asignados y sus
//              estadísticas, presupuesto y costos, comentarios, asignación
//              de líder de obra, equipo y archivos adjuntos. Integra llamadas
//              al backend para descargar PDF, cargar presupuesto/costos, gestionar
//              líder, comentarios y adjuntos, usando el tema visual global PCM
//              (colores pcm, sombras, radios, animaciones personalizadas y lógica
//              de colores por rol en el workspace). Implementa su propio overlay,
//              bloqueo de scroll del body y cierre por ESC, sin usar ModalGenerico.

import React, {                                // Importa React y los hooks principales.
  useState,                                    // Hook para manejar estados locales.
  useEffect,                                   // Hook para manejar efectos secundarios.
} from 'react';
import { createPortal } from 'react-dom';      // Importa createPortal para renderizar el modal en #modal-root.

// Importación de íconos desde lucide-react
import {
  Building2,                                  // Ícono principal asociado a proyectos.
  FileDown,                                   // Ícono para exportar/descargar PDF.
  Package,                                    // Ícono para sección de materiales.
  TrendingUp,                                 // Ícono para sección de progreso.
  Calendar,                                   // Ícono para fechas.
  DollarSign,                                 // Ícono para presupuesto/dinero.
  AlertCircle,                                // Ícono de alerta para mensajes de feedback o estados críticos.
  Clock,                                      // Ícono de tiempo/duración.
  Users,                                      // Ícono para equipo/líder de obra.
  Paperclip,                                  // Ícono para sección de archivos adjuntos.
  Image as ImageIcon,                         // Ícono genérico tipo imagen cuando el adjunto no es miniatura vista.
  Trash2,                                     // Ícono de papelera para eliminar adjuntos.
  ChevronDown,                                // Ícono de flecha hacia abajo para dropdown de líderes.
} from 'lucide-react';                        // Importa todos los íconos desde lucide-react.

// Importación de servicios de API del backend PCM
import {
  downloadProyectoByIdPDF,                   // Servicio para descargar el PDF del proyecto por ID.
  fetchPresupuesto,                          // Servicio que obtiene el presupuesto del proyecto.
  fetchCostoMateriales,                      // Servicio que obtiene el costo ejecutado de materiales.
  fetchUsers,                                // Servicio que lista usuarios (para filtrar líderes de obra).
  addComentario,                             // Servicio que agrega un comentario al proyecto.
  assignLeader,                              // Servicio que asigna un líder de obra a un proyecto.
  removeLeader,                              // Servicio que remueve el líder de obra del proyecto.
  uploadProjectFiles,                        // Servicio que sube archivos adjuntos al proyecto.
  deleteAdjunto,                             // Servicio que elimina un adjunto de un proyecto.
  obtenerProyectoPorId,                      // Nuevo servicio: obtener detalles de proyecto por ID.
  registrarUsoMaterialProyecto,              // Nuevo servicio: registrar uso de material asignado.
} from '../../../services/api/api.js';       // Importa todos los servicios desde la capa centralizada de API.

// Importación del modal de presupuesto de proyecto
import ModalPresupuestoProyecto from './ModalPresupuestoProyecto.jsx'; // Modal específico para crear/editar el presupuesto de materiales.

// Base URL de la API para construir rutas de archivos
const API_BASE_URL = (                        // Define la URL base de la API para construir URLs de adjuntos.
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api' // Usa variable de entorno o valor por defecto.
).replace(/\/api$/, '');                      // Elimina el sufijo /api para poder concatenar rutas de archivos.

// Componente principal: ModalDetalleProyecto
const ModalDetalleProyecto = ({               // Define el componente funcional ModalDetalleProyecto.
  selectedProject,                            // Prop: proyecto seleccionado (objeto con _id y demás campos).
  onClose,                                    // Prop: función para cerrar el modal.
}) => {
  // Estados para presupuesto y costos
  const [budgetData, setBudgetData] = useState(null);        // Estado para el presupuesto del proyecto.
  const [costData, setCostData] = useState(null);            // Estado para los datos de costos ejecutados de materiales.
  const [loadingBudget, setLoadingBudget] = useState(false); // Bandera de carga mientras se obtiene el presupuesto.
  const [loadingCost, setLoadingCost] = useState(false);     // Bandera de carga mientras se obtienen los costos.
  const [showBudgetModal, setShowBudgetModal] = useState(false); // Controla la visibilidad del modal de presupuesto.

  // Estados para comentarios y liderazgo
  const [feedback, setFeedback] = useState(null);            // Mensaje global de feedback para acciones (éxito/error).
  const [comments, setComments] = useState([]);              // Lista de comentarios asociados al proyecto.
  const [newComment, setNewComment] = useState('');          // Contenido del nuevo comentario digitado por el usuario.
  const [savingComment, setSavingComment] = useState(false); // Bandera de carga mientras se guarda un comentario.

  const [leaders, setLeaders] = useState([]);                // Lista de usuarios con rol "líder de obra".
  const [selectedLeaderId, setSelectedLeaderId] = useState(''); // ID del líder seleccionado en el dropdown.
  const [loadingLeaders, setLoadingLeaders] = useState(false);  // Bandera de carga mientras se obtienen los líderes disponibles.
  const [assigningLeader, setAssigningLeader] = useState(false); // Bandera de carga mientras se asigna o remueve un líder.
  const [isLeaderMenuOpen, setIsLeaderMenuOpen] = useState(false); // Controla la visibilidad del menú desplegable de líderes.

  // --------------------------------------------------------------------------
  // Estado local del proyecto para reflejar cambios en materiales sin depender
  // de la prop seleccionada. Al modificar el presupuesto o registrar consumo,
  // recargamos los detalles actualizados mediante la API y actualizamos este
  // estado. De esta forma, la lista de materiales asignados se actualiza en
  // tiempo real sin necesidad de cerrar y abrir el modal.
  const [projectDetails, setProjectDetails] = useState(selectedProject);

  // Mapa de cantidades a consumir por cada material (clave: id del material).
  const [usoValues, setUsoValues] = useState({});

  // Estados para adjuntos / archivos
  const [adjuntos, setAdjuntos] = useState([]);              // Lista de archivos adjuntos del proyecto.
  const [uploadingFiles, setUploadingFiles] = useState(false); // Bandera de carga mientras se suben archivos.
  const [deletingFileId, setDeletingFileId] = useState(null); // ID del archivo que se está eliminando.

  // Efecto: carga de datos cada vez que cambia el proyecto
  useEffect(() => {                                         // Efecto que se dispara al cambiar selectedProject.
    if (!selectedProject || !selectedProject._id) return;   // Si no hay proyecto válido, no ejecuta nada.

    // Sincroniza el estado local del proyecto con el prop entrante. Esto
    // permite que la UI muestre la lista de materiales más reciente sin
    // depender de la referencia externa. Usamos un clon superficial para
    // evitar mutaciones inesperadas en el objeto original recibido por props.
    setProjectDetails({ ...selectedProject });

    // Reinicia los valores de consumo cuando se cambia de proyecto.
    setUsoValues({});

    setLoadingBudget(true);                                 // Marca que se está cargando el presupuesto.
    setLoadingCost(true);                                   // Marca que se están cargando los costos.

    // Presupuesto
    fetchPresupuesto(selectedProject._id)                   // Llama al backend para obtener presupuesto.
      .then((data) => {
        if (data && data.presupuesto) {                     // Si la respuesta contiene un objeto presupuesto...
          setBudgetData(data);                              // Guarda el objeto completo de respuesta.
        } else {
          setBudgetData(null);                              // Si no hay presupuesto, se deja en null.
        }
      })
      .catch((err) => {
        console.error('Error al obtener presupuesto:', err); // Loguea el error en consola.
        setBudgetData(null);                                // Limpia el estado de presupuesto en caso de fallo.
      })
      .finally(() => setLoadingBudget(false));              // Quita la bandera de carga de presupuesto.

    // Costos de materiales
    fetchCostoMateriales(selectedProject._id)               // Llama al backend para obtener costos de materiales.
      .then((data) => {
        setCostData(data);                                  // Guarda el objeto de costos en el estado.
      })
      .catch((err) => {
        console.error('Error al obtener costos:', err);     // Maneja errores de la llamada.
        setCostData(null);                                  // Limpia el estado de costos.
      })
      .finally(() => setLoadingCost(false));                // Quita la bandera de carga de costos.

    // Comentarios iniciales
    setComments(                                            // Inicializa comentarios desde el proyecto.
      Array.isArray(selectedProject.comentarios)            // Verifica si comentarios es un arreglo.
        ? selectedProject.comentarios                       // Si sí, lo usa directamente.
        : []                                                // Si no, deja un arreglo vacío.
    );

    // Líder actual del proyecto
    setSelectedLeaderId(selectedProject.lider?._id || '');  // Toma el _id del líder actual si existe, o cadena vacía.

    // Adjuntos actuales
    setAdjuntos(                                            // Inicializa adjuntos desde el proyecto.
      Array.isArray(selectedProject.adjuntos)               // Valida que adjuntos sea un arreglo.
        ? selectedProject.adjuntos                          // Si sí, lo usa.
        : []                                                // Si no, deja arreglo vacío.
    );

    // Carga de líderes (solo para usuario admin)
    try {
      const currentUser = JSON.parse(                       // Intenta leer el usuario autenticado desde localStorage.
        localStorage.getItem('user') || '{}'
      );
      if (currentUser && currentUser.role === 'admin') {    // Solo si el rol es admin se cargan líderes.
        setLoadingLeaders(true);                            // Marca la bandera de carga de líderes.
        fetchUsers()                                        // Llama al backend para traer todos los usuarios.
          .then((users) => {
            const leadersList = (Array.isArray(users) ? users : []) // Asegura que sea un arreglo.
              .filter((u) => u.role === 'lider de obra');  // Filtra solo aquellos con rol "lider de obra".
            setLeaders(leadersList);                        // Guarda la lista de líderes en el estado.
          })
          .catch((e) => {
            console.error('Error al cargar líderes:', e);   // Loguea el error.
            setLeaders([]);                                 // Deja la lista de líderes vacía en caso de error.
          })
          .finally(() => setLoadingLeaders(false));         // Quita la bandera de carga de líderes.
      }
    } catch (e) {
      console.error('Error al obtener usuario actual:', e); // Loguea errores al parsear el usuario de localStorage.
    }
  }, [selectedProject]);                                    // El efecto se ejecuta cada vez que cambia selectedProject.

  // Descarga de PDF del proyecto
  const handleDownloadPDF = () => {                        // Handler para descargar el PDF del proyecto.
    if (selectedProject && selectedProject._id) {          // Verifica que exista un proyecto válido.
      downloadProyectoByIdPDF(selectedProject._id);        // Llama al servicio que dispara la descarga.
    }
  };

  // Recarga de presupuesto y costos tras guardar presupuesto
  const handleBudgetSaved = () => {                        // Handler que se pasa al modal de presupuesto.
    if (!selectedProject || !selectedProject._id) return;  // Si no hay proyecto válido, no hace nada.

    setLoadingBudget(true);                                // Marca que se recarga presupuesto.
    setLoadingCost(true);                                  // Marca que se recarga costos.

    // Recarga de presupuesto desde backend
    fetchPresupuesto(selectedProject._id)
      .then((data) => {
        if (data && data.presupuesto) {                    // Si hay objeto presupuesto...
          setBudgetData(data);                             // Lo guarda en el estado.
        } else {
          setBudgetData(null);                             // Si no, lo deja en null.
        }
      })
      .catch(() => setBudgetData(null))                    // En caso de error, limpia el estado.
      .finally(() => setLoadingBudget(false));             // Quita la bandera de carga de presupuesto.

    // Recarga de costos desde backend
    fetchCostoMateriales(selectedProject._id)
      .then((data) => setCostData(data))                   // Actualiza el estado con los costos recibidos.
      .catch(() => setCostData(null))                      // Si hay error, limpia costData.
      .finally(() => setLoadingCost(false));               // Quita la bandera de carga de costos.

    // También recargamos los detalles del proyecto para reflejar las
    // asignaciones de materiales modificadas con el presupuesto. Esto
    // asegura que la lista de materiales asignados muestre nuevos
    // materiales o cantidades actualizadas inmediatamente.
    obtenerProyectoPorId(selectedProject._id)
      .then((data) => {
        if (data) {
          setProjectDetails(data);
        }
      })
      .catch((err) => {
        console.error('Error al refrescar detalles del proyecto:', err);
      });
  };

  /**
   * Maneja la solicitud de registrar el consumo de un material. Se valida la
   * cantidad ingresada, se envía la petición al backend y, en caso de
   * éxito, se actualiza el estado local del proyecto para reflejar la
   * nueva cantidad utilizada. Además, se recarga el costo ejecutado
   * consultando nuevamente el API.
   *
   * @param {string} materialId ID del material asignado al proyecto.
   * @param {number|string} cantidad Cantidad a consumir.
   */
  const handleRegistrarUso = async (materialId, cantidad) => {
    const qty = Number(cantidad);
    // Valida número positivo y diferente de 0
    if (!Number.isFinite(qty) || qty <= 0) return;
    if (!projectDetails || !projectDetails._id) return;
    try {
      await registrarUsoMaterialProyecto(projectDetails._id, materialId, qty);
      // Actualiza localmente la cantidad utilizada del material
      setProjectDetails((prev) => {
        if (!prev || !Array.isArray(prev.materiales)) return prev;
        const updated = prev.materiales.map((m) => {
          const id = m.material?._id || m.material;
          if (id?.toString() === materialId.toString()) {
            const nuevaUtilizada = (Number(m.cantidadUtilizada) || 0) + qty;
            return { ...m, cantidadUtilizada: nuevaUtilizada };
          }
          return m;
        });
        return { ...prev, materiales: updated };
      });
      // Limpia el valor de consumo para ese material
      setUsoValues((prev) => ({ ...prev, [materialId]: '' }));
      // Recarga costos y presupuesto ejecutado
      setLoadingCost(true);
      fetchCostoMateriales(projectDetails._id)
        .then((data) => setCostData(data))
        .catch(() => {})
        .finally(() => setLoadingCost(false));
      // Mensaje global de éxito
      setFeedback({ type: 'success', message: 'Consumo registrado correctamente.' });
    } catch (error) {
      console.error('Error al registrar consumo:', error);
      setFeedback({ type: 'error', message: error.message || 'No se pudo registrar el consumo.' });
    }
  };

  // Manejo de comentarios
  const handleAddComment = async () => {                   // Función asincrónica para agregar un comentario.
    if (!selectedProject || !selectedProject._id) return;  // Verifica que exista proyecto válido.

    const contenido = newComment.trim();                   // Elimina espacios al extremo del comentario.
    if (!contenido) return;                                // Evita enviar comentarios vacíos.

    setSavingComment(true);                                // Marca que se está guardando el comentario.
    setFeedback(null);                                     // Limpia feedback previo.

    try {
      const comment = await addComentario(                 // Llama al servicio para guardar el comentario.
        selectedProject._id,
        contenido
      );

      setComments((prev) => [...prev, comment]);           // Agrega el nuevo comentario al arreglo local.
      setNewComment('');                                   // Limpia el textarea.

      setFeedback({                                        // Configura feedback de éxito.
        type: 'success',
        message: 'Comentario agregado correctamente.',
      });
    } catch (error) {
      console.error('Error al agregar comentario:', error); // Loguea el error.
      setFeedback({                                        // Configura feedback de error.
        type: 'error',
        message: 'No se pudo agregar el comentario',
      });
    } finally {
      setSavingComment(false);                             // Quita la bandera de guardado.
    }
  };

  // Manejo de líder de obra (solo admin)
  const handleAssignLeader = async () => {                 // Función asincrónica para asignar un líder de obra.
    if (!selectedProject || !selectedProject._id || !selectedLeaderId) {
      return;                                              // Valida que haya proyecto y líder seleccionado.
    }

    setAssigningLeader(true);                              // Marca que se está realizando la acción.
    setFeedback(null);                                     // Limpia mensajes previos.

    try {
      const resp = await assignLeader(                     // Llama al servicio de asignación de líder.
        selectedProject._id,
        selectedLeaderId
      );
      const updatedProject = resp.proyecto || {};          // Toma el proyecto actualizado de la respuesta si existe.

      if (updatedProject.lider && updatedProject.lider._id) { // Si el backend retorna líder con _id...
        setSelectedLeaderId(updatedProject.lider._id);     // Actualiza el ID en el estado.
      }

      // Actualiza localmente el proyecto con el nuevo líder para reflejar el cambio en la UI.
      try {
        if (updatedProject.lider) {
          selectedProject.lider = updatedProject.lider;
        }
      } catch (e) {
        // Silencia cualquier error al actualizar la propiedad local.
      }

      setFeedback({                                        // Feedback de éxito.
        type: 'success',
        message: 'Líder asignado correctamente.',
      });
    } catch (error) {
      console.error('Error al asignar líder:', error);     // Loguea el error.
      setFeedback({                                        // Feedback de error.
        type: 'error',
        message:
          error?.response?.data?.message ||
          error?.message ||
          'No se pudo asignar el líder',
      });
    } finally {
      setAssigningLeader(false);                           // Quita bandera de asignación.
    }
  };

  const handleRemoveLeader = async () => {                 // Función asincrónica para remover el líder actual.
    if (!selectedProject || !selectedProject._id) return;  // Verifica que haya proyecto válido.

    setAssigningLeader(true);                              // Reutiliza la bandera para indicar acción en curso.
    setFeedback(null);                                     // Limpia feedback previo.

    try {
      await removeLeader(selectedProject._id);             // Llama al servicio para remover el líder en backend.
      setSelectedLeaderId('');                             // Limpia el líder seleccionado en el estado.

      // Actualiza localmente el proyecto para eliminar el líder, mejorando la respuesta visual.
      try {
        if (selectedProject) {
          selectedProject.lider = null;
        }
      } catch (e) {
        // Ignoramos cualquier error al actualizar el proyecto localmente.
      }

      setFeedback({                                        // Feedback de éxito.
        type: 'success',
        message: 'Líder removido correctamente.',
      });
    } catch (error) {
      console.error('Error al remover líder:', error);     // Loguea el error.
      setFeedback({                                        // Feedback de error.
        type: 'error',
        message:
          error?.response?.data?.message ||
          error?.message ||
          'No se pudo remover el líder',
      });
    } finally {
      setAssigningLeader(false);                           // Quita bandera de asignación.
    }
  };

  // Manejo de archivos adjuntos
  const handleUploadFiles = async (event) => {             // Función asincrónica para subir archivos al proyecto.
    if (!selectedProject || !selectedProject._id) return;  // Verifica proyecto válido.

    const files = Array.from(event.target.files || []);    // Convierte FileList en un arreglo.
    if (files.length === 0) return;                        // Si no hay archivos, sale.

    setUploadingFiles(true);                               // Marca que se están subiendo archivos.
    setFeedback(null);                                     // Limpia feedback previo.

    try {
      const result = await uploadProjectFiles(             // Llama al servicio de subida de archivos.
        selectedProject._id,
        files
      );
      let nuevosAdjuntos = [];                             // Arreglo temporal para los adjuntos finales.

      if (result && Array.isArray(result.adjuntos)) {      // Formato 1: adjuntos directamente en la respuesta.
        nuevosAdjuntos = result.adjuntos;
      } else if (
        result &&
        result.proyecto &&
        Array.isArray(result.proyecto.adjuntos)
      ) {                                                  // Formato 2: adjuntos dentro de result.proyecto.
        nuevosAdjuntos = result.proyecto.adjuntos;
      }

      if (nuevosAdjuntos.length > 0) {                     // Si tenemos al menos un adjunto...
        setAdjuntos(nuevosAdjuntos);                       // Reemplaza la lista actual por la nueva.
      }

      setFeedback({                                        // Feedback de éxito.
        type: 'success',
        message: 'Archivo(s) adjuntado(s) correctamente al proyecto.',
      });
    } catch (error) {
      console.error('Error al subir archivos:', error);    // Loguea error.
      setFeedback({                                        // Feedback de error.
        type: 'error',
        message: 'No se pudieron adjuntar los archivos.',
      });
    } finally {
      setUploadingFiles(false);                            // Quita la bandera de subida.
      event.target.value = '';                             // Resetea el input para permitir subir el mismo archivo luego.
    }
  };

  const handleDeleteFile = async (adjuntoId) => {          // Función asincrónica para eliminar un archivo adjunto.
    if (!selectedProject || !selectedProject._id || !adjuntoId) {
      return;                                              // Verifica proyecto y adjunto válidos.
    }

    setDeletingFileId(adjuntoId);                          // Indica qué adjunto se está eliminando.
    setFeedback(null);                                     // Limpia feedback previo.

    try {
      const result = await deleteAdjunto(                  // Llama al servicio de eliminación de adjunto.
        selectedProject._id,
        adjuntoId
      );
      let nuevosAdjuntos = [];                             // Arreglo para la nueva lista.

      if (result && Array.isArray(result.adjuntos)) {      // Formato 1: respuesta con adjuntos directos.
        nuevosAdjuntos = result.adjuntos;
      } else if (
        result &&
        result.proyecto &&
        Array.isArray(result.proyecto.adjuntos)
      ) {                                                  // Formato 2: adjuntos dentro de result.proyecto.
        nuevosAdjuntos = result.proyecto.adjuntos;
      } else {
        nuevosAdjuntos = adjuntos.filter((a) => a._id !== adjuntoId); // Si no hay lista en respuesta, filtra localmente.
      }

      setAdjuntos(nuevosAdjuntos);                         // Actualiza la lista de adjuntos.

      setFeedback({                                        // Feedback de éxito.
        type: 'success',
        message: 'Archivo eliminado correctamente.',
      });
    } catch (error) {
      console.error('Error al eliminar archivo:', error);  // Loguea el error.
      setFeedback({                                        // Feedback de error.
        type: 'error',
        message: 'No se pudo eliminar el archivo.',
      });
    } finally {
      setDeletingFileId(null);                             // Limpia el ID del archivo en proceso.
    }
  };

  // Estadísticas de materiales
  const calcularEstadisticasMateriales = () => {           // Calcula estadísticas globales de materiales.
    const materiales = projectDetails?.materiales;
    if (!projectDetails || !Array.isArray(materiales) || materiales.length === 0) {
      return {
        total: 0,
        utilizado: 0,
        disponible: 0,
        costoTotal: 0,
      };
    }

    const total = materiales.reduce((sum, m) => sum + (m.cantidadAsignada || 0), 0);
    const utilizado = materiales.reduce((sum, m) => sum + (m.cantidadUtilizada || 0), 0);
    const disponible = total - utilizado;
    const costoTotal = materiales.reduce((sum, m) => {
      const precio = m.material?.precioUnitario || 0;
      const cant = m.cantidadAsignada || 0;
      return sum + cant * precio;
    }, 0);
    return { total, utilizado, disponible, costoTotal };
  };

  const estadisticas = calcularEstadisticasMateriales();   // Calcula estadísticas para los materiales del proyecto.

  // Costo estimado de materiales según el presupuesto (sumatoria de cantidadPrevista * costoPrevisto)
  const costoMaterialesPresupuestados = React.useMemo(() => {
    if (
      budgetData &&
      budgetData.presupuesto &&
      Array.isArray(budgetData.presupuesto.items)
    ) {
      return budgetData.presupuesto.items.reduce((sum, item) => {
        const cant = Number(item.cantidadPrevista) || 0;
        const costo = Number(item.costoPrevisto) || 0;
        return sum + cant * costo;
      }, 0);
    }
    return 0;
  }, [budgetData]);

  // Determina el costo de materiales a mostrar: si existe presupuesto se usa la sumatoria de ese presupuesto, de lo contrario se usa el costo basado en asignaciones
  const costoMaterialesMostrar =
    budgetData && budgetData.presupuesto && Array.isArray(budgetData.presupuesto.items)
      ? costoMaterialesPresupuestados
      : estadisticas.costoTotal;

  const porcentajeUtilizado =                              // Calcula porcentaje global de uso de materiales.
    estadisticas.total > 0
      ? ((estadisticas.utilizado / estadisticas.total) * 100).toFixed(1)
      : 0;

  // Rol del usuario actual (para permisos y colores de rol)
  let currentUserRole = '';                                // Variable para el rol del usuario actual.
  try {
    const currentUser = JSON.parse(                        // Intenta leer el usuario guardado en localStorage.
      localStorage.getItem('user') || '{}'
    );
    currentUserRole = currentUser.role || '';              // Asigna el rol si existe.
  } catch (e) {
    currentUserRole = '';                                  // Si falla el parseo, se deja vacío.
  }

  const canManageFiles =                                   // Determina si el usuario puede gestionar archivos.
    currentUserRole === 'admin' || currentUserRole === 'lider de obra';

  const clasePanelRol =                                    // Clase de panel con modificador por rol (para colores dinámicos).
    currentUserRole === 'admin'
      ? 'pcm-panel pcm-panel--admin'
      : currentUserRole === 'lider de obra'
      ? 'pcm-panel pcm-panel--lider'
      : currentUserRole === 'cliente'
      ? 'pcm-panel pcm-panel--cliente'
      : currentUserRole === 'auditor'
      ? 'pcm-panel pcm-panel--auditor'
      : 'pcm-panel pcm-panel--lider';                      // Fallback visual: líder.

  // Flag de apertura del modal y efectos visuales globales
  const estaAbierto = !!selectedProject;                   // El modal se considera abierto si hay un proyecto seleccionado.

  // Bloquear el scroll del body mientras el modal está abierto.
  useEffect(() => {                                        // Efecto para bloquear el scroll del body.
    if (!estaAbierto) return;                              // Si el modal está cerrado, no modifica el body.

    const overflowOriginal = document.body.style.overflow; // Guarda el valor original del overflow del body.
    document.body.style.overflow = 'hidden';               // Deshabilita el scroll de fondo.

    return () => {
      document.body.style.overflow = overflowOriginal;     // Restaura el overflow original al cerrar o desmontar.
    };
  }, [estaAbierto]);

  // Cerrar el modal al presionar la tecla ESC.
  useEffect(() => {                                        // Efecto para cerrar con la tecla ESC.
    if (!estaAbierto) return;                              // Si no está abierto, no agrega el listener.

    const manejarKeyDown = (evento) => {                   // Función que procesa eventos de teclado.
      if (evento.key === 'Escape' && typeof onClose === 'function') {
        onClose();                                         // Cierra el modal cuando se presiona ESC.
      }
    };

    window.addEventListener('keydown', manejarKeyDown);    // Agrega el listener global.
    return () => {
      window.removeEventListener('keydown', manejarKeyDown); // Limpia el listener al desmontar/cerrar.
    };
  }, [estaAbierto, onClose]);

  // Lista de equipo unificada (teamMembers / team)
  const teamList =                                         // Determina la fuente de datos del equipo.
    selectedProject?.teamMembers && selectedProject.teamMembers.length > 0
      ? selectedProject.teamMembers                        // Usa teamMembers si viene poblado.
      : selectedProject?.team || [];                       // Si no, usa team o arreglo vacío.

  // Porcentaje de uso de presupuesto (estimado por materiales)
  const porcentajePresupuestoUsado =                       // Calcula porcentaje de uso del presupuesto.
    selectedProject && selectedProject.budget
      ? Math.min((costoMaterialesMostrar / selectedProject.budget) * 100, 100)
      : 0;

  // Helpers para formatear fechas
  const formatDate = (value) => {                          // Formatea una fecha a dd/mm/aaaa.
    if (!value) return '-';                                // Si no hay valor, devuelve guion.
    const d = new Date(value);                             // Crea un objeto Date.
    if (Number.isNaN(d.getTime())) return '-';             // Si la fecha no es válida, devuelve guion.
    return d.toLocaleDateString('es-CO');                  // Devuelve fecha en formato regional colombiano.
  };

  const formatDateTime = (value) => {                      // Formatea fecha y hora para comentarios.
    if (!value) return '';                                 // Sin valor, devuelve cadena vacía.
    const d = new Date(value);                             // Crea Date.
    if (Number.isNaN(d.getTime())) return '';              // Si no es válida, cadena vacía.
    return d.toLocaleString('es-CO');                      // Devuelve fecha y hora en formato es-CO.
  };

  // Label para el dropdown de líder
  const currentLeaderLabel = (() => {                      // Función autoejecutable para el texto del botón de líder.
    if (selectedLeaderId) {                                // Si hay líder seleccionado...
      const currentLeader =
        leaders.find((l) => l._id === selectedLeaderId) || // Busca en la lista de líderes...
        selectedProject?.lider ||                          // o usa el líder del proyecto...
        {};

      const firstName =
        currentLeader.firstName ||
        currentLeader.nombre ||
        currentLeader.name ||
        '';
      const lastName =
        currentLeader.lastName ||
        currentLeader.apellido ||
        '';

      const fullName = `${firstName} ${lastName}`.trim();  // Arma nombre completo y recorta espacios.

      return fullName || 'Líder asignado';                 // Devuelve nombre o texto genérico.
    }
    return '-- Seleccionar líder --';                      // Placeholder cuando no hay líder seleccionado.
  })();

  // Guard de seguridad: si no hay proyecto, no renderiza nada
  if (!selectedProject) return null;                       // Evita render si no existe proyecto.

  // Contenido completo del modal para usarlo en el portal
  const modalContent = (                                   // Define el JSX del modal que se inyectará en #modal-root.
    <div
      className="
        fixed inset-0 z-50                                /* Overlay de pantalla completa, sin estilos de panel. */
        flex items-center justify-center                  /* Centra el contenido del modal en la ventana.        */
        px-4 sm:px-6                                      /* Padding horizontal adaptable.                       */
      "
      aria-modal="true"                                    // Indica a lectores de pantalla que es un modal.
      role="dialog"                                        // Rol ARIA de diálogo.
      aria-labelledby="modal-detalle-proyecto-titulo"      // Asocia el título principal del modal.
    >
      {/* Overlay oscuro de fondo que cierra el modal al hacer clic */}
      <div
        className="absolute inset-0 bg-black/75 pcm-overlay-suave" // Overlay oscuro con helper PCM.
        onClick={onClose}                               // Permite cerrar el modal al hacer clic fuera.
      />

      {/* Contenedor centrado del modal con animación de entrada */}
      <div className="relative w-full max-w-6xl animate-fade-in-soft"> {/* Contenedor principal del modal. */}
        {/* Borde degradado animado PCM alrededor del contenido */}
        <div className="pcm-borde-animado">              {/* Capa del borde animado PCM. */}
          <div
            className={`
              pcm-borde-animado-contenido                /* Aplica el recorte del borde animado.                     */
              ${clasePanelRol}                           /* Aplica .pcm-panel y .pcm-panel--ROL al panel, no al overlay. */
              pcm-panel-fondo                            /* Fondo principal PCM para paneles internos.               */
              rounded-pcm-xl                             /* Radio grande PCM usando el token del tema (sin clase arbitraria). */
              shadow-pcm-profunda                        /* Sombra profunda para resaltar el modal.                  */
              border border-pcm-borderSoft               /* Borde suave PCM.                                         */
              text-pcm-text                              /* Color de texto PCM.                                      */
              max-h-[80vh]                               /* Alto máximo del contenido del modal relativo a la ventana. */
              overflow-hidden                            /* Oculta el desborde y delega el scroll a un contenedor interno. */
              flex flex-col                              /* Estructura en columna para poder usar un área scrollable flex-1. */
            `}
          >
            {/* Contenedor interno con scroll para todo el contenido del modal */}
            <div className="pcm-scroll-y pr-1 flex-1">   {/* Aplica scroll vertical al contenido interno del modal. */}
              {/* Mensaje global de feedback (success/error) */}
              {feedback && (
                <div
                  className={`mb-4 p-3 rounded-xl border flex items-start justify-between text-sm ${
                    feedback.type === 'success'
                      ? 'bg-green-500/10 border-green-500/40 text-green-300'
                      : 'bg-red-500/10 border-red-500/40 text-red-300'
                  }`}
                >
                  {/* Contenido (icono + texto) */}
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={18}
                      className={
                        feedback.type === 'success'
                          ? 'text-green-400 mt-0.5'
                          : 'text-red-400 mt-0.5'
                      }
                    />
                    <p>{feedback.message}</p>
                  </div>
                  {/* Botón para cerrar el mensaje de feedback */}
                  <button
                    onClick={() => setFeedback(null)}        // Limpia el feedback al hacer clic.
                    className="text-xs text-pcm-muted hover:text-pcm-text ml-3"
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {/* Encabezado principal del detalle del proyecto */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 pb-6 border-b border-white/10 gap-4 pcm-panel-header rounded-pcm-xl">
                {/* Lado izquierdo: icono + título + subtítulo */}
                <div className="flex items-center space-x-4">
                  {/* Icono del proyecto usando helper de degradado PCM */}
                  <div className="w-16 h-16 pcm-fondo-degradado-principal rounded-2xl flex items-center justify-center shadow-pcm-soft">
                    <Building2 size={32} className="text-white" /> {/* Ícono central blanco. */}
                  </div>
                  <div>
                    <h3
                      id="modal-detalle-proyecto-titulo"    // Id usado en aria-labelledby.
                      className="text-3xl font-bold text-pcm-text mb-1"
                    >
                      {selectedProject.title}               {/* Título del proyecto. */}
                    </h3>
                    <p className="text-pcm-primary/80 text-sm">
                      Detalles del Proyecto                  {/* Subtítulo fijo. */}
                    </p>
                  </div>
                </div>

                {/* Botón para exportar PDF del proyecto */}
                <button
                  onClick={handleDownloadPDF}               // Llama al handler de descarga.
                  className="pcm-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm md:text-base"
                >
                  <FileDown size={20} />                   {/* Ícono de descarga. */}
                  Exportar PDF                             {/* Texto del botón. */}
                </button>
              </div>

              {/* Layout principal: columna grande + columna lateral */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna principal (2/3 de ancho) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Bloque: Información general del proyecto */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-xl font-bold text-pcm-primary mb-6 flex items-center gap-2">
                      <Building2 size={22} />               {/* Ícono pequeño de proyecto. */}
                      Información General                   {/* Título de la sección. */}
                    </h4>

                    {/* Grid de datos generales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      {/* Cliente asociado o proyecto propio */}
                      <div>
                        <p className="text-pcm-primary/70 font-semibold text-xs uppercase tracking-wider mb-1.5">
                          Cliente
                        </p>
                        <p className="text-pcm-text text-base">
                          {selectedProject.esProyectoPropio
                            ? 'Proyecto propio'
                            : selectedProject.cliente
                            ? `${
                                [
                                  selectedProject.cliente.firstName,
                                  selectedProject.cliente.lastName,
                                ]
                                  .filter(Boolean)
                                  .join(' ')
                              }${
                                selectedProject.cliente.email
                                  ? ` - ${selectedProject.cliente.email}`
                                  : ''
                              }`
                            : selectedProject.email || '-'}
                        </p>
                      </div>

                      {/* Ubicación */}
                      <div>
                        <p className="text-pcm-primary/70 font-semibold text-xs uppercase tracking-wider mb-1.5">
                          Ubicación
                        </p>
                        <p className="text-pcm-text text-base">
                          {selectedProject.location || '-'} {/* Ubicación del proyecto. */}
                        </p>
                      </div>

                      {/* Tipo de proyecto */}
                      <div>
                        <p className="text-pcm-primary/70 font-semibold text-xs uppercase tracking-wider mb-1.5">
                          Tipo
                        </p>
                        <p className="text-pcm-text text-base capitalize">
                          {selectedProject.type || '-'}     {/* Tipo (obra civil, diseño, etc.). */}
                        </p>
                      </div>

                      {/* Duración en días */}
                      <div>
                        <p className="text-pcm-primary/70 font-semibold text-xs uppercase tracking-wider mb-1.5">
                          Duración
                        </p>
                        <p className="text-pcm-text text-base flex items-center gap-2">
                          <Clock size={18} className="text-pcm-primary/70" /> {/* Ícono de reloj. */}
                          {selectedProject.duration
                            ? `${selectedProject.duration} días` // Muestra duración si existe.
                            : '-'}
                        </p>
                      </div>

                      {/* Fecha de inicio */}
                      <div>
                        <p className="text-pcm-primary/70 font-semibold text-xs uppercase tracking-wider mb-1.5">
                          Fecha Inicio
                        </p>
                        <p className="text-pcm-text text-base flex items-center gap-2">
                          <Calendar size={18} className="text-pcm-primary/70" />
                          {formatDate(selectedProject.startDate)} {/* Fecha inicio formateada. */}
                        </p>
                      </div>

                      {/* Fecha de fin */}
                      <div>
                        <p className="text-pcm-primary/70 font-semibold text-xs uppercase tracking-wider mb-1.5">
                          Fecha Fin
                        </p>
                        <p className="text-pcm-text text-base flex items-center gap-2">
                          <Calendar size={18} className="text-pcm-primary/70" />
                          {formatDate(selectedProject.endDate)}   {/* Fecha fin formateada. */}
                        </p>
                      </div>

                      {/* Contacto del líder */}
                      <div>
                        <p className="text-pcm-primary/70 font-semibold text-xs uppercase tracking-wider mb-1.5">
                          Contacto Líder
                        </p>
                        <p className="text-pcm-text text-base">
                          {selectedProject.lider
                            ? [
                                [
                                  selectedProject.lider.firstName,
                                  selectedProject.lider.lastName,
                                ]
                                  .filter(Boolean)
                                  .join(' '),
                                selectedProject.lider.phone || '',
                                selectedProject.lider.email || '',
                              ]
                                .filter(Boolean)
                                .join(' - ')
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bloque: Materiales asignados (si existen) */}
                  {projectDetails?.materiales &&
                    projectDetails.materiales.length > 0 && (
                      <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                        <h4 className="text-xl font-bold text-pcm-primary mb-6 flex items-center gap-2">
                          <Package size={22} />             {/* Ícono de materiales. */}
                          Materiales Asignados
                        </h4>

                        {/* Tarjetas con estadísticas globales de materiales */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          {/* Total asignado */}
                          <div className="rounded-xl p-4 border border-pcm-primary/40 bg-pcm-primary/10">
                            <p className="text-pcm-primary text-xs font-semibold uppercase tracking-wide mb-1">
                              Total
                            </p>
                            <p className="text-pcm-text text-3xl font-bold">
                              {estadisticas.total}
                            </p>
                          </div>

                          {/* Utilizado */}
                          <div className="rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/10">
                            <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-1">
                              Utilizado
                            </p>
                            <p className="text-white text-3xl font-bold">
                              {estadisticas.utilizado}
                            </p>
                          </div>

                          {/* Disponible */}
                          <div className="rounded-xl p-4 border border-pcm-accent/40 bg-pcm-accent/10">
                            <p className="text-pcm-accent text-xs font-semibold uppercase tracking-wide mb-1">
                              Disponible
                            </p>
                            <p className="text-pcm-text text-3xl font-bold">
                              {estadisticas.disponible}
                            </p>
                          </div>

                          {/* % Usado */}
                          <div className="rounded-xl p-4 border border-pcm-secondary/40 bg-pcm-secondary/10">
                            <p className="text-pcm-primary text-xs font-semibold uppercase tracking-wide mb-1">
                              % Usado
                            </p>
                            <p className="text-pcm-text text-3xl font-bold">
                              {porcentajeUtilizado}%
                            </p>
                          </div>
                        </div>

                        {/* Lista detallada de materiales con scroll */}
                        <div className="space-y-4 max-h-96 pcm-scroll-y pr-2">
                          {Array.isArray(projectDetails?.materiales) &&
                            projectDetails.materiales.map((item, index) => {
                              const asignada = item.cantidadAsignada || 0; // Cantidad asignada del material.
                              const utilizada = item.cantidadUtilizada || 0; // Cantidad utilizada del material.
                              const porcentajeUso =
                                asignada > 0
                                  ? ((utilizada / asignada) * 100).toFixed(1)
                                  : 0;

                              const costoMaterial =
                                (item.material?.precioUnitario || 0) * asignada; // Costo estimado del material.

                              return (
                                <div
                                  key={item.material?._id || index}
                                  className="bg-pcm-bg/70 rounded-xl p-5 border border-white/10 hover:border-pcm-primary/40 transition-all hover:bg-pcm-bg/90"
                                >
                                  {/* Encabezado con nombre y costos */}
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                      <h5 className="text-pcm-text font-semibold text-lg mb-1">
                                        {item.material?.nombre || 'Material no disponible'}
                                      </h5>
                                      <p className="text-pcm-muted text-sm">
                                        {item.material?.categoria || 'Sin categoría'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-pcm-text font-bold text-xl">
                                        $
                                        {costoMaterial.toLocaleString('es-CO', {
                                          minimumFractionDigits: 2,
                                        })}
                                      </p>
                                      <p className="text-pcm-muted text-xs">
                                        $
                                        {(item.material?.precioUnitario || 0).toLocaleString(
                                          'es-CO',
                                          { minimumFractionDigits: 2 }
                                        )}
                                        /ud
                                      </p>
                                    </div>
                                  </div>

                                {/* Cantidades asignadas, usadas y restantes */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  <div className="bg-pcm-surfaceSoft/60 rounded-lg p-3">
                                    <p className="text-pcm-muted text-xs mb-1">
                                      Asignado
                                    </p>
                                    <p className="text-pcm-text font-bold text-lg">
                                      {asignada}
                                    </p>
                                  </div>
                                  <div className="bg-pcm-surfaceSoft/60 rounded-lg p-3">
                                    <p className="text-pcm-muted text-xs mb-1">
                                      Utilizado
                                    </p>
                                    <p className="text-blue-400 font-bold text-lg">
                                      {utilizada}
                                    </p>
                                  </div>
                                  <div className="bg-pcm-surfaceSoft/60 rounded-lg p-3">
                                    <p className="text-pcm-muted text-xs mb-1">
                                      Restante
                                    </p>
                                    <p className="text-pcm-primary font-bold text-lg">
                                      {asignada - utilizada}
                                    </p>
                                  </div>
                                </div>

                                {/* Barra de progreso por material */}
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-pcm-muted text-xs font-medium">
                                      Uso del material
                                    </p>
                                    <p className="text-pcm-text text-sm font-bold">
                                      {porcentajeUso}%
                                    </p>
                                  </div>
                                  <div className="bg-pcm-bg/70 rounded-full h-2.5">
                                    <div
                                      className={`h-2.5 rounded-full transition-all duration-500 ${
                                        porcentajeUso >= 90
                                          ? 'bg-red-500'
                                          : porcentajeUso >= 70
                                          ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                      }`}
                                      style={{ width: `${porcentajeUso}%` }} // Ajusta ancho según porcentaje de uso.
                                    ></div>
                                  </div>
                                </div>

                                {/* Registro de uso de material (solo admin/líder) */}
                                {(currentUserRole === 'admin' || currentUserRole === 'lider de obra') && (
                                  <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={Math.max(0, asignada - utilizada)}
                                      placeholder="Cantidad a usar"
                                      className="w-full md:w-24 bg-pcm-bg/80 border border-white/10 rounded px-2 py-1 text-sm text-center"
                                      value={usoValues[item.material?._id || item.material] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setUsoValues((prev) => ({
                                          ...prev,
                                          [item.material?._id || item.material]: val,
                                        }));
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRegistrarUso(item.material?._id || item.material, usoValues[item.material?._id || item.material])}
                                      disabled={
                                        !usoValues[item.material?._id || item.material] ||
                                        Number(usoValues[item.material?._id || item.material]) <= 0 ||
                                        Number(usoValues[item.material?._id || item.material]) > (asignada - utilizada)
                                      }
                                      className="pcm-btn-secondary text-xs font-semibold disabled:opacity-50"
                                    >
                                      Usar
                                    </button>
                                  </div>
                                )}

                                {/* Fecha de asignación si existe */}
                                {item.fechaAsignacion && (
                                  <p className="text-pcm-muted text-xs mt-3">
                                    Asignado: {formatDate(item.fechaAsignacion)}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Mensaje si no hay materiales asignados */}
                  {(!projectDetails?.materiales ||
                    projectDetails.materiales.length === 0) && (
                    <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-8 border border-white/10 shadow-pcm-soft">
                      <div className="text-center">
                        <AlertCircle
                          size={48}
                          className="mx-auto text-pcm-muted mb-3"
                        />
                        <p className="text-pcm-muted text-lg">
                          No hay materiales asignados a este proyecto.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bloque: Archivos adjuntos */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-xl font-bold text-pcm-primary mb-4 flex items-center gap-2">
                      <Paperclip size={22} />                {/* Ícono de clip. */}
                      Archivos adjuntos
                    </h4>

                    {/* Lista de adjuntos si existen */}
                    {adjuntos && adjuntos.length > 0 ? (
                      <div className="space-y-3 max-h-64 pcm-scroll-y pr-2 mb-4">
                        {adjuntos.map((file) => {
                          const isImage = file.tipoMime?.startsWith('image/'); // Determina si el archivo es imagen.
                          const fileUrl = `${API_BASE_URL}${file.ruta || ''}`;  // Construye la URL pública del archivo.
                          const esPdf = (file.tipoMime && file.tipoMime.includes('pdf')) || (file.nombreOriginal && file.nombreOriginal.toLowerCase().endsWith('.pdf'));
                          const sizeKb = file.size
                            ? (file.size / 1024).toFixed(1)
                            : null;                                  // Tamaño en KB si existe.

                          return (
                            <div
                              key={file._id}
                              className="flex items-center justify-between bg-pcm-bg/70 rounded-xl p-3 border border-white/10 hover:border-pcm-primary/40 transition-all"
                            >
                              {/* Izquierda: miniatura + nombre + metadatos */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-pcm-bg flex items-center justify-center border border-white/10">
                                  {isImage ? (
                                    <img
                                      src={fileUrl}
                                      alt={file.nombreOriginal || 'Adjunto'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon
                                      size={20}
                                      className="text-pcm-primary"
                                    />
                                  )}
                                </div>
                                <div>
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-pcm-text hover:text-pcm-primary line-clamp-1"
                                    title={file.nombreOriginal || file.nombre}
                                    download={esPdf ? undefined : ''}
                                  >
                                    {file.nombreOriginal || file.nombre || 'Archivo adjunto'}
                                  </a>
                                  <p className="text-xs text-pcm-muted">
                                    {file.tipoMime || 'Tipo desconocido'}
                                    {sizeKb && ` · ${sizeKb} KB`}
                                    {file.fechaSubida && (
                                      <>
                                        {' '}
                                        · {formatDate(file.fechaSubida)}
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Derecha: acciones sobre el archivo */}
                              <div className="flex items-center gap-2">
                                {/* Ver / descargar */}
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 text-xs rounded-lg bg-pcm-bg/80 hover:bg-pcm-bg text-pcm-text border border-white/10"
                                  download={esPdf ? undefined : ''}
                                >
                                  Ver / Descargar
                                </a>

                                {/* Eliminar (solo admin / líder) */}
                                {canManageFiles && (
                                  <button
                                    onClick={() => handleDeleteFile(file._id)} // Handler para eliminar adjunto.
                                    disabled={deletingFileId === file._id}     // Deshabilita mientras se elimina.
                                    className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 hover:text-red-100 disabled:opacity-50"
                                    title="Eliminar adjunto"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-pcm-muted text-sm mb-4">
                        No hay archivos adjuntos para este proyecto.
                      </p>
                    )}

                    {/* Input para subir archivos (solo admin / líder) */}
                    {canManageFiles && (
                      <div className="space-y-2">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pcm-primary hover:bg-pcm-secondary text-white text-xs font-semibold cursor-pointer transition-all hover:scale-105">
                          <Paperclip size={16} />
                          <span>
                            {uploadingFiles
                              ? 'Subiendo archivos...'
                              : 'Adjuntar archivos'}
                          </span>
                          <input
                            id="archivos-proyecto"            // Id único del campo de archivos para accesibilidad/autofill.
                            name="archivosProyecto"           // Name único del campo de archivos (recomendado por Lighthouse).
                            type="file"                       // Tipo de input: selector de archivos.
                            multiple                          // Permite seleccionar varios archivos a la vez.
                            className="hidden"                // Input oculto, se usa el label como disparador visual.
                            onChange={handleUploadFiles}      // Handler de subida de archivos.
                            disabled={uploadingFiles}         // Deshabilitado mientras se suben archivos.
                          />
                        </label>
                        <p className="text-xs text-pcm-muted">
                          Puedes adjuntar planos, informes, fotos de obra, etc.
                          El tamaño máximo depende de la configuración del servidor.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bloque: Comentarios */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-xl font-bold text-pcm-primary mb-4">
                      Comentarios
                    </h4>

                    {/* Lista de comentarios si existen */}
                    {comments && comments.length > 0 ? (
                      <div className="space-y-4 max-h-64 pcm-scroll-y pr-2">
                        {comments.map((c, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-pcm-bg/80 border border-white/10"
                          >
                            <p className="text-sm font-semibold text-pcm-primary">
                              {c.usuario?.firstName} {c.usuario?.lastName || ''}
                            </p>
                            <p className="text-xs text-pcm-muted">
                              {formatDateTime(c.fecha)}
                            </p>
                            <p className="mt-1 text-pcm-text text-sm">
                              {c.contenido}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-pcm-muted text-sm">
                        Aún no hay comentarios para este proyecto.
                      </p>
                    )}

                    {/* Formulario para agregar comentario (solo admin / líder) */}
                    {(() => {
                      try {
                        const currentUser = JSON.parse(      // Lee usuario actual desde localStorage.
                          localStorage.getItem('user') || '{}'
                        );
                        if (
                          currentUser &&
                          (currentUser.role === 'admin' ||
                            currentUser.role === 'lider de obra')
                        ) {
                          return (
                            <div className="mt-4 space-y-2">
                              <textarea
                                id="comentario-proyecto"    // Id único del textarea para accesibilidad/autofill.
                                name="comentarioProyecto"   // Name único del textarea (soluciona advertencia Lighthouse).
                                value={newComment}          // Valor controlado del textarea.
                                onChange={(e) => setNewComment(e.target.value)} // Actualiza el estado al escribir.
                                className="w-full bg-pcm-bg/80 border border-white/10 rounded-lg p-2 text-sm text-pcm-text placeholder-pcm-muted focus:outline-none"
                                placeholder="Agregar un comentario..." // Placeholder descriptivo.
                              />
                              <button
                                onClick={handleAddComment}  // Handler para guardar el comentario.
                                disabled={savingComment || !newComment.trim()} // Deshabilita si está guardando o si no hay texto.
                                className="px-4 py-2 bg-pcm-primary hover:bg-pcm-secondary text-white rounded-lg text-sm disabled:opacity-50"
                              >
                                {savingComment
                                  ? 'Guardando...'
                                  : 'Agregar Comentario'}
                              </button>
                            </div>
                          );
                        }
                      } catch (e) {
                        // Si falla la lectura del usuario, no se muestra el formulario.
                      }
                      return null;                          // Si el usuario no tiene permisos, no se muestra nada.
                    })()}
                  </div>

                  {/* Bloque: Asignación de Líder de Obra */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-xl font-bold text-pcm-primary mb-4 flex items-center gap-2">
                      <Users size={22} />                   {/* Ícono de usuarios. */}
                      Líder de Obra
                    </h4>

                    {/* Texto de líder actual o mensaje de no asignado */}
                    {(() => {
                      if (selectedLeaderId) {               // Si hay líder asignado...
                        const currentLeader =
                          leaders.find((l) => l._id === selectedLeaderId) ||
                          selectedProject.lider ||
                          {};
                        return (
                          <p className="text-pcm-text text-base mb-2">
                            Actual: {currentLeader?.firstName}{' '}
                            {currentLeader?.lastName}
                          </p>
                        );
                      }
                      return (
                        <p className="text-pcm-muted text-base mb-2">
                          No hay líder asignado
                        </p>
                      );
                    })()}

                    {/* Controles de líder (solo admin) */}
                    {(() => {
                      try {
                        const currentUser = JSON.parse(      // Lee usuario actual.
                          localStorage.getItem('user') || '{}'
                        );
                        if (currentUser && currentUser.role === 'admin') {
                          return (
                            <div className="space-y-2">
                              {/* Dropdown personalizado de líderes */}
                              <div className="relative w-full">
                                  <button
                                  type="button"
                                  // Si ya hay un líder asignado, el menú no se abre
                                  onClick={() => {
                                    if (selectedProject?.lider) return;
                                    setIsLeaderMenuOpen((prev) => !prev);
                                  }}
                                  disabled={Boolean(selectedProject?.lider)}
                                  className={`w-full px-3 py-2 rounded-lg bg-pcm-bg/80 border border-white/10 text-sm text-pcm-text flex items-center justify-between transition duration-200 ${
                                    selectedProject?.lider
                                      ? 'opacity-60 cursor-not-allowed'
                                      : 'hover:border-pcm-primary/70'
                                  }`}
                                >
                                  <span className="truncate">
                                    {currentLeaderLabel}
                                  </span>
                                  <ChevronDown
                                    size={16}
                                    className={`text-pcm-muted transition-transform ${
                                      isLeaderMenuOpen ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                {/* Menú flotante con la lista de líderes */}
                                {isLeaderMenuOpen && (
                                  <div className="absolute mt-1 w-full rounded-lg bg-pcm-bg/95 border border-white/10 shadow-pcm-soft z-30 overflow-hidden">
                                    {leaders.length === 0 ? (
                                      <div className="px-3 py-2 text-xs text-pcm-muted bg-pcm-bg">
                                        No hay líderes disponibles.
                                      </div>
                                    ) : (
                                      leaders.map((leader) => (
                                        <button
                                          key={leader._id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedLeaderId(leader._id);
                                            setIsLeaderMenuOpen(false);
                                          }}
                                          className={`w-full px-3 py-2 text-left text-sm ${
                                            selectedLeaderId === leader._id
                                              ? 'bg-pcm-primary/15 text-pcm-primary'
                                              : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                          }`}
                                        >
                                          {leader.firstName} {leader.lastName}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Botones de asignar y remover líder */}
                              <div className="flex gap-2">
                                {/* Botón para asignar líder: deshabilitado si ya hay líder asignado */}
                                <button
                                  onClick={handleAssignLeader}
                                  disabled={!selectedLeaderId || assigningLeader || Boolean(selectedProject?.lider)}
                                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                  {assigningLeader
                                    ? 'Asignando...'
                                    : 'Asignar Líder'}
                                </button>
                                {/* Botón para remover líder: visible sólo si actualmente hay líder asignado */}
                                {selectedProject?.lider && (
                                  <button
                                    onClick={handleRemoveLeader}
                                    disabled={assigningLeader}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
                                  >
                                    {assigningLeader
                                      ? 'Removiendo...'
                                      : 'Remover Líder'}
                                  </button>
                                )}
                              </div>

                              {/* Texto de carga mientras se obtienen líderes */}
                              {loadingLeaders && (
                                <p className="text-xs text-pcm-muted mt-1">
                                  Cargando líderes disponibles...
                                </p>
                              )}
                              {/* Aviso cuando hay un líder asignado y se requiere remover para reasignar */}
                              {selectedProject?.lider && (
                                <p className="text-xs text-pcm-muted mt-1">
                                  Para asignar un nuevo líder, primero remueve el líder actual.
                                </p>
                              )}
                            </div>
                          );
                        }
                      } catch (e) {
                        // Si falla la lectura del usuario, no muestra controles de líder.
                      }
                      return null;
                    })()}
                  </div>

                  {/* Bloque: Presupuesto y Costos */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-xl font-bold text-pcm-primary mb-6 flex items-center gap-2">
                      <DollarSign size={22} />               {/* Ícono de dinero. */}
                      Presupuesto y Costos
                    </h4>

                    {/* Botón para abrir modal de presupuesto (solo admin / líder) */}
                    {(() => {
                      try {
                        const user = JSON.parse(             // Lee usuario actual.
                          localStorage.getItem('user') || '{}'
                        );
                        if (
                          user &&
                          (user.role === 'admin' || user.role === 'lider de obra')
                        ) {
                          return (
                            <button
                              onClick={() => setShowBudgetModal(true)}
                              className="mb-4 inline-flex items-center gap-2 bg-pcm-primary hover:bg-pcm-secondary text-white px-3 py-2 rounded-lg text-xs font-semibold"
                            >
                              Editar presupuesto
                            </button>
                          );
                        }
                      } catch (e) {
                        // Si falla lectura, no se muestra el botón.
                      }
                      return null;
                    })()}

                    {/* Contenido de presupuesto/costos */}
                    {loadingBudget || loadingCost ? (
                      <p className="text-pcm-muted">Cargando datos...</p>
                    ) : (
                      <>
                        {budgetData ? (
                          <>
                            {/* Resumen de presupuesto, costo ejecutado y diferencia */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              {/* Presupuesto total */}
                              <div className="rounded-xl p-4 border border-pcm-primary/40 bg-pcm-primary/10">
                                <p className="text-pcm-primary text-xs font-semibold uppercase tracking-wide mb-1">
                                  Presupuesto Total
                                </p>
                                <p className="text-pcm-text text-2xl md:text-3xl font-bold break-words">
                                  $
                                  {budgetData.presupuesto.totalPresupuesto.toLocaleString(
                                    'es-CO',
                                    { minimumFractionDigits: 2 }
                                  )}
                                </p>
                              </div>

                              {/* Costo ejecutado */}
                              <div className="rounded-xl p-4 border border-rose-500/30 bg-rose-500/10">
                                <p className="text-rose-300 text-xs font-semibold uppercase tracking-wide mb-1">
                                  Costo Ejecutado
                                </p>
                                <p className="text-white text-2xl md:text-3xl font-bold break-words">
                                  $
                                  {costData?.costoConsumido?.toLocaleString(
                                    'es-CO',
                                    { minimumFractionDigits: 2 }
                                  ) || 0}
                                </p>
                              </div>

                              {/* Diferencia presupuesto - costo */}
                              <div className="rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/10">
                                <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-1">
                                  Diferencia
                                </p>
                                <p
                                  className={`text-white text-2xl md:text-3xl font-bold break-words ${
                                    costData && costData.diferencia < 0
                                      ? 'text-red-500'
                                      : ''
                                  }`}
                                >
                                  $
                                  {costData?.diferencia?.toLocaleString('es-CO', {
                                    minimumFractionDigits: 2,
                                  }) || 0}
                                </p>
                              </div>
                            </div>

                            {/* Barra de porcentaje ejecutado */}
                            {costData && costData.presupuestoTotal !== null && (
                              <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-pcm-muted text-xs font-medium">
                                    % Ejecutado
                                  </p>
                                  <p className="text-pcm-text text-sm font-bold">
                                    {costData?.porcentajeEjecutado
                                      ? costData.porcentajeEjecutado
                                      : '0'}
                                    %
                                  </p>
                                </div>
                                <div className="bg-pcm-bg/70 rounded-full h-3">
                                  <div
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                      costData.porcentajeEjecutado >= 100
                                        ? 'bg-red-500'
                                        : costData.porcentajeEjecutado >= 80
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        costData.porcentajeEjecutado || 0
                                      )}%`,                 // Ajusta el ancho según el porcentaje ejecutado.
                                    }}
                                  ></div>
                                </div>
                                {costData.alertaPresupuesto && (
                                  <p className="text-red-400 text-sm mt-2 font-semibold flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    El costo ejecutado ha alcanzado el umbral de
                                    alerta.
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Detalle por línea de presupuesto */}
                            {budgetData.presupuesto.items &&
                              budgetData.presupuesto.items.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-pcm-text text-sm">
                                    <thead className="border-b border-white/10 text-pcm-muted uppercase tracking-wider text-xs">
                                      <tr>
                                        <th className="py-2 pr-4">Material</th>
                                        <th className="py-2 pr-4">Cantidad</th>
                                        <th className="py-2 pr-4">
                                          Costo unitario
                                        </th>
                                        <th className="py-2 pr-4">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {budgetData.presupuesto.items.map(
                                        (itm, idx) => {
                                          const subtotal =
                                            itm.cantidadPrevista *
                                            itm.costoPrevisto; // Subtotal = cantidad * costo.

                                          return (
                                            <tr
                                              key={idx}
                                              className="border-b border-white/5 hover:bg-pcm-bg/60"
                                            >
                                              <td className="py-2 pr-4">
                                                {itm.material?.nombre ||
                                                  'Material'}
                                              </td>
                                              <td className="py-2 pr-4">
                                                {itm.cantidadPrevista}
                                              </td>
                                              <td className="py-2 pr-4">
                                                $
                                                {itm.costoPrevisto.toLocaleString(
                                                  'es-CO',
                                                  { minimumFractionDigits: 2 }
                                                )}
                                              </td>
                                              <td className="py-2 pr-4">
                                                $
                                                {subtotal.toLocaleString(
                                                  'es-CO',
                                                  {
                                                    minimumFractionDigits: 2,
                                                  }
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        }
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                          </>
                        ) : (
                          <p className="text-pcm-muted">
                            No hay presupuesto definido para este proyecto.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Modal de presupuesto (ModalPresupuestoProyecto) controlado por showBudgetModal */}
                {selectedProject && (
                  <ModalPresupuestoProyecto
                    projectId={selectedProject._id}         // ID del proyecto asociado al presupuesto.
                    isOpen={showBudgetModal}               // Controla la visibilidad del modal de presupuesto.
                    onClose={() => setShowBudgetModal(false)} // Cierra el modal de presupuesto.
                    onSaved={handleBudgetSaved}            // Callback cuando se guarda el presupuesto.
                  />
                )}

                {/* Columna lateral (1/3) */}
                <div className="space-y-6">
                  {/* Bloque: Estado y prioridad del proyecto */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-lg font-bold text-pcm-primary mb-5">
                      Estado
                    </h4>
                    <div className="space-y-4">
                      {/* Prioridad */}
                      <div>
                        <p className="text-pcm-muted text-xs uppercase tracking-wider mb-2">
                          Prioridad
                        </p>
                        <span
                          className={`inline-block px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide w-full text-center ${
                            selectedProject.priority === 'alta'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : selectedProject.priority === 'media'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              : 'bg-green-500/20 text-green-400 border border-green-500/40'
                          }`}
                        >
                          {selectedProject.priority || 'sin definir'}
                        </span>
                      </div>

                      {/* Estado actual */}
                      <div>
                        <p className="text-pcm-muted text-xs uppercase tracking-wider mb-2">
                          Estado Actual
                        </p>
                        <span
                          className={`inline-block px-4 py-2 rounded-lg text-sm font-bold capitalize w-full text-center ${
                            selectedProject.status === 'completed'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : selectedProject.status === 'in-progress'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : selectedProject.status === 'on-hold'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
                          }`}
                        >
                          {selectedProject.status
                            ? selectedProject.status.replace('-', ' ')
                            : 'sin estado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque: Progreso del proyecto */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                      <TrendingUp size={20} />
                      Progreso
                    </h4>

                    <div className="text-center mb-4">
                      <div className="text-5xl font-bold text-pcm-text mb-2">
                        {selectedProject.progress ?? 0}%      {/* Porcentaje numérico. */}
                      </div>
                      <p className="text-pcm-muted text-sm">Completado</p>
                    </div>

                    <div className="bg-pcm-bg/70 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-pcm-primary transition-all duration-1000 shadow-pcm-soft"
                        style={{ width: `${selectedProject.progress ?? 0}%` }} // Barra visual de progreso.
                      ></div>
                    </div>
                  </div>

                  {/* Bloque: Resumen lateral de presupuesto */}
                  <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                    <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                      <DollarSign size={20} />
                      Presupuesto
                    </h4>

                    <div className="space-y-5">
                      {/* Presupuesto total del proyecto */}
                      <div>
                        <p className="text-pcm-muted text-xs uppercase tracking-wider mb-2">
                          Presupuesto Total
                        </p>
                        <p className="text-pcm-text font-bold text-3xl">
                          $
                          {selectedProject.budget
                            ? selectedProject.budget.toLocaleString('es-CO')
                            : 0}
                        </p>
                      </div>

                      {/* Costo estimado de materiales según asignación o presupuesto */}
                      <div>
                        <p className="text-pcm-muted text-xs uppercase tracking-wider mb-2">
                          Costo Materiales
                        </p>
                        <p className="text-green-400 font-bold text-2xl">
                          $
                          {costoMaterialesMostrar.toLocaleString('es-CO', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      {/* Uso del presupuesto (barra + valor disponible) */}
                      <div>
                        <p className="text-pcm-muted text-xs uppercase tracking-wider mb-2">
                          Uso del Presupuesto
                        </p>
                        <div className="bg-pcm-bg/70 rounded-full h-3 mb-2">
                          <div
                            className="h-3 rounded-full bg-green-500 transition-all duration-1000"
                            style={{
                              width: `${porcentajePresupuestoUsado}%`, // Ancho proporcional al uso estimado del presupuesto.
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-pcm-muted text-xs">Disponible</p>
                          <p className="text-pcm-text font-bold text-sm">
                            $
                            {(
                              (selectedProject.budget || 0) - // Presupuesto total menos costo estimado de materiales.
                              estadisticas.costoTotal
                            ).toLocaleString('es-CO', {
                              minimumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloque: Equipo del proyecto */}
                  {teamList && teamList.length > 0 && (
                    <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft">
                      <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                        <Users size={20} />
                        Equipo
                      </h4>

                      <div className="flex flex-col gap-3">
                        {teamList.map((member, index) => {
                          if (typeof member === 'string') { // Caso legado donde el miembro es un string simple.
                            return (
                              <span
                                key={index}
                                className="bg-pcm-primary/20 border border-pcm-primary/30 text-pcm-primary px-4 py-2 rounded-lg text-sm font-medium"
                              >
                                {member}
                              </span>
                            );
                          }

                          const firstName =
                            member.firstName ||
                            member.nombre ||
                            member.name ||
                            '';
                          const lastName =
                            member.lastName || member.apellido || '';
                          const fullName =
                            `${firstName} ${lastName}`.trim() ||
                            member.alias ||
                            'Miembro del equipo';

                          const documentType =
                            member.documentType || member.tipoDocumento || '';
                          const documentNumber =
                            member.documentNumber ||
                            member.numeroDocumento ||
                            '';

                          const cargo =
                            member.cargo ||
                            member.position ||
                            member.rol ||
                            '';

                          return (
                            <div
                              key={member._id || index}
                              className="bg-pcm-bg/80 border border-pcm-primary/30 rounded-xl p-4 flex flex-col gap-1"
                            >
                              <p className="text-pcm-text text-sm font-semibold">
                                {fullName}
                              </p>

                              {cargo && (
                                <p className="text-xs text-pcm-primary">
                                  Cargo: {cargo}
                                </p>
                              )}

                              {(documentType || documentNumber) && (
                                <p className="text-xs text-pcm-muted">
                                  Documento: {documentType} {documentNumber}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Devuelve el modal como portal hacia #modal-root para evitar que se “vaya al fondo” del scroll.
  const modalRoot = document.getElementById('modal-root') || document.body; // Nodo destino del portal.

  return createPortal(modalContent, modalRoot);            // Renderiza el contenido del modal en el contenedor global.
};

// Exportación del componente
export default ModalDetalleProyecto;                       // Exporta el modal de detalle de proyecto para uso en otras vistas.
