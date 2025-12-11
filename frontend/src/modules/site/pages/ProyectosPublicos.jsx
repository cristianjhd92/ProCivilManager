// File: frontend/src/modules/site/pages/ProyectosPublicos.jsx
// Description: Página pública de portafolio de proyectos para ProCivil Manager.
//              Muestra un listado de proyectos visibles al público (tipo vitrina
//              comercial) con filtros básicos por estado y tipo, además de un
//              buscador por texto. Al hacer clic en un proyecto, se abre el
//              ModalDetalleProyectoPublico con la información detallada del
//              proyecto, usando el tema visual PCM y el layout público
//              (BarraNavegacionPublica + PieDePagina).

// =========================
// Importaciones principales
// =========================
import React, { useState } from 'react';                                    // Importa React y el hook useState para manejar estado local.
import {                                                                    // Importa íconos desde lucide-react para enriquecer la interfaz.
  Search,                                                                   // Ícono de lupa para el campo de búsqueda.
  Filter,                                                                   // Ícono de filtro (usado en chips de resumen, si se requiere).
  MapPin,                                                                   // Ícono de ubicación para las tarjetas de proyecto.
  CalendarRange,                                                            // Ícono de calendario combinado para fechas.
  Building2                                                                 // Ícono de edificio para representar tipo de proyecto.
} from 'lucide-react';

// Importa componentes de layout público (cabecera y pie de página).
import EncabezadoPrincipal from '../../../shared/components/layout/BarraNavegacionPublica'; // Barra superior de navegación pública (logo + menú).
import PieDePaginaPrincipal from '../../../shared/components/layout/PieDePagina';           // Pie de página global para el sitio público.

// Importa el modal de detalle de proyecto público que ya tienes definido.
import ModalDetalleProyectoPublico from '../modals/ModalDetalleProyectoPublico';            // Modal que muestra el detalle extendido de un proyecto.

// ================================
// Datos mock de proyectos públicos
// ================================
// NOTA: Por ahora esta página usa datos de ejemplo (mock). Más adelante
//       se puede reemplazar esta constante por una llamada real a la API
//       (por ejemplo, un endpoint /proyectos/publicos en el backend).
const PROYECTOS_PUBLICOS_DEMO = [
  {
    id: 'demo-1',                                                         // Identificador único del proyecto (mock).
    title: 'Rehabilitación Vial Calle 81B - Bogotá',                      // Título del proyecto visible al público.
    location: 'Bogotá D.C. - Localidad de Engativá',                      // Ubicación del proyecto (ciudad / localidad).
    type: 'Infraestructura vial',                                         // Tipo de proyecto (carreteras, andenes, etc.).
    status: 'active',                                                     // Estado interno para el modal (active, planning, completed).
    priority: 'high',                                                     // Prioridad (high, medium, low) para el chip de prioridad del modal.
    progress: 72,                                                         // Porcentaje de avance aproximado del proyecto.
    budget: '$ 3.200 millones',                                           // Presupuesto aproximado (formateado para humanos).
    duration: '14 meses',                                                 // Duración estimada / ejecutada del proyecto.
    startDate: '2024-02-15',                                              // Fecha de inicio (ISO) para que el modal la pueda formatear.
    endDate: null,                                                        // Fecha de fin (null si aún está en ejecución).
    email: 'contacto@procivilmanager.com',                                // Correo de contacto genérico del proyecto (cliente/interventor).
    teamMembers: [                                                        // Equipo asignado (esquema compatible con el modal).
      {
        firstName: 'Luis',
        lastName: 'Suárez',
        cargo: 'Líder de Obra',
        tipoDocumento: 'CC',
        numeroDocumento: '1.234.567.890'
      },
      {
        firstName: 'Yehiko',
        lastName: 'Hernández',
        cargo: 'Director de Proyecto',
        tipoDocumento: 'CC',
        numeroDocumento: '9.876.543.210'
      }
    ]
  },
  {
    id: 'demo-2',                                                         // ID para el segundo proyecto.
    title: 'Construcción de Andenes y Cicloruta Norabastos',              // Título del proyecto.
    location: 'Bogotá D.C. - Autopista Norte',                            // Ubicación resumida.
    type: 'Urbanismo y espacio público',                                  // Tipo de proyecto (urbanismo).
    status: 'planning',                                                   // Estado para el chip del modal (en planificación).
    priority: 'medium',                                                   // Prioridad media.
    progress: 35,                                                         // Avance estimado del diseño / gestión.
    budget: '$ 1.150 millones',                                           // Presupuesto aproximado.
    duration: '9 meses',                                                  // Duración planeada.
    startDate: '2025-03-01',                                              // Fecha de inicio planeada.
    endDate: null,                                                        // Aún sin fecha de fin real.
    email: 'proyectos@procivilmanager.com',                               // Correo de contacto.
    teamMembers: [                                                        // Equipo mínimo del proyecto.
      {
        firstName: 'Valeria',
        lastName: 'Bohórquez',
        cargo: 'Diseñadora Urbana',
        tipoDocumento: 'CC',
        numeroDocumento: '1.111.222.333'
      }
    ]
  },
  {
    id: 'demo-3',                                                         // ID para el tercer proyecto.
    title: 'Mejoramiento de Fachadas Conjunto Pompeyano',                 // Título del proyecto.
    location: 'Funza - Sabana Occidente',                                 // Ubicación del proyecto.
    type: 'Arquitectura y acabados',                                      // Tipo de proyecto (arquitectónico).
    status: 'completed',                                                  // Estado completado.
    priority: 'low',                                                      // Prioridad baja (proyecto ya ejecutado).
    progress: 100,                                                        // Avance completado.
    budget: '$ 580 millones',                                             // Presupuesto aproximado.
    duration: '6 meses',                                                  // Duración ejecutada.
    startDate: '2023-05-10',                                              // Fecha de inicio real.
    endDate: '2023-11-30',                                                // Fecha de fin real.
    email: 'gerencia@procivilmanager.com',                                // Correo de contacto.
    teamMembers: [                                                        // Equipo de referencia.
      {
        firstName: 'Benjamín',
        lastName: 'Novoa',
        cargo: 'Residente de Obra',
        tipoDocumento: 'CC',
        numeroDocumento: '7.654.321.000'
      }
    ]
  }
];

// =====================================
// Helpers para estado y prioridad (chips)
// =====================================

// Mapea el estado interno (status) a un texto amigable en español.
const obtenerEtiquetaEstado = (estado) => {                               // Función que traduce el estado técnico a etiqueta de UI.
  if (estado === 'completed') return 'Completado';                        // Estado completado.
  if (estado === 'active') return 'En progreso';                          // Estado en ejecución.
  if (estado === 'planning') return 'En planificación';                   // Estado en planeación.
  return 'Estado no definido';                                            // Fallback por si llega algo inesperado.
};

// Devuelve clases Tailwind para el chip de estado con color según el estado.
const obtenerClasesChipEstado = (estado) => {                             // Función que construye clases Tailwind para el chip de estado.
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide border'; // Clases base comunes.
  if (estado === 'completed') {
    return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-400/40`; // Verde suave para proyectos completados.
  }
  if (estado === 'active') {
    return `${base} bg-amber-500/10 text-amber-300 border-amber-400/40`;       // Ámbar para proyectos en progreso.
  }
  if (estado === 'planning') {
    return `${base} bg-sky-500/10 text-sky-300 border-sky-400/40`;             // Azul suave para proyectos en planificación.
  }
  return `${base} bg-pcm-bg/80 text-pcm-muted border-pcm-border/70`;           // Fallback neutro usando la paleta PCM.
};

// Mapea la prioridad interna a un texto amigable.
const obtenerEtiquetaPrioridad = (prioridad) => {                        // Función para mostrar etiqueta clara de prioridad.
  if (prioridad === 'high') return 'Alta';                               // Prioridad alta.
  if (prioridad === 'medium') return 'Media';                            // Prioridad media.
  if (prioridad === 'low') return 'Baja';                                // Prioridad baja.
  return 'No definida';                                                  // Fallback en caso de valor desconocido.
};

// Devuelve clases Tailwind para el chip de prioridad con color según el nivel.
const obtenerClasesChipPrioridad = (prioridad) => {                      // Función que define los estilos según la prioridad.
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium border'; // Clases base del chip.
  if (prioridad === 'high') {
    return `${base} bg-red-500/10 text-red-300 border-red-400/50`;       // Rojo suave para prioridad alta.
  }
  if (prioridad === 'medium') {
    return `${base} bg-amber-500/10 text-amber-300 border-amber-400/50`; // Ámbar para prioridad media.
  }
  if (prioridad === 'low') {
    return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-400/50`; // Verde para prioridad baja.
  }
  return `${base} bg-pcm-bg/80 text-pcm-muted border-pcm-border/70`;     // Fallback neutro.
};

// ======================================
// Opciones de dropdown para los filtros
// ======================================

// Opciones para el filtro de estado de proyecto.
const OPCIONES_ESTADO = [
  {
    valor: 'todos',                                                      // Valor interno que se guarda en estado.
    titulo: 'Todos los estados',                                         // Texto principal del dropdown.
    resumen: 'Ver proyectos en ejecución, planificación y cerrados.',    // Descripción corta bajo el título.
    chip: 'Todos los estados'                                            // Texto compacto del chip derecho.
  },
  {
    valor: 'active',
    titulo: 'En ejecución',
    resumen: 'Obras actualmente en desarrollo.',
    chip: 'En ejecución'
  },
  {
    valor: 'planning',
    titulo: 'En planificación',
    resumen: 'Proyectos en etapa de diseño y trámites.',
    chip: 'En planificación'
  },
  {
    valor: 'completed',
    titulo: 'Completados',
    resumen: 'Proyectos terminados y entregados.',
    chip: 'Completados'
  }
];

// Opciones para el filtro de tipo de proyecto.
const OPCIONES_TIPO = [
  {
    valor: 'todos',
    titulo: 'Todos los tipos',
    resumen: 'Infraestructura vial, urbanismo y arquitectura en una sola vista.',
    chip: 'Todos los tipos'
  },
  {
    valor: 'Infraestructura vial',
    titulo: 'Infraestructura vial',
    resumen: 'Vías, andenes, ciclorrutas y obras complementarias.',
    chip: 'Infraestructura vial'
  },
  {
    valor: 'Urbanismo y espacio público',
    titulo: 'Urbanismo y espacio público',
    resumen: 'Mejoras de espacio público, parques y urbanismo táctico.',
    chip: 'Urbanismo y espacio público'
  },
  {
    valor: 'Arquitectura y acabados',
    titulo: 'Arquitectura y acabados',
    resumen: 'Fachadas, reforzamientos y acabados arquitectónicos.',
    chip: 'Arquitectura y acabados'
  }
];

// =====================================================
// Componente local: Dropdown de filtro usando estilo PCM
// =====================================================
function DropdownFiltroPcm({                                           // Componente reutilizable solo para esta página.
  tituloSeccion,                                                       // Texto que se muestra encima, por ejemplo “ESTADO DEL PROYECTO”.
  opcionSeleccionada,                                                  // Objeto con la opción actualmente seleccionada.
  opciones,                                                            // Arreglo completo de opciones disponibles.
  onChange                                                             // Función que se ejecuta al cambiar de opción.
}) {
  const [abierto, setAbierto] = useState(false);                       // Maneja si el dropdown está abierto o cerrado.

  // Maneja el clic sobre una opción de la lista.
  const manejarSeleccion = (valor) => {                                // Cambia el valor seleccionado desde el padre.
    onChange(valor);                                                   // Notifica al padre el nuevo filtro.
    setAbierto(false);                                                 // Cierra el dropdown después de seleccionar.
  };

  return (
    <div className="w-full pcm-select-contenedor">                     {/* Contenedor relativo del dropdown, ancho completo. */}
      {/* Título pequeño sobre el control (sección del filtro) */}
      <p className="mb-1 text-[11px] md:text-xs font-semibold text-pcm-muted uppercase tracking-wide">
        {tituloSeccion}
      </p>

      {/* Botón principal del dropdown (usa estilos globales PCM) */}
      <button
        type="button"                                                  // Evita envío de formularios.
        className={`pcm-select ${abierto ? 'pcm-select-abierto' : ''}`} // Aplica estado “abierto” según corresponda.
        onClick={() => setAbierto((previo) => !previo)}               // Alterna abierto/cerrado al hacer clic.
      >
        {/* Zona de texto principal: título + resumen */}
        <div className="pcm-select-texto">
          <span className="pcm-select-titulo">{opcionSeleccionada.titulo}</span>
          <span className="pcm-select-resumen">{opcionSeleccionada.resumen}</span>
        </div>

        {/* Zona derecha: chip de valor compacto + icono de flecha */}
        <div className="pcm-select-estado">
          <span className="pcm-select-chip-valor">
            {opcionSeleccionada.chip}
          </span>
          <span
            className={`pcm-select-icono ${
              abierto ? 'pcm-select-icono-abierto' : ''
            }`}
          >
            ▾{/* Flecha simple compatible con el estilo definido en CSS. */}
          </span>
        </div>
      </button>

      {/* Lista de opciones (en flujo normal para que no se recorte) */}
      {abierto && (
        <div
          className="pcm-select-lista pcm-scroll-y"                    // Usa estilos globales de lista + scroll PCM.
          style={{
            position: 'relative',                                      // Sobrescribe el absolute del CSS global.
            top: 'auto',                                               // Quita el desplazamiento hacia abajo.
            maxHeight: 'none',                                         // Deja crecer según contenido (el contenedor se adapta).
            marginTop: '0.45rem'                                       // Separación visual respecto al botón.
          }}
        >
          {opciones.map((opcion) => {                                  // Recorre todas las opciones.
            const activa = opcion.valor === opcionSeleccionada.valor;  // Determina si es la opción actualmente seleccionada.
            return (
              <button
                key={opcion.valor}                                     // Key única por valor.
                type="button"                                          // Botón normal, sin submit.
                className={`pcm-select-opcion ${
                  activa ? 'pcm-select-opcion-activa' : ''
                }`}                                                    // Aplica clase de opción activa si corresponde.
                onClick={() => manejarSeleccion(opcion.valor)}         // Maneja selección de la opción.
              >
                <span className="pcm-select-opcion-titulo">
                  {opcion.titulo}
                </span>
                {opcion.resumen && (
                  <span className="pcm-select-opcion-resumen">
                    {opcion.resumen}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Componente principal: PaginaProyectosPublicos
// ==========================================
const ProyectosPublicos = () => {                                  // Declara el componente funcional principal de la página pública de proyectos.
  // ===============================
  // Métricas generales del portafolio
  // ===============================
  const totalProyectos = PROYECTOS_PUBLICOS_DEMO.length;                 // Total de proyectos públicos cargados (mock).
  const proyectosEnCurso = PROYECTOS_PUBLICOS_DEMO.filter(              // Cantidad de proyectos en estado "active".
    (proyecto) => proyecto.status === 'active',
  ).length;
  const proyectosCompletados = PROYECTOS_PUBLICOS_DEMO.filter(          // Cantidad de proyectos en estado "completed".
    (proyecto) => proyecto.status === 'completed',
  ).length;
  const proyectosEnPlanificacion = PROYECTOS_PUBLICOS_DEMO.filter(      // Cantidad de proyectos en estado "planning".
    (proyecto) => proyecto.status === 'planning',
  ).length;

  // ===============================
  // Estado para filtros y selección
  // ===============================
  const [terminoBusqueda, setTerminoBusqueda] = useState('');            // Texto que escribe el usuario en el buscador.
  const [filtroEstado, setFiltroEstado] = useState('todos');             // Filtro de estado (todos, active, planning, completed).
  const [filtroTipo, setFiltroTipo] = useState('todos');                 // Filtro de tipo de proyecto (string o "todos").
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);// Proyecto seleccionado para mostrar en el modal (null si no hay modal).

  // Obtiene el objeto de opción actualmente seleccionado para cada dropdown.
  const opcionEstadoSeleccionada =
    OPCIONES_ESTADO.find((opcion) => opcion.valor === filtroEstado) ||
    OPCIONES_ESTADO[0];                                                 // Fallback a “todos” si algo raro pasa.

  const opcionTipoSeleccionada =
    OPCIONES_TIPO.find((opcion) => opcion.valor === filtroTipo) ||
    OPCIONES_TIPO[0];                                                   // Fallback a “todos” si algo raro pasa.

  // =====================================
  // Cálculo de proyectos filtrados en UI
  // =====================================
  const proyectosFiltrados = PROYECTOS_PUBLICOS_DEMO.filter((proyecto) => {
    const texto = terminoBusqueda.trim().toLowerCase();                 // Texto de búsqueda sin espacios extra y en minúsculas.
    const titulo = (proyecto.title || '').toLowerCase();                // Título del proyecto en minúsculas.
    const ubicacion = (proyecto.location || '').toLowerCase();          // Ubicación del proyecto.
    const tipoProyecto = (proyecto.type || '').toLowerCase();           // Tipo de proyecto.

    const coincideTexto =
      texto === '' ||                                                   // Si no hay texto, se acepta siempre.
      titulo.includes(texto) ||                                         // Coincide en el título.
      ubicacion.includes(texto) ||                                      // Coincide en la ubicación.
      tipoProyecto.includes(texto);                                     // Coincide en el tipo de proyecto.

    const coincideEstado =
      filtroEstado === 'todos' ||                                       // Si el filtro es "todos", no restringe por estado.
      proyecto.status === filtroEstado;                                 // En otro caso compara con el estado interno.

    const coincideTipo =
      filtroTipo === 'todos' ||                                         // Si el filtro es "todos", acepta cualquier tipo.
      tipoProyecto === filtroTipo.toLowerCase();                        // Si no, compara tipo normalizado.

    return coincideTexto && coincideEstado && coincideTipo;             // El proyecto pasa si cumple las tres condiciones.
  });

  // =======================
  // Render principal de UI
  // =======================
  return (
    <div
      className="
        pcm-page
        min-h-screen
        flex flex-col
        text-pcm-text
      "                                                                   // Usa helper PCM, garantiza altura mínima y layout en columna.
    >
      {/* Cabecera pública con logo y navegación principal */}
      <EncabezadoPrincipal />                                             {/* Barra de navegación pública fija. */}

      {/* Contenido principal desplazable */}
      <main className="flex-1 pt-24 md:pt-28 animate-page-in">{/* Padding-top para compensar la barra fija y animar la entrada. */ }
        {/* ======= Sección hero / encabezado de la página ======= */}
        <section
          className="
            relative
            overflow-hidden
            border-b border-pcm-border/40
            pcm-fondo-degradado-principal
          "                                                                 // Fondo degradado PCM base.
        >
          {/* Fondo con cuadrícula sutil que “palpita” como en Contacto */}
          <div
            className="
              absolute inset-0
              opacity-10
              animate-pulse
              pointer-events-none
            "
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`, // SVG embebido igual al de Contacto.
            }}
          />

          {/* Círculos decorativos flotantes para dar profundidad */}
          <div
            className="
              absolute w-24 h-24
              bg-pcm-primary/25 rounded-full blur-3xl
              top-[12%] left-[10%]
              animate-float-slow
            "
          />
          <div
            className="
              absolute w-32 h-32
              bg-pcm-secondary/20 rounded-full blur-3xl
              bottom-[8%] right-[12%]
              animate-float-medium
            "
          />

          {/* Contenido principal del hero (usa helper de contenedor PCM) */}
          <div className="relative pcm-container py-10 md:py-14 lg:py-16">
            {/* Layout en columnas: izquierda (texto + filtros), derecha (resumen) */}
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 xl:gap-10">
              {/* Columna izquierda: título, descripción, chips y filtros */}
              <div className="flex-1 flex flex-col gap-6 md:gap-7">
                {/* Título principal y descripción corta */}
                <div className="space-y-3 animate-fade-in-left">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-pcm-text leading-tight">
                    Proyectos{' '}
                    <span
                      className="
                        text-transparent
                        bg-clip-text
                        pcm-text-degradado-hero
                      "
                    >
                      ejecutados y en curso
                    </span>
                    <span className="block text-lg md:text-xl mt-2 text-pcm-muted font-semibold">
                      gestionados con ProCivil Manager
                    </span>
                  </h1>
                  <p className="text-pcm-muted max-w-2xl text-sm md:text-base leading-relaxed">
                    Explora una muestra del portafolio de obras viales, urbanismo y
                    arquitectura que gestionamos en Bogotá y la Sabana, con trazabilidad,
                    programación y control de costos centralizados en una sola plataforma.
                  </p>
                </div>

                {/* Chips con métricas de resumen del portafolio */}
                <div className="flex flex-wrap gap-2.5 text-[11px] md:text-xs animate-fade-in-up">
                  <span
                    className="
                      inline-flex items-center gap-1.5
                      rounded-full px-3 py-1
                      bg-pcm-bg/80 border border-pcm-border/70
                      text-pcm-muted
                    "
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-pcm-primary" /> {/* Punto de color para reforzar visualmente. */}
                    <strong className="text-pcm-text font-semibold">
                      {totalProyectos}
                    </strong>
                    <span>proyecto{totalProyectos === 1 ? '' : 's'} en vitrina</span>
                  </span>
                  <span
                    className="
                      inline-flex items-center gap-1.5
                      rounded-full px-3 py-1
                      bg-amber-500/10 border border-amber-400/40
                      text-amber-100
                    "
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse-soft" />
                    {proyectosEnCurso} en ejecución
                  </span>
                  <span
                    className="
                      inline-flex items-center gap-1.5
                      rounded-full px-3 py-1
                      bg-emerald-500/10 border border-emerald-400/40
                      text-emerald-100
                    "
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    {proyectosCompletados} finalizado
                    {proyectosCompletados === 1 ? '' : 's'}
                  </span>
                  <span
                    className="
                      inline-flex items-center gap-1.5
                      rounded-full px-3 py-1
                      bg-sky-500/10 border border-sky-400/40
                      text-sky-100
                    "
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                    {proyectosEnPlanificacion} en planificación
                  </span>
                </div>

                {/* Bloque de filtros principales: búsqueda + dropdowns PCM */}
                <div
                  className="
                    bg-pcm-surfaceSoft/80
                    border border-pcm-border/60
                    rounded-pcm-xl
                    p-4 md:p-5
                    shadow-pcm-soft
                    flex flex-col
                    gap-4
                    animate-fade-in-up
                  "
                >
                  {/* Etiqueta interna del bloque de filtros */}
                  <p className="text-[11px] md:text-xs font-semibold text-pcm-muted uppercase tracking-wide flex items-center gap-1.5">
                    <Filter className="w-3 h-3" />
                    Filtra el portafolio
                  </p>

                  {/* Campo de búsqueda por texto */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pcm-muted" />{/* Ícono de lupa dentro del input. */}
                    <input
                      type="text"                                      // Define el tipo de input como texto.
                      className="
                        w-full
                        pl-9 pr-3 py-2.5
                        rounded-xl
                        bg-pcm-bg/80
                        border border-pcm-border
                        text-sm md:text-[15px] text-pcm-text
                        placeholder:text-pcm-muted
                        focus:outline-none
                        focus:ring-2 focus:ring-pcm-primary/60
                        focus:border-pcm-primary/50
                        transition
                      "
                      placeholder="Buscar por nombre, ubicación o tipo de proyecto..." // Texto guía para el usuario.
                      value={terminoBusqueda}                           // Vincula el valor del input con el estado terminoBusqueda.
                      onChange={(evento) =>
                        setTerminoBusqueda(evento.target.value)
                      }                                                 // Actualiza el estado cuando el usuario escribe.
                    />
                  </div>

                  {/* Fila de dropdowns PCM: Estado + Tipo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Dropdown para estado del proyecto */}
                    <DropdownFiltroPcm
                      tituloSeccion="Estado del proyecto"               // Texto sobre el control.
                      opcionSeleccionada={opcionEstadoSeleccionada}     // Opción actualmente elegida.
                      opciones={OPCIONES_ESTADO}                        // Lista de opciones posibles.
                      onChange={(nuevoValor) => setFiltroEstado(nuevoValor)} // Actualiza el estado filtroEstado.
                    />

                    {/* Dropdown para tipo de proyecto */}
                    <DropdownFiltroPcm
                      tituloSeccion="Tipo de proyecto"                  // Texto sobre el control.
                      opcionSeleccionada={opcionTipoSeleccionada}       // Opción actualmente elegida.
                      opciones={OPCIONES_TIPO}                          // Lista de opciones posibles.
                      onChange={(nuevoValor) => setFiltroTipo(nuevoValor)} // Actualiza el estado filtroTipo.
                    />
                  </div>
                </div>
              </div>

              {/* Columna derecha: tarjeta de resumen del portafolio */}
              <aside
                className="
                  w-full lg:w-[360px]
                  bg-pcm-surface/85
                  border border-pcm-border/60
                  rounded-pcm-xl
                  shadow-pcm-soft
                  p-5 md:p-6
                  pt-7 md:pt-8
                  flex flex-col gap-4
                  backdrop-blur-xl
                  animate-fade-in-right
                  relative overflow-hidden
                "
              >
                {/* Barra superior tipo “carga” con degradado y shimmer */}
                <div
                  className="
                    absolute inset-x-4 top-0
                    h-1.5
                    rounded-full
                    pcm-barra-carga-hero
                    animate-shimmer
                    pointer-events-none
                  "
                />

                {/* Contenido principal del resumen (por encima de la barra) */}
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm md:text-base font-semibold text-pcm-text">
                      Resumen del portafolio público
                    </h2>
                    <span
                      className="
                        inline-flex items-center gap-1.5
                        rounded-full px-2.5 py-1
                        bg-pcm-bg/80 border border-pcm-border/70
                        text-[11px] text-pcm-muted
                      "
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-pcm-primary animate-pulse-soft" />
                      Vista comercial
                    </span>
                  </div>

                  {/* Línea separadora suave */}
                  <div className="h-px bg-pcm-border/60" />

                  {/* Métricas en forma de "mini dashboard" */}
                  <div className="grid grid-cols-2 gap-3 text-xs md:text-[13px]">
                    {/* Tarjeta: total proyectos con acento PCM primary */}
                    <div
                      className="
                        rounded-2xl px-3 py-3
                        bg-pcm-card/95 border border-pcm-primary/60
                        flex flex-col gap-1
                        shadow-pcm-soft
                      "
                    >
                      <span className="text-[11px] font-semibold text-pcm-text/85 uppercase tracking-wide">
                        Total proyectos
                      </span>
                      <span className="text-2xl font-black text-pcm-text">
                        {totalProyectos}
                      </span>
                      <span className="text-[11px] text-pcm-text/80">
                        visibles en esta vitrina
                      </span>
                    </div>

                    {/* Tarjeta: alcance geográfico con degradado PCM */}
                    <div
                      className="
                        rounded-2xl px-3 py-3
                        pcm-fondo-degradado-principal
                        border border-pcm-primary/40
                        flex flex-col gap-1
                        text-white
                        shadow-pcm-soft
                      "
                    >
                      <span className="text-xs font-medium opacity-90">
                        Alcance geográfico
                      </span>
                      <span className="text-[13px] font-semibold leading-snug">
                        Bogotá D.C. y
                        <br />
                        Sabana Occidente
                      </span>
                      <span className="text-[11px] opacity-80">
                        Experiencia en contexto colombiano
                      </span>
                    </div>

                    {/* Tarjeta: desempeño en verde marcado */}
                    <div
                      className="
                        rounded-2xl px-3 py-3
                        bg-emerald-500/15 border border-emerald-400/50
                        flex flex-col gap-1
                        shadow-pcm-soft
                      "
                    >
                      <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wide">
                        Desempeño
                      </span>
                      <span className="text-sm text-emerald-100">
                        {proyectosCompletados} proyecto
                        {proyectosCompletados === 1 ? '' : 's'} entregado
                      </span>
                      <span className="text-[11px] text-emerald-200/80">
                        Referencias listas para mostrar
                      </span>
                    </div>

                    {/* Tarjeta: tipos de proyecto con acento pcm-accent */}
                    <div
                      className="
                        rounded-2xl px-3 py-3
                        bg-pcm-accent/15 border border-pcm-accent/50
                        flex flex-col gap-1
                        shadow-pcm-soft
                      "
                    >
                      <span className="text-[11px] font-semibold text-pcm-text uppercase tracking-wide">
                        Tipos de proyecto
                      </span>
                      <ul className="text-[11px] text-pcm-text/90 space-y-0.5">
                        <li>• Infraestructura vial</li>
                        <li>• Urbanismo y espacio público</li>
                        <li>• Arquitectura y acabados</li>
                      </ul>
                    </div>
                  </div>

                  {/* Texto final de confianza para clientes/interventores */}
                  <p className="text-[11px] md:text-xs text-pcm-muted leading-relaxed mt-1">
                    Los datos mostrados son de carácter informativo y comercial. Para
                    fichas técnicas detalladas, informes de interventoría o anexos
                    contractuales, se gestionan accesos internos desde ProCivil Manager.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ======= Sección de grid de proyectos ======= */}
        <section className="pcm-container py-8 md:py-10 lg:py-12 space-y-6">
          {/* Texto auxiliar con conteo de proyectos filtrados */}
          <div className="flex items-center justify-between gap-3 text-xs md:text-sm text-pcm-muted">
            <span>
              Mostrando{' '}
              <strong className="text-pcm-text font-semibold">
                {proyectosFiltrados.length}
              </strong>{' '}
              proyecto{proyectosFiltrados.length === 1 ? '' : 's'} públicamente visibles.
            </span>
            <span className="hidden sm:inline">
              Los datos son de referencia académica/comercial y no reemplazan la información
              contractual oficial.
            </span>
          </div>

          {/* Grid de tarjetas de proyecto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {proyectosFiltrados.map((proyecto) => (
              <button
                key={proyecto.id}                                        // Usa el id del proyecto como key para cada tarjeta.
                type="button"                                            // Declara el tipo de botón para no enviar formularios por accidente.
                onClick={() => setProyectoSeleccionado(proyecto)}        // Al hacer clic, guarda el proyecto en estado y abre el modal.
                className="
                  group relative text-left
                  bg-pcm-surfaceSoft/80
                  border border-pcm-border/60
                  rounded-pcm-xl
                  p-4 md:p-5
                  shadow-pcm-soft
                  hover:shadow-2xl hover:border-pcm-primary/70 hover:-translate-y-1
                  transition-all duration-300
                  overflow-hidden
                  animate-fade-in-soft
                "
              >
                {/* Capa decorativa de gradiente al hacer hover */}
                <div
                  className="
                    absolute inset-0
                    opacity-0 group-hover:opacity-100
                    pcm-fondo-degradado-principal
                    transition-opacity duration-300
                    pointer-events-none
                  "
                />

                {/* Contenido real de la tarjeta */}
                <div className="relative z-10 space-y-3">
                  {/* Tipo + estado simplificados */}
                  <div className="flex items-center justify-between gap-2 text-[11px] md:text-xs">
                    <span
                      className="
                        inline-flex items-center gap-1.5
                        rounded-full
                        bg-pcm-bg/80
                        border border-pcm-border/70
                        px-2 py-1
                        font-semibold text-pcm-muted
                      "
                    >
                      <Building2 className="w-3 h-3" />                 {/* Ícono de edificio para el tipo. */}
                      {proyecto.type}
                    </span>

                    <span className={obtenerClasesChipEstado(proyecto.status)}> {/* Chip de estado con color según el estado. */}
                      {obtenerEtiquetaEstado(proyecto.status)}
                    </span>
                  </div>

                  {/* Título del proyecto */}
                  <h2 className="text-base md:text-lg font-bold text-pcm-text line-clamp-2 group-hover:text-pcm-primary transition duration-300">
                    {proyecto.title}
                  </h2>

                  {/* Ubicación */}
                  <p className="flex items-center gap-1.5 text-xs md:text-sm text-pcm-muted">
                    <MapPin className="w-3.5 h-3.5 text-pcm-accent" /> {/* Ícono de ubicación. */}
                    <span className="line-clamp-1">{proyecto.location}</span>{' '}
                    {/* Ubicación limitada a una línea. */}
                  </p>

                  {/* Presupuesto, duración y prioridad */}
                  <div className="flex flex-wrap items-center gap-3 text-xs md:text-[13px] text-pcm-muted">
                    <span className="font-semibold text-pcm-text">
                      Presupuesto:&nbsp;
                      <span className="font-normal text-pcm-muted">
                        {proyecto.budget}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange className="w-3.5 h-3.5" />        {/* Ícono de calendario doble para duración. */}
                      {proyecto.duration}
                    </span>
                    <span className={obtenerClasesChipPrioridad(proyecto.priority)}> {/* Chip adicional de prioridad. */}
                      Prioridad: {obtenerEtiquetaPrioridad(proyecto.priority)}
                    </span>
                  </div>

                  {/* Barra mini de progreso con degradado naranja + shimmer */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-pcm-muted">
                      <span>Progreso</span>
                      <span className="font-semibold text-pcm-text">
                        {proyecto.progress}%                            {/* Porcentaje de avance mostrado en texto. */}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-pcm-bg/90 overflow-hidden">
                      <div
                        className="
                          h-full rounded-full
                          pcm-barra-carga-hero
                          animate-shimmer
                        "
                        style={{ width: `${proyecto.progress}%` }}     // Ancho de la barra proporcional al progreso.
                      />
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Mensaje cuando no hay proyectos que coincidan con los filtros */}
            {proyectosFiltrados.length === 0 && (
              <div
                className="
                  col-span-full
                  rounded-pcm-xl
                  border border-dashed border-pcm-border/70
                  bg-pcm-surfaceSoft/60
                  px-4 py-6
                  text-center text-sm text-pcm-muted
                "
              >
                No se encontraron proyectos que coincidan con los filtros seleccionados.
                Ajusta la búsqueda o cambia el estado / tipo para ver otros proyectos.
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Pie de página público */}
      <PieDePaginaPrincipal />                                           {/* Renderiza el pie de página global para el sitio público. */}

      {/* Modal de detalle de proyecto público */}
      {proyectoSeleccionado && (                                         // Si hay un proyecto seleccionado, se renderiza el modal.
        <ModalDetalleProyectoPublico
          project={proyectoSeleccionado}                                 // Pasa el proyecto seleccionado como prop "project" (tal como lo espera el modal).
          onClose={() => setProyectoSeleccionado(null)}                  // Función para cerrar el modal (resetea el proyecto seleccionado).
        />
      )}
    </div>
  );
};

// Exporta la página como componente por defecto para usarla en App.jsx cuando se configure la ruta pública.
export default ProyectosPublicos;                                  // Exporta la página de proyectos públicos como default.
