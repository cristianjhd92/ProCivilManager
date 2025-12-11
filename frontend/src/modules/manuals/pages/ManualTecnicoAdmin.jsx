// File: frontend/src/modules/manuals/pages/ManualTecnicoAdmin.jsx
// Description: Manual técnico para administradores de ProCivil Manager (PCM).
//              Resume de forma técnica la arquitectura general, aspectos de
//              seguridad, ambientes y soporte, con un botón de exportar a PDF
//              listo para conectarse a una solución de generación de documentos.

import React from 'react'; // Importa React.

/**
 * Componente principal: ManualTecnicoAdmin
 * Muestra un esquema básico de contenido técnico.
 */
export default function ManualTecnicoAdmin() { // Declara y exporta el componente.
  // Handler placeholder para exportar a PDF.
  const manejarExportarPdf = () => { // Función que se ejecuta al presionar el botón.
    console.log('TODO: implementar exportación a PDF del manual técnico de administrador.'); // Mensaje temporal.
  };

  // Render del componente.
  return (
    <main
      className="pcm-page" // Uso del layout PCM.
    >
      <div
        className="pcm-container py-8 md:py-10"
      >
        <section
          className="pcm-card rounded-pcm-xl p-6 md:p-8 shadow-pcm-soft"
        >
          {/* Encabezado del manual técnico */}
          <header
            className="mb-6 border-b border-pcm-borderSoft pb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div
              className="space-y-1"
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide text-pcm-muted"
              >
                Manual técnico · Administrador
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold text-pcm-text"
              >
                Manual técnico de ProCivil Manager
              </h1>
              <p
                className="text-sm md:text-base text-pcm-muted max-w-2xl"
              >
                Este manual está orientado al administrador técnico del sistema, e
                incluye lineamientos generales sobre arquitectura, seguridad, ambientes
                y buenas prácticas para el soporte de la plataforma.
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
                  Exportar manual técnico en PDF
                </span>
              </button>
            </div>
          </header>

          {/* Secciones técnicas resumidas */}
          <div
            className="space-y-5"
          >
            {/* Sección: Arquitectura general */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                1. Arquitectura general
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                ProCivil Manager está compuesto por un frontend en React/Vite, un backend
                en Node.js/Express y una base de datos en MongoDB, integrados mediante
                APIs REST y canales de comunicación en tiempo real (Socket.io).
              </p>
            </section>

            {/* Sección: Seguridad y roles */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                2. Seguridad, autenticación y roles
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                La plataforma utiliza autenticación basada en tokens (JWT), cifrado
                de contraseñas y segmentación de funcionalidades por rol (admin,
                líder de obra, cliente, auditor), garantizando accesos diferenciados.
              </p>
            </section>

            {/* Sección: Ambientes y soporte */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                3. Ambientes, despliegue y soporte
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                Más adelante se documentarán aquí los ambientes de desarrollo, pruebas
                y producción, así como los procedimientos recomendados para despliegue,
                monitoreo y respaldo de la información.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
