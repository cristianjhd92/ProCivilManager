// File: frontend/src/modules/users/pages/VistaUsuarios.jsx                     // Ruta del archivo dentro del módulo de usuarios.
// Description: Vista de administración de usuarios dentro del panel de         // Descripción: administra usuarios (listar, filtrar, editar y eliminar).
//              administración de ProCivil Manager (PCM). Permite buscar,       // Explica que permite búsquedas y filtros por rol interno.
//              filtrar por rol (admin, líder de obra, cliente, auditor) y      // Indica los roles soportados para el filtro.
//              ejecutar acciones de edición y eliminación, mostrando tabla      // Señala que hay tabla para escritorio y tarjetas para móvil.
//              en escritorio y tarjetas en móvil, integrándose con el tema     // Indica que sigue el tema visual PCM y adapta colores según rol.
//              visual PCM y adaptando colores al rol del usuario actual.       // Menciona la regla de colores por rol dentro del workspace.

import React, { useState, useMemo } from 'react';                               // Importa React y los hooks useState/useMemo para estado y valores derivados.

// Importa íconos desde lucide-react que se usan en la interfaz de la vista.
import {
  Search,                                                                      // Ícono de lupa para el buscador.
  Filter,                                                                      // Ícono de filtro para el dropdown de roles.
  Edit,                                                                        // Ícono de lápiz para acción "Editar".
  Trash2,                                                                      // Ícono de papelera para acción "Eliminar".
  User,                                                                        // Ícono de usuario para estados vacíos/avatares.
  ChevronDown,                                                                 // Ícono de flecha hacia abajo para el dropdown de roles.
} from 'lucide-react';                                                         // Biblioteca de íconos basada en SVG.

// =========================
// Constantes y helpers
// =========================

// Arreglo con las opciones disponibles para el filtro de roles.
const OPCIONES_ROL = [                                                         // Define las opciones del filtro de rol.
  { value: 'todos', valueLabel: 'Todos los roles' },                           // Opción que muestra todos los usuarios sin filtrar por rol.
  { value: 'admin', valueLabel: 'Administrador' },                             // Opción para rol administrador.
  { value: 'lider de obra', valueLabel: 'Líder de obra' },                     // Opción para rol líder de obra.
  { value: 'cliente', valueLabel: 'Cliente' },                                 // Opción para rol cliente.
  { value: 'auditor', valueLabel: 'Auditor' },                                 // Opción para rol auditor.
];

// Devuelve las clases de Tailwind para el badge según el rol del usuario.
const obtenerClasesBadgeRol = (rol) => {                                       // Declara función auxiliar que recibe el rol del usuario.
  const rolNormalizado = (rol || '')                                           // Asegura que siempre se trabaje con cadena.
    .toString()                                                                // Convierte a string explícitamente.
    .toLowerCase()                                                             // Pasa a minúsculas.
    .trim();                                                                   // Elimina espacios extra.

  switch (rolNormalizado) {                                                    // Evalúa el rol normalizado para decidir el estilo.
    case 'admin':                                                              // Si el rol es "admin"...
      return 'bg-sky-500/15 text-sky-200 border-sky-500/40';                   // Usa tonos azules para administradores.

    case 'lider de obra':                                                      // Si el rol es "lider de obra" (sin tilde)...
    case 'líder de obra':                                                      // O si viene con tilde...
    case 'lider':                                                              // O abreviado simplemente como "lider"...
      return 'bg-orange-500/15 text-orange-200 border-orange-500/40';          // Usa tonos naranjas para líderes de obra.

    case 'cliente':                                                            // Si el rol es "cliente"...
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40';       // Usa tonos verdes para clientes.

    case 'auditor':                                                            // Si el rol es "auditor"...
      return 'bg-purple-500/15 text-purple-200 border-purple-500/40';          // Usa tonos morados para auditores.

    default:                                                                   // Para cualquier otro valor no contemplado...
      return 'bg-pcm-surfaceSoft/60 text-pcm-text border-white/15';            // Retorna un estilo neutro PCM como respaldo.
  }
};

