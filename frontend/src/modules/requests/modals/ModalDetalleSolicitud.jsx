// File: frontend/src/modules/requests/modals/ModalDetalleSolicitud.jsx
// Description: Modal para ver el detalle de una solicitud (proyecto o material),
//              cambiar su estado (para administradores) y agregar respuestas/comentarios.

import React, { useEffect, useState } from 'react';
import {
  actualizarEstadoSolicitud,
  obtenerSolicitudPorId,
  agregarRespuestaSolicitud,
} from '../../../services/api/api.js';

/**
 * ModalDetalleSolicitud
 *
 * Muestra la información completa de una solicitud seleccionada, incluyendo
 * tipo, título, descripción, estado, solicitante y materiales (si aplica).
 * Permite a un administrador cambiar el estado de la solicitud y a cualquier
 * usuario agregar respuestas/comentarios. Las respuestas y el nuevo estado
 * se envían al backend y actualizan la vista de solicitudes cuando corresponda.
 *
 * Props:
 *  - idSolicitud: ID de la solicitud a mostrar.
 *  - abierto: booleano para mostrar/ocultar el modal.
 *  - onClose: función que se llama al cerrar el modal.
 *  - onSolicitudActualizada: función que se llama tras actualizar el estado o agregar respuesta para refrescar lista.
 */
const ModalDetalleSolicitud = ({
  idSolicitud,
  abierto,
  onClose,
  onSolicitudActualizada,
}) => {
  const [solicitud, setSolicitud] = useState(null); // Datos de la solicitud actual
  const [nuevoEstado, setNuevoEstado] = useState(''); // Estado seleccionado por el admin
  const [mensajeRespuesta, setMensajeRespuesta] = useState(''); // Contenido de la respuesta
  const [cargando, setCargando] = useState(false); // Bandera de carga al obtener la solicitud
  const [error, setError] = useState(null); // Mensaje de error si ocurre

  // Obtiene los datos del usuario actual desde localStorage (role e id)
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
  const rolActual = (usuarioActual.role || usuarioActual.rol || '').trim().toLowerCase();

  // Cada vez que el modal se abre con un ID válido, cargamos la solicitud.
  useEffect(() => {
    if (!abierto || !idSolicitud) return;
    const fetchSolicitud = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await obtenerSolicitudPorId(idSolicitud);
        setSolicitud(data);
        // Prefijar el estado actual para que el select muestre el valor actual en caso de admin
        setNuevoEstado(data?.estado || 'pendiente');
      } catch (err) {
        setError(err.message || 'Error al cargar la solicitud.');
      } finally {
        setCargando(false);
      }
    };
    fetchSolicitud();
  }, [abierto, idSolicitud]);

  // Maneja la actualización del estado de la solicitud
  const handleGuardarEstado = async () => {
    if (!idSolicitud || !nuevoEstado) return;
    try {
      await actualizarEstadoSolicitud(idSolicitud, nuevoEstado);
      // Actualiza localmente el estado de la solicitud
      setSolicitud((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
      if (onSolicitudActualizada) onSolicitudActualizada();
    } catch (err) {
      setError(err.message || 'Error al actualizar el estado');
    }
  };

  // Maneja el envío de una nueva respuesta/comentario
  const handleEnviarRespuesta = async () => {
    const contenido = mensajeRespuesta.trim();
    if (!contenido || !idSolicitud) return;
    try {
      await agregarRespuestaSolicitud(idSolicitud, contenido);
      setMensajeRespuesta('');
      if (onSolicitudActualizada) onSolicitudActualizada();
      // Recargar la solicitud para mostrar las respuestas actualizadas
      const data = await obtenerSolicitudPorId(idSolicitud);
      setSolicitud(data);
    } catch (err) {
      setError(err.message || 'Error al enviar la respuesta');
    }
  };

  if (!abierto) return null; // No renderiza si el modal está cerrado

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="pcm-card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-bold text-pcm-primary">Detalle de la solicitud</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-pcm-muted hover:text-pcm-text text-xl"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {cargando ? (
            <p className="text-sm text-pcm-muted">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : solicitud ? (
            <>
              {/* Información básica */}
              <div className="space-y-1 text-sm text-pcm-text">
                <p>
                  <span className="font-semibold">Tipo:</span> {solicitud.tipo}
                </p>
                <p>
                  <span className="font-semibold">Título:</span> {solicitud.titulo}
                </p>
                {solicitud.descripcion && (
                  <p>
                    <span className="font-semibold">Descripción:</span>{' '}
                    {solicitud.descripcion}
                  </p>
                )}
                {solicitud.usuario && (
                  <p>
                    <span className="font-semibold">Solicitante:</span>{' '}
                    {solicitud.usuario.firstName || solicitud.usuario.nombre}{' '}
                    {solicitud.usuario.lastName || solicitud.usuario.apellido || ''}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Estado actual:</span>{' '}
                  {solicitud.estado}
                </p>
              </div>

              {/* Lista de materiales si aplica */}
              {solicitud.tipo === 'material' && Array.isArray(solicitud.items) && (
                <div className="mt-4">
                  <h4 className="font-semibold text-pcm-primary">Materiales solicitados</h4>
                  <ul className="list-disc ml-6 space-y-1 text-sm text-pcm-text">
                    {solicitud.items.map((item, idx) => (
                      <li key={idx}>
                        {item.material?.nombre || item.material || ''} - Cantidad:{' '}
                        {item.cantidad}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Selector de estado para administradores */}
              {rolActual === 'admin' && (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-pcm-muted">
                    Cambiar estado
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="w-full p-2 rounded-md border border-white/15 bg-pcm-surface text-sm"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobada">Aprobada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="procesada">Procesada</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGuardarEstado}
                    className="pcm-btn-primary text-sm px-3 py-2 mt-1"
                  >
                    Guardar estado
                  </button>
                </div>
              )}

              {/* Respuestas existentes */}
              {Array.isArray(solicitud.respuestas) && solicitud.respuestas.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-pcm-primary">Respuestas</h4>
                  <ul className="space-y-2 mt-2">
                    {solicitud.respuestas.map((resp, idx) => (
                      <li key={idx} className="p-2 rounded-lg border border-white/10">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-pcm-text">
                            {resp.usuario?.firstName || resp.usuario?.nombre || ''}{' '}
                            {resp.usuario?.lastName || resp.usuario?.apellido || ''}
                          </span>
                          <span className="text-xs text-pcm-muted">
                            {new Date(resp.createdAt).toLocaleString('es-CO')}
                          </span>
                        </div>
                        <p className="text-sm text-pcm-text whitespace-pre-line">
                          {resp.contenido}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Área para agregar nueva respuesta */}
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-pcm-muted" htmlFor="nuevaRespuesta">
                  Agregar respuesta
                </label>
                <textarea
                  id="nuevaRespuesta"
                  value={mensajeRespuesta}
                  onChange={(e) => setMensajeRespuesta(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-white/15 bg-pcm-surface p-2 text-sm text-pcm-text resize-y"
                  placeholder="Escribe tu respuesta..."
                ></textarea>
                <button
                  type="button"
                  onClick={handleEnviarRespuesta}
                  className="pcm-btn-primary text-sm px-3 py-2"
                >
                  Enviar
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-pcm-muted">No se encontró la solicitud.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleSolicitud;