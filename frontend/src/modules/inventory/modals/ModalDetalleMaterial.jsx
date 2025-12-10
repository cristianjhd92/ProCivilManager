// File: frontend/src/modules/inventory/modals/ModalDetalleMaterial.jsx
// Description: Modal que muestra el detalle completo de un material, incluyendo
//              sus atributos y la información del almacén asociado. Se utiliza
//              para visualizar rápidamente los datos de un material desde la
//              vista de inventarios de ProCivil Manager (PCM). El modal es
//              autónomo y adapta su apariencia según el rol del usuario.

import React, { useEffect, useState, useMemo } from 'react';
import { X, Package, Warehouse as IconoAlmacen, DollarSign, Boxes } from 'lucide-react';

/**
 * ModalDetalleMaterial
 *
 * Props:
 *  - estaAbierto: boolean. Si true, el modal se renderiza; si false, retorna null.
 *  - material: object. Objeto de material completo con campos nombre, categoria,
 *    unidad, precioUnitario, cantidad, stockMinimo y relación poblada 'almacen'.
 *  - alCerrar: function. Callback que se ejecuta al cerrar el modal (clic en X, overlay o ESC).
 */
const ModalDetalleMaterial = ({ estaAbierto, material, alCerrar }) => {
  // Lee el rol del usuario desde localStorage para ajustar colores.
  const [rolUsuario, setRolUsuario] = useState('lider');

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
      console.error('Error al leer el rol del usuario en ModalDetalleMaterial:', error);
      setRolUsuario('lider');
    }
  }, []);

  // Deriva el rol visual (admin, cliente, auditor, lider) para colores de fondo.
  const rolVisual = useMemo(() => {
    const rolLower = (rolUsuario || '').toString().toLowerCase();
    if (rolLower.includes('admin')) return 'admin';
    if (rolLower.includes('auditor')) return 'auditor';
    if (rolLower.includes('client') || rolLower.includes('cliente')) return 'cliente';
    return 'lider';
  }, [rolUsuario]);

  // Si el modal no está abierto o no hay material, no renderiza nada.
  if (!estaAbierto || !material) return null;

  // Bloquea el scroll del body mientras el modal está abierto.
  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, []);

  // Permite cerrar con la tecla ESC.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (typeof alCerrar === 'function') alCerrar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alCerrar]);

  // Formateador de moneda en COP.
  const formatoCop = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });

  // Obtiene datos del almacén si está poblado.
  const almacenNombre =
    typeof material.almacen === 'object' && material.almacen
      ? material.almacen.nombre || ''
      : '';
  const almacenDireccion =
    typeof material.almacen === 'object' && material.almacen
      ? material.almacen.direccion || ''
      : '';
  const almacenTelefono =
    typeof material.almacen === 'object' && material.almacen
      ? material.almacen.telefono || ''
      : '';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Permite cerrar al hacer clic en el overlay.
        if (e.target === e.currentTarget && typeof alCerrar === 'function') alCerrar();
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/75 pcm-overlay-suave" />

      {/* Contenedor del modal */}
      <div
        className={`relative w-full max-w-xl animate-entrada-suave-arriba pcm-panel pcm-panel--${rolVisual}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Borde animado PCM */}
        <div className="pcm-borde-animado">
          <div
            className="pcm-borde-animado-contenido bg-pcm-surface rounded-[var(--radius-pcm-xl,1.5rem)] shadow-pcm-profunda border border-pcm-borderSoft text-pcm-text px-6 py-5"
          >
            {/* Encabezado con título y botón cerrar */}
            <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderBottomColor: 'var(--pcm-color-acento-border)' }}>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Package size={22} /> Detalle de material
              </h3>
              <button
                type="button"
                onClick={alCerrar}
                className="w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center text-pcm-muted hover:text-pcm-text hover:bg-white/10 transition-all duration-150"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del detalle */}
            <div className="space-y-4 text-sm sm:text-base">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold">Nombre:</span>
                <span>{material.nombre || '-'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold">Categoría:</span>
                <span>{material.categoria || '-'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold">Unidad:</span>
                <span>{material.unidad || '-'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold">Precio unitario:</span>
                <span>{material.precioUnitario !== undefined && material.precioUnitario !== null ? formatoCop.format(Number(material.precioUnitario)) : '-'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold">Cantidad:</span>
                <span>{material.cantidad !== undefined && material.cantidad !== null ? material.cantidad : '-'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold">Stock mínimo:</span>
                <span>{material.stockMinimo !== undefined && material.stockMinimo !== null ? material.stockMinimo : '-'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <span className="font-semibold flex items-center gap-1">
                  <IconoAlmacen size={18} /> Almacén:
                </span>
                <span>
                  {almacenNombre || '-'}
                  {almacenDireccion && <>, {' '}{almacenDireccion}</>}
                  {almacenTelefono && <>, {' '}{almacenTelefono}</>}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleMaterial;