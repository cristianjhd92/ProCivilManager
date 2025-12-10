// File: frontend/src/modules/audit/modals/ModalDetalleRegistroAuditoria.jsx   // Ruta del archivo dentro del módulo de auditoría.
// Description: Modal de detalle para un registro de auditoría en ProCivil    // Descripción: muestra la información ampliada de un log de auditoría
//              Manager (PCM). Muestra información ampliada del registro      // (fecha, usuario, acción, recurso, detalles) usando el tema visual PCM,
//              (fecha, usuario, acción, recurso y detalles) usando el tema   // bloquea el scroll de fondo mientras está abierto y permite cerrar con
//              visual PCM (paleta `pcm`, sombras, bordes redondeados y       // ESC, clic en el fondo oscuro o botón de cierre. El encabezado hereda
//              animaciones globales). Hereda el color del encabezado según   // el color/degradado del rol del usuario mediante la clase global
//              el rol del usuario usando la clase `.pcm-panel-header`.       // `.pcm-panel-header` para mantener coherencia por rol.

// =========================
//   Importaciones básicas
// =========================
import React, { useEffect } from 'react';                         // Importa React y el hook useEffect para manejar efectos secundarios.
import {                                                          // Importa íconos desde lucide-react para enriquecer la interfaz visual.
  X,                                                              // Ícono de cierre (X) para el botón de cerrar.
  ScrollText,                                                     // Ícono principal que representa un registro de auditoría/log.
  User,                                                           // Ícono de usuario para mostrar quién realizó la acción.
  CalendarClock,                                                  // Ícono de calendario/reloj para la fecha y hora.
  ShieldCheck,                                                    // Ícono para representar el recurso/área protegida.
  Info                                                            // Ícono de información para el bloque de detalles.
} from 'lucide-react';                                            // Fuente de íconos lucide-react, que ya usamos en todo PCM.

