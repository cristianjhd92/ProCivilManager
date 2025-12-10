// File: frontend/src/modules/mail/modals/ModalDetalleCorreo.jsx
// Description: Modal que muestra el detalle de un mensaje de contacto (nombre,
//              correo, empresa, teléfono, tipo de proyecto, mensaje y fecha).
//              Adapta el comportamiento según el rol (admin / líder / cliente):
//              el admin puede responder vía mailto; los demás solo tienen vista
//              de lectura, usando el tema visual PCM y animaciones globales.

// =========================
//   Importaciones básicas
// =========================
import React, { useEffect } from 'react';                    // Importa React y useEffect para manejar efectos (ESC, scroll).
import {
  X,                                                        // Ícono de cierre para el botón de la esquina superior derecha.
  Mail,                                                     // Ícono principal para representar el correo.
  User,                                                     // Ícono para el nombre del remitente.
  Phone,                                                    // Ícono para el teléfono.
  Building2,                                                // Ícono para la empresa.
  CalendarClock,                                            // Ícono para la fecha/hora.
  Info                                                      // Ícono para el bloque de mensaje / tipo de proyecto.
} from 'lucide-react';                                      // Importa los íconos desde la librería lucide-react.

// =========================
//   Componente principal
// =========================
const ModalDetalleCorreo = ({                               // Declara el componente funcional del modal de detalle de correo.
  correoSeleccionado,                                       // Objeto con la información del correo actualmente seleccionado.
  alCerrarModal,                                            // Función que se llama cuando el usuario cierra el modal.
}) => {
  // =====================================================
  //   Cerrar con tecla ESC (solo cuando hay correo abierto)
  // =====================================================
  useEffect(() => {                                         // Efecto para escuchar la tecla ESC mientras el modal está abierto.
    if (!correoSeleccionado) return;                        // Si no hay correo seleccionado, no se registra ningún listener.

    const manejarKeyDown = (evento) => {                    // Función manejadora del evento de teclado.
      if (evento.key === 'Escape') {                        // Si la tecla presionada es Escape...
        alCerrarModal();                                    // ...se llama a la función para cerrar el modal.
      }
    };

    window.addEventListener('keydown', manejarKeyDown);     // Registra el listener en window para detectar la tecla Escape.

    return () => {                                          // Función de limpieza del efecto.
      window.removeEventListener('keydown', manejarKeyDown);// Elimina el listener al cerrar o desmontar el modal.
    };
  }, [correoSeleccionado, alCerrarModal]);                  // Se vuelve a evaluar cuando cambia el correo seleccionado o el handler.

  // =====================================================
  //   Bloquear scroll del body mientras el modal está abierto
  // =====================================================
  useEffect(() => {                                         // Efecto para manipular el scroll del documento.
    if (!correoSeleccionado) return;                        // Solo actúa si el modal está visible (hay correo seleccionado).

    const overflowOriginal = document.body.style.overflow;  // Guarda el valor original de overflow del body.
    document.body.style.overflow = 'hidden';                // Deshabilita el scroll vertical del body mientras el modal está abierto.

    return () => {                                          // Función de limpieza al cerrar el modal.
      document.body.style.overflow = overflowOriginal;      // Restaura el overflow original del body.
    };
  }, [correoSeleccionado]);                                 // El efecto depende de la presencia del correo seleccionado.

  // =====================================================
  //   Guard de visibilidad
  // =====================================================
  if (!correoSeleccionado) {                                // Si no hay correo seleccionado...
    return null;                                            // ...no se renderiza nada (el modal permanece oculto).
  }

  // =====================================================
  //   Obtener usuario y rol desde localStorage (estándar PCM)
  // =====================================================
  const usuario = (() => {                                  // IIFE para leer el usuario autenticado desde localStorage.
    try {
      // Primero intenta con la clave estándar PCM; si no existe, cae a la clave antigua "user".
      const datoGuardado =
        localStorage.getItem('pcm_usuario') ||
        localStorage.getItem('user') ||
        null;                                               // Si no hay nada almacenado, será null.

      if (!datoGuardado) return {};                        // Si no hay dato, devuelve un objeto vacío.

      return JSON.parse(datoGuardado);                     // Intenta parsear el JSON almacenado.
    } catch {
      return {};                                           // Si falla el parseo (JSON inválido), devuelve un objeto vacío.
    }
  })();

  // Detecta el rol del usuario considerando varias posibles claves.
  const rolDetectado =
    usuario?.rol ||
    usuario?.role ||
    usuario?.tipoRol ||
    null;                                                   // Si no se encuentra rol, queda en null.

  const esAdmin = rolDetectado === 'admin';                 // true si el rol es administrador.
  const esLiderObra =
    rolDetectado === 'lider' || rolDetectado === 'lider_obra'; // true si el rol es líder de obra (según estándar PCM).
  const esCliente = rolDetectado === 'cliente';             // true si el rol es cliente (para mensajes informativos).

  // =====================================================
  //   Construir el enlace mailto para que el admin pueda responder
  // =====================================================
  const enlaceMailto = correoSeleccionado.email             // Solo se construye si existe correo en correoSeleccionado.
    ? `mailto:${correoSeleccionado.email}?subject=${encodeURIComponent(
        `Re: ${correoSeleccionado.projectType || 'Consulta desde ProCivil Manager'}` // Asunto por defecto si no hay tipo de proyecto.
      )}`
    : null;                                                 // Si no hay correo, no se genera mailto (queda en null).

  // =====================================================
  //   Formato de fecha/hora en español (Colombia)
  // =====================================================
  const fechaHoraFormateada = correoSeleccionado.createdAt  // Si el correo tiene fecha de creación...
    ? new Date(correoSeleccionado.createdAt).toLocaleString('es-CO', {
        dateStyle: 'full',                                   // Fecha completa (ej. miércoles, 20 de noviembre de 2025).
        timeStyle: 'short',                                  // Hora corta (ej. 14:35).
      })
    : '';                                                    // Si no hay fecha, se deja texto vacío.

  // =========================
  //   Render principal
  // =========================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-soft"
      role="dialog"                                          // Indica que este contenedor actúa como un diálogo modal.
      aria-modal="true"                                      // Indicador de que el modal bloquea la interacción con el fondo.
      aria-labelledby="modal-detalle-correo-titulo"          // Asocia el título del modal para tecnologías de asistencia.
    >
      {/* Capa oscura de fondo con desenfoque que cierra el modal al hacer clic */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={alCerrarModal}                              // Cierra el modal cuando se hace clic en el fondo oscuro.
      />

      {/* Contenedor principal del modal */}
      <div
        className="relative max-w-2xl w-full bg-pcm-surfaceSoft
                   rounded-pcm-xl shadow-pcm-soft border border-white/10 overflow-hidden
                   animate-slide-up-soft"
        onClick={(evento) => evento.stopPropagation()}        // Evita que los clics internos cierren el modal.
      >
        {/* Encabezado con fondo PCM adaptable por rol y botón de cierre */}
        <div className="relative pcm-panel-header bg-pcm-primary p-5">
          {/* Burbujas decorativas suaves en el fondo */}
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -top-12 -right-8 w-28 h-28 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-8 w-32 h-32 bg-orange-300 rounded-full blur-3xl" />
          </div>

          {/* Contenido del encabezado sobre las burbujas */}
          <div className="relative z-10 flex items-start justify-between gap-4">
            {/* Bloque de ícono y textos del encabezado */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-black/15 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-lg">
                <Mail className="w-6 h-6 text-white" />       {/* Ícono principal de correo */}
              </div>
              <div>
                <h2
                  id="modal-detalle-correo-titulo"            // ID usado para aria-labelledby en el contenedor principal.
                  className="text-lg sm:text-xl font-bold text-white"
                >
                  Detalle del contacto                        {/* Título principal del modal */}
                </h2>
                <p className="text-xs text-orange-50/90 mt-1">
                  Revisa la información completa del mensaje recibido desde ProCivil Manager.
                </p>
              </div>
            </div>

            {/* Botón de cierre con ícono X */}
            <button
              type="button"
              onClick={alCerrarModal}                          // Cierra el modal al hacer clic en el botón.
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30
                         border border-white/40 flex items-center justify-center
                         transition-all duration-200 hover:scale-110"
            >
              <X className="w-5 h-5 text-white" />             {/* Ícono de cierre */}
            </button>
          </div>
        </div>

        {/* Contenido principal del modal con scroll independiente y scrollbar PCM */}
        <div className="p-6 max-h-[70vh] overflow-y-auto pcm-scroll-y space-y-6 text-sm text-pcm-text">
          {/* Bloque de datos principales: nombre y correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre del remitente */}
            <div className="bg-pcm-surfaceSoft/90 border border-white/10 rounded-2xl p-4 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-pcm-primary/15 flex items-center justify-center">
                <User className="w-5 h-5 text-pcm-primary" />  {/* Ícono de usuario */}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-pcm-muted uppercase tracking-wide">
                  Nombre
                </p>
                <p className="text-sm text-pcm-text mt-1">
                  {correoSeleccionado.name || 'Sin nombre registrado'} {/* Nombre del remitente o mensaje por defecto. */}
                </p>
              </div>
            </div>

            {/* Correo electrónico del remitente */}
            <div className="bg-pcm-surfaceSoft/90 border border-white/10 rounded-2xl p-4 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-pcm-primary/15 flex items-center justify-center">
                <Mail className="w-5 h-5 text-pcm-primary" />  {/* Ícono de correo */}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-pcm-muted uppercase tracking-wide">
                  Correo electrónico
                </p>
                <p className="text-sm text-pcm-text mt-1 break-all">
                  {correoSeleccionado.email || 'Sin correo registrado'} {/* Correo del remitente o mensaje por defecto. */}
                </p>
              </div>
            </div>
          </div>

          {/* Bloque de empresa, teléfono y tipo de proyecto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Empresa */}
            <div className="bg-pcm-surfaceSoft/90 border border-white/10 rounded-2xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-pcm-primary/15 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-pcm-primary" /> {/* Ícono de empresa */}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-pcm-muted uppercase tracking-wide">
                  Empresa
                </p>
                <p className="text-sm text-pcm-text mt-1">
                  {correoSeleccionado.company || 'No especificada'}   {/* Empresa o texto genérico si no se registró. */}
                </p>
              </div>
            </div>

            {/* Teléfono */}
            <div className="bg-pcm-surfaceSoft/90 border border-white/10 rounded-2xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-pcm-primary/15 flex items-center justify-center">
                <Phone className="w-4 h-4 text-pcm-primary" />  {/* Ícono de teléfono */}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-pcm-muted uppercase tracking-wide">
                  Teléfono
                </p>
                <p className="text-sm text-pcm-text mt-1">
                  {correoSeleccionado.phone || 'No registrado'}       {/* Teléfono o mensaje indicativo si no existe. */}
                </p>
              </div>
            </div>

            {/* Tipo de proyecto */}
            <div className="bg-pcm-surfaceSoft/90 border border-white/10 rounded-2xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-pcm-primary/15 flex items-center justify-center">
                <Info className="w-4 h-4 text-pcm-primary" />   {/* Ícono para tipo de proyecto */}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-pcm-muted uppercase tracking-wide">
                  Tipo de proyecto
                </p>
                <p className="text-sm text-pcm-text mt-1">
                  {correoSeleccionado.projectType || 'No especificado'} {/* Tipo de proyecto o mensaje por defecto. */}
                </p>
              </div>
            </div>
          </div>

          {/* Bloque de mensaje principal */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-pcm-muted uppercase tracking-wide flex items-center gap-2">
              <Info className="w-4 h-4 text-pcm-secondary" />  {/* Ícono pequeño para el título de mensaje */}
              Mensaje
            </p>

            <div
              className="p-4 bg-pcm-bg/80 rounded-xl border border-white/5 text-sm text-pcm-text max-h-64 overflow-y-auto pcm-scroll-y whitespace-pre-wrap"
              id="modal-detalle-correo-mensaje"               // ID por si se quiere usar aria-describedby más adelante.
            >
              {correoSeleccionado.message || 'Sin mensaje registrado.'} {/* Mensaje del contacto o texto por defecto. */}
            </div>
          </div>

          {/* Fecha y hora de creación del mensaje */}
          {fechaHoraFormateada && (                           // Solo se muestra si se pudo formatear la fecha.
            <div className="flex items-center gap-2 text-xs text-pcm-muted">
              <CalendarClock className="w-4 h-4 text-pcm-muted" /> {/* Ícono de calendario/reloj */}
              <span>{fechaHoraFormateada}</span>              {/* Fecha/hora formateadas para Colombia. */}
            </div>
          )}

          {/* Nota según el rol del usuario */}
          {esAdmin && enlaceMailto && (                        // Mensaje especial para administrador con opción de respuesta.
            <p className="text-[11px] text-pcm-muted/90">
              Estás viendo este mensaje como{' '}
              <span className="font-semibold text-pcm-primary">administrador</span>.
              Puedes responder directamente al remitente desde el botón{' '}
              <span className="font-semibold">"Responder"</span>.
            </p>
          )}

          {!esAdmin && (esLiderObra || esCliente) && (         // Mensaje para líder de obra o cliente (solo lectura).
            <p className="text-[11px] text-pcm-muted/90">
              Este mensaje es solo de lectura. Si necesitas dar respuesta, por favor
              coordínalo con el área administrativa o utiliza tu canal de comunicación habitual.
            </p>
          )}
        </div>

        {/* Footer con botones de acción */}
        <div className="bg-pcm-bg/90 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
          {/* Botón "Responder": solo visible para administradores y si hay correo válido */}
          {esAdmin && enlaceMailto && (
            <a
              href={enlaceMailto}                             // Abre el cliente de correo con el asunto prellenado.
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-pcm-primary hover:bg-pcm-secondary text-white text-xs sm:text-sm
                         font-semibold transition-all hover:scale-105 shadow-md"
            >
              <Mail className="w-4 h-4" />                   {/* Ícono de correo dentro del botón. */}
              <span>Responder</span>                         {/* Texto del botón de acción. */}
            </a>
          )}

          {/* Botón "Cerrar": disponible para todos los roles */}
          <button
            type="button"
            onClick={alCerrarModal}                           // Cierra el modal al hacer clic.
            className="px-4 py-2 rounded-lg bg-pcm-surfaceSoft/80 hover:bg-pcm-surfaceSoft
                       text-pcm-text text-xs sm:text-sm font-semibold transition duration-150"
          >
            Cerrar                                             {/* Texto del botón de cierre. */}
          </button>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente como default para usarlo en otras vistas del panel (por ejemplo, lista de contactos).
export default ModalDetalleCorreo;                             // Exportación por defecto del modal de detalle de correo.
