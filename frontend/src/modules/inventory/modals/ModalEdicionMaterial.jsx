// File: frontend/src/modules/inventory/modals/ModalEdicionMaterial.jsx
// Description: Modal autónomo utilizado para crear o editar un material en el módulo de inventarios
//              de ProCivil Manager (PCM). No depende de ModalGenerico: implementa su propio overlay,
//              bloqueo de scroll de fondo y cierre por ESC. Adapta colores y acentos al rol visual
//              del usuario (admin / líder / cliente / auditor) usando las variables definidas en
//              index.css (.pcm-panel, .pcm-panel--ROL) y el tema PCM (paleta, sombras y bordes).

// =========================
//   Importaciones básicas
// =========================
import React, {
  useEffect,    // Hook para manejar efectos secundarios (scroll, teclas).
  useState,     // Hook para manejar el rol lógico del usuario.
  useMemo,      // Hook para derivar el rol visual a partir del rol lógico.
} from 'react'; // Importa React y los hooks necesarios.

// Importación de íconos para agregar/eliminar asignaciones
import { Plus, Trash2 } from 'lucide-react';

/**
 * Componente ModalEdicionMaterial
 *
 * Props:
 *  - estaAbierto:               (boolean) indica si el modal se muestra o no.
 *  - alCerrar:                  (func)    callback que se ejecuta para cerrar el modal (X, overlay, ESC).
 *  - alGuardar:                 (func)    callback que se ejecuta al confirmar el formulario (crear / actualizar).
 *  - datosFormulario:           (object)  valores actuales del formulario (nombre, categoría, unidad, etc.).
 *  - actualizarDatosFormulario: (func)    función que actualiza datosFormulario en el componente padre.
 *  - almacenes:                 (array)   lista de almacenes para poblar el select (por defecto []).
 *  - materialEnEdicion:         (object)  material que se está editando; null cuando se crea uno nuevo.
 */
