// File: frontend/src/shared/components/layout/BarraNavegacionPublica.jsx
// Description: Barra de navegación pública (landing) de ProCivil Manager.
//              Incluye logo con texto en degradado, enlaces centrales con píldora
//              activa y glow, botón "Iniciar sesión" como CTA principal naranja
//              y "Crear cuenta" como botón secundario. La barra es fija, se
//              oscurece al hacer scroll, se oculta al bajar y reaparece al subir.

import React, { useEffect, useRef, useState } from 'react';   // Importa React y los hooks para manejar estado, refs y efectos.
import {
  Link,                                                       // Componente para navegación declarativa entre rutas.
  useLocation,                                                // Hook para leer la ruta actual del navegador.
  useNavigate                                                 // Hook para navegar de forma programática.
} from 'react-router-dom';

// =========================================================
// Mapa de etiquetas amigables por rol de usuario
// =========================================================

const MAPA_ETIQUETAS_ROL = {
  admin: 'Administrador',                                     // Rol de administrador del sistema.
  'lider de obra': 'Líder de obra',                           // Rol escrito como "lider de obra".
  lider: 'Líder de obra',                                     // Variante corta del rol.
  cliente: 'Cliente'                                          // Rol de cliente/propietario.
};

// =========================================================
// Clases para el chip de rol según tipo de usuario
// =========================================================

const obtenerClasesChipRol = (rolNormalizado) => {
  // Admin → azul (color de control).
  if (rolNormalizado === 'admin') {
    return 'border-pcm-primary text-pcm-primary';
  }

  // Líder de obra → naranja (color de campo/obra).
  if (rolNormalizado.startsWith('lider')) {
    return 'border-pcm-secondary text-pcm-secondary';
  }

  // Cliente → verde (tranquilidad / servicio).
  if (rolNormalizado === 'cliente') {
    return 'border-pcm-success text-pcm-success';
  }

  // Cualquier otro rol → tonos desactivados.
  return 'border-pcm-disabled text-pcm-disabled';
};

// =========================================================
// Enlaces públicos de la barra de navegación
// =========================================================

const ENLACES_PUBLICOS = [
  { id: 'inicio', etiqueta: 'Inicio', ruta: '/' },                   // Enlace a la página principal.
  { id: 'servicios', etiqueta: 'Servicios', ruta: '/servicios' },    // Enlace a la sección de servicios.
  { id: 'proyectos', etiqueta: 'Proyectos', ruta: '/proyectos-publicos' }, // Enlace a proyectos públicos.
  { id: 'contacto', etiqueta: 'Contacto', ruta: '/contacto' }        // Enlace al formulario de contacto.
];

// =========================================================
// Componente principal de la barra pública
// =========================================================

const BarraNavegacionPublica = () => {
  // Hooks de navegación y ubicación.
  const navegar = useNavigate();                                // Permite cambiar de ruta programáticamente.
  const ubicacion = useLocation();                              // Entrega información de la ruta actual.

  // Referencias DOM.
  const refBarra = useRef(null);                                // Referencia al elemento <nav>.
  const refUltimaPosicionScroll = useRef(0);                    // Guarda la última posición de scroll.

  // Estado visual de la barra/menus.
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);   // Controla apertura del menú móvil.
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false); // Controla apertura del menú de usuario.
  const [haHechoScroll, setHaHechoScroll] = useState(false);         // Indica si el usuario ya hizo scroll.
  const [barraVisible, setBarraVisible] = useState(true);            // Indica si la barra está visible (versus oculta hacia arriba).

  // Estado de sesión / usuario.
  const [estaAutenticado, setEstaAutenticado] = useState(false);     // Indica si existe un usuario logueado.
  const [nombreUsuario, setNombreUsuario] = useState('');            // Nombre del usuario autenticado.
  const [correoUsuario, setCorreoUsuario] = useState('');            // Correo del usuario autenticado.
  const [rolUsuario, setRolUsuario] = useState('');                  // Rol del usuario autenticado.

  // Normalización de rol para comparaciones/clases.
  const rolNormalizado = (rolUsuario || '').toLowerCase().trim();   // Convierte a minúsculas y elimina espacios.
  const rolParaMostrar =
    MAPA_ETIQUETAS_ROL[rolNormalizado] || (rolUsuario || '');       // Devuelve etiqueta amigable o el rol crudo.

  // ---------------------------------------------------------
  // Función: determina si una ruta está activa
  // ---------------------------------------------------------
  const esRutaActiva = (rutaDestino) => {
    const rutaActual = (ubicacion.pathname || '/').toLowerCase();   // Ruta actual normalizada.
    const rutaObjetivo = (rutaDestino || '/').toLowerCase();        // Ruta objetivo normalizada.
    return rutaActual === rutaObjetivo;                             // Compara rutas exactas.
  };

  // ---------------------------------------------------------
  // Función: ruta de panel interno según rol
  // ---------------------------------------------------------
  const obtenerRutaPanelPorRol = () => {
    // En la versión actual de PCM todos los roles usan el mismo panel interno (/admin),
    // y el contenido del tablero se adapta dinámicamente según el rol del usuario.
    // Esto evita rutas inexistentes como /panel-admin o /panel-lider que podrían
    // dejar la pantalla en blanco si no están definidas en el router.
    return '/admin';
  };

  // ---------------------------------------------------------
  // Funciones para manejar apertura/cierre de menús
  // ---------------------------------------------------------
  const cerrarTodosLosMenus = () => {
    setMenuMovilAbierto(false);                                     // Cierra el menú móvil.
    setMenuUsuarioAbierto(false);                                   // Cierra el menú del usuario.
  };

  const alternarMenuUsuario = () => {
    setMenuUsuarioAbierto((estado) => !estado);                     // Invierte el estado de apertura del menú usuario.
  };

  const alternarMenuMovil = () => {
    setMenuMovilAbierto((estado) => !estado);                       // Invierte el estado del menú móvil.
  };

  // ---------------------------------------------------------
  // Función: manejar click en un enlace del menú
  // ---------------------------------------------------------
  const manejarClickEnlace = (rutaDestino) => {
    cerrarTodosLosMenus();                                          // Siempre cierra menús al navegar.
    if (!rutaDestino) return;                                       // Si no hay ruta, no hace nada.

    // Si la ruta destino es la misma en la que estamos, solo hace scroll al inicio.
    if (rutaDestino === ubicacion.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });              // Hace scroll suave al top.
      return;
    }

    navegar(rutaDestino);                                           // Navega hacia la ruta solicitada.
  };

  // ---------------------------------------------------------
  // Función: manejar click en el logo
  // ---------------------------------------------------------
  const manejarClickLogo = () => {
    cerrarTodosLosMenus();                                          // Cierra menús abiertos.
    if (ubicacion.pathname === '/') {                               // Si ya estamos en inicio,
      window.scrollTo({ top: 0, behavior: 'smooth' });              // solo hace scroll al top.
    } else {
      navegar('/');                                                 // De lo contrario navega al inicio.
    }
  };

  // ---------------------------------------------------------
  // Función: cerrar sesión
  // ---------------------------------------------------------
  const manejarCerrarSesion = () => {
    localStorage.removeItem('token');                               // Elimina el token del almacenamiento local.
    localStorage.removeItem('user');                                // Elimina la información del usuario heredada.
    localStorage.removeItem('pcm_usuario');                         // Elimina también la versión estándar PCM del usuario.
    setEstaAutenticado(false);                                      // Marca que ya no hay sesión.
    setNombreUsuario('');                                           // Limpia nombre.
    setCorreoUsuario('');                                           // Limpia correo.
    setRolUsuario('');                                              // Limpia rol.
    cerrarTodosLosMenus();                                          // Cierra menús abiertos.
    navegar('/');                                                   // Vuelve a la página de inicio.
  };

  // ---------------------------------------------------------
  // Función: sincronizar usuario desde localStorage
  // ---------------------------------------------------------
  const sincronizarUsuarioDesdeLocalStorage = () => {
    try {
      const token = localStorage.getItem('token');                  // Obtiene el token guardado (si existe).
      const usuarioCadena =
        localStorage.getItem('pcm_usuario') ||                      // Preferencia: usuario estándar PCM.
        localStorage.getItem('user');                               // Fallback: clave legacy 'user'.

      if (token && usuarioCadena) {                                 // Si hay token y datos de usuario,
        const usuario = JSON.parse(usuarioCadena);                  // Intenta parsear el JSON.

        const nombre = usuario.firstName || usuario.nombre || 'Usuario'; // Nombre en inglés o español.
        const correo = usuario.email || usuario.correo || '';       // Correo en inglés o español.
        const rol =
          usuario.role ||                                           // Rol en inglés usado en backend.
          usuario.rol || '';                                        // Rol en español si se hubiera guardado así.

        setNombreUsuario(nombre);                                   // Guarda nombre para la burbuja.
        setCorreoUsuario(correo);                                   // Guarda correo.
        setRolUsuario(rol);                                         // Guarda rol (crudo).
        setEstaAutenticado(true);                                   // Marca que hay sesión.
      } else {
        // Si no hay token o usuario, limpia el estado de sesión.
        setEstaAutenticado(false);
        setNombreUsuario('');
        setCorreoUsuario('');
        setRolUsuario('');
      }
    } catch (error) {
      console.error('Error al parsear usuario desde localStorage:', error); // Loguea error en consola.
      // Ante cualquier inconsistencia en el formato, se limpia el estado para no reventar la app.
      setEstaAutenticado(false);
      setNombreUsuario('');
      setCorreoUsuario('');
      setRolUsuario('');
    }
  };

  // =========================================================
  // Efecto: manejar scroll, clicks globales y eventos de usuario
  // =========================================================

  useEffect(() => {
    sincronizarUsuarioDesdeLocalStorage();                          // Sincroniza usuario al montar el componente.

    // Maneja el comportamiento visual de la barra al hacer scroll.
    const manejarScroll = () => {
      const posicionActual = window.scrollY || 0;                   // Posición actual de scroll.
      setHaHechoScroll(posicionActual > 50);                        // Marca si ya se superó un umbral.

      const ultima = refUltimaPosicionScroll.current || 0;          // Obtiene la última posición registrada.

      if (posicionActual > ultima && posicionActual > 120) {        // Si va bajando y ya pasó cierto punto,
        setBarraVisible(false);                                     // oculta la barra hacia arriba.
      } else {
        setBarraVisible(true);                                      // En caso contrario, la muestra.
      }

      refUltimaPosicionScroll.current = posicionActual;             // Actualiza última posición de scroll.
    };

    // Cierra menús si se hace click fuera de la barra.
    const manejarClickGlobal = (evento) => {
      if (!refBarra.current) return;                                // Si no hay referencia, sale.
      if (!refBarra.current.contains(evento.target)) {              // Si el click fue fuera de la barra,
        cerrarTodosLosMenus();                                      // cierra menús.
      }
    };

    // Escucha evento personalizado para actualizar datos del usuario.
    const manejarUsuarioActualizado = (evento) => {
      const usuarioActualizado = evento.detail;                     // Extrae datos del detalle del evento.

      if (usuarioActualizado && typeof usuarioActualizado === 'object') {
        const nombre = usuarioActualizado.firstName || usuarioActualizado.nombre || 'Usuario'; // Nombre.
        const correo = usuarioActualizado.email || usuarioActualizado.correo || '';            // Correo.
        const rol =
          usuarioActualizado.role ||                               // Rol en inglés.
          usuarioActualizado.rol || '';                            // Rol en español si llegara así.

        setNombreUsuario(nombre);                                  // Actualiza nombre.
        setCorreoUsuario(correo);                                  // Actualiza correo.
        setRolUsuario(rol);                                        // Actualiza rol.
        setEstaAutenticado(true);                                  // Marca que hay sesión.
      } else {
        sincronizarUsuarioDesdeLocalStorage();                      // Si el dato no es válido, vuelve a sincronizar.
      }
    };

    window.addEventListener('scroll', manejarScroll);               // Suscribe handler de scroll.
    document.addEventListener('click', manejarClickGlobal);         // Suscribe handler de click global.
    window.addEventListener('pcm:user-updated', manejarUsuarioActualizado); // Evento custom de usuario.

    // Limpia los listeners al desmontar el componente.
    return () => {
      window.removeEventListener('scroll', manejarScroll);
      document.removeEventListener('click', manejarClickGlobal);
      window.removeEventListener('pcm:user-updated', manejarUsuarioActualizado);
    };
  }, []);                                                           // Se ejecuta una sola vez al montar.

  // =========================================================
  // Clases dinámicas de la barra de navegación
  // =========================================================

  const clasesBarra = [
    'fixed inset-x-0 top-0 z-40',                                   // Posición fija superior y por encima del contenido.
    'transition duration-200',                                      // Transición suave para transformaciones/estados.
    'backdrop-blur',                                                // Desenfoque de fondo tipo glass.
    haHechoScroll                                                   // Cambia fondo según si se ha hecho scroll.
      ? 'bg-pcm-surface/95 shadow-pcm-suave'
      : 'bg-transparent',
    barraVisible ? 'translate-y-0' : '-translate-y-full'            // Traducción vertical para mostrar/ocultar barra.
  ].join(' ');                                                      // Junta todas las clases en un string.

  // =========================================================
  // Render del componente
  // =========================================================

  return (
    <nav ref={refBarra} className={clasesBarra}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 py-4 md:py-5">
          {/* ------------------------------------------------ */}
          {/* Logo + nombre de la aplicación                   */}
          {/* ------------------------------------------------ */}
          <button
            type="button"
            onClick={manejarClickLogo}
            className="flex items-center gap-3 text-pcm-text focus:outline-none"
          >
            {/* Isotipo de la marca dentro de un contenedor redondeado */}
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pcm-borderSoft bg-pcm-bg shadow-pcm-suave shrink-0">
              <span className="text-xl" aria-hidden="true">
                🏗️
              </span>
            </div>

            {/* Nombre de la marca con degradado de texto, más grande y en negrilla */}
            <div className="hidden sm:flex flex-col items-start">
              <span
                className="
                  text-lg md:text-xl font-extrabold tracking-tight
                  bg-clip-text text-transparent
                "
                style={{
                  backgroundImage:
                    'linear-gradient(120deg, #2F8DEE, #00B3C6, #FF9C2F)' // Degradado azul → turquesa → naranja.
                }}
              >
                ProCivil Manager
              </span>
            </div>
          </button>

          {/* ------------------------------------------------ */}
          {/* Enlaces centrales (modo escritorio)              */}
          {/* ------------------------------------------------ */}
          <div className="hidden md:flex flex-1 justify-center">
            <ul className="flex items-center gap-3 rounded-full bg-pcm-surfaceSoft/80 px-3 py-2 animate-entrada-suave-abajo">
              {ENLACES_PUBLICOS.map((enlace) => {
                const activo = esRutaActiva(enlace.ruta);           // Determina si este enlace está activo.

                const clasesEnlaceBase =
                  'relative px-5 py-2.5 text-sm md:text-base font-semibold rounded-full transition duration-200'; // Base común.

                const clasesEnlaceEstado = activo
                  ? 'text-pcm-text shadow-pcm-tabs border border-pcm-primary/70' // Estado activo con glow y borde.
                  : 'text-pcm-muted hover:text-pcm-text hover:bg-pcm-surface';  // Estado inactivo con hover suave.

                const estiloActivo = activo
                  ? {
                      backgroundImage:
                        'linear-gradient(135deg, rgba(47,141,238,0.98), rgba(0,179,198,0.95))' // Degradado para la pestaña activa.
                    }
                  : undefined;

                return (
                  <li key={enlace.id}>
                    <button
                      type="button"
                      onClick={() => manejarClickEnlace(enlace.ruta)}
                      className={`${clasesEnlaceBase} ${clasesEnlaceEstado}`}
                      style={estiloActivo}
                    >
                      <span className="relative flex items-center justify-center">
                        <span>{enlace.etiqueta}</span>
                        {activo && (
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-2 h-1 w-10 rounded-full bg-pcm-secondary animate-resplandor-pulso"
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ------------------------------------------------ */}
          {/* Zona derecha: botones de sesión / usuario (desk) */}
          {/* ------------------------------------------------ */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Vista escritorio */}
            <div className="hidden md:flex items-center gap-3">
              {!estaAutenticado && (
                <>
                  {/* INICIAR SESIÓN → CTA principal naranja (debe sobresalir) */}
                  <Link
                    to="/login"
                    onClick={cerrarTodosLosMenus}
                    className="pcm-btn-primary text-sm md:text-base"
                  >
                    Iniciar sesión
                  </Link>

                  {/* CREAR CUENTA → botón secundario tipo ghost, menos protagonista */}
                  <Link
                    to="/register"
                    onClick={cerrarTodosLosMenus}
                    className="
                      inline-flex items-center justify-center
                      gap-2 rounded-full px-4 py-2
                      text-xs md:text-sm font-semibold
                      border border-pcm-primary/40
                      bg-pcm-surfaceSoft/80
                      text-pcm-muted
                      transition duration-200
                      hover:text-pcm-text
                      hover:border-pcm-primary/80
                      hover:bg-pcm-primarySoft/80
                    "
                  >
                    Crear cuenta
                  </Link>
                </>
              )}

              {estaAutenticado && (
                <div className="relative">
                  {/* Botón compacto con resumen del usuario */}
                  <button
                    type="button"
                    onClick={alternarMenuUsuario}
                    className="inline-flex items-center gap-3 rounded-full border border-pcm-borderSoft bg-pcm-surfaceSoft px-4 py-2 text-sm text-pcm-text transition duration-200 hover:bg-pcm-card"
                    aria-haspopup="true"
                    aria-expanded={menuUsuarioAbierto}
                  >
                    {/* Avatar circular con inicial del nombre */}
                    <span className="h-9 w-9 flex items-center justify-center rounded-full bg-pcm-card text-sm font-semibold">
                      {nombreUsuario
                        ? nombreUsuario.charAt(0).toUpperCase()
                        : 'U'}
                    </span>

                    {/* Nombre y chip de rol */}
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-semibold leading-tight truncate max-w-pcm-nombre-usuario">
                        {nombreUsuario || 'Usuario'}
                      </span>
                      {rolParaMostrar && (
                        <span
                          className={`mt-0.5 text-[0.75rem] leading-tight border rounded-full px-2 py-px ${obtenerClasesChipRol(
                            rolNormalizado
                          )}`}
                        >
                          {rolParaMostrar}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Menú desplegable del usuario (escritorio) */}
                  {menuUsuarioAbierto && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-pcm-card border border-pcm-borderSoft shadow-pcm-profunda p-3">
                      <div className="mb-3 border-b border-pcm-borderSoft pb-2">
                        <p className="text-sm font-semibold text-pcm-text truncate">
                          {nombreUsuario || 'Usuario'}
                        </p>
                        {correoUsuario && (
                          <p className="text-[0.8rem] text-pcm-muted truncate">
                            {correoUsuario}
                          </p>
                        )}
                      </div>

                      <ul className="space-y-1">
                        {/* Opción de ir al panel (única acción principal que importa en la landing) */}
                        <li>
                          <button
                            type="button"
                            onClick={() =>
                              manejarClickEnlace(obtenerRutaPanelPorRol())
                            }
                            className="w-full text-left text-[0.85rem] px-2 py-1.5 rounded-lg text-pcm-text hover:bg-pcm-surfaceSoft transition duration-200"
                          >
                            Ir al panel
                          </button>
                        </li>
                        <li className="pt-1 border-t border-pcm-borderSoft">
                          <button
                            type="button"
                            onClick={manejarCerrarSesion}
                            className="w-full text-left text-[0.85rem] px-2 py-1.5 rounded-lg text-pcm-danger hover:bg-pcm-surfaceSoft transition duration-200"
                          >
                            Cerrar sesión
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ------------------------------------------------ */}
            {/* Botón hamburguesa para menú móvil                */}
            {/* ------------------------------------------------ */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-full border border-pcm-borderSoft text-pcm-text bg-pcm-surfaceSoft transition duration-200 hover:bg-pcm-card"
              onClick={alternarMenuMovil}
              aria-label="Abrir o cerrar menú de navegación"
            >
              <span className="text-lg" aria-hidden="true">
                {menuMovilAbierto ? '✕' : '☰'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================== */}
      {/* Menú desplegable en móviles                           */}
      {/* ===================================================== */}
      {menuMovilAbierto && (
        <div className="md:hidden border-t border-pcm-borderSoft bg-pcm-surface">
          <div className="max-w-6xl mx-auto px-4 pb-4 pt-2 space-y-3">
            {/* Enlaces principales en formato de lista vertical */}
            <ul className="space-y-1">
              {ENLACES_PUBLICOS.map((enlace) => (
                <li key={enlace.id}>
                  <button
                    type="button"
                    onClick={() => manejarClickEnlace(enlace.ruta)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition duration-200 ${
                      esRutaActiva(enlace.ruta)
                        ? 'bg-pcm-card text-pcm-text shadow-pcm-suave'
                        : 'text-pcm-muted hover:bg-pcm-surfaceSoft hover:text-pcm-text'
                    }`}
                  >
                    {enlace.etiqueta}
                  </button>
                </li>
              ))}
            </ul>

            {/* Acciones de sesión en móvil (login / registro / panel / logout) */}
            <div className="pt-2 border-t border-pcm-borderSoft space-y-2">
              {!estaAutenticado && (
                <>
                  {/* INICIAR SESIÓN → CTA principal naranja en móvil */}
                  <Link
                    to="/login"
                    onClick={cerrarTodosLosMenus}
                    className="
                      block w-full text-center
                      px-3 py-2 rounded-full text-sm font-semibold
                      text-pcm-bg
                      bg-pcm-secondary
                      shadow-pcm-suave
                      hover:shadow-pcm-tabs
                      transition duration-200
                    "
                  >
                    Iniciar sesión
                  </Link>

                  {/* CREAR CUENTA → botón secundario tipo ghost en móvil */}
                  <Link
                    to="/register"
                    onClick={cerrarTodosLosMenus}
                    className="
                      block w-full text-center
                      px-3 py-2 rounded-full text-xs font-semibold
                      border border-pcm-primary/40
                      bg-pcm-surfaceSoft/80
                      text-pcm-text
                      transition duration-200
                      hover:bg-pcm-primarySoft/80
                      hover:border-pcm-primary/80
                    "
                  >
                    Crear cuenta
                  </Link>
                </>
              )}

              {estaAutenticado && (
                <div className="space-y-2">
                  {/* Cabecera con avatar y datos del usuario */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex items-center justify-center rounded-full bg-pcm-card text-sm font-semibold">
                      {nombreUsuario
                        ? nombreUsuario.charAt(0).toUpperCase()
                        : 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-pcm-text truncate">
                        {nombreUsuario || 'Usuario'}
                      </span>
                      {rolParaMostrar && (
                        <span
                          className={`text-[0.75rem] border rounded-full px-2 py-px ${obtenerClasesChipRol(
                            rolNormalizado
                          )}`}
                        >
                          {rolParaMostrar}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Enlace rápido al panel interno */}
                  <button
                    type="button"
                    onClick={() =>
                      manejarClickEnlace(obtenerRutaPanelPorRol())
                    }
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm text-pcm-text hover:bg-pcm-surfaceSoft transition duration-200"
                  >
                    Ir al panel
                  </button>

                  {/* Opción de cerrar sesión */}
                  <button
                    type="button"
                    onClick={manejarCerrarSesion}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm text-pcm-danger hover:bg-pcm-surfaceSoft transition duration-200"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default BarraNavegacionPublica;                           // Exporta la barra para usarla en la landing pública.
