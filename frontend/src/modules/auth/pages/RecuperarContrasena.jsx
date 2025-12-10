// File: frontend/src/modules/auth/pages/RecuperarContrasena.jsx     // Ruta del archivo dentro del módulo de auth.
// Description: Página pública para solicitar la recuperación de     // Descripción corta de la pantalla.
//              contraseña. Permite al usuario ingresar su correo    // Explica que el usuario digitara su correo.
//              electrónico, valida el formato y envía la solicitud   // Indica que hay validación de formato de correo.
//              al backend (/user/forgot-password). Muestra estados  // Señala la ruta y el manejo de estados de carga.
//              de carga, mensajes de éxito o error y aplica el tema // Se integra con el tema visual PCM.
//              visual PCM (tarjeta glass y botón principal naranja). // Usa tarjeta PCM y el botón login PCM.

// =========================
// Importaciones principales
// =========================
import React, { useState } from 'react';                             // Importa React y el hook useState para manejar estado local.
import { useNavigate } from 'react-router-dom';                      // Importa useNavigate para realizar navegación SPA al login.

// =========================
// Constantes de configuración
// =========================
const API_URL = import.meta.env.VITE_API_URL                         // Toma la URL base de la API desde las variables de entorno de Vite.
  || 'http://localhost:5000/api';                                    // Si no está definida, usa un valor por defecto para desarrollo.

