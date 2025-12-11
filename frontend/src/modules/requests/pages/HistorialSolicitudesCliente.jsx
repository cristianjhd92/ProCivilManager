// File: frontend/src/modules/requests/pages/HistorialSolicitudesCliente.jsx   // Ruta del archivo dentro del módulo de solicitudes.
// Description: Vista de historial de solicitudes para el cliente y líder de   // Descripción: muestra el historial de solicitudes del
//              obra. Muestra las solicitudes asociadas al usuario             // usuario autenticado (cliente / líder), permite filtrar
//              autenticado con filtros por tipo y estado, y permite ver       // por tipo y estado, buscar por texto y ver detalle de
//              el detalle básico de cada solicitud (descripción, materiales   // cada solicitud (descripción, materiales, respuestas),
//              y últimas respuestas), usando el tema visual PCM y ahora       // aplicando el tema visual PCM y adaptando colores al
//              adaptando colores al rol mediante las clases .pcm-panel        // rol mediante .pcm-panel y .pcm-panel--ROL en el
//              y .pcm-panel--ROL para integrarse con el workspace.            // contenedor principal.

// Importamos React y los hooks useState/useMemo para manejar estado y valores derivados.
import React, { useState, useMemo } from 'react';                              // Importa React y los hooks useState/useMemo.

// =====================================================================================
// Helpers para adaptar colores según el rol del usuario (tema PCM por rol)
// =====================================================================================

/**
 * Normaliza un rol a minúsculas sin espacios sobrantes.
 * Ejemplos:
 *   "Admin"          → "admin"
 *   "  líder de obra " → "líder de obra" (si viniera con tilde)
 *   "lider de obra"  → "lider de obra"
 */
const normalizarRol = (rol) => {
  // Si no es una cadena, devolvemos cadena vacía.
  if (typeof rol !== 'string') return '';
  // Eliminamos espacios y pasamos a minúsculas.
  return rol.trim().toLowerCase();
};

/**
 * Devuelve las clases base de panel PCM según el rol.
 * Usa las clases globales:
 *  - .pcm-panel           → base de panel
 *  - .pcm-panel--admin    → azul (administrador)
 *  - .pcm-panel--lider    → naranja (líder de obra)
 *  - .pcm-panel--cliente  → verde (cliente)
 *  - .pcm-panel--auditor  → morado (auditor)
 */
const obtenerClasesRolPanel = (rolNormalizado) => {
  // Según el rol normalizado, devolvemos las clases correspondientes.
  switch (rolNormalizado) {
    case 'admin':                                                          // Rol administrador.
      return 'pcm-panel pcm-panel--admin';                                 // Panel con esquema azul.
    case 'lider de obra':                                                  // Rol líder de obra.
      return 'pcm-panel pcm-panel--lider';                                 // Panel con esquema naranja.
    case 'cliente':                                                        // Rol cliente.
      return 'pcm-panel pcm-panel--cliente';                               // Panel con esquema verde.
    case 'auditor':                                                        // Rol auditor.
      return 'pcm-panel pcm-panel--auditor';                               // Panel con esquema morado.
    default:                                                               // Cualquier otro valor de rol.
      return 'pcm-panel';                                                  // Panel neutro PCM.
  }
};

/**
 * Componente principal de historial de solicitudes del cliente / líder de obra.
 *
 * Props:
 *  - solicitudes: arreglo de solicitudes que ya vienen filtradas por el backend
 *                 según el usuario autenticado.
 *  - loading:     booleano que indica si se está actualizando la información
 *                 (útil para mostrar feedback al usuario).
 *  - onRefresh:   callback opcional para volver a cargar los datos desde el
 *                 componente padre (por ejemplo, Dashboard).
 *  - userRole:    rol del usuario autenticado (admin, lider de obra, cliente, etc.)
 *                 para personalizar textos y colores.
 */
