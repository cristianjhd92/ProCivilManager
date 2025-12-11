// File: frontend/src/modules/manuals/pages/ManualUsuarioCliente.jsx
// Description: Manual de usuario para el rol Cliente en ProCivil Manager (PCM).
//              Presenta un esquema básico de secciones enfocadas en consulta
//              de avances, documentación y comunicación con el equipo de obra.

import React from 'react'; // Importa React.

/**
 * Componente principal: ManualUsuarioCliente
 * Muestra secciones introductorias para el cliente.
 */
export default function ManualUsuarioCliente() { // Declara el componente y lo exporta.
  // Handler placeholder para exportar a PDF.
  const manejarExportarPdf = () => { // Función ejecutada al hacer clic en el botón.
    console.log('TODO: implementar exportación a PDF del manual de cliente.'); // Mensaje temporal.
  };

  // Render del componente.
  return (
    <main
      className="pcm-page" // Layout PCM interno.
    >
      <div
        className="pcm-container py-8 md:py-10" // Contenedor con padding.
      >
        <section
          className="pcm-card rounded-pcm-xl p-6 md:p-8 shadow-pcm-soft" // Tarjeta principal.
        >
          {/* Encabezado del manual de cliente */}
          <header
            className="mb-6 border-b border-pcm-borderSoft pb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div
              className="space-y-1"
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide text-pcm-muted"
              >
                Manual de usuario · Rol cliente
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold text-pcm-text"
              >
                Cliente · ProCivil Manager
              </h1>
              <p
                className="text-sm md:text-base text-pcm-muted max-w-2xl"
              >
                Como cliente puedes seguir el progreso de tus proyectos, revisar hitos,
                consultar documentos claves y recibir alertas importantes sobre el
                desarrollo de las obras.
              </p>
            </div>

            {/* Botón de exportar a PDF */}
            <div
              className="mt-4 md:mt-0"
            >
              <button
                type="button"
                onClick={manejarExportarPdf}
                className="
                  inline-flex items-center justify-center
                  px-4 py-2
                  rounded-pcm-xl
                  text-sm font-semibold
                  bg-pcm-accent text-pcm-bg
                  shadow-pcm-soft
                  hover:shadow-pcm-tab-glow
                  hover:scale-105
                  active:scale-95
                  transition duration-200
                "
              >
                <span
                  className="mr-2"
                  aria-hidden="true"
                >
                  📄
                </span>
                <span>
                  Exportar manual cliente en PDF
                </span>
              </button>
            </div>
          </header>

          {/* Secciones básicas del manual del cliente */}
          <div
            className="space-y-5"
          >
            {/* Sección: Panel de seguimiento */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                1. Panel de seguimiento de proyectos
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                Desde el panel principal puedes ver el listado de obras asociadas a tu
                cuenta, su estado general, porcentaje de avance y fechas clave para la
                planeación y la entrega.
              </p>
            </section>

            {/* Sección: Documentos y actas */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                2. Documentos, informes y actas
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                En la sección de documentos puedes consultar informes periódicos, actas
                de reunión, memorias de cálculo y otros archivos relevantes del proyecto,
                siempre organizados por obra.
              </p>
            </section>

            {/* Sección: Alertas y comunicación */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                3. Alertas y comunicación con el equipo
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                A través del módulo de alertas puedes recibir notificaciones sobre
                hitos importantes, riesgos, cambios de programación o requerimientos
                de aprobación, manteniendo una comunicación clara con el equipo técnico.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
