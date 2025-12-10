// File: frontend/src/modules/workspace/theme/temaRolWorkspace.js
// Description: Funciones de apoyo para el tema visual del workspace según el rol.
//              A partir del rol técnico del usuario (admin / líder de obra / cliente / auditor),
//              devuelve banderas y clases CSS que activan el esquema de colores definido
//              en index.css (.pcm-panel, .pcm-panel--rol, .pcm-panel-fondo, etc.).

/**
 * Obtiene la configuración de tema visual para el workspace según el rol.
 *
 * @param {string} rolCrudo - Rol tal como viene del backend o de localStorage
 *                            (por ejemplo: "admin", "lider de obra", "cliente").
 * @returns {object} Objeto con:
 *  - rolNormalizado   → Rol en minúsculas.
 *  - esAdmin          → true si el usuario es admin.
 *  - esLiderObra      → true si el usuario es líder de obra.
 *  - esCliente        → true si el usuario es cliente.
 *  - esAuditor        → true si el usuario es auditor/SGI.
 *  - clasePanelRol    → Clases raíz del panel interno (usa .pcm-panel y variantes por rol).
 *  - claseHeaderRol   → Clase del encabezado superior del panel (.pcm-panel-header).
 *  - claseChipSeccion → Clase base de chips/badges que quieran usar el acento PCM.
 */
export const obtenerTemaRolWorkspace = (rolCrudo = '') => {
  // Normaliza el rol: asegura que sea string, recorta espacios y pasa a minúsculas.
  const rolNormalizado = (rolCrudo || '').toString().trim().toLowerCase();

  // Banderas por rol, agrupando diferentes variantes de texto.
  const esAdmin = rolNormalizado === 'admin'; // Rol administrador general.
  const esLiderObra =
    rolNormalizado === 'lider de obra' || rolNormalizado === 'lider'; // Rol líder de obra.
  const esCliente = rolNormalizado === 'cliente'; // Rol cliente / copropiedad.
  const esAuditor =
    rolNormalizado === 'auditor' || rolNormalizado === 'auditor sgi'; // Rol de auditoría / SGI.

  // Clase del panel raíz según el rol.
  // - .pcm-panel        → Define las variables de acento base para el panel.
  // - .pcm-panel--{rol} → Ajusta las variables según admin / líder / cliente / auditor.
  // - .pcm-panel-fondo  → Pinta el fondo con halos usando esas variables.
  const clasePanelRol = esAdmin
    ? 'pcm-panel pcm-panel--admin pcm-panel-fondo'
    : esLiderObra
    ? 'pcm-panel pcm-panel--lider pcm-panel-fondo'
    : esCliente
    ? 'pcm-panel pcm-panel--cliente pcm-panel-fondo'
    : esAuditor
    ? 'pcm-panel pcm-panel--auditor pcm-panel-fondo'
    : 'pcm-panel pcm-panel--admin pcm-panel-fondo'; // Rol de respaldo: se comporta como admin.

  // Clase base del encabezado superior del panel.
  // El degradado real se define en index.css usando las variables del panel
  // (--pcm-color-acento, --pcm-color-acento-bg-1, --pcm-color-acento-bg-2, etc.).
  const claseHeaderRol = 'pcm-panel-header';

  // Clase base para chips/badges que quieran usar el acento PCM.
  // En esta fase reutilizamos .pcm-chip; si más adelante se diferencian por rol,
  // se puede extender desde aquí.
  const claseChipSeccion = 'pcm-chip';

  // Devuelve todas las utilidades para que el layout y las vistas internas
  // no tengan que replicar la lógica de colores según el rol.
  return {
    rolNormalizado,   // Rol en minúsculas.
    esAdmin,          // Bandera de admin.
    esLiderObra,      // Bandera de líder de obra.
    esCliente,        // Bandera de cliente.
    esAuditor,        // Bandera de auditor.
    clasePanelRol,    // Clases raíz del panel según el rol.
    claseHeaderRol,   // Clase del encabezado superior.
    claseChipSeccion, // Clase base para chips/badges.
  };
};