const HistorialSolicitudesCliente = ({
  solicitudes = [],                                                         // Lista de solicitudes (por defecto, arreglo vacío).
  loading = false,                                                          // Indicador de carga.
  onRefresh,                                                                // Callback para refrescar datos desde el padre.
  userRole = '',                                                            // Rol del usuario autenticado recibido por props.
}) => {
  // ============================
  //  Detección y normalización del rol para colores (Regla de roles)
  // ============================

  // Primero normalizamos el rol que viene por props.
  const rolDesdeProp = normalizarRol(userRole);                             // Rol normalizado desde la prop userRole.

  // Inicializamos la variable que representará el rol final a usar.
  let rolUsuarioActual = rolDesdeProp || '';                                // Comenzamos con el rol de la prop (si existe).

  // Si no vino rol por props, intentamos recuperarlo desde localStorage.
  if (!rolUsuarioActual) {
    try {
      // Solo intentamos leer localStorage si estamos en un entorno de navegador.
      const rawUsuario =
        typeof window !== 'undefined'                                        // Verificamos que exista window.
          ? (localStorage.getItem('user') ||                                 // Intentamos con la clave 'user'.
             localStorage.getItem('pcm_usuario') ||                          // O la clave legacy 'pcm_usuario'.
             '{}')                                                           // Si no, usamos un objeto vacío.
          : '{}';

      const usuarioLocal = JSON.parse(rawUsuario);                           // Parseamos el JSON del usuario.

      // Tomamos el rol desde las posibles propiedades (role en inglés o rol en español).
      const rolLocal = normalizarRol(
        (usuarioLocal && (usuarioLocal.role || usuarioLocal.rol)) || ''      // Rol local encontrado (o vacío).
      );

      if (rolLocal) {
        rolUsuarioActual = rolLocal;                                         // Si hay rol en localStorage, lo usamos.
      }
    } catch (error) {
      // Si algo falla al leer o parsear, dejamos rolUsuarioActual como cadena vacía.
      rolUsuarioActual = '';
    }
  }

  // Si después de todo seguimos sin rol, asumimos cliente como valor por defecto.
  if (!rolUsuarioActual) {
    rolUsuarioActual = 'cliente';                                            // Rol por defecto: cliente.
  }

  // Calculamos las clases de panel PCM según el rol detectado.
  const clasesPanelRol = obtenerClasesRolPanel(rolUsuarioActual);           // Clases tipo "pcm-panel pcm-panel--cliente".

  // ============================
  //  Estado local de filtros y UI
  // ============================

  // Estado para el término de búsqueda libre (título, descripción, etc.).
  const [terminoBusqueda, setTerminoBusqueda] = useState('');               // Texto introducido en el buscador.

  // Estado para filtro por tipo de solicitud: proyecto / material.
  const [filtroTipo, setFiltroTipo] = useState('todos');                    // 'todos' | 'proyecto' | 'material' (o lo que venga del backend).

  // Estado para filtro por estado de la solicitud.
  const [filtroEstado, setFiltroEstado] = useState('todos');                // 'todos' | 'pendiente' | 'aprobada' | 'rechazada' | 'procesada'.

  // Estado para controlar qué solicitud está expandida en detalle.
  const [idExpandido, setIdExpandido] = useState(null);                     // Guarda el _id (o id) de la solicitud expandida.

  // Flag para saber si hay solicitudes en general (antes de aplicar filtros).
  const haySolicitudes =
    Array.isArray(solicitudes) && solicitudes.length > 0;                   // true si existen registros en bruto.

  // ============================
  //  Títulos y textos según rol
  // ============================

  // Definimos el título principal según el rol.
  const tituloCabecera = (() => {                                           // IIFE para calcular el título de cabecera.
    if (rolUsuarioActual === 'lider de obra') {                             // Si el rol es líder de obra.
      return 'Historial de solicitudes de materiales';                      // Texto específico para líder de obra.
    }
    if (rolUsuarioActual === 'cliente') {                                   // Si el rol es cliente.
      return 'Historial de mis solicitudes';                                // Texto específico para cliente.
    }
    // Fallback genérico.
    return 'Historial de solicitudes';                                      // Título genérico si no se recibió un rol esperado.
  })();

  // Definimos el subtítulo según el rol.
  const subtituloCabecera = (() => {                                        // IIFE para calcular el subtítulo de cabecera.
    if (rolUsuarioActual === 'lider de obra') {                             // Para líder de obra.
      return 'Consulta el estado de las solicitudes de materiales que has registrado para tus obras.';
    }
    if (rolUsuarioActual === 'cliente') {                                   // Para cliente.
      return 'Consulta el estado de las solicitudes de proyectos y materiales que has realizado.';
    }
    // Fallback genérico.
    return 'Consulta el estado de las solicitudes registradas en la plataforma.';
  })();

  // ============================
  //  Derivar valores únicos para filtros
  // ============================

  // Lista de tipos únicos presentes en las solicitudes (por si en el futuro se amplía).
  const tiposUnicos = useMemo(() => {                                       // Memoizamos para no recalcular en cada render.
    const tipos = solicitudes                                               // Partimos del arreglo completo de solicitudes.
      .map((solicitud) => solicitud.tipo)                                   // Extrae el tipo de cada solicitud.
      .filter((tipo) => !!tipo);                                            // Elimina valores null/undefined/vacíos.

    return Array.from(new Set(tipos));                                      // Convierte Set a array de tipos únicos.
  }, [solicitudes]);                                                        // Se recalcula cuando cambian las solicitudes.

  // ============================
  //  Filtrado de solicitudes
  // ============================

  const solicitudesFiltradas = useMemo(() => {                              // Memoizamos las solicitudes ya filtradas.
    const termino = terminoBusqueda.trim().toLowerCase();                   // Normalizamos el término de búsqueda a minúsculas.

    // Recorremos todas las solicitudes y aplicamos filtros.
    return solicitudes.filter((solicitud) => {                              // Filtra el arreglo original.
      // ---- Filtro de búsqueda libre ----
      const titulo = (solicitud.titulo || '').toLowerCase();               // Título en minúsculas.
      const descripcion = (solicitud.descripcion || '').toLowerCase();     // Descripción en minúsculas.
      const estado = (solicitud.estado || '').toLowerCase();               // Estado en minúsculas.

      const coincideBusqueda =                                              // Determina si coincide con el término de búsqueda.
        !termino ||                                                         // Si no hay término, pasa el filtro.
        titulo.includes(termino) ||                                         // Coincidencia en título.
        descripcion.includes(termino) ||                                    // Coincidencia en descripción.
        estado.includes(termino);                                           // Coincidencia en estado.

      // ---- Filtro por tipo ----
      const coincideTipo =
        filtroTipo === 'todos' ||                                           // Si el filtro es 'todos', se acepta.
        (solicitud.tipo && solicitud.tipo === filtroTipo);                  // Coincidencia exacta por tipo.

      // ---- Filtro por estado ----
      const coincideEstado =
        filtroEstado === 'todos' ||                                         // Sin filtro de estado.
        estado === filtroEstado;                                            // Coincidencia exacta por estado normalizado.

      // Incluimos solo si pasa todos los filtros.
      return coincideBusqueda && coincideTipo && coincideEstado;
    });
  }, [solicitudes, terminoBusqueda, filtroTipo, filtroEstado]);             // Dependencias del useMemo.

  // ============================
  //  Helpers de formato
  // ============================

  // Devuelve clases Tailwind para el badge según estado.
  const obtenerClasesEstado = (estado = '') => {                            // Función para mapear estado → clases de color.
    const estadoNormalizado = estado.toLowerCase();                         // Normalizamos a minúsculas.

    if (estadoNormalizado === 'pendiente') {                                // Estado pendiente.
      return 'bg-amber-500/10 text-amber-200 border border-amber-400/40';
    }
    if (estadoNormalizado === 'aprobada') {                                 // Estado aprobada.
      return 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/40';
    }
    if (estadoNormalizado === 'rechazada') {                                // Estado rechazada.
      return 'bg-rose-500/10 text-rose-200 border border-rose-400/40';
    }
    if (estadoNormalizado === 'procesada') {                                // Estado procesada.
      return 'bg-sky-500/10 text-sky-200 border border-sky-400/40';
    }
    // Estado desconocido / vacío.
    return 'bg-slate-600/30 text-slate-100 border border-slate-500/40';
  };

  // Formatea una fecha en formato legible local (Colombia).
  const formatearFecha = (valorFecha) => {                                  // Helper para formatear fechas.
    if (!valorFecha) return '';                                             // Si no viene fecha, devolvemos cadena vacía.
    const fecha = new Date(valorFecha);                                     // Construimos objeto Date.
    if (Number.isNaN(fecha.getTime())) return '';                           // Validamos que sea una fecha válida.

    return fecha.toLocaleString('es-CO', {                                  // Usamos formato local colombiano.
      dateStyle: 'short',                                                   // Fecha corta.
      timeStyle: 'short',                                                   // Hora corta.
    });
  };

  // Texto resumen del tipo de solicitud.
  const obtenerEtiquetaTipo = (tipo) => {                                   // Helper para mapear tipo → etiqueta amigable.
    if (!tipo) return 'Sin tipo';                                           // Si no hay tipo, devolvemos texto por defecto.
    if (tipo === 'proyecto') return 'Solicitud de proyecto';                // Etiqueta para tipo proyecto.
    if (tipo === 'material') return 'Solicitud de materiales';              // Etiqueta para tipo material.
    return tipo;                                                            // Fallback al texto tal cual.
  };

  // ============================
  //  Render principal
  // ============================

  return (
    <div
      // Contenedor principal usando el helper .pcm-card y las clases de panel por rol.
      className={`pcm-card backdrop-blur-xl space-y-4 animate-fade-in-soft ${clasesPanelRol}`}
    >
      {/* Encabezado de sección con título y descripción */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Título y descripción breve */}
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-pcm-text flex items-center">
            {/* Barra de color al lado del título */}
            <span className="w-1 h-6 bg-pcm-primary rounded-full mr-3" />
            {tituloCabecera}
          </h2>
          <p className="text-xs md:text-sm text-pcm-muted mt-1">
            {subtituloCabecera}
          </p>
        </div>

        {/* Bloque de acciones: botón refrescar y contador */}
        <div className="flex flex-col items-end gap-2">
          {/* Indicador de cuántas solicitudes se están mostrando */}
          <div className="text-xs md:text-sm text-pcm-muted">
            Mostrando{' '}
            <span className="font-semibold text-pcm-text">
              {solicitudesFiltradas.length}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-pcm-text">
              {solicitudes.length}
            </span>{' '}
            solicitudes
          </div>

          {/* Botón de refrescar, solo si se proporcionó callback */}
          {typeof onRefresh === 'function' && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="pcm-btn-ghost text-xs md:text-sm px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          )}

          {/* Texto de estado de carga opcional */}
          {loading && (
            <p className="text-[11px] text-pcm-muted">
              Cargando solicitudes, por favor espera…
            </p>
          )}
        </div>
      </div>

      {/* Filtros: búsqueda + tipo + estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Búsqueda libre */}
        <div className="col-span-1">
          <label className="block text-xs text-pcm-muted mb-1">
            Buscar por título, descripción o estado
          </label>
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(evento) => setTerminoBusqueda(evento.target.value)}
            placeholder="Ej: proyecto, materiales, pendiente..."
            className="w-full px-3 py-2 rounded-lg bg-pcm-bg/70 border border-white/10
                       text-pcm-text placeholder-pcm-muted/70 text-sm
                       focus:outline-none focus:ring-1 focus:ring-pcm-primary focus:border-pcm-primary
                       transition duration-150"
          />
        </div>

        {/* Filtro por tipo de solicitud */}
        <div className="col-span-1">
          <label className="block text-xs text-pcm-muted mb-1">
            Tipo de solicitud
          </label>
          <select
            value={filtroTipo}
            onChange={(evento) => setFiltroTipo(evento.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-pcm-bg/70 border border-white/10
                       text-pcm-text text-sm focus:outline-none focus:ring-1
                       focus:ring-pcm-primary focus:border-pcm-primary
                       transition duration-150"
          >
            <option value="todos">Todos los tipos</option>
            {/* Map de tipos únicos, por si en el futuro se amplía más allá de proyecto/material */}
            {tiposUnicos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {obtenerEtiquetaTipo(tipo)}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por estado */}
        <div className="col-span-1">
          <label className="block text-xs text-pcm-muted mb-1">
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(evento) => setFiltroEstado(evento.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-pcm-bg/70 border border-white/10
                       text-pcm-text text-sm focus:outline-none focus:ring-1
                       focus:ring-pcm-primary focus:border-pcm-primary
                       transition duration-150"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
            <option value="procesada">Procesada</option>
          </select>
        </div>
      </div>

      {/* Tabla / lista de solicitudes */}
      <div className="mt-2 border border-white/10 rounded-xl overflow-hidden bg-pcm-bg/60">
        {/* Encabezados tipo tabla, visibles en escritorio */}
        <div className="hidden md:grid md:grid-cols-6 gap-2 px-4 py-3 text-xs font-semibold text-pcm-muted bg-pcm-bg/80 border-b border-white/10">
          <span>Fecha</span>
          <span>Título</span>
          <span>Tipo</span>
          <span>Estado</span>
          <span>Materiales</span>
          <span className="text-right">Última actualización</span>
        </div>

        {/* Cuerpo: si no hay resultados */}
        {solicitudesFiltradas.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-pcm-muted">
            {!haySolicitudes
              ? 'Aún no tienes solicitudes registradas.'                     // Caso sin solicitudes en absoluto.
              : 'No se encontraron solicitudes con los filtros seleccionados.'}
          </div>
        )}

        {/* Cuerpo: lista de solicitudes */}
        <div className="divide-y divide-white/10">
          {solicitudesFiltradas.map((solicitud) => {
            // Obtenemos un id estable para usar como key y para expandir/contraer.
            const idSolicitud =
              solicitud._id || solicitud.id || solicitud.solicitudId;

            // Cantidad total de materiales solicitados (si aplica).
            const totalMateriales = Array.isArray(solicitud.materiales)
              ? solicitud.materiales.length
              : 0;

            // Determinamos si esta solicitud está expandida.
            const estaExpandida = idExpandido === idSolicitud;

            return (
              <div
                key={idSolicitud}
                className={`px-4 py-3 cursor-pointer transition duration-200 ${
                  estaExpandida
                    ? 'bg-pcm-surfaceSoft/80 shadow-pcm-soft'               // Fila seleccionada con un poco más de brillo.
                    : 'hover:bg-pcm-surfaceSoft/60'                         // Hover suave cuando no está expandida.
                }`}
                onClick={() =>
                  setIdExpandido(estaExpandida ? null : idSolicitud)
                } // Al hacer clic, alternamos expandir/contraer.
              >
                {/* Fila principal en layout de grid (desktop) */}
                <div className="hidden md:grid md:grid-cols-6 gap-2 items-center">
                  <span className="text-xs text-pcm-muted">
                    {formatearFecha(
                      solicitud.fechaSolicitud || solicitud.createdAt
                    )}
                  </span>
                  <span className="text-sm text-pcm-text font-medium truncate">
                    {solicitud.titulo || 'Sin título'}
                  </span>
                  <span className="text-xs text-pcm-text">
                    {obtenerEtiquetaTipo(solicitud.tipo)}
                  </span>
                  <span
                    className={
                      'inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-semibold ' +
                      obtenerClasesEstado(solicitud.estado)
                    }
                  >
                    {solicitud.estado || 'Sin estado'}
                  </span>
                  <span className="text-xs text-pcm-muted">
                    {solicitud.tipo === 'material'
                      ? `${totalMateriales} ítem(s)`
                      : '—'}
                  </span>
                  <span className="text-xs text-pcm-muted text-right">
                    {formatearFecha(
                      solicitud.fechaActualizacion || solicitud.updatedAt
                    )}
                  </span>
                </div>

                {/* Fila principal en layout "card" para móvil */}
                <div className="flex flex-col gap-1 md:hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-pcm-muted">
                      {formatearFecha(
                        solicitud.fechaSolicitud || solicitud.createdAt
                      )}
                    </span>
                    <span
                      className={
                        'inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-semibold ' +
                        obtenerClasesEstado(solicitud.estado)
                      }
                    >
                      {solicitud.estado || 'Sin estado'}
                    </span>
                  </div>
                  <p className="text-sm text-pcm-text font-medium">
                    {solicitud.titulo || 'Sin título'}
                  </p>
                  <p className="text-[11px] text-pcm-muted">
                    {obtenerEtiquetaTipo(solicitud.tipo)}{' '}
                    {solicitud.tipo === 'material' &&
                      `· ${totalMateriales} ítem(s)`}
                  </p>
                  <p className="text-[11px] text-pcm-muted">
                    Última actualización:{' '}
                    {formatearFecha(
                      solicitud.fechaActualizacion || solicitud.updatedAt
                    )}
                  </p>
                </div>

                {/* Bloque de detalle expandible */}
                {estaExpandida && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs md:text-sm text-pcm-text space-y-3">
                    {/* Descripción */}
                    {solicitud.descripcion && (
                      <div>
                        <p className="font-semibold text-pcm-text mb-1">
                          Descripción
                        </p>
                        <p className="text-pcm-muted">
                          {solicitud.descripcion}
                        </p>
                      </div>
                    )}

                    {/* Materiales, solo si la solicitud es de materiales */}
                    {solicitud.tipo === 'material' &&
                      Array.isArray(solicitud.materiales) &&
                      solicitud.materiales.length > 0 && (
                        <div>
                          <p className="font-semibold text-pcm-text mb-1">
                            Materiales solicitados
                          </p>
                          <ul className="space-y-1">
                            {solicitud.materiales.map((material, indice) => {
                              const nombreMaterial =
                                material.nombreMaterial ||
                                (material.material && material.material.nombre) ||
                                'Material';

                              const cantidad =
                                material.cantidad ||
                                material.cantidadAsignada ||
                                material.cantidadSolicitada ||
                                0;

                              return (
                                <li
                                  key={indice}
                                  className="flex justify-between items-center bg-pcm-bg/80 border border-white/10 rounded-lg px-3 py-2"
                                >
                                  <span className="text-pcm-text">
                                    {nombreMaterial}
                                  </span>
                                  <span className="text-pcm-muted">
                                    Cantidad:{' '}
                                    <span className="font-semibold text-pcm-text">
                                      {cantidad}
                                    </span>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                    {/* Resumen de respuestas (timeline corto) */}
                    {Array.isArray(solicitud.respuestas) &&
                      solicitud.respuestas.length > 0 && (
                        <div>
                          <p className="font-semibold text-pcm-text mb-1">
                            Últimas respuestas
                          </p>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 pcm-scroll-y">
                            {solicitud.respuestas
                              .slice()                                    // Clonamos el arreglo.
                              .reverse()                                  // Invertimos para mostrar las más recientes.
                              .slice(0, 3)                                // Limitamos a máximo 3.
                              .map((respuesta, indice) => (
                                <div
                                  key={indice}
                                  className="bg-pcm-bg/80 border border-white/10 rounded-lg px-3 py-2"
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-pcm-muted">
                                      {formatearFecha(respuesta.fecha)}
                                    </span>
                                    <span className="text-[11px] text-pcm-muted">
                                      {respuesta.autorNombre || 'Respuesta'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-pcm-text">
                                    {respuesta.mensaje}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Pie con recordatorio de click para cerrar */}
                    <p className="text-[11px] text-pcm-muted">
                      Haz clic nuevamente sobre la fila para ocultar este detalle.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Exportamos el componente para usarlo en el Dashboard o en otras vistas.
export default HistorialSolicitudesCliente;                                   // Exportación por defecto del componente.
