// File: frontend/src/modules/manuals/pages/ManualUsuarioLider.jsx
// Description: Manual de usuario para el rol Líder de obra en ProCivil Manager (PCM).
//              Presenta un esquema básico de secciones relacionadas con el trabajo
//              diario en obra, solicitudes, avances y manejo de inventarios, junto
//              a un botón de "Exportar a PDF" listo para conectarse más adelante.

import React from 'react'; // Importa React para declarar el componente.

/**
 * Componente principal: ManualUsuarioLider
 * Muestra contenido introductorio y secciones resumidas para el líder de obra.
 */
export default function ManualUsuarioLider() { // Declara el componente y lo exporta.
  // Handler para el botón de exportación a PDF (placeholder).
  const manejarExportarPdf = () => { // Función invocada al hacer clic en el botón de exportar.
    console.log('TODO: implementar exportación a PDF del manual de líder de obra.'); // Mensaje temporal en consola.
  };

  // Render principal.
  return (
    <main
      className="pcm-page" // Layout general PCM.
    >
      <div
        className="pcm-container py-8 md:py-10" // Contenedor central.
      >
        <section
          className="pcm-card rounded-pcm-xl p-6 md:p-8 shadow-pcm-soft" // Tarjeta principal.
        >
          {/* Encabezado del manual del líder */}
          <header
            className="mb-6 border-b border-pcm-borderSoft pb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between" // Encabezado con layout responsivo.
          >
            <div
              className="space-y-1" // Agrupa textos del encabezado.
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide text-pcm-muted" // Texto de contexto.
              >
                Manual de usuario · Rol líder de obra
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold text-pcm-text" // Título principal.
              >
                Líder de obra · ProCivil Manager
              </h1>
              <p
                className="text-sm md:text-base text-pcm-muted max-w-2xl" // Descripción corta.
              >
                Como líder de obra registras avances, controlas el inventario en obra,
                radicas solicitudes y mantienes la comunicación con administración
                y clientes sobre el estado real de los proyectos.
              </p>
            </div>

            {/* Botón de exportar a PDF (placeholder) */}
            <div
              className="mt-4 md:mt-0" // Margen adaptativo.
            >
              <button
                type="button" // Tipo de botón.
                onClick={manejarExportarPdf} // Asocia el handler de exportación.
                className="
                  inline-flex items-center justify-center
                  px-4 py-2
                  rounded-pcm-xl
                  text-sm font-semibold
                  bg-pcm-secondary text-pcm-bg
                  shadow-pcm-soft
                  hover:shadow-pcm-tab-glow
                  hover:scale-105
                  active:scale-95
                  transition duration-200
                " // Usa el color secundario PCM (líder/obra).
              >
                <span
                  className="mr-2" // Margen del ícono.
                  aria-hidden="true" // Ícono decorativo.
                >
                  📄
                </span>
                <span>
                  Exportar manual líder en PDF
                </span>
              </button>
            </div>
          </header>

          {/* Secciones de contenido resumido */}
          <div
            className="space-y-5" // Espacio entre secciones.
          >
            {/* Sección: Tablero diario de obra */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4" // Bloque específico.
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2" // Título de la sección.
              >
                1. Tablero diario de la obra
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted" // Descripción.
              >
                Desde el tablero principal puedes ver los proyectos a tu cargo, registrar
                actividades ejecutadas, avances porcentuales y observaciones relevantes
                para el seguimiento técnico y administrativo.
              </p>
            </section>

            {/* Sección: Solicitudes a administración */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4" // Bloque de solicitudes.
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                2. Radicación de solicitudes
              </h2>
              <ul
                className="list-disc list-inside text-xs md:text-sm text-pcm-muted space-y-1" // Lista de pasos.
              >
                <li>Accede al módulo de <strong>Solicitudes</strong> desde el menú lateral.</li>
                <li>Selecciona el tipo de solicitud (materiales, personal, equipos, etc.).</li>
                <li>Describe claramente el requerimiento, cantidades y fechas estimadas.</li>
                <li>Envía la solicitud para que administración la revise y apruebe.</li>
              </ul>
            </section>

            {/* Sección: Inventario en obra */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4"
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2"
              >
                3. Control de inventario en obra
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted"
              >
                Desde los módulos de almacenes y materiales puedes revisar existencias,
                registrar entradas y salidas, y controlar consumos por frente de trabajo,
                evitando sobrecostos y faltantes.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
