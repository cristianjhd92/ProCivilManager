// File: frontend/src/modules/projects/modals/ModalEditarProyecto.jsx
// Description: Modal interno del workspace para crear o editar proyectos desde el
//              panel de administración. Permite gestionar datos básicos, fechas,
//              presupuesto, estado, progreso, equipo (con tipo y número de documento)
//              y archivos adjuntos, usando el tema visual PCM y colores dinámicos
//              por rol (.pcm-panel, .pcm-panel--ROL, .pcm-panel-fondo, etc.).
//              Se integra con los servicios createProject/updateProject del backend.

// =======================================================================
// Importaciones principales de React
// =======================================================================

import React, {
  useState,                                                              // Hook para manejar estados locales dentro del modal.
  useEffect                                                              // Hook para manejar efectos (por ejemplo, cierre con tecla ESC).
} from 'react';

// =======================================================================
// Importación de íconos desde lucide-react para enriquecer la interfaz
// =======================================================================

import {
  X,                                                                    // Ícono de cerrar (equis) para el botón de cierre del modal.
  Building2,                                                             // Ícono de edificio para encabezados relacionados con proyecto.
  Save,                                                                  // Ícono de disquete para el botón principal de guardar.
  Calendar,                                                              // Ícono de calendario para la sección de fechas.
  DollarSign,                                                            // Ícono de dólar para la sección de presupuesto.
  MapPin,                                                                // Ícono de ubicación geográfica del proyecto.
  Briefcase,                                                             // Ícono de portafolio para el tipo de proyecto.
  TrendingUp,                                                            // Ícono de tendencia para el progreso.
  Mail,                                                                  // Ícono de sobre para el correo del cliente.
  Clock,                                                                 // Ícono de reloj para la duración del proyecto.
  Flag,                                                                  // Ícono de bandera para la prioridad.
  Paperclip,                                                             // Ícono de clip para los archivos adjuntos.
  Users,                                                                 // Ícono de usuarios para el equipo de trabajo.
  IdCard,                                                                // Ícono de documento de identidad para el tipo de documento.
  Trash2,                                                                // Ícono de papelera para eliminar integrantes del equipo.
  PlusCircle                                                             // Ícono de círculo con más para agregar integrantes.
} from 'lucide-react';                                                   // Se importan todos los íconos desde el paquete lucide-react.

// =======================================================================
// Importación de servicios de API del backend de ProCivil Manager
// =======================================================================

import {
  updateProject,                                                         // Función que actualiza un proyecto existente en el backend.
  createProject,                                                         // Función que crea un nuevo proyecto en el backend.
  uploadProjectFiles,                                                    // Función que sube archivos asociados a un proyecto en el backend.
  obtenerMateriales,                                                     // Carga los materiales disponibles desde el backend.
} from '../../../services/api/api.js';                                   // Importa los servicios desde la capa centralizada de API PCM.

// Componentes personalizados para criterios de avance y materiales.
import SelectorCriteriosProyecto from '../components/SelectorCriteriosProyecto.jsx';
import SelectorMaterialesProyecto from '../components/selectorMaterialesProyecto.jsx';

// =======================================================================
// Función utilitaria para normalizar el arreglo "team" del proyecto
// =======================================================================

/**
 * normalizarEquipo
 * Garantiza que el arreglo "team" tenga siempre objetos con la forma:
 * {
 *   nombre,
 *   apellido,
 *   cargo,
 *   tipoDocumento,
 *   numeroDocumento
 * }
 * Así, aunque lleguen strings u objetos con otras claves desde versiones
 * antiguas, el backend siempre recibe una estructura consistente.
 */
const normalizarEquipo = (equipo) => {                                   // Declara la función que recibe el arreglo de equipo.
  if (!Array.isArray(equipo)) return [];                                 // Si no es arreglo, retorna un arreglo vacío para evitar errores.

  return equipo                                                          // Opera sobre el arreglo original recibido.
    .map((integrante) => {                                               // Recorre cada elemento del arreglo de equipo.
      if (!integrante) return null;                                      // Si el elemento es nulo/undefined, devuelve null (se filtrará luego).

      // Caso 1: versión antigua donde el integrante es un string simple.
      if (typeof integrante === 'string') {                              // Verifica si el integrante es un string plano.
        return {                                                         // Devuelve un objeto normalizado a partir del string.
          nombre: integrante,                                            // Usa el string como nombre.
          apellido: '',                                                  // Deja el apellido vacío.
          cargo: integrante,                                             // Usa el mismo string como cargo por compatibilidad histórica.
          tipoDocumento: '',                                             // Tipo de documento vacío (sin información).
          numeroDocumento: ''                                            // Número de documento vacío.
        };
      }

      // Caso 2: el integrante ya viene como objeto (nuevo formato o backend).
      return {                                                           // Construye un objeto con todas las claves esperadas.
        nombre: integrante.nombre || integrante.firstName || '',         // Usa nombre o firstName si existen, o cadena vacía.
        apellido: integrante.apellido || integrante.lastName || '',      // Usa apellido o lastName si existen, o cadena vacía.
        cargo: integrante.cargo || integrante.role || '',                // Usa cargo o role si existen (por compatibilidad).
        tipoDocumento: integrante.tipoDocumento || '',                   // Toma el tipoDocumento si viene definido.
        numeroDocumento:                                                 // Número de documento del integrante.
          integrante.numeroDocumento ||                                  // Usa numeroDocumento si existe.
          integrante.document ||                                         // O document si viene con ese alias.
          ''                                                             // Si no hay dato, se deja vacío.
      };
    })
    .filter(Boolean);                                                    // Elimina elementos nulos generados en el mapeo.
};

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
 */
const obtenerClasesRolPanel = (rol) => {                                 // Función que mapea el rol a clases de panel PCM.
  switch (rol) {                                                         // Revisa el valor de rol recibido.
    case 'admin':                                                        // Si el rol es admin...
      return 'pcm-panel pcm-panel--admin';                               // Devuelve clases de panel para admin.
    case 'lider de obra':                                                // Si el rol es líder de obra...
      return 'pcm-panel pcm-panel--lider';                               // Devuelve clases de panel para líder.
    case 'cliente':                                                      // Si el rol es cliente...
      return 'pcm-panel pcm-panel--cliente';                             // Devuelve clases de panel para cliente.
    case 'auditor':                                                      // Si el rol es auditor...
      return 'pcm-panel pcm-panel--auditor';                             // Devuelve clases de panel para auditor.
    default:                                                             // Para cualquier otro caso o rol desconocido...
      return 'pcm-panel';                                                // Devuelve solo la clase base de panel.
  }
};

/**
 * obtenerClasesFondoIconoRol
 * Devuelve una clase de fondo de color para el ícono principal del
 * modal según el rol:
 *  - admin         → azul
 *  - lider de obra → naranja
 *  - cliente       → verde
 *  - auditor       → morado
 *  - default       → color primario PCM
 */
const obtenerClasesFondoIconoRol = (rol) => {                            // Función que mapea el rol a un color de fondo de ícono.
  switch (rol) {                                                         // Evalúa el rol actual.
    case 'admin':                                                        // Rol admin.
      return 'bg-blue-600';                                              // Azul para admin.
    case 'lider de obra':                                                // Rol líder de obra.
      return 'bg-orange-500';                                            // Naranja para líder.
    case 'cliente':                                                      // Rol cliente.
      return 'bg-emerald-500';                                           // Verde para cliente.
    case 'auditor':                                                      // Rol auditor.
      return 'bg-purple-600';                                            // Morado para auditor.
    default:                                                             // Otros roles o sin rol definido.
      return 'bg-pcm-primary';                                           // Usa el color primario PCM por defecto.
  }
};

// =======================================================================
// Componente principal del modal para crear/editar proyectos
// =======================================================================

/**
 * ModalEditarProyecto
 * Componente de modal que sirve tanto para crear como para editar
 * proyectos. La diferencia entre crear y editar la define la prop
 * projectToEdit que viene del padre:
 *  - 'new' → modo creación de proyecto.
 *  - otro  → modo edición de proyecto existente.
 *
 * Las props que recibe (en inglés) se renombran internamente a
 * variables en español para respetar la regla de nombres en español
 * sin romper la API del componente que ya usan otros módulos.
 */
