// File: frontend/src/modules/workspace/components/EncabezadoSeccion.jsx
// Description: Encabezado reutilizable para las secciones del workspace.
//              Muestra una barra vertical y un título cuyo color y relieve
//              se adaptan al rol del usuario (admin / líder / cliente / auditor),
//              manteniendo un diseño limpio que se integra con el header completo.

/* Importa React para poder usar JSX y definir componentes funcionales */
import React from 'react'; // Importa React (compatibilidad general con React 19).

/**
 * Componente EncabezadoSeccion
 *
 * Props soportadas (para compatibilidad):
 *  - titulo: texto principal de la sección (uso antiguo).
 *  - rol: rol técnico del usuario (uso antiguo).
 *  - tituloSeccion: texto principal de la sección (uso desde TableroTrabajo).
 *  - rolUsuario: rol técnico del usuario (uso desde TableroTrabajo).
 *  - mostrar: si es false, el encabezado no se muestra (para efecto de scroll).
 */
const EncabezadoSeccion = ({
  titulo = '',          // Título recibido con el nombre antiguo.
  rol = '',             // Rol recibido con el nombre antiguo.
  tituloSeccion,        // Título recibido con el nombre nuevo (TableroTrabajo).
  rolUsuario,           // Rol recibido con el nombre nuevo (TableroTrabajo).
  mostrar = true,       // Control de visibilidad (true = visible, false = oculto).
}) => {
  // Si explícitamente nos dicen que NO se muestre, no renderizamos nada.
  if (!mostrar) {
    return null;        // Evita que ocupe espacio cuando el header se oculta por scroll.
  }

  // Resuelve el título final: primero intenta con tituloSeccion, luego con titulo.
  const tituloFinal =
    (tituloSeccion && tituloSeccion.trim()) ||
    (titulo && titulo.trim()) ||
    'Dashboard Principal'; // Fallback amigable.

  // Resuelve el rol final: primero intenta con rolUsuario, luego con rol.
  const rolNormalizado = (rolUsuario || rol || '').toLowerCase();

  // Determina la clave interna de rol (agrupa variantes).
  const claveRol =
    rolNormalizado === 'admin'
      ? 'admin'
      : rolNormalizado === 'cliente'
      ? 'cliente'
      : rolNormalizado === 'lider de obra' || rolNormalizado === 'lider'
      ? 'lider'
      : rolNormalizado === 'auditor' || rolNormalizado === 'auditor sgi'
      ? 'auditor'
      : 'admin'; // Fallback visual: admin.

  // Estilos por rol:
  // Se apoyan en variables CSS globales definidas en index.css:
  // --pcm-color-role-admin, --pcm-color-role-lider,
  // --pcm-color-role-cliente, --pcm-color-role-auditor.
  const estilosPorRol = {
    admin: {
      barra: {
        backgroundImage:
          'linear-gradient(180deg, var(--pcm-color-role-admin), #38bdf8)',
      },
      texto: {
        color: '#bfdbfe', // Azul claro, menos blanco para mejor contraste.
        textShadow:
          '0 1px 2px rgba(15,23,42,0.7), 0 0 6px rgba(56,189,248,0.6)', // Glow azul más suave.
      },
    },
    lider: {
      barra: {
        backgroundImage:
          'linear-gradient(180deg, var(--pcm-color-role-lider), #f97316)',
      },
      texto: {
        color: '#fed7aa', // Naranja claro coherente con el sidebar.
        textShadow:
          '0 1px 2px rgba(15,23,42,0.7), 0 0 6px rgba(249,115,22,0.6)', // Glow naranja más controlado.
      },
    },
    cliente: {
      barra: {
        backgroundImage:
          'linear-gradient(180deg, var(--pcm-color-role-cliente), #4ade80)',
      },
      texto: {
        color: '#bbf7d0', // Verde claro, mejora la legibilidad sobre fondo oscuro.
        textShadow:
          '0 1px 2px rgba(15,23,42,0.7), 0 0 6px rgba(34,197,94,0.6)', // Glow verde más suave.
      },
    },
    auditor: {
      barra: {
        backgroundImage:
          'linear-gradient(180deg, var(--pcm-color-role-auditor), #a855f7)',
      },
      texto: {
        color: '#e9d5ff', // Lavanda clara, menos brillante que el blanco puro.
        textShadow:
          '0 1px 2px rgba(15,23,42,0.7), 0 0 6px rgba(168,85,247,0.6)', // Glow morado discreto.
      },
    },
  };

  // Toma los estilos del rol actual.
  const estilosRol = estilosPorRol[claveRol];

  // Render del encabezado: barra + título.
  return (
    <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
      {/* Barra vertical de color por rol */}
      <div
        className="h-8 w-1.5 rounded-full shadow-pcm-tab-glow"
        style={estilosRol.barra}
      />

      {/* Texto del título con sombra y color por rol */}
      <h1
        className="text-lg md:text-xl font-semibold tracking-tight"
        style={estilosRol.texto}
      >
        {tituloFinal}
      </h1>
    </div>
  );
};

export default EncabezadoSeccion;
