// File: frontend/tailwind.config.js                           // Ruta del archivo de configuración principal de Tailwind.
// Description: Configuración de Tailwind CSS (modo compatibilidad v4) para el frontend
//              de ProCivil Manager con la NUEVA identidad visual inspirada en ingeniería
//              civil: paleta industrial (fondos oscuros, azules de control, naranjas de obra),
//              colores por rol, colores de estado, sombras, radios, fondos con degradado
//              y animaciones globales suaves y profesionales.

/** @type {import('tailwindcss').Config} */                    // Tipado de Tailwind para mejor soporte en el editor.
export default {                                               // Exportación por defecto de la configuración.
  content: [                                                   // Arreglo de archivos que Tailwind debe escanear.
    './index.html',                                            // HTML raíz del proyecto.
    './src/**/*.{js,jsx,ts,tsx}',                             // Todos los archivos JS/TS/React bajo src.
  ],                                                           // Fin de content.

  theme: {                                                     // Objeto principal del tema de Tailwind.
    extend: {                                                  // Usamos extend para sumar sobre el tema base.

      // ======================================================
      // 1. Colores de marca PCM (NUEVA PALETA COMPLETA)
      // ======================================================
      colors: {                                                // Sección de colores personalizados.
        pcm: {                                                 // Namespace de colores de marca PCM.
          // --------- Neutros / fondos ----------
          bg: '#050910',                                       // Fondo principal muy oscuro (sala de control).
          surface: '#0C1320',                                  // Fondo de secciones/paneles.
          surfaceSoft: '#121A2A',                              // Fondo de tarjetas suaves.
          card: '#121A2A',                                     // Alias específico para tarjetas (cards).
          borderSoft: '#232E40',                               // Borde sutil gris-azulado.

          // --------- Texto ----------
          text: '#F5F7FA',                                     // Texto principal (blanco suave).
          muted: '#A5B1C5',                                    // Texto secundario/descriptivo.
          disabled: '#647089',                                 // Texto deshabilitado/apagado.

          // --------- Marca base ----------
          primary: '#2F8DEE',                                  // Azul ingeniería (color principal).
          primaryDark: '#1B4F8F',                              // Azul más oscuro (hover/bordes).
          primarySoft: '#173656',                              // Azul muy suave (fondos sutiles).

          secondary: '#FF9C2F',                                // Naranja de obra (CTAs, acciones clave).
          secondaryDark: '#CC6D12',                            // Naranja más oscuro (hover/bordes).
          accent: '#00B3C6',                                   // Turquesa (agua/redes/sostenibilidad).

          // --------- Estados SGI / alertas ----------
          success: '#2CCB7C',                                  // Verde éxito (aprobado/completado).
          warning: '#FFCC3D',                                  // Amarillo advertencia (riesgo/retraso).
          danger: '#FF5A5F',                                   // Rojo peligro/error crítico.
          info: '#4AA8FF',                                     // Azul info (notificación neutra).

          // --------- Colores por rol ----------
          roleAdmin: '#2F8DEE',                                // Administrador (azul control).
          roleLider: '#FF9C2F',                                // Líder de obra (naranja campo).
          roleCliente: '#00B894',                              // Cliente/copropiedad (verde tranquilidad).
          roleAuditor: '#9B59B6',                              // Auditor/SGI (morado revisión).
        },                                                     // Fin de pcm.
      },                                                       // Fin de colors.

      // ======================================================
      // 2. Sombras personalizadas (cards, paneles, tabs)
      // ======================================================
      boxShadow: {                                             // Sección de sombras personalizadas.
        'pcm-suave': '0 12px 30px rgba(5, 9, 16, 0.85)',       // Sombra suave para tarjetas y paneles pequeños.
        'pcm-profunda': '0 18px 45px rgba(1, 4, 10, 0.9)',     // Sombra profunda para modales/cards destacadas.
        'pcm-tabs':
          '0 0 0 1px rgba(47,141,238,0.8), 0 0 22px rgba(47,141,238,0.45)', // Glow para pestañas/burbujas activas.
      },                                                       // Fin de boxShadow.

      // ======================================================
      // 3. Radios de borde personalizados
      // ======================================================
      borderRadius: {                                          // Sección de radios de borde.
        'pcm-xl': '1.5rem',                                    // Radio grande PCM para tarjetas/modales.
        'pcm-xxl': '2rem',                                     // Para cards muy redondeadas (contacto, modales especiales, etc.).
      },                                                       // Fin de borderRadius.

      // ======================================================
      // 4. Tamaños utilitarios (ej. íconos/badges)
      // ======================================================
      width: {                                                 // Anchos personalizados.
        15: '3.75rem',                                         // Ancho 15 (~60px), útil para iconos o chips.
        30: '7.5rem',                                          // Ancho 30 (~120px), para tarjetas compactas.
      },                                                       // Fin de width.
      height: {                                                // Altos personalizados.
        15: '3.75rem',                                         // Alto 15 (pareja con width 15).
        30: '7.5rem',                                          // Alto 30 (pareja con width 30).
      },                                                       // Fin de height.

      // ======================================================
      // 5. Fuente base para clases font-sans
      // ======================================================
      fontFamily: {                                            // Sección de familias tipográficas.
        sans: [                                                // Familia base para font-sans.
          'system-ui',                                         // Fuente del sistema.
          '-apple-system',                                     // Fuente para sistemas Apple.
          'BlinkMacSystemFont',                                // Fuente para Blink/WebKit.
          '"Segoe UI"',                                        // Fuente típica en Windows.
          'sans-serif',                                        // Fallback genérico sans-serif.
        ],                                                     // Fin del arreglo de fuentes.
      },                                                       // Fin de fontFamily.

      // ======================================================
      // 6. Transiciones (duración, timing, propiedades)
      // ======================================================
      transitionDuration: {                                    // Duraciones de transición personalizadas.
        'pcm-rapida': '150ms',                                 // Transición rápida (microinteracciones).
        'pcm-media': '250ms',                                  // Transición estándar.
        'pcm-lenta': '400ms',                                  // Transición un poco más lenta.
      },                                                       // Fin de transitionDuration.

      transitionTimingFunction: {                              // Curvas de animación personalizadas.
        'pcm-suave': 'cubic-bezier(0.22, 0.61, 0.36, 1)',      // Curva suave tipo ease-out.
        'pcm-elastica': 'cubic-bezier(0.34, 1.56, 0.64, 1)',   // Curva con leve rebote/elástico.
      },                                                       // Fin de transitionTimingFunction.

      transitionProperty: {                                    // Grupo de propiedades a transicionar juntas.
        'pcm-tab':
          'left, right, width, transform, background-color, color, box-shadow', // Ideal para pestañas/burbujas.
      },                                                       // Fin de transitionProperty.

      maxWidth: {                                              // Anchos máximos personalizados.
        'pcm-nombre-usuario': '9rem',                          // Límite para el texto del nombre en la barra pública.
      },                                                       // Fin de maxWidth.

      // ======================================================
      // 7. Fondos con degradado (hero, panel, cards especiales)
      // ======================================================
      backgroundImage: {                                       // Fondos personalizados con gradientes.
        'pcm-hero-ingenieria':
          // Fondo para secciones tipo hero de la landing.
          'radial-gradient(circle at top, rgba(47,141,238,0.32), transparent 65%),' +
          'radial-gradient(circle at bottom, rgba(255,156,47,0.20), transparent 60%),' +
          'linear-gradient(135deg, #050910, #050910, #0C1320)',
        'pcm-panel-control':
          // Fondo para el área principal del dashboard (panel de control).
          'radial-gradient(circle at top left, rgba(0,179,198,0.22), transparent 55%),' +
          'radial-gradient(circle at bottom right, rgba(47,141,238,0.26), transparent 55%),' +
          'linear-gradient(135deg, #050910, #050910, #0C1320)',
        'pcm-card-resaltada':
          // Fondo sutil para tarjetas especiales/KPIs.
          'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        'pcm-estado-riesgo':
          // Fondo para tarjetas/chips de proyectos en riesgo.
          'linear-gradient(135deg, rgba(255,90,95,0.95), rgba(255,156,47,0.95))',
      },                                                       // Fin de backgroundImage.

      // ======================================================
      // 8. Keyframes (animaciones base + toasts/accordion + borde)
      // ======================================================
      keyframes: {                                             // Definición de keyframes personalizados.
        'entrada-suave-arriba': {                              // Entrada con fade + desplazamiento desde abajo.
          '0%': { opacity: '0', transform: 'translateY(16px)' }, // Inicio: más abajo y transparente.
          '100%': { opacity: '1', transform: 'translateY(0)' },  // Final: visible en posición.
        },                                                     // Fin de entrada-suave-arriba.

        'entrada-suave-abajo': {                               // Entrada con fade + desplazamiento desde arriba.
          '0%': { opacity: '0', transform: 'translateY(-16px)' }, // Inicio: más arriba y transparente.
          '100%': { opacity: '1', transform: 'translateY(0)' },   // Final: visible en posición.
        },                                                     // Fin de entrada-suave-abajo.

        'flotar-lento': {                                      // Flotación vertical lenta.
          '0%': { transform: 'translateY(0)' },                // Inicio: posición base.
          '50%': { transform: 'translateY(-8px)' },            // Mitad: sube ligeramente.
          '100%': { transform: 'translateY(0)' },              // Fin: vuelve a la base.
        },                                                     // Fin de flotar-lento.

        'pagina-in': {                                         // Entrada general de página.
          '0%': { opacity: '0', transform: 'translateY(12px)' }, // Inicio: un poco más abajo y transparente.
          '100%': { opacity: '1', transform: 'translateY(0)' },  // Fin: visible en posición.
        },                                                     // Fin de pagina-in.

        'resplandor-pulso': {                                  // Pulso suave de opacidad (para glows).
          '0%, 100%': { opacity: '0.6' },                      // Bordes del ciclo: opacidad media.
          '50%': { opacity: '1' },                             // Mitad: más brillante.
        },                                                     // Fin de resplandor-pulso.

        'skeleton-pulse': {                                    // Efecto skeleton para cargas.
          '0%': { opacity: '0.6' },                            // Inicio: opacidad media.
          '50%': { opacity: '1' },                             // Mitad: más visible.
          '100%': { opacity: '0.6' },                          // Fin: vuelve a media.
        },                                                     // Fin de skeleton-pulse.

        shimmer: {                                             // Efecto shimmer para la barra de carga del hero.
          '0%': { backgroundPosition: '0% 0%' },               // Inicio: degradado a la izquierda.
          '100%': { backgroundPosition: '200% 0%' },           // Final: desplazado a la derecha.
        },                                                     // Fin de shimmer.

        'toast-in-right': {                                    // Entrada de toast desde la derecha.
          '0%': { opacity: '0', transform: 'translateX(40px)' }, // Inicio: desplazado a la derecha.
          '100%': { opacity: '1', transform: 'translateX(0)' },  // Fin: en posición y visible.
        },                                                     // Fin de toast-in-right.

        'toast-out-right': {                                   // Salida de toast hacia la derecha.
          '0%': { opacity: '1', transform: 'translateX(0)' },  // Inicio: visible en posición.
          '100%': { opacity: '0', transform: 'translateX(40px)' }, // Fin: desplazado y transparente.
        },                                                     // Fin de toast-out-right.

        'accordion-down': {                                    // Apertura de acordeón (desplegable).
          '0%': { height: '0', opacity: '0' },                 // Inicio: altura 0 e invisible.
          '100%': { height: 'var(--pcm-altura-acordeon)', opacity: '1' }, // Fin: altura definida y visible.
        },                                                     // Fin de accordion-down.

        'accordion-up': {                                      // Cierre de acordeón.
          '0%': { height: 'var(--pcm-altura-acordeon)', opacity: '1' }, // Inicio: totalmente abierto.
          '100%': { height: '0', opacity: '0' },               // Fin: altura 0 e invisible.
        },                                                     // Fin de accordion-up.

        'pcm-border-flow': {                                   // Giro continuo para el borde degradado animado.
          '0%': { transform: 'rotate(0deg)' },                 // Inicio: sin rotación.
          '100%': { transform: 'rotate(360deg)' },             // Fin: un giro completo.
        },                                                     // Fin de pcm-border-flow.
      },                                                       // Fin de keyframes.

      // ======================================================
      // 9. Alias de animaciones (clases animate-*)
      // ======================================================
      animation: {                                             // Mapa de nombres a animación completa.
        'entrada-suave-arriba':
          'entrada-suave-arriba 0.4s ease-out forwards',       // Clase: animate-entrada-suave-arriba.
        'entrada-suave-abajo':
          'entrada-suave-abajo 0.4s ease-out forwards',        // Clase: animate-entrada-suave-abajo.
        'flotar-lento':
          'flotar-lento 6s ease-in-out infinite',              // Clase: animate-flotar-lento.
        'pagina-in':
          'pagina-in 0.5s ease-out forwards',                  // Clase: animate-pagina-in.
        'resplandor-pulso':
          'resplandor-pulso 2s ease-in-out infinite',          // Clase: animate-resplandor-pulso.
        'skeleton-pulse':
          'skeleton-pulse 1.5s ease-in-out infinite',          // Clase: animate-skeleton-pulse.
        shimmer:
          'shimmer 1.3s linear infinite',                      // Clase: animate-shimmer (barra de carga del hero).
        'toast-in-right':
          'toast-in-right 0.3s ease-out forwards',             // Clase: animate-toast-in-right.
        'toast-out-right':
          'toast-out-right 0.25s ease-in forwards',            // Clase: animate-toast-out-right.
        'accordion-down':
          'accordion-down 0.2s ease-out forwards',             // Clase: animate-accordion-down.
        'accordion-up':
          'accordion-up 0.2s ease-in forwards',                // Clase: animate-accordion-up.
        'pcm-border-flow':
          'pcm-border-flow 8s linear infinite',                // Clase: animate-pcm-border-flow.

        // ===== Alias nuevos para las clases que ya usamos en JSX =====
        'fade-in-up':
          'entrada-suave-arriba 0.45s ease-out forwards',      // Permite usar animate-fade-in-up (hero, secciones contacto).
        'fade-in-down':
          'entrada-suave-abajo 0.45s ease-out forwards',       // Permite usar animate-fade-in-down.
        'page-in':
          'pagina-in 0.5s ease-out forwards',                  // Permite usar animate-page-in para transiciones de página.

        // Alias de flotación con distintas velocidades (burbujas decorativas).
        'float-slow':
          'flotar-lento 8s ease-in-out infinite',              // Burbujas flotando lentamente.
        'float-medium':
          'flotar-lento 5s ease-in-out infinite',              // Versión un poco más rápida.
        'float-fast':
          'flotar-lento 3.5s ease-in-out infinite',            // Versión rápida para detalles pequeños.
      },                                                       // Fin de animation.
    },                                                         // Fin de theme.extend.
  },                                                           // Fin de theme.

  plugins: [],                                                 // Lista de plugins de Tailwind (vacío por ahora).
};                                                             // Fin de la exportación de configuración.
