// File: frontend/src/modules/warehouses/modals/ModalCrearEditarAlmacen.jsx     // Ruta del archivo dentro del módulo de almacenes.
// Description: Modal para crear o editar un almacén. Recibe el estado del      // Descripción: gestiona creación/edición de almacenes desde el workspace.
//              formulario y los manejadores desde el componente padre          // Explica que los handlers y datos vienen del padre (p.ej. AlmacenesView).
//              (por ejemplo, AlmacenesView), aplicando el tema visual PCM      // Indica que aplica la paleta PCM, sombras y animaciones globales.
//              (paleta `pcm`, sombras y animaciones globales), manteniendo     // Señala que mantiene la interfaz y textos en español, contexto colombiano.
//              la interfaz en español y adaptando colores al rol del usuario   // Añade que adapta colores clave del modal al rol (admin/líder/cliente/auditor).
//              actual (admin, líder de obra, cliente, auditor).               // Cumple la regla global de colores por rol en pantallas internas.

// ==========================
// Importaciones principales
// ==========================
import React from "react";                                                      // Importa React para poder definir componentes funcionales.
import { X } from "lucide-react";                                              // Importa el ícono de cierre (X) desde lucide-react.

// ===================================
// Helper de estilos según rol del panel
// ===================================
//
// Esta función devuelve clases Tailwind para el borde del modal y el chip de rol
// en el encabezado, según el rol del usuario actual:
//
//  - Admin    → tonos azules.
//  - Líder    → tonos naranjas.
//  - Cliente  → tonos verdes.
//  - Auditor  → tonos morados.
//
const obtenerClasesPanelPorRol = (rolUsuario) => {                             // Declara función auxiliar para calcular clases por rol.
  const rolNormalizado = (rolUsuario || "")                                    // Toma el rol recibido o cadena vacía si viene undefined/null.
    .toString()                                                                // Lo convierte a string por seguridad.
    .toLowerCase()                                                             // Pasa a minúsculas para comparar sin importar mayúsculas.
    .trim();                                                                   // Elimina espacios al inicio y al final.

  // Caso: administrador.
  if (rolNormalizado.includes("admin")) {                                      // Si el rol contiene "admin" en su descripción...
    return {
      bordeTarjeta: "border-sky-500/40",                                       // Aplica borde azul suave al contenedor principal del modal.
      chipRol:
        "bg-sky-500/15 text-sky-200 border border-sky-500/40",                 // Chip azul con borde y texto claros.
      etiquetaRol: "Administrador",                                            // Texto legible a mostrar en el chip.
    };
  }

  // Caso: líder de obra.
  if (
    rolNormalizado.includes("lider de obra") ||                                // Forma sin tilde completa.
    rolNormalizado.includes("líder de obra") ||                                // Forma con tilde completa.
    rolNormalizado.includes("lider")                                           // Forma abreviada "lider".
  ) {
    return {
      bordeTarjeta: "border-orange-500/40",                                    // Aplica borde naranja suave.
      chipRol:
        "bg-orange-500/15 text-orange-200 border border-orange-500/40",        // Chip naranja con borde naranja.
      etiquetaRol: "Líder de obra",                                            // Texto legible a mostrar en el chip.
    };
  }

  // Caso: cliente.
  if (rolNormalizado.includes("cliente")) {                                    // Si el rol contiene "cliente"...
    return {
      bordeTarjeta: "border-emerald-500/40",                                   // Aplica borde verde suave.
      chipRol:
        "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40",     // Chip verde con borde verde.
      etiquetaRol: "Cliente",                                                  // Texto legible "Cliente".
    };
  }

  // Caso: auditor.
  if (rolNormalizado.includes("auditor")) {                                    // Si el rol contiene "auditor"...
    return {
      bordeTarjeta: "border-purple-500/40",                                    // Aplica borde morado suave.
      chipRol:
        "bg-purple-500/15 text-purple-200 border border-purple-500/40",        // Chip morado con borde morado.
      etiquetaRol: "Auditor",                                                  // Texto legible "Auditor".
    };
  }

  // Caso por defecto: si el rol no coincide con ninguno de los anteriores.
  return {
    bordeTarjeta: "border-pcm-primary/40",                                     // Usa borde con el color primario PCM como respaldo.
    chipRol:
      "bg-pcm-primary/15 text-pcm-primary border border-pcm-primary/60",       // Chip con fondo y texto primario PCM.
    etiquetaRol: "Usuario",                                                    // Etiqueta genérica para el chip.
  };
};

