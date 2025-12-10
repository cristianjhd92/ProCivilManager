// File: frontend/src/shared/components/routing/RutaAdmin.jsx               // Ruta del archivo dentro del frontend de PCM.
// Description: Componente de protección de rutas internas para PCM.       // Valida sesión y rol antes de mostrar vistas protegidas.
//              Verifica que exista token + usuario en localStorage y que  // Comprueba autenticación básica y permisos por rol.
//              el rol del usuario esté dentro de una lista de roles       // Solo permite acceso a los roles definidos como permitidos.
//              permitidos. Si falla algo, muestra mensajes de alerta      // Renderiza una alerta visual alineada al tema PCM.
//              alineados visualmente con el tema PCM.                     // Usa sombras y colores personalizados de ProCivil Manager.

import React from 'react';                                                 // Importa React para poder usar JSX en este archivo.

// ============================================================================
// Función auxiliar: normalizar roles
// ============================================================================
// Convierte el rol a minúsculas y sin espacios sobrantes para comparar de forma consistente.
const normalizarRol = (rol) => {                                           // Declara la función normalizarRol que recibe un rol.
  if (typeof rol !== 'string') return '';                                  // Si el valor recibido no es un string, devuelve cadena vacía como fallback.
  return rol.toLowerCase().trim();                                         // Devuelve el rol en minúsculas y sin espacios al inicio o al final.
};

// ============================================================================
// Componente MensajeAlerta
// ============================================================================
// Muestra un cuadro de alerta estilizado según el tipo: error, advertencia,
// información o éxito. Se alinea visualmente con el tema PCM y añade una
// animación suave de entrada para hacerlo más llamativo y claro para el usuario.
const MensajeAlerta = ({                                                   // Declara el componente funcional MensajeAlerta.
  tipo = 'info',                                                           // Tipo de alerta (por defecto "info").
  titulo,                                                                  // Título opcional que se mostrará en la parte superior del mensaje.
  children,                                                                // Contenido principal del mensaje (texto de la alerta).
  className = ''                                                           // Clases extra opcionales para extender estilos desde fuera.
}) => {
  // Diccionario de estilos e íconos según el tipo de alerta,
  // usando directamente la paleta PCM (danger, warning, success, primary).
  const estilos = {                                                        // Objeto que mapea el tipo de alerta a estilos y contenido por defecto.
    error: {                                                               // Configuración visual y textual para tipo "error".
      bg: 'bg-pcm-danger/5',                                              // Fondo PCM rojo muy tenue.
      border: 'border-pcm-danger/60',                                     // Borde PCM rojo translúcido que marca el contorno.
      accent: 'bg-pcm-danger',                                            // Color para la barra/acento lateral.
      text: 'text-pcm-danger',                                            // Color principal de texto para el mensaje.
      tituloPorDefecto: 'Error',                                          // Título por defecto para mensajes de error.
      icono: (                                                            // Ícono SVG de "X" que representa error.
        <svg
          className="w-5 h-5 text-pcm-danger"                             // Tamaño del ícono y color rojo PCM.
          fill="none"                                                     // Sin relleno sólido, solo contorno.
          stroke="currentColor"                                           // Usa el color actual de texto.
          strokeWidth={2}                                                 // Grosor de la línea del ícono.
          viewBox="0 0 24 24"                                             // ViewBox estándar 24x24.
        >
          <path
            strokeLinecap="round"                                         // Extremos redondeados en la línea.
            strokeLinejoin="round"                                        // Uniones redondeadas en las intersecciones.
            d="M6 18L18 6M6 6l12 12"                                     // Trazo en forma de X.
          />
        </svg>
      )
    },
    warning: {                                                            // Configuración visual y textual para tipo "warning".
      bg: 'bg-pcm-warning/5',                                             // Fondo PCM amarillo muy tenue.
      border: 'border-pcm-warning/60',                                    // Borde PCM amarillo translúcido.
      accent: 'bg-pcm-warning',                                           // Color de acento lateral.
      text: 'text-pcm-warning',                                           // Color de texto principal.
      tituloPorDefecto: 'Advertencia',                                    // Título por defecto para advertencias.
      icono: (                                                            // Ícono SVG de signo de exclamación.
        <svg
          className="w-5 h-5 text-pcm-warning"                            // Tamaño y color del ícono.
          fill="none"                                                     // Sin relleno sólido.
          stroke="currentColor"                                           // Usa el color actual de texto.
          strokeWidth={2}                                                 // Grosor de la línea.
          viewBox="0 0 24 24"                                             // ViewBox estándar 24x24.
        >
          <path
            strokeLinecap="round"                                         // Extremos redondeados.
            strokeLinejoin="round"                                        // Uniones redondeadas.
            d="M12 9v2m0 4h.01M4.93 19.07a10 10 0 1114.14 0 10 10 0 01-14.14 0z" // Círculo con signo de exclamación.
          />
        </svg>
      )
    },
    info: {                                                               // Configuración visual y textual para tipo "info".
      bg: 'bg-pcm-primary/5',                                             // Fondo PCM azul muy tenue.
      border: 'border-pcm-primary/60',                                    // Borde PCM azul translúcido.
      accent: 'bg-pcm-primary',                                           // Color de acento lateral.
      text: 'text-pcm-primary',                                           // Color de texto principal.
      tituloPorDefecto: 'Información',                                    // Título por defecto para mensajes informativos.
      icono: (                                                            // Ícono SVG de información.
        <svg
          className="w-5 h-5 text-pcm-primary"                            // Tamaño y color del ícono.
          fill="none"                                                     // Sin relleno sólido.
          stroke="currentColor"                                           // Usa el color actual de texto.
          strokeWidth={2}                                                 // Grosor de la línea.
          viewBox="0 0 24 24"                                             // ViewBox estándar 24x24.
        >
          <path
            strokeLinecap="round"                                         // Extremos redondeados.
            strokeLinejoin="round"                                        // Uniones redondeadas.
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" // Círculo con letra "i".
          />
        </svg>
      )
    },
    success: {                                                            // Configuración visual y textual para tipo "success".
      bg: 'bg-pcm-success/5',                                             // Fondo PCM verde tenue.
      border: 'border-pcm-success/60',                                    // Borde PCM verde translúcido.
      accent: 'bg-pcm-success',                                           // Color de acento lateral.
      text: 'text-pcm-success',                                           // Color de texto principal.
      tituloPorDefecto: 'Operación exitosa',                              // Título por defecto para mensajes de éxito.
      icono: (                                                            // Ícono SVG de check (✔).
        <svg
          className="w-5 h-5 text-pcm-success"                            // Tamaño y color del ícono.
          fill="none"                                                     // Sin relleno.
          stroke="currentColor"                                           // Usa el color actual de texto.
          strokeWidth={2}                                                 // Grosor de la línea.
          viewBox="0 0 24 24"                                             // ViewBox estándar 24x24.
        >
          <path
            strokeLinecap="round"                                         // Extremos redondeados.
            strokeLinejoin="round"                                        // Uniones redondeadas.
            d="M5 13l4 4L19 7"                                           // Trazo en forma de check.
          />
        </svg>
      )
    }
  };

  const estiloSeleccionado = estilos[tipo] || estilos.info;               // Si el tipo no es válido, usa configuración de "info" como fallback.
  const tituloResuelto = titulo || estiloSeleccionado.tituloPorDefecto;   // Usa el título recibido o el título por defecto del tipo.

  return (
    <div
      className={                                                         // Asigna clases Tailwind al contenedor principal de la alerta.
        [
          'relative flex items-start gap-3 p-4',                          // Layout base: fila, espacio entre ítems y padding interno.
          'rounded-pcm-xl border font-medium shadow-pcm-suave',           // Forma y estilo global: borde, sombra PCM y radio personalizado.
          'bg-pcm-surfaceSoft/90 backdrop-blur-xl',                       // Fondo suave PCM + blur para sensación de tarjeta flotante.
          'animate-fade-in-soft',                                         // Animación suave de entrada.
          estiloSeleccionado.bg,                                          // Fondo adicional según el tipo específico.
          estiloSeleccionado.border,                                      // Borde de color según el tipo.
          estiloSeleccionado.text,                                        // Color de texto según el tipo.
          className                                                       // Clases adicionales que se pasen desde el exterior.
        ].join(' ')                                                       // Une todas las clases en un solo string.
      }
      role="alert"                                                        // Atributo ARIA para que los lectores de pantalla lo traten como alerta.
    >
      <div
        className={                                                       // Barra/acento vertical en el costado izquierdo.
          [
            'absolute left-0 top-0 h-full w-1 rounded-l-pcm-xl',          // Ocupa toda la altura, pequeño ancho, bordes redondeados a la izquierda.
            estiloSeleccionado.accent                                     // Color de acento según el tipo de alerta.
          ].join(' ')
        }
      />

      <div className="shrink-0 mt-0.5">                                   {/* Contenedor del ícono, evita que se encoja (usa shrink-0). */}
        {estiloSeleccionado.icono}                                        {/* Ícono correspondiente al tipo de alerta. */}
      </div>

      <div className="flex-1 space-y-1 ml-1">                             {/* Contenedor para título y mensaje, ocupa el espacio restante. */}
        {tituloResuelto && (                                              // Solo muestra el título si hay algo que mostrar.
          <p className="text-sm md:text-base font-semibold leading-snug">
            {tituloResuelto}                                              {/* Título principal de la alerta. */}
          </p>
        )}

        <span className="block text-xs md:text-sm leading-relaxed text-pcm-text">
          {children}                                                      {/* Mensaje pasado como children, con tipografía clara y legible. */}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Componente principal: RutaAdmin
// ============================================================================
// Envuelve rutas o vistas que solo pueden ser accedidas por ciertos roles.
// Valida autenticación básica (token + usuario) y permisos de rol antes de
// renderizar el contenido protegido que se reciba como children.
const RutaAdmin = ({                                                      // Declara el componente funcional RutaAdmin.
  children,                                                               // Contenido protegido que se desea mostrar si pasa las validaciones.
  rolesPermitidos                                                         // Lista de roles permitidos para esta ruta (arreglo de strings).
}) => {
  const token = localStorage.getItem('token');                            // Obtiene el token (por ejemplo, JWT) desde localStorage, si existe.
  const usuarioCadena = localStorage.getItem('user');                     // Obtiene el objeto "user" serializado en formato JSON, si existe.

  // Si no hay token o no hay información de usuario, se pide que inicie sesión.
  if (!token || !usuarioCadena) {                                         // Verifica presencia de token y datos de usuario.
    return (                                                              // Si falta cualquiera de los dos, se muestra alerta de advertencia.
      <MensajeAlerta
        tipo="warning"                                                    // Tipo de alerta: advertencia.
        titulo="Sesión requerida"                                         // Título del mensaje.
        className="mt-16 max-w-xl mx-auto"                                // Centra la tarjeta en la página, con margen superior.
      >
        Por favor, inicia sesión para continuar y acceder a esta sección del sistema.
      </MensajeAlerta>
    );
  }

  let usuario;                                                            // Variable donde almacenaremos el usuario parseado desde el JSON.

  try {
    usuario = JSON.parse(usuarioCadena);                                  // Intenta convertir el string JSON de localStorage a un objeto JavaScript.
  } catch (error) {                                                       // Si ocurre un error al parsear el JSON...
    return (                                                              // ...se asume que los datos están corruptos y se muestra una alerta de error.
      <MensajeAlerta
        tipo="error"                                                      // Tipo de alerta: error.
        className="mt-16 max-w-xl mx-auto"                                // Centrado con margen superior.
      >
        Error de autenticación. Por favor, cierra sesión en tu navegador e inicia sesión nuevamente.
      </MensajeAlerta>
    );
  }

  // Lista de roles permitidos.
  // Si no viene rolesPermitidos, se usa una lista por defecto coherente con PCM.
  const listaRolesPermitidos =
    Array.isArray(rolesPermitidos) && rolesPermitidos.length > 0         // Verifica si rolesPermitidos es un arreglo no vacío.
      ? rolesPermitidos                                                 // Si lo es, usa la lista proporcionada por el componente padre.
      : ['admin', 'lider de obra', 'lider', 'cliente'];                 // Si no, usa roles por defecto definidos para PCM.

  const rolUsuarioNormalizado = normalizarRol(usuario.role);             // Normaliza el rol del usuario para hacer comparación segura.
  const rolesPermitidosNormalizados = listaRolesPermitidos.map(normalizarRol); // Normaliza también todos los roles permitidos.

  // Validar si el rol del usuario existe y está dentro de los permitidos.
  if (!rolUsuarioNormalizado || !rolesPermitidosNormalizados.includes(rolUsuarioNormalizado)) {
    // Si el usuario no tiene rol o su rol no está autorizado, se muestra mensaje de acceso denegado.
    return (
      <MensajeAlerta
        tipo="error"                                                     // Tipo de alerta: error.
        titulo="Acceso denegado"                                         // Título específico para esta situación.
        className="mt-16 max-w-xl mx-auto"                               // Tarjeta centrada para mantener coherencia visual.
      >
        No tienes permiso para acceder a esta sección. Si consideras que esto es un error,
        por favor contacta al administrador del sistema ProCivil Manager.
      </MensajeAlerta>
    );
  }

  // Si llega aquí: usuario autenticado y con rol permitido.
  // Se renderiza el contenido hijo (children), que normalmente será un componente de página.
  return children;                                                       // Devuelve el contenido protegido porque pasó todas las validaciones.
};

// Exportación por defecto y exportaciones nombradas para reutilizar utilidades.
export default RutaAdmin;                                                // Exporta RutaAdmin como exportación por defecto para usarlo en las rutas.
export {
  MensajeAlerta,                                                         // Componente de alerta reutilizable en otras partes del sistema.
  normalizarRol                                                          // Función auxiliar para normalizar roles de usuario.
};
