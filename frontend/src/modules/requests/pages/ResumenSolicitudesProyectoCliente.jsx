// File: frontend/src/modules/requests/pages/ResumenSolicitudesProyectoCliente.jsx  // Ruta del archivo dentro del módulo de solicitudes.
// Description: Widget resumen para solicitudes de tipo "proyecto" del cliente.     // Descripción: muestra un resumen de solicitudes de
//              Muestra el total, la distribución por estado y las últimas          // tipo "proyecto" (total, estados y últimas) usando
//              solicitudes enviadas, usando el tema visual PCM (paleta `pcm`       // el tema visual PCM y ahora adaptando el color al
//              y tarjetas suaves) y adaptando el color según el rol del usuario.   // rol (admin / líder / cliente / auditor) con .pcm-panel.

/* eslint-disable react/prop-types */ // Desactiva la regla de ESLint sobre prop-types (usamos contrato por convención).

// Importa React y el hook useMemo para memorizar cálculos derivados.
import React, { useMemo } from 'react';                                            // Importa React y useMemo para cálculos derivados.

// =====================================================================================
// Helpers para rol y colores (tema PCM por rol)
// =====================================================================================

/**
 * Normaliza un rol a minúsculas sin espacios sobrantes.
 * Ejemplos:
 *   "Admin"           → "admin"
 *   "  lider de obra " → "lider de obra"
 *   "CLIENTE"         → "cliente"
 */
const normalizarRol = (rol) => {                                                   // Declara helper para normalizar el rol.
  if (typeof rol !== 'string') return '';                                          // Si no es string, devuelve cadena vacía.
  return rol.trim().toLowerCase();                                                 // Limpia espacios y convierte a minúsculas.
};

/**
 * Devuelve las clases de panel PCM según el rol normalizado.
 * Usa las clases globales:
 *  - .pcm-panel           → base de panel
 *  - .pcm-panel--admin    → azul (administrador)
 *  - .pcm-panel--lider    → naranja (líder de obra)
 *  - .pcm-panel--cliente  → verde (cliente)
 *  - .pcm-panel--auditor  → morado (auditor)
 */
const obtenerClasesRolPanel = (rolNormalizado) => {                                // Declara helper para mapear rol → clases de panel.
  switch (rolNormalizado) {                                                        // Evalúa el rol normalizado.
    case 'admin':                                                                  // Caso administrador.
      return 'pcm-panel pcm-panel--admin';                                         // Devuelve clases de panel azul.
    case 'lider de obra':                                                          // Caso líder de obra.
      return 'pcm-panel pcm-panel--lider';                                         // Devuelve clases de panel naranja.
    case 'cliente':                                                                // Caso cliente.
      return 'pcm-panel pcm-panel--cliente';                                       // Devuelve clases de panel verde.
    case 'auditor':                                                                // Caso auditor.
      return 'pcm-panel pcm-panel--auditor';                                       // Devuelve clases de panel morado.
    default:                                                                       // Cualquier otro valor de rol.
      return 'pcm-panel';                                                          // Panel PCM neutro.
  }
};

// =====================================================================================
// Componente principal de resumen de solicitudes de proyecto
// =====================================================================================

/**
 * Componente que muestra un resumen de solicitudes de proyecto para el usuario.
 *
 * Props:
 *  - solicitudes: arreglo de solicitudes (mezcladas por tipo) del usuario.
 *  - userRole:    rol del usuario autenticado (admin, lider de obra, cliente, auditor).
 */
const ResumenSolicitudesProyectoCliente = ({                                       // Declara el componente funcional principal.
  solicitudes = [],                                                                // Arreglo de solicitudes (por defecto vacío).
  userRole = '',                                                                   // Rol del usuario autenticado (por defecto vacío).
}) => {
  // ============================
  //  Detección y normalización del rol para colores
  // ============================

  const rolDesdeProp = normalizarRol(userRole);                                    // Normaliza el rol recibido por props.
  let rolUsuarioActual = rolDesdeProp || '';                                       // Inicializa el rol actual con el de la prop si existe.

  if (!rolUsuarioActual) {                                                         // Si aún no hay rol definido...
    try {                                                                          // Intenta leer desde localStorage (solo en navegador).
      const rawUsuario =
        typeof window !== 'undefined'                                              // Verifica que exista window (entorno browser).
          ? (localStorage.getItem('user') ||                                       // Intenta con la clave 'user'.
             localStorage.getItem('pcm_usuario') ||                                // O con la clave 'pcm_usuario'.
             '{}')                                                                 // Si nada existe, usa objeto vacío.
          : '{}';                                                                  // Si no hay window, usa objeto vacío.

      const usuarioLocal = JSON.parse(rawUsuario);                                 // Parsea el JSON obtenido.
      const rolLocal = normalizarRol(                                              // Normaliza el rol obtenido del objeto.
        (usuarioLocal && (usuarioLocal.role || usuarioLocal.rol)) || ''            // Toma 'role' o 'rol' si existen.
      );

      if (rolLocal) {                                                              // Si se encontró un rol válido...
        rolUsuarioActual = rolLocal;                                               // Lo asigna como rol actual.
      }
    } catch (error) {                                                              // Si ocurre un error al leer/parsear...
      rolUsuarioActual = '';                                                       // Deja el rol actual como cadena vacía.
    }
  }

  if (!rolUsuarioActual) {                                                         // Si después de todo no hay rol definido...
    rolUsuarioActual = 'cliente';                                                  // Asume 'cliente' como valor por defecto.
  }

  const clasesPanelRol = obtenerClasesRolPanel(rolUsuarioActual);                  // Obtiene las clases de panel según el rol actual.

  // ============================
  //  Filtro de solicitudes por tipo "proyecto"
  // ============================

  const solicitudesProyecto = useMemo(                                             // Memoiza la lista de solicitudes de tipo proyecto.
    () =>
      solicitudes.filter((solicitud) => {                                          // Filtra el arreglo completo de solicitudes.
        const tipoNormalizado = (solicitud.tipo || '').toLowerCase();              // Normaliza el campo tipo a minúsculas.
        return tipoNormalizado === 'proyecto';                                     // Conserva solo las solicitudes tipo "proyecto".
      }),
    [solicitudes]                                                                  // Se recalcula cuando cambia el arreglo de solicitudes.
  );

  // ============================
  //  Cálculo de estadísticas por estado
  // ============================

  const estadisticas = useMemo(() => {                                             // Memoiza el objeto de estadísticas por estado.
    const base = {                                                                 // Objeto base con contadores inicializados.
      total: solicitudesProyecto.length,                                           // Total de solicitudes de proyecto.
      pendiente: 0,                                                                // Contador de solicitudes pendientes.
      aprobada: 0,                                                                 // Contador de solicitudes aprobadas.
      rechazada: 0,                                                                // Contador de solicitudes rechazadas.
      procesada: 0,                                                                // Contador de solicitudes procesadas.
    };

    solicitudesProyecto.forEach((solicitud) => {                                   // Recorre cada solicitud de proyecto.
      const claveEstado = (solicitud.estado || '').toLowerCase();                 // Normaliza el estado a minúsculas.
      if (!claveEstado) return;                                                   // Si no hay estado, no suma en ningún contador.
      if (base[claveEstado] !== undefined) {                                      // Si existe la clave en el objeto base...
        base[claveEstado] += 1;                                                   // Incrementa el contador correspondiente.
      }
    });

    return base;                                                                  // Devuelve el objeto de estadísticas.
  }, [solicitudesProyecto]);                                                      // Se recalcula cuando cambia la lista de proyectos.

  // ============================
  //  Selección de últimas solicitudes (máx. 3)
  // ============================

  const solicitudesRecientes = useMemo(() => {                                    // Memoiza las últimas solicitudes (máx. 3).
    return [...solicitudesProyecto]                                               // Crea una copia superficial del arreglo filtrado.
      .sort((a, b) => {                                                           // Ordena por fecha de solicitud.
        const fechaA = a.fechaSolicitud ? new Date(a.fechaSolicitud) : 0;         // Convierte la fecha A a Date (o 0 si no existe).
        const fechaB = b.fechaSolicitud ? new Date(b.fechaSolicitud) : 0;         // Convierte la fecha B a Date (o 0 si no existe).
        return fechaB - fechaA;                                                   // Ordena de más reciente a más antigua.
      })
      .slice(0, 3);                                                               // Toma solo las primeras 3 solicitudes ordenadas.
  }, [solicitudesProyecto]);                                                      // Se recalcula cuando cambia la lista de proyectos.

  // ============================
  //  Helpers de formato
  // ============================

  const formatearFecha = (valorFecha) => {                                        // Declara helper para formatear fechas.
    if (!valorFecha) return 'Sin fecha registrada';                               // Si no hay fecha, devuelve mensaje genérico.
    const fecha = new Date(valorFecha);                                           // Intenta construir un objeto Date.
    if (Number.isNaN(fecha.getTime())) return 'Sin fecha registrada';            // Si es inválida, devuelve mensaje genérico.
    return fecha.toLocaleString('es-CO', {                                        // Formatea según configuración regional de Colombia.
      dateStyle: 'short',                                                         // Usa formato corto de fecha (dd/mm/aa).
      timeStyle: 'short',                                                         // Usa formato corto de hora (hh:mm a. m./p. m.).
    });
  };

  const renderizarBadgeEstado = (estado) => {                                     // Declara helper para renderizar un badge de estado.
    const estadoNormalizado = (estado || '').toLowerCase();                       // Normaliza el estado a minúsculas.
    let clases =
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border '; // Clases base comunes a todos los badges.

    switch (estadoNormalizado) {                                                  // Decide colores según el estado.
      case 'pendiente':                                                           // Caso estado pendiente.
        clases += 'bg-amber-500/15 text-amber-200 border-amber-400/40';           // Aplica colores ámbar suaves.
        break;
      case 'aprobada':                                                            // Caso estado aprobada.
        clases += 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40';     // Aplica colores verde esmeralda suaves.
        break;
      case 'rechazada':                                                           // Caso estado rechazada.
        clases += 'bg-rose-500/15 text-rose-200 border-rose-400/40';              // Aplica colores rosados suaves.
        break;
      case 'procesada':                                                           // Caso estado procesada.
        clases += 'bg-sky-500/15 text-sky-200 border-sky-400/40';                 // Aplica colores celestes suaves.
        break;
      default:                                                                    // Cualquier otro estado o ausencia de estado.
        clases += 'bg-slate-600/30 text-slate-100 border-slate-500/40';           // Aplica esquema neutro en gris.
        break;
    }

    return <span className={clases}>{estado || 'N/A'}</span>;                     // Devuelve el span con las clases calculadas.
  };

  // ============================
  //  Textos del encabezado según rol
  // ============================

  const tituloCabecera = (() => {                                                 // IIFE para calcular el título del widget.
    if (rolUsuarioActual === 'lider de obra') {                                   // Si el rol es líder de obra...
      return 'Solicitudes de proyecto de mis obras';                              // Título adaptado al líder.
    }
    if (rolUsuarioActual === 'cliente') {                                         // Si el rol es cliente...
      return 'Mis solicitudes de proyecto';                                       // Título pensado para cliente.
    }
    return 'Solicitudes de proyecto';                                             // Título genérico para otros roles.
  })();

  const subtituloCabecera = (() => {                                              // IIFE para calcular el subtítulo del widget.
    if (rolUsuarioActual === 'lider de obra') {                                   // Para líder de obra...
      return 'Resumen del estado de las solicitudes de proyecto asociadas a tus obras.'; // Subtítulo específico.
    }
    if (rolUsuarioActual === 'cliente') {                                         // Para cliente...
      return 'Resumen del estado de tus solicitudes enviadas.';                   // Subtítulo enfocado en el cliente.
    }
    return 'Resumen del estado de las solicitudes de proyecto registradas.';      // Subtítulo genérico.
  })();

  // ============================
  //  Render principal
  // ============================

  return (
    <div
      // Contenedor principal del widget: tarjeta PCM + panel coloreado según rol.
      className={`pcm-card backdrop-blur-sm animate-fade-in-soft ${clasesPanelRol}`}
    >
      {/* Encabezado con título y total de solicitudes */}
      <div className="flex items-center justify-between mb-4">
        {/* Bloque con título y explicación corta */}
        <div>
          <h3 className="text-lg font-semibold text-pcm-text">
            {tituloCabecera}
          </h3>
          <p className="text-sm text-pcm-muted mt-0.5">
            {subtituloCabecera}
          </p>
        </div>

        {/* Bloque con el total de solicitudes y etiqueta */}
        <div className="text-right">
          <span className="text-3xl font-bold text-pcm-primary">
            {estadisticas.total}
          </span>
          <p className="text-xs text-pcm-muted">
            Solicitudes totales
          </p>
        </div>
      </div>

      {/* Estadísticas por estado (pendientes, aprobadas, rechazadas, procesadas) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Tarjeta para pendientes */}
        <div className="bg-pcm-bg/70 rounded-xl px-3 py-2 border border-white/10 transition duration-150 hover:bg-pcm-surfaceSoft/80 hover:shadow-pcm-soft">
          <p className="text-xs text-pcm-muted">
            Pendientes
          </p>
          <p className="text-xl font-semibold text-amber-300">
            {estadisticas.pendiente}
          </p>
        </div>

        {/* Tarjeta para aprobadas */}
        <div className="bg-pcm-bg/70 rounded-xl px-3 py-2 border border-white/10 transition duration-150 hover:bg-pcm-surfaceSoft/80 hover:shadow-pcm-soft">
          <p className="text-xs text-pcm-muted">
            Aprobadas
          </p>
          <p className="text-xl font-semibold text-emerald-300">
            {estadisticas.aprobada}
          </p>
        </div>

        {/* Tarjeta para rechazadas */}
        <div className="bg-pcm-bg/70 rounded-xl px-3 py-2 border border-white/10 transition duration-150 hover:bg-pcm-surfaceSoft/80 hover:shadow-pcm-soft">
          <p className="text-xs text-pcm-muted">
            Rechazadas
          </p>
          <p className="text-xl font-semibold text-rose-300">
            {estadisticas.rechazada}
          </p>
        </div>

        {/* Tarjeta para procesadas */}
        <div className="bg-pcm-bg/70 rounded-xl px-3 py-2 border border-white/10 transition duration-150 hover:bg-pcm-surfaceSoft/80 hover:shadow-pcm-soft">
          <p className="text-xs text-pcm-muted">
            Procesadas
          </p>
          <p className="text-xl font-semibold text-sky-300">
            {estadisticas.procesada}
          </p>
        </div>
      </div>

      {/* Listado de últimas solicitudes */}
      <div>
        <h4 className="text-sm font-semibold text-pcm-text mb-2">
          Últimas solicitudes
        </h4>

        {/* Si no hay solicitudes de proyecto, mostramos un mensaje vacío */}
        {solicitudesRecientes.length === 0 ? (
          <p className="text-sm text-pcm-muted">
            Aún no has enviado solicitudes de proyecto.
          </p>
        ) : (
          <ul className="space-y-2">
            {solicitudesRecientes.map((solicitud) => (
              <li
                key={solicitud._id || solicitud.id}
                className="flex items-start justify-between bg-pcm-bg/80
                           border border-white/10 rounded-xl px-3 py-2
                           transition duration-150 hover:bg-pcm-surfaceSoft/80"
              >
                {/* Bloque con título y fecha de la solicitud */}
                <div className="mr-3">
                  <p className="text-sm text-pcm-text font-medium">
                    {solicitud.titulo || 'Solicitud sin título'}
                  </p>
                  <p className="text-xs text-pcm-muted">
                    {formatearFecha(solicitud.fechaSolicitud)}
                  </p>
                </div>

                {/* Bloque con el badge del estado, alineado verticalmente */}
                <div className="flex items-center">
                  {renderizarBadgeEstado(solicitud.estado)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Exporta el componente para poder usarlo en el Dashboard del cliente (y otros roles).
export default ResumenSolicitudesProyectoCliente;                                 // Exportación por defecto del widget.
