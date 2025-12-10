// File: frontend/src/modules/projects/pages/HistorialProyectosCliente.jsx
// Description: Vista interna del workspace que muestra el historial de proyectos/obras
//              asociados al cliente autenticado. Consume el endpoint /proyectos/mis-proyectos
//              usando JWT, permite filtrar por estado y por texto (título o ubicación), y
//              muestra tarjetas con resumen y un modal con detalles. Es una vista privada
//              diseñada para el rol cliente, integrada al TableroTrabajo y al tema visual PCM
//              (paleta pcm, sombras, helpers de panel y animaciones).

// ==========================
// Importaciones principales
// ==========================
import React, { useEffect, useState } from 'react';        // Importa React y los hooks useState/useEffect.

// Importa íconos desde lucide-react para la interfaz.
import {
  Search,                                                 // Ícono de lupa para búsqueda de proyectos.
  Filter,                                                 // Ícono de filtro para la barra de estados.
  Calendar,                                               // Ícono para fechas de inicio y fin.
  MapPin,                                                 // Ícono para ubicación del proyecto.
  Eye,                                                    // Ícono para ver detalles en el modal.
  X,                                                      // Ícono para cerrar el modal.
} from 'lucide-react';

// ======================================
// Componente principal de historial (cliente)
// ======================================
const HistorialProyectosCliente = ({ rolUsuario = '' }) => {
  // ==========================
  // Estado principal de datos
  // ==========================
  const [proyectos, setProyectos] = useState([]);          // Lista de proyectos del cliente.
  const [cargando, setCargando] = useState(true);          // Indicador de carga.
  const [error, setError] = useState(null);                // Error de carga.

  // ==========================
  // Estado de filtros
  // ==========================
  const [filtroTexto, setFiltroTexto] = useState('');      // Búsqueda por título/ubicación.
  const [filtroEstado, setFiltroEstado] = useState('todos'); // Estado seleccionado (todos, pendiente, en_proceso, finalizado, etc.).

  // ==========================
  // Estado del modal de detalle
  // ==========================
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null); // Proyecto para el modal.

  // Lista de estados posibles para generar los filtros tipo "chips".
  const estadosDisponibles = [
    { clave: 'todos', etiqueta: 'Todos' },                 // Opción sin filtro de estado.
    { clave: 'pendiente', etiqueta: 'Pendiente' },
    { clave: 'planificacion', etiqueta: 'Planificación' },
    { clave: 'en_ejecucion', etiqueta: 'En ejecución' },
    { clave: 'finalizado', etiqueta: 'Finalizado' },
    { clave: 'cancelado', etiqueta: 'Cancelado' },
  ];

  // ==========================
  // Efecto: cargar proyectos del cliente
  // ==========================
  useEffect(() => {
    const cargarProyectosCliente = async () => {
      setCargando(true);                                   // Activa indicador de carga.
      setError(null);                                      // Limpa error previo.

      try {
        const token = localStorage.getItem('token');       // Recupera el token JWT.
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/proyectos/mis-proyectos`, // Endpoint privado para proyectos del usuario.
          {
            headers: {
              Authorization: `Bearer ${token}`,            // Envía token en el encabezado Authorization.
            },
          },
        );

        const data = await response.json();                // Parsea la respuesta.

        if (!response.ok) {                                // Si la respuesta no fue exitosa...
          throw new Error(data.message || 'Error al cargar el historial de proyectos.');
        }

        setProyectos(Array.isArray(data) ? data : data.proyectos || []); // Normaliza la respuesta a un arreglo.
      } catch (err) {
        console.error('Error cargando historial de proyectos del cliente:', err);
        setError(
          err.message ||
            'Ocurrió un error al cargar el historial de proyectos. Intenta de nuevo más tarde.',
        );
      } finally {
        setCargando(false);                                // Desactiva indicador de carga.
      }
    };

    cargarProyectosCliente();                              // Lanza la carga al montar.
  }, []); // Solo una vez al montar.

  // ==========================
  // Helpers de formato
  // ==========================
  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return 'Sin fecha';                     // Maneja valores nulos.
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return 'Sin fecha'; // Si no se puede parsear, retorna genérico.

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });                                                    // Devuelve la fecha en formato dd/mm/aaaa para Colombia.
  };

  const normalizarEstado = (estadoBruto) => {
    const valor = (estadoBruto || '').toString().toLowerCase(); // Normaliza el texto.
    if (!valor) return 'Sin estado';

    switch (valor) {
      case 'pendiente':
        return 'Pendiente';
      case 'planificacion':
      case 'planificación':
        return 'Planificación';
      case 'en_ejecucion':
      case 'en ejecución':
      case 'en proceso':
        return 'En ejecución';
      case 'finalizado':
      case 'completado':
        return 'Finalizado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return valor.charAt(0).toUpperCase() + valor.slice(1); // Capitaliza cualquier otro caso.
    }
  };

  // Devuelve una clase de chip según el estado,
  // utilizando colores PCM genéricos (los tonos finales dependen del rol por .pcm-panel--cliente).
  const obtenerClaseChipEstado = (estadoBruto) => {
    const valor = (estadoBruto || '').toString().toLowerCase();

    if (valor === 'pendiente') {
      return 'bg-pcm-estado-pending text-pcm-text';        // Usa backgroundImage personalizado si existe.
    }
    if (valor === 'planificacion' || valor === 'planificación') {
      return 'bg-pcm-estado-planning text-pcm-text';
    }
    if (
      valor === 'en_ejecucion' ||
      valor === 'en ejecución' ||
      valor === 'en proceso'
    ) {
      return 'bg-pcm-estado-active text-pcm-text';
    }
    if (valor === 'finalizado' || valor === 'completado') {
      return 'bg-pcm-estado-completed text-pcm-text';
    }
    if (valor === 'cancelado') {
      return 'bg-red-900/40 text-red-200 border border-red-500/40';
    }

    return 'bg-pcm-surface text-pcm-text border border-white/5'; // Fallback genérico.
  };

  // ==========================
  // Filtro de proyectos
  // ==========================
  const proyectosFiltrados = proyectos.filter((proyecto) => {
    const texto = filtroTexto.toLowerCase();               // Texto de búsqueda en minúsculas.
    const coincideTexto =
      !texto ||
      (proyecto.title || '').toLowerCase().includes(texto) ||
      (proyecto.location || '').toLowerCase().includes(texto); // Coincidencia por título o ubicación.

    const estadoNormalizado = (proyecto.estado || proyecto.status || '').toString().toLowerCase();
    const coincideEstado =
      filtroEstado === 'todos' ||
      estadoNormalizado === filtroEstado;                  // Coincide si el filtro es "todos" o el mismo estado.

    return coincideTexto && coincideEstado;               // Aplica ambos filtros.
  });

  // ==========================
  // Render principal
  // ==========================
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Encabezado de la vista */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-pcm-text">
            Historial de proyectos
          </h2>
          <p className="text-sm text-pcm-muted max-w-2xl">
            Aquí encuentras el resumen de las obras que has solicitado o que se han ejecutado
            para tu cuenta. Puedes filtrar por estado o buscar por título y ubicación.
          </p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="rounded-pcm-xl bg-pcm-surfaceSoft/90 border border-white/5 shadow-pcm-soft p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Filtro de texto */}
        <div className="relative w-full md:max-w-md">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pcm-muted"
          />
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)} // Actualiza el filtro de texto.
            className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 pl-9 pr-4 py-2.5 text-sm text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
            placeholder="Buscar por título o ubicación..."
          />
        </div>

        {/* Filtros de estado */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-pcm-muted">
            <Filter size={14} className="mr-1" />
            Estado:
          </span>
          <div className="flex flex-wrap gap-2">
            {estadosDisponibles.map((estado) => {
              const esActivo = filtroEstado === estado.clave; // Verifica si el chip está activo.

              return (
                <button
                  key={estado.clave}
                  type="button"
                  onClick={() => setFiltroEstado(estado.clave)} // Cambia el filtro de estado.
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    esActivo
                      ? 'bg-pcm-primary text-slate-950 border-pcm-primary shadow-pcm-soft'
                      : 'bg-pcm-bg/70 text-pcm-muted border-white/5 hover:border-pcm-primary/50 hover:text-pcm-text'
                  }`}
                >
                  {estado.etiqueta}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido principal: listado o estados vacíos */}
      <div className="space-y-4">
        {/* Estado de carga */}
        {cargando && (
          <div className="rounded-pcm-xl bg-pcm-surfaceSoft/80 border border-white/5 shadow-pcm-soft px-4 py-6 text-center text-sm text-pcm-muted">
            Cargando historial de proyectos...
          </div>
        )}

        {/* Estado de error */}
        {error && !cargando && (
          <div className="rounded-pcm-xl bg-red-950/40 border border-red-500/40 shadow-pcm-soft px-4 py-6 text-sm text-red-100">
            {error}
          </div>
        )}

        {/* Estado sin resultados */}
        {!cargando && !error && proyectosFiltrados.length === 0 && (
          <div className="rounded-pcm-xl bg-pcm-surfaceSoft/80 border border-white/5 shadow-pcm-soft px-4 py-8 text-center">
            <p className="text-base font-medium text-pcm-text">
              No se encontraron proyectos con los filtros actuales.
            </p>
            <p className="text-sm text-pcm-muted mt-1">
              Ajusta la búsqueda por texto o selecciona otro estado para ver más resultados.
            </p>
          </div>
        )}

        {/* Listado de proyectos */}
        {!cargando && !error && proyectosFiltrados.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {proyectosFiltrados.map((proyecto) => {
              const estado = proyecto.estado || proyecto.status; // Soporta distintos nombres de campo.

              return (
                <article
                  key={proyecto._id}
                  className="bg-pcm-card/90 border border-white/5 rounded-pcm-xl shadow-pcm-soft p-4 flex flex-col justify-between gap-3"
                >
                  <header className="space-y-1">
                    <h3 className="text-sm font-semibold text-pcm-text line-clamp-2">
                      {proyecto.title || 'Proyecto sin título'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-pcm-muted">
                      <MapPin size={14} />
                      <span className="line-clamp-1">
                        {proyecto.location || 'Ubicación no registrada'}
                      </span>
                    </div>
                  </header>

                  {/* Estado y fechas */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${obtenerClaseChipEstado(
                        estado,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-pcm-bg/80" />
                      {normalizarEstado(estado)}
                    </span>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="inline-flex items-center gap-1 text-pcm-muted">
                        <Calendar size={12} />
                        <span>
                          {formatearFecha(proyecto.startDate)} -{' '}
                          {formatearFecha(proyecto.endDate)}
                        </span>
                      </span>
                      {proyecto.budget && (
                        <span className="text-pcm-muted">
                          Presupuesto:{' '}
                          <span className="font-semibold text-pcm-text">
                            ${proyecto.budget}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botón ver detalle */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setProyectoSeleccionado(proyecto)} // Abre el modal con el proyecto.
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-pcm-surface/80 text-pcm-text border border-white/5 hover:bg-pcm-surfaceSoft transition"
                    >
                      <Eye size={14} />
                      Ver detalle
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalle de proyecto */}
      {proyectoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Overlay semitransparente */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setProyectoSeleccionado(null)}  // Cierra el modal al hacer clic fuera.
          />

          {/* Contenedor del modal */}
          <div className="relative w-full max-w-xl rounded-pcm-xl bg-pcm-surfaceSoft/95 border border-white/10 shadow-pcm-soft px-5 py-6 md:px-6 md:py-7 animate-pagina-in">
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => setProyectoSeleccionado(null)} // Cierra el modal.
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-pcm-bg/80 text-pcm-muted hover:text-pcm-text hover:bg-pcm-surface transition"
            >
              <span className="sr-only">Cerrar</span>
              <X size={16} />
            </button>

            {/* Contenido del modal */}
            <div className="space-y-4">
              <header className="space-y-1 pr-8">
                <h3 className="text-lg font-semibold text-pcm-text">
                  {proyectoSeleccionado.title || 'Proyecto sin título'}
                </h3>
                <p className="text-xs text-pcm-muted">
                  {proyectoSeleccionado.location || 'Ubicación no registrada'}
                </p>
              </header>

              {/* Estado y fechas */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${obtenerClaseChipEstado(
                    proyectoSeleccionado.estado || proyectoSeleccionado.status,
                  )}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-pcm-bg/80" />
                  {normalizarEstado(
                    proyectoSeleccionado.estado || proyectoSeleccionado.status,
                  )}
                </span>
                <span className="inline-flex items-center gap-1 text-pcm-muted">
                  <Calendar size={12} />
                  <span>
                    {formatearFecha(proyectoSeleccionado.startDate)} -{' '}
                    {formatearFecha(proyectoSeleccionado.endDate)}
                  </span>
                </span>
              </div>

              {/* Información económica y observaciones */}
              <div className="space-y-2 text-sm">
                {proyectoSeleccionado.budget && (
                  <p className="text-pcm-text">
                    <span className="font-semibold">Presupuesto: </span>
                    ${proyectoSeleccionado.budget}
                  </p>
                )}
                {proyectoSeleccionado.priority && (
                  <p className="text-pcm-text">
                    <span className="font-semibold">Prioridad: </span>
                    {proyectoSeleccionado.priority}
                  </p>
                )}
                <p className="text-pcm-muted">
                  <span className="font-semibold text-pcm-text">
                    Comentarios / descripción:{' '}
                  </span>
                  {proyectoSeleccionado.comentario ||
                    proyectoSeleccionado.description ||
                    'Sin comentarios registrados.'}
                </p>
              </div>
            </div>

            {/* Botón cerrar abajo (para pantallas pequeñas) */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setProyectoSeleccionado(null)} // Cierra el modal.
                className="inline-flex items-center justify-center rounded-pcm-xl border border-white/10 bg-pcm-bg/80 px-5 py-2 text-xs font-semibold text-pcm-text hover:bg-pcm-surfaceSoft transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ======================================
// Exportación del componente principal
// ======================================
export default HistorialProyectosCliente;                  // Exporta la vista para integrarla en el TableroTrabajo.