/**
 * Helper para obtener clases visuales del panel según el rol del usuario actual.
 *
 * Recibe un rol (admin, líder de obra, cliente, auditor) y devuelve:
 *  - bordeTarjeta: clase Tailwind para el color del borde de la tarjeta principal.
 *  - chipRol: clases para un chip pequeño con el rol del usuario actual.
 *  - etiquetaRol: texto legible para mostrar en el chip (Administrador, Cliente, etc.).
 */
const obtenerClasesPanelPorRol = (rolUsuario) => {                             // Declara la función que calcula estilos a partir del rol.
  const rolNormalizado = (rolUsuario || '')                                    // Toma el rol recibido, con valor por defecto.
    .toString()                                                                // Lo convierte a cadena por seguridad.
    .toLowerCase()                                                             // Lo pasa a minúsculas para comparar de forma uniforme.
    .trim();                                                                   // Le quita espacios al inicio y final.

  // Caso: administrador.
  if (rolNormalizado.includes('admin')) {                                      // Si el rol contiene "admin"...
    return {                                                                   // Devuelve clases específicas para panel de administrador.
      bordeTarjeta: 'border-sky-500/40',                                       // Borde azul suave alrededor de la tarjeta.
      chipRol:
        'bg-sky-500/15 text-sky-200 border border-sky-500/40',                 // Chip azul con borde y texto claros.
      etiquetaRol: 'Administrador',                                            // Texto legible a mostrar en el chip.
    };
  }

  // Caso: líder de obra.
  if (
    rolNormalizado.includes('lider de obra') ||                                // Forma sin tilde.
    rolNormalizado.includes('líder de obra') ||                                // Forma con tilde.
    rolNormalizado.includes('lider')                                           // Forma abreviada "lider".
  ) {
    return {                                                                   // Devuelve clases para panel de líder de obra.
      bordeTarjeta: 'border-orange-500/40',                                    // Borde naranja suave.
      chipRol:
        'bg-orange-500/15 text-orange-200 border border-orange-500/40',        // Chip naranja con borde y texto claros.
      etiquetaRol: 'Líder de obra',                                            // Texto legible para el chip.
    };
  }

  // Caso: cliente.
  if (rolNormalizado.includes('cliente')) {                                    // Si el rol contiene "cliente"...
    return {                                                                   // Devuelve clases para panel de cliente.
      bordeTarjeta: 'border-emerald-500/40',                                   // Borde verde suave.
      chipRol:
        'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40',     // Chip verde con borde verde.
      etiquetaRol: 'Cliente',                                                  // Texto legible "Cliente".
    };
  }

  // Caso: auditor.
  if (rolNormalizado.includes('auditor')) {                                    // Si el rol contiene "auditor"...
    return {                                                                   // Devuelve clases para panel de auditor.
      bordeTarjeta: 'border-purple-500/40',                                    // Borde morado suave.
      chipRol:
        'bg-purple-500/15 text-purple-200 border border-purple-500/40',        // Chip morado con borde morado.
      etiquetaRol: 'Auditor',                                                  // Texto legible "Auditor".
    };
  }

  // Caso por defecto: rol no identificado o no enviado.
  return {                                                                     // Devuelve un estilo por defecto usando el color primario PCM.
    bordeTarjeta: 'border-pcm-primary/40',                                     // Borde usando el color primario PCM.
    chipRol:
      'bg-pcm-primary/15 text-pcm-primary border border-pcm-primary/60',       // Chip con fondo y texto primario PCM.
    etiquetaRol: 'Usuario',                                                    // Etiqueta genérica.
  };
};

// =========================
// Componente principal VistaUsuarios
// =========================

/**
 * Componente VistaUsuarios
 *
 * Props:
 *  - users:         arreglo de usuarios que viene desde el componente padre (Dashboard). // Lista de usuarios a mostrar.
 *  - onEditUser:    función que se ejecuta al hacer clic en "Editar" para un usuario.    // Notificación al padre para abrir modal de edición.
 *  - onDeleteUser:  función que se ejecuta al hacer clic en "Eliminar" para un usuario.  // Notificación al padre para abrir modal de eliminación.
 *  - rolUsuario:    rol actual del usuario que está usando el panel (admin, líder,      // Se usa para adaptar colores del panel según la regla de roles.
 *                   cliente, auditor).                                                  //
 */
