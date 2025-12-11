// File: frontend/src/modules/inventory/pages/VistaMateriales.jsx
// Description: Vista de gestión de materiales del módulo de inventarios.
//              Permite listar, filtrar y revisar materiales por almacén,
//              ver alertas de stock bajo, consultar movimientos de cada
//              material y, según el rol del usuario, crear/editar/eliminar
//              materiales (solo admin) o solicitar nuevos materiales
//              (rol líder), utilizando el tema visual PCM y los servicios
//              centralizados de API.

// =========================
//   Importaciones básicas
// =========================
import React, {
  useState,                            // Hook de estado para valores locales (filtros, formularios, etc.).
  useEffect,                           // Hook de efecto para cargar datos y reaccionar a cambios.
  useMemo,                             // Hook para memorizar listas filtradas y evitar cálculos innecesarios.
} from 'react';

// =========================
//   Importación de íconos
// =========================
import {
  Search,                              // Ícono de lupa para la barra de búsqueda.
  Filter,                              // Ícono de filtro para selectores.
  Package,                             // Ícono de caja para representar materiales.
  AlertTriangle,                       // Ícono de alerta para advertencias (stock bajo, confirmaciones).
  DollarSign,                          // Ícono de dólar para precios.
  Warehouse as IconoAlmacen,           // Ícono de bodega/almacén (renombrado para evitar conflicto de nombre).
  Plus,                                // Ícono de +.
  X,                                   // Ícono de cierre de toasts.
  Loader2,                             // Ícono de carga con animación giratoria.
  CheckCircle,                         // Ícono de éxito para notificaciones.
  XCircle,                             // Ícono de error para notificaciones.
  Info,                                // Ícono de información para notificaciones.
  ClipboardList,                       // Ícono de lista para movimientos/solicitudes.
} from 'lucide-react';

// =========================
//   Importación de modales
// =========================
import ModalMovimientosMaterial from '../modals/ModalMovimientosMaterial.jsx'; // Modal para historial de movimientos de un material.
import ModalEdicionMaterial from '../modals/ModalEdicionMaterial.jsx';         // Modal reutilizable para crear/editar materiales.
import ModalEliminarMaterial from '../modals/ModalEliminarMaterial.jsx';       // Modal de confirmación de eliminación de material.
import ModalDetalleMaterial from '../modals/ModalDetalleMaterial.jsx';         // Modal para ver el detalle completo de un material.
// Se elimina la importación de ModalGenerico para cumplir la regla de modales autónomos PCM.

// ==========================================
//   Importación de servicios de API (PCM)
// ==========================================
import {
  obtenerMateriales,                                                     // Servicio: listar materiales.
  obtenerAlmacenes,                                                      // Servicio: listar almacenes.
  crearMaterial,                                                         // Servicio: crear material.
  actualizarMaterial,                                                    // Servicio: actualizar material.
  eliminarMaterial,                                                      // Servicio: eliminar material.
  crearSolicitud,                                                        // Servicio: crear solicitud (para rol líder).
} from '../../../services/api/api.js';                                   // Importa la capa de servicios centralizada (ESM con extensión .js).

// =======================================================================
//   Componente de notificación flotante (toast)
// =======================================================================

/**
 * Componente NotificacionToast
 *
 * Props:
 *  - mensaje: (string) texto que se quiere mostrar al usuario.
 *  - tipo:    (string) 'success' | 'error' | 'warning' | 'info'.
 *  - alCerrar:(func)   callback que se ejecuta al cerrar el toast.
 */
const NotificacionToast = ({ mensaje, tipo, alCerrar }) => {
  // Mapeo de íconos según el tipo de notificación.
  const iconosPorTipo = {
    success: <CheckCircle size={20} />,                                   // Ícono de éxito.
    error: <XCircle size={20} />,                                         // Ícono de error.
    warning: <AlertTriangle size={20} />,                                 // Ícono de advertencia.
    info: <Info size={20} />,                                             // Ícono de información.
  };

  // Clases de color de fondo y borde según el tipo.
  const estilosPorTipo = {
    success: 'bg-emerald-500 border-emerald-400',                         // Verde para éxito.
    error: 'bg-red-500 border-red-400',                                   // Rojo para error.
    warning: 'bg-amber-500 border-amber-400',                             // Amarillo para advertencia.
    info: 'bg-sky-500 border-sky-400',                                    // Azul para información.
  };

  useEffect(() => {
    // Programa cierre automático del toast después de 4 segundos.
    const temporizador = setTimeout(alCerrar, 4000);
    // Limpia el temporizador si el componente se desmonta antes.
    return () => clearTimeout(temporizador);
  }, [alCerrar]);

  return (
    <div
      className={`
        ${estilosPorTipo[tipo] || estilosPorTipo.info}
        border-2 rounded-pcm-xl shadow-pcm-soft
        p-4 flex items-start gap-3 min-w-[300px] max-w-md
        animate-toast-in-right
      `}                                                                  // Aplica estilos según el tipo de notificación.
    >
      {/* Ícono del tipo de notificación */}
      <div className="text-white mt-0.5">
        {iconosPorTipo[tipo] || iconosPorTipo.info}
      </div>

      {/* Texto principal de la notificación */}
      <div className="flex-1">
        <p className="text-white font-semibold text-sm leading-relaxed">
          {mensaje}
        </p>
      </div>

      {/* Botón para cerrar manualmente el toast */}
      <button
        type="button"
        onClick={alCerrar}
        className="text-white/80 hover:text-white transition duration-150"
      >
        <X size={18} />
      </button>
    </div>
  );
};

// =======================================================================
//   Vista principal: VistaMateriales
// =======================================================================