const ModalEdicionMaterial = ({
  estaAbierto,                 // Indica si el modal debe estar visible.
  alCerrar,                    // Función para cerrar el modal.
  alGuardar,                   // Función que procesa el guardado del formulario.
  datosFormulario,             // Objeto con los datos actuales del formulario.
  actualizarDatosFormulario,   // Setter para actualizar datosFormulario desde este modal.
  almacenes = [],              // Lista de almacenes disponibles; por defecto arreglo vacío.
  materialEnEdicion,           // Material en edición; si es null, estamos creando uno nuevo.
  sugerenciasNombre = [],      // Sugerencias de nombres existentes para autocompletar.
  sugerenciasCategoria = [],   // Sugerencias de categorías existentes.
  sugerenciasUnidad = [],      // Sugerencias de unidades existentes.
}) => {
  // =========================
  //   Rol del usuario (lógico)
  // =========================
  const [rolUsuario, setRolUsuario] = useState('lider'); // Rol lógico del usuario actual (por defecto líder).

  // ─────────────────────────────────────────────────────────────
  // Efecto: lectura del usuario desde localStorage para detectar el rol
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const datoUsuario = localStorage.getItem('pcm_usuario'); // Lee el JSON del usuario almacenado en localStorage.
      if (datoUsuario) {
        const usuario = JSON.parse(datoUsuario);               // Parsea el JSON a objeto.
        const rolDetectado =
          usuario?.rol ||
          usuario?.role ||
          usuario?.tipoRol ||
          'lider';                                             // Valor por defecto si no se encuentra un rol explícito.
        setRolUsuario(rolDetectado);                           // Actualiza el rol lógico del usuario.
      }
    } catch (error) {
      console.error('Error al leer el rol del usuario en ModalEdicionMaterial:', error);
      setRolUsuario('lider');                                  // Fallback seguro en caso de error.
    }
  }, []);                                                      // Solo al montar el componente.

  // =========================
  //   Rol visual (para colores del panel/modal)
  // =========================
  const rolVisual = useMemo(() => {
    const rolCrudo = (rolUsuario || '').toString().toLowerCase(); // Normaliza el rol a minúsculas.

    if (rolCrudo.includes('admin')) return 'admin';               // Roles que contienen "admin" se pintan como admin (azul).
    if (rolCrudo.includes('auditor')) return 'auditor';           // Roles que contienen "auditor" se pintan como auditor (morado).
    if (rolCrudo.includes('client') || rolCrudo.includes('cliente')) {
      return 'cliente';                                           // Roles de cliente se pintan como cliente (verde).
    }
    return 'lider';                                               // Cualquier otro rol se considera líder (naranja).
  }, [rolUsuario]);                                               // Se recalcula si cambia el rol lógico.

  // =========================
  //   Clases por rol para inyectar variables de color (pcm-panel--ROL)
  // =========================
  const clasePanelRol = useMemo(() => {
    // Aplica .pcm-panel + modificador por rol para aprovechar las variables CSS:
    // --pcm-color-acento, --pcm-color-acento-border, etc. definidas en index.css.
    if (rolVisual === 'admin') return 'pcm-panel pcm-panel--admin';
    if (rolVisual === 'cliente') return 'pcm-panel pcm-panel--cliente';
    if (rolVisual === 'auditor') return 'pcm-panel pcm-panel--auditor';
    return 'pcm-panel pcm-panel--lider';                           // Rol por defecto: líder de obra.
  }, [rolVisual]);

  // =========================
  //   Título del modal según contexto (nuevo / edición)
  // =========================
  const tituloModal = materialEnEdicion
    ? 'Editar material'                                            // Si hay materialEnEdicion, estamos editando.
    : 'Nuevo material';                                            // Si no, estamos creando un registro nuevo.

  // ─────────────────────────────────────────────────────────────
  // Efecto: bloquear scroll del body mientras el modal está abierto
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!estaAbierto) return;                                      // Solo actúa si el modal está abierto.

    const overflowOriginal = document.body.style.overflow;         // Guarda el valor original del overflow del body.
    document.body.style.overflow = 'hidden';                       // Deshabilita el scroll del fondo.

    return () => {
      document.body.style.overflow = overflowOriginal;             // Restaura el valor original al cerrar el modal.
    };
  }, [estaAbierto]);                                              // Se dispara cuando cambia estaAbierto.

  // ─────────────────────────────────────────────────────────────
  // Efecto: cerrar el modal al presionar la tecla ESC
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!estaAbierto) return;                                      // Si no está abierto, no agregamos el listener.

    const manejarKeyDown = (evento) => {                           // Función que procesa eventos de teclado.
      if (evento.key === 'Escape') {                               // Si el usuario presiona la tecla ESC...
        if (typeof alCerrar === 'function') {                      // Verifica que alCerrar sea una función válida.
          alCerrar();                                              // Cierra el modal.
        }
      }
    };

    window.addEventListener('keydown', manejarKeyDown);            // Agrega listener global de teclado.

    return () => {
      window.removeEventListener('keydown', manejarKeyDown);       // Limpia el listener al desmontar o cerrar el modal.
    };
  }, [estaAbierto, alCerrar]);                                     // Dependencias: estado de apertura y callback alCerrar.

  // ─────────────────────────────────────────────────────────────
  // Guard de visibilidad: si el modal no está abierto, no se renderiza nada
  // (se coloca DESPUÉS de los hooks para cumplir la regla de hooks)
  // ─────────────────────────────────────────────────────────────
  if (!estaAbierto) return null;                                   // Si estaAbierto es false, no se muestra nada en el DOM.

  // Identificadores únicos para los datalist de sugerencias.
  const idListaNombres = 'pcm-sugerencias-nombres';
  const idListaCategorias = 'pcm-sugerencias-categorias';
  const idListaUnidades = 'pcm-sugerencias-unidades';

  // ─────────────────────────────────────────────────────────────
  // Render principal del modal (overlay + contenedor con borde animado)
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Listas de sugerencias para autocompletar nombre, categoría y unidad */}
      <datalist id={idListaNombres}>
        {Array.isArray(sugerenciasNombre) &&
          sugerenciasNombre.map((sug) => (
            <option key={sug} value={sug} />
          ))}
      </datalist>
      <datalist id={idListaCategorias}>
        {Array.isArray(sugerenciasCategoria) &&
          sugerenciasCategoria.map((sug) => (
            <option key={sug} value={sug} />
          ))}
      </datalist>
      <datalist id={idListaUnidades}>
        {Array.isArray(sugerenciasUnidad) &&
          sugerenciasUnidad.map((sug) => (
            <option key={sug} value={sug} />
          ))}
      </datalist>

      <div
        className={`
        ${clasePanelRol}                                          /* Aplica variables de color por rol (.pcm-panel--ROL). */
        fixed inset-0 z-40                                        /* Cubre toda la pantalla, por encima del contenido.    */
        flex items-center justify-center                           /* Centra el modal en pantalla.                         */
        px-4 sm:px-6                                              /* Padding horizontal en móviles y escritorio.          */
      `}
        aria-modal="true"                                           // Indica que es un modal accesible.
        role="dialog"                                               // Rol ARIA de diálogo.
        aria-labelledby="modal-edicion-material-titulo"             // Referencia al título para lectores de pantalla.
      >
        {/* Overlay de fondo: capa oscura que captura clics para cerrar el modal */}
        <div
          className="absolute inset-0 bg-black/75 pcm-overlay-suave" // Fondo oscuro con toque PCM para el overlay.
          onClick={alCerrar}                                        // Clic en el fondo → cierra el modal.
        />

        {/* Contenedor centrado del modal con animación de entrada */}
        <div className="relative w-full max-w-2xl animate-entrada-suave-arriba">
          {/* Borde degradado animado PCM alrededor del card del modal */}
          <div className="pcm-borde-animado">
            {/* Contenido real del modal dentro del borde animado */}
            <div
              className="
              pcm-borde-animado-contenido                          /* Aplica el recorte del borde animado.                */
              bg-pcm-surface                                       /* Fondo de tarjeta PCM para modales internos.         */
              rounded-[var(--radius-pcm-xl,1.5rem)]               /* Radio grande PCM coherente con el resto del sistema.*/
              shadow-pcm-profunda                                 /* Sombra profunda para resaltar el modal.             */
              border border-pcm-borderSoft                        /* Borde suave PCM para el contorno del modal.         */
              text-pcm-text                                       /* Texto en color principal PCM.                       */
              px-5 py-5 sm:px-6 sm:py-6                           /* Padding interno adaptable a tamaños de pantalla.    */
            "
            >
              {/* Encabezado del modal con título y contexto de módulo */}
              <div
                className="
                mb-6 pb-4                                         /* Espaciado inferior antes del contenido.             */
                flex items-center justify-between gap-3           /* Título y etiqueta alineados en fila.                */
                border-b                                           /* Añade línea inferior como separación visual.        */
              "
                style={{
                  borderBottomColor: 'var(--pcm-color-acento-border)', // Usa el color de acento por rol para la línea inferior.
                }}
              >
                {/* Título del modal: cambia entre "Editar" y "Nuevo" material */}
                <h3
                  id="modal-edicion-material-titulo"               // ID asociado a aria-labelledby del contenedor raíz.
                  className="text-xl font-semibold"                // Tamaño y peso de fuente del título.
                >
                  {tituloModal}
                </h3>

                {/* Etiqueta pequeña que indica el contexto del módulo de inventarios */}
                <span
                  className="
                  text-xs                                         /* Tamaño pequeño de texto.                            */
                  px-3 py-1                                       /* Padding interno tipo chip.                          */
                  rounded-full                                    /* Forma de píldora.                                   */
                  bg-pcm-surfaceSoft/80                           /* Fondo suave PCM.                                    */
                  text-pcm-muted                                  /* Texto en color secundario PCM.                      */
                  border                                          /* Borde para darle jerarquía visual.                  */
                "
                  style={{
                    borderColor: 'var(--pcm-color-acento-border)', // Borde coloreado según el rol visual actual.
                    color: 'var(--pcm-color-acento)',              // Texto en color de acento del rol.
                  }}
                >
                  Inventarios · Materiales
                </span>
              </div>

              {/* Cuerpo del modal con el formulario de material */}
              <div className="space-y-4">
                {/* Grid con dos columnas en md+ y una columna en pantallas pequeñas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo: Nombre (obligatorio) */}
                  <div>
                    <label className="block text-pcm-text text-sm font-semibold mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={datosFormulario.nombre}
                      onChange={(evento) =>
                        actualizarDatosFormulario({
                          ...datosFormulario,
                          nombre: evento.target.value,
                        })
                      }
                      autoFocus
                      placeholder="Nombre del material"
                      list={idListaNombres}
                      className="
                      w-full px-4 py-2
                      bg-pcm-surfaceSoft
                      border border-pcm-borderSoft
                      rounded-lg
                      text-pcm-text placeholder-slate-400
                      focus:outline-none
                      focus:ring-2 focus:ring-pcm-primary/60
                    "
                    />
                  </div>

                  {/* Campo: Categoría (obligatorio) */}
                  <div>
                    <label className="block text-pcm-text text-sm font-semibold mb-2">
                      Categoría *
                    </label>
                    <input
                      type="text"
                      value={datosFormulario.categoria}
                      onChange={(evento) =>
                        actualizarDatosFormulario({
                          ...datosFormulario,
                          categoria: evento.target.value,
                        })
                      }
                      placeholder="Categoría del material"
                      list={idListaCategorias}
                      className="
                      w-full px-4 py-2
                      bg-pcm-surfaceSoft
                      border border-pcm-borderSoft
                      rounded-lg
                      text-pcm-text placeholder-slate-400
                      focus:outline-none
                      focus:ring-2 focus:ring-pcm-primary/60
                    "
                    />
                  </div>

                  {/* Campo: Unidad (obligatorio) */}
                  <div>
                    <label className="block text-pcm-text text-sm font-semibold mb-2">
                      Unidad *
                    </label>
                    <input
                      type="text"
                      value={datosFormulario.unidad}
                      onChange={(evento) =>
                        actualizarDatosFormulario({
                          ...datosFormulario,
                          unidad: evento.target.value,
                        })
                      }
                      placeholder="Unidad (kg, m, unidad, etc.)"
                      list={idListaUnidades}
                      className="
                      w-full px-4 py-2
                      bg-pcm-surfaceSoft
                      border border-pcm-borderSoft
                      rounded-lg
                      text-pcm-text placeholder-slate-400
                      focus:outline-none
                      focus:ring-2 focus:ring-pcm-primary/60
                    "
                    />
                  </div>

                  {/* Campo: Precio Unitario (obligatorio) */}
                  <div>
                    <label className="block text-pcm-text text-sm font-semibold mb-2">
                      Precio unitario *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={datosFormulario.precioUnitario}
                      onChange={(evento) =>
                        actualizarDatosFormulario({
                          ...datosFormulario,
                          precioUnitario: evento.target.value,
                        })
                      }
                      placeholder="Precio unitario (COP)"
                      className="
                      w-full px-4 py-2
                      bg-pcm-surfaceSoft
                      border border-pcm-borderSoft
                      rounded-lg
                      text-pcm-text
                      placeholder-slate-400
                      focus:outline-none
                      focus:ring-2 focus:ring-pcm-primary/60
                    "
                    />
                  </div>

                  {/* ──────────────
                    * Asignaciones por almacén
                    * Permite definir múltiples combinaciones de almacén, cantidad y stock mínimo.
                    * Cada asignación está representada en el arreglo datosFormulario.asignaciones.
                    * Se renderiza a continuación de los campos básicos (nombre, categoría, unidad, precio).
                    */}
                </div>

                {/* Bloque de asignaciones */}
                <div className="space-y-4 mt-4">
                  <h4 className="font-semibold text-sm text-pcm-text">
                    Asignaciones por almacén *
                  </h4>
                  {/* Renderiza una fila por cada asignación existente */}
                  {Array.isArray(datosFormulario.asignaciones) &&
                    datosFormulario.asignaciones.map((asig, idx) => {
                      // Para cada asignación generamos select de almacén, input de cantidad y stock mínimo.
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                        >
                          {/* Select de almacén */}
                          <div className="md:col-span-2">
                            <label className="block text-pcm-text text-sm font-medium mb-1">
                              Almacén
                            </label>
                            <select
                              value={asig.almacen}
                              onChange={(evento) => {
                                const nuevas = datosFormulario.asignaciones.map((a, i) =>
                                  i === idx ? { ...a, almacen: evento.target.value } : a,
                                );
                                actualizarDatosFormulario({
                                  ...datosFormulario,
                                  asignaciones: nuevas,
                                });
                              }}
                              className="
                              w-full px-4 py-2
                              bg-pcm-surfaceSoft
                              border border-pcm-borderSoft
                              rounded-lg
                              text-pcm-text
                              focus:outline-none
                              focus:ring-2 focus:ring-pcm-primary/60
                            "
                            >
                              <option value="" disabled hidden>
                                Seleccione un almacén
                              </option>
                              {Array.isArray(almacenes) &&
                                almacenes.map((almacenItem) => (
                                  <option
                                    key={almacenItem._id}
                                    value={almacenItem._id}
                                  >
                                    {almacenItem.nombre}
                                  </option>
                                ))}
                            </select>
                          </div>
                          {/* Cantidad */}
                          <div>
                            <label className="block text-pcm-text text-sm font-medium mb-1">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              value={asig.cantidad}
                              onChange={(evento) => {
                                const nuevas = datosFormulario.asignaciones.map((a, i) =>
                                  i === idx ? { ...a, cantidad: evento.target.value } : a,
                                );
                                actualizarDatosFormulario({
                                  ...datosFormulario,
                                  asignaciones: nuevas,
                                });
                              }}
                              placeholder="Cantidad"
                              className="
                              w-full px-4 py-2
                              bg-pcm-surfaceSoft
                              border border-pcm-borderSoft
                              rounded-lg
                              text-pcm-text
                              placeholder-slate-400
                              focus:outline-none
                              focus:ring-2 focus:ring-pcm-primary/60
                            "
                            />
                          </div>
                          {/* Stock mínimo */}
                          <div>
                            <label className="block text-pcm-text text-sm font-medium mb-1">
                              Stock mínimo
                            </label>
                            <input
                              type="number"
                              value={asig.stockMinimo}
                              onChange={(evento) => {
                                const nuevas = datosFormulario.asignaciones.map((a, i) =>
                                  i === idx ? { ...a, stockMinimo: evento.target.value } : a,
                                );
                                actualizarDatosFormulario({
                                  ...datosFormulario,
                                  asignaciones: nuevas,
                                });
                              }}
                              placeholder="Stock mínimo"
                              className="
                              w-full px-4 py-2
                              bg-pcm-surfaceSoft
                              border border-pcm-borderSoft
                              rounded-lg
                              text-pcm-text
                              placeholder-slate-400
                              focus:outline-none
                              focus:ring-2 focus:ring-pcm-primary/60
                            "
                            />
                          </div>
                          {/* Botón para eliminar asignación (solo si hay más de una) */}
                          <div className="flex justify-end pb-2">
                            {datosFormulario.asignaciones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nuevas = datosFormulario.asignaciones.filter(
                                    (_, i) => i !== idx,
                                  );
                                  actualizarDatosFormulario({
                                    ...datosFormulario,
                                    asignaciones: nuevas,
                                  });
                                }}
                                className="
                                  p-2 rounded-md
                                  bg-pcm-surfaceSoft
                                  border border-pcm-borderSoft
                                  text-pcm-text
                                  hover:bg-red-50
                                  hover:text-red-600
                                  flex items-center justify-center
                                "
                                aria-label="Eliminar asignación"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Botón para agregar nueva asignación */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nuevas = [
                          ...datosFormulario.asignaciones,
                          {
                            almacen: '',
                            cantidad: '',
                            stockMinimo: '',
                            id: undefined,
                          },
                        ];
                        actualizarDatosFormulario({
                          ...datosFormulario,
                          asignaciones: nuevas,
                        });
                      }}
                      className="
                        inline-flex items-center gap-2
                        px-3 py-2
                        bg-pcm-surfaceSoft
                        border border-pcm-borderSoft
                        rounded-lg text-pcm-text
                        hover:bg-pcm-surface
                        text-sm font-medium
                        focus:outline-none
                        focus:ring-2 focus:ring-pcm-primary/60
                      "
                    >
                      <Plus size={16} />
                      <span>Agregar asignación</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pie del modal con botones de Cancelar y Guardar */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {/* Botón Cancelar: cierra el modal sin aplicar cambios */}
                <button
                  type="button"                                   // Botón normal, no envía formularios.
                  onClick={alCerrar}                              // Llama a alCerrar para cerrar el modal.
                  className="
                    w-full sm:flex-1                             /* Ocupa todo el ancho en móvil, mitad en sm+.         */
                    px-4 py-2
                    bg-pcm-surfaceSoft
                    border border-pcm-borderSoft
                    hover:bg-pcm-surface                         /* Sutil cambio de fondo en hover.                     */
                    text-pcm-text rounded-lg
                    text-sm font-semibold
                    transition duration-150                       /* Transición suave estándar.                          */
                  "
                >
                  Cancelar
                </button>

                {/* Botón Guardar: crea o actualiza el material según materialEnEdicion */}
                <button
                  type="button"                                   // Botón normal (no submit) controlado desde el padre.
                  onClick={alGuardar}                             // Llama a alGuardar (definido en el componente padre).
                  className="
                    w-full sm:flex-1                             /* Full width en móvil, flex-1 en escritorio.          */
                    px-4 py-2
                    rounded-lg
                    text-sm font-semibold
                    text-slate-900                               /* Texto oscuro para contrastar con el degradado.      */
                    shadow-pcm-suave                             /* Sombra suave PCM.                                   */
                    hover:shadow-pcm-profunda                    /* Sombra más profunda en hover.                       */
                    transform                                    /* Habilita pequeñas transformaciones.                 */
                    hover:-translate-y-0.5                       /* Se levanta ligeramente al pasar el mouse.           */
                    transition duration-150                       /* Transición general suave.                           */
                  "
                  style={{
                    // Aplica un degradado suave usando las variables de color por rol.
                    backgroundImage:
                      'linear-gradient(90deg, var(--pcm-color-acento), var(--pcm-color-acento-border))',
                  }}
                >
                  {materialEnEdicion ? 'Actualizar material' : 'Crear material'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Exporta el componente por defecto para poder importarlo fácilmente desde otras vistas.
export default ModalEdicionMaterial;
