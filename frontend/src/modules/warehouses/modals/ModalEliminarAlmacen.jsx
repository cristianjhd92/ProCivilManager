// File: frontend/src/modules/warehouses/modals/ModalEliminarAlmacen.jsx         // Ruta del archivo dentro del módulo de almacenes.
// Description: Modal de confirmación para eliminar un almacén dentro del        // Descripción: confirma la eliminación de un almacén en el workspace.
//              workspace interno de ProCivil Manager. Muestra un mensaje        // Indica que se usa un mensaje de advertencia y botones Cancelar/Eliminar.
//              de advertencia y dos acciones (cancelar y confirmar), usando     // Explica que se aplican el tema visual PCM y helpers de botones.
//              un contenedor autónomo (overlay + tarjeta) alineado al tema      // Señala que se elimina ModalGenerico y se usa un modal propio PCM.
//              visual PCM, adaptando el borde según el rol del usuario          // Resalta que el borde del panel se adapta al rol del usuario (admin, líder, cliente, auditor).
//              (admin, líder de obra, cliente, auditor) y manteniendo           // Señala que se respeta el contexto visual y funcional del sistema en Colombia.
//              textos y comentarios en español para el contexto colombiano.     // Indica que los textos están en español y pensados para usuarios colombianos.

// ==========================
// Importaciones principales
// ==========================

// Se importa React y varios hooks para implementar funcionalidades comunes en los modales.
import React, {
  useEffect,    // Hook para manejar efectos secundarios (cierre por ESC, bloqueo de scroll)
  useState,     // Hook para almacenar el rol lógico del usuario actual
  useMemo,      // Hook para derivar el rol visual a partir del rol lógico
} from 'react';

// Importa íconos utilizados en el modal: advertencia y cierre (X)
import { AlertCircle, X } from 'lucide-react';

// ==========================
// Helpers de cálculo de rol
// ==========================

/**
 * Convierte el rol lógico del usuario (texto guardado en localStorage) a un rol visual
 * simplificado (admin, cliente, auditor, líder). Esta función se usa para aplicar
 * las clases .pcm-panel--ROL definidas en index.css, que inyectan variables CSS
 * como --pcm-color-acento y sus derivados para cada rol.
 */
const obtenerRolVisual = (rolUsuario) => {
  const rolCrudo = (rolUsuario || '').toString().toLowerCase();
  if (rolCrudo.includes('admin')) return 'admin';
  if (rolCrudo.includes('auditor')) return 'auditor';
  if (rolCrudo.includes('client') || rolCrudo.includes('cliente')) return 'cliente';
  return 'lider';
};