/**
 * Componente VistaMateriales
 *
 * - Lista y filtra los materiales de inventario.
 * - Muestra indicadores de stock bajo.
 * - Abre modales para movimientos, creación/edición y eliminación.
 * - Respeta reglas de rol: admin vs líder (acciones disponibles).
 */
const VistaMateriales = ({ rolUsuario: rolUsuarioProp }) => {
  // =========================
  //   Estado de filtros
  // =========================
  const [terminoBusqueda, setTerminoBusqueda] = useState('');             // Texto de búsqueda por nombre o categoría.
  const [filtroCategoria, setFiltroCategoria] = useState('todas');        // Filtro por categoría seleccionada.
  const [filtroAlmacen, setFiltroAlmacen] = useState('todos');            // Filtro por almacén seleccionado.
  const [filtrarStockBajo, setFiltrarStockBajo] = useState(false);       // Mostrar sólo materiales con stock bajo.

  // =========================
  //   Estado de datos base
  // =========================
  const [materiales, setMateriales] = useState([]);                       // Lista de materiales cargados desde la API.
  const [almacenes, setAlmacenes] = useState([]);                         // Lista de almacenes cargados desde la API.

  // =========================
  //   Estado de carga y error
  // =========================
  const [estaCargando, setEstaCargando] = useState(true);                // Bandera de carga inicial.
  const [mensajeError, setMensajeError] = useState(null);                // Mensaje de error si falla la carga.

  // =========================
  //   Estado de modales
  // =========================
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false); // Muestra u oculta el modal de crear/editar material.
  const [materialEnEdicion, setMaterialEnEdicion] = useState(null);      // Material que se está editando (null si es creación).

  const [materialSeleccionado, setMaterialSeleccionado] = useState(null); // Material para mostrar su historial de movimientos.

  const [materialAEliminar, setMaterialAEliminar] = useState(null);      // Material objetivo para eliminación.
  const [estaEliminando, setEstaEliminando] = useState(false);           // Bandera de eliminación en proceso.

  // Material seleccionado para ver sus detalles en un modal aparte
  const [materialDetalle, setMaterialDetalle] = useState(null);

  const [mostrarModalSolicitud, setMostrarModalSolicitud] = useState(false); // Controla el modal de solicitud de nuevo material.

  // =========================
  //   Formularios
  // =========================
  /**
   * Formulario de material.
   *
   * A partir de ahora un material puede existir en varios almacenes. Para soportar esto
   * el formulario se compone de campos globales (nombre, categoría, unidad, precioUnitario)
   * y de un arreglo de asignaciones. Cada asignación representa una cantidad y stock
   * mínimo para un almacén específico. El backend gestiona cada combinación de
   * nombre/categoría/unidad/almacén como un documento independiente, permitiendo
   * duplicados entre almacenes pero no dentro del mismo almacén. En edición
   * se cargan todas las asignaciones existentes para el material en distintos almacenes.
   */
  const [datosFormularioMaterial, setDatosFormularioMaterial] = useState({
    nombre: '',              // Nombre del material.
    categoria: '',           // Categoría del material.
    unidad: '',              // Unidad de medida (kg, m, unidad, etc.).
    precioUnitario: '',      // Precio por unidad (string para evitar mostrar 0 por defecto).
    asignaciones: [          // Arreglo de asignaciones de cantidades por almacén.
      {
        almacen: '',         // ID del almacén asociado.
        cantidad: '',        // Cantidad de stock para este almacén.
        stockMinimo: '',     // Stock mínimo para este almacén.
        id: undefined,       // Identificador del material existente (solo en edición).
      },
    ],
  });

  const [datosSolicitudMaterial, setDatosSolicitudMaterial] = useState({
    nombrePropuesto: '',                                                  // Nombre del material solicitado por el líder.
    descripcion: '',                                                      // Justificación / detalles de la solicitud.
  });

  const [estaEnviandoSolicitud, setEstaEnviandoSolicitud] = useState(false); // Bandera de envío de solicitud.

  // =========================
  //   Sistema de notificaciones
  // =========================
  const [notificaciones, setNotificaciones] = useState([]);               // Cola de notificaciones toast activas.

  // =========================
  //   Rol del usuario
  // =========================
  const [rolUsuario, setRolUsuario] = useState(
    (rolUsuarioProp && rolUsuarioProp.toString().toLowerCase()) || 'admin',
  );                                                                      // Rol del usuario logueado (por defecto admin si no hay prop).

  // Derivados de rol para simplificar lógica.
  const esAdmin = rolUsuario === 'admin';                                // Verdadero si el usuario es administrador.
  const esLiderObra =
    rolUsuario === 'lider' || rolUsuario === 'lider_obra';               // Verdadero si es líder de obra.

  // Derivado visual del rol para los colores de panel/modal (regla 32).
  const rolVisualPanel = useMemo(() => {                                 // Calcula el rol visual que se usará en clases .pcm-panel--ROL.
    if (esAdmin) return 'admin';                                         // Admin → esquema azul de administración.
    if (esLiderObra) return 'lider';                                     // Líder o líder_obra → esquema naranja.
    if (rolUsuario === 'cliente') return 'cliente';                      // Cliente → esquema verde.
    if (rolUsuario === 'auditor') return 'auditor';                      // Auditor → esquema morado.
    return 'admin';                                                      // Fallback seguro → admin.
  }, [esAdmin, esLiderObra, rolUsuario]);

  // ─────────────────────────────────────────────────────────────
  // Carga / sincroniza el rol del usuario
  //   1) Si viene como prop desde TableroTrabajo, se usa ese valor.
  //   2) Si NO viene prop, se intenta leer desde localStorage
  //      (claves 'user' y 'pcm_usuario' como respaldo).
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Si el Tablero nos envía el rol por props, esa es la fuente de la verdad.
    if (rolUsuarioProp) {
      try {
        setRolUsuario(rolUsuarioProp.toString().toLowerCase());          // Normaliza y guarda el rol recibido.
      } catch (error) {
        console.error(
          'Error normalizando el rol recibido por props en VistaMateriales:',
          error,
        );
        setRolUsuario('admin');                                          // Fallback seguro si algo falla al normalizar.
      }
      return;                                                            // No seguimos a leer localStorage.
    }

    // Modo legado: sin prop, intentamos leer desde localStorage.
    try {
      const datoUsuario =
        localStorage.getItem('user') ||                                  // Clave actual usada en el workspace.
        localStorage.getItem('pcm_usuario');                             // Clave antigua usada en algunas vistas.

      if (datoUsuario) {
        const usuario = JSON.parse(datoUsuario);                         // Parsea el JSON almacenado.
        const rolDetectado = (
          usuario?.role ||
          usuario?.rol ||
          usuario?.tipoRol ||
          'admin'
        )
          .toString()
          .toLowerCase();                                                // Normaliza a minúsculas.

        setRolUsuario(rolDetectado);                                     // Actualiza el estado de rol.
      } else {
        setRolUsuario('admin');                                          // Fallback si no hay nada almacenado.
      }
    } catch (error) {
      console.error(
        'Error al leer el rol del usuario desde localStorage en VistaMateriales:',
        error,
      );
      setRolUsuario('admin');                                            // Fallback seguro en caso de error.
    }
  }, [rolUsuarioProp]);

  // ─────────────────────────────────────────────────────────────
  // Funciones para gestionar notificaciones (toast)
  // ─────────────────────────────────────────────────────────────
  const mostrarToast = (mensaje, tipo = 'info') => {
    const id = Date.now();                                               // ID basado en timestamp.
    setNotificaciones((previo) => [...previo, { id, mensaje, tipo }]);   // Agrega nueva notificación.
  };

  const cerrarToast = (idNotificacion) => {
    setNotificaciones((previo) =>
      previo.filter((toast) => toast.id !== idNotificacion),             // Elimina la notificación con ese ID.
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Carga de datos desde la API (materiales + almacenes)
  // ─────────────────────────────────────────────────────────────
  const cargarDatos = async () => {
    try {
      setEstaCargando(true);                                             // Activa estado de carga.
      setMensajeError(null);                                             // Limpia errores previos.

      // Ejecuta las peticiones de materiales y almacenes en paralelo.
      const [respuestaMateriales, respuestaAlmacenes] = await Promise.all([
        obtenerMateriales(),                                             // Llama al servicio de materiales.
        obtenerAlmacenes(),                                              // Llama al servicio de almacenes.
      ]);

      // Normaliza las respuestas a arreglos.
      setMateriales(
        Array.isArray(respuestaMateriales) ? respuestaMateriales : [],
      );
      setAlmacenes(
        Array.isArray(respuestaAlmacenes) ? respuestaAlmacenes : [],
      );
    } catch (error) {
      console.error('Error al cargar materiales/almacenes:', error);
      setMensajeError(
        error?.message || 'Error al cargar los datos de inventario',
      );                                                                 // Mensaje para el usuario.
      setMateriales([]);                                                 // Limpia arrays en caso de error.
      setAlmacenes([]);
    } finally {
      setEstaCargando(false);                                            // Desactiva estado de carga.
    }
  };

  // Efecto para cargar los datos iniciales al montar la vista.
  useEffect(() => {
    cargarDatos();                                                       // Llama a la función de carga.
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Handlers para creación, edición y envío del formulario de material
  // ─────────────────────────────────────────────────────────────
  const manejarAbrirCrearMaterial = () => {
    setMaterialEnEdicion(null);                                          // Asegura que no hay material en edición.
    setDatosFormularioMaterial({
      nombre: '',
      categoria: '',
      unidad: '',
      precioUnitario: '',
      asignaciones: [
        {
          almacen: '',
          cantidad: '',
          stockMinimo: '',
          id: undefined,
        },
      ],
    });                                                                 // Reinicia el formulario con valores en blanco.
    setMostrarModalEdicion(true);                                       // Abre el modal de edición/creación.
  };

  const manejarAbrirEditarMaterial = (material) => {
    setMaterialEnEdicion(material);                                     // Guarda el material en edición.
    // Construir la lista de asignaciones actuales para este material en todos los almacenes.
    // Buscamos en la lista global de materiales aquellos que coinciden por nombre, categoría y unidad.
    const nombreNorm = (material.nombre || '').toString().trim().toLowerCase();
    const categoriaNorm = (material.categoria || '').toString().trim().toLowerCase();
    const unidadNorm = (material.unidad || '').toString().trim().toLowerCase();

    const asignacionesExistentes = materiales
      .filter((mat) => {
        const n = (mat.nombre || '').toString().trim().toLowerCase();
        const c = (mat.categoria || '').toString().trim().toLowerCase();
        const u = (mat.unidad || '').toString().trim().toLowerCase();
        return n === nombreNorm && c === categoriaNorm && u === unidadNorm;
      })
      .map((mat) => ({
        id: mat._id,
        almacen:
          typeof mat.almacen === 'object' && mat.almacen !== null
            ? mat.almacen._id
            : mat.almacen || '',
        cantidad:
          mat.cantidad !== undefined && mat.cantidad !== null
            ? String(mat.cantidad)
            : '',
        stockMinimo:
          mat.stockMinimo !== undefined && mat.stockMinimo !== null
            ? String(mat.stockMinimo)
            : '',
      }));

    // Si por alguna razón no se encontró ninguna asignación (debería haber al menos una),
    // usamos la asignación base a partir del material recibido.
    const asignaciones =
      asignacionesExistentes.length > 0
        ? asignacionesExistentes
        : [
            {
              id: material._id,
              almacen:
                typeof material.almacen === 'object' && material.almacen !== null
                  ? material.almacen._id
                  : material.almacen || '',
              cantidad:
                material.cantidad !== undefined && material.cantidad !== null
                  ? String(material.cantidad)
                  : '',
              stockMinimo:
                material.stockMinimo !== undefined && material.stockMinimo !== null
                  ? String(material.stockMinimo)
                  : '',
            },
          ];

    setDatosFormularioMaterial({
      nombre: material.nombre || '',
      categoria: material.categoria || '',
      unidad: material.unidad || '',
      precioUnitario:
        material.precioUnitario !== undefined && material.precioUnitario !== null
          ? String(material.precioUnitario)
          : '',
      asignaciones,
    });
    setMostrarModalEdicion(true);                                       // Abre el modal.
  };

  const manejarCerrarModalEdicion = () => {
    setMostrarModalEdicion(false);                                      // Oculta el modal.
    setMaterialEnEdicion(null);                                         // Limpia el estado.
  };

  const manejarGuardarMaterial = async () => {
    // Extrae campos globales y asignaciones del formulario
    const { nombre, categoria, unidad, precioUnitario, asignaciones } = datosFormularioMaterial;

    // Validaciones básicas de texto
    if (!nombre || !nombre.trim()) {
      mostrarToast('El nombre del material es obligatorio', 'warning');
      return;
    }
    if (!categoria || !categoria.trim()) {
      mostrarToast('La categoría del material es obligatoria', 'warning');
      return;
    }
    if (!unidad || !unidad.trim()) {
      mostrarToast('La unidad del material es obligatoria', 'warning');
      return;
    }

    // Validación del arreglo de asignaciones
    if (!Array.isArray(asignaciones) || asignaciones.length === 0) {
      mostrarToast('Debe asignar al menos un almacén y cantidad', 'warning');
      return;
    }

    // Convertir precio unitario a número
    const precioNum = parseFloat(precioUnitario);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      mostrarToast('El precio unitario debe ser un número válido no negativo', 'warning');
      return;
    }

    // Validar asignaciones individuales y preparar lista de payloads
    const idsEnLista = new Set();
    const asignacionesPreparadas = [];
    for (let idx = 0; idx < asignaciones.length; idx++) {
      const asig = asignaciones[idx] || {};
      const almc = asig.almacen;
      const cantidadStr = asig.cantidad;
      const stockMinStr = asig.stockMinimo;

      if (!almc) {
        mostrarToast(`Seleccione un almacén para la asignación ${idx + 1}`, 'warning');
        return;
      }
      // Validación de duplicados en el formulario (mismo almacén dos veces)
      if (idsEnLista.has(almc)) {
        mostrarToast('Hay asignaciones duplicadas para un mismo almacén', 'warning');
        return;
      }
      idsEnLista.add(almc);

      const cantidadNum = parseFloat(cantidadStr);
      if (Number.isNaN(cantidadNum) || cantidadNum < 0) {
        mostrarToast(`La cantidad de la asignación ${idx + 1} debe ser un número válido no negativo`, 'warning');
        return;
      }
      const stockMinNum = parseFloat(stockMinStr);
      if (Number.isNaN(stockMinNum) || stockMinNum < 0) {
        mostrarToast(`El stock mínimo de la asignación ${idx + 1} debe ser un número válido no negativo`, 'warning');
        return;
      }

      asignacionesPreparadas.push({
        id: asig.id,
        almacen: almc,
        cantidad: cantidadNum,
        stockMinimo: stockMinNum,
      });
    }

    // Verificación de duplicados con datos existentes sólo en creación o para nuevas asignaciones en edición
    const nombreNorm = nombre.trim().toLowerCase();
    const categoriaNorm = categoria.trim().toLowerCase();
    const unidadNorm = unidad.trim().toLowerCase();

    for (const asig of asignacionesPreparadas) {
      // Solo verificar duplicados para asignaciones nuevas (sin id) o cuando se edita un material distinto
      if (!asig.id) {
        const existe = materiales.some((mat) => {
          const n = (mat.nombre || '').toString().trim().toLowerCase();
          const c = (mat.categoria || '').toString().trim().toLowerCase();
          const u = (mat.unidad || '').toString().trim().toLowerCase();
          const almacenId =
            typeof mat.almacen === 'object' && mat.almacen !== null
              ? mat.almacen._id
              : mat.almacen;
          return (
            n === nombreNorm && c === categoriaNorm && u === unidadNorm && almacenId === asig.almacen
          );
        });
        if (existe) {
          mostrarToast(
            'Ya existe un material con el mismo nombre, categoría, unidad y almacén',
            'error',
          );
          return;
        }
      }
    }

    // Ejecutar llamadas al backend por cada asignación
    try {
      // Si estamos editando, actualizamos todas las asignaciones con id existente y creamos las nuevas.
      if (materialEnEdicion) {
        for (const asig of asignacionesPreparadas) {
          const payload = {
            nombre: nombre.trim(),
            categoria: categoria.trim(),
            unidad: unidad.trim(),
            precioUnitario: precioNum,
            cantidad: asig.cantidad,
            stockMinimo: asig.stockMinimo,
            almacen: asig.almacen,
          };
          if (asig.id) {
            await actualizarMaterial(asig.id, payload);
          } else {
            await crearMaterial(payload);
          }
        }
        mostrarToast('Material actualizado exitosamente', 'success');
      } else {
        // Creación: se crea un material por cada asignación.
        for (const asig of asignacionesPreparadas) {
          const payload = {
            nombre: nombre.trim(),
            categoria: categoria.trim(),
            unidad: unidad.trim(),
            precioUnitario: precioNum,
            cantidad: asig.cantidad,
            stockMinimo: asig.stockMinimo,
            almacen: asig.almacen,
          };
          await crearMaterial(payload);
        }
        mostrarToast('Material creado exitosamente', 'success');
      }

      // Recarga datos y limpia estados
      await cargarDatos();
      setMostrarModalEdicion(false);
      setMaterialEnEdicion(null);
    } catch (error) {
      console.error('Error al guardar el material:', error);
      // Extrae mensaje del error lanzado por manejarRespuestaJson
      const mensaje = error?.message || 'Error al guardar el material. Verifica la información o intenta de nuevo.';
      mostrarToast(mensaje, 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Handlers para eliminación de materiales
  // ─────────────────────────────────────────────────────────────
  const manejarClickEliminarMaterial = (material) => {
    setMaterialAEliminar(material);                                     // Abre el modal de confirmación para este material.
  };

  const manejarCancelarEliminacion = () => {
    if (estaEliminando) return;                                        // Evita cerrar si ya está eliminando.
    setMaterialAEliminar(null);                                        // Limpia el material objetivo.
  };

  const manejarConfirmarEliminacion = async () => {
    if (!materialAEliminar) return;                                    // Seguridad por si no hay material seleccionado.
    try {
      setEstaEliminando(true);                                         // Activa bandera de eliminación.
      await eliminarMaterial(materialAEliminar._id);                    // Elimina en backend.
      mostrarToast('Material eliminado exitosamente', 'success');
      await cargarDatos();                                             // Refresca la lista.
      setMaterialAEliminar(null);                                      // Cierra modal.
    } catch (error) {
      console.error('Error al eliminar el material:', error);
      mostrarToast('Error al eliminar el material', 'error');
    } finally {
      setEstaEliminando(false);                                        // Desactiva bandera.
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Handlers para ver detalle de material
  // ─────────────────────────────────────────────────────────────
  const manejarVerDetalleMaterial = (material) => {
    setMaterialDetalle(material);
  };

  const manejarCerrarDetalleMaterial = () => {
    setMaterialDetalle(null);
  };

  // ─────────────────────────────────────────────────────────────
  // Handlers para solicitud de nuevo material (rol líder)
  // ─────────────────────────────────────────────────────────────
  const manejarAbrirModalSolicitud = () => {
    setDatosSolicitudMaterial({
      nombrePropuesto: '',
      descripcion: '',
    });                                                                 // Reinicia el formulario de solicitud.
    setMostrarModalSolicitud(true);                                     // Abre el modal de solicitud.
  };

  const manejarCerrarModalSolicitud = () => {
    if (estaEnviandoSolicitud) return;                                 // Evita cerrar mientras envía.
    setMostrarModalSolicitud(false);                                    // Cierra el modal.
  };

  const manejarEnviarSolicitudMaterial = async () => {
    // Validación mínima: nombre del material propuesto obligatorio.
    if (!datosSolicitudMaterial.nombrePropuesto.trim()) {
      mostrarToast(
        'Debes indicar el nombre del material que deseas solicitar',
        'warning',
      );
      return;
    }

    try {
      setEstaEnviandoSolicitud(true);                                   // Activa bandera de envío.

      // Construye el payload de la solicitud (ajustable según backend).
      const payload = {
        tipo: 'material_nuevo',
        categoria: 'inventarios',
        titulo: `Solicitud de nuevo material: ${datosSolicitudMaterial.nombrePropuesto}`,
        descripcion: datosSolicitudMaterial.descripcion,
        nombreMaterialPropuesto: datosSolicitudMaterial.nombrePropuesto,
      };

      await crearSolicitud(payload);                                    // Envía la solicitud al backend.
      mostrarToast(
        'Solicitud de nuevo material enviada para revisión del administrador',
        'success',
      );
      setMostrarModalSolicitud(false);                                  // Cierra el modal.
    } catch (error) {
      console.error('Error al enviar la solicitud de material:', error);
      mostrarToast(
        'Error al enviar la solicitud de material. Intenta nuevamente.',
        'error',
      );
    } finally {
      setEstaEnviandoSolicitud(false);                                  // Desactiva bandera de envío.
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Derivados: categorías únicas y materiales filtrados
  // ─────────────────────────────────────────────────────────────
  const categorias = useMemo(() => {
    if (!Array.isArray(materiales)) return [];                          // Seguridad si materiales no es arreglo.
    const conjuntoCategorias = new Set(
      materiales
        .map((material) => material.categoria)                           // Extrae categorías.
        .filter(Boolean),                                                // Elimina null/undefined/''.
    );
    return Array.from(conjuntoCategorias).sort();                        // Devuelve arreglo ordenado alfabéticamente.
  }, [materiales]);

  const materialesFiltrados = useMemo(() => {
    if (!Array.isArray(materiales)) return [];                          // Seguridad.

    const termino = terminoBusqueda.toLowerCase();                      // Normaliza término de búsqueda.

    return materiales.filter((material) => {
      // Coincidencia por nombre o categoría.
      const coincideBusqueda =
        material.nombre?.toLowerCase().includes(termino) ||
        material.categoria?.toLowerCase().includes(termino);

      // Coincidencia de categoría.
      const coincideCategoria =
        filtroCategoria === 'todas' || material.categoria === filtroCategoria;

      // Coincidencia de almacén (tolerando objeto o string).
      const idAlmacenMaterial =
        typeof material.almacen === 'object'
          ? material.almacen?._id
          : material.almacen;

      const coincideAlmacen =
        filtroAlmacen === 'todos' || idAlmacenMaterial === filtroAlmacen;

      // Filtro de stock bajo.
      const coincideStockBajo =
        !filtrarStockBajo ||
        material.cantidad <= (material.stockMinimo ?? 0);

      // El material se incluye sólo si cumple todos los filtros.
      return (
        coincideBusqueda &&
        coincideCategoria &&
        coincideAlmacen &&
        coincideStockBajo
      );
    });
  }, [
    materiales,
    terminoBusqueda,
    filtroCategoria,
    filtroAlmacen,
    filtrarStockBajo,
  ]);

  // Calcula cuántos materiales tienen stock bajo.
  const cantidadMaterialesStockBajo = Array.isArray(materiales)
    ? materiales.filter(
        (m) => m.cantidad <= (m.stockMinimo ?? 0),
      ).length
    : 0;

  // ─────────────────────────────────────────────────────────────
  // Sugerencias para autocompletado en el formulario de material
  // ─────────────────────────────────────────────────────────────
  const sugerenciasNombre = useMemo(() => {
    if (!Array.isArray(materiales)) return [];
    const setNombres = new Set();
    materiales.forEach((mat) => {
      if (mat.nombre && typeof mat.nombre === 'string') {
        setNombres.add(mat.nombre.trim());
      }
    });
    return Array.from(setNombres).sort((a, b) => a.localeCompare(b));
  }, [materiales]);

  const sugerenciasCategoria = useMemo(() => {
    if (!Array.isArray(materiales)) return [];
    const setCategorias = new Set();
    materiales.forEach((mat) => {
      if (mat.categoria && typeof mat.categoria === 'string') {
        setCategorias.add(mat.categoria.trim());
      }
    });
    return Array.from(setCategorias).sort((a, b) => a.localeCompare(b));
  }, [materiales]);

  const sugerenciasUnidad = useMemo(() => {
    if (!Array.isArray(materiales)) return [];
    const setUnidades = new Set();
    materiales.forEach((mat) => {
      if (mat.unidad && typeof mat.unidad === 'string') {
        setUnidades.add(mat.unidad.trim());
      }
    });
    return Array.from(setUnidades).sort((a, b) => a.localeCompare(b));
  }, [materiales]);

  // ─────────────────────────────────────────────────────────────
  // Estados de carga y error a nivel de vista completa
  // ─────────────────────────────────────────────────────────────
  if (estaCargando) {
    // Muestra un spinner centrado mientras se cargan los datos.
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-pcm-primary" size={48} />
      </div>
    );
  }

  if (mensajeError) {
    // Muestra un panel de error con opción de reintentar.
    return (
      <div className="bg-red-500/10 border border-red-500/60 rounded-pcm-xl p-6 text-center">
        <p className="text-red-300 text-lg mb-2">
          Error al cargar materiales
        </p>
        <p className="text-red-400 text-sm mb-4">{mensajeError}</p>
        <button
          type="button"
          onClick={cargarDatos}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition duration-150"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Render principal de la vista cuando ya se cargaron los datos
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Contenedor de notificaciones (toasts) en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {notificaciones.map((toast) => (
          <NotificacionToast
            key={toast.id}
            mensaje={toast.mensaje}
            tipo={toast.tipo}
            alCerrar={() => cerrarToast(toast.id)}
          />
        ))}
      </div>

      {/* Modal de confirmación de eliminación de material */}
      {materialAEliminar && (
        <ModalEliminarMaterial
          estaAbierto={!!materialAEliminar}
          nombreMaterial={materialAEliminar.nombre}
          alConfirmar={manejarConfirmarEliminacion}
          alCancelar={manejarCancelarEliminacion}
          estaCargando={estaEliminando}
          detalleMaterial={{
            cantidad: materialAEliminar.cantidad,
            almacenNombre:
              typeof materialAEliminar.almacen === 'object'
                ? materialAEliminar.almacen?.nombre || ''
                : '',
          }}
        />
      )}

      {/* Modal para crear/editar material */}
      <ModalEdicionMaterial
        estaAbierto={mostrarModalEdicion}
        alCerrar={manejarCerrarModalEdicion}
        alGuardar={manejarGuardarMaterial}
        datosFormulario={datosFormularioMaterial}
        actualizarDatosFormulario={setDatosFormularioMaterial}
        almacenes={almacenes}
        materialEnEdicion={materialEnEdicion}
        sugerenciasNombre={sugerenciasNombre}
        sugerenciasCategoria={sugerenciasCategoria}
        sugerenciasUnidad={sugerenciasUnidad}
      />

      {/* Modal de detalle de material */}
      {materialDetalle && (
        <ModalDetalleMaterial
          estaAbierto={!!materialDetalle}
          material={materialDetalle}
          alCerrar={manejarCerrarDetalleMaterial}
        />
      )}

      {/* Modal autónomo para que el líder solicite un nuevo material */}
      {mostrarModalSolicitud && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) {
              manejarCerrarModalSolicitud();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-solicitud-material-titulo"
            className={`
              w-full max-w-lg
              rounded-pcm-xl
              bg-pcm-surfaceSoft/95
              shadow-pcm-soft
              border border-white/10
              animate-scale-in
              pcm-panel pcm-panel-fondo pcm-panel--${rolVisualPanel}
            `}
          >
            <div className="p-6">
              {/* Cabecera del contenido de la solicitud */}
              <div className="mb-6">
                <h3
                  id="modal-solicitud-material-titulo"
                  className="text-2xl font-semibold text-pcm-text mb-2"
                >
                  Solicitar nuevo material
                </h3>
                <p className="text-pcm-muted text-sm">
                  Diligencia la información del material que necesitas para que el
                  administrador evalúe y apruebe su creación en el sistema.
                </p>
              </div>

              {/* Formulario simple de solicitud */}
              <div className="space-y-4">
                {/* Campo: nombre del material propuesto */}
                <div>
                  <label className="block text-pcm-text text-sm font-semibold mb-2">
                    Nombre del material solicitado *
                  </label>
                  <input
                    type="text"
                    value={datosSolicitudMaterial.nombrePropuesto}
                    onChange={(evento) =>
                      setDatosSolicitudMaterial({
                        ...datosSolicitudMaterial,
                        nombrePropuesto: evento.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                               text-pcm-text placeholder-slate-400
                               focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                    placeholder="Ej: Concreto MR-38, Tubo PVC 4'' sanitario, etc."
                  />
                </div>

                {/* Campo: descripción / justificación */}
                <div>
                  <label className="block text-pcm-text text-sm font-semibold mb-2">
                    Descripción / Justificación
                  </label>
                  <textarea
                    rows={4}
                    value={datosSolicitudMaterial.descripcion}
                    onChange={(evento) =>
                      setDatosSolicitudMaterial({
                        ...datosSolicitudMaterial,
                        descripcion: evento.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                               text-pcm-text placeholder-slate-400
                               focus:outline-none focus:ring-2 focus:ring-pcm-primary/60
                               resize-none"
                    placeholder="Describe brevemente por qué necesitas este material, en qué proyecto o actividad se utilizará, etc."
                  />
                </div>
              </div>

              {/* Pie del modal con botones de cancelar y enviar solicitud */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={manejarCerrarModalSolicitud}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10
                             hover:bg-white/10 text-pcm-text rounded-lg
                             text-sm font-semibold transition duration-150
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={estaEnviandoSolicitud}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={manejarEnviarSolicitudMaterial}
                  className="flex-1 px-4 py-2
                             bg-pcm-primary hover:bg-pcm-secondary
                             text-white rounded-lg text-sm font-semibold
                             transition duration-150 hover:scale-105 shadow-pcm-soft
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={estaEnviandoSolicitud}
                >
                  {estaEnviandoSolicitud ? 'Enviando solicitud…' : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor principal de la tarjeta de materiales */}
      <div
        className={`
          bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl
          border border-white/10 shadow-pcm-soft
          pcm-panel pcm-panel-fondo pcm-panel--${rolVisualPanel}
        `}
      >
        {/* Cabecera de la tarjeta: título, indicadores y acciones según rol */}
        <div className="p-6 border-b border-white/10 pcm-panel-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Título e indicador de módulo */}
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl bg-pcm-primary
                           flex items-center justify-center shadow-pcm-soft"
              >
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-pcm-text">
                  Gestión de materiales
                </h3>
                <p className="text-pcm-muted text-sm">
                  Controla tu inventario por almacén, stock mínimo y movimientos.
                </p>
              </div>
            </div>

            {/* Indicadores y botones de acción (dependen del rol) */}
            <div className="flex flex-wrap items-center gap-3 justify-end">
              {/* Indicador de stock bajo si hay al menos un material en esa condición */}
              {cantidadMaterialesStockBajo > 0 && (
                <div
                  className="flex items-center gap-2 bg-amber-500/15
                             border border-amber-400/40 px-3 py-1.5
                             rounded-full"
                >
                  <AlertTriangle className="text-amber-300" size={18} />
                  <span className="text-amber-200 text-xs font-semibold">
                    {cantidadMaterialesStockBajo} con stock bajo
                  </span>
                </div>
              )}

              {/* Botón para solicitar nuevo material (rol líder, no admin) */}
              {esLiderObra && !esAdmin && (
                <button
                  type="button"
                  onClick={manejarAbrirModalSolicitud}
                  className="flex items-center gap-2 px-4 py-2
                             bg-orange-500 hover:bg-orange-600
                             text-white rounded-lg text-sm font-semibold
                             transition-all shadow-pcm-soft"
                >
                  <ClipboardList size={18} />
                  Solicitar nuevo material
                </button>
              )}

              {/* Botón para crear nuevo material (solo admin) */}
              {esAdmin && (
                <button
                  type="button"
                  onClick={manejarAbrirCrearMaterial}
                  className="flex items-center gap-2 px-4 py-2
                             bg-pcm-primary hover:bg-pcm-secondary
                             text-white rounded-lg text-sm font-semibold
                             transition-all shadow-pcm-soft"
                >
                  <Plus size={18} />
                  Nuevo material
                </button>
              )}
            </div>
          </div>

          {/* Filtros de búsqueda, categoría y almacén */}
          <div className="mt-6 flex flex-col gap-4">
            {/* Primera fila: búsqueda + filtro por categoría */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Campo de búsqueda */}
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre o categoría..."
                  value={terminoBusqueda}
                  onChange={(evento) => setTerminoBusqueda(evento.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-pcm-text placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                />
              </div>

              {/* Filtro por categoría */}
              <div className="relative">
                <Filter
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <select
                  value={filtroCategoria}
                  onChange={(evento) => setFiltroCategoria(evento.target.value)}
                  className="pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-pcm-text focus:outline-none focus:ring-2
                             focus:ring-pcm-primary/60 appearance-none cursor-pointer"
                >
                  <option value="todas" className="bg-pcm-surfaceSoft">
                    Todas las categorías
                  </option>
                  {categorias.map((categoria) => (
                    <option
                      key={categoria}
                      value={categoria}
                      className="bg-pcm-surfaceSoft"
                    >
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Segunda fila: filtro por almacén + toggle de stock bajo */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Filtro por almacén */}
              <div className="relative">
                <IconoAlmacen
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <select
                  value={filtroAlmacen}
                  onChange={(evento) => setFiltroAlmacen(evento.target.value)}
                  className="pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-pcm-text focus:outline-none focus:ring-2
                             focus:ring-pcm-primary/60 appearance-none cursor-pointer"
                >
                  <option value="todos" className="bg-pcm-surfaceSoft">
                    Todos los almacenes
                  </option>
                  {almacenes.map((almacen) => (
                    <option
                      key={almacen._id}
                      value={almacen._id}
                      className="bg-pcm-surfaceSoft"
                    >
                      {almacen.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón para activar/desactivar filtro de stock bajo */}
              <button
                type="button"
                onClick={() => setFiltrarStockBajo(!filtrarStockBajo)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-semibold transition-all
                  ${
                    filtrarStockBajo
                      ? 'bg-amber-500 text-white shadow-pcm-soft'
                      : 'bg-white/5 border border-white/10 text-pcm-text hover:bg-white/10'
                  }
                `}
              >
                {filtrarStockBajo ? '✓ ' : ''}
                Stock bajo
              </button>
            </div>
          </div>

          {/* Texto resumen: cuántos materiales se están mostrando */}
          <div className="mt-3 text-sm text-pcm-muted">
            Mostrando {materialesFiltrados.length} de {materiales.length}{' '}
            materiales
          </div>
        </div>

        {/* Tabla de materiales */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-pcm-bg/40">
                <th className="text-left p-4 text-pcm-muted font-semibold">
                  Material
                </th>
                <th className="text-left p-4 text-pcm-muted font-semibold">
                  Categoría
                </th>
                <th className="text-left p-4 text-pcm-muted font-semibold">
                  Almacén
                </th>
                <th className="text-left p-4 text-pcm-muted font-semibold">
                  Stock
                </th>
                <th className="text-left p-4 text-pcm-muted font-semibold">
                  Precio unit.
                </th>
                <th className="text-left p-4 text-pcm-muted font-semibold">
                  Unidad
                </th>
                <th className="text-left p-4 text-pcm-muted font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {materialesFiltrados.length > 0 ? (
                materialesFiltrados.map((material) => {
                  // Determina si el material está en condición de stock bajo.
                  const stockBajo =
                    material.cantidad <= (material.stockMinimo ?? 0);

                  // Calcula nombre del almacén según si viene como objeto o string.
                  const nombreAlmacen =
                    typeof material.almacen === 'object' &&
                    material.almacen !== null
                      ? material.almacen.nombre || 'Sin asignar'
                      : material.almacen || 'Sin asignar';

                  return (
                    <tr
                      key={material._id}
                      className="border-b border-white/5 hover:bg-pcm-bg/40 transition duration-150"
                    >
                      {/* Columna: nombre de material */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Package className="text-pcm-primary" size={18} />
                          <span className="text-pcm-text font-semibold">
                            {material.nombre}
                          </span>
                        </div>
                      </td>

                      {/* Columna: categoría */}
                      <td className="p-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-semibold
                                     bg-purple-600/30 text-purple-200"
                        >
                          {material.categoria || 'Sin categoría'}
                        </span>
                      </td>

                      {/* Columna: almacén */}
                      <td className="p-4 text-pcm-muted">
                        {nombreAlmacen}
                      </td>

                      {/* Columna: stock actual vs mínimo */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {stockBajo && (
                            <AlertTriangle
                              className="text-amber-300"
                              size={16}
                            />
                          )}
                          <span
                            className={`font-semibold ${
                              stockBajo ? 'text-amber-300' : 'text-emerald-300'
                            }`}
                          >
                            {material.cantidad}
                          </span>
                          <span className="text-pcm-muted text-xs">
                            / {material.stockMinimo ?? 0} mín
                          </span>
                        </div>
                      </td>

                      {/* Columna: precio unitario */}
                      <td className="p-4 text-pcm-muted">
                        <div className="flex items-center gap-1">
                          <DollarSign className="text-emerald-400" size={16} />
                          <span>
                            {material.precioUnitario
                              ? material.precioUnitario.toFixed(2)
                              : '0.00'}
                          </span>
                        </div>
                      </td>

                      {/* Columna: unidad */}
                      <td className="p-4 text-pcm-muted">
                        {material.unidad || 'unidad'}
                      </td>

                      {/* Columna: acciones (depende del rol) */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {/* Botón para ver movimientos (disponible para ambos roles) */}
                          <button
                            type="button"
                            onClick={() => setMaterialSeleccionado(material)}
                            className="px-3 py-1 rounded-lg border border-white/10
                                       text-pcm-text text-xs font-semibold
                                       hover:bg-white/10 flex items-center gap-1
                                       transition duration-150"
                          >
                            <ClipboardList size={14} />
                            Movimientos
                          </button>

                          {/* Botón para ver detalle del material (disponible para admin y líder) */}
                          <button
                            type="button"
                            onClick={() => manejarVerDetalleMaterial(material)}
                            className="px-3 py-1 rounded-lg border border-white/10
                                       text-pcm-text text-xs font-semibold
                                       hover:bg-white/10 flex items-center gap-1
                                       transition duration-150"
                          >
                            <Info size={14} />
                            Detalle
                          </button>

                          {/* Botones de editar/eliminar: sólo admin */}
                          {esAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  manejarAbrirEditarMaterial(material)
                                }
                                className="px-3 py-1 bg-pcm-primary hover:bg-pcm-secondary
                                           text-white rounded-lg text-xs font-semibold
                                           transition duration-150"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  manejarClickEliminarMaterial(material)
                                }
                                className="px-3 py-1 bg-red-600 hover:bg-red-700
                                           text-white rounded-lg text-xs font-semibold
                                           transition duration-150"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Caso: no se encontraron materiales según filtros.
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-pcm-muted"
                  >
                    {materiales.length === 0
                      ? 'No hay materiales registrados. Si eres administrador, crea un material para comenzar.'
                      : 'No se encontraron materiales con los filtros seleccionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de historial de movimientos de un material específico */}
      {materialSeleccionado && (
        <ModalMovimientosMaterial
          materialSeleccionado={materialSeleccionado}
          alCerrar={() => setMaterialSeleccionado(null)}
        />
      )}
    </>
  );
};

// Exporta la vista por defecto para integrarla en el enrutador del dashboard.
export default VistaMateriales;
