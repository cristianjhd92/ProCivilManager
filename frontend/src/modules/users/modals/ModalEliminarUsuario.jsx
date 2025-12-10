// File: frontend/src/modules/users/modals/ModalEliminarUsuario.jsx
// Description: Modal autónomo de confirmación para eliminar usuarios desde el panel
//              de administración de ProCivil Manager (PCM). Implementa su propio
//              overlay y tarjeta (sin usar ModalGenerico), llama al backend para
//              borrar el usuario por ID y notifica al componente padre al terminar
//              la operación. Adapta sutilmente el borde y el chip según el rol del
//              usuario que opera el panel (admin, líder de obra, cliente, auditor).

// =========================
// Importaciones principales
// =========================
import React, {
  useState,   // Hook para manejar estados locales (carga y errores).
  useEffect,  // Hook para manejar efectos secundarios (tecla ESC).
} from 'react';

// Importa íconos desde lucide-react para reforzar el diseño visual del modal.
import {
  AlertTriangle, // Ícono de advertencia en el encabezado.
  Loader2,       // Ícono de spinner mientras se ejecuta la eliminación.
  Trash2,        // Ícono de papelera en el botón “Eliminar usuario”.
} from 'lucide-react';

// Importa la función de servicio que elimina usuarios en el backend.
import {
  eliminarUsuario, // Importa directamente la función eliminarUsuario desde la API.
} from '../../../services/api/api.js'; // Servicio API que interactúa con el backend de PCM.

// =====================================================
// Helper: clases visuales según el rol de quien opera
// =====================================================

/**
 * Helper para obtener clases visuales según el rol del usuario que opera el panel.
 *
 * Recibe un rol (admin, líder de obra, cliente, auditor) y devuelve:
 *  - bordeTarjeta: clase Tailwind para el color del borde de la tarjeta.
 *  - chipRol: clases para un chip pequeño junto al título con color del rol.
 *  - etiquetaRol: texto legible para mostrar en el chip.
 */
const obtenerClasesVisualesPorRol = (rolUsuario) => {
  const rolNormalizado = (rolUsuario || '')
    .toString()
    .toLowerCase()
    .trim();

  // Caso: administrador (admin).
  if (rolNormalizado.includes('admin')) {
    return {
      bordeTarjeta: 'border-pcm-primary',
      chipRol:
        'bg-pcm-primary/15 text-pcm-primary border border-pcm-primary/60',
      etiquetaRol: 'Administrador',
    };
  }

  // Caso: líder de obra.
  if (
    rolNormalizado.includes('lider de obra') ||
    rolNormalizado.includes('líder de obra') ||
    rolNormalizado.includes('lider')
  ) {
    return {
      bordeTarjeta: 'border-pcm-secondary',
      chipRol:
        'bg-pcm-secondary/15 text-pcm-secondary border border-pcm-secondary/60',
      etiquetaRol: 'Líder de obra',
    };
  }

  // Caso: cliente.
  if (rolNormalizado.includes('cliente')) {
    return {
      bordeTarjeta: 'border-pcm-accent',
      chipRol:
        'bg-pcm-accent/15 text-pcm-accent border border-pcm-accent/60',
      etiquetaRol: 'Cliente',
    };
  }

  // Caso: auditor.
  if (rolNormalizado.includes('auditor')) {
    return {
      bordeTarjeta: 'border-purple-500',
      chipRol:
        'bg-purple-500/15 text-purple-200 border border-purple-500/60',
      etiquetaRol: 'Auditor',
    };
  }

  // Caso por defecto.
  return {
    bordeTarjeta: 'border-pcm-primary/60',
    chipRol:
      'bg-pcm-primary/15 text-pcm-primary border border-pcm-primary/60',
    etiquetaRol: 'Usuario',
  };
};

// =============================================
// Componente principal: ModalEliminarUsuario
// =============================================

/**
 * Props:
 *  - userToDelete: objeto de usuario a eliminar (debe contener _id o id).
 *  - onClose:      callback para cerrar el modal.
 *  - onConfirm:    callback después de una eliminación exitosa.
 *  - rolUsuario:   rol actual en el workspace (admin, líder, cliente, auditor).
 */