// ============================================
// Componente funcional ModalCrearEditarAlmacen
// ============================================
//
// Props:
//
//  - estaAbierto:        bandera booleana que indica si el modal está visible.
//  - alCerrar:           función que se llama cuando el usuario cierra/cancela el modal.
//  - alEnviar:           función que se llama cuando se envía el formulario (crear/actualizar almacén).
//  - datosAlmacen:       objeto con los campos del almacén { nombre, direccion, telefono, encargado }.
//  - actualizarDatosAlmacen: función para actualizar el estado del formulario en el componente padre.
//  - almacenEnEdicion:   objeto o null; si existe, se está editando un almacén, si no, se crea uno nuevo.
//  - rolUsuario:         rol del usuario que está usando el workspace (admin, líder, cliente, auditor).
//
const ModalCrearEditarAlmacen = ({
  estaAbierto,                                                                 // Controla la visibilidad del modal (true = visible, false = oculto).
  alCerrar,                                                                    // Handler para cerrar el modal sin guardar cambios.
  alEnviar,                                                                    // Handler que procesa el envío del formulario (crear/actualizar).
  datosAlmacen,                                                                // Valores actuales de los campos del almacén.
  actualizarDatosAlmacen,                                                     // Setter que permite modificar el estado del formulario en el padre.
  almacenEnEdicion,                                                            // Si está definido, representa el almacén que se está editando.
  rolUsuario = "admin",                                                        // Rol del usuario actual, por defecto "admin" si no se especifica.
}) => {
  // Si el modal no está abierto, no se renderiza nada (evita insertarlo en el DOM).
  if (!estaAbierto) return null;                                               // Patrón habitual para mostrar/ocultar modales controlados por estado.

  // Calcula las clases del panel según el rol del usuario actual (borde y chip de rol).
  const estilosRolPanel = obtenerClasesPanelPorRol(rolUsuario);                // Obtiene bordeTarjeta, chipRol y etiquetaRol según el rol.

  // Handler interno para gestionar el envío del formulario.
  const manejarEnvioFormulario = (evento) => {
    evento.preventDefault();                                                   // Evita la recarga de la página al enviar el formulario.
    alEnviar(evento);                                                          // Delega la lógica de guardado en la función que viene desde el componente padre.
  };

  // JSX del modal que se muestra cuando estaAbierto es true.
  return (
    // Capa a pantalla completa: fondo oscuro semitransparente y modal centrado.
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in-soft"
      role="dialog"                                                            // Indica que este contenedor actúa como diálogo/modal.
      aria-modal="true"                                                        // Informa a tecnologías de asistencia que es un modal bloqueante.
      aria-labelledby="titulo-modal-almacen"                                   // Asocia el título del modal con este diálogo para accesibilidad.
    >
      {/* Contenedor principal del modal con tema PCM, borde por rol y animación de escala */}
      <div
        className={`
          bg-pcm-surfaceSoft/95 rounded-pcm-xl max-w-md w-full
          border shadow-pcm-soft animate-scale-in
          ${estilosRolPanel.bordeTarjeta}
        `}
      >
        {/* Encabezado del modal: título, chip de rol y botón de cierre */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
          {/* Bloque con título del modal y chip de rol actual */}
          <div className="flex items-center gap-2">
            {/* Título del modal, cambia según si se edita o se crea un almacén */}
            <h3
              id="titulo-modal-almacen"                                        // ID usado por aria-labelledby en el contenedor principal del modal.
              className="text-xl font-semibold text-pcm-text"
            >
              {almacenEnEdicion ? "Editar almacén" : "Nuevo almacén"}
            </h3>

            {/* Chip pequeño que muestra el rol actual del usuario (admin/líder/cliente/auditor) */}
            <span
              className={`
                px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase
                tracking-wide ${estilosRolPanel.chipRol}
              `}
            >
              {estilosRolPanel.etiquetaRol}
            </span>
          </div>

          {/* Botón de cierre del modal (equivale a cancelar) */}
          <button
            type="button"                                                      // Evita que este botón envíe el formulario.
            onClick={alCerrar}                                                 // Llama a alCerrar cuando el usuario hace clic en la X.
            className="text-pcm-muted hover:text-pcm-text transition duration-200"
            // Usa transición estándar con duración en lugar de transition-colors (regla Tailwind v4/compat).
          >
            <X size={24} />                                                    {/* Ícono X para indicar cierre del modal */}
          </button>
        </div>

        {/* Cuerpo del modal: formulario con los campos del almacén */}
        <form
          onSubmit={manejarEnvioFormulario}                                    // Usa el handler interno que delega en alEnviar.
          className="p-6 space-y-4"
        >
          {/* Campo: Nombre (obligatorio) */}
          <div>
            {/* Etiqueta para el campo "Nombre" */}
            <label className="block text-pcm-text text-sm font-semibold mb-2">
              Nombre *
            </label>
            {/* Input de texto vinculado a datosAlmacen.nombre */}
            <input
              type="text"                                                      // Campo de texto simple.
              value={datosAlmacen.nombre}                                      // Valor actual del nombre tomado de datosAlmacen.
              onChange={(evento) =>
                actualizarDatosAlmacen({                                       // Actualiza el estado del formulario en el padre.
                  ...datosAlmacen,                                             // Mantiene el resto de campos sin cambios.
                  nombre: evento.target.value,                                 // Solo modifica el campo "nombre".
                })
              }
              required                                                         // Marca este campo como obligatorio en el formulario.
              placeholder="Almacén Central"
              className="w-full px-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm
                         placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
            />
          </div>

          {/* Campo: Ciudad (requerido) */}
          <div>
            {/* Etiqueta para el campo "Ciudad" */}
            <label className="block text-pcm-text text-sm font-semibold mb-2">
              Ciudad *
            </label>
            <input
              type="text"
              value={datosAlmacen.ciudad || ''}
              onChange={(evento) =>
                actualizarDatosAlmacen({
                  ...datosAlmacen,
                  ciudad: evento.target.value,
                })
              }
              required
              placeholder="Bogotá"
              className="w-full px-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
            />
          </div>

          {/* Campo: País (requerido) */}
          <div>
            <label className="block text-pcm-text text-sm font-semibold mb-2">
              País *
            </label>
            <input
              type="text"
              value={datosAlmacen.pais || ''}
              onChange={(evento) =>
                actualizarDatosAlmacen({
                  ...datosAlmacen,
                  pais: evento.target.value,
                })
              }
              required
              placeholder="Colombia"
              className="w-full px-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
            />
          </div>

          {/* Campo: Dirección (opcional) */}
          <div>
            {/* Etiqueta para el campo "Dirección" */}
            <label className="block text-pcm-text text-sm font-semibold mb-2">
              Dirección
            </label>
            {/* Input de texto vinculado a datosAlmacen.direccion */}
            <input
              type="text"                                                      // Campo de texto para dirección.
              value={datosAlmacen.direccion}                                   // Valor actual tomado de datosAlmacen.direccion.
              onChange={(evento) =>
                actualizarDatosAlmacen({                                       // Actualiza el campo "direccion" en el estado del formulario.
                  ...datosAlmacen,
                  direccion: evento.target.value,
                })
              }
              placeholder="Calle 123 #45-67"
              className="w-full px-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm
                         placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
            />
          </div>

          {/* Campo: Teléfono (opcional, texto libre por ahora) */}
          <div>
            {/* Etiqueta para el campo "Teléfono" */}
            <label className="block text-pcm-text text-sm font-semibold mb-2">
              Teléfono
            </label>
            {/* Input de texto vinculado a datosAlmacen.telefono */}
            <input
              type="text"                                                      // Podría cambiarse a "tel" si luego se quiere validación nativa de teléfono.
              value={datosAlmacen.telefono}                                    // Valor actual tomado de datosAlmacen.telefono.
              onChange={(evento) =>
                actualizarDatosAlmacen({                                       // Actualiza el campo "telefono" en el estado del formulario.
                  ...datosAlmacen,
                  telefono: evento.target.value,
                })
              }
              placeholder="3001234567"
              className="w-full px-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm
                         placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
            />
          </div>

          {/* Campos: Encargado (nombre y apellido) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre del encargado */}
            <div>
              <label className="block text-pcm-text text-sm font-semibold mb-2">
                Nombre del encargado
              </label>
              <input
                type="text"
                value={datosAlmacen.encargadoNombre || ''}
                onChange={(evento) =>
                  actualizarDatosAlmacen({
                    ...datosAlmacen,
                    encargadoNombre: evento.target.value,
                  })
                }
                placeholder="Juan"
                className="w-full px-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm
                           placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
              />
            </div>
            {/* Apellido del encargado */}
            <div>
              <label className="block text-pcm-text text-sm font-semibold mb-2">
                Apellido del encargado
              </label>
              <input
                type="text"
                value={datosAlmacen.encargadoApellido || ''}
                onChange={(evento) =>
                  actualizarDatosAlmacen({
                    ...datosAlmacen,
                    encargadoApellido: evento.target.value,
                  })
                }
                placeholder="Pérez"
                className="w-full px-4 py-2 bg-pcm-bg/70 border border-white/10 rounded-lg text-pcm-text text-sm
                           placeholder:text-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/80"
              />
            </div>
          </div>

          {/* Fila de botones de acción: Cancelar / Guardar */}
          <div className="flex gap-3 pt-4">
            {/* Botón Cancelar: cierra el modal sin guardar cambios */}
            <button
              type="button"                                                    // Indica que este botón no envía el formulario.
              onClick={alCerrar}                                               // Llama a alCerrar al hacer clic.
              className="pcm-btn-ghost flex-1 text-sm font-semibold"
              // Usa helper global PCM para botón neutro/ghost, manteniendo el ancho compartido (flex-1).
            >
              Cancelar
            </button>

            {/* Botón Guardar: envía el formulario (crear o actualizar el almacén) */}
            <button
              type="submit"
              className="pcm-btn-primary flex-1 text-sm font-semibold"
              // Usa el helper global PCM de botón principal en lugar de bg-gradient-to-r (regla Tailwind v4/compat).
            >
              {almacenEnEdicion ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Exporta el modal por defecto para usarlo en AlmacenesView u otros componentes padre.
export default ModalCrearEditarAlmacen;                                         // Permite importar el modal y reutilizarlo en flujos de creación/edición de almacenes.
