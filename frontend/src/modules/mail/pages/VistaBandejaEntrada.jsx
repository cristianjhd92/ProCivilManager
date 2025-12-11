// File: frontend/src/modules/mail/pages/VistaBandejaEntrada.jsx
// Description: Bandeja de entrada de mensajes de contacto del sistema.
//              Vista que permite buscar y filtrar mensajes por texto,
//              tipo de proyecto y rango de fechas, mostrando solo los
//              mensajes que el usuario tiene permitidos según su rol
//              y su correo. El componente principal exportado se llama
//              VistaBandejaEntrada y aplica el tema PCM, incluyendo
//              colores dinámicos por rol mediante las clases .pcm-panel
//              y .pcm-panel--ROL en el contenedor principal.

// =====================
// Importaciones
// =====================
import React, { useState, useMemo } from 'react';               // Importa React y los hooks useState/useMemo para estado y memorias.
import { Search, Filter, X } from 'lucide-react';               // Importa íconos de lupa, filtros y limpiar desde lucide-react.

// =====================
// Componente principal
// =====================
const VistaBandejaEntrada = ({
  emails: correos = [],                                         // Alias interno en español para la lista de correos recibidos por props.
  onSelectEmail: alSeleccionarCorreo,                           // Alias interno para el callback al seleccionar un correo.
}) => {
  // Componente funcional que representa la bandeja de entrada.
  // Recibe:
  //  - correos: lista de mensajes de contacto.
  //  - alSeleccionarCorreo: callback opcional al seleccionar un correo.

  // ---------------------
  // Estado de filtros
  // ---------------------
  const [terminoBusqueda, setTerminoBusqueda] = useState('');   // Texto de búsqueda libre (nombre, correo, empresa, mensaje).
  const [filtroProyecto, setFiltroProyecto] = useState('');     // Filtro por tipo de proyecto seleccionado.
  const [filtroFecha, setFiltroFecha] = useState('');           // Filtro por rango de fecha (today, week, month).
  const [mostrarFiltros, setMostrarFiltros] = useState(false);  // Controla si se muestra el panel de filtros avanzados.

  // ---------------------
  // Datos de usuario / rol (estándar PCM)
  // ---------------------
  const usuario = (() => {                                      // Función autoejecutable para leer el usuario desde localStorage.
    try {
      // Primero intenta leer el usuario estándar PCM; si no existe, cae a la clave antigua "user".
      const datoGuardado =
        localStorage.getItem('pcm_usuario') ||
        localStorage.getItem('user') ||
        null;                                                   // Si no hay nada almacenado, será null.

      if (!datoGuardado) return {};                            // Si no hay dato guardado, devuelve un objeto vacío.

      return JSON.parse(datoGuardado);                         // Intenta parsear el JSON almacenado.
    } catch {
      // Si algo falla (JSON mal formado, etc.), devuelve objeto vacío.
      return {};
    }
  })();                                                         // Se ejecuta inmediatamente y el resultado se asigna a "usuario".

  const rolDetectado =
    usuario?.rol ||                                            // 1. Campo "rol" (estándar PCM).
    usuario?.role ||                                           // 2. Campo "role" (versiones anteriores).
    usuario?.tipoRol ||                                        // 3. Campo "tipoRol" (otra variante posible).
    null;                                                      // Si no se encuentra, queda en null (sin rol).

  const correoUsuario =
    usuario?.email ||                                          // 1. Campo email (caso más común).
    usuario?.correo ||                                         // 2. Campo correo (variante posible).
    usuario?.username ||                                       // 3. Campo username si allí se guarda el correo.
    null;                                                      // Si no se encuentra, queda null (sin correo asociado).

  const esAdmin = rolDetectado === 'admin';                    // Bandera booleana: true si el usuario es administrador.

  // Normaliza el rol a un conjunto reducido para estilos (.pcm-panel--ROL).
  const rolNormalizado = (() => {                              // Función autoejecutable para mapear el rol detectado.
    if (rolDetectado === 'admin') return 'admin';              // Admin → admin (azul según tema PCM).
    if (rolDetectado === 'lider' || rolDetectado === 'lider_obra') {
      return 'lider';                                          // Líder de obra → lider (naranja según tema PCM).
    }
    if (rolDetectado === 'cliente' || rolDetectado === 'cliente_final') {
      return 'cliente';                                        // Cliente → cliente (verde según tema PCM).
    }
    if (rolDetectado === 'auditor' || rolDetectado === 'auditoria') {
      return 'auditor';                                        // Auditor → auditor (morado según tema PCM).
    }
    return 'invitado';                                         // Fallback para cualquier otro tipo de rol.
  })();                                                        // Se evalúa inmediatamente y se asigna a rolNormalizado.

  // Construye la clase CSS del panel según el rol (usa helpers globales definidos en index.css).
  const clasePanelRol = rolNormalizado
    ? `pcm-panel pcm-panel--${rolNormalizado}`                 // Aplica .pcm-panel y la variante por rol (.pcm-panel--ROL).
    : 'pcm-panel';                                             // En caso extremo, al menos aplica .pcm-panel base.

  // ===========================
  // Valores únicos para filtros
  // ===========================
  const tiposProyectoUnicos = useMemo(() => {
    // Calcula los tipos de proyecto únicos que existen en la lista de correos.
    const proyectos = correos                                  // Parte de la lista completa de correos recibidos.
      .map((correo) => correo.projectType)                     // Toma el campo projectType de cada correo.
      .filter((tipo) => tipo && tipo !== '-');                 // Descarta nulos, vacíos o el placeholder '-'.

    // Elimina duplicados usando Set y devuelve un arreglo con valores únicos.
    return [...new Set(proyectos)];
  }, [correos]);                                               // Se recalcula solo cuando cambia la lista de correos.

  // ===========================
  // Base de correos según rol
  // ===========================
  const correosBase = useMemo(() => {
    // Determina qué correos puede ver el usuario, en función de su rol y correo.

    if (esAdmin) {
      // Los administradores pueden ver todos los correos de contacto.
      return correos;
    }

    if (!correoUsuario) {
      // Si no hay correo asociado al usuario, por seguridad no se muestra nada.
      return [];
    }

    // Para otros roles, solo se muestran mensajes cuyo campo email coincide con su correo.
    return correos.filter((correo) => correo.email === correoUsuario);
  }, [correos, esAdmin, correoUsuario]);                       // Depende de la lista de correos, rol y correo del usuario.

  // ===========================
  // Filtrado final de correos
  // ===========================
  const correosFiltrados = useMemo(() => {
    // Aplica filtros de búsqueda general, tipo de proyecto y rango de fecha
    // sobre la base de correos que el usuario está autorizado a ver.

    return correosBase.filter((correo) => {
      // ---- Filtro de búsqueda general ----
      const terminoEnMinusculas = terminoBusqueda.toLowerCase(); // Convierte el término de búsqueda a minúsculas.
      const coincideBusqueda =                                // Determina si el correo coincide con el texto buscado.
        !terminoBusqueda ||                                   // Si no hay término de búsqueda, pasa automáticamente.
        correo.name?.toLowerCase().includes(terminoEnMinusculas) || // Coincide con el nombre del remitente.
        correo.email?.toLowerCase().includes(terminoEnMinusculas) || // Coincide con el correo del remitente.
        correo.company?.toLowerCase().includes(terminoEnMinusculas) || // Coincide con la empresa.
        correo.message?.toLowerCase().includes(terminoEnMinusculas);   // Coincide con el contenido del mensaje.

      // ---- Filtro por proyecto ----
      const coincideProyecto =
        !filtroProyecto ||                                    // Si no hay filtro de proyecto, pasa directo.
        correo.projectType === filtroProyecto;                // Si hay filtro, el projectType debe coincidir exactamente.

      // ---- Filtro por fecha ----
      let coincideFecha = true;                               // Por defecto, el filtro de fecha deja pasar el correo.

      if (filtroFecha && correo.createdAt) {
        // Solo aplica filtro de fecha si se seleccionó un rango y el correo tiene createdAt.
        const fechaCorreo = new Date(correo.createdAt);       // Convierte createdAt a objeto Date.
        const hoy = new Date();                               // Fecha actual.

        switch (filtroFecha) {
          case 'today': {
            // Filtro: solo correos de hoy (comparación por fecha, sin hora).
            coincideFecha = fechaCorreo.toDateString() === hoy.toDateString();
            break;
          }
          case 'week': {
            // Filtro: correos de los últimos 7 días.
            const haceUnaSemana = new Date(
              hoy.getTime() - 7 * 24 * 60 * 60 * 1000
            );
            coincideFecha = fechaCorreo >= haceUnaSemana;
            break;
          }
          case 'month': {
            // Filtro: correos de los últimos 30 días.
            const haceUnMes = new Date(
              hoy.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            coincideFecha = fechaCorreo >= haceUnMes;
            break;
          }
          default:
            // Cualquier otro valor de filtroFecha no restringe por fecha.
            coincideFecha = true;
        }
      }

      // El correo se incluye solo si cumple los tres filtros.
      return coincideBusqueda && coincideProyecto && coincideFecha;
    });
  }, [
    correosBase,                                               // Cambios en la base visible.
    terminoBusqueda,                                           // Cambios en texto de búsqueda.
    filtroProyecto,                                            // Cambios en filtro de proyecto.
    filtroFecha,                                               // Cambios en filtro de rango de fecha.
  ]);

  // ===========================
  // Limpieza de filtros
  // ===========================
  const limpiarFiltros = () => {
    // Limpia todos los filtros activos a sus valores iniciales.
    setTerminoBusqueda('');                                    // Limpia el texto de búsqueda.
    setFiltroProyecto('');                                     // Limpia el filtro de tipo de proyecto.
    setFiltroFecha('');                                        // Limpia el filtro de rango de fechas.
  };

  const tieneFiltrosActivos =
    !!terminoBusqueda || !!filtroProyecto || !!filtroFecha;    // Bandera: true si al menos un filtro está activo.

  // ===========================
  // Render
  // ===========================
  return (
    <div
      className={`
        ${clasePanelRol}
        bg-pcm-surfaceSoft/80 rounded-pcm-xl border border-white/10
        shadow-pcm-soft backdrop-blur-sm animate-fade-in-soft
      `}                                                       // Contenedor principal: panel PCM con clases por rol + fondo y sombra suaves.
    >
      {/* Encabezado y filtros superiores */}
      <div
        className="
          p-6 border-b border-white/10
          pcm-panel-header
        "                                                      // Barra superior del panel, marcada como header para estilos por rol.
      >
        {/* Zona superior con título de sección y botón para mostrar/ocultar filtros avanzados */}
        <div className="flex items-center justify-between mb-4">
          {/* Título de la sección */}
          <h3 className="text-xl font-semibold text-pcm-text">
            Bandeja de entrada
          </h3>

          {/* Botón para mostrar/ocultar filtros avanzados */}
          <button
            type="button"                                      // Se declara explícitamente como botón.
            onClick={() => setMostrarFiltros(!mostrarFiltros)} // Alterna el estado de visibilidad del panel de filtros.
            className="flex items-center gap-2 px-4 py-2
                       bg-pcm-primary hover:bg-pcm-secondary
                       rounded-lg transition-all duration-150 text-white text-sm
                       shadow-pcm-soft"
          >
            <Filter size={18} />                               {/* Ícono de filtros a la izquierda. */}
            <span>Filtros</span>                               {/* Texto del botón. */}
          </button>
        </div>

        {/* Barra de búsqueda principal */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-pcm-muted"
            size={20}
          />                                                   {/* Ícono de búsqueda dentro del input. */}
          <input
            type="text"                                        // Input de texto para búsqueda libre.
            placeholder="Buscar por nombre, correo, empresa o mensaje..."
            value={terminoBusqueda}                            // Valor controlado ligado al estado terminoBusqueda.
            onChange={(evento) => setTerminoBusqueda(evento.target.value)} // Actualiza el estado en cada pulsación.
            className="w-full pl-10 pr-4 py-3 bg-pcm-bg/70 border border-white/10
                       rounded-lg text-pcm-text placeholder-pcm-muted
                       focus:outline-none focus:ring-2 focus:ring-pcm-primary/60
                       focus:border-pcm-primary text-sm"
          />
        </div>

        {/* Panel de filtros expandible (tipo de proyecto + rango de fecha) */}
        {mostrarFiltros && (
          <div className="mt-4 p-4 bg-pcm-bg/80 rounded-lg border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro por tipo de proyecto */}
              <div>
                <label className="block text-sm font-medium text-pcm-text mb-2">
                  Tipo de proyecto
                </label>
                <select
                  value={filtroProyecto}                        // Valor actual del filtro de proyecto.
                  onChange={(evento) => setFiltroProyecto(evento.target.value)}
                  className="w-full px-3 py-2 bg-pcm-surfaceSoft/80 border border-white/10
                             rounded-lg text-pcm-text text-sm
                             focus:outline-none focus:ring-2 focus:ring-pcm-primary/60
                             focus:border-pcm-primary"
                >
                  <option value="">Todos los proyectos</option> {/* Opción base sin filtro de proyecto. */}
                  {tiposProyectoUnicos.map((tipoProyecto) => (
                    <option key={tipoProyecto} value={tipoProyecto}>
                      {tipoProyecto}                           {/* Texto visible del tipo de proyecto. */}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por rango de fecha */}
              <div>
                <label className="block text-sm font-medium text-pcm-text mb-2">
                  Fecha
                </label>
                <select
                  value={filtroFecha}                           // Valor actual del filtro de fecha.
                  onChange={(evento) => setFiltroFecha(evento.target.value)}
                  className="w-full px-3 py-2 bg-pcm-surfaceSoft/80 border border-white/10
                             rounded-lg text-pcm-text text-sm
                             focus:outline-none focus:ring-2 focus:ring-pcm-primary/60
                             focus:border-pcm-primary"
                >
                  <option value="">Todas las fechas</option>    {/* Sin filtro de fecha. */}
                  <option value="today">Hoy</option>            {/* Solo correos de hoy. */}
                  <option value="week">Última semana</option>   {/* Últimos 7 días. */}
                  <option value="month">Último mes</option>     {/* Últimos 30 días. */}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de filtros activos + botón para limpiar todos los filtros */}
        {tieneFiltrosActivos && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-pcm-muted">
              {correosFiltrados.length} de {correosBase.length} resultados
              {/* Muestra cuántos resultados se muestran vs el total visible según su rol. */}
            </span>
            <button
              type="button"
              onClick={limpiarFiltros}                          // Limpia todos los filtros al hacer clic.
              className="flex items-center gap-1 px-3 py-1
                         bg-red-500/15 hover:bg-red-500/25
                         rounded-lg text-red-300 text-xs md:text-sm
                         transition duration-150"
            >
              <X size={14} />                                  {/* Ícono X para indicar limpieza. */}
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabla de resultados de la bandeja de entrada */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-pcm-text">
          <thead className="bg-pcm-bg/90 text-pcm-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Nombre</th>            {/* Encabezado: nombre del remitente. */}
              <th className="px-6 py-3">Correo</th>            {/* Encabezado: correo del remitente. */}
              <th className="px-6 py-3">Empresa</th>           {/* Encabezado: empresa. */}
              <th className="px-6 py-3">Proyecto</th>          {/* Encabezado: tipo de proyecto. */}
              <th className="px-6 py-3">Mensaje</th>           {/* Encabezado: resumen del mensaje. */}
              <th className="px-6 py-3">Fecha</th>             {/* Encabezado: fecha de creación. */}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {correosFiltrados.length > 0 ? (
              correosFiltrados.map((correo) => (
                <tr
                  key={correo._id}                             // Clave única basada en el _id del mensaje.
                  onClick={() =>
                    alSeleccionarCorreo && alSeleccionarCorreo(correo) // Llama al callback solo si se recibió por props.
                  }
                  className="hover:bg-pcm-bg/80 cursor-pointer transition duration-150"
                >
                  <td className="px-6 py-4">
                    {correo.name || '-'}                       {/* Nombre del remitente o '-' si falta. */}
                  </td>
                  <td className="px-6 py-4">
                    {correo.email || '-'}                      {/* Correo del remitente o '-'. */}
                  </td>
                  <td className="px-6 py-4">
                    {correo.company || '-'}                    {/* Empresa asociada o '-'. */}
                  </td>
                  <td className="px-6 py-4">
                    {correo.projectType || '-'}                {/* Tipo de proyecto o '-'. */}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate">
                    {correo.message || ''}                     {/* Mensaje truncado para no romper el layout. */}
                  </td>
                  <td className="px-6 py-4">
                    {correo.createdAt
                      ? new Date(correo.createdAt).toLocaleString('es-CO', {
                          dateStyle: 'short',                  // Fecha corta local (dd/mm/aa).
                          timeStyle: 'short',                  // Hora corta local (hh:mm).
                        })
                      : ''}                                    {/* Si no hay fecha, la celda queda vacía. */}
                  </td>
                </tr>
              ))
            ) : (
              // Caso sin resultados (base vacía o filtros muy restrictivos).
              <tr>
                <td
                  colSpan={6}                                  // Ocupa todas las columnas de la tabla.
                  className="px-6 py-8 text-center text-pcm-muted"
                >
                  {correosBase.length === 0
                    ? 'No tienes mensajes en la bandeja de entrada.'
                    : 'No se encontraron resultados con los filtros aplicados.'}
                  {/* Mensaje distinto según si la base visible está vacía o filtrada a cero. */}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Exporta el componente para usarlo dentro del dashboard / workspace.
export default VistaBandejaEntrada;                            // Exportación por defecto de la vista de bandeja de entrada.
