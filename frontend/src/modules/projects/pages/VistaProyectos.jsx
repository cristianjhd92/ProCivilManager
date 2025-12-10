// File: frontend/src/modules/projects/pages/VistaProyectos.jsx
// Description: Vista de listado y gestión de proyectos. Incluye filtros
//              avanzados, descarga en PDF y acciones condicionadas al
//              rol (admin / líder / cliente / auditor). Se integra con el modal
//              global de creación/edición de proyectos a través de callbacks
//              hacia el Tablero de Trabajo y aplica el tema visual PCM (paleta `pcm`,
//              helpers de botones, animaciones y helpers de panel por rol
//              (.pcm-panel, .pcm-panel--ROL, .pcm-panel-fondo, .pcm-panel-header)).

import React, { useState, useMemo } from 'react';                   // Importa React y los hooks useState/useMemo para estado y cálculos memorizados.

// Importa íconos desde lucide-react para mejorar la UI.
import {
  Search,                                                           // Ícono de lupa para el campo de búsqueda.
  Filter,                                                           // Ícono de filtro para el encabezado.
  Calendar,                                                         // Ícono para filtros de fecha.
  TrendingUp,                                                       // Ícono para filtros y barras de progreso.
  DollarSign,                                                       // Ícono para filtros de presupuesto.
  X,                                                                // Ícono para cerrar / limpiar filtros.
  FileDown,                                                         // Ícono de descarga de PDF.
  MapPin,                                                           // Ícono de ubicación.
  Eye,                                                              // Ícono de ver detalles.
  Edit,                                                             // Ícono de editar.
  Trash2,                                                           // Ícono de eliminar.
  PlusCircle,                                                       // Ícono de crear nuevo proyecto.
  ChevronDown                                                       // Ícono de flecha para indicar listas desplegables.
} from 'lucide-react';

// Importa la función de servicio para descargar en PDF la lista de proyectos.
import { descargarProyectosPDF } from '../../../services/api/api.js';   // Servicio HTTP que genera y descarga el PDF de proyectos desde el backend.

/**
 * Componente principal de la vista de proyectos (VistaProyectos).
 *
 * Props:
 *  - projects:          Array de proyectos recibidos desde el padre (TableroTrabajo).
 *  - proyectos:         Alias opcional (para compatibilidad con versiones anteriores).
 *  - onViewDetails:     Función para ver detalles de un proyecto.
 *  - onEditProject:     Función para lanzar el flujo de edición de un proyecto.
 *  - onDeleteProject:   Función para iniciar el flujo de eliminación de un proyecto.
 *  - onCreateProject:   Función para iniciar el flujo de creación (abre modal global en el Tablero).
 */