const VistaUsuarios = ({
  users: usuarios = [],                                                         // Alias users → usuarios para usar nombres en español internamente.
  onEditUser: onEditarUsuario,                                                 // Alias onEditUser → onEditarUsuario.
  onDeleteUser: onEliminarUsuario,                                             // Alias onDeleteUser → onEliminarUsuario.
  rolUsuario = 'admin',                                                        // rolUsuario con valor por defecto "admin".
}) => {
  // Calcula las clases visuales del panel según el rol del usuario actual.
  const estilosRolPanel = obtenerClasesPanelPorRol(rolUsuario);                // Llama al helper para obtener bordeTarjeta, chipRol y etiquetaRol.

  // Estado para el término de búsqueda (nombre, apellido o correo).
  const [terminoBusqueda, setTerminoBusqueda] = useState('');                  // Inicializa la búsqueda como cadena vacía.

  // Estado para el filtro de rol (todos/admin/lider de obra/cliente/auditor).
  const [filtroRol, setFiltroRol] = useState('todos');                         // Por defecto se muestran todos los roles.

  // Estado para controlar si el dropdown de roles está abierto o cerrado.
  const [menuRolAbierto, setMenuRolAbierto] = useState(false);                 // false = cerrado, true = abierto.

  // Obtiene la etiqueta legible del rol seleccionado a partir de OPCIONES_ROL.
  const etiquetaRolActual =
    OPCIONES_ROL.find((opcion) => opcion.value === filtroRol)?.valueLabel ||   // Busca en OPCIONES_ROL la opción cuyo value coincide con filtroRol.
    'Todos los roles';                                                         // Si no encuentra coincidencia, usa "Todos los roles" como valor por defecto.

  // Lista de usuarios filtrados en función de la búsqueda y el rol seleccionado.
  const usuariosFiltrados = useMemo(() => {                                    // useMemo evita recalcular filtros innecesariamente cuando nada cambia.
    const busquedaNormalizada = terminoBusqueda.toLowerCase();                 // Convierte el término de búsqueda a minúsculas.

    const usuariosBase = Array.isArray(usuarios) ? usuarios : [];              // Asegura que siempre se trabaje con un arreglo (defensivo).

    // Aplica filtros sobre el arreglo base de usuarios.
    return usuariosBase.filter((usuario) => {                                  // Filtra cada usuario en función de búsqueda y rol.
      // Normaliza campos de texto a minúsculas para comparar.
      const nombre = (usuario.firstName || '').toLowerCase();                  // Normaliza nombre.
      const apellido = (usuario.lastName || '').toLowerCase();                 // Normaliza apellido.
      const correo = (usuario.email || '').toLowerCase();                      // Normaliza correo electrónico.

      // Determina si el usuario coincide con el texto de búsqueda.
      const coincideBusqueda =
        !busquedaNormalizada ||                                                // Si no hay texto de búsqueda, siempre coincide.
        nombre.includes(busquedaNormalizada) ||                                // Coincidencia parcial en nombre.
        apellido.includes(busquedaNormalizada) ||                              // Coincidencia parcial en apellido.
        correo.includes(busquedaNormalizada);                                  // Coincidencia parcial en correo.

      // Normaliza el rol del usuario para comparar de forma robusta.
      const rolUsuarioNormalizado = (usuario.role || '')                       // Toma el rol que llega desde backend.
        .toString()                                                            // Lo convierte a cadena.
        .toLowerCase()                                                         // Lo pasa a minúsculas.
        .trim();                                                               // Elimina espacios extra.

      // Determina si el usuario coincide con el rol seleccionado.
      const coincideRol =
        filtroRol === 'todos' ||                                               // Si el filtro es "todos", acepta todos los roles.
        rolUsuarioNormalizado === filtroRol;                                   // De lo contrario, compara contra el rol normalizado.

      // El usuario se incluye si cumple ambas condiciones.
      return coincideBusqueda && coincideRol;                                  // Retorna true solo si coincide búsqueda y rol.
    });
  }, [usuarios, terminoBusqueda, filtroRol]);                                  // Se recalcula cuando cambian usuarios, término de búsqueda o filtro de rol.

  // Maneja la selección de un rol en el dropdown.
  const manejarSeleccionRol = (valorRol) => {                                  // Función que se ejecuta al hacer clic en una opción del menú.
    setFiltroRol(valorRol);                                                    // Actualiza el rol filtrado.
    setMenuRolAbierto(false);                                                  // Cierra el menú desplegable.
  };

  // =========================
  // Render del componente
  // =========================
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in-soft">              {/* Contenedor principal con separación vertical y animación suave de entrada. */}
      {/* El título grande "Usuarios" lo pinta el layout general.
          Aquí solo mostramos una descripción breve bajo el título. */}
      <p className="text-sm text-pcm-muted max-w-2xl">
        Administra los usuarios del sistema, aplica filtros por rol y ejecuta
        acciones de edición o eliminación cuando sea necesario.
      </p>

      {/* Tarjeta principal que contiene filtros, tabla y lista móvil.
          El borde se adapta dinámicamente según el rol del usuario actual. */}
      <div
        className={`
          bg-pcm-surfaceSoft/80 backdrop-blur-sm rounded-pcm-xl
          border shadow-pcm-soft overflow-hidden animate-slide-up-soft
          ${estilosRolPanel.bordeTarjeta}
        `}
      >
        {/* Encabezado de la tarjeta con título interno, chip de rol y controles de filtro/búsqueda */}
        <div className="p-4 sm:p-6 border-b border-white/10">
          {/* Sección superior: título + chip de rol actual y descripción corta */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Título interno, chip de rol actual y descripción corta */}
            <div className="space-y-1">
              {/* Línea con título y chip de rol (solo visible desde sm hacia arriba para no recargar en móvil) */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-pcm-text">
                  Administración de usuarios
                </h3>
                <span
                  className={`
                    hidden sm:inline-flex px-2 py-0.5 rounded-full
                    text-[10px] font-semibold uppercase tracking-wide
                    ${estilosRolPanel.chipRol}
                  `}
                >
                  {estilosRolPanel.etiquetaRol}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-pcm-muted">
                Consulta el listado de usuarios registrados y ajusta sus roles o estado
                según corresponda.
              </p>
            </div>

            {/* Controles: buscador por texto + dropdown custom de roles */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              {/* Buscador por nombre, apellido o email */}
              <div
                className="flex items-center gap-2 bg-pcm-surface/90 border border-white/10
                           rounded-xl px-3 py-2 w-full sm:w-64"
              >
                <Search
                  size={16}                                                    // Tamaño del ícono de búsqueda.
                  className="text-pcm-muted shrink-0"                          // Color atenuado y evita que el ícono se comprima.
                />
                <input
                  type="text"                                                  // Tipo de input texto.
                  value={terminoBusqueda}                                      // Valor controlado desde el estado terminoBusqueda.
                  onChange={(e) => setTerminoBusqueda(e.target.value)}         // Actualiza el término de búsqueda en cada cambio.
                  placeholder="Buscar por nombre o email..."
                  className="flex-1 bg-transparent outline-none text-xs sm:text-sm
                             text-pcm-text placeholder-pcm-muted/70"
                />
              </div>

              {/* Dropdown personalizado para el filtro de roles */}
              <div className="relative w-full sm:w-auto">
                {/* Botón que muestra el rol seleccionado y abre/cierra el menú */}
                <button
                  type="button"                                                // Evita comportamiento de submit en formularios.
                  onClick={() => setMenuRolAbierto((prev) => !prev)}           // Alterna el estado del menú (abierto/cerrado).
                  className="flex items-center justify-between gap-2 bg-pcm-surface/90
                             border border-white/10 rounded-xl px-3 py-2 w-full
                             text-xs sm:text-sm text-pcm-text hover:border-pcm-primary/60
                             transition duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Filter
                      size={16}                                                // Ícono de filtro a la izquierda.
                      className="text-pcm-muted shrink-0"                      // Evita que el ícono se comprima.
                    />
                    <span className="truncate">
                      {etiquetaRolActual}                                      {/* Muestra la etiqueta del rol actual. */}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}                                                  // Flecha indicadora de dropdown.
                    className={`text-pcm-muted transition-transform ${
                      menuRolAbierto ? 'rotate-180' : ''                       // Rota la flecha si el menú está abierto.
                    }`}
                  />
                </button>

                {/* Menú desplegable con las opciones de rol */}
                {menuRolAbierto && (                                           // Solo se muestra si menuRolAbierto es true.
                  <div
                    className="absolute right-0 mt-1 w-44 bg-pcm-surface border border-white/10
                               rounded-xl shadow-pcm-soft z-20 overflow-hidden"
                  >
                    {OPCIONES_ROL.map((opcion) => (                           // Recorre cada opción de rol disponible.
                      <button
                        key={opcion.value}                                    // Usa el value como clave única para React.
                        type="button"                                         // Botón simple, no de submit.
                        onClick={() => manejarSeleccionRol(opcion.value)}     // Cambia el filtro de rol al hacer clic.
                        className={`w-full px-3 py-2 text-left text-xs sm:text-sm
                                   flex items-center justify-between
                                   ${
                                     filtroRol === opcion.value
                                       ? 'bg-pcm-primary/15 text-pcm-primary' // Estilo cuando la opción está seleccionada.
                                       : 'bg-pcm-surface hover:bg-pcm-surfaceSoft text-pcm-text' // Estilo para opciones no seleccionadas.
                                   }`}
                      >
                        <span>{opcion.valueLabel}</span>                      {/* Muestra el texto de la opción. */}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contador de usuarios mostrados vs total */}
          <div className="mt-3 text-xs sm:text-sm text-pcm-muted">
            Mostrando{' '}
            <span className="font-semibold text-pcm-text">
              {usuariosFiltrados.length}                                      {/* Cantidad de usuarios que pasan los filtros. */}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-pcm-text">
              {Array.isArray(usuarios) ? usuarios.length : 0}                 {/* Total de usuarios recibidos desde el padre. */}
            </span>{' '}
            usuarios
          </div>
        </div>

        {/* =======================
            Vista de escritorio: tabla
           ======================= */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pcm-bg/60 border-b border-white/10">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-pcm-muted uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-pcm-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-pcm-muted uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-pcm-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length > 0 ? (                              // Si hay usuarios que mostrar...
                  usuariosFiltrados.map((usuario) => (                         // Recorre cada usuario filtrado.
                    <tr
                      key={usuario._id || usuario.id}                          // Usa _id o id como clave única para React.
                      className="border-b border-white/5 bg-pcm-surfaceSoft/30
                                 hover:bg-pcm-surfaceSoft/80 transition duration-200"
                    >
                      <td className="px-4 py-3 text-sm text-pcm-text font-medium">
                        {usuario.firstName} {usuario.lastName}                {/* Muestra nombre y apellido del usuario. */}
                      </td>
                      <td className="px-4 py-3 text-sm text-pcm-muted">
                        {usuario.email}                                       {/* Muestra el correo electrónico. */}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold
                                      border shadow-sm ${obtenerClasesBadgeRol(usuario.role)}`}
                        >
                          {usuario.role}                                      {/* Muestra el rol en texto dentro del badge. */}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onEditarUsuario && onEditarUsuario(usuario)     // Llama al callback de edición si fue proporcionado (abre modal).
                            }
                            className="pcm-btn-primary flex items-center gap-1.5 text-xs
                                       px-3 py-1.5 rounded-xl shadow-pcm-soft
                                       hover:-translate-y-0.5 transition-all"
                          >
                            <Edit size={16} />                                 {/* Ícono de edición. */}
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onEliminarUsuario && onEliminarUsuario(usuario) // Llama al callback de eliminación si fue proporcionado (abre modal).
                            }
                            className="pcm-btn-danger flex items-center gap-1.5 text-xs
                                       px-3 py-1.5 rounded-xl shadow-pcm-soft
                                       hover:-translate-y-0.5 transition-all"
                          >
                            <Trash2 size={16} />                               {/* Ícono de papelera. */}
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (                                                          // Si no hay usuarios que cumplan el filtro...
                  <tr>
                    <td
                      colSpan={4}                                              // Ocupa todas las columnas de la tabla.
                      className="px-4 py-8 text-center text-sm text-pcm-muted"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <User size={40} className="text-pcm-muted/60 mb-1" /> {/* Ícono de usuario grande. */}
                        <p>No se encontraron usuarios con los filtros seleccionados.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =======================
            Vista móvil: tarjetas
           ======================= */}
        <div className="md:hidden">
          {usuariosFiltrados.length > 0 ? (                                    // Si hay usuarios filtrados...
            <div className="p-4 space-y-3">
              {usuariosFiltrados.map((usuario) => (                           // Recorre cada usuario para crear una tarjeta.
                <div
                  key={usuario._id || usuario.id}
                  className="rounded-2xl bg-pcm-surface/80 border border-white/10
                             shadow-pcm-soft p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar circular con iniciales del usuario */}
                    <div
                      className="w-9 h-9 rounded-full bg-pcm-surfaceSoft flex items-center
                                 justify-center text-xs font-semibold text-pcm-text shadow-pcm-soft"
                    >
                      {(usuario.firstName || '').charAt(0)}                   {/* Inicial del nombre. */}
                      {(usuario.lastName || '').charAt(0)}                    {/* Inicial del apellido. */}
                    </div>
                    {/* Bloque con nombre completo y correo */}
                    <div className="flex-1">
                      <h4 className="text-pcm-text font-semibold text-base mb-1">
                        {usuario.firstName} {usuario.lastName}                {/* Nombre completo del usuario. */}
                      </h4>
                      <p className="text-pcm-muted text-xs break-all">
                        {usuario.email}                                       {/* Correo del usuario, permite romper línea si es largo. */}
                      </p>
                    </div>
                    {/* Badge de rol alineado a la derecha */}
                    <span
                      className={`ml-2 px-2.5 py-1 rounded-full text-[11px] font-semibold
                                  whitespace-nowrap border shadow-sm ${obtenerClasesBadgeRol(usuario.role)}`}
                    >
                      {usuario.role}                                          {/* Muestra el rol dentro del badge. */}
                    </span>
                  </div>

                  {/* Botones de acción en vista móvil */}
                  <div className="flex gap-2 pt-3 mt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() =>
                        onEditarUsuario && onEditarUsuario(usuario)           // Ejecuta la acción de edición en móvil (abre modal en el padre).
                      }
                      className="pcm-btn-primary flex-1 flex items-center justify-center gap-1.5
                                 text-xs rounded-xl hover:-translate-y-0.5 transition-all"
                    >
                      <Edit size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onEliminarUsuario && onEliminarUsuario(usuario)       // Ejecuta la acción de eliminación en móvil (abre modal en el padre).
                      }
                      className="pcm-btn-danger flex-1 flex items-center justify-center gap-1.5
                                 text-xs rounded-xl hover:-translate-y-0.5 transition-all"
                    >
                      <Trash2 size={16} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (                                                                // Si no hay usuarios para mostrar en móvil...
            <div className="p-6 flex flex-col items-center justify-center text-center text-pcm-muted">
              <User size={40} className="text-pcm-muted/60 mb-3" />           {/* Ícono de usuario para estado vacío. */}
              <p className="text-sm">
                No se encontraron usuarios con los filtros seleccionados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Exporta el componente para usarlo en el dashboard de administración.
export default VistaUsuarios;                                                  // Exportación por defecto de la vista de usuarios.