// =====================================
// Componente principal de la página
// =====================================
export default function RecuperarContrasena() {                      // Declara y exporta el componente funcional de recuperación.
  // ==========================
  // ESTADOS PRINCIPALES
  // ==========================
  const [correoElectronico, setCorreoElectronico] = useState('');    // Estado que guarda el correo digitado por el usuario.
  const [alerta, setAlerta] = useState(null);                        // Estado para guardar una alerta { message, type } o null.
  const [estaCargando, setEstaCargando] = useState(false);           // Estado booleano que indica si se está enviando la petición.

  const navegar = useNavigate();                                     // Hook de navegación para volver al login sin recargar la página.

  // ==========================
  // FUNCIONES DE ALERTA
  // ==========================
  const mostrarAlerta = (mensaje, tipo = 'error') => {               // Función auxiliar para mostrar una alerta con mensaje y tipo.
    setAlerta({ message: mensaje, type: tipo });                     // Actualiza el estado alerta con el objeto { message, type }.
  };

  const limpiarAlerta = () => {                                      // Función auxiliar para limpiar cualquier alerta visible.
    setAlerta(null);                                                 // Pone el estado alerta en null (no se muestra nada).
  };

  // ==========================
  // MANEJO DE ENVÍO DEL FORMULARIO
  // ==========================
  const manejarEnvioFormulario = async (evento) => {                 // Declara la función asíncrona que maneja el submit del formulario.
    evento.preventDefault();                                         // Previene el comportamiento por defecto (recargar la página).

    const expresionCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;            // Define expresión regular básica para validar correos.

    if (!expresionCorreo.test(correoElectronico)) {                  // Si el correo no cumple el patrón de la expresión regular...
      mostrarAlerta('Por favor, ingresa un correo válido.');         // Muestra una alerta de error al usuario.
      return;                                                        // Detiene la ejecución para no llamar al backend.
    }

    setEstaCargando(true);                                           // Marca que el flujo está en estado de carga (deshabilita el botón).
    limpiarAlerta();                                                 // Limpia cualquier alerta previa antes de enviar.

    try {                                                            // Inicia bloque try para capturar errores de red o del backend.
      const respuesta = await fetch(                                 // Llama al endpoint del backend con fetch.
        `${API_URL}/user/forgot-password`,                           // Construye la URL usando la constante API_URL.
        {
          method: 'POST',                                            // Usa método POST para enviar datos.
          headers: {
            'Content-Type': 'application/json',                      // Indica que el body se envía como JSON.
          },
          body: JSON.stringify({ email: correoElectronico }),        // Envía el correo en el body con la clave "email".
        },
      );

      const datos = await respuesta.json();                          // Convierte la respuesta del servidor a objeto JSON.

      if (!respuesta.ok) {                                           // Si el código de estado HTTP no es exitoso (no 2xx)...
        throw new Error(                                             // Lanza un error para que lo capture el catch.
          datos.message || datos.msg || 'Error al enviar el enlace.',// Usa mensaje del backend o uno genérico.
        );
      }

      const correoEnmascarado = correoElectronico.replace(           // Enmascara el correo digitado para mostrarlo parcialmente.
        /(.{2}).+(@.+)/,                                             // Mantiene solo los primeros 2 caracteres y el dominio.
        '$1***$2',                                                   // Reemplaza el resto por ***.
      );

      mostrarAlerta(                                                 // Muestra una alerta de éxito si llegó hasta aquí.
        `Hemos enviado un enlace de recuperación a ${correoEnmascarado}`, // Mensaje con el correo parcialmente oculto.
        'success',                                                   // Tipo de alerta: éxito.
      );
    } catch (error) {                                                // Captura cualquier error lanzado en el try.
      mostrarAlerta(                                                 // Muestra un mensaje de error al usuario.
        error.message || 'Error desconocido al enviar el correo.',   // Usa el mensaje del error o uno genérico.
      );
    } finally {                                                      // Bloque que siempre se ejecuta al final.
      setEstaCargando(false);                                        // Quita el estado de carga sin importar el resultado.
    }
  };

  // ==========================
  // RENDER DEL COMPONENTE
  // ==========================
  return (                                                           // Devuelve el árbol JSX de la página.
    <div
      className="
        relative
        min-h-screen
        flex items-center justify-center
        bg-pcm-bg
        overflow-hidden
        font-sans
      "                                                              // Contenedor principal: pantalla completa, centrada, fondo PCM.
    >
      {/* Fondo con patrón de rejilla sutil (líneas horizontales y verticales) */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"  // Capa que cubre todo el fondo sin capturar eventos.
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,                                                          // Dos gradientes perpendiculares que forman la rejilla.
          backgroundSize: '50px 50px',                               // Tamaño de cada celda de la cuadricula.
        }}
      />

      {/* Capa adicional con degradados radiales suaves para dar profundidad */}
      <div
        className="absolute inset-0 pointer-events-none"             // Segunda capa que añade halos de color sin bloquear clics.
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(88,101,242,0.18), transparent 55%), radial-gradient(circle at bottom right, rgba(245,158,11,0.16), transparent 55%)', // Halos azul y naranja.
        }}
      />

      {/* Burbuja grande azul (primario) flotando en la esquina superior izquierda */}
      <div
        className="
          absolute
          w-72 h-72
          -top-10 -left-6
          bg-pcm-primary/24
          rounded-full
          blur-3xl
          animate-crazy-float
        "
      />

      {/* Burbuja grande naranja (secundario) flotando hacia la parte inferior derecha */}
      <div
        className="
          absolute
          w-96 h-96
          top-3/4 -right-10
          bg-pcm-secondary/24
          rounded-full
          blur-3xl
          animate-float-medium
        "
      />

      {/* Burbuja mediana turquesa (accent) flotando más rápido con delay suave */}
      <div
        className="
          absolute
          w-48 h-48
          bottom-10 right-10
          bg-pcm-accent/24
          rounded-full
          blur-2xl
          animate-float-fast pcm-delay-lento
        "
      />

      {/* Puntos decorativos pequeños con pulso suave (usando paleta PCM) */}
      <div
        className="
          absolute
          top-1/4 right-1/4
          w-2 h-2
          bg-pcm-primary
          rounded-full
          animate-pulse-soft
          opacity-70
        "
      />
      <div
        className="
          absolute
          bottom-1/3
          w-1 h-1
          bg-pcm-secondary
          rounded-full
          animate-pulse-soft
          opacity-50
        "
        style={{ left: '20%' }}                                     // Posiciona el punto al 20% desde el borde izquierdo.
      />
      <div
        className="
          absolute
          top-2/3
          w-2 h-2
          bg-pcm-accent
          rounded-full
          animate-pulse-soft
          opacity-60
        "
        style={{ right: '20%' }}                                    // Posiciona el punto al 20% desde el borde derecho.
      />

      {/* Contenedor principal de la tarjeta de recuperación (SIN borde animado giratorio) */}
      <div className="relative z-10 w-full max-w-md px-4">           {/* Limita el ancho y centra la tarjeta */}
        <div
          className="
            bg-pcm-surface/85
            backdrop-blur-2xl
            border border-white/10
            rounded-pcm-xl
            p-8 md:p-10
            shadow-pcm-soft
            relative
            overflow-hidden
            animate-slide-up-soft
          "                                                          // Tarjeta tipo glass con sombra PCM y animación de entrada.
        >
          {/* Capa de brillo interno suave debajo del contenido */}
          <div
            className="
              absolute inset-0
              rounded-pcm-xl
              pcm-overlay-suave
              pointer-events-none
            "
          />

          {/* Franja decorativa superior con degradado entre primario y accent */}
          <div
            className="
              absolute
              top-0 left-0 right-0
              h-1.5
              rounded-t-pcm-xl
            "
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--tw-color-pcm-primary, #4f46e5), var(--tw-color-pcm-accent, #f97316))', // Degradado horizontal azul → naranja.
            }}
          />

          {/* Contenido principal de la tarjeta */}
          <div className="relative z-10">                            {/* Asegura que el contenido esté por encima de los overlays */}
            {/* Chip superior de contexto “Recuperación de acceso” */}
            <div className="flex justify-center mb-4">               {/* Centra el chip horizontalmente */}
              <div
                className="
                  inline-flex items-center gap-2
                  px-3 py-1
                  rounded-full
                  bg-pcm-surfaceSoft/90
                  border border-pcm-accent/50
                  shadow-pcm-soft
                "
              >
                <span
                  className="w-2 h-2 rounded-full bg-pcm-accent"
                />                                                 {/* Punto pequeño de color accent dentro del chip */}
                <span
                  className="
                    text-[11px]
                    font-semibold
                    text-pcm-text
                    uppercase
                    tracking-wide
                  "
                >
                  Recuperación de acceso
                </span>
              </div>
            </div>

            {/* Cabecera: icono, título principal y texto descriptivo */}
            <div className="text-center mb-8">                       {/* Centra todo el encabezado */}
              <div
                className="
                  inline-flex items-center justify-center
                  w-20 h-20
                  rounded-2xl
                  mb-6
                  shadow-2xl
                "
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--tw-color-pcm-primary, #4f46e5), var(--tw-color-pcm-accent, #f97316))', // Cuadro con degradado azul-naranja.
                }}
              >
                <span className="text-white text-3xl">🔒</span>      {/* Emoji de candado representando seguridad */}
              </div>

              <h1 className="text-3xl font-black text-pcm-text mb-2">
                {/* Título principal de la sección */}
                ¿Olvidaste tu{' '}
                <span
                  className="
                    text-transparent
                    bg-clip-text
                  "
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, var(--tw-color-pcm-primary, #4f46e5), var(--tw-color-pcm-secondary, #10b981))', // Degradado aplicado solo a “contraseña”.
                  }}
                >
                  contraseña?
                </span>
              </h1>

              <p className="text-pcm-muted text-sm md:text-base leading-relaxed">
                {/* Texto que explica el flujo de recuperación */}
                Ingresa tu correo electrónico y te enviaremos un enlace seguro
                para restablecer tu acceso a ProCivil Manager.
              </p>

              <div
                className="
                  w-20 h-px
                  bg-pcm-accent/80
                  mx-auto mt-5
                "
              />                                                   {/* Línea delgada decorativa debajo del texto */}
            </div>

            {/* Bloque de alerta (éxito o error) */}
            {alerta && (                                            // Renderiza el bloque solo si existe una alerta.
              <div
                className={`
                  p-4
                  rounded-2xl
                  mb-7
                  text-sm font-medium
                  border
                  backdrop-blur-sm
                  transition-all duration-300
                  animate-slide-in-down
                  ${
                    alerta.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/40 shadow-lg shadow-emerald-500/25'
                      : 'bg-red-500/10 text-red-200 border-red-500/40 shadow-lg shadow-red-500/25'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-2 h-2
                      rounded-full
                      mt-2
                      shrink-0
                      ${
                        alerta.type === 'success'
                          ? 'bg-emerald-400'
                          : 'bg-red-400'
                      }
                    `}
                  />                                               {/* Punto de color que indica si la alerta es éxito o error */}
                  <div className="leading-relaxed">
                    {alerta.message}                               {/* Texto del mensaje recibido en la alerta */}
                  </div>
                </div>
              </div>
            )}

            {/* Formulario para solicitar el enlace de recuperación */}
            <form
              onSubmit={manejarEnvioFormulario}                   // Usa la función manejarEnvioFormulario al enviar.
              className="space-y-7"                               // Deja espacio vertical entre los bloques del formulario.
            >
              {/* Campo de correo electrónico */}
              <div className="space-y-2">                         {/* Agrupa label, input y nota */}
                <label
                  className="
                    block
                    text-sm
                    font-bold
                    text-pcm-muted
                    tracking-wider
                    uppercase
                  "
                >
                  Correo electrónico
                </label>

                <div className="relative group">                  {/* Contenedor relativo para input + efectos */}
                  <input
                    type="email"                                 // Usa tipo email para validación básica nativa.
                    placeholder="tu@email.com"                   // Placeholder de ejemplo para el usuario.
                    value={correoElectronico}                    // Valor del input ligado al estado correoElectronico.
                    onChange={(e) => setCorreoElectronico(e.target.value)} // Actualiza el estado al escribir.
                    required                                     // Marca el campo como obligatorio.
                    className="
                      w-full
                      px-6 py-4
                      rounded-2xl
                      border border-white/10
                      bg-pcm-bg/70
                      backdrop-blur-sm
                      text-pcm-text
                      placeholder-pcm-muted
                      focus:outline-none
                      focus:border-pcm-primary/60
                      focus:bg-pcm-bg
                      focus:ring-4 focus:ring-pcm-primary/25
                      transition-all duration-300
                      text-base md:text-lg
                    "
                  />

                  <div
                    className="
                      absolute inset-0
                      rounded-2xl
                      bg-transparent
                      group-focus-within:bg-pcm-primary/10
                      transition-all duration-300
                      pointer-events-none
                    "
                  />                                             {/* Overlay sutil al enfocar el input */}

                  <div
                    className="
                      absolute
                      right-4 top-1/2
                      -translate-y-1/2
                      text-pcm-muted
                      pointer-events-none
                    "
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                </div>

                <p className="text-xs text-pcm-muted mt-2 px-1">
                  {/* Nota informativa bajo el campo de correo */}
                  Te enviaremos las instrucciones de recuperación a este correo.
                </p>
              </div>

              {/* Botón de envío del formulario usando el helper global de login */}
              <button
                type="submit"                                     // Botón de tipo submit para disparar el onSubmit del formulario.
                disabled={estaCargando}                          // Deshabilita el botón mientras se envía la petición.
                className={`
                  pcm-btn-login-principal
                  ${estaCargando ? 'pcm-btn-login-principal--disabled' : ''}
                `}
              >
                <span className="flex items-center justify-center gap-3">
                  {estaCargando && (                             // Solo muestra el spinner cuando está cargando.
                    <span
                      className="
                        w-5 h-5
                        border-2 border-white/30 border-t-white
                        rounded-full
                        animate-spin
                      "
                    />
                  )}

                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>

                  <span>
                    {estaCargando                            // Texto dinámico según el estado de carga.
                      ? 'Enviando enlace...'
                      : 'Enviar enlace de recuperación'}
                  </span>
                </span>
              </button>
            </form>

            {/* Enlace para volver a la pantalla de inicio de sesión */}
            <div className="text-center mt-9 pt-7 border-t border-white/10">
              <p className="text-pcm-muted text-sm mb-3">
                ¿Recordaste tu contraseña?
              </p>
              <button
                type="button"                                   // Botón normal (no envía formulario).
                onClick={() => navegar('/login')}              // Navega a la ruta /login usando react-router.
                className="
                  inline-flex items-center gap-2
                  text-pcm-secondary
                  hover:text-pcm-accent
                  font-bold
                  transition duration-200
                  hover:underline
                  text-base md:text-lg
                "
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Volver al inicio de sesión
              </button>
            </div>

            {/* Bloque de ayuda adicional para contacto con soporte */}
            <div
              className="
                mt-7
                p-4
                rounded-2xl
                bg-pcm-surfaceSoft/90
                border border-pcm-primary/40
              "
            >
              <h3 className="text-pcm-text font-semibold mb-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-pcm-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                ¿Necesitas ayuda?
              </h3>
              <p className="text-pcm-muted text-sm leading-relaxed">
                Si tienes problemas para recuperar tu cuenta, puedes contactar a
                nuestro equipo de soporte técnico para recibir asistencia
                personalizada.
              </p>
            </div>
          </div>

          {/* Elementos decorativos extra en las esquinas de la tarjeta */}
          <div
            className="
              absolute
              top-0 right-0
              w-32 h-32
              bg-pcm-primary/10
              rounded-full
              -translate-y-16 translate-x-16
            "
          />
          <div
            className="
              absolute
              bottom-0 left-0
              w-40 h-40
              bg-pcm-secondary/10
              rounded-full
              translate-y-20 -translate-x-20
            "
          />
        </div>
      </div>
    </div>
  );
}
