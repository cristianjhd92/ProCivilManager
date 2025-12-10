// File: frontend/src/modules/auth/pages/InicioSesion.jsx          // Ruta del archivo dentro del módulo de autenticación.
// Description: Página de inicio de sesión de ProCivil Manager      // Descripción: permite al usuario autenticarse enviando
//              (PCM). Permite al usuario autenticarse con correo   // correo electrónico y contraseña al backend. Si el login
//              electrónico y contraseña, guardar token y datos     // es exitoso, guarda token y datos básicos en localStorage
//              básicos en localStorage y redirigir al panel        // y redirige al panel interno. Usa fondo degradado PCM,
//              interno. Usa el fondo degradado industrial PCM,     // tarjeta con helpers .pcm-card y un botón principal
//              tarjeta con helpers .pcm-card y un botón            // basado en .pcm-btn-primary, con efecto shimmer al cargar.
//              principal basado en .pcm-btn-primary.               // Incluye un switch “Recordarme” estilizado como deslizador.


// =========================
// Importaciones principales
// =========================
import React, {
  useState,                      // Hook para manejar estado local del formulario y controles.
  useEffect,                     // Hook para cargar preferencias iniciales (recordar correo).
} from 'react';
import {
  useNavigate,                  // Hook para navegar programáticamente entre rutas del frontend.
  Link,                         // Componente de enlace interno para navegación SPA.
} from 'react-router-dom';      // Importa utilidades de enrutamiento desde React Router DOM.


// =====================================
// Componente principal: InicioSesion
// =====================================
export default function InicioSesion() {                      // Declara el componente principal de la página de inicio de sesión.

  // ==========================
  // ESTADOS PRINCIPALES
  // ==========================
  const [datosFormulario, setDatosFormulario] = useState({    // Estado para los campos del formulario (email y contraseña).
    email: '',                                                // Campo de correo electrónico inicializado vacío.
    password: '',                                             // Campo de contraseña inicializado vacío.
  });

  const [mostrarContrasena, setMostrarContrasena] = useState(false); // Controla si la contraseña se ve como texto o como asteriscos.
  const [cargando, setCargando] = useState(false);            // Indica si se está procesando la petición al backend (login en curso).
  const [textoBoton, setTextoBoton] = useState('Iniciar Sesión'); // Texto dinámico del botón principal (cambia según el estado).
  const [alerta, setAlerta] = useState(null);                 // Estado para mostrar mensajes de alerta { type, message } o null.

  const [recordarSesion, setRecordarSesion] = useState(false); // Estado para el switch "Recordarme" (true/false).

  const navegar = useNavigate();                              // Hook de navegación para redirigir a otras rutas sin recargar la página.

  // ==========================
  // CARGA INICIAL: RECORDAR CORREO (localStorage)
  // ==========================
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pcm_recordar_login'); // Lee la preferencia guardada (si existe).
      if (!raw) return;                                       // Si no hay nada, no hace cambios.

      const parsed = JSON.parse(raw);                         // Intenta parsear el JSON almacenado.

      if (parsed && typeof parsed.email === 'string') {       // Si hay un correo guardado...
        setDatosFormulario((previo) => ({                     // Actualiza solo el email del formulario.
          ...previo,
          email: parsed.email,
        }));
      }

      if (parsed && parsed.recordar === true) {               // Si la bandera recordar está activa...
        setRecordarSesion(true);                              // Marca el switch como activado.
      }
    } catch (error) {
      console.error('Error al leer pcm_recordar_login desde localStorage:', error); // Log de error silencioso.
    }
  }, []);                                                     // Solo se ejecuta una vez al montar el componente.

  // ==========================
  // MANEJO DE CAMBIO EN INPUTS
  // ==========================
  const manejarCambio = (evento) => {                         // Función que maneja el cambio en cualquiera de los inputs.
    const { name, value } = evento.target;                    // Extrae el nombre del campo y su valor desde el evento de cambio.

    setDatosFormulario((estadoPrevio) => ({                   // Actualiza el estado del formulario de manera inmutable.
      ...estadoPrevio,                                        // Copia los valores anteriores.
      [name]: value,                                          // Actualiza solo el campo que cambió (email o password).
    }));
  };

  // ==========================
  // MANEJO DE ENVÍO DEL FORMULARIO
  // ==========================
  const manejarEnvio = async (evento) => {                    // Función asincrónica que maneja el submit del formulario.
    evento.preventDefault();                                  // Evita que el formulario recargue la página por defecto.

    if (cargando) {                                           // Si ya está en estado de carga (petición en progreso)...
      return;                                                 // No hace nada para evitar envíos duplicados.
    }

    // Normaliza valores antes de enviar al backend (especialmente el email).
    const emailLimpio = datosFormulario.email.trim();         // Elimina espacios al inicio y final del correo electrónico.
    const passwordLimpia = datosFormulario.password;          // Toma la contraseña tal cual.

    if (!emailLimpio || !passwordLimpia) {                    // Valida que existan valores en ambos campos antes de hacer la petición.
      setAlerta({                                             // Configura una alerta de error amigable.
        type: 'error',
        message: 'Por favor diligencia tu correo y contraseña para iniciar sesión.',
      });
      return;                                                 // Detiene la ejecución sin llamar al backend.
    }

    setCargando(true);                                        // Activa el estado de carga para bloquear el botón y mostrar spinner.
    setTextoBoton('Iniciando sesión...');                     // Actualiza el texto del botón mientras se procesa el login.
    setAlerta(null);                                          // Limpia cualquier alerta previa para no mezclar mensajes.

    try {
      // ==========================
      // PETICIÓN AL BACKEND (LOGIN)
      // ==========================
      const respuesta = await fetch(                          // Realiza la petición HTTP hacia el backend.
        `${import.meta.env.VITE_API_URL}/user/login`,         // Usa la URL base del backend desde las variables de entorno Vite.
        {
          method: 'POST',                                     // Método HTTP POST para enviar credenciales.
          headers: {
            'Content-Type': 'application/json',               // Indica que el cuerpo de la petición va en formato JSON.
          },
          body: JSON.stringify({
            email: emailLimpio,                               // Envía el correo ya normalizado.
            password: passwordLimpia,                         // Envía la contraseña tal cual la escribió el usuario.
          }),
        },
      );

      const datos = await respuesta.json();                   // Intenta parsear la respuesta del backend como JSON.

      if (!respuesta.ok || !datos?.token) {                   // Si la respuesta no es exitosa o no se recibió un token válido...
        throw new Error(                                      // Lanza un error que será capturado en el bloque catch.
          datos?.message || 'Error en el inicio de sesión',   // Usa el mensaje enviado por el backend o uno genérico.
        );
      }

      // ==========================
      // CONSTRUCCIÓN DE usuarioSeguro
      // ==========================
      const usuarioSeguro = {                                 // Objeto compacto y “seguro” para guardar en localStorage.
        firstName: datos.user?.firstName || '',               // Nombre del usuario (o cadena vacía si no viene).
        lastName: datos.user?.lastName || '',                 // Apellido del usuario (o cadena vacía si no viene).
        email: datos.user?.email || emailLimpio,              // Email del usuario (prefiere el del backend, si viene).
        role: datos.user?.role || '',                         // Rol del usuario (admin | líder | cliente | etc.).
      };

      // ==========================
      // GUARDAR EN LOCALSTORAGE
      // ==========================
      localStorage.setItem('token', datos.token);             // Guarda el token JWT para futuras peticiones autenticadas.
      localStorage.setItem('user', JSON.stringify(usuarioSeguro)); // Guarda el usuario “seguro” como cadena JSON.

      // ==========================
      // LÓGICA DE "RECORDARME"
      // ==========================
      if (recordarSesion) {                                   // Si el usuario marcó "Recordarme"...
        localStorage.setItem(                                // Guarda el correo y la preferencia de recordar.
          'pcm_recordar_login',
          JSON.stringify({
            email: emailLimpio,
            recordar: true,
          }),
        );
      } else {                                                // Si NO quiere recordar sesión...
        localStorage.removeItem('pcm_recordar_login');        // Elimina cualquier registro previo de recordar login.
      }

      // ==========================
      // FEEDBACK VISUAL DE ÉXITO
      // ==========================
      setTextoBoton('¡Sesión iniciada!');                     // Cambia el texto del botón para indicar éxito en el login.

      setAlerta({                                             // Configura una alerta de éxito para el usuario.
        type: 'success',                                      // Tipo de alerta: éxito.
        message: `¡Inicio exitoso! Bienvenido ${
          usuarioSeguro.firstName || 'Usuario'
        }${usuarioSeguro.role ? ` (${usuarioSeguro.role})` : ''}`, // Mensaje de bienvenida con nombre y rol (cuando exista).
      });

      // ==========================
      // REDIRECCIÓN AL DASHBOARD
      // ==========================
      setTimeout(() => {                                      // Espera un pequeño tiempo para que el usuario vea el mensaje de éxito.
        if (datos.redirectTo) {                               // Si el backend envió una ruta de redirección específica...
          navegar(datos.redirectTo);                          // Navega hacia esa ruta interna de la SPA.
        } else {
          navegar('/admin');                                  // Si no, navega al panel unificado por defecto.
        }
      }, 1000);                                               // Retraso de 1 segundo antes de redirigir.
    } catch (error) {
      // ==========================
      // MANEJO DE ERRORES
      // ==========================
      setAlerta({                                             // Configura una alerta de error para mostrar al usuario.
        type: 'error',                                        // Tipo de alerta: error.
        message: error.message || 'Error inesperado al iniciar sesión.', // Mensaje amigable por defecto.
      });
      setTextoBoton('Iniciar Sesión');                        // Restablece el texto original del botón después del fallo.
    } finally {
      setCargando(false);                                     // Quita el estado de carga tanto en éxito como en error.
    }
  };

  // ==========================
  // RENDER DEL COMPONENTE
  // ==========================
  return (
    <div
      className="
        relative min-h-screen flex items-center justify-center
        overflow-hidden font-sans
        pcm-fondo-degradado-principal
      "                                                        // Contenedor principal con fondo degradado PCM.
    >
      {/* Fondo de rejilla sutil con líneas muy tenues encima del degradado principal */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none" // Capa que cubre todo el fondo pero no captura eventos.
        style={{                                              // Estilo inline para definir el patrón de rejilla.
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',                        // Tamaño de la rejilla (50x50 px).
        }}
      />

      {/* Elementos flotantes decorativos principales usando animaciones globales PCM */}
      <div
        className="
          absolute w-72 h-72 top-[-10%] left-[-5%]
          bg-pcm-primary/25
          rounded-full blur-3xl animate-float-slow
        "                                                      // Burbuja grande flotando lentamente (azul principal).
      />
      <div
        className="
          absolute w-96 h-96 top-[70%] right-[-10%]
          bg-pcm-secondary/25
          rounded-full blur-3xl animate-float-medium pcm-delay-lento
        "                                                      // Burbuja grande flotando (color secundario).
      />
      <div
        className="
          absolute w-52 h-52 bottom-[5%] left-[70%]
          bg-pcm-accent/40
          rounded-full blur-3xl animate-float-fast pcm-delay-lento
        "                                                      // Burbuja mediana en color acento para balancear la paleta.
      />

      {/* Pequeños puntos para dar más vida al fondo */}
      <div
        className="
          absolute top-1/4 right-1/4 w-2 h-2
          bg-pcm-primary rounded-full animate-pulse opacity-60
        "
      />
      <div
        className="
          absolute bottom-1/3 w-1 h-1
          bg-pcm-secondary rounded-full animate-pulse opacity-40
        "
        style={{ left: '20%' }}                                // Posición horizontal personalizada mediante style.
      />
      <div
        className="
          absolute top-2/3 w-1.5 h-1.5
          bg-pcm-accent rounded-full animate-pulse opacity-60 pcm-delay-lento
        "
        style={{ right: '18%' }}                               // Posición horizontal personalizada mediante style.
      />

      {/* Contenedor principal del login (tarjeta) */}
      <div
        className="
          relative z-10
          w-[480px] max-w-[90vw] animate-slide-up-soft
        "                                                      // Mantiene el mismo tamaño que tenías (no se modifica).
      >
        <div
          className="
            pcm-card
            rounded-pcm-xl
            p-8 md:p-10
            relative overflow-hidden
          "                                                    // Tarjeta basada en helper .pcm-card + radio token PCM.
        >
          {/* Capa de brillo suave encima de la tarjeta usando helper pcm-overlay-suave */}
          <div
            className="
              absolute inset-0
              rounded-pcm-xl pcm-overlay-suave pointer-events-none
            "
          />

          {/* Contenido real de la tarjeta (por encima de la capa de brillo) */}
          <div className="relative z-10">
            {/* Logo y nombre de la aplicación */}
            <div className="text-center mb-10">
              <div
                className="
                  inline-flex items-center justify-center
                  w-20 h-20
                  bg-pcm-primary
                  rounded-2xl mb-6 shadow-2xl
                "
              >
                <span className="text-white font-bold text-2xl">PCM</span>
              </div>

              <h1 className="text-4xl font-black text-pcm-text mb-2">
                <span
                  className="
                    text-transparent bg-clip-text
                    pcm-text-degradado-hero
                  "
                >
                  ProCivil Manager
                </span>
              </h1>

              <p className="text-pcm-muted text-lg font-medium">
                Sistema de Gestión de Proyectos
              </p>

              <div
                className="
                  w-20 h-px
                  bg-pcm-accent/80
                  mx-auto mt-5
                "
              />

              {/* Chip informativo reutilizando helper global .pcm-chip */}
              <div className="mt-4">
                <span className="pcm-chip">
                  Acceso seguro · Administradores, líderes y clientes
                </span>
              </div>
            </div>

            {/* Título de bienvenida */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-pcm-text mb-3">
                Bienvenido de vuelta
              </h2>
              <p className="text-pcm-muted text-lg leading-relaxed">
                Inicia sesión en tu cuenta para acceder a tu panel de control
              </p>
            </div>

            {/* Bloque de alerta (éxito / error) */}
            {alerta && (
              <div
                className={`
                  p-4 rounded-2xl mb-8 text-sm font-medium
                  border backdrop-blur-sm transition-all duration-300
                  ${
                    alerta.type === 'error'
                      ? 'bg-red-500/10 text-red-300 border-red-500/30 shadow-lg shadow-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/20'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      w-2 h-2 rounded-full
                      ${alerta.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'}
                    `}
                  />
                  {alerta.message}
                </div>
              </div>
            )}

            {/* Formulario de login */}
            <form
              className="space-y-8"
              onSubmit={manejarEnvio}
            >
              {/* Campo de correo electrónico */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-pcm-muted tracking-wider uppercase">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={datosFormulario.email}
                    onChange={manejarCambio}
                    required
                    className="
                      w-full px-6 py-4 rounded-2xl
                      border border-white/10
                      bg-white/5 backdrop-blur-sm
                      text-pcm-text placeholder-pcm-muted
                      focus:outline-none focus:border-pcm-primary/60
                      focus:bg-white/10
                      focus:ring-4 focus:ring-pcm-primary/25
                      transition-all duration-300 text-lg
                    "
                  />
                  <div
                    className="
                      absolute inset-0 rounded-2xl
                      bg-transparent
                      group-focus-within:bg-pcm-primary/10
                      transition-all duration-300 pointer-events-none
                    "
                  />
                </div>
              </div>

              {/* Campo de contraseña */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-pcm-muted tracking-wider uppercase">
                  Contraseña
                </label>
                <div className="relative group">
                  <input
                    type={mostrarContrasena ? 'text' : 'password'}
                    name="password"
                    placeholder="Ingresa tu contraseña"
                    value={datosFormulario.password}
                    onChange={manejarCambio}
                    required
                    className="
                      w-full px-6 py-4 pr-14 rounded-2xl
                      border border-white/10
                      bg-white/5 backdrop-blur-sm
                      text-pcm-text placeholder-pcm-muted
                      focus:outline-none focus:border-pcm-primary/60
                      focus:bg-white/10
                      focus:ring-4 focus:ring-pcm-primary/25
                      transition-all duration-300 text-lg
                    "
                  />

                  {/* Botón para mostrar/ocultar la contraseña */}
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    className="
                      absolute right-4 top-1/2 -translate-y-1/2
                      text-pcm-muted hover:text-pcm-primary
                      transition duration-300
                      p-2 rounded-lg hover:bg-white/5
                    "
                    aria-label={
                      mostrarContrasena
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform duration-300 hover:scale-110"
                    >
                      {mostrarContrasena ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>

                  <div
                    className="
                      absolute inset-0 rounded-2xl
                      bg-transparent
                      group-focus-within:bg-pcm-primary/10
                      transition-all duration-300 pointer-events-none
                    "
                  />
                </div>
              </div>

              {/* Recordarme y enlace de recuperar contraseña */}
              <div className="flex justify-between items-center text-sm pt-2 gap-4">
                {/* Switch “Recordarme” con deslizador visible y cambio de color marcado */}
                <label
                  htmlFor="recordar"
                  className="flex items-center gap-3 text-pcm-muted cursor-pointer select-none"
                >
                  {/* Track + knob controlados por el checkbox oculto como peer */}
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="recordar"
                      className="peer sr-only"                // Oculta el checkbox, pero permite usar peer-* para estilos.
                      checked={recordarSesion}                 // Usa el estado recordarSesion para reflejar el valor.
                      onChange={() =>
                        setRecordarSesion((previo) => !previo) // Alterna true/false al hacer clic.
                      }
                    />
                    {/* Pista del switch (track) */}
                    <div
                      className="
                        w-10 h-6
                        rounded-full
                        border border-white/25
                        bg-white/10
                        flex items-center px-0.5
                        justify-start
                        transition-all duration-200
                        peer-checked:justify-end
                        peer-checked:bg-pcm-primary
                        peer-checked:border-pcm-primary
                        shadow-inner
                      "
                    >
                      {/* Perilla del switch (knob) */}
                      <div
                        className="
                          w-4 h-4
                          rounded-full
                          bg-white
                          shadow-md
                          transition-all duration-200
                        "
                      />
                    </div>
                  </div>

                  {/* Texto del “Recordarme” (sin leyenda adicional) */}
                  <span className="font-medium text-pcm-text text-sm">
                    Recordarme
                  </span>
                </label>

                <Link
                  to="/recuperar"
                  className="
                    text-pcm-primary hover:text-pcm-secondary
                    font-bold transition duration-200
                    hover:underline
                    whitespace-nowrap
                  "
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Botón de envío del formulario (botón grande tipo barra) */}
              <button
                type="submit"
                disabled={cargando}
                className={`
                  pcm-btn-primary
                  w-full justify-center text-base
                  relative overflow-hidden
                  ${cargando ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}
                `}
              >
                {/* Capa extra de shimmer mientras está cargando */}
                {cargando && (
                  <div
                    className="
                      absolute inset-0 overflow-hidden
                      rounded-full pointer-events-none
                    "                                          // Borde redondo para que la barra se vea siempre curva.
                  >
                    <div
                      className="
                        absolute inset-0
                        pcm-barra-carga-hero
                        animate-shimmer
                        rounded-full
                      "                                        // Barra interna también redondeada.
                    />
                  </div>
                )}

                {/* Contenido visible (texto + spinner) */}
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {cargando && (
                    <div
                      className="
                        w-5 h-5
                        border-2 border-white/40 border-t-white
                        rounded-full animate-spin
                      "
                    />
                  )}
                  {textoBoton}
                </span>
              </button>
            </form>

            {/* Botón para volver al inicio (landing pública) */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navegar('/')}
                className="
                  text-pcm-primary hover:text-pcm-secondary
                  font-bold transition duration-200
                  hover:underline
                "
              >
                ← Volver al inicio
              </button>
            </div>

            {/* Enlace para registro de nueva cuenta */}
            <div className="text-center mt-10 pt-8 border-t border-white/10">
              <p className="text-pcm-muted text-lg">
                ¿No tienes una cuenta?{' '}
                <Link
                  to="/register"
                  className="
                    text-transparent bg-clip-text
                    pcm-text-degradado-hero
                    font-bold
                    transition duration-200
                  "
                >
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </div>

          {/* Elementos decorativos en la tarjeta */}
          <div
            className="
              absolute top-0 right-0 w-32 h-32
              bg-pcm-primary/16
              rounded-full -translate-y-16 translate-x-16
            "
          />
          <div
            className="
              absolute bottom-0 left-0 w-40 h-40
              bg-pcm-accent/18
              rounded-full translate-y-20 -translate-x-20
            "
          />
        </div>
      </div>
    </div>
  );
}
