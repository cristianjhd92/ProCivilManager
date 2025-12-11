// File: frontend/src/modules/alerts/pages/VistaAlertas.jsx      // Ruta del archivo dentro del módulo de alertas.
// Description: Vista interna para listar, filtrar y revisar     // Descripción corta: vista de gestión de alertas.
//              alertas del sistema (pendientes, resueltas,      // Explica que muestra alertas con filtros y búsqueda.
//              críticas, etc.) dentro del workspace PCM.        // También indica que se integra con el tema PCM y roles.
//              Se apoya en el sistema de paneles por rol         // Aclara que usa .pcm-panel--ROL + .pcm-card-kpi.
//              (.pcm-panel--admin / lider / cliente / auditor)   // Los colores cambian según el rol del usuario.
//              para que las tarjetas usen el color de acento     // Las tarjetas KPI usan el color de acento del rol.
//              dinámicamente sin hardcodear colores.             // Se evitan colores “quemados” en el JSX.

import React, { useEffect, useMemo, useState } from 'react';      // Importa React y hooks de estado, efecto y memoización.
import {
  AlertTriangle,                                                  // Ícono para alertas críticas o de advertencia.
  Bell,                                                           // Ícono de campana para encabezado de sección.
  CheckCircle2,                                                   // Ícono para estados resueltos/completados.
  XCircle,                                                        // Ícono para mostrar errores en la carga.
  Clock,                                                          // Ícono para alertas pendientes/en seguimiento.
  Filter,                                                         // Ícono para el botón de filtros.
  Search,                                                         // Ícono para el campo de búsqueda.
  Eye,                                                            // Ícono de ojo para marcar como vista.
  EyeOff,                                                         // Ícono de ojo tachado para marcar como no vista.
  CheckCircle,                                                    // Ícono de círculo con check para resolver la alerta.
} from 'lucide-react';                                            // Importa los íconos desde la librería lucide-react.

import {
  obtenerAlertas,
  resolverAlerta,
  marcarAlertaVisto,
} from '../../../services/api/api.js';    // Importa servicios de API para alertas: listar, resolver y marcar visto.

/**
 * Función auxiliar para normalizar la lista de alertas recibida
 * desde la API, aceptando varios formatos de respuesta.
 */
const normalizarAlertas = (respuestaCruda) => {                   // Declara una función pura para normalizar la respuesta.
  // Si ya viene un arreglo directo, se usa tal cual.
  if (Array.isArray(respuestaCruda)) {                            // Verifica si la respuesta es un array de alertas.
    return respuestaCruda;                                        // Devuelve el arreglo directamente.
  }

  // Si viene como { alertas: [...] }, usa esa propiedad.
  if (Array.isArray(respuestaCruda?.alertas)) {                   // Revisa si existe la propiedad alertas como arreglo.
    return respuestaCruda.alertas;                                // Devuelve el arreglo de alertas interno.
  }

  // Si viene como { data: [...] }, usa esa propiedad.
  if (Array.isArray(respuestaCruda?.data)) {                      // Revisa si existe la propiedad data como arreglo.
    return respuestaCruda.data;                                   // Devuelve el arreglo de data como lista de alertas.
  }

  // Cualquier otro caso, devuelve arreglo vacío para evitar errores.
  return [];                                                      // Devuelve un array vacío si no se reconoce el formato.
};

/**
 * Función auxiliar para determinar si una alerta se considera
 * "pendiente" según su estado y banderas booleanas.
 */
const esAlertaPendiente = (alerta) => {                           // Declara función que indica si la alerta está pendiente.
  const estado = (alerta?.estado || '').toLowerCase();            // Toma el estado como string en minúsculas (o vacío).
  const resuelta = alerta?.resuelta === true;                     // Considera la bandera booleana resuelta.
  const cerrada = alerta?.cerrada === true;                       // Considera la bandera booleana cerrada.

  // Pendiente = no está marcada como resuelta/cerrada ni por estado ni por banderas.
  return (                                                        // Devuelve true si la alerta se considera pendiente.
    !resuelta &&
    !cerrada &&
    estado !== 'resuelta' &&
    estado !== 'cerrada'
  );
};

