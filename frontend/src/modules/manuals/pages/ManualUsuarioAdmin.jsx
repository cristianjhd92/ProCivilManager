// File: frontend/src/modules/manuals/pages/ManualUsuarioAdmin.jsx
// Description: Manual de usuario para el rol Administrador de ProCivil Manager (PCM).
//              Explica de forma resumida las principales responsabilidades y
//              funcionalidades del administrador, con secciones de ejemplo y
//              un botón de "Exportar a PDF" listo para conectarse a la lógica real.

import React from 'react'; // Importa React para declarar el componente funcional.

/**
 * Componente principal: ManualUsuarioAdmin
 * Muestra secciones básicas de ayuda para el administrador (usuarios,
 * proyectos, almacenes, reportes) y un botón de exportar a PDF.
 */
export default function ManualUsuarioAdmin() { // Declara y exporta el componente principal.
  // Handler para el botón de exportación a PDF (placeholder por ahora).
  const manejarExportarPdf = () => { // Función que se ejecuta al hacer clic en "Exportar a PDF".
    console.log('TODO: implementar exportación a PDF del manual de administrador.'); // Mensaje temporal en consola.
  };

  // Render del componente.
  return (
    <main
      className="pcm-page" // Aplica layout de página interna PCM.
    >
      <div
        className="pcm-container py-8 md:py-10" // Contenedor central con padding vertical.
      >
        {/* Tarjeta principal del manual de administrador */}
        <section
          className="pcm-card rounded-pcm-xl p-6 md:p-8 shadow-pcm-soft" // Tarjeta con estilo PCM.
        >
          {/* Encabezado del manual */}
          <header
            className="mb-6 border-b border-pcm-borderSoft pb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between" // Encabezado con título/subtítulo y acciones.
          >
            <div
              className="space-y-1" // Agrupa textos del encabezado.
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide text-pcm-muted" // Texto de contexto.
              >
                Manual de usuario · Rol administrador
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold text-pcm-text" // Título principal del manual.
              >
                Administrador de ProCivil Manager
              </h1>
              <p
                className="text-sm md:text-base text-pcm-muted max-w-2xl" // Descripción introductoria del rol.
              >
                Como administrador tienes control total sobre la plataforma: creación
                de usuarios, configuración de proyectos, definición de almacenes y
                consulta de reportes consolidados para la toma de decisiones.
              </p>
            </div>

            {/* Botón para exportar a PDF el manual del administrador */}
            <div
              className="mt-4 md:mt-0" // Margen superior en móviles.
            >
              <button
                type="button" // Botón estándar.
                onClick={manejarExportarPdf} // Asocia el handler.
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
                " // Estilos PCM para CTA principal.
              >
                <span
                  className="mr-2" // Margen del ícono.
                  aria-hidden="true" // Ícono decorativo.
                >
                  📄
                </span>
                <span>
                  Exportar manual admin en PDF
                </span>
              </button>
            </div>
          </header>

          {/* Secciones resumidas del manual */}
          <div
            className="space-y-5" // Espacio entre bloques.
          >
            {/* Sección: Inicio rápido */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4" // Bloque para inicio rápido.
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2" // Título de la sección.
              >
                1. Inicio rápido del panel de administración
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted" // Contenido de ejemplo.
              >
                Al ingresar al panel de administrador verás un resumen de proyectos,
                solicitudes pendientes y alertas. Desde el menú lateral puedes navegar
                a usuarios, proyectos, almacenes, reportes y configuración general.
              </p>
            </section>

            {/* Sección: Gestión de usuarios */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4" // Bloque para usuarios.
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2" // Título de la sección.
              >
                2. Creación y gestión de usuarios
              </h2>
              <ul
                className="list-disc list-inside text-xs md:text-sm text-pcm-muted space-y-1" // Lista de pasos.
              >
                <li>
                  Ingresa a la sección <strong>Usuarios</strong> desde el menú lateral.
                </li>
                <li>
                  Haz clic en <strong>&quot;Crear usuario&quot;</strong> y diligencia los
                  datos básicos (nombre, correo, rol).
                </li>
                <li>
                  Asigna el rol adecuado: administrador, líder de obra, cliente o auditor.
                </li>
                <li>
                  El usuario recibirá instrucciones para activar su cuenta y definir su contraseña.
                </li>
              </ul>
            </section>

            {/* Sección: Proyectos y almacenes */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4" // Bloque para proyectos/almacenes.
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2" // Título de la sección.
              >
                3. Proyectos, almacenes y materiales
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted mb-2" // Texto introductorio.
              >
                Desde el panel de administrador puedes crear proyectos, asociar líderes
                de obra, configurar almacenes y registrar materiales.
              </p>
              <ul
                className="list-disc list-inside text-xs md:text-sm text-pcm-muted space-y-1" // Lista de puntos clave.
              >
                <li>Crear proyectos y asignarles un líder responsable.</li>
                <li>Registrar almacenes por obra o centralizados.</li>
                <li>Cargar materiales frecuentes y sus unidades de medida.</li>
              </ul>
            </section>

            {/* Sección: Reportes y auditoría */}
            <section
              className="rounded-pcm-xl border border-pcm-borderSoft bg-pcm-surfaceSoft p-4" // Bloque para reportes.
            >
              <h2
                className="text-sm md:text-base font-semibold text-pcm-text mb-2" // Título de la sección.
              >
                4. Reportes y trazabilidad
              </h2>
              <p
                className="text-xs md:text-sm text-pcm-muted" // Descripción de la sección.
              >
                Usa los módulos de reportes y auditoría para revisar la trazabilidad
                de movimientos, solicitudes, aprobaciones y cambios en el sistema,
                facilitando la supervisión y el cumplimiento de los requisitos internos.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