const ModalEditarProyecto = ({                                           // Declara el componente funcional ModalEditarProyecto.
  projectToEdit: proyectoAEditar,                                        // Alias en español para la prop projectToEdit.
  editProjectForm: formularioProyecto,                                   // Alias en español para el objeto de formulario editProjectForm.
  setEditProjectForm: setFormularioProyecto,                             // Alias en español para el setter setEditProjectForm.
  onClose: alCerrar,                                                     // Alias en español para la función de cierre onClose.
  onSave: alGuardar                                                      // Alias en español para la función de guardado onSave.
}) => {
  // Si no hay proyecto a editar/crear, el modal no se muestra.
  if (!proyectoAEditar) return null;                                     // Retorna null para no renderizar nada si no hay proyecto.

  // Estado local para almacenar la lista de archivos seleccionados desde el input file.
  const [archivosParaSubir, setArchivosParaSubir] = useState([]);        // Inicializa el arreglo de archivos en vacío.

  // Estado local para indicar si se está guardando información (crear/actualizar y subir archivos).
  const [guardando, setGuardando] = useState(false);                     // Bandera booleana para deshabilitar botones durante operaciones.

  // Estado local para mensajes de error que se mostrarán dentro del modal.
  const [mensajeError, setMensajeError] = useState(null);                // Guarda un texto de error amigable para el usuario.

  // =====================================================
  // Estados para criterios de avance y materiales
  // =====================================================
  // Lista de criterios de avance del proyecto. Se inicializa desde
  // formularioProyecto.criteriosAvance cuando se carga el modal.
  const [criteriosAvance, setCriteriosAvance] = useState([]);

  // Materiales disponibles obtenidos desde el backend cuando se abre el modal.
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);

  // Materiales seleccionados / asignados al proyecto en formato { material, cantidadAsignada }.
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState([]);

  // ---------------------------------------------------------------------
  // Efecto: cargar criterios, materiales y progreso inicial al abrir modal
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!proyectoAEditar) return;
    // Inicializar lista de criterios de avance desde el proyecto a editar si existe
    if (formularioProyecto && Array.isArray(formularioProyecto.criteriosAvance)) {
      setCriteriosAvance(formularioProyecto.criteriosAvance);
      // También actualiza el progreso según los criterios cumplidos
      const progresoInicial = formularioProyecto.criteriosAvance
        .filter((c) => c.cumplido)
        .reduce((sum, c) => sum + (Number(c.porcentaje) || 0), 0);
      setFormularioProyecto((prev) => {
        if (!prev) return prev;
        return { ...prev, progress: progresoInicial };
      });
    } else {
      setCriteriosAvance([]);
    }

    // Inicializar materiales seleccionados desde el proyecto a editar si existe
    if (formularioProyecto && Array.isArray(formularioProyecto.materiales)) {
      setMaterialesSeleccionados(
        formularioProyecto.materiales.map((item) => ({
          material: item.material,
          cantidadAsignada: item.cantidadAsignada
        }))
      );
    } else {
      setMaterialesSeleccionados([]);
    }

    // Cargar todos los materiales disponibles desde el backend
    obtenerMateriales()
      .then((data) => {
        if (Array.isArray(data)) setMaterialesDisponibles(data);
      })
      .catch(() => {
        // En caso de error, deja la lista vacía para evitar bloquear la UI
        setMaterialesDisponibles([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoAEditar]);

  // ---------------------------------------------------------------------
  // Manejadores para criterios de avance y materiales
  // ---------------------------------------------------------------------
  const manejarCambioCriterios = (nuevosCriterios, nuevoProgreso) => {
    setCriteriosAvance(nuevosCriterios);
    // Actualiza el progreso del formulario con el valor calculado
    setFormularioProyecto((prev) => ({
      ...prev,
      progress: nuevoProgreso
    }));
  };

  const manejarCambioMateriales = (nuevosMateriales) => {
    setMaterialesSeleccionados(nuevosMateriales);
  };

  // Determina si el modal está en modo de nuevo proyecto usando el valor de projectToEdit original.
  const esProyectoNuevo = proyectoAEditar === 'new';                     // true si se está creando un proyecto nuevo.

  // ---------------------------------------------------------------------
  // Detección del rol del usuario actual para aplicar colores por rol
  // ---------------------------------------------------------------------

  let rolUsuarioActual = 'admin';                                        // Define un rol por defecto (admin) por seguridad visual.

  try {                                                                  // Intenta leer la información del usuario desde localStorage.
    const usuarioLocal = JSON.parse(localStorage.getItem('user') || '{}'); // Parsea el objeto user almacenado en localStorage (si existe).
    if (usuarioLocal && typeof usuarioLocal.role === 'string') {        // Verifica que exista y tenga campo role como string.
      rolUsuarioActual = usuarioLocal.role;                              // Asigna el rol encontrado (admin, lider de obra, cliente, auditor, etc.).
    }
  } catch (error) {                                                      // Si hay error al leer o parsear localStorage...
    rolUsuarioActual = 'admin';                                          // Mantiene admin como rol por defecto para no romper el diseño.
  }

  const clasesPanelRol = obtenerClasesRolPanel(rolUsuarioActual);       // Calcula las clases de panel PCM según el rol actual.
  const claseFondoIconoRol = obtenerClasesFondoIconoRol(rolUsuarioActual); // Calcula la clase de fondo del ícono principal según el rol.

  // Determina si el usuario actual es líder de obra. Esto se usa para
  // deshabilitar campos que no deben ser editables por líderes según
  // los requisitos: no pueden modificar información básica, fechas
  // iniciales, presupuesto ni descripción del proyecto. Cuando es
  // líder, muchos inputs serán solo lectura.
  const esLider = rolUsuarioActual === 'lider de obra';

  // ---------------------------------------------------------------------
  // Efecto: cierre del modal con tecla ESC
  // ---------------------------------------------------------------------

  useEffect(() => {                                                      // Efecto que agrega un listener de teclado mientras el modal está abierto.
    if (!proyectoAEditar) return;                                        // Si no hay proyecto, no hace nada.

    const manejarKeyDown = (evento) => {                                 // Función que procesa la pulsación de teclas.
      if (
        evento.key === 'Escape' &&                                       // Si se presiona la tecla ESC...
        typeof alCerrar === 'function' &&                                // Y hay una función de cierre válida...
        !guardando                                                       // Y no se está guardando información...
      ) {
        alCerrar();                                                      // Cierra el modal.
      }
    };

    window.addEventListener('keydown', manejarKeyDown);                  // Agrega el listener al objeto window.

    return () => {
      window.removeEventListener('keydown', manejarKeyDown);             // Limpia el listener al desmontar o cambiar dependencias.
    };
  }, [proyectoAEditar, alCerrar, guardando]);                            // El efecto depende del proyecto, la función de cierre y la bandera guardando.

  // ---------------------------------------------------------------------
  // Efecto: recalcula automáticamente la duración en días cuando cambian
  // las fechas de inicio o fin en el formulario de proyecto. Este efecto
  // se ejecuta cada vez que startDate o endDate cambian y actualiza el
  // campo duration con el número de días entre ambas fechas. Si alguna de
  // las fechas no está definida o la fecha fin es anterior a la inicial,
  // se limpia la duración. Al usar la función setFormularioProyecto se
  // garantiza que no se modifiquen otras propiedades del formulario.
  useEffect(() => {
    // Solo recalcular si existe un formulario y tiene fechas.
    if (!formularioProyecto) return;
    const { startDate, endDate } = formularioProyecto;
    if (startDate && endDate) {
      const inicio = new Date(startDate);
      const fin = new Date(endDate);
      const msPorDia = 1000 * 60 * 60 * 24;
      const diff = fin - inicio;
      const dias = diff >= 0 ? Math.ceil(diff / msPorDia) : 0;
      const nuevaDuracion = dias.toString();
      setFormularioProyecto((previo) => {
        if (!previo) return previo;
        if (previo.duration === nuevaDuracion) return previo;
        return { ...previo, duration: nuevaDuracion };
      });
    } else {
      // Si no hay fechas válidas, limpia la duración si corresponde.
      setFormularioProyecto((previo) => {
        if (!previo) return previo;
        if (previo.duration === '') return previo;
        return { ...previo, duration: '' };
      });
    }
  }, [formularioProyecto?.startDate, formularioProyecto?.endDate]);

  // =====================================================================
  // Handlers para manejar cambios en el equipo de trabajo del proyecto
  // =====================================================================

  /**
   * manejarCambioIntegranteEquipo
   * Actualiza un campo específico de un integrante del equipo en
   * formularioProyecto.team, usando un índice y el nombre del campo.
   */
  const manejarCambioIntegranteEquipo = (indice, campo, valor) => {      // Función para actualizar un integrante específico.
    setFormularioProyecto((previo) => {                                  // Usa el estado previo del formulario para construir el nuevo.
      const equipoActual = Array.isArray(previo.team)                    // Verifica si previo.team es un arreglo.
        ? [...previo.team]                                               // Si lo es, crea una copia superficial.
        : [];                                                            // Si no, inicializa con arreglo vacío.

      const existente = equipoActual[indice] ?? {};                      // Obtiene el integrante en la posición indicada o un objeto vacío.

      const base = typeof existente === 'string'                         // Si el integrante actual es un string, hay que normalizarlo.
        ? {
            nombre: existente,                                           // Usa el string como nombre.
            apellido: '',                                                // Deja el apellido vacío.
            cargo: '',                                                   // Deja el cargo vacío (se puede editar).
            tipoDocumento: '',                                           // Tipo de documento vacío.
            numeroDocumento: ''                                          // Número de documento vacío.
          }
        : (existente || {});                                             // Si ya es objeto, lo usa como base.

      const actualizado = { ...base, [campo]: valor };                   // Crea un nuevo objeto mezclando base con el campo actualizado.

      equipoActual[indice] = actualizado;                                // Reemplaza el integrante en la posición indicada.

      return { ...previo, team: equipoActual };                          // Retorna el formulario con el equipo actualizado.
    });
  };

  /**
   * manejarAgregarIntegrante
   * Agrega un nuevo integrante vacío al arreglo de equipo.
   */
  const manejarAgregarIntegrante = () => {                               // Define la función que agrega un nuevo integrante.
    setFormularioProyecto((previo) => {                                  // Actualiza el formulario a partir del estado previo.
      const equipoActual = Array.isArray(previo.team)                    // Verifica si previo.team es un arreglo.
        ? [...previo.team]                                               // Si lo es, hace una copia.
        : [];                                                            // Si no, arranca desde un arreglo vacío.

      equipoActual.push({                                                // Agrega un nuevo objeto integrante vacío.
        nombre: '',                                                      // Nombre vacío.
        apellido: '',                                                    // Apellido vacío.
        cargo: '',                                                       // Cargo vacío.
        tipoDocumento: '',                                               // Tipo de documento vacío.
        numeroDocumento: ''                                              // Número de documento vacío.
      });

      return { ...previo, team: equipoActual };                          // Retorna el formulario con el equipo ampliado.
    });
  };

  /**
   * manejarEliminarIntegrante
   * Elimina un integrante del equipo usando su índice.
   */
  const manejarEliminarIntegrante = (indice) => {                        // Función para eliminar un integrante por índice.
    setFormularioProyecto((previo) => {                                  // Actualiza el formulario con base en el estado previo.
      const equipoActual = Array.isArray(previo.team)                    // Verifica si previo.team es un arreglo.
        ? [...previo.team]                                               // Si lo es, crea una copia.
        : [];                                                            // Si no, inicia con arreglo vacío.

      if (indice < 0 || indice >= equipoActual.length) return previo;    // Si el índice está fuera de rango, retorna el estado sin cambios.

      equipoActual.splice(indice, 1);                                    // Elimina un elemento en la posición indicada.

      return { ...previo, team: equipoActual };                          // Retorna el formulario con el equipo ya sin ese integrante.
    });
  };

  // =====================================================================
  // Handler para el input de archivos adjuntos
  // =====================================================================

  /**
   * manejarCambioArchivos
   * Al cambiar el input de archivos, convierte el FileList en un arreglo
   * normal y lo guarda en el estado archivosParaSubir.
   */
  const manejarCambioArchivos = (evento) => {                            // Función que maneja el cambio del input file.
    const nuevosArchivos = Array.from(evento.target.files || []);        // Convierte FileList en arreglo estándar.
    // Acumula los archivos seleccionados previamente con los nuevos en lugar de reemplazarlos.
    setArchivosParaSubir((previos) => {
      return [...previos, ...nuevosArchivos];
    });
    // Limpia el valor del input para permitir seleccionar el mismo archivo nuevamente si es necesario.
    evento.target.value = null;
  };

  /**
   * manejarEliminarArchivoSeleccionado
   * Permite eliminar un archivo individual de la lista de archivos para subir
   * antes de enviarlos al backend. Recibe el índice del archivo en el
   * arreglo y lo remueve.
   * @param {number} indice índice del archivo a eliminar
   */
  const manejarEliminarArchivoSeleccionado = (indice) => {
    setArchivosParaSubir((previos) => {
      const copia = [...previos];
      if (indice >= 0 && indice < copia.length) {
        copia.splice(indice, 1);
      }
      return copia;
    });
  };

  // =====================================================================
  // Handler principal para el envío del formulario completo
  // =====================================================================

  /**
   * manejarEnvioFormulario
   * Gestiona el envío del formulario completo:
   *  - Valida campos mínimos.
   *  - Llama a createProject o updateProject según corresponda.
   *  - Si hay archivos seleccionados, llama a uploadProjectFiles.
   *  - Notifica al componente padre mediante alGuardar.
   */
  const manejarEnvioFormulario = async (evento) => {                     // Declara la función async que maneja el submit del formulario.
    evento.preventDefault();                                             // Evita que el formulario recargue la página por defecto.

    setGuardando(true);                                                  // Activa la bandera de guardado.
    setMensajeError(null);                                               // Limpia mensajes de error previos.

    try {
      const payload = {
        ...formularioProyecto,
        team: normalizarEquipo(formularioProyecto.team)
      };

      // Adjunta los criterios de avance al payload si existen; se remueve
      // cualquier referencia no serializable para el backend y se asegura
      // enviar solo las claves necesarias (codigo, nombre, descripcion, porcentaje, cumplido, fechaCumplimiento)
      if (Array.isArray(criteriosAvance) && criteriosAvance.length > 0) {
        payload.criteriosAvance = criteriosAvance.map((c) => ({

          codigo: c.codigo,
          nombre: c.nombre,
          descripcion: c.descripcion,
          porcentaje: c.porcentaje,
          cumplido: c.cumplido,
          fechaCumplimiento: c.fechaCumplimiento || null
        }));
      }

      // Adjunta los materiales seleccionados al payload si existen
      if (Array.isArray(materialesSeleccionados) && materialesSeleccionados.length > 0) {
        payload.materiales = materialesSeleccionados.map((m) => ({
          material: m.material,
          cantidadAsignada: m.cantidadAsignada
        }));
      }

      // Validación mínima obligatoria de título y ubicación antes de guardar.
      if (!payload.title || !payload.location) {                         // Si faltan estos campos básicos...
        setMensajeError(                                                 // Configura un mensaje de error visible al usuario.
          'Por favor diligencia al menos el título y la ubicación del proyecto antes de guardar.'
        );
        setGuardando(false);                                             // Desactiva la bandera de guardado.
        return;                                                          // Sale de la función sin llamar a la API.
      }

      let respuesta;                                                     // Variable para guardar la respuesta cruda de la API.
      let proyecto;                                                      // Variable para guardar el objeto proyecto final.

      if (esProyectoNuevo) {                                             // Verifica si el modal está en modo creación.
        respuesta = await createProject(payload);                        // Llama a createProject para crear un nuevo proyecto.
      } else {                                                           // Si no es nuevo, entonces es edición.
        respuesta = await updateProject(proyectoAEditar, payload);       // Llama a updateProject con el identificador y el payload.
      }

      proyecto = respuesta?.proyecto || respuesta;                       // Intenta obtener el objeto proyecto desde la respuesta.

      // Si hay proyecto con _id y existen archivos seleccionados, se suben los adjuntos.
      if (proyecto && proyecto._id && archivosParaSubir.length > 0) {   // Verifica condiciones para subir archivos.
        const respuestaSubida = await uploadProjectFiles(                // Llama al servicio de subida de archivos.
          proyecto._id,                                                  // Usa el _id del proyecto recién creado/actualizado.
          archivosParaSubir                                              // Pasa la lista de archivos seleccionados.
        );

        if (respuestaSubida) {                                           // Si hay alguna respuesta de la subida...
          const proyectoActualizadoDesdeSubida =                         // Intenta construir un proyecto actualizado con adjuntos.
            respuestaSubida.proyecto ||                                  // Si viene un proyecto completo, se usa directamente.
            (Array.isArray(respuestaSubida.adjuntos)                     // Si trae un arreglo de adjuntos...
              ? { ...proyecto, adjuntos: respuestaSubida.adjuntos }      // Fusiona el proyecto actual con esos adjuntos.
              : null);                                                   // Si no, deja null.

          if (proyectoActualizadoDesdeSubida) {                          // Si se pudo construir el objeto actualizado...
            proyecto = { ...proyecto, ...proyectoActualizadoDesdeSubida }; // Mezcla la información en una sola referencia de proyecto.
          }
        }
      }

      if (alGuardar) {                                                   // Si el callback alGuardar fue proporcionado por el padre...
        alGuardar(proyecto);                                             // Notifica al padre con el proyecto final (con o sin adjuntos).
      }

      setArchivosParaSubir([]);                                          // Limpia la lista de archivos seleccionados tras el guardado.
    } catch (error) {
      console.error('Error al guardar proyecto:', error);                // Registra el error en consola para depuración.

      setMensajeError(                                                   // Muestra mensaje de error genérico al usuario.
        'Ocurrió un error al guardar el proyecto. Verifica la información e inténtalo de nuevo.'
      );
    } finally {
      setGuardando(false);                                               // Apaga la bandera de guardado al final del proceso.
    }
  };

  // =====================================================================
  // Render principal del modal
  // =====================================================================

  return (                                                               // Devuelve la estructura JSX del modal.
    // Capa oscura de fondo que cubre toda la pantalla y centra el modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" // Overlay de fondo con desenfoque.
      role="dialog"                                                     // Indica a tecnologías asistivas que es un diálogo.
      aria-modal="true"                                                 // Señala que es un modal que bloquea la interacción del fondo.
      aria-labelledby="titulo-modal-editar-proyecto"                    // Asocia el título principal como encabezado del diálogo.
      onClick={(evento) => {                                            // Permite cerrar al hacer clic fuera del contenido.
        if (guardando) return;                                          // Si está guardando, no cierra para evitar errores.
        if (typeof alCerrar === 'function') {                           // Verifica que exista función de cierre.
          alCerrar();                                                   // Llama al cierre.
        }
      }}
    >
      {/* Contenedor principal del modal con fondo de panel PCM por rol, borde y sombra suave. */}
      <div
        className={`pcm-panel-fondo ${clasesPanelRol} rounded-pcm-xl border border-pcm-primary/30 shadow-pcm-soft w-full max-w-6xl max-h-[90vh] overflow-hidden animate-fade-in-soft`} // Aplica fondo de panel según rol y estilo PCM.
        onClick={(evento) => evento.stopPropagation()}                  // Evita que el clic dentro del modal cierre el overlay.
      >
        {/* Contenedor interno en columna para separar header, cuerpo y footer. */}
        <div className="flex flex-col h-full min-h-0">
          {/* Encabezado del modal con icono, título y botón de cierre. */}
          <div className="pcm-panel-header flex items-center justify-between p-6 border-b border-white/10">
            {/* Lado izquierdo del encabezado: icono + textos. */}
            <div className="flex items-center gap-4">
              {/* Ícono del edificio dentro de un recuadro cuyo color depende del rol. */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-pcm-soft ${claseFondoIconoRol}`} // Aplica fondo dinámico según rol.
              >
                <Building2 size={24} className="text-white" />          {/* Ícono de edificio en color blanco. */}
              </div>
              {/* Bloque de título y subtítulo del modal. */}
              <div>
                <h3
                  id="titulo-modal-editar-proyecto"                     // ID utilizado por aria-labelledby para accesibilidad.
                  className="text-2xl font-bold text-pcm-text"
                >
                  {esProyectoNuevo ? 'Crear proyecto' : 'Editar proyecto'} // Texto dinámico según modo del modal.
                </h3>
                <p className="text-pcm-accent/80 text-sm">
                  {esProyectoNuevo                                      // Subtítulo descriptivo según modo.
                    ? 'Registra un nuevo proyecto en el sistema.'
                    : 'Actualiza la información del proyecto.'}
                </p>
              </div>
            </div>
            {/* Botón de cierre del modal (equivalente a cancelar). */}
            <button
              type="button"                                             // Evita que actúe como submit de formulario.
              onClick={alCerrar}                                        // Llama al callback de cierre proporcionado por el padre.
              className="text-pcm-muted hover:text-pcm-accent transition-all p-2 hover:bg-white/5 rounded-full hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={guardando}                                      // Deshabilita el cierre mientras se está guardando.
            >
              <X size={24} />                                           {/* Ícono de X para cerrar. */}
            </button>
          </div>

          {/* Formulario principal: incluye contenido scrollable y footer de acciones. */}
          <form
            onSubmit={manejarEnvioFormulario}                           // Asocia el submit al handler que guarda proyecto y adjuntos.
            className="flex flex-col flex-1 min-h-0"                    // Hace que el formulario ocupe todo el alto disponible y permite scroll interno.
          >
            {/* Cuerpo del modal con scroll vertical y helper de scroll PCM. */}
            <div className="overflow-y-auto flex-1 min-h-0 p-6 pcm-scroll-y">
              {/* Contenedor general del contenido con separación vertical. */}
              <div className="text-pcm-text space-y-6">
                {/* ======================================================= */}
                {/* Bloque: Información básica del proyecto                 */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                    <Building2 size={20} />                             {/* Ícono pequeño de edificio. */}
                    Información básica                                  {/* Título de la sección. */}
                  </h4>

                  {/* Grid de campos: título, ubicación, tipo, correo, prioridad. */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Campo: título del proyecto (ocupa 2 columnas en pantallas medianas). */}
                    <div className="md:col-span-2">
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 block">
                        Título del proyecto
                      </label>
                      <input
                        type="text"                                     // Campo de texto libre.
                        value={formularioProyecto.title || ''}          // Toma el valor desde formularioProyecto.title.
                        onChange={(evento) =>
                          setFormularioProyecto({                       // Actualiza el formulario completo.
                            ...formularioProyecto,                      // Copia el estado actual.
                            title: evento.target.value                  // Sobrescribe el título del proyecto.
                          })
                        }
                        placeholder="Nombre del proyecto"
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                        disabled={esLider}
                      />
                    </div>

                    {/* Campo: ubicación del proyecto. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MapPin size={14} />                            {/* Ícono de ubicación. */}
                        Ubicación
                      </label>
                      <input
                        type="text"
                        value={formularioProyecto.location || ''}       // Usa location del formulario.
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            location: evento.target.value               // Actualiza la ubicación.
                          })
                        }
                        placeholder="Ciudad o dirección"
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                        disabled={esLider}
                      />
                    </div>

                    {/* Campo: tipo de proyecto con opciones actuales e históricas. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Briefcase size={14} />                         {/* Ícono de tipo de proyecto. */}
                        Tipo de proyecto
                      </label>
                      <select
                        value={formularioProyecto.type || ''}           // Valor actual del campo type.
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            type: evento.target.value                   // Actualiza el tipo de proyecto.
                          })
                        }
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text"
                        disabled={esLider}
                      >
                        <option value="">Seleccionar tipo</option>      {/* Opción neutra inicial. */}
                        {/* Tipos alineados con el modal de creación de proyecto. */}
                        <option value="obra civil">Obra civil</option>
                        <option value="diseño">Diseño</option>
                        <option value="interventoría">Interventoría</option>
                        {/* Tipos históricos para compatibilidad con registros antiguos. */}
                        <option value="residencial">Residencial (histórico)</option>
                        <option value="comercial">Comercial (histórico)</option>
                        <option value="industrial">Industrial (histórico)</option>
                        <option value="remodelacion">Remodelación (histórico)</option>
                      </select>
                    </div>

                    {/* Campo: correo electrónico del cliente. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Mail size={14} />                              {/* Ícono de correo. */}
                        Correo del cliente
                      </label>
                      <input
                        type="email"
                        value={formularioProyecto.email || ''}         // Correo actual del formulario.
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            email: evento.target.value                 // Actualiza el correo del cliente.
                          })
                        }
                        placeholder="cliente@empresa.com"
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                        disabled={esLider}
                      />
                    </div>

                    {/* Campo: prioridad del proyecto. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Flag size={14} />                              {/* Ícono de prioridad. */}
                        Prioridad
                      </label>
                      <select
                        value={formularioProyecto.priority || ''}       // Prioridad actual.
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            priority: evento.target.value               // Actualiza prioridad.
                          })
                        }
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text"
                        disabled={esLider}
                      >
                        <option value="">Seleccionar prioridad</option>
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                  </div>

                  {/* Nueva línea: país y ciudad del proyecto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                    {/* Campo: país */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        País
                      </label>
                      <input
                        type="text"
                        value={
                          // Soporta tanto "pais" (nuevo) como "country" (legacy) en el formulario
                          (formularioProyecto.pais ?? formularioProyecto.country) || ''
                        }
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            pais: evento.target.value,
                          })
                        }
                        placeholder="Ej. Colombia"
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                        disabled={esLider}
                      />
                    </div>
                    {/* Campo: ciudad */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={
                          (formularioProyecto.ciudad ?? formularioProyecto.city) || ''
                        }
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            ciudad: evento.target.value,
                          })
                        }
                        placeholder="Ej. Bogotá D.C."
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                        disabled={esLider}
                      />
                    </div>
                  </div>
                </div>

                {/* ======================================================= */}
                {/* Bloque: Fechas y duración del proyecto                 */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                    <Calendar size={20} />                              {/* Ícono de calendario. */}
                    Fechas y duración
                  </h4>

                  {/* Grid con fecha de inicio, fecha de fin y duración. */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Campo: fecha de inicio. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 block">
                        Fecha de inicio
                      </label>
                      <input
                        type="date"
                        value={                                          // Controla el valor del input con la fecha inicial.
                          formularioProyecto.startDate                  // Si existe startDate...
                            ? formularioProyecto.startDate.substring(0, 10) // Se recortan los primeros 10 caracteres (YYYY-MM-DD).
                            : ''                                         // Si no hay fecha, se deja vacío.
                        }
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            startDate: evento.target.value              // Actualiza la fecha de inicio.
                          })
                        }
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text"
                        disabled={esLider}
                      />
                    </div>

                    {/* Campo: fecha de fin. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 block">
                        Fecha de fin
                      </label>
                      <input
                        type="date"
                        value={                                          // Valor controlado de la fecha final.
                          formularioProyecto.endDate                    // Si hay endDate...
                            ? formularioProyecto.endDate.substring(0, 10) // Se recorta al formato de fecha.
                            : ''                                         // Si no, se deja vacío.
                        }
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            endDate: evento.target.value                // Actualiza la fecha de fin.
                          })
                        }
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text"
                        disabled={esLider}
                      />
                    </div>

                    {/* Campo: duración en días (calculado automáticamente) */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Clock size={14} />                             {/* Ícono de reloj. */}
                        Duración (días)
                      </label>
                      <input
                        type="number"
                        value={formularioProyecto.duration || ''}       // Duración actual.
                        readOnly                                         // Campo de solo lectura, calculado automáticamente.
                        placeholder="Se calcula automáticamente"
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* ======================================================= */}
                {/* Bloque: Presupuesto, estado y progreso del proyecto   */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                    <DollarSign size={20} />                            {/* Ícono de dólar. */}
                    Presupuesto y estado
                  </h4>

                  {/* Grid con presupuesto, estado y progreso porcentual. */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Campo: presupuesto del proyecto. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 block">
                        Presupuesto
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pcm-muted">
                          $
                        </span>
                        <input
                          type="number"
                          value={formularioProyecto.budget || ''}       // Presupuesto actual.
                          onChange={(evento) =>
                            setFormularioProyecto({
                              ...formularioProyecto,
                              budget: evento.target.value               // Actualiza presupuesto.
                            })
                          }
                          placeholder="10000000"
                          className="w-full p-3 pl-8 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                          disabled={esLider}
                        />
                      </div>
                    </div>

                    {/* Campo: estado del proyecto. */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 block">
                        Estado
                      </label>
                      <select
                        value={formularioProyecto.status || ''}         // Estado actual.
                        onChange={(evento) =>
                          setFormularioProyecto({
                            ...formularioProyecto,
                            status: evento.target.value                 // Actualiza estado.
                          })
                        }
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text"
                      >
                        <option value="">Seleccionar estado</option>
                        <option value="planning">Planificación</option>
                        <option value="in-progress">En progreso</option>
                        <option value="on-hold">En pausa</option>
                        <option value="completed">Completado</option>
                      </select>
                    </div>

                    {/* Campo: progreso porcentual del proyecto (solo lectura). */}
                    <div>
                      <label className="text-pcm-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <TrendingUp size={14} />
                        Progreso (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formularioProyecto.progress || 0}
                        readOnly
                        placeholder="0"
                        className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:outline-none transition text-pcm-text placeholder-pcm-muted"
                      />
                    </div>
                  </div>

                  {/* Barra de progreso visual si progress tiene un valor válido. */}
                  {formularioProyecto.progress !== undefined && formularioProyecto.progress !== '' && (
                    <div className="mt-5">
                      {/* Encabezado de la barra con texto y porcentaje */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-pcm-muted text-xs">Progreso visual</span>
                        <span className="text-pcm-text font-bold text-sm">
                          {formularioProyecto.progress}%
                        </span>
                      </div>
                      {/* Barra contenedora y barra interna con ancho proporcional al progreso */}
                      <div className="bg-pcm-bg/60 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-pcm-primary transition-all duration-300 shadow-pcm-soft"
                          style={{ width: `${formularioProyecto.progress}%` }}
                        />
                      </div>
                      {/* Mensaje informativo */}
                      <p className="text-[11px] text-pcm-muted mt-1">
                        El avance se actualiza automáticamente según los criterios seleccionados.
                      </p>
                    </div>
                  )}
                </div>

                {/* ======================================================= */}
                {/* Bloque: Criterios de avance del proyecto              */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                    <TrendingUp size={20} />
                    Criterios de avance
                  </h4>
                  {/* Componente selector de criterios que permite marcar criterios cumplidos y calcula el progreso automáticamente */}
                  <SelectorCriteriosProyecto
                    tipo={formularioProyecto.type}
                    criteriosIniciales={criteriosAvance}
                    onCriteriosChange={manejarCambioCriterios}
                  />
                </div>

                {/* ======================================================= */}
                {/* Bloque: Materiales del proyecto (opcional)            */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                    <Paperclip size={20} />
                    Materiales del proyecto
                  </h4>
                  <SelectorMaterialesProyecto
                    materialesDisponibles={materialesDisponibles}
                    materialesSeleccionados={materialesSeleccionados}
                    onCambiarMateriales={manejarCambioMateriales}
                    etiqueta="Materiales asignados al proyecto (opcional)"
                  />
                </div>

                {/* ======================================================= */}
                {/* Bloque: Equipo del proyecto                           */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-3 flex items-center gap-2">
                    <Users size={18} />                                   {/* Ícono de usuarios. */}
                    Equipo del proyecto
                  </h4>

                  {/* Texto introductorio explicando qué datos se manejan del equipo. */}
                  <p className="text-pcm-muted text-sm mb-4">
                    Define el equipo con{' '}
                    <span className="text-pcm-accent font-semibold">
                      nombre, apellido, tipo y número de documento y cargo
                    </span>
                    . Esta información será visible en el panel de administración y,
                    según la vista, en componentes de solo lectura para el cliente.
                  </p>

                  {/* Mensaje cuando aún no hay integrantes cargados. */}
                  {(!Array.isArray(formularioProyecto.team) ||
                    formularioProyecto.team.length === 0) && (
                    <p className="text-pcm-muted text-sm mb-3">
                      Aún no has agregado integrantes al equipo.
                    </p>
                  )}

                  {/* Lista de integrantes cuando sí existen elementos en team. */}
                  {Array.isArray(formularioProyecto.team) &&
                    formularioProyecto.team.length > 0 && (
                      <div className="space-y-4 mb-4">
                        {formularioProyecto.team.map((integrante, indice) => { // Recorre cada integrante del equipo.
                          const integranteSeguro =                     // Normaliza posibles strings a objeto.
                            typeof integrante === 'string'
                              ? {
                                  nombre: integrante,
                                  apellido: '',
                                  cargo: '',
                                  tipoDocumento: '',
                                  numeroDocumento: ''
                                }
                              : (integrante || {});

                          return (
                            <div
                              key={indice}
                              className="border border-white/10 rounded-pcm-xl p-4 bg-pcm-bg/60"
                            >
                              {/* Encabezado del integrante con contador y botón Quitar. */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-pcm-primary/30 flex items-center justify-center text-xs font-bold text-pcm-text">
                                    {indice + 1}                          {/* Número del integrante. */}
                                  </div>
                                  <p className="text-sm text-pcm-text font-semibold">
                                    Integrante #{indice + 1}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => manejarEliminarIntegrante(indice)} // Elimina al integrante actual.
                                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 hover:text-red-100 transition"
                                >
                                  <Trash2 size={14} />                   {/* Ícono de papelera. */}
                                  Quitar
                                </button>
                              </div>

                              {/* Grid de campos del integrante: nombre, apellido, cargo, doc, etc. */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Campo: nombre del integrante. */}
                                <div>
                                  <label className="text-pcm-muted text-xs uppercase tracking-wider mb-1.5 block">
                                    Nombre
                                  </label>
                                  <input
                                    type="text"
                                    value={integranteSeguro.nombre || ''}
                                    onChange={(evento) =>
                                      manejarCambioIntegranteEquipo(
                                        indice,
                                        'nombre',
                                        evento.target.value
                                      )
                                    }
                                    placeholder="Nombres"
                                    className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none text-sm text-pcm-text placeholder-pcm-muted transition"
                                  />
                                </div>

                                {/* Campo: apellido del integrante. */}
                                <div>
                                  <label className="text-pcm-muted text-xs uppercase tracking-wider mb-1.5 block">
                                    Apellido
                                  </label>
                                  <input
                                    type="text"
                                    value={integranteSeguro.apellido || ''}
                                    onChange={(evento) =>
                                      manejarCambioIntegranteEquipo(
                                        indice,
                                        'apellido',
                                        evento.target.value
                                      )
                                    }
                                    placeholder="Apellidos"
                                    className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none text-sm text-pcm-text placeholder-pcm-muted transition"
                                  />
                                </div>

                                {/* Campo: cargo del integrante. */}
                                <div>
                                  <label className="text-pcm-muted text-xs uppercase tracking-wider mb-1.5 block">
                                    Cargo
                                  </label>
                                  <input
                                    type="text"
                                    value={integranteSeguro.cargo || ''}
                                    onChange={(evento) =>
                                      manejarCambioIntegranteEquipo(
                                        indice,
                                        'cargo',
                                        evento.target.value
                                      )
                                    }
                                    placeholder="Residente, Maestro, Auxiliar..."
                                    className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none text-sm text-pcm-text placeholder-pcm-muted transition"
                                  />
                                </div>

                                {/* Campo: tipo de documento. */}
                                <div>
                                  <label className="text-pcm-muted text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <IdCard size={14} />                 {/* Ícono de documento. */}
                                    Tipo de documento
                                  </label>
                                  <select
                                    value={integranteSeguro.tipoDocumento || ''}
                                    onChange={(evento) =>
                                      manejarCambioIntegranteEquipo(
                                        indice,
                                        'tipoDocumento',
                                        evento.target.value
                                      )
                                    }
                                    className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none text-sm text-pcm-text transition"
                                  >
                                    <option value="">Seleccionar</option>
                                    <option value="CC">C.C. - Cédula de ciudadanía</option>
                                    <option value="CE">C.E. - Cédula de extranjería</option>
                                    <option value="NIT">NIT</option>
                                    <option value="PAS">PAS - Pasaporte</option>
                                  </select>
                                </div>

                                {/* Campo: número de documento. */}
                                <div>
                                  <label className="text-pcm-muted text-xs uppercase tracking-wider mb-1.5 block">
                                    Número de documento
                                  </label>
                                  <input
                                    type="text"
                                    value={integranteSeguro.numeroDocumento || ''}
                                    onChange={(evento) =>
                                      manejarCambioIntegranteEquipo(
                                        indice,
                                        'numeroDocumento',
                                        evento.target.value
                                      )
                                    }
                                    placeholder="Ej: 1.234.567.890"
                                    className="w-full p-3 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none text-sm text-pcm-text placeholder-pcm-muted transition"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {/* Botón para agregar nuevos integrantes al equipo. */}
                  <button
                    type="button"
                    onClick={manejarAgregarIntegrante}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pcm-primary hover:bg-pcm-secondary text-white text-xs font-semibold transition-all hover:scale-105"
                  >
                    <PlusCircle size={16} />                            {/* Ícono de más. */}
                    Agregar integrante
                  </button>

                  {/* Nota informativa debajo del botón de agregar integrante. */}
                  <p className="text-xs text-pcm-muted mt-2">
                    Incluye al residente de obra, maestro, auxiliares y demás personal
                    clave del proyecto.
                  </p>
                </div>

                {/* ======================================================= */}
                {/* Bloque: Archivos adjuntos                            */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-5 flex items-center gap-2">
                    <Paperclip size={18} />                             {/* Ícono de clip. */}
                    Archivos adjuntos
                  </h4>

                  {/* Texto explicativo sobre qué tipo de archivos se pueden adjuntar. */}
                  <p className="text-pcm-muted text-sm mb-3">
                    Puedes adjuntar planos, informes, fotografías u otros documentos
                    relevantes para este proyecto. Estos archivos se cargarán al
                    guardar el proyecto.
                  </p>

                  {/* Label que funciona como botón para abrir el selector de archivos. */}
                  <label
                    htmlFor="archivos-modal-editar-proyecto"             // Asocia el label con el input file para accesibilidad.
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pcm-primary hover:bg-pcm-secondary text-white text-xs font-semibold cursor-pointer transition-all hover:scale-105"
                  >
                    <Paperclip size={16} />                             {/* Ícono de clip pequeño. */}
                    <span>
                      {archivosParaSubir.length > 0
                        ? 'Agregar más archivos'
                        : 'Seleccionar archivos'}
                    </span>
                  </label>
                  <input
                    id="archivos-modal-editar-proyecto"                  // ID único del input de archivos.
                    name="archivosModalEditarProyecto"                  // Name único recomendado para formularios.
                    type="file"
                    multiple
                    className="hidden"                                  // Se oculta el input real, se usa solo el label como botón.
                    onChange={manejarCambioArchivos}                    // Maneja la selección de archivos.
                    disabled={guardando}                                // Deshabilita mientras se guarda.
                  />

                  {/* Lista con los archivos actualmente seleccionados antes de subir. */}
                  {archivosParaSubir.length > 0 && (
                    <div className="mt-3 space-y-1 text-xs text-pcm-text">
                      <p className="font-semibold text-pcm-accent mb-1">
                        Archivos seleccionados ({archivosParaSubir.length}):
                      </p>
                      <ul className="space-y-1">
                        {archivosParaSubir.map((archivo, indice) => (
                          <li
                            key={indice}
                            className="flex items-center justify-between gap-2 bg-pcm-bg/50 rounded-lg px-3 py-1"
                          >
                            <div className="flex-1 overflow-hidden">
                              <span className="truncate">{archivo.name}</span>{' '}
                              <span className="text-pcm-muted text-[11px]">
                                ({(archivo.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => manejarEliminarArchivoSeleccionado(indice)}
                              className="text-red-400 hover:text-red-200 text-xs px-2 py-1 rounded-md hover:bg-red-600/20 transition"
                            >
                              Eliminar
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* ======================================================= */}
                {/* Bloque: Descripción del proyecto                     */}
                {/* ======================================================= */}
                <div className="bg-pcm-surfaceSoft/70 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 animate-slide-up-soft">
                  <h4 className="text-lg font-bold text-pcm-primary mb-5">
                    Descripción
                  </h4>
                  <textarea
                    value={formularioProyecto.description || ''}         // Descripción actual del proyecto.
                    onChange={(evento) =>
                      setFormularioProyecto({
                        ...formularioProyecto,
                        description: evento.target.value                // Actualiza la descripción.
                      })
                    }
                    placeholder="Describe los detalles importantes del proyecto (alcance, entregables, restricciones, etc.)..."
                    rows={4}
                    className="w-full p-4 rounded-lg bg-pcm-bg/60 border border-white/10 focus:border-pcm-primary focus:outline-none transition text-pcm-text placeholder-pcm-muted resize-none"
                    disabled={esLider}
                  />
                </div>

                {/* Bloque de mensaje de error global si algo falló al guardar. */}
                {mensajeError && (
                  <div className="mt-2 text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-pcm-xl px-4 py-2">
                    {mensajeError}
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* Pie del modal con botones de acción (Cancelar / Guardar) */}
            {/* ========================================================= */}
            <div className="flex justify-end gap-4 p-6 border-t border-white/10 bg-pcm-bg/80">
              {/* Botón de cancelar: cierra el modal sin guardar cambios. */}
              <button
                type="button"
                onClick={alCerrar}                                        // Llama al callback de cierre.
                className="px-6 py-3 bg-pcm-bg/70 hover:bg-pcm-bg text-pcm-text border border-white/10 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={guardando}                                     // Deshabilita mientras se está guardando.
              >
                Cancelar
              </button>

              {/* Botón de guardar: dispara el submit del formulario. */}
              <button
                type="submit"
                className="pcm-btn-primary px-6 py-3 rounded-xl font-semibold shadow-pcm-soft transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={guardando}                                     // Impide clics múltiples mientras se guarda.
              >
                <Save size={20} />                                      {/* Ícono de guardar. */}
                {guardando
                  ? esProyectoNuevo
                    ? 'Creando...'
                    : 'Guardando...'
                  : esProyectoNuevo
                  ? 'Crear proyecto'
                  : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente para poder usarlo en otras partes de la aplicación.
export default ModalEditarProyecto;                                       // Exportación por defecto con nombre en español.
