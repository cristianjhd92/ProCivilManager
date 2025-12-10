// File: frontend/src/modules/auth/pages/CambioContrasena.jsx
// Description: Pantalla para cambio de contraseña a partir de un token de recuperación.
//              Valida el token recibido por query string, evalúa criterios de seguridad
//              de la nueva contraseña (longitud, mayúsculas, minúsculas, número,
//              símbolo), muestra si las contraseñas coinciden con indicadores visuales
//              modernos, y tras un cambio exitoso muestra una animación tipo overlay
//              antes de redirigir al inicio de sesión, usando el tema visual PCM.

// =========================
// Importaciones principales
// =========================
import React, {
  useState,                           // Hook para manejar estados locales (inputs, flags de carga, etc.).
  useEffect,                          // Hook para ejecutar efectos secundarios (validar token al montar, etc.).
} from 'react';
import {
  useNavigate,                       // Hook para redireccionar programáticamente a otras rutas del frontend.
  useLocation,                       // Hook para acceder a la información de la URL actual (incluyendo query string).
} from 'react-router-dom';           // Importa los hooks de navegación de React Router DOM.

// =============================================
// Componente principal para cambio de contraseña
// =============================================
export default function CambioContrasena() {   // Define el componente principal de la página de cambio de contraseña.
  const navegar = useNavigate();              // Instancia el hook useNavigate para poder redirigir a otras páginas.
  const ubicacion = useLocation();            // Obtiene la ubicación actual (URL completa, con querystring).

  // =====================================================
  // Obtener el token desde los parámetros de la querystring
  // =====================================================
  const parametrosBusqueda = new URLSearchParams(ubicacion.search); // Crea un objeto para leer los parámetros de la URL tipo ?token=...
  const token = parametrosBusqueda.get('token');                    // Extrae el valor del parámetro "token" (o null si no existe).

  // ================================
  // ESTADOS PARA CONTRASEÑAS Y ALERTA
  // ================================
  const [contrasenas, setContrasenas] = useState({       // Estado que agrupa los campos del formulario de contraseñas.
    nuevaContrasena: '',                                 // Almacena la nueva contraseña digitada por el usuario.
    confirmarContrasena: '',                             // Almacena la confirmación de la nueva contraseña.
  });

  const [alerta, setAlerta] = useState(null);            // Estado para manejar una alerta global { msg, type } (error o éxito).

  const [cargando, setCargando] = useState(false);       // Estado booleano que indica si se está procesando la petición al backend.

  const [mostrarContrasenas, setMostrarContrasenas] =
    useState({                                           // Estado para controlar la visibilidad de cada campo de contraseña.
      nuevaContrasena: false,                            // Si es true, muestra la nueva contraseña como texto.
      confirmarContrasena: false,                        // Si es true, muestra la confirmación como texto.
    });

  const [fuerzaContrasena, setFuerzaContrasena] =
    useState(null);                                      // Estado para guardar nivel y criterios de seguridad de la nueva contraseña.

  const [cambioExitoso, setCambioExitoso] =
    useState(false);                                     // Estado que controla si se muestra el overlay de éxito final.

  // =======================================
  // DERIVADOS: coincidencia de contraseñas
  // =======================================
  const contrasenasCoinciden =
    contrasenas.nuevaContrasena &&                       // Hay nueva contraseña digitada...
    contrasenas.confirmarContrasena &&                   // ...y hay confirmación digitada...
    contrasenas.nuevaContrasena ===
      contrasenas.confirmarContrasena;                   // ...y ambas coinciden exactamente.

  const contrasenasNoCoinciden =
    contrasenas.nuevaContrasena &&                       // Hay nueva contraseña...
    contrasenas.confirmarContrasena &&                   // ...y confirmación...
    contrasenas.nuevaContrasena !==
      contrasenas.confirmarContrasena;                   // ...pero los valores son diferentes.

  // ===================================
  // Helpers para manejar alertas visuales
  // ===================================
  const mostrarAlerta = (mensaje, tipo = 'error') => {   // Helper centralizado para mostrar una alerta.
    setAlerta({ msg: mensaje, type: tipo });             // Actualiza el estado con el mensaje y el tipo (error/success).
  };

  const limpiarAlerta = () => {                          // Helper para limpiar cualquier alerta visible.
    setAlerta(null);                                     // Resetea el estado de alerta a null.
  };

  // ======================================
  // Evaluar fuerza / criterios de contraseña
  // ======================================
  const evaluarFuerzaContrasena = (contrasena) => {      // Función que evalúa la seguridad de la contraseña.
    const tieneLongitudMinima = contrasena.length >= 8;  // Verifica longitud mínima de 8 caracteres.
    const tieneMayuscula = /[A-Z]/.test(contrasena);     // Verifica que haya al menos una letra mayúscula.
    const tieneMinuscula = /[a-z]/.test(contrasena);     // Verifica que haya al menos una letra minúscula.
    const tieneNumero = /\d/.test(contrasena);           // Verifica que haya al menos un número.
    const tieneEspecial =
      /[!@#$%^&*(),.?":{}|<>]/.test(contrasena);         // Verifica que haya al menos un símbolo especial.

    const condicionesCumplidas = [                       // Agrupa todas las condiciones booleanas...
      tieneLongitudMinima,
      tieneMayuscula,
      tieneMinuscula,
      tieneNumero,
      tieneEspecial,
    ].filter(Boolean).length;                            // ...y cuenta cuántas son verdaderas.

    let level = 'weak';                                  // Asigna nivel inicial: débil.
    let text =
      'Contraseña débil - agrega mayúsculas, números y símbolos.'; // Mensaje inicial para nivel débil.

    if (condicionesCumplidas >= 3 && condicionesCumplidas < 5) { // Entre 3 y 4 criterios: nivel medio.
      level = 'medium';                                // Ajusta el nivel a medio.
      text =
        'Contraseña media - considera agregar más caracteres especiales.'; // Mensaje para nivel medio.
    }

    if (condicionesCumplidas === 5) {                  // Los 5 criterios se cumplen: nivel fuerte.
      level = 'strong';                                // Ajusta el nivel a fuerte.
      text = 'Contraseña fuerte.';                     // Mensaje para nivel fuerte.
    }

    return {                                           // Retorna el nivel, texto y los criterios individuales.
      level,                                           // Nivel global (weak, medium, strong).
      text,                                            // Mensaje que se mostrará al usuario.
      criterios: {                                     // Objeto con el detalle de cada criterio.
        longitud: tieneLongitudMinima,                 // Cumplimiento de longitud mínima.
        mayuscula: tieneMayuscula,                     // Cumplimiento de presencia de mayúsculas.
        minuscula: tieneMinuscula,                     // Cumplimiento de presencia de minúsculas.
        numero: tieneNumero,                           // Cumplimiento de presencia de números.
        especial: tieneEspecial,                       // Cumplimiento de presencia de símbolos especiales.
      },
    };
  };

  // =======================================
  // Cambiar visibilidad de campos contraseña
  // =======================================
  const alternarVisibilidadContrasena = (campo) => {    // Alterna la visibilidad de un campo específico de contraseña.
    setMostrarContrasenas((estadoPrevio) => ({          // Usa el estado previo como base para el nuevo estado.
      ...estadoPrevio,                                  // Mantiene los demás campos sin cambios.
      [campo]: !estadoPrevio[campo],                    // Invierte el valor del campo indicado (true ↔ false).
    }));
  };

  // ==================================
  // Manejar cambios en los campos input
  // ==================================
  const manejarCambioCampo = (campo, valor) => {        // Maneja el cambio de cualquier input de contraseña.
    setContrasenas((estadoPrevio) => ({                 // Actualiza el estado de contraseñas.
      ...estadoPrevio,                                  // Conserva los otros campos sin modificar.
      [campo]: valor,                                   // Sobrescribe el campo que se está editando.
    }));

    if (campo === 'nuevaContrasena') {                  // Si el campo actualizado es la nueva contraseña...
      if (valor && valor.length > 0) {                  // Si se ha escrito algún contenido...
        setFuerzaContrasena(evaluarFuerzaContrasena(valor)); // Evalúa y guarda la fuerza de la contraseña.
      } else {
        setFuerzaContrasena(null);                      // Si se borra el campo, limpia el indicador.
      }
    }
  };

  // =========================================
  // Maneja el envío del formulario al backend
  // =========================================
  const manejarEnvioFormulario = async (evento) => {    // Función que se ejecuta al enviar el formulario.
    evento.preventDefault();                            // Previene el comportamiento por defecto (recargar la página).

    if (cargando) {                                     // Si ya hay un proceso en ejecución...
      return;                                           // Evita que se envíe el formulario varias veces.
    }

    if (!token) {                                       // Si no hay token en la URL...
      mostrarAlerta('Token no válido o expirado.');     // Muestra un mensaje de error informando el problema.
      return;                                           // Sale de la función sin intentar llamar al backend.
    }

    if (contrasenas.nuevaContrasena.length < 8) {       // Valida que la nueva contraseña tenga al menos 8 caracteres.
      mostrarAlerta(
        'La contraseña debe tener al menos 8 caracteres.'
      );
      return;                                           // Detiene el flujo si no se cumple la longitud mínima.
    }

    if (contrasenas.nuevaContrasena !== contrasenas.confirmarContrasena) { // Verifica que ambas contraseñas coincidan.
      mostrarAlerta('Las contraseñas no coinciden.');   // Informa al usuario que las contraseñas son diferentes.
      return;                                           // No continúa con la llamada al backend si no coinciden.
    }

    setCargando(true);                                  // Marca el estado como cargando mientras se hace la petición.
    limpiarAlerta();                                    // Limpia cualquier alerta previa antes de enviar.
    setCambioExitoso(false);                            // Asegura que el overlay de éxito esté oculto antes del intento.

    try {
      const respuesta = await fetch(                    // Realiza la llamada HTTP al backend.
        `${import.meta.env.VITE_API_URL}/user/reset-password/${token}`, // Construye la URL usando VITE_API_URL y el token.
        {
          method: 'POST',                               // Define el método HTTP como POST.
          headers: {
            'Content-Type': 'application/json',         // Indica que el cuerpo se envía en formato JSON.
          },
          body: JSON.stringify({
            newPassword: contrasenas.nuevaContrasena,   // Envía la nueva contraseña en el cuerpo de la petición.
          }),
        },
      );

      const datos = await respuesta.json();             // Intenta parsear la respuesta del backend como JSON.

      if (!respuesta.ok) {                              // Si el status HTTP no está en el rango 200–299...
        throw new Error(                                // Lanza un error con el mensaje que venga del backend o uno genérico.
          datos.message ||
            datos.msg ||
            'Error al cambiar la contraseña.',
        );
      }

      mostrarAlerta(
        '¡Contraseña cambiada exitosamente!',
        'success'
      );                                                // Muestra una alerta de éxito si todo salió bien.
      setCambioExitoso(true);                           // Activa el overlay de éxito para la animación final.

      setTimeout(() => {                                // Usa un pequeño retraso para que el usuario vea la animación.
        navegar('/login');                              // Redirige al usuario a la pantalla de inicio de sesión.
      }, 1600);                                         // Espera ~1.6 segundos antes de redirigir.
    } catch (error) {
      mostrarAlerta(                                    // Captura errores de red o del backend y los muestra.
        error.message ||
          'Error desconocido al cambiar la contraseña.',
      );
    } finally {
      setCargando(false);                               // Apaga el estado de carga al finalizar, sea éxito o error.
    }
  };

  // ==========================================
  // Efecto para validar la presencia del token
  // ==========================================
  useEffect(() => {                                     // Efecto que se ejecuta cuando el componente se monta o cambia el token.
    if (!token) {                                       // Si no existe token en la URL...
      mostrarAlerta('Token inválido o no proporcionado.'); // Muestra una alerta de error inicial.
    }
  }, [token]);                                          // Solo se vuelve a ejecutar si cambia el token.

  // ==============================
  // Render principal del componente
  // ==============================
  return (
    <div
      className="
        relative min-h-screen flex items-center justify-center
        bg-pcm-bg
        overflow-hidden font-sans text-pcm-text
      "                                                 // Contenedor principal centrado, con fondo base PCM.
    >
      {/* Fondo con patrón de cuadrícula sutil usando backgroundImage inline (no Tailwind gradient) */}
      <div
        className="absolute inset-0 opacity-20"         // Capa que ocupa todo el fondo con baja opacidad.
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,                                            // Dos gradientes perpendiculares para formar una cuadrícula.
          backgroundSize: '50px 50px',                 // Tamaño de cada celda de la cuadrícula.
        }}
      />

      {/* Elementos flotantes animados para dar profundidad al fondo (sin bg-gradient-to-*) */}
      <div
        className="
          absolute w-72 h-72 top-[-10%] left-[-5%]
          bg-pcm-primary/20
          rounded-full blur-3xl animate-float-medium
        "
      />                                                {/* Burbuja grande en la esquina superior izquierda. */}
      <div
        className="
          absolute w-96 h-96 top-[70%] right-[-10%]
          bg-pcm-secondary/20
          rounded-full blur-3xl animate-float-slow pcm-delay-lento
        "
      />                                                {/* Burbuja grande inferior derecha con delay suave usando helper pcm-delay-lento. */}
      <div
        className="
          absolute w-48 h-48 bottom-[10%] left-[80%]
          bg-emerald-500/20
          rounded-full blur-2xl animate-float-fast pcm-delay-lento
        "
      />                                                {/* Burbuja verde lateral derecha con delay reutilizando pcm-delay-lento. */}

      {/* Pequeñas formas geométricas para detalles extra en el fondo */}
      <div
        className="
          absolute top-1/4 right-1/4 w-2 h-2
          bg-pcm-primary rounded-full animate-pulse-soft opacity-60
        "
      />                                                {/* Punto brillante superior derecho. */}
      <div
        className="
          absolute bottom-1/3 left-1/5 w-1 h-1
          bg-pcm-secondary rounded-full animate-pulse-soft opacity-40 delay-1000
        "
      />                                                {/* Punto con retraso corto usando delay-1000 (utilidad estándar de Tailwind). */}
      <div
        className="
          absolute top-2/3 right-1/5 w-1.5 h-1.5
          bg-emerald-400 rounded-full animate-pulse-soft opacity-50 pcm-delay-lento
        "
      />                                                {/* Punto verde con delay largo usando el helper pcm-delay-lento. */}

      {/* Contenedor principal de la tarjeta de cambio de contraseña */}
      <div className="relative z-10 w-[480px] max-w-[90vw]"> {/* Limita el ancho de la tarjeta y la mantiene centrada. */}
        {/* Tarjeta con efecto glassmorphism alineado al tema PCM */}
        <div
          className="
            bg-pcm-surfaceSoft/80 backdrop-blur-2xl
            border border-white/10 rounded-pcm-xl
            p-12 shadow-pcm-soft relative overflow-hidden
            animate-slide-up-soft
          "                                              // Tarjeta principal con borde, sombra suave y animación de entrada.
        >
          {/* Capa interna con un leve brillo uniforme usando helper pcm-overlay-suave */}
          <div
            className="
              absolute inset-0
              rounded-pcm-xl pointer-events-none pcm-overlay-suave
            "
          />                                            {/* Overlay blanco tenue equivalente visual a bg-white/[0.05]. */}

          {/* Contenido real de la tarjeta */}
          <div className="relative z-10">               {/* Asegura que el contenido quede por encima de la capa brillante. */}
            {/* Sección de icono y título */}
            <div className="text-center mb-10">         {/* Encabezado centrado con icono y textos. */}
              <div
                className="
                  inline-flex items-center justify-center
                  w-20 h-20
                  bg-pcm-primary
                  rounded-2xl mb-6 shadow-2xl
                "
              >
                {/* Ícono de candado central */}
                <svg
                  className="w-8 h-8 text-white"        // Ícono de candado blanco centrado.
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2m8 0V7a4 4 0 00-8 0v2m8 0H7"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-black text-pcm-text mb-3">
                {/* Título principal de la página. */}
                Nueva <span className="text-pcm-primary">Contraseña</span>
              </h1>

              <p className="text-pcm-muted text-lg leading-relaxed">
                {/* Subtítulo explicativo de la acción. */}
                Ingresa tu nueva contraseña segura y confírmala para completar el
                proceso de recuperación de acceso a tu cuenta.
              </p>

              <div className="w-16 h-px bg-pcm-primary/70 mx-auto mt-6" />
              {/* Línea decorativa bajo el texto. */}
            </div>

            {/* Alerta de éxito o error */}
            {alerta && (                                // Renderiza la alerta solo cuando hay un objeto alerta.
              <div
                className={`
                  p-4 rounded-2xl mb-8 text-sm font-medium
                  border backdrop-blur-sm transition duration-300
                  animate-slide-in-down shadow-pcm-soft
                  ${
                    alerta.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border-red-500/30'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-2 h-2 rounded-full mt-2 shrink-0
                      ${
                        alerta.type === 'success'
                          ? 'bg-emerald-400'
                          : 'bg-red-400'
                      }
                    `}
                  />
                  {/* Punto de color que refuerza visualmente el tipo de alerta. */}
                  <div className="leading-relaxed">{alerta.msg}</div>
                  {/* Mensaje de la alerta. */}
                </div>
              </div>
            )}

            {/* Formulario de nueva contraseña */}
            <form
              className="space-y-8"                    // Separa verticalmente las secciones del formulario.
              onSubmit={manejarEnvioFormulario}        // Asocia el envío del formulario a la función manejadora.
            >
              {/* Campo: nueva contraseña */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-pcm-muted tracking-wider uppercase">
                  Nueva contraseña                      {/* Etiqueta del campo de nueva contraseña. */}
                </label>
                <div className="relative group">       {/* Contenedor relativo para ubicar el botón de ver/ocultar. */}
                  <input
                    type={
                      mostrarContrasenas.nuevaContrasena ? 'text' : 'password'
                    }                                   // Alterna tipo según visibilidad.
                    placeholder="Mínimo 8 caracteres"   // Mensaje de ayuda coherente con la validación.
                    value={contrasenas.nuevaContrasena} // Vincula el input al estado nuevaContrasena.
                    onChange={(e) =>
                      manejarCambioCampo(
                        'nuevaContrasena',
                        e.target.value,
                      )
                    }                                   // Actualiza el estado al escribir.
                    required                            // Marca el campo como obligatorio.
                    className="
                      w-full px-6 py-4 pr-14 rounded-2xl
                      border border-white/10
                      bg-pcm-bg/70 backdrop-blur-sm
                      text-pcm-text placeholder-pcm-muted
                      focus:outline-none focus:border-pcm-primary/60
                      focus:bg-pcm-bg
                      focus:ring-4 focus:ring-pcm-primary/25
                      transition duration-300 text-lg
                    "
                  />
                  {/* Botón para mostrar/ocultar la contraseña */}
                  <button
                    type="button"
                    onClick={() =>
                      alternarVisibilidadContrasena('nuevaContrasena')
                    }                                   // Cambia la visibilidad del campo al hacer clic.
                    className="
                      absolute right-4 top-1/2 -translate-y-1/2
                      text-pcm-muted hover:text-pcm-primary
                      transition duration-200
                      text-xl p-1
                    "
                    aria-label={
                      mostrarContrasenas.nuevaContrasena
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }                                   // Etiqueta accesible para lectores de pantalla.
                  >
                    {mostrarContrasenas.nuevaContrasena ? ( // Si está visible, muestra ícono de ojo tachado.
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (                              // Si está oculta, muestra ícono de ojo normal.
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                  {/* Efecto de resalte cuando el input está en foco (sin gradientes Tailwind) */}
                  <div
                    className="
                      absolute inset-0 rounded-2xl
                      bg-transparent
                      group-focus-within:bg-pcm-primary/10
                      transition duration-300 pointer-events-none
                    "
                  />
                </div>
                <p className="text-xs text-pcm-muted px-1">
                  Debe contener al menos 8 caracteres    {/* Mensaje auxiliar bajo el campo. */}
                </p>
              </div>

              {/* Indicador de fuerza de la nueva contraseña */}
              {fuerzaContrasena && (                    // Solo se muestra si ya se escribió algo en la nueva contraseña.
                <div>
                  <div
                    className={`
                      p-4 rounded-2xl text-xs sm:text-sm font-medium
                      border backdrop-blur-sm transition duration-300
                      ${
                        fuerzaContrasena.level === 'weak'
                          ? 'bg-red-500/10 text-red-200 border-red-500/30 shadow-lg shadow-red-500/10'
                          : fuerzaContrasena.level === 'medium'
                          ? 'bg-amber-500/10 text-amber-200 border-amber-500/30 shadow-lg shadow-amber-500/10'
                          : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`
                          w-2 h-2 rounded-full
                          ${
                            fuerzaContrasena.level === 'weak'
                              ? 'bg-red-400'
                              : fuerzaContrasena.level === 'medium'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }
                        `}
                      />
                      {/* Punto de color que refleja el nivel global de seguridad. */}
                      <span>{fuerzaContrasena.text}</span>
                      {/* Mensaje resumido de la fuerza de la contraseña. */}
                    </div>

                    {/* Lista de criterios de seguridad con checks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <CriterioContrasena
                        cumplido={fuerzaContrasena.criterios.longitud}
                        texto="Mínimo 8 caracteres"
                      />
                      <CriterioContrasena
                        cumplido={fuerzaContrasena.criterios.mayuscula}
                        texto="Al menos una letra mayúscula"
                      />
                      <CriterioContrasena
                        cumplido={fuerzaContrasena.criterios.minuscula}
                        texto="Al menos una letra minúscula"
                      />
                      <CriterioContrasena
                        cumplido={fuerzaContrasena.criterios.numero}
                        texto="Al menos un número"
                      />
                      <CriterioContrasena
                        cumplido={fuerzaContrasena.criterios.especial}
                        texto="Al menos un símbolo especial"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Campo: confirmar contraseña */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-pcm-muted tracking-wider uppercase">
                  Confirmar contraseña                  {/* Etiqueta para la confirmación de contraseña. */}
                </label>
                <div className="relative group">       {/* Contenedor relativo igual al anterior. */}
                  <input
                    type={
                      mostrarContrasenas.confirmarContrasena
                        ? 'text'
                        : 'password'
                    }                                   // Alterna visibilidad de confirmación.
                    placeholder="Repite la contraseña"  // Texto de ayuda.
                    value={contrasenas.confirmarContrasena} // Vincula el input al estado confirmarContrasena.
                    onChange={(e) =>
                      manejarCambioCampo(
                        'confirmarContrasena',
                        e.target.value,
                      )
                    }                                   // Actualiza el estado de confirmación.
                    required                            // Campo obligatorio.
                    className="
                      w-full px-6 py-4 pr-14 rounded-2xl
                      border border-white/10
                      bg-pcm-bg/70 backdrop-blur-sm
                      text-pcm-text placeholder-pcm-muted
                      focus:outline-none focus:border-pcm-primary/60
                      focus:bg-pcm-bg
                      focus:ring-4 focus:ring-pcm-primary/25
                      transition duration-300 text-lg
                    "
                  />
                  {/* Botón para mostrar/ocultar la confirmación */}
                  <button
                    type="button"
                    onClick={() =>
                      alternarVisibilidadContrasena('confirmarContrasena')
                    }                                   // Invierte la visibilidad de este campo.
                    className="
                      absolute right-4 top-1/2 -translate-y-1/2
                      text-pcm-muted hover:text-pcm-primary
                      transition duration-200
                      text-xl p-1
                    "
                    aria-label={
                      mostrarContrasenas.confirmarContrasena
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }                                   // Etiqueta accesible para lectores de pantalla.
                  >
                    {mostrarContrasenas.confirmarContrasena ? ( // Ícono de ojo tachado si el texto es visible.
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (                              // Ícono de ojo normal si el texto está oculto.
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                  {/* Efecto de resalte por foco en el grupo de input */}
                  <div
                    className="
                      absolute inset-0 rounded-2xl
                      bg-transparent
                      group-focus-within:bg-pcm-primary/10
                      transition duration-300 pointer-events-none
                    "
                  />
                </div>
                <p className="text-xs text-pcm-muted px-1">
                  Debe coincidir con la contraseña anterior
                  {/* Mensaje auxiliar para recordar la coincidencia. */}
                </p>
              </div>

              {/* Indicador visual de si las contraseñas coinciden */}
              {(contrasenas.nuevaContrasena ||
                contrasenas.confirmarContrasena) && (   // Solo se muestra si alguno de los campos tiene contenido.
                <div
                  className={`
                    p-3 rounded-2xl text-sm font-medium
                    transition duration-300 border
                    ${
                      contrasenasCoinciden
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : contrasenasNoCoinciden
                        ? 'bg-red-500/10 text-red-300 border-red-500/30'
                        : 'bg-slate-700/60 text-slate-200 border-slate-500/40'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {contrasenasCoinciden ? (           // Si coinciden, muestra estado positivo.
                      <>
                        <svg
                          className="w-4 h-4 text-emerald-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Las contraseñas coinciden</span>
                      </>
                    ) : contrasenasNoCoinciden ? (      // Si no coinciden, estado de advertencia.
                      <>
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span>Las contraseñas no coinciden</span>
                      </>
                    ) : (
                      <>                               {/* Estado neutro mientras se escribe. */}
                        <svg
                          className="w-4 h-4 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Escribe y confirma tu contraseña</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Botón para enviar el cambio de contraseña */}
              <div className="pt-4">
                <button
                  type="submit"                        // Botón de tipo submit para disparar el envío del formulario.
                  disabled={cargando || !token}        // Deshabilita el botón si está cargando o no hay token.
                  className={`
                    pcm-btn-primary
                    w-full justify-center text-base
                    relative overflow-hidden
                    ${
                      cargando || !token
                        ? 'opacity-70 cursor-not-allowed'
                        : 'active:scale-95'
                    }
                  `}
                >
                  {/* Capa de shimmer cuando está en estado de carga */}
                  {cargando && (
                    <div
                      className="
                        absolute inset-0 overflow-hidden
                        rounded-full pointer-events-none
                      "
                    >
                      <div
                        className="
                          absolute inset-0
                          pcm-barra-carga-hero
                          animate-shimmer
                          rounded-full
                        "
                      />
                    </div>
                  )}

                  {/* Contenido principal del botón */}
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {cargando && (                     // Muestra un spinner simple mientras se realiza la petición.
                      <div
                        className="
                          w-5 h-5 border-2
                          border-white/30 border-t-white
                          rounded-full animate-spin
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {cargando
                      ? 'Cambiando contraseña...'
                      : 'Cambiar contraseña'}
                    {/* Texto dinámico según estado de carga. */}
                  </span>
                </button>
              </div>
            </form>

            {/* Enlace para volver a la pantalla de inicio de sesión */}
            <div className="text-center mt-10 pt-8 border-t border-white/10">
              <p className="text-pcm-muted text-sm mb-4">
                ¿Ya tienes acceso a tu cuenta?           {/* Texto introductorio para el enlace de regreso. */}
              </p>
              <button
                type="button"                            // Botón normal (no submit).
                onClick={() => navegar('/login')}       // Navega a /login usando React Router (SPA).
                className="
                  inline-flex items-center gap-2
                  text-pcm-primary hover:text-pcm-secondary
                  font-bold transition duration-200
                  hover:underline text-lg
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
                Volver al inicio de sesión             {/* Texto clicable del enlace. */}
              </button>
            </div>

            {/* Bloque con recomendaciones de seguridad de contraseña */}
            <div className="mt-8 p-4 rounded-2xl bg-pcm-bg/70 border border-white/10">
              <h3 className="text-pcm-text font-semibold mb-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-pcm-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Consejos de seguridad                   {/* Título del bloque de recomendaciones. */}
              </h3>
              <ul className="text-pcm-muted text-sm leading-relaxed space-y-1">
                <li>
                  • Usa al menos 8 caracteres con mayúsculas, minúsculas y
                  números
                </li>
                <li>
                  • Evita usar información personal como fechas o nombres
                </li>
                <li>• No compartas tu contraseña con nadie</li>
              </ul>
            </div>
          </div>

          {/* Elementos decorativos adicionales en las esquinas (sin bg-gradient-to-*) */}
          <div
            className="
              absolute top-0 right-0 w-32 h-32
              bg-pcm-primary/12
              rounded-full -translate-y-16 translate-x-16
            "
          />                                            {/* Burbuja decorativa superior derecha. */}
          <div
            className="
              absolute bottom-0 left-0 w-40 h-40
              bg-pcm-secondary/12
              rounded-full translate-y-20 -translate-x-20
            "
          />                                            {/* Burbuja decorativa inferior izquierda. */}
        </div>
      </div>

      {/* ============================== */}
      {/* Overlay de éxito post-cambio   */}
      {/* ============================== */}
      {cambioExitoso && (                               // Solo aparece cuando el cambio fue exitoso.
        <div
          className="
            absolute inset-0 z-20
            flex items-center justify-center
            bg-black/60 backdrop-blur-md
            animate-fade-in-soft
          "
        >
          {/* Tarjeta glass reutilizando patrón PCM (pcm-card-respuesta) */}
          <div
            className="
              pcm-card-respuesta max-w-sm w-full mx-6 text-center
              animate-scale-in
            "
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className="
                  flex items-center justify-center
                  w-16 h-16 rounded-full
                  bg-emerald-500/15 border border-emerald-400/70
                  shadow-lg shadow-emerald-500/30
                "
              >
                {/* Ícono de check central para indicar éxito */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-300"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <h2 className="text-2xl font-extrabold text-pcm-text">
                Contraseña actualizada
              </h2>

              <p className="text-sm text-pcm-muted">
                Tu contraseña se actualizó correctamente.
                <br />
                En unos segundos te llevaremos al inicio de sesión para que puedas
                ingresar con tu nueva clave.
              </p>

              <div className="mt-3 w-full h-1 rounded-full overflow-hidden bg-slate-800/80">
                <div
                  className="
                    h-full pcm-barra-carga-hero
                    animate-shimmer
                  "
                />
                {/* Barra de carga con efecto shimmer para reforzar que se va a redirigir. */}
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Si no eres redirigido automáticamente, puedes ir al inicio de
                sesión desde el botón inferior de esta ventana o el menú principal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================
// Subcomponente: CriterioContrasena
// =====================================
// Muestra un ítem de la lista de criterios (check verde si se cumple, punto neutro si no).
function CriterioContrasena({ cumplido, texto }) {      // Recibe si el criterio se cumple y el texto descriptivo.
  return (
    <div className="flex items-center gap-2 text-[11px] sm:text-xs">
      <span
        className={`
          inline-flex items-center justify-center
          w-4 h-4 rounded-full
          ${
            cumplido
              ? 'bg-emerald-400 text-emerald-950'
              : 'bg-slate-600 text-slate-100'
          }
        `}
      >
        <span className="text-[9px] font-bold">
          {cumplido ? '✓' : '•'}                         {/* Check si se cumple, punto si no. */}
        </span>
      </span>
      <span className={cumplido ? 'opacity-100' : 'opacity-80'}>
        {texto}                                         {/* Texto descriptivo del criterio. */}
      </span>
    </div>
  );
}
