// File: frontend/src/modules/projects/components/SelectorClienteProyecto.jsx
// Description: Componente reutilizable para seleccionar el cliente de un
//              proyecto en PCM. Pensado para usarse dentro de formularios
//              como el modal de creación/edición de proyectos, usando el
//              estilo de select personalizado PCM (clase .pcm-select).

// =========================
// Importaciones principales
// =========================
import React from "react";                       // Importa React para definir el componente.
import { UserRound } from "lucide-react";       // Ícono para representar usuarios/cliente.

// =========================
// Componente principal
// =========================

/**
 * Selector de cliente para formularios de proyecto.
 *
 * Props:
 * - clientes: arreglo de usuarios con rol cliente (al menos {_id, firstName, lastName, email}).
 * - valorSeleccionado: id del cliente actualmente seleccionada.
 * - onCambiarCliente: función que recibe el nuevo id cuando cambia la selección.
 * - esRequerido: boolean opcional para marcar el campo como obligatorio.
 * - deshabilitado: boolean opcional para deshabilitar el control.
 * - etiqueta: texto opcional para la etiqueta del campo.
 */
const SelectorClienteProyecto = ({
  clientes = [],
  valorSeleccionado = '',
  onCambiarCliente = () => {},
  esRequerido = false,
  deshabilitado = false,
  etiqueta = 'Cliente asociado al proyecto',
}) => {
  // Filtro de búsqueda para reducir la lista de clientes.
  const [filtro, setFiltro] = React.useState('');

  const manejarCambioFiltro = (evento) => {
    setFiltro(evento.target.value);
  };

  const manejarCambio = (evento) => {
    const nuevoValor = evento.target.value;
    onCambiarCliente(nuevoValor);
  };

  const filtroMin = filtro.trim().toLowerCase();
  const clientesFiltrados = clientes.filter((cliente) => {
    if (!filtroMin) return true;
    const nombreCompleto =
      [cliente.firstName, cliente.lastName].filter(Boolean).join(' ') || '';
    const emailCliente = cliente.email || '';
    return (
      nombreCompleto.toLowerCase().includes(filtroMin) ||
      emailCliente.toLowerCase().includes(filtroMin)
    );
  });

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Etiqueta + icono */}
      <label className="flex items-center gap-2 text-xs font-medium text-pcm-text">
        <span className="inline-flex items-center justify-center rounded-full bg-pcm-primary/10 p-1.5">
          <UserRound className="w-3 h-3 text-pcm-primary" />
        </span>
        <span>{etiqueta}</span>
        {esRequerido && <span className="text-[10px] text-pcm-danger">*</span>}
      </label>

      {/* Campo para filtrar clientes */}
      <input
        type="text"
        value={filtro}
        onChange={manejarCambioFiltro}
        disabled={deshabilitado}
        className="w-full p-2 mb-1 rounded-xl bg-pcm-bg/60 border border-white/10 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60 text-xs text-pcm-text placeholder-pcm-muted/70"
        placeholder="Buscar cliente por nombre o correo..."
      />

      {/* Select con opción propia y clientes filtrados */}
      <select
        className="pcm-select w-full text-xs text-pcm-text"
        value={valorSeleccionado || ''}
        onChange={manejarCambio}
        required={esRequerido}
        disabled={deshabilitado}
      >
        <option value="">Selecciona un cliente...</option>
        <option value="propio">Proyecto propio (sin cliente)</option>
        {clientesFiltrados.map((cliente) => {
          const nombre =
            [cliente.firstName, cliente.lastName].filter(Boolean).join(' ') ||
            cliente.email ||
            'Cliente sin nombre';
          return (
            <option key={cliente._id} value={cliente._id}>
              {nombre}
              {cliente.email ? ` - ${cliente.email}` : ''}
            </option>
          );
        })}
      </select>

      <p className="text-[11px] text-pcm-muted">
        Selecciona el cliente para asociar las notificaciones y el acceso al
        historial. Si eliges "Proyecto propio", no se asociará ningún cliente.
      </p>
    </div>
  );
};

// Exporta el componente por defecto.
export default SelectorClienteProyecto;