// =========================
//   Componente principal
// =========================
//
// Props:
//
//  - estaAbierto: bandera booleana que indica si el modal está visible.
//  - registroAuditoria: objeto con la información del log de auditoría a mostrar.
//  - alCerrar: función callback que se ejecuta cuando se debe cerrar el modal.
//
const ModalDetalleRegistroAuditoria = ({                          // Declara el componente funcional principal.
  estaAbierto,                                                    // true = el modal debe ser visible; false = no se muestra.
  registroAuditoria,                                              // Objeto con los campos del registro de auditoría (fecha, usuario, acción, etc.).
  alCerrar,                                                       // Función que se llama para cerrar el modal (clic, ESC, botón).
}) => {
  // =====================================================
  //   Cerrar con tecla ESC (solo cuando el modal esté abierto)
  // =====================================================
  useEffect(() => {                                               // useEffect para registrar un listener de teclado.
    if (!estaAbierto) return;                                     // Si el modal no está abierto, no hace nada y no registra el listener.

    const manejarKeyDown = (evento) => {                          // Función manejadora para el evento keydown.
      if (evento.key === 'Escape') {                              // Si la tecla presionada es Escape (ESC)...
        alCerrar();                                               // Llama a la función alCerrar para cerrar el modal.
      }
    };

    window.addEventListener('keydown', manejarKeyDown);           // Registra el listener en window cuando el modal se abre.

    return () => {                                                // Función de limpieza del efecto.
      window.removeEventListener('keydown', manejarKeyDown);      // Elimina el listener cuando se cierra el modal o se desmonta.
    };
  }, [estaAbierto, alCerrar]);                                    // El efecto se vuelve a evaluar si cambia estaAbierto o alCerrar.

  // =====================================================
  //   Bloquear el scroll del body mientras el modal esté abierto
  // =====================================================
  useEffect(() => {                                               // Segundo useEffect para manejar el scroll del documento.
    if (!estaAbierto) return;                                     // Si el modal no está abierto, no toca el estilo del body.

    const overflowOriginal = document.body.style.overflow;        // Guarda el valor original de overflow del body.
    document.body.style.overflow = 'hidden';                      // Deshabilita el scroll vertical del body mientras el modal está abierto.

    return () => {                                                // Función de limpieza para restaurar el estado original.
      document.body.style.overflow = overflowOriginal;            // Restaura el overflow original cuando se cierra el modal.
    };
  }, [estaAbierto]);                                              // Solo se ejecuta cuando estaAbierto cambia.

  // =====================================================
  //   Guard de seguridad: si no está abierto o no hay registro, no se renderiza
  // =====================================================
  if (!estaAbierto || !registroAuditoria) {                       // Si el modal no debe estar visible o no hay registro válido...
    return null;                                                  // No renderiza nada (el componente no aparece en el DOM).
  }

  // =====================================================
  //   Helpers de formato y valores por defecto
  // =====================================================

  // Formatea la fecha y hora en español (Colombia) de forma amigable.
  const fechaHoraFormateada = registroAuditoria.createdAt         // Verifica si existe la propiedad createdAt en el registro.
    ? new Date(registroAuditoria.createdAt).toLocaleString(       // Crea un objeto Date y lo formatea como string legible.
        'es-CO',                                                  // Usa la configuración regional de Colombia (es-CO).
        {
          dateStyle: 'full',                                      // Muestra la fecha completa (incluye día de la semana).
          timeStyle: 'short',                                     // Muestra la hora en formato corto (hh:mm).
        }
      )
    : 'Fecha no disponible';                                      // Texto alternativo si no hay fecha en el registro.

  // Obtiene un nombre de usuario amigable a partir del objeto registroAuditoria.user.
  const nombreUsuario = registroAuditoria.user                    // Verifica si hay un objeto user asociado al registro.
    ? (
        `${registroAuditoria.user.firstName || ''} ${             // Construye el nombre con nombre y apellido si existen.
          registroAuditoria.user.lastName || ''                   // Añade el apellido si está definido.
        }`.trim() ||                                              // Quita espacios extra y valida si quedó algún texto.
        registroAuditoria.user.email ||                           // Si no hay nombre/apellido, usa el correo si está disponible.
        'Usuario sin nombre'                                      // Fallback final si no hay datos de nombre ni correo.
      )
    : 'Sistema';                                                  // Si no hay user, se considera que la acción la hizo el sistema.

  // Acción y recurso con valores seguros y textos predeterminados.
  const etiquetaAccion =
    registroAuditoria.action || 'Acción no especificada';         // Usa la acción del registro o un texto alternativo si no está.
  const etiquetaRecurso =
    registroAuditoria.resource || 'Recurso no especificado';      // Usa el recurso del registro o un texto alternativo.

  // Determina el contenido de los detalles (texto plano o JSON formateado).
  const contenidoDetalles =                                       // Variable que contendrá el texto final a mostrar en el bloque de detalles.
    typeof registroAuditoria.details === 'object' &&              // Si la propiedad details es un objeto...
    registroAuditoria.details !== null
      ? JSON.stringify(registroAuditoria.details, null, 2)        // Lo serializa a JSON bonito con sangría de 2 espacios.
      : (registroAuditoria.details || 'Sin detalles adicionales.'); // Si es string o null/undefined, usa el valor o un fallback.

  // =========================
  //   Render principal del modal
  // =========================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-soft"
      role="dialog"                                               // Indica a tecnologías de asistencia que este contenedor es un diálogo/modal.
      aria-modal="true"                                           // Informa que este modal bloquea la interacción con el contenido de fondo.
      aria-labelledby="titulo-modal-detalle-auditoria"            // Asocia el título accesible del modal con este contenedor.
    >
      {/* Capa oscura de fondo con desenfoque que cierra el modal al hacer clic */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" // Fondo oscuro semitransparente con desenfoque suave.
        onClick={alCerrar}                                        // Si el usuario hace clic en el fondo, se cierra el modal.
      />

      {/* Contenedor principal del modal con tema PCM y animación de entrada */}
      <div
        className="relative w-full max-w-3xl bg-pcm-surfaceSoft/95
                   rounded-pcm-xl shadow-pcm-soft border border-white/10 overflow-hidden
                   animate-slide-up-soft"
        onClick={(evento) => evento.stopPropagation()}            // Evita que los clics dentro del modal cierren el diálogo.
      >
        {/* Encabezado que hereda el color/degradado según el rol (.pcm-panel-header) */}
        <div className="relative p-6 pcm-panel-header overflow-hidden">
          {/* Burbujas difuminadas de fondo para darle profundidad visual */}
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-orange-300 blur-3xl" />
          </div>

          {/* Contenido visible del encabezado sobre los decorativos */}
          <div className="relative z-10 flex items-start justify-between gap-4">
            {/* Bloque de título e información general del modal */}
            <div className="flex items-center gap-4">
              {/* Ícono principal del modal dentro de un contenedor con fondo suave */}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/15 backdrop-blur-sm border border-white/40 shadow-lg">
                <ScrollText className="h-7 w-7 text-white" />     {/* Ícono que representa un registro de auditoría */}
              </div>

              {/* Textos del encabezado: título y descripción corta */}
              <div>
                <h3
                  id="titulo-modal-detalle-auditoria"             // ID usado por aria-labelledby para accesibilidad.
                  className="text-xl font-bold text-white"
                >
                  Detalle del registro de auditoría               {/* Título principal del modal */}
                </h3>
                <p className="mt-1 text-xs text-orange-50/90">
                  Revisa la información completa de la acción realizada en el sistema.
                </p>
              </div>
            </div>

            {/* Botón de cierre (X) en la esquina superior derecha */}
            <button
              type="button"                                       // Indica que este botón no envía formularios.
              onClick={alCerrar}                                  // Llama a la función alCerrar cuando el usuario hace clic.
              className="group flex h-10 w-10 items-center justify-center
                         rounded-xl border border-white/40 bg-white/20
                         transition-all duration-200 hover:bg-white/30 hover:scale-110"
            >
              <X
                className="h-5 w-5 text-white
                           transition duration-200 group-hover:rotate-90"
                // Se usa `transition` en vez de `transition-transform` para cumplir la regla PCM.
              />
            </button>
          </div>
        </div>

        {/* Contenido principal del modal con scroll interno si es muy largo */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          {/* Bloque de información general: Fecha/Hora y Usuario */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Tarjeta de Fecha y hora */}
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-pcm-surfaceSoft/90 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pcm-primary/15">
                <CalendarClock className="h-5 w-5 text-pcm-primary" />{/* Ícono de calendario/reloj */}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pcm-muted">
                  Fecha y hora
                </p>
                <p className="mt-1 text-sm text-pcm-text sm:text-base">
                  {fechaHoraFormateada}                            {/* Muestra la fecha y hora formateadas */}
                </p>
              </div>
            </div>

            {/* Tarjeta de Usuario */}
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-pcm-surfaceSoft/90 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pcm-primary/15">
                <User className="h-5 w-5 text-pcm-primary" />      {/* Ícono de usuario */}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pcm-muted">
                  Usuario
                </p>
                <p className="mt-1 text-sm text-pcm-text sm:text-base">
                  {nombreUsuario}                                  {/* Nombre amigable del usuario o "Sistema" */}
                </p>
              </div>
            </div>
          </div>

          {/* Bloque de Acción y Recurso en tarjetas separadas */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Tarjeta de Acción */}
            <div className="rounded-2xl border border-white/10 bg-pcm-surfaceSoft/90 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pcm-muted">
                <ScrollText className="h-4 w-4 text-pcm-secondary" />{/* Ícono pequeño para la acción */}
                Acción
              </p>
              <p className="mt-2 text-sm text-pcm-text sm:text-base">
                {etiquetaAccion}                                  {/* Texto de la acción registrada */}
              </p>
            </div>

            {/* Tarjeta de Recurso */}
            <div className="rounded-2xl border border-white/10 bg-pcm-surfaceSoft/90 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-pcm-muted">
                <ShieldCheck className="h-4 w-4 text-pcm-secondary" />{/* Ícono para el recurso/seguridad */}
                Recurso
              </p>
              <p className="mt-2 text-sm text-pcm-text sm:text-base">
                {etiquetaRecurso}                                  {/* Nombre del recurso afectado */}
              </p>
            </div>
          </div>

          {/* Bloque de detalles (texto o JSON formateado) */}
          <div className="rounded-2xl border border-white/10 bg-pcm-surfaceSoft/90 p-4">
            {/* Encabezado del bloque de detalles con ícono */}
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pcm-primary/15">
                <Info className="h-5 w-5 text-pcm-primary" />      {/* Ícono de información */}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pcm-muted">
                  Detalles del registro
                </p>
                <p className="text-[11px] text-pcm-muted/90">
                  Si el backend envía un objeto, se muestra serializado como JSON.
                </p>
              </div>
            </div>

            {/* Contenedor del contenido de detalles con fondo más oscuro y scroll si es necesario */}
            <div className="max-h-64 overflow-auto rounded-xl border border-white/5 bg-pcm-bg/80 p-3 font-mono text-xs text-pcm-text whitespace-pre-wrap">
              {contenidoDetalles}                                  {/* Muestra texto plano o JSON formateado */}
            </div>
          </div>
        </div>

        {/* Footer con botón de cierre en la parte inferior del modal */}
        <div className="flex justify-end border-t border-white/10 bg-pcm-bg/90 px-6 py-4">
          <button
            type="button"                                         // Botón simple, no envía formularios.
            onClick={alCerrar}                                    // Cierra el modal al hacer clic.
            className="rounded-xl bg-pcm-primary px-5 py-2.5 text-sm font-semibold text-white
                       shadow-lg transition-all duration-200 hover:bg-pcm-secondary hover:scale-105"
          >
            Cerrar                                                {/* Texto del botón de acción */}
          </button>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente por defecto para usarlo en vistas como VistaRegistrosAuditoria.
export default ModalDetalleRegistroAuditoria;                      // Exportación por defecto del modal de detalle de auditoría.
