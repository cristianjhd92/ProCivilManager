// File: frontend/src/modules/warehouses/modals/ModalDetalleAlmacen.jsx
// Description: Modal de detalle de almacén para ProCivil Manager (PCM).
//              Muestra la información completa del almacén seleccionado (nombre,
//              ubicación, dirección, contacto, encargado) y lista los materiales
//              disponibles en ese almacén con un filtro por nombre/categoría.
//              Permite al usuario cerrar el modal mediante un botón o clic en
//              el fondo oscuro. Este modal es de solo lectura para roles
//              diferentes a admin/líder, pero muestra la lista completa de
//              materiales para todos los roles.

import React, { useState, useEffect } from 'react';
import { X, Warehouse, Package, Search, Phone, MapPin, User } from 'lucide-react';
import { obtenerMateriales } from '../../../services/api/api.js';

// Componente principal del modal de detalle de almacén
const ModalDetalleAlmacen = ({ almacen, onClose, rolUsuario = 'admin' }) => {
  // Estado para los materiales de este almacén
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    // Carga los materiales al montar el componente
    const cargarMateriales = async () => {
      if (!almacen || !almacen._id) return;
      setLoading(true);
      try {
        const all = await obtenerMateriales();
        // Filtra materiales cuyo almacen coincida con el id del almacén seleccionado
        const filtrados = Array.isArray(all)
          ? all.filter((m) => m.almacen && m.almacen._id === almacen._id)
          : [];
        setMateriales(filtrados);
      } catch (error) {
        console.error('Error al obtener materiales del almacén:', error);
        setMateriales([]);
      } finally {
        setLoading(false);
      }
    };
    cargarMateriales();
  }, [almacen]);

  // Filtrado de materiales según búsqueda
  const materialesFiltrados = materiales.filter((m) => {
    const term = busqueda.toLowerCase();
    // Obtiene nombre y categoría tanto si vienen anidados en material como en el objeto raíz
    const nombre = (
      (m.material && m.material.nombre) ||
      m.nombre ||
      ''
    ).toString().toLowerCase();
    const categoria = (
      (m.material && m.material.categoria) ||
      m.categoria ||
      ''
    ).toString().toLowerCase();
    return nombre.includes(term) || categoria.includes(term);
  });

  // Helper para cerrar con tecla Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!almacen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Fondo oscuro clickeable para cerrar */}
      <div className="absolute inset-0" onClick={onClose}></div>
      {/* Contenedor del modal */}
      <div className="relative bg-pcm-surfaceSoft/95 rounded-pcm-xl w-full max-w-4xl shadow-pcm-soft overflow-hidden animate-fade-in-soft">
        {/* Encabezado */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pcm-primary flex items-center justify-center">
              <Warehouse size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-pcm-text">
                {almacen.nombre || 'Almacén'}
              </h3>
              <p className="text-pcm-primary/80 text-sm">Detalle de almacén</p>
            </div>
          </div>
          <button onClick={onClose} className="text-pcm-muted hover:text-pcm-text">
            <X size={24} />
          </button>
        </div>
        {/* Cuerpo del modal */}
        <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-pcm-primary/70 text-xs uppercase font-semibold mb-1">Ciudad</p>
              <p className="text-pcm-text text-base">{almacen.ciudad || '-'}</p>
            </div>
            <div>
              <p className="text-pcm-primary/70 text-xs uppercase font-semibold mb-1">País</p>
              <p className="text-pcm-text text-base">{almacen.pais || '-'}</p>
            </div>
            <div>
              <p className="text-pcm-primary/70 text-xs uppercase font-semibold mb-1">Dirección</p>
              <p className="text-pcm-text text-base">{almacen.direccion || '-'}</p>
            </div>
            <div>
              <p className="text-pcm-primary/70 text-xs uppercase font-semibold mb-1">Teléfono</p>
              <p className="text-pcm-text text-base">{almacen.telefono || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-pcm-primary/70 text-xs uppercase font-semibold mb-1">Encargado</p>
              <p className="text-pcm-text text-base">
                {/* Muestra nombre y apellido si existen propiedades separadas; de lo contrario, usa el campo encargado completo */}
                {(() => {
                  if (almacen.encargadoNombre || almacen.encargadoApellido) {
                    return [almacen.encargadoNombre, almacen.encargadoApellido]
                      .filter(Boolean)
                      .join(' ');
                  }
                    // Si hay propiedad 'encargado' (cadena), se muestra directamente
                  return almacen.encargado || '-';
                })()}
              </p>
            </div>
          </div>

          {/* Lista de materiales */}
          <div>
            <h4 className="text-xl font-bold text-pcm-primary mb-4 flex items-center gap-2">
              <Package size={22} /> Materiales en este almacén
            </h4>
            {/* Input de búsqueda */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-pcm-muted" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o categoría"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
                />
              </div>
            </div>
            {loading ? (
              <p className="text-pcm-muted">Cargando materiales...</p>
            ) : materialesFiltrados.length === 0 ? (
              <p className="text-pcm-muted">No hay materiales para este almacén.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {materialesFiltrados.map((item, idx) => {
                  // Extrae propiedades de nombre, categoría, unidad tanto en material anidado como en raíz
                  const nombre = item.material?.nombre || item.nombre || '—';
                  const categoria = item.material?.categoria || item.categoria || '—';
                  const unidad = item.material?.unidad || item.unidad || 'u';
                  const cantidad =
                    item.cantidadDisponible ?? item.cantidad ?? 0;
                  return (
                    <div
                      key={idx}
                      className="bg-pcm-bg/70 rounded-lg p-4 border border-white/10 flex flex-col md:flex-row justify-between md:items-center gap-2"
                    >
                      <div>
                        <p className="font-semibold text-pcm-text text-base mb-0.5">
                          {nombre}
                        </p>
                        <p className="text-pcm-muted text-sm">{categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-pcm-text font-bold text-lg">
                          {cantidad} {unidad}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleAlmacen;