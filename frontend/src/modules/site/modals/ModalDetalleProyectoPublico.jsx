// File: frontend/src/modules/site/modals/ModalDetalleProyectoPublico.jsx
// Description: Modal de detalle público de proyecto para ProCivil Manager.
//              Usa el tema visual PCM con degradados vivos, cards con
//              acentos de color, barra de progreso con degradado naranja
//              + shimmer, y scroll interno con el helper .pcm-scroll-y.

// =========================
// Importaciones principales
// =========================
import React from 'react';                                                // Importa React para definir el componente funcional del modal.
import {                                                                 // Importa íconos desde lucide-react.
  X,                                                                     // Ícono de "cerrar" (equis).
  MapPin,                                                                // Ícono de ubicación.
  CalendarRange,                                                         // Ícono de calendario para fechas.
  Mail,                                                                  // Ícono de correo electrónico.
  Building2,                                                             // Ícono de tipo de proyecto.
  Flag,                                                                  // Ícono de bandera para estado/prioridad.
  Wallet,                                                                // Ícono de billetera para presupuesto.
  Users                                                                  // Ícono de usuarios para el equipo.
} from 'lucide-react';

// =====================================
// Helpers de formato (estado, prioridad)
// =====================================

// Devuelve una etiqueta amigable para el estado del proyecto.
const obtenerEtiquetaEstado = (estado) => {                               // Mapea el estado técnico a texto entendible.
  if (estado === 'completed') return 'Completado';
  if (estado === 'active') return 'En ejecución';
  if (estado === 'planning') return 'En planificación';
  return 'Estado no definido';
};

// Devuelve clases Tailwind para el chip de estado sobre encabezado oscuro.
const obtenerClasesChipEstado = (estado) => {                             // Define colores de chip según estado.
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide border';
  if (estado === 'completed') {
    return `${base} bg-emerald-500/20 text-emerald-50 border-emerald-200/70`;
  }
  if (estado === 'active') {
    return `${base} bg-amber-500/20 text-amber-50 border-amber-200/70`;
  }
  if (estado === 'planning') {
    return `${base} bg-sky-500/20 text-sky-50 border-sky-200/70`;
  }
  return `${base} bg-white/10 text-white border-white/40`;
};

// Devuelve etiqueta de prioridad a partir del valor interno.
const obtenerEtiquetaPrioridad = (prioridad) => {                        // Traduce la prioridad a texto.
  if (prioridad === 'high') return 'Alta';
  if (prioridad === 'medium') return 'Media';
  if (prioridad === 'low') return 'Baja';
  return 'No definida';
};

// Devuelve clases Tailwind para el chip de prioridad sobre encabezado oscuro.
const obtenerClasesChipPrioridad = (prioridad) => {                      // Define colores de chip según prioridad.
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border';
  if (prioridad === 'high') {
    return `${base} bg-red-500/25 text-red-50 border-red-200/80`;
  }
  if (prioridad === 'medium') {
    return `${base} bg-amber-500/25 text-amber-50 border-amber-200/80`;
  }
  if (prioridad === 'low') {
    return `${base} bg-emerald-500/20 text-emerald-50 border-emerald-200/80`;
  }
  return `${base} bg-white/10 text-white border-white/40`;
};