/**
 * Función auxiliar para determinar si una alerta se considera
 * "crítica" según su nivel o severidad.
 */
const esAlertaCritica = (alerta) => {                             // Declara función que evalúa si una alerta es crítica.
  const nivel =
    (alerta?.nivel || alerta?.severidad || alerta?.prioridad || '') // Toma nivel/severidad/prioridad si existen.
      .toString()                                                 // Convierte a string por seguridad.
      .toLowerCase();                                             // Lleva todo a minúsculas para comparar.

  // Considera palabras típicas de criticidad alta.
  if (
    nivel.includes('alta') ||                                     // Nivel incluye "alta".
    nivel.includes('crítica') ||                                  // Nivel incluye "crítica".
    nivel.includes('critica') ||                                  // Nivel incluye "critica" sin tilde.
    nivel.includes('urgente')                                     // Nivel incluye "urgente".
  ) {
    return true;                                                  // Marca la alerta como crítica.
  }

  return false;                                                   // En caso contrario, no la considera crítica.
};

/**
 * Función auxiliar para formatear la fecha de la alerta
 * en un texto legible para usuario final.
 */
const formatearFechaAlerta = (alerta) => {                        // Declara función que devuelve un texto de fecha legible.
  const fuenteFecha =                                             // Escoge la propiedad de fecha disponible.
    alerta?.fecha ||                                              // Usa alerta.fecha si existe.
    alerta?.createdAt ||                                          // O createdAt si existe.
    alerta?.fechaCreacion ||                                      // O fechaCreacion.
    null;                                                         // O null si ninguna existe.

  if (!fuenteFecha) {                                             // Si no hay ninguna fecha disponible...
    return 'Fecha no disponible';                                 // Devuelve un mensaje genérico.
  }

  const fecha = new Date(fuenteFecha);                            // Intenta construir un objeto Date con la fuente.

  if (Number.isNaN(fecha.getTime())) {                            // Si la fecha es inválida...
    return 'Fecha no válida';                                     // Devuelve mensaje de fecha inválida.
  }

  // Devuelve la fecha local en formato corto (Colombia).
  return fecha.toLocaleString('es-CO', {                          // Usa toLocaleString con configuración regional.
    day: '2-digit',                                               // Día con dos dígitos.
    month: '2-digit',                                             // Mes con dos dígitos.
    year: 'numeric',                                              // Año completo.
    hour: '2-digit',                                              // Hora con dos dígitos.
    minute: '2-digit'                                             // Minutos con dos dígitos.
  });
};

/**
 * Función auxiliar para construir el texto del título de la alerta,
 * priorizando distintas propiedades posibles sin romper si alguna falta.
 */
const obtenerTituloAlerta = (alerta) => {                         // Declara función que obtiene un título legible de alerta.
  if (alerta?.titulo) return alerta.titulo;                       // Si trae titulo, usa ese directamente.
  if (alerta?.nombre) return alerta.nombre;                       // Si trae nombre, úsalo como título.
  if (alerta?.tipo) return `Alerta de ${alerta.tipo}`;            // Si trae tipo, construye un texto "Alerta de tipo".
  if (alerta?.codigo) return `Alerta ${alerta.codigo}`;           // Si trae código, úsalo como parte del título.

  return 'Alerta sin título';                                     // Fallback genérico si nada anterior existe.
};

/**
 * Función auxiliar para obtener una descripción corta de la alerta.
 */
const obtenerDescripcionAlerta = (alerta) => {                    // Declara función que devuelve una descripción corta.
  const descripcion =
    alerta?.mensaje ||                                            // Prioriza alerta.mensaje si existe.
    alerta?.descripcion ||                                        // Luego alerta.descripcion.
    alerta?.detalle ||                                            // Luego alerta.detalle.
    '';                                                           // Si nada existe, queda string vacío.

  if (!descripcion) {                                             // Si quedó vacío...
    return 'Sin descripción adicional.';                          // Devuelve texto genérico.
  }

  if (descripcion.length > 220) {                                 // Si la descripción es muy larga...
    return `${descripcion.slice(0, 217)}...`;                     // La recorta para que no rompa el layout.
  }

  return descripcion;                                             // Devuelve la descripción tal cual.
};

/**
 * Función auxiliar para mostrar el nombre del proyecto asociado,
 * si existe la relación en la alerta.
 */
const obtenerProyectoAlerta = (alerta) => {                       // Declara función para obtener nombre de proyecto ligado.
  if (alerta?.proyecto?.nombre) return alerta.proyecto.nombre;    // Si proyecto es objeto con nombre, úsalo.
  if (typeof alerta?.proyecto === 'string') return alerta.proyecto; // Si proyecto es string directo, úsalo.
  if (alerta?.obra) return alerta.obra;                           // Si hay campo obra, úsalo como referencia.

  return 'Proyecto / obra no especificada';                       // Texto genérico si no hay referencia clara.
};

/**
 * Componente principal: Vista de Alertas internas del workspace PCM.
 */
