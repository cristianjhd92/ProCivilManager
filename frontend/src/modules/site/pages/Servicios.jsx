// File: frontend/src/modules/site/pages/Servicios.jsx
// Description: Página pública de servicios de ProCivil Manager (PCM).
//              Muestra un hero principal con mensaje de valor para el sector
//              construcción en Colombia, un grid de servicios profesionales,
//              el proceso de trabajo y una sección de llamado a la acción.
//              Usa IntersectionObserver para animar secciones al hacer scroll
//              y mantiene la línea visual del Inicio (fondos PCM, degradados,
//              botones naranjas y microinteracciones en hover).

// =========================
// Importaciones principales
// =========================
import React, { useState, useEffect } from 'react';                  // Importa React y los hooks useState/useEffect para estado y efectos.
import { Link } from 'react-router-dom';                             // Importa Link para navegación interna tipo SPA.

// Importa componentes de layout público globales.
import EncabezadoPrincipal from '../../../shared/components/layout/BarraNavegacionPublica'; // Cabecera / barra de navegación principal.
import PieDePaginaPrincipal from '../../../shared/components/layout/PieDePagina';           // Pie de página global público.

// ========================================
// Componente principal de la página de servicios
// ========================================
const Servicios = () => {                                            // Declara el componente funcional principal de la página.
  // =====================================================
  // ESTADO PARA CONTROLAR ANIMACIONES DE SECCIONES (SCROLL)
  // =====================================================
  const [seccionesVisibles, setSeccionesVisibles] = useState(        // Estado con el conjunto de secciones que ya se mostraron.
    new Set(),                                                       // Arranca vacío para que las secciones entren con animación.
  );

  // =====================================================
  // LISTA DE SERVICIOS A MOSTRAR EN EL GRID PRINCIPAL
  // =====================================================
  const servicios = [                                                // Arreglo con la información de cada servicio profesional.
    {
      id: 'planificacion',                                           // ID único del servicio (podría usarse como ancla).
      icono: '📐',                                                   // Emoji representativo del servicio.
      titulo: 'Planificación y diseño',                              // Título del servicio.
      descripcion:                                                   // Descripción corta del alcance.
        'Desarrollo de planos, especificaciones técnicas y cronogramas de trabajo optimizados para cada proyecto.',
      caracteristicas: [                                             // Lista de puntos incluidos en el servicio.
        'Diseño arquitectónico y estructural',
        'Cronogramas detallados con dependencias',
        'Análisis de riesgos y contingencias',
        'Optimización de recursos y materiales',
      ],
    },
    {
      id: 'gestion',                                                 // Servicio de gestión de obra.
      icono: '🏗️',                                                  // Emoji asociado a obra civil.
      titulo: 'Gestión de obra',                                     // Título del servicio.
      descripcion:                                                   // Descripción corta.
        'Supervisión completa del proyecto desde el inicio hasta la entrega, garantizando calidad y cumplimiento de plazos.',
      caracteristicas: [
        'Supervisión técnica especializada',
        'Control de calidad en tiempo real',
        'Coordinación de contratistas',
        'Seguimiento de avance diario',
      ],
    },
    {
      id: 'presupuestos',                                            // Servicio de control económico.
      icono: '💰',                                                   // Emoji relacionado con finanzas.
      titulo: 'Control de presupuestos',                             // Título del servicio.
      descripcion:
        'Análisis financiero detallado y control de costos para mantener tu proyecto dentro del presupuesto establecido.',
      caracteristicas: [
        'Elaboración de presupuestos detallados',
        'Control de gastos en tiempo real',
        'Análisis de variaciones de costo',
        'Reportes financieros automáticos',
      ],
    },
    {
      id: 'consultoria',                                             // Servicio de consultoría.
      icono: '🎯',                                                   // Emoji de objetivo/logro.
      titulo: 'Consultoría especializada',                           // Título del servicio.
      descripcion:
        'Asesoría técnica para optimizar procesos, resolver problemas complejos y mejorar la eficiencia de tu operación.',
      caracteristicas: [
        'Auditorías de procesos constructivos',
        'Optimización de metodologías de trabajo',
        'Resolución de problemas técnicos',
        'Capacitación de equipos',
      ],
    },
    {
      id: 'tecnologia',                                              // Servicio de soluciones tecnológicas.
      icono: '📱',                                                   // Emoji de tecnología.
      titulo: 'Soluciones tecnológicas',                             // Título del servicio.
      descripcion:
        'Implementación de herramientas digitales para modernizar y optimizar tus procesos constructivos y de gestión.',
      caracteristicas: [
        'Software de gestión personalizado',
        'Aplicaciones móviles para campo',
        'Integración con drones y modelos BIM',
        'Automatización de reportes y tableros',
      ],
    },
    {
      id: 'mantenimiento',                                           // Servicio de mantenimiento post-entrega.
      icono: '🔧',                                                   // Emoji de herramienta.
      titulo: 'Mantenimiento post-entrega',                          // Título del servicio.
      descripcion:
        'Servicios de mantenimiento y soporte continuo para garantizar la durabilidad y funcionamiento óptimo de tus obras.',
      caracteristicas: [
        'Programas de mantenimiento preventivo',
        'Soporte técnico 24/7',
        'Gestión de garantías',
        'Actualizaciones y mejoras programadas',
      ],
    },
  ];

  // =====================================================
  // EFECTO: CONFIGURA INTERSECTION OBSERVER PARA FADE-IN
  // =====================================================
  useEffect(() => {                                                  // Efecto que se ejecuta una sola vez al montar el componente.
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;                                                        // Protección para entornos sin DOM (SSR, pruebas).
    }

    const observador = new IntersectionObserver(                     // Crea el IntersectionObserver.
      (entradas) => {                                                // Callback cuando cambian las intersecciones.
        entradas.forEach((entrada) => {                              // Recorre cada entrada observada.
          if (entrada.isIntersecting) {                              // Si la sección está entrando al viewport.
            setSeccionesVisibles((estadoPrevio) => {                 // Actualiza el estado de secciones visibles.
              const siguiente = new Set(estadoPrevio);               // Crea un nuevo Set (no muta el anterior).
              siguiente.add(entrada.target.id);                      // Agrega el id de la sección visible.
              return siguiente;                                      // Retorna el nuevo Set para actualizar el estado.
            });
          }
        });
      },
      {
        threshold: 0.1,                                              // Con que el 10 % sea visible, se dispara.
        rootMargin: '0px 0px -50px 0px',                             // Margen inferior para disparar un poco antes de salir.
      },
    );

    const secciones = document.querySelectorAll('[data-fade-in]');   // Selecciona las secciones marcadas con data-fade-in.
    secciones.forEach((seccion) => observador.observe(seccion));     // Registra cada sección en el observer.

    return () => {                                                   // Función de limpieza del efecto.
      observador.disconnect();                                       // Desconecta el observer para evitar fugas.
    };
  }, []);                                                            // Solo se ejecuta al montar.

  // ==========================
  // RENDER PRINCIPAL DE LA PÁGINA
  // ==========================
  return (
    // Contenedor raíz de la página de servicios.
    <div
      className="
        pcm-page                         /* Fondo base PCM con halos.                   */
        font-sans leading-relaxed        /* Fuente sans y lectura cómoda.              */
        text-pcm-text                    /* Color de texto principal PCM.              */
        overflow-x-hidden                /* Evita scroll horizontal accidental.        */
      "
    >
      {/* Cabecera de navegación principal de la landing pública */}
      <EncabezadoPrincipal />

      {/* Contenido principal de la página */}
      <main className="pt-24 md:pt-28">{/* Padding-top para compensar la barra fija. */ }

        {/* ==========================
            HERO PRINCIPAL DE SERVICIOS
           ========================== */}
        <section
          className="
            relative
            min-h-[calc(100vh-6rem)]
            pcm-fondo-degradado-principal
            flex items-center
            overflow-hidden
          "                                                           // Hero casi a pantalla completa con degradado PCM.
        >
          {/* Fondo de grid sutil con SVG inline y leve pulso (misma vibra que Inicio) */}
          <div
            className="
              absolute inset-0
              opacity-20
              animate-pulse
            "
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='gridServicios' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(148,163,184,0.35)' stroke-width='0.6'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23gridServicios)'/%3E%3C/svg%3E")`, // Cuadrícula tipo plano.
            }}
          />

          {/* Círculos flotantes decorativos reutilizando la paleta PCM */}
          <div
            className="
              absolute w-32 h-32
              bg-pcm-primary/35 rounded-full
              top-[22%] left-[10%]
              animate-flotar-lento
              blur-sm
            "
          />
          <div
            className="
              absolute w-40 h-40
              bg-pcm-secondary/40 rounded-full
              bottom-[18%] right-[14%]
              animate-flotar-lento
              blur-[2px]
            "
          />
          <div
            className="
              absolute w-20 h-20
              bg-pcm-accent/35 rounded-full
              bottom-[26%] left-[22%]
              animate-flotar-lento
            "
          />

          {/* Contenido centrado del hero */}
          <div className="pcm-container text-center relative z-10">
            <div className="text-white animate-entrada-suave-arriba">
              {/* Título principal del hero */}
              <h1 className="text-4xl md:text-5xl lg:text-[3.1rem] font-bold mb-6 leading-tight">
                Nuestros{' '}
                <span
                  className="
                    bg-clip-text text-transparent
                    font-semibold
                  "
                  style={{
                    backgroundImage:
                      'linear-gradient(120deg, #FF9C2F, #FACC6B, #2F8DEE)', // Mismo degradado de “servicios” del Inicio.
                  }}
                >
                  servicios
                </span>{' '}
                especializados
              </h1>

              {/* Subtítulo descriptivo del hero */}
              <p className="text-base md:text-lg text-slate-200 leading-relaxed max-w-4xl mx-auto">
                Ofrecemos soluciones integrales para la gestión de proyectos de construcción
                en Colombia, desde la planificación inicial hasta el mantenimiento post-entrega.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================
            SECCIÓN GRID DE SERVICIOS
           ========================== */}
        <section
          id="services-grid"                                          // ID usado por IntersectionObserver y posibles anclas.
          data-fade-in                                                // Marca esta sección para el efecto de entrada.
          className={`
            py-24 md:py-28
            bg-pcm-surfaceSoft
            transition-all duration-700
            ${
              seccionesVisibles.has('services-grid')                  // Si el observer ya vio la sección:
                ? 'opacity-100 translate-y-0'                         // estado visible normal.
                : 'opacity-0 translate-y-8'                           // estado oculto con desplazamiento hacia abajo.
            }
          `}
        >
          <div className="pcm-container">
            {/* Encabezado centrado, con tamaños de letra más protagonistas */}
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-sm md:text-base font-semibold uppercase tracking-[0.35em] text-pcm-primary mb-3">
                QUÉ HACEMOS
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-pcm-text mb-3">
                Servicios profesionales
              </h2>
              <p className="text-sm md:text-base text-pcm-muted">
                Cada servicio está diseñado para maximizar la eficiencia, calidad y control
                en tus proyectos de construcción, desde edificaciones hasta obras de urbanismo.
              </p>
            </div>

            {/* Grid de tarjetas de servicios con hover más “vivo” */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {servicios.map((servicio) => (                         // Recorre el arreglo de servicios.
                <div
                  key={servicio.id}                                  // Usa el id del servicio como key.
                  className="
                    bg-pcm-bg/90
                    rounded-3xl
                    shadow-pcm-suave
                    border border-pcm-borderSoft/60
                    overflow-hidden
                    group
                    transition-all duration-300
                    hover:bg-pcm-surfaceSoft
                    hover:shadow-pcm-profunda
                    hover:border-pcm-secondary/70
                    hover:-translate-y-2
                  "
                >
                  {/* Cabecera de la tarjeta con degradado PCM que se ilumina en hover */}
                  <div
                    className="
                      pcm-fondo-degradado-principal
                      p-8
                      text-white
                      relative
                      transition-all duration-300
                      group-hover:brightness-110
                      group-hover:saturate-125
                    "
                  >
                    <div className="flex items-center justify-center mb-4">
                      {/* Contenedor del icono usando tamaño global w-15/h-15 y brillo en hover */}
                      <div
                        className="
                          w-15 h-15
                          bg-white/20
                          rounded-2xl
                          flex items-center justify-center
                          text-2xl
                          shadow-pcm-suave
                          transition-all duration-300
                          group-hover:scale-110
                          group-hover:shadow-pcm-profunda
                        "
                      >
                        {servicio.icono}
                      </div>
                    </div>

                    {/* Título del servicio */}
                    <h3 className="text-2xl font-bold mb-3 text-center">
                      {servicio.titulo}
                    </h3>

                    {/* Descripción corta del servicio */}
                    <p className="text-white/80 text-center text-sm md:text-base">
                      {servicio.descripcion}
                    </p>
                  </div>

                  {/* Contenido detallado del servicio */}
                  <div className="p-8 bg-pcm-bg/95">
                    <h4 className="text-lg font-semibold text-pcm-text mb-4">
                      Incluye:
                    </h4>
                    <ul className="space-y-3">
                      {servicio.caracteristicas.map(                  // Recorre las características del servicio.
                        (caracteristica, indiceCaracteristica) => (
                          <li
                            key={indiceCaracteristica}                // Índice como key (lista estática, sin reordenamiento).
                            className="flex items-start"
                          >
                            {/* Bullet decorativo con color de marca */}
                            <span
                              className="
                                w-2 h-2
                                bg-pcm-primary
                                rounded-full
                                mt-2 mr-3
                                shrink-0
                              "
                            />
                            {/* Texto de la característica */}
                            <span className="text-pcm-muted text-sm md:text-base">
                              {caracteristica}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================
            SECCIÓN DEL PROCESO DE TRABAJO
           ========================== */}
        <section
          id="process"                                              // ID de la sección de proceso.
          data-fade-in                                              // Marca para IntersectionObserver.
          className={`
            py-24 md:py-28
            bg-pcm-bg
            transition-all duration-700
            ${
              seccionesVisibles.has('process')                      // Si ya entró en viewport:
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }
          `}
        >
          <div className="pcm-container">
            {/* Encabezado centrado con jerarquía similar a Inicio */}
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-sm md:text-base font-semibold uppercase tracking-[0.35em] text-pcm-primary mb-3">
                CÓMO TRABAJAMOS
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-pcm-text mb-3">
                Nuestro proceso de trabajo
              </h2>
              <p className="text-sm md:text-base text-pcm-muted">
                Seguimos una metodología clara y comprobada para garantizar resultados
                exitosos en cada proyecto, desde el diagnóstico inicial hasta el cierre y soporte.
              </p>
            </div>

            {/* Grid de pasos del proceso (burbuja + título + descripción) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  paso: '01',
                  titulo: 'Consulta inicial',
                  descripcion:
                    'Análisis detallado de requerimientos, contexto y objetivos del proyecto.',
                },
                {
                  paso: '02',
                  titulo: 'Propuesta',
                  descripcion:
                    'Elaboración de una propuesta técnica y económica ajustada a tus necesidades.',
                },
                {
                  paso: '03',
                  titulo: 'Implementación',
                  descripcion:
                    'Ejecución del proyecto con seguimiento continuo, control de calidad y comunicación clara.',
                },
                {
                  paso: '04',
                  titulo: 'Entrega',
                  descripcion:
                    'Cierre del proyecto, entrega de documentación y soporte post-entrega garantizado.',
                },
              ].map((paso, indicePaso) => (                         // Mapea cada paso del proceso.
                <div
                  key={indicePaso}
                  className="text-center group transition-all duration-300"
                >
                  {/* Burbuja con número y glow sutil que se eleva en hover */}
                  <div
                    className="
                      w-20 h-20
                      pcm-fondo-degradado-principal
                      rounded-full
                      flex items-center justify-center
                      text-white text-2xl font-bold
                      mb-6 mx-auto
                      shadow-pcm-suave
                      transition-all duration-300
                      group-hover:shadow-pcm-profunda
                      group-hover:-translate-y-1
                    "
                  >
                    {paso.paso}
                  </div>

                  {/* Título del paso: se pone azul cuando el cursor está sobre la burbuja/card */}
                  <h3
                    className="
                      text-lg md:text-xl
                      font-semibold
                      text-pcm-text
                      mb-4
                      transition-all duration-300
                      group-hover:text-pcm-primary
                    "
                  >
                    {paso.titulo}
                  </h3>

                  {/* Descripción corta del paso */}
                  <p className="text-sm md:text-base text-pcm-muted">
                    {paso.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================
            SECCIÓN CTA (LLAMADO A LA ACCIÓN)
           ========================== */}
        <section
          id="cta"                                                // ID de la sección de llamado a la acción.
          data-fade-in                                            // Marca para IntersectionObserver.
          className={`
            py-24 md:py-28
            pcm-fondo-degradado-principal
            text-white
            transition-all duration-700
            ${
              seccionesVisibles.has('cta')                        // Si la CTA ya se vio:
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }
          `}
        >
          <div className="pcm-container text-center max-w-4xl">
            {/* Título principal de la CTA con palabra “transformar” en degradado PCM */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              ¿Listo para{' '}
              <span
                className="
                  bg-clip-text text-transparent
                  font-semibold
                "
                style={{
                  backgroundImage:
                    'linear-gradient(120deg, #FF9C2F, #FACC6B, #2F8DEE)', // Degradado naranja → amarillo → azul.
                }}
              >
                transformar
              </span>{' '}
              tus proyectos?
            </h2>

            {/* Texto explicativo de la CTA */}
            <p className="text-base md:text-lg text-gray-200 mb-8">
              Contacta a nuestro equipo de expertos y descubre cómo ProCivil Manager puede
              ayudarte a tener obras más controladas, rentables y organizadas, con trazabilidad
              completa desde la planeación hasta el cierre.
            </p>

            {/* Botones de acción principales */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Botón principal: usa el mismo estilo naranja PCM de .pcm-btn-primary */}
              <Link
                to="/Contacto"                                     // Ruta de contacto público.
                className="
                  pcm-btn-primary
                  text-base md:text-lg
                  px-8 py-4
                  shadow-pcm-profunda
                  no-underline
                "
              >
                Solicitar consulta gratuita
              </Link>

              {/* Botón secundario: borde claro que se resalta en hover */}
              <Link
                to="/Proyectos-Publicos"                           // Ruta pública de proyectos / portafolio.
                className="
                  inline-flex items-center justify-center
                  border-2 border-white/30
                  text-white
                  px-8 py-4
                  rounded-full
                  text-base md:text-lg font-semibold
                  backdrop-blur-sm
                  hover:bg-white/10
                  hover:border-pcm-secondary
                  hover:-translate-y-1
                  hover:shadow-pcm-suave
                  transition-all duration-300
                  no-underline
                "
              >
                Ver portafolio
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Pie de página global de la landing */}
      <PieDePaginaPrincipal />
    </div>
  );
};

// Exporta el componente de la página de servicios para usarlo en el enrutador principal.
export default Servicios;                                           // Exportación por defecto del componente de servicios.
