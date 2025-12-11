// File: frontend/src/modules/manuals/pages/ManualUsuarioAuditor.jsx
// Description: Manual de usuario para el rol Auditor en ProCivil Manager (PCM).
//              Proporciona un esquema básico enfocado en revisión, trazabilidad,
//              registros y generación de reportes de auditoría.

import React from 'react'; // Importa React.

/**
 * Componente principal: ManualUsuarioAuditor
 * Presenta secciones resumidas para el rol auditor.
 */
export default function ManualUsuarioAuditor() { // Declara y exporta el componente.
  // Handler para exportar a PDF (placeholder).
  const manejarExportarPdf = () => { // Función llamada por el botón de exportar.
    console.log('TODO: implementar exportación a PDF del manual de auditor.'); // Mensaje temporal.
  };

  // Render del componente.
  return (
    <main
      className="pcm-page" // Layout PCM.
    >
      <div
        className="pcm-container py-8 md:py-10"
      >
        <section
          className="pcm-card rounded-pcm-xl p-6 md:p-8 shadow-pcm-soft"
        >
          {/* Encabezado del manual de auditor */}
          <header
            className="mb-6 border-b border-pcm-borderSoft pb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div
              className="space-y-1"
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide text-pcm-muted"
              >
                Manual de usuario · Rol auditor
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold text-pcm-text"
              >
                Auditor · ProCivil Manager
              </h1>
              <p
                className="text-sm md:text-base text-pcm-muted max-w-2xl"
              >
                El rol auditor está orientado a revisar la trazabilidad de la información,
                verificar procesos y generar reportes de cumplimiento y hallazgos sobre
                el uso del sistema.
              </p>
            </div>

            {/* Botón para exportar a PDF */}
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
                  bg-pcm-primary text-pcm-bg
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
                  Exportar manual auditor en PDF
                </span>
              </button>
            </div>
          </header>

          {/* Secciones básicas del manual del auditor */}
          <div
            className="space-y-5"
          >
            {/* Sección: Registros y bitácoras */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                1. Registros y bitácoras
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                Desde los módulos de auditoría y registros puedes ver las bitácoras
                de cambios, accesos y operaciones realizadas sobre proyectos, usuarios
                y movimientos de inventario.
              </p>
            </section>

            {/* Sección: Reportes de auditoría */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                2. Reportes de auditoría y hallazgos
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                Utiliza los reportes para consolidar hallazgos, tendencias y posibles
                desviaciones en el uso del sistema o en la información registrada,
                facilitando la entrega de informes formales.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
