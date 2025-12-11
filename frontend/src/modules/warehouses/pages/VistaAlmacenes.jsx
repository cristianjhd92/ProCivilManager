// File: frontend/src/modules/warehouses/pages/VistaAlmacenes.jsx              // Ruta del archivo dentro del módulo de almacenes.
// Description: Vista para la gestión de almacenes en ProCivil Manager (PCM).  // Descripción: lista, filtra y administra almacenes.
//              Permite listar, filtrar, crear, editar y eliminar almacenes.   // Explica que solo el rol "admin" puede crear/editar/eliminar.
//              Solo el rol "admin" puede modificar; otros roles ven la        // Indica que otros roles ven la información en solo lectura.
//              información en modo solo lectura. Integra el tema visual PCM   // Señala que se usan paleta `pcm`, animaciones globales y roles.
//              (paleta `pcm`) y animaciones centralizadas de Tailwind,        // Aclara que no se usan estilos locales <style> y se respeta el tema.
//              adaptando el panel principal al rol del usuario en el          // Resalta la adaptación de colores por rol en el workspace interno.
//              workspace interno (admin, líder de obra, cliente, auditor).    // Especifica los roles clave contemplados.

// =========================
//   Importaciones básicas
// =========================
import React, { useState, useEffect, useMemo } from 'react';                  // Importa React y los hooks de estado, efecto y memoización.
import {                                                                     // Importa íconos desde lucide-react para enriquecer la interfaz.
  Search,                                                                    // Ícono de lupa para el buscador.
  Warehouse,                                                                 // Ícono de almacén para cabecera y filas.
  Phone,                                                                     // Ícono de teléfono.
  MapPin,                                                                    // Ícono de ubicación.
  User,                                                                      // Ícono de usuario/encargado.
  Plus,                                                                      // Ícono de suma para "Nuevo almacén".
  X,                                                                         // Ícono de cierre para el toast.
  Loader,                                                                    // Ícono de cargando (spinner).
  CheckCircle,                                                               // Ícono de éxito.
  AlertCircle,                                                               // Ícono de advertencia.
  XCircle,                                                                   // Ícono de error.
  Info,                                                                      // Ícono de información.
  Eye,                                                                       // Ícono de ojo para el botón de detalle.
} from 'lucide-react';

// =========================
//   Servicios de API
// =========================

// Importa los servicios desde la capa centralizada de API PCM.
import {
  crearAlmacen,                                                             // Crea un almacén nuevo en el backend.
  actualizarAlmacen,                                                        // Actualiza un almacén existente en el backend.
  eliminarAlmacen,                                                          // Elimina un almacén en el backend.
} from '../../../services/api/api.js';                                      // Ruta al archivo de servicios (extensión explícita).

// =========================
//   Modales reutilizables
// =========================
import ModalCrearEditarAlmacen from '../modals/ModalCrearEditarAlmacen';    // Modal para crear/editar un almacén.
import ModalEliminarAlmacen from '../modals/ModalEliminarAlmacen';          // Modal de confirmación para eliminar un almacén.
import ModalDetalleAlmacen from '../modals/ModalDetalleAlmacen';            // Modal de detalle de almacén.