// Helper para formatear fechas ISO a formato corto en español (Colombia).
const formatearFechaCorta = (valorFecha) => {                            // Formatea fechas tipo YYYY-MM-DD.
  if (!valorFecha) return 'En ejecución';
  const fecha = new Date(valorFecha);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// ====================
// Helpers para equipo
// ====================

// Devuelve clases para la tarjeta de cada miembro del equipo con acentos variados.
const obtenerClasesTarjetaEquipo = (indice) => {                          // Alterna colores por índice.
  const base =
    'rounded-xl border p-3 flex items-start gap-2 bg-pcm-bg/80';
  const variantes = [
    'border-pcm-primary/60',
    'border-pcm-secondary/60',
    'border-pcm-accent/60'
  ];
  return `${base} ${variantes[indice % variantes.length]}`;
};

// Devuelve clases para el avatar de cada miembro del equipo con acentos variados.
const obtenerClasesAvatarEquipo = (indice) => {                           // Alterna colores de fondo/texto del avatar.
  const base =
    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold';
  const variantes = [
    'bg-pcm-primary/25 text-pcm-primary',
    'bg-pcm-secondary/25 text-pcm-secondary',
    'bg-pcm-accent/25 text-pcm-accent'
  ];
  return `${base} ${variantes[indice % variantes.length]}`;
};

// ==============================
// Componente principal del modal
// ==============================
const ModalDetalleProyectoPublico = ({ project, onClose }) => {           // Recibe el proyecto y la función para cerrar el modal.
  if (!project) return null;                                             // Si no hay proyecto, no renderiza nada.

  // Extrae campos del proyecto con fallback básicos.
  const {
    title,
    location,
    type,
    status,
    priority,
    progress,
    budget,
    duration,
    startDate,
    endDate,
    email,
    teamMembers
  } = project;

  // =======================
  // Render del modal
  // =======================
  return (
    <div
      className="
        fixed inset-0 z-50
        bg-black/60
        backdrop-blur-sm
        flex items-center justify-center
        px-4
        overflow-y-auto pcm-scroll-y
      "                                                                 // Overlay con scroll personalizado y blur.
      onClick={onClose}                                                 // Clic en el fondo cierra el modal.
    >
      {/* Wrapper para centrar la tarjeta dentro del overlay */}
      <div className="w-full max-w-3xl my-6 flex justify-center">
        {/* Contenedor principal de la tarjeta del modal */}
        <div
          className="
            relative
            w-full
            pcm-card
            overflow-y-auto pcm-scroll-y
            animate-scale-in
          "                                                              // Tarjeta con scroll interno y animación de entrada.
          style={{ maxHeight: 'calc(100vh - 3rem)' }}                    // Limita la altura del modal para no salirse de la pantalla.
          onClick={(evento) => evento.stopPropagation()}                // Evita que clic dentro cierre el modal.
        >
          {/* ======================= Encabezado con alto contraste ======================= */}
          <header
            className="
              relative
              px-5 md:px-6
              py-4 md:py-5
              pcm-fondo-degradado-principal
              text-white
              overflow-hidden
            "                                                            // Header con degradado PCM global.
          >
            {/* Halo y brillos suaves para dar profundidad */}
            <div
              className="
                absolute -left-10 -top-10
                w-40 h-40
                bg-pcm-primary/40
                rounded-full blur-3xl
                opacity-60
              "
            />
            <div
              className="
                absolute -right-10 -bottom-10
                w-40 h-40
                bg-pcm-accent/40
                rounded-full blur-3xl
                opacity-60
              "
            />
            <div
              className="
                absolute inset-0
                bg-white/8
                mix-blend-overlay
                pointer-events-none
              "
            />

            {/* Contenido del header */}
            <div className="relative flex items-start justify-between gap-4">
              {/* Bloque izquierdo: texto descriptivo del proyecto */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  Proyecto público gestionado con ProCivil Manager
                </p>

                {/* Título con texto degradado vivo */}
                <h2 className="text-lg md:text-2xl font-bold leading-snug">
                  <span className="pcm-text-degradado-hero bg-clip-text text-transparent">
                    {title || 'Proyecto sin título definido'}
                  </span>
                </h2>

                {/* Línea de datos rápidos: ubicación y tipo */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{location || 'Ubicación no especificada'}</span>
                  </span>
                  <span className="hidden sm:inline text-white/40">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{type || 'Tipo de proyecto no definido'}</span>
                  </span>
                </div>
              </div>

              {/* Bloque derecho: chips de estado/prioridad + botón cerrar */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <span className={obtenerClasesChipEstado(status)}>
                    {obtenerEtiquetaEstado(status)}
                  </span>
                  <span className={obtenerClasesChipPrioridad(priority)}>
                    <Flag className="w-3 h-3" />
                    <span>Prioridad {obtenerEtiquetaPrioridad(priority)}</span>
                  </span>
                </div>

                {/* Botón circular de cierre */}
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    inline-flex items-center justify-center
                    w-8 h-8
                    rounded-full
                    border border-white/40
                    bg-black/25
                    text-white
                    hover:bg-black/35 hover:border-white
                    transition duration-150
                  "
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* ======================= Cuerpo del modal ======================= */}
          <div className="px-5 md:px-6 py-4 md:py-5 bg-pcm-surfaceSoft">
            {/* Bloque superior: resumen + alcance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {/* Columna 1-2: resumen general */}
              <div
                className="
                  md:col-span-2
                  rounded-2xl
                  bg-pcm-bg/90
                  border border-pcm-border/70
                  p-4 md:p-5
                  space-y-3
                "
              >
                <h3 className="text-sm md:text-base font-semibold text-pcm-text flex items-center gap-2">
                  <Flag className="w-4 h-4 text-pcm-primary" />
                  Resumen del proyecto
                </h3>
                <p className="text-xs md:text-sm text-pcm-muted leading-relaxed">
                  Este proyecto forma parte del portafolio público de ProCivil Manager
                  para clientes, interventores y aliados en Colombia. La información
                  presentada es de carácter informativo y refleja el alcance general,
                  tipología y nivel de avance de la obra o consultoría.
                </p>

                {/* Métricas clave: presupuesto, avance y duración */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] md:text-xs">
                  {/* Tarjeta de presupuesto (acento azul) */}
                  <div
                    className="
                      rounded-xl
                      bg-pcm-surface/90
                      border border-sky-500/40
                      p-3
                      space-y-1
                    "
                  >
                    <span className="text-pcm-muted font-medium uppercase tracking-wide">
                      Presupuesto referencial
                    </span>
                    <p className="text-sm md:text-base font-semibold text-pcm-text">
                      {budget || 'No registrado'}
                    </p>
                  </div>

                  {/* Tarjeta de avance (acento naranja) */}
                  <div
                    className="
                      rounded-xl
                      bg-pcm-surface/90
                      border border-amber-500/50
                      p-3
                      space-y-1
                    "
                  >
                    <span className="text-pcm-muted font-medium uppercase tracking-wide">
                      Nivel de avance
                    </span>

                    {/* Porcentaje con texto degradado */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm md:text-base font-semibold">
                        <span className="pcm-text-degradado-hero bg-clip-text text-transparent">
                          {typeof progress === 'number' ? `${progress}%` : 'No disponible'}
                        </span>
                      </span>
                    </div>

                    {/* Barra de progreso con degradado naranja + shimmer */}
                    <div className="mt-1.5 h-1.5 rounded-full bg-pcm-bg overflow-hidden">
                      <div
                        className="
                          h-full rounded-full
                          pcm-barra-carga-hero
                          animate-shimmer
                        "
                        style={{
                          width:
                            typeof progress === 'number'
                              ? `${Math.min(Math.max(progress, 0), 100)}%`
                              : '0%',
                          backgroundImage:
                            'linear-gradient(90deg, #f97316, #fbbf24, #f97316)' // Degradado naranja vivo.
                        }}
                      />
                    </div>
                  </div>

                  {/* Tarjeta de duración (acento verde/azul) */}
                  <div
                    className="
                      rounded-xl
                      bg-pcm-surface/90
                      border border-emerald-500/40
                      p-3
                      space-y-1
                    "
                  >
                    <span className="text-pcm-muted font-medium uppercase tracking-wide">
                      Duración estimada
                    </span>
                    <p className="text-sm md:text-base font-semibold text-pcm-text">
                      {duration || 'No definida'}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-pcm-muted">
                      <CalendarRange className="w-3.5 h-3.5 text-pcm-accent" />
                      <span>
                        Inicio: {formatearFechaCorta(startDate)}
                        <br />
                        Fin: {endDate ? formatearFechaCorta(endDate) : 'En ejecución'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Columna 3: alcance y contacto */}
              <div
                className="
                  rounded-2xl
                  bg-pcm-bg/90
                  border border-pcm-border/70
                  p-4 md:p-5
                  space-y-3
                "
              >
                <h3 className="text-sm md:text-base font-semibold text-pcm-text flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-pcm-primary" />
                  Alcance y contacto
                </h3>

                <div className="space-y-2 text-[11px] md:text-xs text-pcm-muted">
                  {/* Tipo de proyecto */}
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-pcm-accent mt-0.5" />
                    <div>
                      <p className="font-semibold text-pcm-text">Tipo de proyecto</p>
                      <p>{type || 'No definido'}</p>
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-pcm-accent mt-0.5" />
                    <div>
                      <p className="font-semibold text-pcm-text">Ubicación</p>
                      <p>{location || 'Ubicación no especificada'}</p>
                    </div>
                  </div>

                  {/* Correo de contacto */}
                  <div className="flex items-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-pcm-accent mt-0.5" />
                    <div>
                      <p className="font-semibold text-pcm-text">Contacto principal</p>
                      <p>{email || 'Correo de contacto no registrado'}</p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] md:text-xs text-pcm-muted leading-relaxed">
                  Para ampliar el detalle técnico (especificaciones, memorias de cálculo,
                  planos o anexos contractuales), el cliente o interventoría pueden
                  solicitar acceso interno a la información desde ProCivil Manager.
                </p>
              </div>
            </div>

            {/* Bloque inferior: equipo del proyecto */}
            <div
              className="
                mt-5
                rounded-2xl
                bg-pcm-surface/90
                border border-pcm-border/70
                p-4 md:p-5
                space-y-3
              "
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm md:text-base font-semibold text-pcm-text flex items-center gap-2">
                  <Users className="w-4 h-4 text-pcm-primary" />
                  Equipo del proyecto
                </h3>
                {Array.isArray(teamMembers) && teamMembers.length > 0 && (
                  <span className="text-[11px] text-pcm-muted">
                    {teamMembers.length} integrante
                    {teamMembers.length === 1 ? '' : 's'} referenciado
                  </span>
                )}
              </div>

              {Array.isArray(teamMembers) && teamMembers.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] md:text-xs">
                  {teamMembers.map((persona, indice) => (
                    <li
                      key={persona.numeroDocumento || indice}
                      className={obtenerClasesTarjetaEquipo(indice)}    // Card con color según índice.
                    >
                      {/* Avatar con iniciales y color según índice */}
                      <div className={obtenerClasesAvatarEquipo(indice)}>
                        {`${(persona.firstName || '?')[0] || ''}${
                          (persona.lastName || '?')[0] || ''
                        }`.toUpperCase()}
                      </div>

                      {/* Datos del miembro */}
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-semibold text-pcm-text">
                          {persona.firstName} {persona.lastName}
                        </p>
                        <p className="text-[11px] text-pcm-muted">
                          {persona.cargo || 'Rol no especificado'}
                        </p>
                        <p className="text-[10px] text-pcm-muted/80">
                          {persona.tipoDocumento || 'DOC'} {persona.numeroDocumento || ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] md:text-xs text-pcm-muted">
                  Aún no se ha publicado el detalle del equipo para este proyecto en la
                  vitrina pública.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente principal del modal para usarlo en la página de proyectos públicos.
export default ModalDetalleProyectoPublico;                               // Exporta el modal como componente por defecto.