// =======================================
// Componente funcional ModalEliminarAlmacen
// =======================================
//
// Props esperadas:
//
//  - estaAbierto: bandera booleana que controla la visibilidad del modal.
//  - almacen:     objeto del almacén a eliminar (puede ser null/undefined).
//  - alConfirmar: callback que se ejecuta cuando el usuario confirma la eliminación.
//  - alCancelar:  callback que se ejecuta cuando el usuario cancela/cierra el modal.
//  - rolUsuario:  rol del usuario en el workspace (admin, líder de obra, cliente, auditor).
//
const ModalEliminarAlmacen = ({
  estaAbierto,
  almacen,
  alConfirmar,
  alCancelar,
}) => {
  // =========================
  //   Rol del usuario (lógico)
  // =========================
  const [rolUsuario, setRolUsuario] = useState('lider');

  // Detecta el rol desde localStorage al montar el componente.
  useEffect(() => {
    try {
      const datoUsuario = localStorage.getItem('pcm_usuario');
      if (datoUsuario) {
        const usuario = JSON.parse(datoUsuario);
        const rolDetectado =
          usuario?.rol || usuario?.role || usuario?.tipoRol || 'lider';
        setRolUsuario(rolDetectado);
      }
    } catch (error) {
      console.error('Error al leer el rol en ModalEliminarAlmacen:', error);
      setRolUsuario('lider');
    }
  }, []);

  // Deriva el rol visual para aplicar .pcm-panel--ROL
  const rolVisual = useMemo(() => obtenerRolVisual(rolUsuario), [rolUsuario]);

  // Construye la clase del panel según el rol visual
  const clasePanelRol = useMemo(() => {
    return `pcm-panel pcm-panel--${rolVisual}`;
  }, [rolVisual]);

  // Si el modal no está abierto, no se renderiza nada
  if (!estaAbierto) return null;

  // Extrae nombre legible del almacén
  const nombreAlmacen = almacen?.nombre || 'este almacén';

  // Bloquea el scroll del body cuando el modal está abierto
  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, []);

  // Cierra el modal al presionar la tecla ESC
  useEffect(() => {
    const manejarKeyDown = (evento) => {
      if (evento.key === 'Escape') {
        if (typeof alCancelar === 'function') alCancelar();
      }
    };
    window.addEventListener('keydown', manejarKeyDown);
    return () => window.removeEventListener('keydown', manejarKeyDown);
  }, [alCancelar]);

  return (
    <div
      className={
        `${clasePanelRol} fixed inset-0 z-40 flex items-center justify-center px-4 sm:px-6`
      }
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-eliminar-almacen-titulo"
    >
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/75 pcm-overlay-suave"
        onClick={(evento) => {
          // cierra el modal si se hace clic en el overlay
          if (evento.target === evento.currentTarget && typeof alCancelar === 'function') {
            alCancelar();
          }
        }}
      />
      {/* Contenedor centrado del modal con animación de entrada */}
      <div className="relative w-full max-w-md animate-entrada-suave-arriba" onClick={(e) => e.stopPropagation()}>
        <div className="pcm-borde-animado">
          <div
            className="pcm-borde-animado-contenido bg-pcm-surface rounded-[var(--radius-pcm-xl,1.5rem)] shadow-pcm-profunda border border-pcm-borderSoft text-pcm-text px-6 py-5"
          >
            {/* Encabezado del modal con ícono, título y botón X */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderBottomColor: 'var(--pcm-color-acento-border)' }}>
              <div className="flex items-center gap-3">
                <AlertCircle className="text-amber-400" size={24} />
                <h3 id="modal-eliminar-almacen-titulo" className="text-lg font-semibold">
                  Confirmar eliminación
                </h3>
              </div>
              {/* Botón X para cerrar */}
              <button
                type="button"
                onClick={alCancelar}
                className="w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center text-pcm-muted hover:text-pcm-text hover:bg-white/10 transition-all duration-150"
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>
            {/* Contenido del modal */}
            <div className="space-y-4 text-sm sm:text-base">
              <p className="text-pcm-text leading-relaxed">
                ¿Estás seguro de que deseas eliminar el almacén{' '}
                <span className="font-semibold text-pcm-text">{nombreAlmacen}</span>?
              </p>
              <p className="text-xs sm:text-sm text-pcm-muted">
                Esta acción no se puede deshacer y podría afectar los registros asociados a inventarios y movimientos de materiales vinculados a este almacén.
              </p>
            </div>
            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button
                type="button"
                onClick={alCancelar}
                className="w-full sm:flex-1 px-4 py-2 bg-pcm-surfaceSoft border border-pcm-borderSoft rounded-lg text-pcm-text text-sm font-semibold hover:bg-pcm-surface transition duration-150"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={alConfirmar}
                className="w-full sm:flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-slate-900 shadow-pcm-suave hover:shadow-pcm-profunda transform hover:-translate-y-0.5 transition duration-150"
                style={{
                  backgroundImage: 'linear-gradient(90deg, var(--pcm-color-acento), var(--pcm-color-acento-border))',
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exportación por defecto para usar este modal en otras partes del módulo de almacenes.
export default ModalEliminarAlmacen;                                           // Permite importar el modal desde vistas como la vista de almacenes y otros componentes relacionados.