const VistaProyectos = ({
  projects = [],                                                    // Lista de proyectos (nombre nuevo recomendado).
  proyectos = [],                                                   // Alias compatible con versiones anteriores.
  onViewDetails,                                                    // Callback para ver detalles de un proyecto.
  onEditProject,                                                    // Callback para editar un proyecto.
  onDeleteProject,                                                  // Callback para iniciar eliminación de un proyecto.
  onCreateProject                                                   // Callback para iniciar creación (modal global en Tablero).
}) => {
  // =========================
  // Fuente base de proyectos
  // =========================

  const proyectosBase = useMemo(() => {
    // Toma primero la prop `projects` si es un arreglo; si no, usa `proyectos`; si tampoco, devuelve arreglo vacío.
    if (Array.isArray(projects) && projects.length > 0) return projects;
    if (Array.isArray(proyectos) && proyectos.length > 0) return proyectos;
    return [];                                                      // Fallback seguro.
  }, [projects, proyectos]);

  // =========================
  // Estados de filtros y UI
  // =========================

  const [searchTerm, setSearchTerm] = useState('');                 // Texto de búsqueda general (título, correo, dirección).
  const [typeFilter, setTypeFilter] = useState('todos');            // Filtro por tipo de proyecto (o "todos").
  const [progressFilter, setProgressFilter] = useState('todos');    // Filtro por rango de progreso.
  const [budgetFilter, setBudgetFilter] = useState('todos');        // Filtro por rango de presupuesto.
  const [dateFilter, setDateFilter] = useState('todos');            // Filtro por fecha de creación (rango relativo).
  // Filtros para mes y año específicos
  const [monthFilter, setMonthFilter] = useState('todos');          // Permite filtrar los proyectos por mes de la fecha de inicio/creación.
  const [yearFilter, setYearFilter] = useState('todos');            // Permite filtrar los proyectos por año de la fecha de inicio/creación.

  // Estados para controlar la apertura de los menús de mes y año
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState('todos');    // Filtro por ubicación geográfica.
  const [showFilters, setShowFilters] = useState(false);            // Bandera para mostrar/ocultar filtros avanzados.

  // Estados para controlar apertura de cada dropdown personalizado.
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);      // Controla el menú de tipo de proyecto.
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false); // Controla el menú de ubicación.
  const [isProgressMenuOpen, setIsProgressMenuOpen] = useState(false); // Controla el menú de progreso.
  const [isBudgetMenuOpen, setIsBudgetMenuOpen] = useState(false);  // Controla el menú de presupuesto.
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);      // Controla el menú de fecha.

  // =========================
  // Rol del usuario (permisos + colores por rol)
  // =========================

  let userRole = '';                                                // Variable local que almacenará el rol detectado del usuario actual.

  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}'); // Intenta leer el usuario guardado en localStorage y parsear JSON.
    userRole = storedUser.role || '';                               // Extrae el rol del usuario o cadena vacía si no existe.
  } catch (e) {
    userRole = '';                                                  // Si falla el parseo, se deja el rol vacío para no romper la vista.
  }

  const isAdmin = userRole === 'admin';                             // Bandera booleana: indica si el usuario es administrador.
  const isLeader =                                                   // Bandera booleana: indica si el usuario es líder de obra.
    userRole === 'lider de obra' || userRole === 'lider';
  const isClient = userRole === 'cliente';                          // Bandera booleana: indica si el usuario es cliente.
  const isAuditor = userRole === 'auditor';                         // Bandera booleana: indica si el usuario es auditor (rol interno de revisión).

  // Clase de panel por rol para adaptar colores de la UI interna (barras, bordes, fondos destacados).
  const panelRoleClass =                                            // Calcula la clase modificadora según el rol actual.
    isAdmin
      ? 'pcm-panel--admin'                                          // Para administradores, usa esquema de color definido en .pcm-panel--admin.
      : isLeader
      ? 'pcm-panel--lider'                                          // Para líderes de obra, esquema de color .pcm-panel--lider.
      : isClient
      ? 'pcm-panel--cliente'                                        // Para clientes, esquema .pcm-panel--cliente.
      : isAuditor
      ? 'pcm-panel--auditor'                                        // Para auditores, esquema .pcm-panel--auditor.
      : '';                                                         // Si no se reconoce el rol, no se añade modificador (usa esquema neutro de .pcm-panel).

  // =========================
  // Lista de proyectos base
  // =========================

  /**
   * allProjects representa la lista de proyectos efectiva para la vista.
   * En esta versión se usa directamente lo que viene del TableroTrabajo,
   * que ya se encarga de mantenerla sincronizada con el backend.
   */
  const allProjects = useMemo(() => {
    return Array.isArray(proyectosBase) ? proyectosBase : [];       // Garantiza que siempre sea un arreglo.
  }, [proyectosBase]);                                              // Se recalcula si cambia la fuente base.

  // =========================
  // Valores únicos para filtros
  // =========================

  const projectTypes = useMemo(() => {
    const baseProjects = Array.isArray(allProjects) ? allProjects : []; // Asegura que allProjects sea un arreglo.
    const types = [                                                // Construye arreglo de tipos únicos.
      ...new Set(                                                  // Usa Set para eliminar duplicados.
        baseProjects
          .map((p) => p?.type)                                     // Extrae la propiedad type de cada proyecto.
          .filter(Boolean)                                         // Elimina tipos vacíos o no definidos.
      )
    ];
    return types;                                                  // Devuelve el arreglo de tipos únicos.
  }, [allProjects]);                                               // Se recalcula si cambia la lista de proyectos.

  const projectLocations = useMemo(() => {
    const baseProjects = Array.isArray(allProjects) ? allProjects : []; // Asegura que allProjects sea un arreglo.
    const locations = [                                            // Construye arreglo de ubicaciones únicas.
      ...new Set(
        baseProjects
          .map((p) => p?.location)                                 // Extrae la propiedad location.
          .filter(Boolean)                                         // Elimina ubicaciones no definidas.
      )
    ];
    return locations.sort();                                       // Devuelve las ubicaciones ordenadas alfabéticamente.
  }, [allProjects]);                                               // Se recalcula cuando cambia la lista de proyectos.

  // =========================
  // Valores únicos para filtros de año
  // =========================
  const projectYears = useMemo(() => {
    const baseProjects = Array.isArray(allProjects) ? allProjects : [];
    const yearsSet = new Set();
    baseProjects.forEach((p) => {
      const fechaReferencia = p?.startDate || p?.createdAt;
      if (fechaReferencia) {
        const d = new Date(fechaReferencia);
        if (!isNaN(d)) {
          yearsSet.add(d.getFullYear());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // Ordena de mayor a menor (años recientes primero)
  }, [allProjects]);

  // =========================
  // Etiquetas visibles para dropdowns
  // =========================

  const currentTypeLabel =
    typeFilter === 'todos'
      ? 'Todos'
      : projectTypes.includes(typeFilter)
        ? typeFilter
        : 'Todos';

  const currentLocationLabel =
    locationFilter === 'todos'
      ? 'Todas'
      : projectLocations.includes(locationFilter)
        ? locationFilter
        : 'Todas';

  const currentProgressLabel = (() => {
    if (progressFilter === 'iniciado') return 'Iniciado (0-24%)';   // Etiqueta para rango "iniciado".
    if (progressFilter === 'en-proceso') return 'En proceso (25-74%)'; // Etiqueta para rango "en proceso".
    if (progressFilter === 'avanzado') return 'Avanzado (75-99%)';  // Etiqueta para rango "avanzado".
    if (progressFilter === 'completado') return 'Completado (100%)'; // Etiqueta para rango "completado".
    return 'Todos';                                                 // Valor por defecto.
  })();

  const currentBudgetLabel = (() => {
    if (budgetFilter === 'bajo') return 'Bajo (< $50.000)';         // Etiqueta para presupuesto bajo.
    if (budgetFilter === 'medio') return 'Medio ($50K - $200K)';    // Etiqueta para presupuesto medio.
    if (budgetFilter === 'alto') return 'Alto (> $200.000)';        // Etiqueta para presupuesto alto.
    return 'Todos';                                                 // Valor por defecto.
  })();

  const currentDateLabel = (() => {
    if (dateFilter === 'semana') return 'Última semana';            // Etiqueta para filtro semana.
    if (dateFilter === 'mes') return 'Último mes';                  // Etiqueta para filtro mes.
    if (dateFilter === 'trimestre') return 'Último trimestre';      // Etiqueta para filtro trimestre.
    if (dateFilter === 'ultimos3meses') return 'Últimos 3 meses';   // Etiqueta para filtro últimos tres meses.
    if (dateFilter === 'ultimoAnio') return 'Último año';           // Etiqueta para filtro último año.
    return 'Todos';                                                 // Valor por defecto.
  })();

  // Etiquetas visibles para filtros de mes y año
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ];
  const currentMonthLabel =
    monthFilter === 'todos'
      ? 'Todos'
      : monthNames[Number(monthFilter) - 1] || 'Todos';
  const currentYearLabel = yearFilter === 'todos' ? 'Todos' : String(yearFilter);

  // =========================
  // Filtrado de proyectos
  // =========================

  /**
   * filteredProjects aplica todos los filtros seleccionados
   * sobre la lista allProjects.
   */
  const filteredProjects = useMemo(() => {
    const baseProjects = Array.isArray(allProjects) ? allProjects : []; // Normaliza allProjects a un arreglo seguro.

    return baseProjects.filter((project) => {                        // Filtra proyecto por proyecto según todos los criterios.
      const search = searchTerm.toLowerCase();                      // Convierte el texto de búsqueda a minúsculas para comparar.

      const matchesSearch =                                         // Determina si el proyecto coincide con el texto de búsqueda.
        !searchTerm ||                                              // Si no hay término, siempre coincide.
        project.title?.toLowerCase().includes(search) ||            // Coincidencia en el título.
        project.email?.toLowerCase().includes(search) ||            // Coincidencia en el correo del cliente.
        project.location?.toLowerCase().includes(search);           // Coincidencia en la ubicación.

      const matchesType =                                           // Determina si coincide con el filtro de tipo.
        typeFilter === 'todos' || project.type === typeFilter;

      const matchesLocation =                                       // Determina si coincide con el filtro de ubicación.
        locationFilter === 'todos' || project.location === locationFilter;

      let matchesProgress = true;                                   // Inicialmente asumimos que coincide en progreso.
      const progress = Number(project.progress) || 0;               // Normaliza el progreso a número (0 si no hay).

      if (progressFilter === 'iniciado') {                          // Rango "iniciado": entre 0 y 24%.
        matchesProgress = progress >= 0 && progress < 25;
      } else if (progressFilter === 'en-proceso') {                 // Rango "en proceso": entre 25 y 74%.
        matchesProgress = progress >= 25 && progress < 75;
      } else if (progressFilter === 'avanzado') {                   // Rango "avanzado": entre 75 y 99%.
        matchesProgress = progress >= 75 && progress < 100;
      } else if (progressFilter === 'completado') {                 // Filtro "completado": exactamente 100%.
        matchesProgress = progress === 100;
      }

      let matchesBudget = true;                                     // Inicializa coincidencia en presupuesto.
      const budget = Number(project.budget) || 0;                   // Normaliza el presupuesto a número (0 si no hay).

      if (budgetFilter === 'bajo') {                                // Presupuesto "bajo": menor de 50.000.
        matchesBudget = budget < 50000;
      } else if (budgetFilter === 'medio') {                        // Presupuesto "medio": entre 50.000 y 200.000.
        matchesBudget = budget >= 50000 && budget < 200000;
      } else if (budgetFilter === 'alto') {                         // Presupuesto "alto": desde 200.000 en adelante.
        matchesBudget = budget >= 200000;
      }

      let matchesDate = true;                                       // Inicializa coincidencia de fecha de creación.

      // Coincidencia para mes y año (filtros adicionales)
      let matchesMonth = true;
      let matchesYear = true;

      // Para el filtro por fecha usamos la fecha de inicio (startDate) si está disponible; si no,
      // se usa la fecha de creación como valor de respaldo. Esto permite que los listados y
      // filtros de "recientes" se basen en la fecha real en que inicia el proyecto y no en
      // cuándo se insertó en la base de datos.
      const fechaReferencia = project.startDate || project.createdAt;
      if (fechaReferencia) {
        const projectDate = new Date(fechaReferencia);
        const now = new Date();
        const diffDays = Math.floor((now - projectDate) / (1000 * 60 * 60 * 24));

        // Aplicar filtro de rango de fechas relativo
        if (dateFilter !== 'todos') {
          if (dateFilter === 'semana') {
            // Última semana: 7 días o menos
            matchesDate = diffDays <= 7;
          } else if (dateFilter === 'mes') {
            // Último mes: 30 días o menos
            matchesDate = diffDays <= 30;
          } else if (dateFilter === 'trimestre') {
            // Último trimestre: 90 días o menos
            matchesDate = diffDays <= 90;
          } else if (dateFilter === 'ultimos3meses') {
            // Últimos 3 meses: 90 días o menos (equivalente a trimestre)
            matchesDate = diffDays <= 90;
          } else if (dateFilter === 'ultimoAnio') {
            // Último año: 365 días o menos
            matchesDate = diffDays <= 365;
          }
        }

        // Aplicar filtro por mes específico
        if (monthFilter !== 'todos') {
          const monthNumber = projectDate.getMonth() + 1; // Mes 1-12
          matchesMonth = monthNumber === Number(monthFilter);
        }

        // Aplicar filtro por año específico
        if (yearFilter !== 'todos') {
          const yearNumber = projectDate.getFullYear();
          matchesYear = yearNumber === Number(yearFilter);
        }
      }

      return (
        matchesSearch &&
        matchesType &&
        matchesProgress &&
        matchesBudget &&
        matchesDate &&
        matchesLocation &&
        matchesMonth &&
        matchesYear
      );
    });
  }, [
    allProjects,                                                    // Recalcular si cambia la lista de proyectos.
    searchTerm,                                                     // O si cambia el texto de búsqueda.
    typeFilter,                                                     // O filtros de tipo...
    progressFilter,                                                 // ...progreso...
    budgetFilter,                                                   // ...presupuesto...
    dateFilter,                                                     // ...fecha...
    locationFilter,                                                 // ...o ubicación.
    monthFilter,                                                    // ...mes específico.
    yearFilter                                                     // ...año específico.
  ]);

  // =========================
  // Limpiar filtros
  // =========================

  const clearFilters = () => {                                      // Función que restablece todos los filtros a su valor inicial.
    setSearchTerm('');                                              // Limpia texto de búsqueda.
    setTypeFilter('todos');                                         // Reset tipo.
    setProgressFilter('todos');                                     // Reset progreso.
    setBudgetFilter('todos');                                       // Reset presupuesto.
    setDateFilter('todos');                                         // Reset fecha.
    setLocationFilter('todos');                                     // Reset ubicación.
    setMonthFilter('todos');                                        // Reset mes.
    setYearFilter('todos');                                         // Reset año.
  };

  const hasActiveFilters =                                          // Bandera que indica si hay al menos un filtro activo.
    searchTerm ||
    typeFilter !== 'todos' ||
    progressFilter !== 'todos' ||
    budgetFilter !== 'todos' ||
    dateFilter !== 'todos' ||
    locationFilter !== 'todos' ||
    monthFilter !== 'todos' ||
    yearFilter !== 'todos';

  // =========================
  // Descargar proyectos en PDF
  // =========================

  const handleDownloadPDF = async () => {                           // Maneja la descarga del PDF de proyectos.
    try {
      await descargarProyectosPDF();                                // Llama la función de servicio que dispara la descarga desde el backend.
    } catch (error) {
      console.error('Error al descargar PDF:', error);              // Loguea en consola si la descarga falla.
    }
  };

  // =========================
  // Integración con creación de proyectos (modal global en Tablero)
  // =========================

  const handleOpenCreateModal = () => {                             // Maneja el clic en "Nuevo proyecto".
    try {
      if (typeof onCreateProject === 'function') {                  // Verifica que el padre haya pasado un callback.
        onCreateProject();                                          // Delegación al Tablero: abre modal global en modo "nuevo".
      }
    } catch (err) {
      console.error('Error en onCreateProject al abrir creación de proyecto:', err); // Log de error defensivo.
    }
  };

  // =========================
  // Handler para ver detalle de proyecto
  // =========================

  const manejarVerDetalleProyecto = (project) => {                  // Maneja el clic en "Ver detalles" de una tarjeta.
    if (!project) {                                                 // Si no llega un proyecto válido...
      console.warn('VistaProyectos: se intentó ver detalle sin proyecto.'); // Muestra advertencia en consola para depuración.
      return;                                                       // Sale sin hacer nada.
    }

    if (typeof onViewDetails !== 'function') {                      // Si el callback no está definido o no es función...
      console.warn(
        'VistaProyectos: onViewDetails no está definido. No se puede abrir el modal de detalle.',
        project                                                     // Muestra también el proyecto para revisar qué llega.
      );
      return;                                                       // No intenta llamar algo indefinido.
    }

    onViewDetails(project);                                         // Si todo está bien, delega al Tablero para abrir el modal de detalle.
  };

  // =========================
  // Render principal
  // =========================

  return (
    <div
      className={`space-y-6 animate-fade-in-soft pcm-panel pcm-panel-fondo ${panelRoleClass}`} // Contenedor principal con espaciado vertical, animación suave y helpers de panel por rol.
    >
      {/* Panel de filtros principal */}
      <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10 shadow-pcm-soft animate-slide-up-soft">
        {/* Encabezado del panel de filtros: título + botones de acciones rápidas */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 mb-4 pcm-panel-header"
        >
          {/* Contenedor de título de filtros y botón de mostrar/ocultar */}
          <div className="flex items-center gap-2">
            <Filter size={20} />                                      {/* Ícono de filtros a la izquierda del título. */}
            <h3 className="text-lg font-semibold text-pcm-text">
              Filtros de búsqueda
            </h3>
            {/* Botón para mostrar/ocultar filtros avanzados ubicado junto al título */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="text-pcm-muted hover:text-pcm-text text-sm transition duration-150 ml-2"
            >
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
          </div>

          {/* Botones de acciones en el encabezado (crear proyecto y descargar PDF) */}
          <div className="flex items-center gap-3">
            {/* Botón para crear proyecto: sólo visible para admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="pcm-btn-primary inline-flex items-center gap-2 text-sm font-semibold"
              >
                <PlusCircle size={18} />
                Nuevo proyecto
              </button>
            )}

            {/* Botón para descargar PDF de proyectos */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-pcm-accent hover:bg-pcm-primary
                         text-white rounded-pcm-xl shadow-pcm-soft text-sm font-semibold
                         transition-all duration-150 hover:scale-105"
            >
              <FileDown size={18} />
              Descargar PDF
            </button>
          </div>
        </div>

        {/* Campo de búsqueda principal con ícono de lupa */}
        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-pcm-muted" // Posiciona el ícono dentro del input.
            size={20}                                              // Tamaño del ícono de búsqueda.
          />
          <input
            type="text"                                            // Campo de texto estándar.
            placeholder="Buscar por título, cliente o dirección..." // Placeholder explicativo para el usuario.
            value={searchTerm}                                     // Valor controlado del input.
            onChange={(e) => setSearchTerm(e.target.value)}        // Actualiza el estado de búsqueda al escribir.
            className="w-full pl-10 pr-4 py-2 bg-pcm-bg/60 border border-white/10 rounded-xl
                       text-pcm-text placeholder-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
          />
        </div>

        {/* Filtros adicionales (solo se muestran cuando showFilters es true) */}
        {showFilters && (                                           // Solo renderiza el grid de filtros cuando la bandera está activa.
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Filtro: Tipo de proyecto - dropdown personalizado PCM */}
            <div>
              <label className="block text-sm text-pcm-muted mb-2">
                Tipo de proyecto                                    {/* Etiqueta para el filtro de tipo. */}
              </label>
              <div className="relative w-full">
                {/* Botón que muestra el tipo actual y abre/cierra el menú */}
                <button
                  type="button"
                  onClick={() => setIsTypeMenuOpen((prev) => !prev)}
                  className="w-full px-3 py-2 rounded-xl bg-pcm-bg/60 border border-white/10
                             text-sm text-pcm-text flex items-center justify-between
                             hover:border-pcm-primary/70 transition duration-150"
                >
                  <span className="truncate">
                    {currentTypeLabel}                              {/* Label del valor seleccionado o "Todos". */}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-pcm-muted transition-transform ${
                      isTypeMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Menú de opciones para tipo de proyecto */}
                {isTypeMenuOpen && (
                  <div
                    className="absolute mt-1 w-full rounded-xl bg-pcm-bg/95 border border-white/10
                               shadow-pcm-soft z-30 overflow-hidden"
                  >
                    {/* Opción "Todos" */}
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter('todos');
                        setIsTypeMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   typeFilter === 'todos'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Todos
                    </button>

                    {/* Opciones dinámicas según tipos de proyecto únicos */}
                    {projectTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setTypeFilter(type);
                          setIsTypeMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm
                                   ${
                                     typeFilter === type
                                       ? 'bg-pcm-primary/15 text-pcm-primary'
                                       : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                   }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filtro: Ubicación - dropdown personalizado PCM */}
            <div>
              <label className="text-sm text-pcm-muted mb-2 flex items-center gap-1">
                <MapPin size={16} />                                {/* Ícono de ubicación. */}
                Ubicación                                           {/* Etiqueta del filtro de ubicación. */}
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsLocationMenuOpen((prev) => !prev)}
                  className="w-full px-3 py-2 rounded-xl bg-pcm-bg/60 border border-white/10
                             text-sm text-pcm-text flex items-center justify-between
                             hover:border-pcm-primary/70 transition duration-150"
                >
                  <span className="truncate">
                    {currentLocationLabel}                          {/* Label de la ubicación seleccionada o "Todas". */}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-pcm-muted transition-transform ${
                      isLocationMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isLocationMenuOpen && (
                  <div
                    className="absolute mt-1 w-full rounded-xl bg-pcm-bg/95 border border-white/10
                               shadow-pcm-soft z-30 overflow-hidden"
                  >
                    {/* Opción "Todas" */}
                    <button
                      type="button"
                      onClick={() => {
                        setLocationFilter('todos');
                        setIsLocationMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   locationFilter === 'todos'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Todas
                    </button>

                    {/* Ubicaciones únicas */}
                    {projectLocations.map((location) => (
                      <button
                        key={location}
                        type="button"
                        onClick={() => {
                          setLocationFilter(location);
                          setIsLocationMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm
                                   ${
                                     locationFilter === location
                                       ? 'bg-pcm-primary/15 text-pcm-primary'
                                       : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                   }`}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filtro: Progreso - dropdown personalizado PCM */}
            <div>
              <label className="text-sm text-pcm-muted mb-2 flex items-center gap-1">
                <TrendingUp size={16} />                            {/* Ícono de tendencia para progreso. */}
                Progreso                                            {/* Etiqueta del filtro de progreso. */}
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsProgressMenuOpen((prev) => !prev)}
                  className="w-full px-3 py-2 rounded-xl bg-pcm-bg/60 border border-white/10
                             text-sm text-pcm-text flex items-center justify-between
                             hover:border-pcm-primary/70 transition duration-150"
                >
                  <span className="truncate">
                    {currentProgressLabel}                          {/* Label del rango de progreso seleccionado o "Todos". */}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-pcm-muted transition-transform ${
                      isProgressMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isProgressMenuOpen && (
                  <div
                    className="absolute mt-1 w-full rounded-xl bg-pcm-bg/95 border border-white/10
                               shadow-pcm-soft z-30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProgressFilter('todos');
                        setIsProgressMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   progressFilter === 'todos'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProgressFilter('iniciado');
                        setIsProgressMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   progressFilter === 'iniciado'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Iniciado (0-24%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProgressFilter('en-proceso');
                        setIsProgressMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   progressFilter === 'en-proceso'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      En proceso (25-74%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProgressFilter('avanzado');
                        setIsProgressMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   progressFilter === 'avanzado'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Avanzado (75-99%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProgressFilter('completado');
                        setIsProgressMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   progressFilter === 'completado'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Completado (100%)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filtro: Presupuesto - dropdown personalizado PCM */}
            <div>
              <label className="text-sm text-pcm-muted mb-2 flex items-center gap-1">
                <DollarSign size={16} />                            {/* Ícono de dinero. */}
                Presupuesto                                         {/* Etiqueta del filtro de presupuesto. */}
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsBudgetMenuOpen((prev) => !prev)}
                  className="w-full px-3 py-2 rounded-xl bg-pcm-bg/60 border border-white/10
                             text-sm text-pcm-text flex items-center justify-between
                             hover:border-pcm-primary/70 transition duration-150"
                >
                  <span className="truncate">
                    {currentBudgetLabel}                            {/* Label del rango de presupuesto seleccionado o "Todos". */}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-pcm-muted transition-transform ${
                      isBudgetMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isBudgetMenuOpen && (
                  <div
                    className="absolute mt-1 w-full rounded-xl bg-pcm-bg/95 border border-white/10
                               shadow-pcm-soft z-30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetFilter('todos');
                        setIsBudgetMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   budgetFilter === 'todos'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetFilter('bajo');
                        setIsBudgetMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   budgetFilter === 'bajo'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Bajo (&lt; $50.000)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetFilter('medio');
                        setIsBudgetMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   budgetFilter === 'medio'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Medio ($50K - $200K)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetFilter('alto');
                        setIsBudgetMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   budgetFilter === 'alto'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Alto (&gt; $200.000)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filtro: Fecha de creación - dropdown personalizado PCM */}
            <div>
              <label className="text-sm text-pcm-muted mb-2 flex items-center gap-1">
                <Calendar size={16} />                              {/* Ícono de calendario. */}
                Fecha de creación                                   {/* Etiqueta del filtro de fecha. */}
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsDateMenuOpen((prev) => !prev)}
                  className="w-full px-3 py-2 rounded-xl bg-pcm-bg/60 border border-white/10
                             text-sm text-pcm-text flex items-center justify-between
                             hover:border-pcm-primary/70 transition duration-150"
                >
                  <span className="truncate">
                    {currentDateLabel}                              {/* Label del rango de fechas seleccionado o "Todos". */}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-pcm-muted transition-transform ${
                      isDateMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDateMenuOpen && (
                  <div
                    className="absolute mt-1 w-full rounded-xl bg-pcm-bg/95 border border-white/10
                               shadow-pcm-soft z-30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('todos');
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   dateFilter === 'todos'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('semana');
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   dateFilter === 'semana'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Última semana
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('mes');
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   dateFilter === 'mes'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Último mes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('trimestre');
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   dateFilter === 'trimestre'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Último trimestre
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('ultimos3meses');
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   dateFilter === 'ultimos3meses'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Últimos 3 meses
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('ultimoAnio');
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   dateFilter === 'ultimoAnio'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Último año
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filtro: Mes (específico) */}
            <div>
              <label className="text-sm text-pcm-muted mb-2 flex items-center gap-1">
                <Calendar size={16} /> Mes
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsMonthMenuOpen((prev) => !prev)}
                  className="w-full px-3 py-2 rounded-xl bg-pcm-bg/60 border border-white/10
                             text-sm text-pcm-text flex items-center justify-between
                             hover:border-pcm-primary/70 transition duration-150"
                >
                  <span className="truncate">{currentMonthLabel}</span>
                  <ChevronDown
                    size={16}
                    className={`text-pcm-muted transition-transform ${
                      isMonthMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isMonthMenuOpen && (
                  <div
                    className="absolute mt-1 w-full rounded-xl bg-pcm-bg/95 border border-white/10
                               shadow-pcm-soft z-30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMonthFilter('todos');
                        setIsMonthMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   monthFilter === 'todos'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Todos
                    </button>
                    {monthNames.map((monthName, idx) => {
                      const value = String(idx + 1);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setMonthFilter(value);
                            setIsMonthMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm
                                     ${
                                       monthFilter === value
                                         ? 'bg-pcm-primary/15 text-pcm-primary'
                                         : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                     }`}
                        >
                          {monthName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Filtro: Año (específico) */}
            <div>
              <label className="text-sm text-pcm-muted mb-2 flex items-center gap-1">
                <Calendar size={16} /> Año
              </label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsYearMenuOpen((prev) => !prev)}
                  className="w-full px-3 py-2 rounded-xl bg-pcm-bg/60 border border-white/10
                             text-sm text-pcm-text flex items-center justify-between
                             hover:border-pcm-primary/70 transition duration-150"
                >
                  <span className="truncate">{currentYearLabel}</span>
                  <ChevronDown
                    size={16}
                    className={`text-pcm-muted transition-transform ${
                      isYearMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isYearMenuOpen && (
                  <div
                    className="absolute mt-1 w-full rounded-xl bg-pcm-bg/95 border border-white/10
                               shadow-pcm-soft z-30 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setYearFilter('todos');
                        setIsYearMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm
                                 ${
                                   yearFilter === 'todos'
                                     ? 'bg-pcm-primary/15 text-pcm-primary'
                                     : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                 }`}
                    >
                      Todos
                    </button>
                    {projectYears.map((year) => {
                      const value = String(year);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setYearFilter(value);
                            setIsYearMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm
                                     ${
                                       yearFilter === value
                                         ? 'bg-pcm-primary/15 text-pcm-primary'
                                         : 'bg-pcm-bg hover:bg-pcm-surfaceSoft text-pcm-text'
                                     }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pie del panel de filtros: resumen de conteo + botón de limpiar */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <div className="text-sm text-pcm-muted">
            Mostrando{' '}
            {/* Texto que indica el número de proyectos filtrados. */}
            <span className="text-pcm-text font-semibold">
              {filteredProjects.length}                             {/* Cantidad de proyectos que cumplen los filtros. */}
            </span>{' '}
            de{' '}
            <span className="text-pcm-text font-semibold">
              {Array.isArray(allProjects) ? allProjects.length : 0} {/* Total de proyectos disponibles (antes de filtrar). */}
            </span>{' '}
            proyectos
          </div>

          {hasActiveFilters && (                                    // Muestra el botón de limpiar solo si hay filtros activos.
            <button
              type="button"                                         // Botón normal (no submit).
              onClick={clearFilters}                               // Llama a la función que reinicia todos los filtros.
              className="pcm-btn-danger inline-flex items-center gap-2 text-sm"
            >
              <X size={16} />                                      {/* Ícono de X para indicar limpieza / cierre. */}
              Limpiar filtros                                      {/* Texto del botón. */}
            </button>
          )}
        </div>
      </div>

      {/* Lista de proyectos en formato tarjetas */}
      {filteredProjects.length > 0 ? (                             // Si hay proyectos después del filtrado...
        <div className="space-y-4">                                {/* Contenedor vertical de tarjetas (deja el scroll al layout padre). */}
          {filteredProjects.map((project) => (                     // Renderiza una tarjeta por cada proyecto filtrado.
            <div
              key={project._id || project.id}                      // Usa _id o id como clave única para React.
              className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-6 border border-white/10
                         hover:bg-pcm-surfaceSoft transition-all duration-150 hover:-translate-y-0.5 shadow-pcm-soft animate-slide-up-soft"
            >
              {/* Fila principal: título, correo, ubicación y tipo */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-[250px]">
                  <h3 className="text-xl font-semibold text-pcm-text mb-1">
                    {project.title || 'Proyecto sin título'}        {/* Título del proyecto o texto por defecto. */}
                  </h3>
                  <p className="text-pcm-muted text-sm mb-2">
                    {project.email || 'Sin correo asociado'}        {/* Correo del cliente o mensaje si no hay. */}
                  </p>
                  <div className="flex items-center gap-1 text-pcm-muted text-sm">
                    <MapPin size={14} />                            {/* Ícono de ubicación. */}
                    <span>{project.location || 'Sin dirección'}</span> {/* Ubicación del proyecto o texto por defecto. */}
                  </div>
                </div>

                {/* Chip con el tipo de proyecto */}
                <div>
                  <span className="px-3 py-1 bg-pcm-primary/15 text-pcm-primary rounded-full text-xs font-semibold">
                    {project.type || 'Sin tipo'}                   {/* Muestra el tipo de proyecto. */}
                  </span>
                </div>
              </div>

              {/* Barra de progreso del proyecto */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-pcm-muted">Progreso</span> {/* Etiqueta de la barra de progreso. */}
                  <span className="text-pcm-text text-sm font-semibold">
                    {Number(project.progress || 0)}%               {/* Porcentaje de progreso numérico. */}
                  </span>
                </div>
                <div className="w-full bg-pcm-bg/60 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${
                        isAdmin
                          ? 'from-pcm-primary to-pcm-secondary'
                          : isLeader
                          ? 'from-pcm-secondary to-pcm-accent'
                          : isClient
                          ? 'from-emerald-500 to-emerald-300'
                          : isAuditor
                          ? 'from-indigo-500 to-blue-500'
                          : 'from-pcm-primary to-pcm-secondary'
                      } transition-all duration-500`}
                      style={{ width: `${Number(project.progress || 0)}%` }}
                    />
                </div>
              </div>

              {/* Presupuesto y botones de acción */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Presupuesto formateado. Ajusta el color según el rol y evita desbordes */}
                <div
                  className={`font-bold ${
                    isAdmin
                      ? 'text-pcm-primary'
                      : isLeader
                      ? 'text-pcm-secondary'
                      : isClient
                      ? 'text-emerald-500'
                      : isAuditor
                      ? 'text-indigo-400'
                      : 'text-pcm-primary'
                  } text-xl md:text-2xl break-words`}
                  style={{ maxWidth: '180px' }}
                >
                  $
                  {Number(project.budget || 0).toLocaleString('es-CO')}
                </div>

                {/* Botones de acción */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Ver detalles (disponible siempre que exista onViewDetails) */}
                  <button
                    type="button"                                   // Botón normal.
                    onClick={() => manejarVerDetalleProyecto(project)} // Usa el handler que valida y delega al Tablero.
                    className="px-4 py-2 bg-pcm-bg/80 hover:bg-pcm-bg text-pcm-text border border-white/10
                               rounded-pcm-xl text-sm transition duration-150 flex items-center gap-2"
                  >
                    <Eye size={16} />                               {/* Ícono de ojo para ver detalles. */}
                    Ver detalles                                    {/* Texto del botón. */}
                  </button>

                  {/* Botón editar: solo para admin / líder y si existe handler */}
                  {(isAdmin || isLeader) && onEditProject && (      // Condiciona el botón a rol y presencia del callback.
                    <button
                      type="button"                                 // Botón normal.
                      onClick={() => onEditProject(project)}        // Llama al callback de edición con el proyecto actual.
                      className="px-4 py-2 bg-pcm-primary/90 hover:bg-pcm-primary text-white rounded-pcm-xl
                                 text-sm transition duration-150 flex items-center gap-2"
                    >
                      <Edit size={16} />                            {/* Ícono de lápiz. */}
                      Editar                                        {/* Texto del botón. */}
                    </button>
                  )}

                  {/* Botón eliminar: solo para admin y si existe handler */}
                  {isAdmin && onDeleteProject && (                  // Solo admins pueden ver el botón de eliminar.
                    <button
                      type="button"                                 // Botón normal.
                      onClick={() => onDeleteProject(project)}      // Delegación al Tablero: marca el proyecto para eliminación.
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-pcm-xl
                                 text-sm transition duration-150 flex items-center gap-1"
                    >
                      <Trash2 size={16} />                          {/* Ícono de papelera. */}
                      Eliminar                                      {/* Texto del botón. */}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Estado vacío cuando no hay proyectos que cumplan los filtros.
        <div className="bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl p-12 border border-white/10 text-center shadow-pcm-soft">
          <p className="text-pcm-muted text-lg">
            No se encontraron proyectos con los filtros seleccionados {/* Mensaje de estado vacío. */}
          </p>
          <button
            type="button"                                           // Botón normal.
            onClick={clearFilters}                                 // Limpia los filtros al hacer clic.
            className="pcm-btn-primary mt-4 text-sm font-semibold"
          >
            Limpiar filtros                                        {/* Texto del botón para restablecer filtros. */}
          </button>
        </div>
      )}
    </div>
  );
};

// Exporta el componente para usarlo en dashboards de admin / líder / cliente / auditor.
export default VistaProyectos;                                      // Exporta el componente principal por defecto con nombre en español.
