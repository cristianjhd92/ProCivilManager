// File: frontend/src/modules/site/pages/Inicio.jsx
// Description: Página de inicio (landing) pública de ProCivil Manager (PCM).
//              Muestra un hero principal con mensaje de valor para el sector
//              construcción en Colombia, un mockup de dashboard alineado con
//              el título, una barrita animada tipo “flujo de obra”, secciones
//              de funcionalidades y resultados esperados, usando el tema PCM
//              (degradados industriales, tarjetas .pcm-card) y animaciones
//              suaves (pulse, shimmer, slide-up) al hacer scroll.

// =========================
// Importaciones principales
// =========================
import React, {
  useState,          // Maneja el estado local de qué secciones ya son visibles.
  useEffect         // Maneja efectos secundarios (IntersectionObserver).
} from 'react';

// Importa layout público: barra de navegación superior y pie de página.
import EncabezadoPrincipal from '../../../shared/components/layout/BarraNavegacionPublica.jsx'; // Navbar pública principal.
import PieDePaginaPrincipal from '../../../shared/components/layout/PieDePagina.jsx';           // Footer público principal.

// ========================================
// Componente principal de la página de inicio
// ========================================
const Inicio = () => {                                       // Declara el componente funcional de la landing pública.
  // =================================================
  // Estado: secciones visibles (para animaciones scroll)
  // =================================================
  const [seccionesVisibles, setSeccionesVisibles] = useState( // Estado con IDs de secciones ya observadas.
    new Set(),                                                 // Comienza vacío para que entren con animación.
  );

  // ==========================================================
  // Efecto: IntersectionObserver para secciones con data-fade-in
  // ==========================================================
  useEffect(() => {                                            // Efecto que se ejecuta al montar el componente.
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;                                                  // En SSR, no hay DOM; se sale sin hacer nada.
    }

    const observador = new IntersectionObserver(               // Crea el IntersectionObserver.
      (entradas) => {                                          // Callback que recibe las entradas observadas.
        entradas.forEach((entrada) => {                        // Recorre cada entrada.
          if (entrada.isIntersecting) {                        // Si la sección entra en el viewport.
            setSeccionesVisibles((estadoPrevio) => {           // Actualiza el estado de secciones visibles.
              const nuevo = new Set(estadoPrevio);             // Clona el Set anterior para no mutarlo.
              nuevo.add(entrada.target.id);                    // Agrega el ID de la sección actual.
              return nuevo;                                    // Devuelve el nuevo Set.
            });
          }
        });
      },
      {
        threshold: 0.1,                                        // Se considera visible con 10% de intersección.
        rootMargin: '0px 0px -50px 0px',                       // Dispara un poco antes de salir por la parte baja.
      },
    );

    const secciones = document.querySelectorAll('[data-fade-in]'); // Selecciona elementos con data-fade-in.
    secciones.forEach((seccion) => observador.observe(seccion));   // Registra cada sección en el observer.

    return () => {                                             // Función de limpieza del efecto.
      observador.disconnect();                                 // Desconecta el observer para evitar fugas.
    };
  }, []);                                                      // Solo se configura una vez al montar.

  // ==============================
  // Render principal de la página
  // ==============================
  return (
    <div
      className="pcm-page font-sans leading-relaxed overflow-x-hidden" // Layout base PCM, fuente sans y sin scroll horizontal.
    >
      {/* Cabecera principal (barra de navegación pública fija) */}
      <EncabezadoPrincipal />

      {/* Contenido principal de la landing */}
      <main className="pt-20 md:pt-24 lg:pt-28"> {/* Compensa la altura de la barra fija. */}
        {/* ==========================
            Sección HERO (portada)
            ========================== */}
        <section
          id="inicio"                                          // ID para scroll suave desde la barra.
          className="relative min-h-[calc(100vh-6rem)] pcm-fondo-degradado-principal flex items-center overflow-hidden" // Hero casi a pantalla completa con degradado PCM.
        >
          {/* Fondo con cuadrícula tenue y animación tipo “palpitar” */}
          <div
            className="absolute inset-0 opacity-20 animate-pulse" // Capa de cuadrícula con pulso suave.
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(148,163,184,0.35)' stroke-width='0.6'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`, // SVG embebido tipo plano/retícula.
            }}
          />

          {/* Contenido principal del hero */}
          <div
            className="pcm-container relative z-10"            // Contenedor central por encima del fondo.
          >
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center" // Dos columnas alineadas verticalmente.
            >
              {/* Columna izquierda: título, texto y acciones */}
              <div className="max-w-xl">
                <h1
                  className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-tight text-white mb-6" // Título grande con buen interlineado.
                >
                  {/* Línea 1 del título */}
                  <span>Construcción más ordenada</span>
                  <br />
                  {/* Línea 2 con degradado en la parte clave */}
                  <span className="mt-2 inline-block">
                    y{' '}
                    <span
                      className="bg-clip-text text-transparent font-semibold" // Hace el texto transparente para ver el degradado.
                      style={{
                        backgroundImage:
                          'linear-gradient(120deg, #FF9C2F, #FACC6B, #2F8DEE)', // Degradado PCM: naranja → amarillo → azul.
                      }}
                    >
                      control inteligente de proyectos
                    </span>
                  </span>
                  <br />
                  {/* Línea 3: cierre en Colombia */}
                  <span className="mt-1 inline-block">en Colombia</span>
                </h1>

                {/* Párrafo descriptivo enfocado en contexto colombiano */}
                <p className="text-base md:text-lg text-slate-200 mb-6 md:mb-7 leading-relaxed">
                  Optimiza la planeación, el seguimiento y el control de tus obras
                  con una plataforma pensada para la realidad de constructoras,
                  gerencias de obra e interventorías en Colombia.
                </p>

                {/* Botones de llamada a la acción */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <a
                    href="/register"                           // Ruta de creación de cuenta (ajustar a tus rutas reales).
                    className="pcm-btn-primary text-sm sm:text-base"
                  >
                    Probar ProCivil Manager
                  </a>

                  <a
                    href="/contacto"                           // Ruta hacia la sección/página de contacto.
                    className="pcm-btn-ghost text-sm sm:text-base"
                  >
                    Hablar con nuestro equipo
                  </a>
                </div>

                {/* Barra decorativa de “flujo de obra” con shimmer */}
                <div className="mt-5 w-full max-w-xs">
                  <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className="pcm-barra-carga-hero h-full w-1/3 rounded-full animate-shimmer" // Usa helper global + animación shimmer.
                    />
                  </div>
                  <p className="mt-2 text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">
                    flujo continuo de tareas y reportes
                  </p>
                </div>
              </div>

              {/* Columna derecha: mockup visual del dashboard */}
              <div
                className="relative mt-10 lg:mt-0 flex justify-center lg:justify-end" // Alinea el mockup a la derecha en escritorio.
              >
                <div
                  className="pcm-card relative w-full max-w-xl pt-8 pb-6 px-5 md:px-7 overflow-hidden" // Card del dashboard con glassmorphism PCM.
                >
                  {/* Borde superior del dashboard con degradado fino */}
                  <div
                    className="absolute left-1 right-1 top-1 h-1 rounded-full"
                    style={{
                      backgroundImage:
                        'linear-gradient(90deg, #FF9C2F, #00B3C6, #4ADE80)', // Degradado naranja → turquesa → verde.
                    }}
                  />

                  {/* Encabezado del mockup */}
                  <div className="mb-5 flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <h4 className="text-sm md:text-base font-semibold text-slate-100">
                      Dashboard de proyectos en tiempo real
                    </h4>
                  </div>

                  {/* Contenido interno del mockup: barras de avance */}
                  <div className="space-y-4">
                    {/* Proyecto 1 */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-slate-200 text-xs md:text-sm">
                          Torre Empresarial Chapinero
                        </span>
                        <span className="text-[0.7rem] text-slate-400">Avance 75%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
                        <div
                          className="h-full w-3/4 rounded-full animate-shimmer" // Barra animada con shimmer.
                          style={{
                            backgroundImage:
                              'linear-gradient(90deg, #FF9C2F, #FACC6B, #FF9C2F)',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      </div>
                    </div>

                    {/* Proyecto 2 */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-slate-200 text-xs md:text-sm">
                          Conjunto Residencial Cedritos
                        </span>
                        <span className="text-[0.7rem] text-slate-400">Avance 45%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
                        <div
                          className="h-full rounded-full animate-shimmer" // Barra animada con pequeño desfase.
                          style={{
                            width: '45%',
                            backgroundImage:
                              'linear-gradient(90deg, #FF9C2F, #FACC6B, #FF9C2F)',
                            backgroundSize: '200% 100%',
                            animationDelay: '0.25s',
                          }}
                        />
                      </div>
                    </div>

                    {/* Proyecto 3 */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-slate-200 text-xs md:text-sm">
                          Intervención Vial Calle 80
                        </span>
                        <span className="text-[0.7rem] text-slate-400">Avance 90%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
                        <div
                          className="h-full rounded-full animate-shimmer" // Barra animada con mayor desfase.
                          style={{
                            width: '90%',
                            backgroundImage:
                              'linear-gradient(90deg, #FF9C2F, #FACC6B, #FF9C2F)',
                            backgroundSize: '200% 100%',
                            animationDelay: '0.5s',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Banda de resumen al pie del mockup */}
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-[0.7rem] md:text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pcm-primary" />
                      Obras activas
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pcm-secondary" />
                      En programación
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pcm-accent" />
                      Alertas críticas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========= Sección de funcionalidades ========= */}
        <section
          id="features"                                        // ID para navegación interna.
          data-fade-in                                        // Marca la sección para IntersectionObserver.
          className={`
            py-24 md:py-28
            bg-pcm-surfaceSoft/70
            transition-all duration-700
            ${
              seccionesVisibles.has('features')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }
          `}
        >
          <div className="pcm-container">
            {/* Encabezado centrado de la sección */}
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-sm md:text-base font-semibold uppercase tracking-[0.35em] text-pcm-primary mb-3">
                FUNCIONALIDADES CLAVE
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-pcm-text mb-3">
                Pensado para la gestión integral de obra
              </h2>
              <p className="text-sm md:text-base text-pcm-muted">
                Desde la solicitud inicial del cliente hasta el cierre del proyecto,
                ProCivil Manager centraliza la información, tareas y responsables
                para que tu equipo de trabajo en campo y oficina se mantenga alineado.
              </p>
            </div>

            {/* Grid de tarjetas de funcionalidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
              {[
                {
                  icono: '📊',
                  titulo: 'Dashboard por proyecto',
                  descripcion:
                    'Visualiza hitos, frentes de obra, avances físicos y financieros para cada proyecto en un solo panel.',
                },
                {
                  icono: '👥',
                  titulo: 'Gestión de equipos',
                  descripcion:
                    'Administra perfiles de administradores, líderes de obra, residentes, auxiliares y clientes con accesos claros.',
                },
                {
                  icono: '📅',
                  titulo: 'Planificación y cronogramas',
                  descripcion:
                    'Crea, ajusta y comunica cronogramas con actividades, duraciones, responsables y dependencias.',
                },
                {
                  icono: '💰',
                  titulo: 'Control económico',
                  descripcion:
                    'Conecta presupuestos, AIU, compras, consumos y alertas de sobrecostos para decidir a tiempo.',
                },
                {
                  icono: '📱',
                  titulo: 'Visión desde campo',
                  descripcion:
                    'Consulta avances, novedades y reportes desde dispositivos móviles, sin depender del escritorio.',
                },
                {
                  icono: '📋',
                  titulo: 'Reportes para clientes',
                  descripcion:
                    'Genera informes claros para clientes, interventorías y gerencias con la información más relevante.',
                },
              ].map((funcion, indice) => (
                <article
                  key={indice}                                  // Índice como key en lista estática.
                  className="pcm-card p-7 flex flex-col items-center text-center hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
                >
                  {/* Icono con fondo cálido y glow ligero */}
                  <div
                    className="mb-5 w-15 h-15 rounded-2xl flex items-center justify-center text-2xl shadow-xl"
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg, #FFB24F, #FF9C2F, #00B3C6)', // Degradado cálido PCM para el icono.
                    }}
                  >
                    {funcion.icono}
                  </div>

                  {/* Título y descripción */}
                  <h3 className="text-lg md:text-xl font-semibold text-pcm-text mb-3">
                    {funcion.titulo}
                  </h3>
                  <p className="text-sm md:text-base text-pcm-muted leading-relaxed">
                    {funcion.descripcion}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ========= Sección de estadísticas / resultados ========= */}
        <section
          id="stats"                                           // ID para navegación interna.
          data-fade-in                                        // Marca la sección para animación on-scroll.
          className={`
            py-24 md:py-28
            pcm-fondo-degradado-principal
            text-white
            transition-all duration-700
            ${
              seccionesVisibles.has('stats')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }
          `}
        >
          <div className="pcm-container">
            {/* Encabezado centrado y más protagonista */}
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-sm md:text-base font-semibold uppercase tracking-[0.35em] text-pcm-primary mb-3">
                RESULTADOS ESPERADOS
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-pcm-text mb-3">
                Indicadores que hablan el lenguaje de tu proyecto
              </h2>
              <p className="text-sm md:text-base text-pcm-muted">
                ProCivil Manager te ayuda a reducir reprocesos, mejorar el control
                y entregar información clara a tus aliados: clientes, interventorías
                y socios.
              </p>
            </div>

            {/* Tarjetas de indicadores clave */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  numero: '120+',
                  etiqueta: 'Proyectos gestionados en obra y diseño',
                },
                {
                  numero: '95%',
                  etiqueta: 'Mejor trazabilidad en entregables y actas',
                },
                {
                  numero: '20–30%',
                  etiqueta: 'Reducción de tiempos en reportes y comunicación',
                },
                {
                  numero: '24/7',
                  etiqueta: 'Acceso a la información del proyecto',
                },
              ].map((estadistica, indice) => (
                <div
                  key={indice}
                  className="pcm-card py-8 flex flex-col items-center justify-center text-center"
                >
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {estadistica.numero}
                  </h3>
                  <p className="text-sm md:text-base text-slate-300">
                    {estadistica.etiqueta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Pie de página global */}
      <PieDePaginaPrincipal />
    </div>
  );
};

// Exporta el componente de la página de inicio para su uso en las rutas públicas.
export default Inicio;                                         // Exportación por defecto del componente de landing pública.
