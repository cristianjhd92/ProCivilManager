// File: frontend/src/modules/inventory/modals/ModalEliminarMaterial.jsx
// Description: Modal de confirmación para eliminar un material del módulo de inventarios
//              de ProCivil Manager (PCM). Muestra un mensaje de advertencia, el nombre
//              del material (si se proporciona) y botones para confirmar o cancelar.
//              Integra el tema visual PCM (colores, sombras y radios), mantiene la
//              animación `animate-scale-in`, mejora la accesibilidad con roles ARIA
//              y adapta el contenedor a los colores del rol actual (admin / líder / cliente / auditor).

// =========================
//   Importaciones básicas
// =========================
import React, {
  useEffect,                                                               // Hook para efectos (tecla ESC y bloqueo de scroll).
  useState,                                                                // Hook para almacenar el rol lógico del usuario.
  useMemo,                                                                 // Hook para derivar el rol visual a partir del rol lógico.
} from 'react';
import { AlertTriangle, X } from 'lucide-react';                           // Importa íconos de advertencia y de cierre desde lucide-react.

/**
 * Componente ModalEliminarMaterial
 *
 * Props:
 *  - estaAbierto:   (boolean) controla si el modal se muestra o no.
 *  - nombreMaterial:(string)  nombre opcional del material a mostrar en el mensaje.
 *  - alConfirmar:   (func)    callback que se ejecuta cuando el usuario confirma la eliminación.
 *  - alCancelar:    (func)    callback que se ejecuta cuando el usuario cancela o cierra el modal.
 *  - estaCargando:  (boolean) bandera opcional para deshabilitar acciones mientras se procesa
 *                             la eliminación (por defecto false).
 */