// ---------------------------------------------------------------------
//   Componente de notificación tipo "toast"
// ---------------------------------------------------------------------
const Toast = ({ message, type, onClose }) => {                             // Componente que muestra un mensaje flotante en una esquina.
  // Íconos según el tipo de mensaje (éxito, error, advertencia, info).
  const icons = {                                                           // Mapa de tipo → ícono JSX.
    success: <CheckCircle size={20} />,                                     // Éxito: círculo con check.
    error: <XCircle size={20} />,                                           // Error: círculo con X.
    warning: <AlertCircle size={20} />,                                     // Advertencia: signo de exclamación.
    info: <Info size={20} />,                                               // Información: ícono de info.
  };

  // Estilos de fondo/borde según tipo de mensaje (colores vivos + tema PCM).
  const styles = {                                                          // Mapa de tipo → clases Tailwind.
    success: 'bg-emerald-600/95 border-emerald-400/80',                     // Éxito: verde intenso.
    error: 'bg-red-600/95 border-red-400/80',                               // Error: rojo intenso.
    warning: 'bg-amber-600/95 border-amber-400/80',                         // Advertencia: ámbar intenso.
    info: 'bg-pcm-surfaceSoft/95 border-pcm-primary/70',                    // Info: superficie PCM y borde color primario.
  };

  // Auto-cierre del toast después de 4 segundos.
  useEffect(() => {                                                         // Efecto que programa el cierre automático del toast.
    const timer = setTimeout(onClose, 4000);                                // Después de 4000 ms llama a onClose.
    return () => clearTimeout(timer);                                       // Limpia el timer al desmontar el componente.
  }, [onClose]);                                                            // Se vuelve a crear si cambia la función onClose.

  return (
    <div
      className={`${styles[type] || styles.info} border-2 rounded-xl shadow-pcm-soft
                  p-4 flex items-start gap-3 min-w-[280px] max-w-md
                  animate-slide-in-down`}                                   // Aplica animación global de entrada desde arriba.
    >
      {/* Ícono según el tipo de toast */}
      <div className="text-white mt-0.5">                                   {/* Contenedor del ícono con pequeño margen superior. */}
        {icons[type] || icons.info}                                         {/* Renderiza el ícono correspondiente o info por defecto. */}
      </div>

      {/* Texto del mensaje principal del toast */}
      <div className="flex-1">                                              {/* Zona de texto que ocupa todo el espacio disponible. */}
        <p className="text-white font-semibold text-sm leading-relaxed">
          {message}                                                         {/* Mensaje recibido por props. */}
        </p>
      </div>

      {/* Botón para cerrar manualmente el toast */}
      <button
        onClick={onClose}                                                   // Al hacer clic, se cierra el toast inmediatamente.
        className="text-white/80 hover:text-white transition duration-150"
        // Usa transición estándar con duración (evita transition-colors por compatibilidad con Tailwind v4/PCM).
      >
        <X size={18} />                                                     {/* Ícono de X pequeño para cerrar. */}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------
//   Helper para clases de panel según el rol del usuario
// ---------------------------------------------------------------------

/**
 * Recibe el rol del usuario actual en el workspace y devuelve las clases
 * base del panel junto con la variante específica por rol, reutilizando
 * las clases globales:
 *
 *  - .pcm-panel
 *  - .pcm-panel-fondo
 *  - .pcm-panel--admin / --lider / --cliente / --auditor
 */
const obtenerClasesPanelPorRol = (rolUsuario) => {                          // Función auxiliar que calcula las clases del panel por rol.
  const rolNormalizado = (rolUsuario || '')                                 // Toma el valor recibido o cadena vacía.
    .toString()                                                             // Asegura que se trate como texto.
    .toLowerCase()                                                          // Pasa todo a minúsculas para comparación.
    .trim();                                                                // Elimina espacios al inicio y al final.

  // Caso: administrador.
  if (rolNormalizado.includes('admin')) {                                   // Si el rol incluye "admin"...
    return 'pcm-panel pcm-panel-fondo pcm-panel--admin';                    // Usa panel base y variante admin (azul).
  }

  // Caso: líder de obra (acepta variantes con y sin tilde).
  if (
    rolNormalizado.includes('lider de obra') ||                             // Variante sin tilde.
    rolNormalizado.includes('líder de obra') ||                             // Variante con tilde.
    rolNormalizado.includes('lider')                                        // Variante abreviada.
  ) {
    return 'pcm-panel pcm-panel-fondo pcm-panel--lider';                    // Usa variante para líderes de obra (naranja).
  }

  // Caso: cliente.
  if (rolNormalizado.includes('cliente')) {                                 // Si el rol contiene "cliente"...
    return 'pcm-panel pcm-panel-fondo pcm-panel--cliente';                  // Usa variante de cliente (verde).
  }

  // Caso: auditor.
  if (rolNormalizado.includes('auditor')) {                                 // Si el rol contiene "auditor"...
    return 'pcm-panel pcm-panel-fondo pcm-panel--auditor';                  // Usa variante de auditor (morado).
  }

  // Caso por defecto: rol no identificado claramente.
  return 'pcm-panel pcm-panel-fondo';                                       // Usa solo el panel base + fondo PCM.
};

// ---------------------------------------------------------------------
//   Componente principal: VistaAlmacenes
// ---------------------------------------------------------------------
const VistaAlmacenes = ({
  almacenes = [],                                                           // Lista de almacenes recibida como prop (por defecto arreglo vacío).
  loading = false,                                                          // Flag de carga recibido desde el dashboard.
  onReload,                                                                 // Callback opcional para recargar datos globales.
}) => {                                                                     // Componente principal de gestión de almacenes.
  // =========================
  //   Estados principales
  // =========================
  const [searchTerm, setSearchTerm] = useState('');                         // Texto de búsqueda para filtrar la tabla.
  const [showModal, setShowModal] = useState(false);                        // Control del modal de creación/edición.
  const [editingAlmacen, setEditingAlmacen] = useState(null);               // Almacén en edición; null cuando se crea uno nuevo.

  // Estado para el modal de detalle de almacén
  const [almacenDetalle, setAlmacenDetalle] = useState(null);

  // Estado del formulario para crear/editar un almacén.
  // Incluye campos adicionales para ciudad y país, y separa nombres y apellidos del encargado
  const [formData, setFormData] = useState({
    nombre: '',            // Nombre del almacén
    ciudad: '',            // Ciudad donde se encuentra el almacén
    pais: 'Colombia',      // País del almacén (por defecto Colombia)
    direccion: '',         // Dirección física
    telefono: '',          // Teléfono de contacto
    encargadoNombre: '',   // Nombres del encargado
    encargadoApellido: '', // Apellidos del encargado
  });

  const [toasts, setToasts] = useState([]);                                 // Lista de toasts activos { id, message, type }.
  const [deleteTarget, setDeleteTarget] = useState(null);                   // Almacén que se quiere eliminar.
  const [userRole, setUserRole] = useState('');                             // Rol del usuario autenticado (admin, líder, cliente, etc.).

  // =========================
  //   Notificaciones (toasts)
  // =========================
  const showToast = (message, type = 'info') => {                           // Muestra un nuevo toast en pantalla.
    const id = Date.now();                                                  // Usa timestamp como ID único simple.
    setToasts((prev) => [...prev, { id, message, type }]);                  // Agrega el nuevo toast a la lista.
  };

  const removeToast = (id) => {                                             // Elimina un toast específico por ID.
    setToasts((prev) => prev.filter((toast) => toast.id !== id));           // Filtra la lista removiendo el seleccionado.
  };

  // =========================
  //   Efectos iniciales
  // =========================
  useEffect(() => {                                                         // Efecto para leer el rol del usuario desde localStorage.
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');  // Intenta leer el usuario guardado.
      setUserRole(storedUser.role || '');                                   // Guarda el rol, o cadena vacía si no existe.
    } catch (err) {
      console.error('Error al leer usuario desde localStorage:', err);      // Log de error en consola.
      setUserRole('');                                                      // Deja rol vacío si algo falla.
    }
  }, []);                                                                   // Solo se ejecuta al montar el componente.

  // =========================
  //   Handlers de acciones
  // =========================
  const triggerReload = async () => {                                       // Utilidad para recargar datos desde el Dashboard.
    if (typeof onReload === 'function') {                                   // Verifica que onReload sea una función.
      try {
        await onReload();                                                   // Invoca la recarga global.
      } catch (err) {
        console.error('Error al recargar datos desde VistaAlmacenes:', err); // Log de error.
        showToast(
          'Se guardó el cambio, pero hubo un problema al recargar los datos.',
          'warning',
        );                                                                  // Notifica al usuario un problema al recargar.
      }
    }
  };

  const handleCreate = () => {                                              // Abrir modal para crear un nuevo almacén.
    if (userRole !== 'admin') {                                             // Solo admin puede crear.
      showToast('No tienes permisos para crear almacenes', 'warning');
      return;                                                               // Sale sin abrir el modal.
    }

    setEditingAlmacen(null);                                                // Modo creación (sin almacén en edición).
    setFormData({
      nombre: '',
      ciudad: '',
      pais: 'Colombia',
      direccion: '',
      telefono: '',
      encargadoNombre: '',
      encargadoApellido: '',
    });
    setShowModal(true);                                                     // Abre el modal de creación/edición.
  };

  const handleEdit = (almacen) => {                                         // Abrir modal para editar un almacén existente.
    if (userRole !== 'admin') {                                             // Solo admin puede editar.
      showToast('No tienes permisos para editar almacenes', 'warning');
      return;                                                               // No permite abrir el modal.
    }

    setEditingAlmacen(almacen);                                             // Almacén actual en edición.
    // Separa el nombre completo del encargado en nombres y apellidos
    const fullName = almacen.encargado || '';
    const [encNombre, ...encApellidos] = fullName.trim().split(' ');
    const apellidos = encApellidos.join(' ');
    setFormData({
      nombre: almacen.nombre || '',
      ciudad: almacen.ciudad || '',
      pais: almacen.pais || 'Colombia',
      direccion: almacen.direccion || '',
      telefono: almacen.telefono || '',
      encargadoNombre: encNombre || '',
      encargadoApellido: apellidos || '',
    });
    setShowModal(true);                                                     // Abre el modal.
  };

  const handleDelete = async (id) => {                                      // Eliminar un almacén (después de confirmar en modal).
    if (userRole !== 'admin') {                                             // Seguridad extra: solo admin.
      showToast('No tienes permisos para eliminar almacenes', 'warning');
      return;                                                               // No ejecuta eliminación.
    }

    try {
      await eliminarAlmacen(id);                                            // Llama al servicio de eliminación.
      await triggerReload();                                                // Recarga datos globales.
      showToast('Almacén eliminado exitosamente', 'success');               // Notifica éxito.
    } catch (err) {
      console.error('Error al eliminar almacén:', err);                     // Log de error.
      // Muestra el mensaje específico retornado por el backend si existe
      const mensaje = err?.message || 'Error al eliminar el almacén';
      showToast(mensaje, 'error');                                          // Notifica error con detalle.
    } finally {
      setDeleteTarget(null);                                                // Cierra el modal de confirmación.
    }
  };

  const handleSubmit = async (evento) => {                                  // Guardar cambios (crear o actualizar).
    if (evento && evento.preventDefault) {                                  // Si viene del submit del form.
      evento.preventDefault();                                              // Evita recarga de página.
    }

    if (!formData.nombre.trim()) {                                          // Valida que el nombre no esté vacío.
      showToast('El nombre es obligatorio', 'warning');
      return;                                                               // No intenta guardar.
    }

    if (userRole !== 'admin') {                                             // Solo admin puede guardar cambios.
      showToast(
        'No tienes permisos para guardar cambios en almacenes',
        'warning',
      );
      return;                                                               // Corta la ejecución.
    }

    try {
      // Construye el payload normalizado para enviar al backend.
      const payload = {
        nombre: formData.nombre?.trim(),
        ciudad: formData.ciudad?.trim(),
        pais: (formData.pais || 'Colombia')?.trim(),
        direccion: formData.direccion?.trim() || undefined,
        telefono: formData.telefono?.trim() || undefined,
        encargado: `${formData.encargadoNombre?.trim() || ''} ${formData.encargadoApellido?.trim() || ''}`.trim(),
      };

      if (editingAlmacen) {
        await actualizarAlmacen(editingAlmacen._id, payload);
      } else {
        await crearAlmacen(payload);
      }

      await triggerReload();                                                // Recarga la lista actualizada.
      setShowModal(false);                                                  // Cierra el modal.
      showToast(
        editingAlmacen
          ? 'Almacén actualizado exitosamente'                              // Mensaje para actualización.
          : 'Almacén creado exitosamente',                                  // Mensaje para creación.
        'success',
      );
    } catch (err) {
      console.error('Error al guardar almacén:', err);                      // Log de error.
      showToast('Error al guardar el almacén', 'error');                    // Notifica error.
    }
  };

  // Abrir modal de detalle para ver información del almacén y su inventario
  const handleViewDetail = (almacen) => {
    // Guardamos el almacén seleccionado y abrimos el modal de detalle
    setAlmacenDetalle(almacen);
  };

  // =========================
  //   Filtro de tabla
  // =========================
  const filteredAlmacenes = useMemo(() => {                                 // Calcula almacenes filtrados según el término de búsqueda.
    if (!Array.isArray(almacenes)) return [];                               // Seguridad ante valores inesperados.

    const term = searchTerm.toLowerCase();                                  // Normaliza el término a minúsculas.

    return almacenes.filter((almacen) => {                                  // Filtra por nombre, dirección o encargado.
      const matchesSearch =
        almacen.nombre?.toLowerCase().includes(term) ||
        almacen.direccion?.toLowerCase().includes(term) ||
        almacen.encargado?.toLowerCase().includes(term);                    // Verifica coincidencia parcial.

      return matchesSearch;                                                 // Solo mantiene los que coinciden con el filtro.
    });
  }, [almacenes, searchTerm]);                                              // Se recalcula al cambiar lista o término.

  // =========================
  //   Estado de carga
  // =========================
  if (loading) {                                                            // Si el Dashboard aún está cargando datos.
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-pcm-primary" size={48} />      {/* Spinner grande con color de marca PCM. */}
      </div>
    );
  }

  // =========================
  //   Render principal
  // =========================
  return (
    <>
      {/* Contenedor de notificaciones toast (esquina superior derecha) */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {/* Zona donde se apilan los toasts */}
        {toasts.map((toast) => (                                            // Recorre cada toast activo.
          <Toast
            key={toast.id}                                                  // Usa el id del toast como clave.
            message={toast.message}                                         // Mensaje a mostrar.
            type={toast.type}                                               // Tipo visual (success/error/warning/info).
            onClose={() => removeToast(toast.id)}                           // Cierra el toast correspondiente.
          />
        ))}
      </div>

      {/* Tarjeta principal con fondo del tema PCM y adaptación por rol */}
      <div
        className={`
          ${obtenerClasesPanelPorRol(userRole)}
          bg-pcm-surfaceSoft/80
          backdrop-blur-sm
          rounded-pcm-xl
          border border-white/10
          shadow-pcm-soft
        `}
      >
        {/* Encabezado de la vista: título, botón nuevo y buscador */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4 gap-4">
            {/* Título con ícono de almacén */}
            <div className="flex items-center gap-3">
              <Warehouse className="text-pcm-primary" size={28} />          {/* Ícono principal de almacén en color PCM. */}
              <h3 className="text-xl font-semibold text-pcm-text">
                Gestión de Almacenes                                        {/* Título de la sección. */}
              </h3>
            </div>

            {/* Botón "Nuevo Almacén": SOLO visible para el rol admin */}
            {userRole === 'admin' && (                                       // Solo renderiza el botón si el usuario es admin.
              <button
                onClick={handleCreate}                                       // Abre el modal en modo creación.
                className="pcm-btn-primary flex items-center gap-2 px-4 py-2
                           rounded-xl font-semibold hover:scale-105
                           transition duration-150"
                // Usa helper global PCM para botón principal y añade ligera escala en hover.
              >
                <Plus size={20} />                                           {/* Ícono de suma. */}
                <span>Nuevo almacén</span>                                   {/* Texto del botón. */}
              </button>
            )}
          </div>

          {/* Buscador por nombre, dirección o encargado */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-pcm-muted"
                size={20}
              />
              <input
                type="text"                                                 // Campo de texto para buscar.
                placeholder="Buscar por nombre, dirección o encargado..."
                value={searchTerm}                                          // Valor del estado de búsqueda.
                onChange={(e) => setSearchTerm(e.target.value)}             // Actualiza el estado al teclear.
                className="w-full pl-10 pr-4 py-2
                           bg-pcm-bg/70 border border-white/10
                           rounded-lg text-sm text-pcm-text
                           placeholder:text-pcm-muted
                           focus:outline-none focus:ring-2 focus:ring-pcm-primary/70"
              />
            </div>
          </div>

          {/* Resumen de conteo: cuántos se muestran vs total */}
          <div className="mt-3 text-xs text-pcm-muted">
            Mostrando {filteredAlmacenes.length} de {almacenes.length} almacenes
            {/* Muestra cuántos almacenes coinciden con el filtro. */}
          </div>
        </div>

        {/* Tabla de almacenes */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-pcm-bg/80">
                <th className="text-left p-4 text-xs font-semibold text-pcm-muted tracking-wide">
                  Nombre
                </th>
                <th className="text-left p-4 text-xs font-semibold text-pcm-muted tracking-wide">
                  Dirección
                </th>
                <th className="text-left p-4 text-xs font-semibold text-pcm-muted tracking-wide">
                  Ciudad
                </th>
                <th className="text-left p-4 text-xs font-semibold text-pcm-muted tracking-wide">
                  País
                </th>
                <th className="text-left p-4 text-xs font-semibold text-pcm-muted tracking-wide">
                  Teléfono
                </th>
                <th className="text-left p-4 text-xs font-semibold text-pcm-muted tracking-wide">
                  Encargado
                </th>
                <th className="text-left p-4 text-xs font-semibold text-pcm-muted tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAlmacenes.length > 0 ? (                            // Si hay almacenes luego del filtro.
                filteredAlmacenes.map((almacen) => (                       // Recorre y pinta cada almacén en una fila.
                  <tr
                    key={almacen._id}                                      // Usa el _id del almacén como key.
                    className="border-b border-white/10 hover:bg-pcm-surfaceSoft/70 transition duration-150"
                    // Fila con hover suave usando transición estándar.
                  >
                    {/* Columna: nombre con ícono */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Warehouse className="text-pcm-primary" size={18} />
                        <span className="text-pcm-text font-semibold text-sm">
                          {almacen.nombre}                                  {/* Nombre del almacén. */}
                        </span>
                      </div>
                    </td>

                    {/* Columna: dirección */}
                    <td className="p-4 text-sm text-pcm-text">
                      <div className="flex items-center gap-2">
                        <MapPin className="text-pcm-muted" size={16} />
                        <span>{almacen.direccion || 'No especificada'}</span>
                      </div>
                    </td>

                    {/* Columna: ciudad */}
                    <td className="p-4 text-sm text-pcm-text">
                      {almacen.ciudad || '-'}
                    </td>

                    {/* Columna: país */}
                    <td className="p-4 text-sm text-pcm-text">
                      {almacen.pais || '-'}
                    </td>

                    {/* Columna: teléfono */}
                    <td className="p-4 text-sm text-pcm-text">
                      <div className="flex items-center gap-2">
                        <Phone className="text-pcm-muted" size={16} />
                        <span>{almacen.telefono || 'No especificado'}</span>
                      </div>
                    </td>

                    {/* Columna: encargado */}
                    <td className="p-4 text-sm text-pcm-text">
                      <div className="flex items-center gap-2">
                        <User className="text-pcm-muted" size={16} />
                        <span>{almacen.encargado || 'No asignado'}</span>
                      </div>
                    </td>

                    {/* Columna: acciones */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Botón para ver detalle disponible para admin y líder */}
                        {(userRole === 'admin' || userRole.includes('lider')) && (
                          <button
                            onClick={() => handleViewDetail(almacen)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-pcm-borderSoft hover:bg-black/60 transition"
                            title="Ver detalle"
                          >
                            <Eye size={16} className="text-pcm-text" />
                          </button>
                        )}
                        {userRole === 'admin' && (
                          <>
                            <button
                              onClick={() => handleEdit(almacen)}
                              className="pcm-btn-primary px-3 py-1.5 text-xs sm:text-sm font-medium"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setDeleteTarget(almacen)}
                              className="pcm-btn-danger px-3 py-1.5 text-xs sm:text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                        {userRole !== 'admin' && !userRole.includes('lider') && (
                          <span className="text-xs text-pcm-muted">Solo lectura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // Fila de mensaje cuando no hay resultados.
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-pcm-muted">
                    {almacenes.length === 0
                      ? 'No hay almacenes registrados. Crea uno nuevo para comenzar.'
                      : 'No se encontraron almacenes con los filtros seleccionados'}
                    {/* Mensaje distinto según si la lista está vacía o solo el filtro no encuentra coincidencias. */}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de crear/editar almacén (usa los props en español de ModalCrearEditarAlmacen) */}
      <ModalCrearEditarAlmacen
        estaAbierto={showModal}                                             // Controla visibilidad del modal.
        alCerrar={() => setShowModal(false)}                                // Cierra el modal al hacer clic en cancelar/cerrar.
        alEnviar={handleSubmit}                                             // Maneja el submit del formulario.
        datosAlmacen={formData}                                             // Datos actuales del formulario.
        actualizarDatosAlmacen={setFormData}                                // Setter para actualizar campos desde el modal.
        almacenEnEdicion={editingAlmacen}                                   // Almacén en edición (null si es creación).
      />

      {/* Modal de confirmación de eliminación */}
      <ModalEliminarAlmacen
        estaAbierto={!!deleteTarget}                                        // Abierto solo si hay un almacén objetivo.
        almacen={deleteTarget}                                              // Almacén que se quiere eliminar.
        alCancelar={() => setDeleteTarget(null)}                            // Cierra el modal sin eliminar.
        alConfirmar={() => {                                                // Acción de confirmación.
          if (deleteTarget) {                                               // Verifica que exista un target válido.
            handleDelete(deleteTarget._id);                                 // Llama a la función de borrado con su ID.
          }
        }}
        rolUsuario={userRole}                                               // Pasa el rol al modal para adaptar el color del panel.
      />

      {/* Modal de detalle del almacén */}
      {almacenDetalle && (
        <ModalDetalleAlmacen
          almacen={almacenDetalle}
          onClose={() => setAlmacenDetalle(null)}
          rolUsuario={userRole}
        />
      )}
    </>
  );
};

// Exporta el componente para usarlo en el Dashboard/Admin.
export default VistaAlmacenes;                                              // Exportación por defecto de la vista de almacenes.
