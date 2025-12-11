// File: frontend/src/shared/components/layout/PieDePagina.jsx
// Description: Pie de página global de ProCivil Manager (PCM).
//              Muestra información de marca, datos de contacto y un pequeño
//              formulario de suscripción al boletín. Usa la paleta industrial
//              PCM (fondo oscuro, azul ingeniería, naranja de obra, turquesa),
//              sombras y animaciones definidas en el tema global. Se integra
//              en las páginas públicas de la aplicación.

import React, { useState } from 'react'; // Importa React y el hook useState para manejar estado local.

// ==============================
// Componente principal PieDePagina
// ==============================
const PieDePagina = () => {                                      // Declara el componente funcional PieDePagina.
  const [correo, establecerCorreo] = useState('');               // Estado para almacenar el correo digitado.
  const [mensajeRetroalimentacion, establecerMensajeRetroalimentacion] =
    useState(null);                                              // Estado para manejar el feedback { type, text } o null.

  const anioActual = new Date().getFullYear();                   // Año actual para el copyright dinámico.

  // Maneja el envío de la suscripción al boletín.
  const manejarEnvioBoletin = (evento) => {                      // Función que se ejecuta al enviar el formulario.
    evento.preventDefault();                                     // Evita la recarga de la página.

    if (!correo) {                                               // Si el campo de correo está vacío:
      establecerMensajeRetroalimentacion({                       // Configura un mensaje de error.
        type: 'error',
        text: 'Por favor ingresa un correo electrónico válido.',
      });
      return;                                                    // Sale para no continuar con el flujo de éxito.
    }

    // Por ahora solo mostramos feedback local, sin llamada al backend.
    establecerMensajeRetroalimentacion({                         // Configura un mensaje de éxito.
      type: 'success',
      text: '¡Gracias por suscribirte! Te contactaremos pronto.',
    });

    establecerCorreo('');                                        // Limpia el campo de correo después del envío.
  };

  // Render del pie de página.
  return (
    <footer
      className="
        relative overflow-hidden
        bg-pcm-bg bg-pcm-panel-control bg-cover bg-no-repeat
        text-pcm-text
        border-t border-pcm-borderSoft/60
      "                                                          // Fondo PCM, textura de panel y borde superior sutil.
    >
      {/* Capa de patrón de fondo con SVG inline como background-image */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none" // Capa de rejilla muy tenue sobre todo el footer.
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='footergrid' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/></pattern></defs><rect width='100' height='100' fill='url(%23footergrid)'/></svg>\")",
        }}
      />

      {/* Manchas de color suaves usando paleta PCM para dar profundidad */}
      <div
        className="
          absolute -top-20 -left-20
          w-40 h-40 rounded-full
          bg-pcm-primary/18
          blur-3xl
          animate-float-slow
        "                                                        // Halo primario flotando en la esquina superior izquierda.
      />
      <div
        className="
          absolute -bottom-24 -right-24
          w-52 h-52 rounded-full
          bg-pcm-secondary/18
          blur-3xl
          animate-float-slow
        "                                                        // Halo secundario flotando en la esquina inferior derecha.
      />

      {/* Contenedor principal del contenido del footer */}
      <div
        className="
          relative z-10
          max-w-6xl mx-auto
          px-6 md:px-8 lg:px-10
          py-16
          space-y-10
          animate-page-in
        "                                                        // Contenedor centrado con animación de entrada global.
      >
        {/* Grid superior: marca a la izquierda / contacto + newsletter a la derecha */}
        <div
          className="
            grid grid-cols-1 md:grid-cols-2
            gap-10
            mb-6
          "
        >
          {/* Sección de marca / descripción */}
          <div className="max-w-md space-y-4">
            {/* Logo textual + nombre de la app */}
            <div
              className="
                flex items-center gap-2
                text-3xl font-extrabold
              "
            >
              <span className="text-2xl">🏗️</span>              {/* Isotipo simple (obra en construcción). */}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(120deg, #2F8DEE, #00B3C6, #FF9C2F)', // Azul ingeniería → turquesa → naranja obra.
                }}
              >
                ProCivil Manager
              </span>
            </div>

            {/* Descripción corta del producto */}
            <p
              className="
                text-pcm-muted
                text-sm md:text-base
                leading-relaxed
                max-w-md
              "
            >
              Plataforma diseñada para la gestión integral de proyectos de
              construcción en Colombia. Planifica, controla y entrega tus obras
              con datos confiables y en tiempo real.
            </p>

            {/* Línea decorativa debajo de la descripción */}
            <div
              className="w-24 h-0.5 rounded-full opacity-90"
              style={{
                backgroundImage:
                  'linear-gradient(120deg, #2F8DEE, #00B3C6, #FF9C2F)',
              }}
            />
          </div>

          {/* Sección de contacto + newsletter */}
          <div className="space-y-6">
            {/* Título principal del bloque derecho */}
            <h4
              className="
                text-lg md:text-xl
                font-semibold
                text-pcm-text
              "
            >
              Contacto
            </h4>

            {/* Información de contacto básica */}
            <div className="space-y-3">
              {[
                { icon: '📧', text: 'contacto@procivilmanager.com' },
                { icon: '📞', text: '+57 (1) 234-5678' },
                { icon: '📍', text: 'Bogotá, Colombia' },
              ].map((contacto, indice) => (
                <div
                  key={indice}
                  className="
                    flex items-center gap-3
                    text-pcm-muted text-sm
                    rounded-lg px-2 py-1
                    transition duration-300
                    hover:bg-pcm-surfaceSoft/60
                    hover:text-pcm-text
                  "                                          // Fila con hover suave en fondo y color.
                >
                  {/* Ícono de contacto */}
                  <div
                    className="
                      w-9 h-9
                      rounded-lg
                      bg-pcm-surfaceSoft/80
                      border border-pcm-borderSoft/80
                      flex items-center justify-center
                      text-base
                      shadow-pcm-soft
                    "
                  >
                    {contacto.icon}
                  </div>

                  {/* Texto de contacto */}
                  <span className="truncate">
                    {contacto.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Formulario de suscripción al boletín */}
            <form
              className="space-y-3"
              onSubmit={manejarEnvioBoletin}
            >
              <p
                className="
                  text-xs md:text-sm
                  text-pcm-muted
                  max-w-md
                "
              >
                Suscríbete para recibir novedades sobre mejoras, nuevas funciones
                y buenas prácticas de gestión de obra.
              </p>

              <div
                className="
                  flex flex-col sm:flex-row
                  gap-3
                  items-stretch
                "
              >
                {/* Wrapper con borde degradado para el input de correo */}
                <div
                  className="flex-1 rounded-xl"
                  style={{
                    padding: '1px',                           // Simula borde con gradiente.
                    backgroundImage:
                      'linear-gradient(120deg, #2F8DEE, #00B3C6, #FF9C2F)',
                  }}
                >
                  {/* Input controlado para el correo electrónico */}
                  <input
                    type="email"
                    value={correo}
                    onChange={(evento) => {
                      establecerCorreo(evento.target.value);   // Actualiza estado del correo.
                      if (mensajeRetroalimentacion) {          // Si había feedback previo:
                        establecerMensajeRetroalimentacion(null); // Se limpia al volver a escribir.
                      }
                    }}
                    placeholder="Tu correo electrónico"
                    className="
                      w-full
                      px-4 py-2.5
                      rounded-xl
                      border border-transparent
                      bg-pcm-surfaceSoft/80
                      text-pcm-text
                      placeholder-pcm-muted/80
                      focus:outline-none
                      focus:border-pcm-primary/80
                      focus:ring-2 focus:ring-pcm-primary/40
                      transition-all duration-300
                    "                                      // Fondo oscuro PCM, texto claro, placeholder más legible.
                  />
                </div>

                {/* Botón para enviar la suscripción */}
                <button
                  type="submit"
                  className="
                    px-5 py-2.5
                    rounded-xl
                    text-pcm-bg
                    text-sm font-semibold
                    shadow-pcm-soft
                    hover:-translate-y-0.5
                    hover:shadow-pcm-tab-glow
                    transition duration-300
                    disabled:opacity-50
                  "
                  style={{
                    backgroundImage:
                      'linear-gradient(120deg, #2F8DEE, #00B3C6, #FF9C2F)',
                  }}
                  disabled={!correo}
                >
                  Suscribirme
                </button>
              </div>

              {/* Mensaje de feedback (éxito / error) */}
              {mensajeRetroalimentacion && (
                <p
                  className={`
                    text-xs md:text-sm mt-1
                    ${
                      mensajeRetroalimentacion.type === 'success'
                        ? 'text-pcm-primary'
                        : 'text-pcm-accent'
                    }
                  `}
                  aria-live="polite"
                >
                  {mensajeRetroalimentacion.text}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Línea degradada decorativa antes de la franja inferior */}
        <div
          className="w-full h-px rounded-full opacity-80 mt-2"
          style={{
            backgroundImage:
              'linear-gradient(120deg, #2F8DEE, #00B3C6, #FF9C2F)',
          }}
        />

        {/* Franja inferior del footer (copyright y enlaces) */}
        <div
          className="
            pt-5 mt-4
            flex flex-col md:flex-row
            items-center justify-between
            gap-4
          "
        >
          {/* Texto de derechos reservados */}
          <div
            className="
              text-xs md:text-sm
              text-pcm-muted
            "
          >
            © {anioActual} ProCivil Manager. Todos los derechos reservados.
          </div>

          {/* Enlaces legales / de políticas */}
          <div
            className="
              flex flex-wrap
              items-center justify-center
              gap-3 md:gap-6
            "
          >
            {[
              'Términos de Servicio',
              'Política de Privacidad',
              'Cookies',
              'Seguridad',
            ].map((textoEnlace, indice) => (
              <a
                key={indice}
                href="#"
                className="
                  text-xs md:text-sm
                  text-pcm-muted
                  hover:text-pcm-primary
                  transition duration-300
                "
              >
                {textoEnlace}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

// Exporta el componente PieDePagina para usarlo en el layout principal.
export default PieDePagina;
