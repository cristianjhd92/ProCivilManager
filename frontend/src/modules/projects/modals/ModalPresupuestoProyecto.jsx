// File: frontend/src/modules/projects/modals/ModalPresupuestoProyecto.jsx
// Description: Modal para gestionar el presupuesto de materiales de un proyecto en ProCivil Manager.
//              Permite consultar y editar las líneas de presupuesto, agregar materiales,
//              calcular el total, revisar alertas de sobrecosto y descargar un resumen en PDF.

import React, { useEffect, useState } from 'react';
import {
  X,
  DollarSign,
  FileDown,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
// Servicios de API para presupuesto y materiales
import {
  obtenerPresupuestoProyecto,
  guardarPresupuestoProyecto,
  obtenerMateriales,
} from '../../../services/api/api.js';

// Librerías para generación de PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * ModalPresupuestoProyecto
 *
 * Props:
 *  - projectId: string → ID del proyecto asociado.
 *  - isOpen: boolean  → determina si el modal se muestra.
 *  - onClose: function → callback para cerrar el modal.
 *  - onSaved: function → callback opcional que se llama al guardar el presupuesto.
 */
const ModalPresupuestoProyecto = ({ projectId, isOpen, onClose, onSaved }) => {
  const [items, setItems] = useState([]); // Lista de líneas de presupuesto actuales
  const [materials, setMaterials] = useState([]); // Lista de materiales disponibles para agregar
  const [loading, setLoading] = useState(false); // Bandera de carga inicial
  const [saving, setSaving] = useState(false); // Bandera de guardado
  const [total, setTotal] = useState(0); // Total calculado del presupuesto
  const [newItem, setNewItem] = useState({ materialId: '', cantidad: '', costo: '' }); // Datos del nuevo ítem
  const [feedback, setFeedback] = useState(null); // Mensajes de error o éxito

  // Carga inicial de presupuesto y materiales al abrir el modal
  useEffect(() => {
    if (!isOpen || !projectId) return;
    const loadData = async () => {
      setLoading(true);
      setFeedback(null);
      try {
        // Obtiene el presupuesto existente
        const data = await obtenerPresupuestoProyecto(projectId);
        if (data && data.presupuesto && Array.isArray(data.presupuesto.items)) {
        const itemsNormalized = data.presupuesto.items.map((it) => ({
          materialId: it.material._id || it.material,
          materialName: it.material.nombre || 'Sin nombre',
          categoria: it.material.categoria || '',
          unidad: it.material.unidad || '',
          // Cantidad prevista para el presupuesto
          cantidad: it.cantidadPrevista,
          // Costo previsto por unidad
          costo: it.costoPrevisto,
          // Incluye campos adicionales del material para mostrar en la tabla o para reutilizar
          precioUnitario: it.material.precioUnitario || 0,
          stock: it.material.cantidad,
        }));
          setItems(itemsNormalized);
        } else {
          setItems([]);
        }
        // Obtiene lista de materiales para poder añadir nuevos ítems
        const mats = await obtenerMateriales();
        setMaterials(Array.isArray(mats) ? mats : []);
      } catch (err) {
        console.error('Error al cargar presupuesto o materiales:', err);
        setFeedback({ type: 'error', message: 'No se pudo cargar el presupuesto.' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, projectId]);

  // Recalcula el total cuando cambian los ítems
  useEffect(() => {
    const sum = items.reduce(
      (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.costo) || 0),
      0
    );
    setTotal(sum);
  }, [items]);

  /**
   * Maneja el cambio de un campo en una línea de presupuesto
   * @param {number} index Índice del ítem a modificar
   * @param {string} field Campo a actualizar ("cantidad" o "costo")
   * @param {string|number} value Nuevo valor
   */
  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === index ? { ...it, [field]: value } : it
      )
    );
  };

  /**
   * Elimina un ítem del presupuesto
   * @param {number} index Índice del ítem a eliminar
   */
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  /**
   * Agrega un nuevo ítem al presupuesto con los datos introducidos en newItem
   */
  const handleAddNewItem = () => {
    const { materialId, cantidad, costo } = newItem;
    if (!materialId) return;
    // Evita agregar dos veces el mismo material
    if (items.some((it) => it.materialId === materialId)) {
      setFeedback({ type: 'error', message: 'El material ya está en el presupuesto.' });
      return;
    }
    const materialObj = materials.find((m) => m._id === materialId) || {};
    setItems((prev) => [
      ...prev,
      {
        materialId,
        materialName: materialObj.nombre || 'Sin nombre',
        categoria: materialObj.categoria || '',
        unidad: materialObj.unidad || '',
        cantidad: Number(cantidad) || 0,
        costo: Number(costo) || 0,
      },
    ]);
    // Limpia el formulario de nuevo ítem
    setNewItem({ materialId: '', cantidad: '', costo: '' });
  };

  /**
   * Guarda el presupuesto actual en el backend
   */
  const handleSaveBudget = async () => {
    if (!projectId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        totalPresupuesto: total,
        items: items.map((it) => ({
          material: it.materialId,
          cantidadPrevista: Number(it.cantidad) || 0,
          costoPrevisto: Number(it.costo) || 0,
        })),
      };
      await guardarPresupuestoProyecto(projectId, payload);
      setFeedback({ type: 'success', message: 'Presupuesto guardado correctamente.' });
      if (typeof onSaved === 'function') onSaved();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      console.error('Error al guardar presupuesto:', err);
      setFeedback({ type: 'error', message: 'No se pudo guardar el presupuesto.' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Descarga un PDF con el resumen del presupuesto
   */
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Presupuesto del Proyecto`, 10, 10);
      doc.setFontSize(10);
      doc.text(`ID del proyecto: ${projectId}`, 10, 16);
      const tableBody = items.map((it) => [
        it.materialName,
        it.categoria || '-',
        it.unidad || '-',
        it.cantidad,
        it.costo,
        (Number(it.cantidad) * Number(it.costo)).toFixed(2),
      ]);
      autoTable(doc, {
        head: [
          ['Material', 'Categoría', 'Unidad', 'Cantidad', 'Costo', 'Subtotal'],
        ],
        body: tableBody,
        startY: 22,
      });
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 30;
      doc.setFontSize(12);
      doc.text(
        `Total: $${total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
        10,
        finalY
      );
      doc.save(`presupuesto_${projectId}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF:', e);
    }
  };

  // Si el modal no está abierto, no renderiza nada
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      aria-modal="true"
      role="dialog"
      aria-labelledby="titulo-modal-presupuesto"
    >
      <div className="pcm-card bg-pcm-card max-w-5xl w-full mx-4 rounded-pcm-xl shadow-pcm-soft border border-white/10 animate-scale-in">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-pcm-primary" />
            <h2 id="titulo-modal-presupuesto" className="text-base font-semibold text-pcm-text">
              Presupuesto del proyecto
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-pcm-surfaceSoft transition duration-150"
            aria-label="Cerrar modal de presupuesto"
          >
            <X size={18} className="text-pcm-muted" />
          </button>
        </div>
        {/* Cuerpo */}
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="text-pcm-muted text-sm">Cargando presupuesto...</p>
          ) : (
            <>
              {feedback && feedback.message && (
                <div
                  className={`text-sm rounded-lg px-3 py-2 ${
                    feedback.type === 'error'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {feedback.message}
                </div>
              )}
              {/* Tabla de ítems */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm text-left">
                  <thead>
                    <tr className="bg-pcm-surfaceSoft text-pcm-text uppercase text-[10px] md:text-xs">
                      <th className="px-2 py-2">Material</th>
                      <th className="px-2 py-2">Categoría</th>
                      <th className="px-2 py-2">Unidad</th>
                      <th className="px-2 py-2">Cantidad</th>
                      <th className="px-2 py-2">Costo</th>
                      <th className="px-2 py-2">Subtotal</th>
                      <th className="px-2 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-b border-white/10">
                        <td className="px-2 py-1 whitespace-nowrap">{it.materialName}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{it.categoria || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{it.unidad || '-'}</td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            className="w-20 bg-pcm-bg/80 border border-white/10 rounded px-1 py-1 text-center"
                            value={it.cantidad}
                            onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            className="w-24 bg-pcm-bg/80 border border-white/10 rounded px-1 py-1 text-center"
                            value={it.costo}
                            onChange={(e) => handleItemChange(idx, 'costo', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          ${
                            ((Number(it.cantidad) || 0) * (Number(it.costo) || 0)).toLocaleString(
                              'es-CO',
                              { minimumFractionDigits: 2 }
                            )
                          }
                        </td>
                        <td className="px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Fila para agregar nuevo ítem */}
                    <tr className="border-t border-white/10">
                      <td className="px-2 py-1">
                      <select
                        value={newItem.materialId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          // Busca el material seleccionado para extraer precio unitario y stock
                          const mat = materials.find((m) => m._id === selectedId) || {};
                          setNewItem((prev) => ({
                            ...prev,
                            materialId: selectedId,
                            // Al seleccionar un material asignamos el costo predeterminado
                            // igual al precio unitario del material. El usuario puede
                            // modificarlo si lo requiere.
                            costo: mat.precioUnitario ?? prev.costo,
                            cantidad: prev.cantidad,
                          }));
                        }}
                        className="w-40 bg-pcm-bg/80 border border-white/10 rounded px-1 py-1 text-sm"
                      >
                        <option value="">-- Seleccione material --</option>
                        {materials.map((m) => (
                          <option key={m._id} value={m._id}>
                            {`${m.nombre} (Stock: ${m.cantidad ?? 0}, $${Number(m.precioUnitario || 0).toLocaleString('es-CO')})`}
                          </option>
                        ))}
                      </select>
                      </td>
                      <td className="px-2 py-1 text-pcm-muted">—</td>
                      <td className="px-2 py-1 text-pcm-muted">—</td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          className="w-20 bg-pcm-bg/80 border border-white/10 rounded px-1 py-1 text-center"
                          value={newItem.cantidad}
                          onChange={(e) => setNewItem({ ...newItem, cantidad: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          className="w-24 bg-pcm-bg/80 border border-white/10 rounded px-1 py-1 text-center"
                          value={newItem.costo}
                          onChange={(e) => setNewItem({ ...newItem, costo: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1 text-pcm-muted">—</td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={handleAddNewItem}
                          className="p-1 text-emerald-500 hover:text-emerald-600"
                          disabled={!newItem.materialId}
                        >
                          <Plus size={16} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Total */}
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-pcm-text text-sm">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-pcm-primary">
                    ${total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {/* Alerta de sobrecosto si el total es negativo o cero no es necesaria, se mantiene para futuras extensiones */}
              </div>
            </>
          )}
        </div>
        {/* Pie */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 bg-pcm-surfaceSoft/60">
          <button
            type="button"
            onClick={onClose}
            className="pcm-btn-ghost text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="pcm-btn-secondary text-sm flex items-center gap-1"
          >
            <FileDown size={16} /> PDF
          </button>
          <button
            type="button"
            onClick={handleSaveBudget}
            disabled={saving}
            className="pcm-btn-primary text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPresupuestoProyecto;