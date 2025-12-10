// File: frontend/src/shared/components/feedback/BannerMensajeSesion.jsx
// Description: Banner global flotante para mostrar mensajes de sesión,
//              como "Tu sesión expiró". Se posiciona debajo de la barra
//              de navegación fija y consume el contexto de mensajes de
//              sesión (ContextoMensajeSesion) para leer y limpiar el
//              mensaje cuando el usuario hace clic en "Cerrar". Usa la
//              paleta PCM (success, warning, danger, info) y un ícono
//              circular con degradado para reforzar visualmente el tipo.

import React from 'react';                                      // Importa React para poder definir el componente funcional.
import {                                                        // Importa el hook personalizado del contexto de mensajes de sesión.
  useMensajeSesion                                              // Hook que expone mensaje actual y funciones para gestionarlo.
} from '../../context/ContextoMensajeSesion.jsx';               // Contexto global de mensajes de sesión refactorizado en español.

// ================================
// Componente principal del banner
// ================================
// Muestra un aviso global cuando hay un mensaje de sesión activo en el contexto.
const BannerMensajeSesion = () => {                             // Declara el componente funcional del banner de mensaje de sesión.
  // Obtiene el mensaje actual de sesión y la función para limpiarlo desde el contexto global.
  const { mensajeSesion, limpiarMensajeSesion } = useMensajeSesion(); // Desestructura valores expuestos por el contexto.

  // Si no hay mensaje activo, no se renderiza nada (no ocupa espacio en la interfaz).
  if (!mensajeSesion) {                                         // Valida si mensajeSesion es nulo o indefinido.
    return null;                                                // Retorna null para no renderizar el banner.
  }

  // Desestructura tipo y texto del mensaje recibido desde el contexto.
  const { tipo, texto } = mensajeSesion;                        // Extrae el tipo y el texto del objeto mensajeSesion.

  // Determina clases de color según el tipo de mensaje (error, advertencia, éxito, info).
  let clasesColor = 'border-pcm-primary/70 bg-pcm-surfaceSoft/95 text-pcm-text'; // Estilo por defecto (info neutra PCM).
  let etiquetaTipo = 'Mensaje';                                 // Etiqueta genérica inicial del tipo de mensaje.
  let simboloIcono = 'ℹ️';                                      // Símbolo por defecto para mensajes informativos.
  let estiloIcono = {                                           // Estilo base del círculo del ícono con degradado PCM.
    backgroundImage:
      'linear-gradient(135deg, #2F8DEE, #00B3C6, #FF9C2F)',     // Degradado azul → turquesa → naranja.
  };

  // Ajusta colores, etiqueta y degradado del ícono según el tipo específico de mensaje.
  if (tipo === 'error') {                                       // Cuando el tipo es "error".
    clasesColor = 'border-pcm-danger/80 bg-pcm-surfaceSoft/95 text-pcm-text'; // Usa borde PCM de peligro.
    etiquetaTipo = 'Error';                                     // Etiqueta clara para errores.
    simboloIcono = '!';                                         // Símbolo de exclamación para error.
    estiloIcono = {                                             // Degradado cálido para errores.
      backgroundImage:
        'linear-gradient(135deg, #FF5A5F, #FF9C2F)',            // Rojo → naranja PCM.
    };
  } else if (tipo === 'advertencia') {                          // Cuando el tipo es "advertencia".
    clasesColor = 'border-pcm-warning/80 bg-pcm-surfaceSoft/95 text-pcm-text'; // Borde en tono de advertencia PCM.
    etiquetaTipo = 'Advertencia';                               // Etiqueta clara para advertencia.
    simboloIcono = '⚠️';                                        // Símbolo de advertencia.
    estiloIcono = {                                             // Degradado dorado para advertencias.
      backgroundImage:
        'linear-gradient(135deg, #FFCC3D, #FF9C2F)',            // Amarillo → naranja PCM.
    };
  } else if (tipo === 'exito') {                                // Cuando el tipo es "éxito".
    clasesColor = 'border-pcm-success/80 bg-pcm-surfaceSoft/95 text-pcm-text'; // Borde verde PCM para éxito.
    etiquetaTipo = 'Éxito';                                     // Etiqueta clara para éxito.
    simboloIcono = '✓';                                         // Símbolo de check para éxito.
    estiloIcono = {                                             // Degradado verdoso para éxitos.
      backgroundImage:
        'linear-gradient(135deg, #2CCB7C, #00B3C6)',            // Verde éxito → turquesa PCM.
    };
  } else if (tipo === 'info') {                                 // Cuando el tipo es "info".
    clasesColor = 'border-pcm-info/80 bg-pcm-surfaceSoft/95 text-pcm-text'; // Borde azul info PCM.
    etiquetaTipo = 'Información';                               // Etiqueta clara para información.
    simboloIcono = 'ℹ️';                                        // Mantiene símbolo informativo.
    estiloIcono = {                                             // Degradado frío para información.
      backgroundImage:
        'linear-gradient(135deg, #2F8DEE, #00B3C6)',            // Azul → turquesa PCM.
    };
  }

  // Renderiza el contenedor del banner posicionado de forma flotante y centrada.
  return (                                                      // Devuelve el JSX del banner.
    <div
      className={`
        fixed left-1/2 top-16 z-40 -translate-x-1/2
        w-full max-w-xl mx-4 sm:mx-0
        px-4 sm:px-6 py-3
        rounded-pcm-xl border shadow-pcm-suave backdrop-blur-md
        flex items-center gap-3 sm:gap-4 animate-slide-in-down-soft
        ${clasesColor}
      `}                                                         // Clases para posición, tamaño, estilo PCM y colores dinámicos.
    >
      {/* Ícono circular con degradado PCM que refuerza el tipo de mensaje */}
      <div
        className="mt-0.5 shrink-0 w-9 h-9 rounded-full border border-white/20 shadow-pcm-profunda flex items-center justify-center text-xs font-bold text-pcm-bg" // Círculo con borde, sombra y texto centrado.
        style={estiloIcono}                                      // Aplica el degradado específico según el tipo.
      >
        {simboloIcono}                                           {/* Símbolo asociado al tipo de mensaje (¡, ⚠️, ✓, ℹ️). */}
      </div>

      {/* Contenido textual del mensaje */}
      <div className="flex-1 min-w-0">                           {/* Columna principal que aloja el texto del banner. */}
        <p
          className="text-[11px] uppercase tracking-wide font-semibold opacity-90" // Línea superior con etiqueta del tipo.
        >
          {etiquetaTipo} de sesión                               {/* Etiqueta corta arriba del texto principal (Error, Éxito, etc.). */}
        </p>
        <p
          className="mt-1 text-xs sm:text-sm leading-snug line-clamp-3" // Texto principal con tamaño responsivo y máximo de 3 líneas.
        >
          {texto || 'Se produjo un evento en la sesión actual.'} {/* Texto del mensaje recibido desde el contexto o fallback genérico. */}
        </p>
      </div>

      {/* Acciones al lado derecho del banner */}
      <div className="flex items-center">                        {/* Contenedor de la acción de cierre del banner. */}
        {/* Botón para cerrar el banner manualmente */}
        <button
          type="button"                                          // Es un botón simple, no envía formularios.
          onClick={limpiarMensajeSesion}                         // Limpia el mensaje del contexto al hacer clic.
          className="
            ml-2 px-2.5 py-1 rounded-full
            text-[10px] sm:text-xs uppercase tracking-wide
            font-semibold text-pcm-text/80 hover:text-pcm-bg
            border border-white/15 hover:border-pcm-primary/80
            bg-pcm-surface/80 hover:bg-pcm-primary
            transition duration-200 hover:-translate-y-0.5
          "                                                      // Botón tipo pill con micro elevación y cambio de color en hover.
        >
          Cerrar                                                 {/* Texto del botón para cerrar el banner. */}
        </button>
      </div>
    </div>
  );
};

// Exporta el banner para incluirlo en App.jsx o en el layout principal.
export default BannerMensajeSesion;                             // Exportación por defecto del componente de banner de mensaje de sesión.