const VistaAlertas = () => {                                      // Declara el componente funcional principal VistaAlertas.
  // ============================
  // Estado local de la vista
  // ============================
  const [alertas, setAlertas] = useState([]);                     // Lista completa de alertas normalizadas.
  const [cargando, setCargando] = useState(true);                 // Bandera de carga mientras se consulta la API.
  const [error, setError] = useState(null);                       // Mensaje de error en caso de fallo en la API.

  const [filtroEstado, setFiltroEstado] = useState('todas');      // Filtro de estado: "todas", "pendientes", "resueltas".
  const [busqueda, setBusqueda] = useState('');                   // Texto de búsqueda por título/descripcion/proyecto.

  /**
   * Alterna el estado "visto" de una alerta llamando al backend y actualizando el estado local.
   * Sólo requiere el objeto de alerta; si falla, se registra el error en consola.
   * @param {Object} alerta - La alerta que se va a marcar como vista/no vista.
   */
  const handleToggleVisto = async (alerta) => {
    if (!alerta || !alerta._id) return;
    try {
      await marcarAlertaVisto(alerta._id);
      setAlertas((prev) =>
        prev.map((a) =>
          a._id === alerta._id
            ? {
                ...a,
                visto: !a.visto,
                fechaVisto: !a.visto ? new Date().toISOString() : null,
              }
            : a
        )
      );
    } catch (err) {
      console.error('Error al alternar estado de vista de la alerta:', err);
    }
  };

  /**
   * Marca una alerta como resuelta llamando al backend y actualiza el estado local para reflejarlo.
   * @param {Object} alerta - La alerta a resolver.
   */
  const handleResolverAlerta = async (alerta) => {
    if (!alerta || !alerta._id) return;
    try {
      await resolverAlerta(alerta._id);
      setAlertas((prev) =>
        prev.map((a) =>
          a._id === alerta._id
            ? {
                ...a,
                resuelta: true,
                resolved: true,
                estado: 'resuelta',
                visto: true,
                fechaVisto: new Date().toISOString(),
              }
            : a
        )
      );
    } catch (err) {
      console.error('Error al resolver la alerta:', err);
    }
  };

  // =====================================================================
  // Obtiene el usuario actual y su rol para filtrar las alertas que le
  // corresponden. El administrador puede ver todas las alertas, mientras
  // que los demás roles sólo deben ver las alertas dirigidas a ellos.
  // =====================================================================
  const usuarioActual = (() => {
    try {
      const raw =
        localStorage.getItem('user') ||
        localStorage.getItem('pcm_usuario') ||
        '{}';
      return JSON.parse(raw);
    } catch {
      return {};
    }
  })();
  const rolActual = (usuarioActual.role || usuarioActual.rol || '')
    .toString()
    .trim()
    .toLowerCase();
  const userIdActual =
    usuarioActual.id || usuarioActual._id || usuarioActual._idUsuario || usuarioActual.uid;

  // ==============================================
  // Efecto: carga inicial de alertas desde la API
  // ==============================================
  useEffect(() => {                                               // Usa useEffect para cargar datos al montar la vista.
    const cargarAlertas = async () => {                           // Declara función asíncrona interna para la carga.
      setCargando(true);                                          // Activa indicador de carga.
      setError(null);                                             // Limpia errores previos.

      try {                                                       // Inicia bloque try para capturar errores.
        const respuesta = await obtenerAlertas();                 // Llama al servicio de API para obtener alertas.
        const listaNormalizada = normalizarAlertas(respuesta);    // Normaliza la respuesta a un arreglo plano.

        setAlertas(listaNormalizada || []);                       // Actualiza el estado con la lista (o array vacío).
      } catch (err) {                                             // Captura cualquier error en la llamada.
        console.error('Error cargando alertas en VistaAlertas:', err); // Muestra error en consola para depuración.
        setError('Ocurrió un error al cargar las alertas.');      // Setea un mensaje de error amigable para el usuario.
      } finally {                                                 // Bloque que siempre se ejecuta al final.
        setCargando(false);                                       // Apaga el indicador de carga.
      }
    };

    cargarAlertas();                                              // Ejecuta la función de carga inmediatamente al montar.
  }, []);                                                         // Arreglo de dependencias vacío → sólo al montar.

  // ==============================================
  // Derivados memoizados: totales, filtros y lista
  // ==============================================
  const {
    totalAlertas,                                                 // Número total de alertas en la lista.
    totalPendientes,                                              // Número de alertas pendientes.
    totalResueltas,                                               // Número de alertas resueltas/cerradas.
    totalCriticas                                                 // Número de alertas marcadas como críticas.
  } = useMemo(() => {                                             // Usa useMemo para evitar recalcular en cada render.
    if (!Array.isArray(alertas)) {                                // Si alertas no es un arreglo por alguna razón...
      return {                                                    // Devuelve todos los contadores en cero.
        totalAlertas: 0,
        totalPendientes: 0,
        totalResueltas: 0,
        totalCriticas: 0
      };
    }

    let pendientes = 0;                                           // Acumulador de pendientes.
    let resueltas = 0;                                            // Acumulador de resueltas.
    let criticas = 0;                                             // Acumulador de críticas.

    alertas.forEach((alerta) => {                                 // Recorre todas las alertas para contarlas.
      if (esAlertaPendiente(alerta)) {                            // Si la alerta está pendiente...
        pendientes += 1;                                          // Incrementa el contador de pendientes.
      } else {                                                    // Si no está pendiente...
        resueltas += 1;                                           // La considera resuelta/cerrada para la métrica.
      }

      if (esAlertaCritica(alerta)) {                              // Si la alerta se clasifica como crítica...
        criticas += 1;                                            // Incrementa el contador de críticas.
      }
    });

    return {                                                      // Devuelve objeto con las métricas calculadas.
      totalAlertas: alertas.length || 0,
      totalPendientes: pendientes,
      totalResueltas: resueltas,
      totalCriticas: criticas
    };
  }, [alertas]);                                                  // Se recalcula cuando cambie la lista de alertas.

  // Lista de alertas ordenada y filtrada según estado y búsqueda.
  const alertasFiltradas = useMemo(() => {                        // Declara lista derivada de alertas filtradas.
    const listaBase = Array.isArray(alertas) ? [...alertas] : []; // Crea una copia segura del arreglo base.

    // Ordena por fecha (más reciente primero) si hay fecha disponible.
    listaBase.sort((a, b) => {                                    // Ordena in-place la copia listaBase.
      const fa =
        new Date(a?.createdAt || a?.fecha || a?.fechaCreacion || 0).getTime(); // Extrae tiempo de alerta A.
      const fb =
        new Date(b?.createdAt || b?.fecha || b?.fechaCreacion || 0).getTime(); // Extrae tiempo de alerta B.

      return fb - fa;                                             // Ordena de más reciente a más antigua.
    });

    const termino = busqueda.trim().toLowerCase();                // Normaliza el texto de búsqueda (sin espacios extra).

    return listaBase.filter((alerta) => {
      // 0. Filtro por usuario: solo administradores ven todas las alertas;
      // los demás roles ven únicamente las alertas dirigidas a ellos. Si no hay
      // usuario asociado a la alerta, ésta se considera global y sólo la ve el admin.
      if (rolActual !== 'admin') {
        const destinatario = alerta?.usuario;
        if (!destinatario) {
          return false;
        }
        const idDest =
          typeof destinatario === 'string'
            ? destinatario
            : destinatario._id || destinatario.id || destinatario._idUsuario;
        if (!idDest || idDest.toString() !== (userIdActual || '').toString()) {
          return false;
        }
      }

      // 1. Filtro por estado (todas / pendientes / resueltas).
      if (filtroEstado === 'pendientes' && !esAlertaPendiente(alerta)) {
        return false; // Se descarta si se solicitan sólo pendientes y la alerta no es pendiente.
      }
      if (filtroEstado === 'resueltas' && esAlertaPendiente(alerta)) {
        return false; // Se descarta si se solicitan sólo resueltas y la alerta es pendiente.
      }

      // 2. Filtro por texto de búsqueda (título, descripción, proyecto).
      if (!termino) {
        return true; // Acepta la alerta tal cual si no hay texto de búsqueda (sólo se aplica filtro de estado).
      }

      const titulo = obtenerTituloAlerta(alerta).toLowerCase();
      const descripcion = obtenerDescripcionAlerta(alerta).toLowerCase();
      const proyecto = obtenerProyectoAlerta(alerta).toLowerCase();

      // Acepta la alerta si el término aparece en alguno de estos campos.
      return (
        titulo.includes(termino) ||
        descripcion.includes(termino) ||
        proyecto.includes(termino)
      );
    });
  }, [alertas, filtroEstado, busqueda, rolActual, userIdActual]);

  // ============================
  // Renderizado de la vista
  // ============================
  return (                                                        // Devuelve el JSX de la vista de alertas.
    <div className="space-y-4">                                   {/* Contenedor principal con separación vertical entre bloques. */}
      {/* Encabezado interno de la vista de alertas */}
      <div className="flex items-center justify-between gap-3">   {/* Fila con ícono+texto a la izquierda y resumen a la derecha. */}
        <div className="flex items-center gap-3">                 {/* Agrupa icono y textos del encabezado. */}
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pcm-surfaceSoft border border-pcm-borderSoft shadow-pcm-suave">
            {/* Círculo con ícono de campana, usando fondo PCM. */}
            <Bell className="h-5 w-5 text-pcm-primary" />         {/* Ícono de campana en color azul PCM. */}
          </div>
          <div className="flex flex-col">                         {/* Contenedor de título y subtítulo. */}
            <h2 className="text-base font-semibold text-pcm-text"> {/* Título de la vista de alertas. */}
              Alertas del sistema
            </h2>
            <p className="text-xs text-pcm-muted">                {/* Subtítulo descriptivo. */}
              Monitorea las alertas críticas, pendientes y resueltas de tus proyectos.
            </p>
          </div>
        </div>

        {/* Pequeño contador de críticas si existen */}
        {totalCriticas > 0 && (                                   // Muestra un badge sólo si hay alertas críticas.
          <div className="inline-flex items-center gap-2 rounded-full border border-pcm-borderSoft bg-pcm-surfaceSoft px-3 py-1 text-xs shadow-pcm-suave">
            {/* Badge con ícono y cantidad de alertas críticas. */}
            <AlertTriangle className="h-4 w-4 text-pcm-secondary" /> {/* Ícono de advertencia en color naranja PCM. */}
            <span className="font-semibold text-pcm-text">        {/* Texto con la cantidad. */}
              {totalCriticas} críticas
            </span>
          </div>
        )}
      </div>

      {/* Tarjetas resumen de KPIs de alertas (usan pcm-card-kpi y se tiñen según el rol) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">     {/* Grid responsive: 1 columna en móvil, 3 en escritorio. */}
        {/* KPI: Total de alertas */}
        <div className="pcm-card-kpi relative overflow-hidden">   {/* Tarjeta KPI con halo dinámico según rol. */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            {/* Contenido principal de la tarjeta. */}
            <div className="flex flex-col gap-1">                 {/* Columna de textos. */}
              <span className="text-xs uppercase tracking-wide text-pcm-muted">
                Total de alertas
              </span>
              <span className="text-2xl font-bold text-pcm-text"> {/* Valor numérico principal. */}
                {totalAlertas}
              </span>
            </div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 border border-pcm-borderSoft">
              {/* Icono en círculo pequeño. */}
              <Bell className="h-4 w-4 text-pcm-primary" />       {/* Campana en azul PCM. */}
            </div>
          </div>
        </div>

        {/* KPI: Pendientes */}
        <div className="pcm-card-kpi relative overflow-hidden">   {/* Otra tarjeta KPI reutilizando el estilo. */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-pcm-muted">
                Pendientes
              </span>
              <span className="text-2xl font-bold text-pcm-text">
                {totalPendientes}
              </span>
            </div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 border border-pcm-borderSoft">
              <Clock className="h-4 w-4 text-pcm-warning" />      {/* Reloj en color de advertencia PCM. */}
            </div>
          </div>
        </div>

        {/* KPI: Resueltas */}
        <div className="pcm-card-kpi relative overflow-hidden">   {/* Tarjeta KPI para resueltas. */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-pcm-muted">
                Resueltas / cerradas
              </span>
              <span className="text-2xl font-bold text-pcm-text">
                {totalResueltas}
              </span>
            </div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 border border-pcm-borderSoft">
              <CheckCircle2 className="h-4 w-4 text-pcm-success" /> {/* Check en verde éxito PCM. */}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="pcm-card-suave flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Campo de búsqueda por texto */}
        <div className="flex flex-1 items-center gap-2 rounded-full border border-pcm-borderSoft bg-pcm-surface px-3 py-2 shadow-pcm-suave">
          {/* Contenedor tipo input con icono de búsqueda. */}
          <Search className="h-4 w-4 text-pcm-muted" />           {/* Ícono de búsqueda en gris PCM. */}
          <input
            type="text"                                           // Campo de texto estándar.
            className="flex-1 bg-transparent text-sm text-pcm-text placeholder:text-pcm-muted focus:outline-none"
            // flex-1: ocupa todo el espacio disponible.
            // bg-transparent: sin fondo extra, se mezcla con el contenedor.
            // text-sm: tamaño de fuente pequeño.
            // text-pcm-text: texto principal PCM.
            // placeholder:text-pcm-muted: placeholder en gris.
            // focus:outline-none: quita borde azul por defecto del navegador.
            placeholder="Buscar por título, descripción o proyecto..."
            value={busqueda}                                      // Valor vinculado al estado de búsqueda.
            onChange={(e) => setBusqueda(e.target.value)}         // Actualiza el estado al escribir.
          />
        </div>

        {/* Botones de filtro de estado */}
        <div className="flex flex-wrap items-center gap-2">       {/* Contenedor de chips de filtro. */}
          <span className="inline-flex items-center gap-1 text-xs text-pcm-muted">
            {/* Etiqueta pequeña al lado de los filtros. */}
            <Filter className="h-3 w-3" />                        {/* Ícono de filtro pequeño. */}
            Filtros
          </span>

          {/* Filtro: todas */}
          <button
            type="button"                                         // Botón estándar (no submit).
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              filtroEstado === 'todas'
                ? 'border-pcm-primary bg-pcm-primary/10 text-pcm-text shadow-pcm-suave'
                : 'border-pcm-borderSoft bg-pcm-surface text-pcm-muted hover:border-pcm-primary/60'
            }`}
            // Si está activo, resalta con color primario.
            // Si no está activo, se ve neutro y toma tono azul al hover.
            onClick={() => setFiltroEstado('todas')}              // Al hacer clic, activa filtro "todas".
          >
            Todas
          </button>

          {/* Filtro: pendientes */}
          <button
            type="button"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              filtroEstado === 'pendientes'
                ? 'border-pcm-warning bg-pcm-warning/10 text-pcm-text shadow-pcm-suave'
                : 'border-pcm-borderSoft bg-pcm-surface text-pcm-muted hover:border-pcm-warning/70'
            }`}
            onClick={() => setFiltroEstado('pendientes')}         // Activa filtro "pendientes".
          >
            Pendientes
          </button>

          {/* Filtro: resueltas */}
          <button
            type="button"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              filtroEstado === 'resueltas'
                ? 'border-pcm-success bg-pcm-success/10 text-pcm-text shadow-pcm-suave'
                : 'border-pcm-borderSoft bg-pcm-surface text-pcm-muted hover:border-pcm-success/70'
            }`}
            onClick={() => setFiltroEstado('resueltas')}          // Activa filtro "resueltas".
          >
            Resueltas
          </button>
        </div>
      </div>

      {/* Estado de error, si la carga falló */}
      {error && (                                                // Si existe un mensaje de error...
        <div className="rounded-pcm-xl border border-red-500/70 bg-red-950/50 px-4 py-3 text-sm text-red-100 shadow-pcm-suave">
          {/* Tarjeta de error con icono y mensaje. */}
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />      {/* Ícono de error a la izquierda. */}
            <p>{error}</p>                                       {/* Mensaje de error para el usuario. */}
          </div>
        </div>
      )}

      {/* Estado de carga (skeletons) */}
      {cargando && (                                             // Si está cargando, muestra placeholders.
        <div className="space-y-3">
          {/* Tres tarjetas esqueletón simulando alertas. */}
          {[1, 2, 3].map((key) => (                              // Genera tres bloques repetidos.
            <div
              key={key}                                          // Clave única por cada esqueletón.
              className="pcm-card-kpi animate-skeleton-pulse"    // Usa card KPI con animación skeleton.
            >
              <div className="h-4 w-40 rounded-full bg-slate-700/60" />
              {/* Línea esqueletón para el título. */}
              <div className="mt-3 flex gap-3">
                <div className="h-3 w-24 rounded-full bg-slate-700/50" />
                {/* Línea esqueletón más pequeña. */}
                <div className="h-3 w-32 rounded-full bg-slate-700/40" />
                {/* Otra línea esqueletón. */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de alertas cuando ya cargó y no hay error */}
      {!cargando && !error && (
        <>
          {alertasFiltradas.length === 0 ? (                      // Si no hay alertas luego de aplicar filtros...
            <div className="pcm-card-suave flex items-center justify-between gap-3">
              {/* Tarjeta suave que informa que no hay alertas. */}
              <div className="flex items-center gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-pcm-borderSoft bg-pcm-surface">
                  {/* Ícono informativo en un círculo. */}
                  <Clock className="h-4 w-4 text-pcm-muted" />   {/* Reloj gris. */}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-pcm-text">
                    No se encontraron alertas con los filtros actuales
                  </span>
                  <span className="text-xs text-pcm-muted">
                    Ajusta los filtros o limpia la búsqueda para ver otras alertas.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Recorre y pinta cada alerta como tarjeta PCM/KPI */}
              {alertasFiltradas.map((alerta) => {                 // Mapea la lista filtrada a JSX.
                const pendiente = esAlertaPendiente(alerta);      // Determina si la alerta está pendiente.
                const critica = esAlertaCritica(alerta);          // Determina si la alerta es crítica.
                const titulo = obtenerTituloAlerta(alerta);       // Obtiene el título amigable.
                const descripcion = obtenerDescripcionAlerta(alerta); // Obtiene la descripción corta.
                const proyecto = obtenerProyectoAlerta(alerta);   // Obtiene el nombre del proyecto/obra.
                const fechaTexto = formatearFechaAlerta(alerta);  // Formatea la fecha para mostrar.

                return (
                  <article
                    key={alerta?._id || alerta?.id || titulo + fechaTexto}
                    // Usa _id/id si existen; de lo contrario, combina título+fecha.
                    className="pcm-card-kpi relative overflow-hidden"
                    // Usa la tarjeta KPI que ya respeta los colores del rol.
                  >
                    {/* Acciones: marcar como vista/no vista y resolver */}
                    <div className="absolute top-2 right-2 flex gap-2 z-20">
                      {/* Botón para alternar visto/no visto */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisto(alerta)}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-black/40 border border-pcm-borderSoft hover:bg-black/60 transition"
                      >
                        {alerta?.visto ? (
                          <EyeOff className="h-3.5 w-3.5 text-pcm-muted" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-pcm-muted" />
                        )}
                      </button>
                      {/* Botón para resolver alerta (solo si está pendiente) */}
                      {pendiente && (
                        <button
                          type="button"
                          onClick={() => handleResolverAlerta(alerta)}
                          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-black/40 border border-pcm-borderSoft hover:bg-black/60 transition"
                          title="Marcar como resuelta"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-pcm-success" />
                        </button>
                      )}
                    </div>
                    <div className="relative z-10 flex flex-col gap-2">
                      {/* Fila superior: título + estado + posible badge crítica */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Icono según si es crítica o no */}
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-pcm-borderSoft">
                            {critica ? (                          // Si la alerta es crítica...
                              <AlertTriangle className="h-4 w-4 text-pcm-secondary" />
                              // Ícono de triángulo en naranja PCM.
                            ) : pendiente ? (                     // Si no es crítica pero sí pendiente...
                              <Clock className="h-4 w-4 text-pcm-warning" />
                              // Reloj en color advertencia PCM.
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-pcm-success" />
                              // Si no es crítica ni pendiente, se considera resuelta.
                            )}
                          </div>
                          <div className="flex flex-col">
                            <h3 className="text-sm font-semibold text-pcm-text">
                              {titulo}
                            </h3>
                            <p className="text-[0.7rem] text-pcm-muted">
                              {proyecto}
                            </p>
                          </div>
                        </div>

                        {/* Chips de estado/severidad */}
                        <div className="flex flex-wrap items-center gap-1">
                          {/* Chip de estado pendiente/resuelta */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                              pendiente
                                ? 'bg-pcm-warning/10 text-pcm-warning border border-pcm-warning/60'
                                : 'bg-pcm-success/10 text-pcm-success border border-pcm-success/60'
                            }`}
                          >
                            {/* Texto del chip de estado. */}
                            {pendiente ? 'Pendiente' : 'Resuelta / cerrada'}
                          </span>

                          {/* Chip de criticidad si aplica */}
                          {critica && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-pcm-secondary/70 bg-pcm-secondary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-pcm-secondary">
                              {/* Chip que indica que es alerta crítica. */}
                              Crítica
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Descripción de la alerta */}
                      <p className="text-xs leading-relaxed text-pcm-muted mt-1">
                        {descripcion}
                      </p>

                      {/* Pie: fecha y posible nivel textual */}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-pcm-muted">
                        <span>
                          {fechaTexto}
                        </span>
                        {alerta?.nivel && (
                          <span className="italic">
                            Nivel: {String(alerta.nivel)}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VistaAlertas;                                      // Exporta VistaAlertas para usarla dentro de TableroTrabajo.