const ModalEliminarUsuario = ({
  userToDelete: usuarioAEliminar,
  onClose,
  onConfirm,
  rolUsuario = 'admin',
}) => {
  // Si no hay usuario definido, no renderizamos nada (modal cerrado).
  if (!usuarioAEliminar) return null;

  // Clases visuales según rol.
  const estilosRol = obtenerClasesVisualesPorRol(rolUsuario);

  // Estado local: ejecución de eliminación.
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado local: mensaje de error.
  const [errorMsg, setErrorMsg] = useState('');

  // =========================
  // Efecto: cerrar con ESC
  // =========================
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isDeleting) return;
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeleting, onClose]);

  // =========================
  // Handlers principales
  // =========================

  // Ejecuta la eliminación en backend.
  const handleDelete = async () => {
    if (isDeleting) return;

    const userId = usuarioAEliminar._id || usuarioAEliminar.id;

    if (!userId) {
      console.error('No se encontró identificador de usuario para eliminar.');
      setErrorMsg('No se encontró el identificador del usuario.');
      return;
    }

    try {
      setErrorMsg('');
      setIsDeleting(true);

      await eliminarUsuario(userId);

      if (typeof onConfirm === 'function') {
        onConfirm(userId);
      }

      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setErrorMsg(
        error?.response?.data?.message ||
          error?.message ||
          'Ocurrió un error al eliminar el usuario. Inténtalo nuevamente.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Cerrar al hacer clic en el overlay.
  const handleOverlayClick = () => {
    if (isDeleting) return;
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  // Evitar que los clics dentro de la tarjeta cierren el modal.
  const handleCardClick = (event) => {
    event.stopPropagation();
  };

  // =========================
  // Render del modal autónomo
  // =========================

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4 sm:px-6 lg:px-8"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      {/* Capa de fondo semitransparente con blur (usa helper PCM) */}
      <div className="absolute inset-0 pcm-overlay-suave backdrop-blur-sm" />

      {/* Contenedor relativo de la tarjeta del modal */}
      <div
        className="relative z-10 w-full max-w-lg"
        onClick={handleCardClick}
      >
        {/* Tarjeta principal del contenido del modal con estilos PCM y borde por rol */}
        <div
          className={`bg-pcm-surfaceSoft/95 rounded-pcm-xl border shadow-pcm-soft w-full px-6 py-5 mx-0 sm:mx-auto ${estilosRol.bordeTarjeta}`}
        >
          {/* Encabezado */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center shadow-pcm-soft">
              <AlertTriangle className="text-red-400" size={22} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-pcm-text">
                  Confirmar eliminación
                </h3>

                <span
                  className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${estilosRol.chipRol}`}
                >
                  {estilosRol.etiquetaRol}
                </span>
              </div>

              <p className="text-xs text-pcm-muted">
                Esta acción eliminará el usuario del sistema y no se puede
                deshacer.
              </p>
            </div>
          </div>

          {/* Texto descriptivo con el nombre del usuario */}
          <p className="text-sm text-pcm-text mb-3">
            ¿Seguro que deseas eliminar al usuario{' '}
            <span className="font-semibold">
              {usuarioAEliminar.firstName} {usuarioAEliminar.lastName}
            </span>
            ? Sus accesos al panel quedarán deshabilitados de forma permanente.
          </p>

          {/* Bloque opcional con correo */}
          {usuarioAEliminar.email && (
            <div className="mb-4 text-xs text-pcm-muted bg-pcm-bg/60 border border-white/10 rounded-pcm-xl px-4 py-3">
              <span className="font-semibold text-pcm-text">Correo:</span>{' '}
              {usuarioAEliminar.email}
            </div>
          )}

          {/* Mensaje de error */}
          {errorMsg && (
            <div className="mb-4 rounded-pcm-xl border border-red-500/50 bg-red-500/10 text-red-200 text-xs px-4 py-2">
              {errorMsg}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={isDeleting ? undefined : onClose}
              disabled={isDeleting}
              className="pcm-btn-ghost pcm-btn-min-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="pcm-btn-danger flex items-center gap-2 text-xs sm:text-sm rounded-pcm-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Eliminar usuario</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarUsuario;
