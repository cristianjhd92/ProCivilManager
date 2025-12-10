// File: frontend/src/modules/auth/pages/Registro.jsx
// Description: Pantalla de registro de nuevos usuarios para ProCivil Manager (PCM).
//              Valida datos básicos (nombre, apellido, correo, teléfono), fuerza de
//              contraseña, coincidencia de contraseñas y aceptación de términos.
//              Muestra indicadores visuales modernos y, al finalizar el registro con
//              éxito, presenta una animación suave de confirmación antes de redirigir
//              automáticamente a la pantalla de inicio de sesión.

// =========================
// Importaciones principales
// =========================
import React, { useState } from 'react';                  // Importa React y el hook useState para manejar estado local.
import {
  useNavigate,                                           // Hook para navegar programáticamente entre rutas.
  Link,                                                  // Componente Link para navegación interna sin recargar la página.
} from 'react-router-dom';                               // Importa utilidades de enrutamiento desde React Router DOM.

// =====================================
// Componente principal: Registro
// =====================================
export default function Registro() {                      // Define el componente funcional principal de registro.
  const navegar = useNavigate();                          // Inicializa el hook de navegación para redirigir al usuario.

  // ==========================
  // ESTADOS PRINCIPALES DEL FORMULARIO
  // ==========================
  const [datosFormulario, setDatosFormulario] = useState({ // Estado agrupado con todos los campos del formulario.
    firstName: '',                                        // Nombre del usuario (se envía así al backend).
    lastName: '',                                         // Apellido del usuario.
    email: '',                                            // Correo electrónico.
    phone: '',                                            // Teléfono (formateado +57 XXX XXX XXXX).
    password: '',                                         // Contraseña.
    confirmPassword: '',                                  // Confirmación de contraseña.
    terms: false,                                         // Aceptación de términos y condiciones.
    newsletter: false,                                    // Aceptación de recibir newsletter.
  });

  const [mostrarContrasena, setMostrarContrasena] = useState(false); // Controla si se muestra/oculta el campo de contraseña.
  const [mostrarConfirmacionContrasena, setMostrarConfirmacionContrasena] =
    useState(false);                                      // Controla si se muestra/oculta la confirmación de contraseña.
  const [fuerzaContrasena, setFuerzaContrasena] = useState(null); // Estado con el nivel de fuerza y criterios cumplidos.
  const [alerta, setAlerta] = useState(null);             // Mensaje de alerta global (éxito / error) para el formulario.
  const [cargando, setCargando] = useState(false);        // Indica si se está procesando el registro (para deshabilitar botón).
  const [registroExitoso, setRegistroExitoso] = useState(false); // Controla si ya se completó el registro para mostrar la animación final.

  // ==========================
  // FUNCIÓN: EVALUAR FUERZA DE CONTRASEÑA
  // ==========================
  const evaluarFuerzaContrasena = (contrasena) => {       // Recibe la contraseña a evaluar.
    const tieneLongitudMinima = contrasena.length >= 8;   // Valida longitud mínima de 8 caracteres.
    const tieneMayuscula = /[A-Z]/.test(contrasena);      // Al menos una letra mayúscula.
    const tieneMinuscula = /[a-z]/.test(contrasena);      // Al menos una letra minúscula.
    const tieneNumero = /\d/.test(contrasena);            // Al menos un número.
    const tieneEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(contrasena); // Al menos un carácter especial.

    const condicionesCumplidas = [                        // Agrupa todas las condiciones.
      tieneLongitudMinima,
      tieneMayuscula,
      tieneMinuscula,
      tieneNumero,
      tieneEspecial,
    ].filter(Boolean).length;                             // Cuenta cuántas condiciones se cumplen.

    let level = 'weak';                                   // Nivel por defecto: débil.
    let text =
      'Contraseña débil - agrega mayúsculas, números y símbolos'; // Texto por defecto para nivel débil.

    if (condicionesCumplidas >= 3 && condicionesCumplidas < 5) { // Entre 3 y 4 condiciones: nivel medio.
      level = 'medium';                                 // Ajusta nivel a medio.
      text =
        'Contraseña media - considera agregar más caracteres especiales'; // Texto para nivel medio.
    }

    if (condicionesCumplidas === 5) {                   // Todas las condiciones: nivel fuerte.
      level = 'strong';                                 // Ajusta nivel a fuerte.
      text = 'Contraseña fuerte';                       // Texto cuando la contraseña cumple todo.
    }

    return {                                            // Retorna nivel, texto y criterios individuales.
      level,                                            // Nivel (weak, medium, strong).
      text,                                             // Texto explicativo para el usuario.
      criterios: {                                      // Objeto con cada criterio evaluado.
        longitud: tieneLongitudMinima,                  // Longitud mínima cumplida o no.
        mayuscula: tieneMayuscula,                      // Presencia de mayúsculas.
        minuscula: tieneMinuscula,                      // Presencia de minúsculas.
        numero: tieneNumero,                            // Presencia de números.
        especial: tieneEspecial,                        // Presencia de caracteres especiales.
      },
    };
  };

  // ==========================
  // MANEJO DE CAMBIO EN LOS CAMPOS DEL FORMULARIO
  // ==========================
  const manejarCambio = (evento) => {                    // Maneja cambios en cualquier input del formulario.
    const { name, value, type, checked } = evento.target; // Extrae nombre, valor, tipo y checked desde el input.
    let nuevoValor = type === 'checkbox' ? checked : value; // Si es checkbox usa checked, si no usa value.

    if (name === 'phone') {                              // Si el campo que cambia es el teléfono...
      let soloNumeros = String(nuevoValor).replace(/\D/g, ''); // Elimina cualquier carácter que no sea número.

      if (soloNumeros.startsWith('57')) {                // Si inicia con 57 (código de país)...
        soloNumeros = soloNumeros.substring(2);          // Lo recorta, porque ya se antepone como prefijo.
      }

      if (soloNumeros.length > 10) {                     // Limita el teléfono a 10 dígitos.
        soloNumeros = soloNumeros.substring(0, 10);
      }

      if (soloNumeros.length >= 3) {                     // Si hay al menos 3 dígitos, intenta aplicar formato 3-3-4.
        soloNumeros = soloNumeros.replace(
          /(\d{3})(\d{3})(\d{4})/,
          '$1 $2 $3',                                    // Inserta espacios: XXX XXX XXXX cuando ya hay 10 dígitos.
        );
      }

      nuevoValor = soloNumeros ? `+57 ${soloNumeros}` : ''; // Si hay valor, antepone +57; si no, deja vacío.
    }

    setDatosFormulario((estadoPrevio) => ({              // Actualiza el estado del formulario de manera inmutable.
      ...estadoPrevio,                                   // Copia los valores anteriores.
      [name]: nuevoValor,                                // Sustituye únicamente el campo que cambió.
    }));

    if (name === 'password') {                           // Si el campo que cambió es la contraseña...
      if (nuevoValor.length > 0) {                       // Si la contraseña no está vacía.
        setFuerzaContrasena(evaluarFuerzaContrasena(nuevoValor)); // Calcula y guarda la fuerza y criterios.
      } else {
        setFuerzaContrasena(null);                       // Si se borra, limpia el indicador de fuerza.
      }
    }
  };

  // ==========================
  // MANEJO DE ENVÍO DEL FORMULARIO DE REGISTRO
  // ==========================
  const manejarEnvioFormulario = async (evento) => {     // Maneja el envío del formulario completo.
    evento.preventDefault();                             // Evita el comportamiento por defecto (recargar página).

    if (cargando) {                                      // Si ya se está procesando un envío...
      return;                                            // Evita envíos duplicados.
    }

    // Normaliza valores de texto antes de validar y enviar al backend.
    const firstNameLimpio = datosFormulario.firstName.trim(); // Nombre sin espacios al inicio y final.
    const lastNameLimpio = datosFormulario.lastName.trim();   // Apellido sin espacios extras.
    const emailLimpio = datosFormulario.email.trim();         // Correo normalizado.
    const phoneLimpio = datosFormulario.phone.trim();         // Teléfono normalizado (puede venir vacío).
    const password = datosFormulario.password;                // Contraseña tal cual.
    const confirmPassword = datosFormulario.confirmPassword;  // Confirmación tal cual.

    if (!firstNameLimpio || !lastNameLimpio || !emailLimpio) { // Valida presencia mínima de nombre, apellido y correo.
      setAlerta({
        type: 'error',
        message:
          'Por favor completa nombre, apellido y correo electrónico para crear tu cuenta.', // Mensaje de error si faltan datos clave.
      });
      return;                                          // Corta la ejecución si faltan datos clave.
    }

    if (!datosFormulario.terms) {                      // Si no se aceptaron los términos y condiciones...
      setAlerta({                                      // Muestra alerta de error.
        type: 'error',
        message: 'Debes aceptar los términos y condiciones.', // Mensaje que obliga a aceptar términos.
      });
      return;                                          // Corta la ejecución.
    }

    if (password !== confirmPassword) {                // Si las contraseñas no coinciden...
      setAlerta({                                      // Muestra alerta de error.
        type: 'error',
        message: 'Las contraseñas no coinciden.',      // Mensaje indicando el problema.
      });
      return;                                          // Corta la ejecución.
    }

    if (fuerzaContrasena?.level === 'weak') {          // Si el nivel de contraseña es débil...
      setAlerta({                                      // Muestra alerta de error.
        type: 'error',
        message: 'La contraseña es muy débil. Crea una más segura.', // Mensaje sugiriendo mejorar la clave.
      });
      return;                                          // Corta la ejecución.
    }

    const expresionCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Expresión regular sencilla para validar formato de correo.

    if (emailLimpio && !expresionCorreo.test(emailLimpio)) { // Si hay email pero no cumple el patrón...
      setAlerta({                                      // Muestra alerta de error.
        type: 'error',
        message: 'Por favor, ingresa un correo electrónico válido.', // Mensaje para correo inválido.
      });
      return;                                          // Corta la ejecución.
    }

    setCargando(true);                                 // Activa estado de carga (deshabilita botón).
    setAlerta(null);                                   // Limpia cualquier alerta previa.
    setRegistroExitoso(false);                         // Asegura que el estado de éxito esté en falso antes de intentar registrar.

    try {
      const respuesta = await fetch(                   // Realiza la petición HTTP al backend.
        `${import.meta.env.VITE_API_URL}/user/register`, // Usa la URL base del backend desde variables de entorno Vite.
        {
          method: 'POST',                              // Método HTTP POST para crear un nuevo usuario.
          headers: {
            'Content-Type': 'application/json',        // Indica que el cuerpo va en formato JSON.
          },
          body: JSON.stringify({                       // Convierte el objeto JS a JSON.
            firstName: firstNameLimpio,                // Nombre del usuario (ya normalizado).
            lastName: lastNameLimpio,                  // Apellido del usuario (normalizado).
            email: emailLimpio,                        // Correo electrónico normalizado.
            phone: phoneLimpio,                        // Teléfono formateado y recortado.
            password,                                  // Contraseña tal cual.
          }),
        },
      );

      const datos = await respuesta.json();            // Parsea la respuesta del servidor como JSON.

      if (!respuesta.ok) {                             // Si el código de estado no es 2xx...
        throw new Error(                               // Lanza un error con mensaje del backend o genérico.
          datos.message || 'Error en el registro.',    // Mensaje del error a mostrar.
        );
      }

      setAlerta({                                      // Muestra alerta de éxito si todo fue bien.
        type: 'success',
        message: '¡Cuenta creada exitosamente!',       // Mensaje de confirmación al usuario.
      });

      setDatosFormulario({                             // Limpia el formulario dejándolo en blanco.
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        terms: false,
        newsletter: false,
      });

      setFuerzaContrasena(null);                       // Limpia el indicador de fuerza de contraseña.
      setRegistroExitoso(true);                        // Activa el estado de registro exitoso para mostrar la animación final.

      setTimeout(() => {                               // Espera un momento para que se vea la animación.
        navegar('/login');                             // Redirige a la pantalla de login.
      }, 1600);                                        // Tiempo suficiente para percibir la animación de éxito.
    } catch (error) {
      setAlerta({                                      // Muestra alerta de error con el mensaje capturado.
        type: 'error',
        message: error.message || 'Error inesperado al registrar la cuenta.', // Mensaje genérico si no hay detalle.
      });
    } finally {
      setCargando(false);                              // Desactiva siempre el estado de carga, haya éxito o error.
    }
  };

  // ==========================
  // DERIVADOS DE ESTADO (COINCIDENCIA DE CONTRASEÑAS)
  // ==========================
  const contrasenasCoinciden =
    datosFormulario.password &&                        // Hay contraseña escrita...
    datosFormulario.confirmPassword &&                 // ...y confirmación escrita...
    datosFormulario.password === datosFormulario.confirmPassword; // ...y son exactamente iguales.

  const contrasenasNoCoinciden =
    datosFormulario.password &&                        // Hay contraseña...
    datosFormulario.confirmPassword &&                 // ...y confirmación...
    datosFormulario.password !== datosFormulario.confirmPassword; // ...pero no son iguales.

  // ==========================
  // RENDER DEL COMPONENTE
  // ==========================
  return (
    <div
      className="
        relative min-h-screen flex items-center justify-center
        bg-pcm-bg
        overflow-hidden font-sans py-8
      "                                                 // Contenedor principal centrado, con fondo base PCM.
    >
      {/* Fondo de rejilla sutil sobre todo el viewport (sin bg-gradient-to-*) */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none" // Capa que cubre todo el fondo, sin bloquear clics.
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',               // Tamaño del patrón de rejilla.
        }}
      />

      {/* Capa adicional de degradados radiales suaves usando style (no bg-gradient-to-*) */}
      <div
        className="absolute inset-0 pointer-events-none" // Capa decorativa extra para dar profundidad al fondo.
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(88,101,242,0.16), transparent 55%), radial-gradient(circle at bottom right, rgba(16,185,129,0.16), transparent 55%)',
        }}
      />

      {/* Elementos flotantes decorativos grandes usando animaciones globales */}
      <div
        className="
          absolute w-72 h-72 top-[-10%] left-[-5%]
          bg-pcm-primary/20
          rounded-full blur-3xl animate-crazy-float
        "                                               // Burbuja grande con animación vistosa en esquina superior izquierda.
      />
      <div
        className="
          absolute w-96 h-96 top-[70%] right-[-10%]
          bg-pcm-secondary/20
          rounded-full blur-3xl animate-float-medium
        "                                               // Burbuja grande flotando en esquina inferior derecha.
      />
      <div
        className="
          absolute w-48 h-48 bottom-[10%] left-[80%]
          bg-pcm-accent/20
          rounded-full blur-2xl animate-float-fast pcm-delay-lento
        "                                               // Burbuja mediana con animación rápida y delay suave.
      />

      {/* Puntos pequeños decorativos adicionales con pulso suave */}
      <div
        className="
          absolute top-1/4 right-1/4 w-2 h-2
          bg-pcm-primary rounded-full animate-pulse-soft opacity-60
        "                                               // Punto pulsante cerca de la parte superior derecha.
      />
      <div
        className="
          absolute bottom-1/3 w-1 h-1
          bg-pcm-secondary rounded-full animate-pulse-soft opacity-40
        "                                               // Punto pequeño pulsante hacia la parte inferior izquierda.
        style={{ left: '20%' }}                         // Posiciona el punto a un 20% desde el borde izquierdo.
      />
      <div
        className="
          absolute top-2/3 w-1.5 h-1.5
          bg-pcm-accent rounded-full animate-pulse-soft opacity-50
        "                                               // Otro punto pulsante en la parte media-baja derecha.
        style={{ right: '20%' }}                        // Posiciona el punto a un 20% desde el borde derecho.
      />

      {/* Contenedor principal del formulario de registro */}
      <div className="relative z-10 w-full max-w-2xl mx-4">
        <div
          className="
            bg-pcm-surface/80 backdrop-blur-2xl
            border border-white/10 rounded-pcm-xl
            p-10 lg:p-12 shadow-pcm-soft
            relative overflow-hidden animate-slide-up-soft
          "                                               // Tarjeta principal del formulario, con blur, sombra y animación de entrada.
        >
          {/* Capa de brillo suave sobre la tarjeta usando helper pcm-overlay-suave */}
          <div
            className="
              absolute inset-0
              rounded-pcm-xl
              pcm-overlay-suave
              pointer-events-none
            "
          />

          <div className="relative z-10">
            {/* Sección superior: logo y textos de bienvenida */}
            <div className="text-center mb-10">
              <div
                className="
                  inline-flex items-center justify-center
                  w-20 h-20
                  bg-pcm-primary
                  rounded-2xl mb-6 shadow-2xl
                "                                           // Cuadro con color PCM primario para el logo "PCM".
              >
                <span className="text-white font-bold text-2xl">PCM</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-black text-pcm-text mb-3">
                Únete a{' '}
                <span
                  className="
                    text-transparent bg-clip-text
                  "                                       // Permite aplicar un degradado vía style sin usar bg-gradient-to-*.
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, var(--tw-color-pcm-primary, #4f46e5), var(--tw-color-pcm-secondary, #10b981))', // Degradado PCM primario-secundario.
                  }}
                >
                  ProCivil Manager
                </span>
              </h1>

              <p className="text-pcm-muted text-lg lg:text-xl leading-relaxed max-w-lg mx-auto">
                Crea tu cuenta y comienza a gestionar tus proyectos de construcción
                con herramientas pensadas para el contexto colombiano.
              </p>

              <div
                className="
                  w-16 h-px
                  bg-pcm-primary/70
                  mx-auto mt-4
                "                                           // Línea decorativa bajo el texto de bienvenida.
              />
            </div>

            {/* Bloque de alerta (éxito / error) con animación global de entrada */}
            {alerta && (
              <div
                className={`
                  p-4 rounded-2xl mb-8 text-sm font-medium
                  border backdrop-blur-sm transition-all duration-300
                  animate-slide-in-down
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
                      ${
                        alerta.type === 'error'
                          ? 'bg-red-400'
                          : 'bg-emerald-400'
                      }
                    `}
                  />
                  {alerta.message}                         {/* Texto del mensaje de alerta. */}
                </div>
              </div>
            )}

            {/* Contenido del formulario de registro */}
            <form
              className="space-y-6"                       // Espacio vertical entre secciones del formulario.
              onSubmit={manejarEnvioFormulario}           // Maneja el envío del formulario con Enter o clic.
            >
              {/* Campos de Nombre y Apellido */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campo Nombre */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Nombre
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="firstName"
                      value={datosFormulario.firstName}
                      onChange={manejarCambio}
                      placeholder="Tu nombre"
                      required
                      className="
                        w-full px-6 py-4 rounded-2xl
                        border border-white/10
                        bg-white/5 backdrop-blur-sm
                        text-white placeholder-gray-500
                        focus:outline-none focus:border-pcm-primary/50
                        focus:bg-white/10
                        focus:ring-4 focus:ring-pcm-primary/20
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

                {/* Campo Apellido */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Apellido
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="lastName"
                      value={datosFormulario.lastName}
                      onChange={manejarCambio}
                      placeholder="Tu apellido"
                      required
                      className="
                        w-full px-6 py-4 rounded-2xl
                        border border-white/10
                        bg-white/5 backdrop-blur-sm
                        text-white placeholder-gray-500
                        focus:outline-none focus:border-pcm-primary/50
                        focus:bg-white/10
                        focus:ring-4 focus:ring-pcm-primary/20
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
              </div>

              {/* Campo de correo electrónico */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    name="email"
                    value={datosFormulario.email}
                    onChange={manejarCambio}
                    placeholder="tu@email.com"
                    required
                    className="
                      w-full px-6 py-4 rounded-2xl
                      border border-white/10
                      bg-white/5 backdrop-blur-sm
                      text-white placeholder-gray-500
                      focus:outline-none focus:border-pcm-primary/50
                      focus:bg-white/10
                      focus:ring-4 focus:ring-pcm-primary/20
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

              {/* Campo de teléfono */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Teléfono
                </label>
                <div className="relative group">
                  <input
                    type="tel"
                    name="phone"
                    value={datosFormulario.phone}
                    onChange={manejarCambio}
                    placeholder="+57 300 123 4567"
                    className="
                      w-full px-6 py-4 rounded-2xl
                      border border-white/10
                      bg-white/5 backdrop-blur-sm
                      text-white placeholder-gray-500
                      focus:outline-none focus:border-pcm-primary/50
                      focus:bg-white/10
                      focus:ring-4 focus:ring-pcm-primary/20
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

              {/* Campos de contraseña y confirmación */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contraseña */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Contraseña
                  </label>
                  <div className="relative group">
                    <input
                      type={mostrarContrasena ? 'text' : 'password'}
                      name="password"
                      value={datosFormulario.password}
                      onChange={manejarCambio}
                      placeholder="Crea una contraseña segura"
                      required
                      className="
                        w-full px-6 py-4 pr-14 rounded-2xl
                        border border-white/10
                        bg-white/5 backdrop-blur-sm
                        text-white placeholder-gray-500
                        focus:outline-none focus:border-pcm-primary/50
                        focus:bg-white/10
                        focus:ring-4 focus:ring-pcm-primary/20
                        transition-all duration-300 text-lg
                      "
                    />
                    {/* Botón para mostrar/ocultar contraseña */}
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarContrasena((valorActual) => !valorActual)
                      }
                      className="
                        absolute right-4 top-1/2 -translate-y-1/2
                        text-gray-400 hover:text-pcm-primary
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
                        className="transition duration-300 hover:scale-110"
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

                {/* Confirmar contraseña */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Confirmar contraseña
                  </label>
                  <div className="relative group">
                    <input
                      type={mostrarConfirmacionContrasena ? 'text' : 'password'}
                      name="confirmPassword"
                      value={datosFormulario.confirmPassword}
                      onChange={manejarCambio}
                      placeholder="Confirma tu contraseña"
                      required
                      className="
                        w-full px-6 py-4 pr-14 rounded-2xl
                        border border-white/10
                        bg-white/5 backdrop-blur-sm
                        text-white placeholder-gray-500
                        focus:outline-none focus:border-pcm-primary/50
                        focus:bg-white/10
                        focus:ring-4 focus:ring-pcm-primary/20
                        transition-all duration-300 text-lg
                      "
                    />
                    {/* Botón para mostrar/ocultar confirmación */}
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarConfirmacionContrasena(
                          (valorActual) => !valorActual,
                        )
                      }
                      className="
                        absolute right-4 top-1/2 -translate-y-1/2
                        text-gray-400 hover:text-pcm-primary
                        transition duration-300
                        p-2 rounded-lg hover:bg-white/5
                      "
                      aria-label={
                        mostrarConfirmacionContrasena
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
                        className="transition duration-300 hover:scale-110"
                      >
                        {mostrarConfirmacionContrasena ? (
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

                  {/* Indicador visual de coincidencia de contraseñas */}
                  {(datosFormulario.password ||
                    datosFormulario.confirmPassword) && (
                    <div
                      className={`
                        mt-3 text-xs rounded-xl px-3 py-2
                        flex items-center gap-2
                        border backdrop-blur-sm
                        ${
                          contrasenasCoinciden
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : contrasenasNoCoinciden
                            ? 'bg-red-500/10 text-red-300 border-red-500/30'
                            : 'bg-slate-700/40 text-slate-200 border-slate-500/40'
                        }
                      `}
                    >
                      <span
                        className={`
                          inline-flex items-center justify-center
                          w-4 h-4 rounded-full
                          ${
                            contrasenasCoinciden
                              ? 'bg-emerald-400'
                              : contrasenasNoCoinciden
                              ? 'bg-red-400'
                              : 'bg-slate-400'
                          }
                        `}
                      >
                        <span className="text-[9px] font-bold text-slate-900">
                          {contrasenasCoinciden ? '✓' : '!'}
                        </span>
                      </span>
                      <span className="font-medium">
                        {contrasenasCoinciden &&
                          'Las contraseñas coinciden.'}
                        {contrasenasNoCoinciden &&
                          'Las contraseñas no coinciden.'}
                        {!contrasenasCoinciden &&
                          !contrasenasNoCoinciden &&
                          'Escribe y confirma tu contraseña.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Indicador de fuerza de la contraseña con lista de criterios */}
              {fuerzaContrasena && (
                <div>
                  <div
                    className={`
                      p-4 rounded-2xl text-xs sm:text-sm font-medium
                      border backdrop-blur-sm transition-all duration-300
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
                      <span>{fuerzaContrasena.text}</span>
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

              {/* Checkbox de términos y condiciones (usando peer para la parte visual) */}
              <div className="flex items-start gap-4 pt-4">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="relative mt-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={datosFormulario.terms}
                      onChange={manejarCambio}
                      className="peer w-5 h-5 sr-only" // Input real oculto visualmente, pero accesible.
                    />
                    <div
                      className="
                        w-5 h-5 border-2 border-white/20
                        rounded bg-white/5
                        transition duration-200
                        peer-hover:border-pcm-primary/50
                        peer-focus-visible:outline-none
                      "
                    />
                    <div
                      className="
                        absolute w-3 h-3
                        rounded-sm
                        bg-pcm-primary
                        opacity-0 scale-0
                        transition-all duration-200
                        peer-checked:opacity-100
                        peer-checked:scale-100
                      "
                    />
                  </div>
                  <span className="text-gray-300 text-sm leading-relaxed">
                    Acepto los{' '}
                    <a
                      href="#"
                      className="
                        text-pcm-primary hover:text-pcm-secondary
                        font-bold transition duration-200
                        hover:underline
                      "
                    >
                      términos y condiciones
                    </a>{' '}
                    y la{' '}
                    <a
                      href="#"
                      className="
                        text-pcm-primary hover:text-pcm-secondary
                        font-bold transition duration-200
                        hover:underline
                      "
                    >
                      política de privacidad
                    </a>{' '}
                    de ProCivil Manager
                  </span>
                </label>
              </div>

              {/* Checkbox de newsletter (mismo patrón visual) */}
              <div className="flex items-start gap-4">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="relative mt-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      name="newsletter"
                      checked={datosFormulario.newsletter}
                      onChange={manejarCambio}
                      className="peer w-5 h-5 sr-only" // Input real oculto, pero controlado por estado.
                    />
                    <div
                      className="
                        w-5 h-5 border-2 border-white/20
                        rounded bg-white/5
                        transition duration-200
                        peer-hover:border-pcm-primary/50
                        peer-focus-visible:outline-none
                      "
                    />
                    <div
                      className="
                        absolute w-3 h-3
                        rounded-sm
                        bg-pcm-primary
                        opacity-0 scale-0
                        transition-all duration-200
                        peer-checked:opacity-100
                        peer-checked:scale-100
                      "
                    />
                  </div>
                  <span className="text-gray-300 text-sm leading-relaxed">
                    Quiero recibir noticias y actualizaciones por correo electrónico
                    sobre nuevas funciones y buenas prácticas de gestión de obra.
                  </span>
                </label>
              </div>

              {/* Botón principal de envío (crear cuenta) usando estilo PCM unificado */}
              <div className="pt-6">
                <button
                  type="submit"                            // Botón tipo submit para disparar el envío del formulario.
                  disabled={cargando}                      // Deshabilita el botón mientras se procesa el registro.
                  className={`
                    pcm-btn-primary
                    w-full justify-center text-base
                    relative overflow-hidden
                    ${
                      cargando
                        ? 'opacity-70 cursor-not-allowed'
                        : 'active:scale-95'
                    }
                  `}
                >
                  {/* Capa extra de shimmer cuando está cargando (mantiene forma redonda) */}
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

                  {/* Contenido del botón (texto + spinner) */}
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {cargando && (
                      <div
                        className="
                          w-5 h-5
                          border-2 border-white/30 border-t-white
                          rounded-full animate-spin
                        "
                      />
                    )}
                    {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}{/* Texto dinámico del botón. */}
                  </span>
                </button>
              </div>
            </form>

            {/* Botón para volver al inicio */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navegar('/')}                // Usa React Router para volver al inicio sin recargar.
                className="
                  text-pcm-primary hover:text-pcm-secondary
                  font-bold transition duration-200
                  hover:underline
                "
              >
                ← Volver al inicio
              </button>
            </div>

            {/* Enlace hacia la página de login */}
            <div className="text-center mt-10 pt-8 border-t border-white/10">
              <p className="text-gray-400 text-lg mb-4">
                ¿Ya tienes una cuenta?
              </p>
              <Link
                to="/login"                                // Ruta interna a la pantalla de inicio de sesión.
                className="
                  inline-flex items-center
                  px-8 py-3 rounded-2xl
                  border-2 border-pcm-primary/50
                  text-pcm-primary
                  hover:bg-pcm-primary hover:text-white hover:border-pcm-primary
                  font-bold transition-all duration-300
                  hover:shadow-pcm-soft
                "
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>

          {/* Elementos decorativos en esquinas de la tarjeta (sin bg-gradient-to-*) */}
          <div
            className="
              absolute top-0 right-0 w-32 h-32
              bg-pcm-primary/12
              rounded-full -translate-y-16 translate-x-16
            "
          />
          <div
            className="
              absolute bottom-0 left-0 w-40 h-40
              bg-pcm-secondary/12
              rounded-full translate-y-20 -translate-x-20
            "
          />
        </div>
      </div>

      {/* ============================== */}
      {/* Overlay de éxito post-registro */}
      {/* ============================== */}
      {registroExitoso && (
        <div
          className="
            absolute inset-0 z-20
            flex items-center justify-center
            bg-black/60 backdrop-blur-md
            animate-fade-in-soft
          "                                               // Capa oscura con blur que cubre toda la pantalla al final.
        >
          <div
            className="
              pcm-card-respuesta max-w-sm w-full mx-6 text-center
              animate-scale-in
            "                                             // Tarjeta glass con animación de escala suave.
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className="
                  flex items-center justify-center
                  w-16 h-16 rounded-full
                  bg-emerald-500/15 border border-emerald-400/70
                  shadow-lg shadow-emerald-500/30
                "                                         // Contenedor circular para el ícono de check.
              >
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
                  <path d="M20 6L9 17l-5-5" />           {/* Trazo del check de éxito. */}
                </svg>
              </div>

              <h2 className="text-2xl font-extrabold text-pcm-text">
                Cuenta creada
              </h2>

              <p className="text-sm text-pcm-muted">
                Tu cuenta en ProCivil Manager se creó correctamente.
                <br />
                En unos segundos te llevaremos al inicio de sesión para que puedas
                ingresar a tu panel de control.
              </p>

              <div className="mt-3 w-full h-1 rounded-full overflow-hidden bg-slate-800/80">
                <div
                  className="
                    h-full pcm-barra-carga-hero
                    animate-shimmer
                  "                                       // Barra de progreso con efecto shimmer reutilizando helper global.
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Si no eres redirigido automáticamente, podrás ir manualmente al
                inicio de sesión desde el botón de la parte inferior.
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
// Nota: Componente de apoyo para mostrar cada criterio de seguridad de la contraseña.
//       No hace llamadas externas; solo pinta un item con un check verde o punto neutro.
function CriterioContrasena({ cumplido, texto }) {        // Recibe si el criterio se cumple y el texto descriptivo.
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
          {cumplido ? '✓' : '•'}
        </span>
      </span>
      <span className={cumplido ? 'opacity-100' : 'opacity-80'}>
        {texto}
      </span>
    </div>
  );
}