const ModalEliminarMaterial = ({
  estaAbierto,                                                             // Indica si el modal debe estar visible.
  nombreMaterial,                                                          // Nombre del material que se mostrará en el texto de confirmación.
  alConfirmar,                                                             // Función que se ejecuta al confirmar la eliminación.
  alCancelar,                                                              // Función que se ejecuta al cancelar o cerrar el modal.
  estaCargando = false,                                                    // Bandera de estado de carga, por defecto false.
  detalleMaterial = null,                                                  // Objeto opcional con detalles (cantidad y almacén) del material.
}) => {
  // =========================
  //   Rol del usuario (lógico)
  // =========================
  const [rolUsuario, setRolUsuario] = useState('lider');                  // Rol lógico del usuario autenticado (por defecto líder).

  // ─────────────────────────────────────────────────────────────
  // Efecto: lectura del usuario desde localStorage para detectar el rol
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const datoUsuario = localStorage.getItem('pcm_usuario');           // Lee la información del usuario desde localStorage.
      if (datoUsuario) {
        const usuario = JSON.parse(datoUsuario);                          // Parsea el JSON almacenado.
        const rolDetectado =
          usuario?.rol ||
          usuario?.role ||
          usuario?.tipoRol ||
          'lider';                                                        // Valor por defecto si no hay un rol explícito.
        setRolUsuario(rolDetectado);                                      // Actualiza el rol lógico del usuario.
      }
    } catch (error) {
      console.error('Error al leer el rol del usuario en ModalEliminarMaterial:', error);
      setRolUsuario('lider');                                             // Fallback seguro en caso de error.
    }
  }, []);                                                                 // Solo al montar el componente.

  // =========================
  //   Rol visual (para colores de panel)
  // =========================
  const rolVisual = useMemo(() => {
    const rolCrudo = (rolUsuario || '').toString().toLowerCase();         // Normaliza el rol a minúsculas para inspeccionarlo.

    if (rolCrudo.includes('admin')) return 'admin';                      // Roles que contienen "admin" se pintan como admin (azul).
    if (rolCrudo.includes('auditor')) return 'auditor';                  // Roles que contienen "auditor" se pintan como auditor (morado).
    if (rolCrudo.includes('client') || rolCrudo.includes('cliente')) {
      return 'cliente';                                                  // Roles de cliente se pintan como cliente (verde).
    }
    return 'lider';                                                      // Cualquier otro rol se considera líder (naranja).
  }, [rolUsuario]);                                                      // Se recalcula si cambia el rol lógico.

  // Clases para integrar el modal con el sistema de paneles por rol (.pcm-panel y .pcm-panel--ROL)
  const clasesPanelRol = `pcm-panel pcm-panel--${rolVisual}`;            // Clases CSS globales definidas en index.css/tailwind para cada rol.

  // ─────────────────────────────────────────────────────────────
  // Efecto: cierre con tecla ESC cuando el modal está abierto
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!estaAbierto) return;                                             // Si el modal no está abierto, no registra el listener.

    const manejarKeyDown = (evento) => {                                  // Función que maneja el evento de teclado.
      if (evento.key === 'Escape') {                                      // Si se presiona la tecla Escape...
        if (estaCargando) return;                                         // Si está cargando, no permite cerrar para evitar estados inconsistentes.
        alCancelar();                                                     // Si no está cargando, ejecuta la cancelación normal.
      }
    };

    window.addEventListener('keydown', manejarKeyDown);                   // Registra el listener global de teclado.

    return () => {
      window.removeEventListener('keydown', manejarKeyDown);              // Limpia el listener al desmontar o cerrar el modal.
    };
  }, [estaAbierto, estaCargando, alCancelar]);                            // Se vuelve a evaluar cuando cambian estas dependencias.

  // ─────────────────────────────────────────────────────────────
  // Efecto: bloquear scroll del body mientras el modal esté abierto
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!estaAbierto) return;                                             // Solo actúa si el modal está abierto.

    const overflowOriginal = document.body.style.overflow;                // Guarda el valor original del overflow del body.
    document.body.style.overflow = 'hidden';                              // Deshabilita el scroll del fondo para evitar desplazamiento.

    return () => {
      document.body.style.overflow = overflowOriginal;                    // Restaura el valor original al cerrar el modal.
    };
  }, [estaAbierto]);                                                      // Se ejecuta cuando cambia estaAbierto.

  // ─────────────────────────────────────────────────────────────
  // Handler para clics en el overlay (fondo oscuro)
  // ─────────────────────────────────────────────────────────────
  const manejarClickOverlay = () => {                                     // Maneja el clic en el fondo fuera del contenido.
    if (estaCargando) return;                                             // Si está cargando, no permite cerrar el modal.
    alCancelar();                                                         // Si no está cargando, ejecuta la cancelación normal.
  };

  // ─────────────────────────────────────────────────────────────
  // Guard de visibilidad: si el modal no está abierto, no se renderiza
  // (se coloca después de los hooks para cumplir la regla de hooks)
  // ─────────────────────────────────────────────────────────────
  if (!estaAbierto) return null;                                          // Si el modal no está abierto, no inserta nada en el DOM.

  // ─────────────────────────────────────────────────────────────
  // Render principal del modal cuando estaAbierto es true
  // ─────────────────────────────────────────────────────────────
  return (
    // Overlay a pantalla completa con fondo oscuro, desenfoque y animación de aparición.
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center p-4
        bg-black/70 backdrop-blur-sm
        animate-fade-in-soft
      "                                                                    // Capa oscura con blur y animación suave.
      onClick={manejarClickOverlay}                                        // Cierra al hacer clic fuera del contenido (si no está cargando).
    >
      {/* Contenedor principal del modal con tema PCM, animación de escala y clases por rol */}
      <div
        className={`
          relative max-w-md w-full
          bg-pcm-surfaceSoft/95
          border border-white/10
          rounded-pcm-xl shadow-pcm-soft
          animate-scale-in
          ${clasesPanelRol}
        `}                                                                 // Caja del modal con radios, sombras y clases .pcm-panel--ROL.
        role="dialog"                                                      // Indica a tecnologías asistivas que esto es un diálogo.
        aria-modal="true"                                                  // Señala que es un modal (bloquea la interacción de fondo).
        aria-labelledby="modal-eliminar-material-titulo"                   // ID del título asociado al diálogo.
        aria-describedby="modal-eliminar-material-descripcion"             // ID de la descripción asociada al diálogo.
        onClick={(evento) => evento.stopPropagation()}                     // Evita que los clics dentro cierren el modal.
      >
        {/* Encabezado del modal con ícono de advertencia, título y botón de cierre */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          {/* Lado izquierdo: ícono de advertencia y título */}
          <div className="flex items-center gap-3">
            {/* Ícono de advertencia para resaltar el riesgo de la acción */}
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <AlertTriangle className="text-amber-300" size={22} />       {/* Ícono de alerta en color ámbar. */}
            </div>

            {/* Título del modal. El id se usa en aria-labelledby */}
            <h3
              id="modal-eliminar-material-titulo"                          // Usado en aria-labelledby.
              className="text-lg sm:text-xl font-semibold text-pcm-text"
            >
              Confirmar eliminación
            </h3>
          </div>

          {/* Lado derecho: botón de cierre (X) */}
          <button
            type="button"                                                  // Evita comportamiento de submit en formularios.
            onClick={alCancelar}                                           // Ejecuta la cancelación/cierre del modal.
            className="
              w-9 h-9 rounded-lg
              border border-white/20
              flex items-center justify-center
              text-pcm-muted
              hover:text-pcm-text hover:bg-white/10
              transition-all duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
            "                                                               // Estilos normales y de deshabilitado.
            disabled={estaCargando}                                        // Deshabilita mientras se está eliminando.
          >
            <X size={20} />                                                {/* Ícono de cierre (X). */}
          </button>
        </div>

        {/* Cuerpo del modal con el mensaje de confirmación */}
        <div className="p-6 space-y-4">
          {/* Información de cantidades y almacén cuando se conoce */}
          {detalleMaterial && detalleMaterial.cantidad > 0 && (
            <p className="text-sm sm:text-base text-amber-200 leading-relaxed">
              Este material actualmente tiene {detalleMaterial.cantidad}{' '}
              unidades en el almacén
              {detalleMaterial.almacenNombre ? ` ${detalleMaterial.almacenNombre}` : ''}
              . Debe retirarse el stock antes de eliminarlo.
            </p>
          )}
          <p
            id="modal-eliminar-material-descripcion"                       // Usado en aria-describedby.
            className="text-sm sm:text-base text-pcm-text leading-relaxed"
          >
            {/* Si viene nombreMaterial, se muestra; de lo contrario, se usa texto genérico */}
            ¿Estás seguro de que deseas eliminar{' '}
            {nombreMaterial ? (
              <span className="font-semibold text-white">
                el material “{nombreMaterial}”
              </span>
            ) : (
              <span className="font-semibold text-white">
                este material
              </span>
            )}
            ? Esta acción no se puede deshacer y podría afectar registros asociados.
          </p>
        </div>

        {/* Pie del modal con los botones de Cancelar y Eliminar */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          {/* Botón Cancelar: cierra el modal sin realizar la eliminación */}
          <button
            type="button"                                                  // Botón normal, no envía formularios.
            onClick={alCancelar}                                           // Cierra el modal y cancela la acción.
            className="
              flex-1 px-4 py-2.5 rounded-lg
              bg-pcm-bg/90 text-pcm-text
              hover:bg-pcm-bg hover:text-white
              transition duration-150
              font-semibold text-sm
              disabled:opacity-60 disabled:cursor-not-allowed
            "                                                               // Usa transición estándar sin transition-colors.
            disabled={estaCargando}                                        // Deshabilita mientras se procesa la eliminación.
          >
            Cancelar
          </button>

          {/* Botón Eliminar: confirma la eliminación del material */}
          <button
            type="button"                                                  // Evita comportamiento de submit.
            onClick={alConfirmar}                                          // Ejecuta la lógica de eliminación recibida por props.
            className="
              flex-1 px-4 py-2.5 rounded-lg
              bg-red-600 hover:bg-red-700
              text-white font-semibold text-sm
              transition duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
            "                                                               // Botón destructivo destacado en rojo sin usar transition-colors.
            disabled={estaCargando}                                        // Deshabilita mientras estaCargando sea true.
          >
            {estaCargando ? 'Eliminando…' : 'Eliminar'}                    {/* Texto dinámico según estado de carga. */}
          </button>
        </div>
      </div>
    </div>
  );
};

// Exporta el modal por defecto para poder reutilizarlo en la vista de materiales u otras secciones
export default ModalEliminarMaterial;
