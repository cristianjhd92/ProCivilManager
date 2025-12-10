// File: frontend/src/modules/projects/components/SelectorMaterialesProyecto.jsx
// Description: Componente para gestionar la selección y asignación de
//              materiales a un proyecto en PCM. Permite elegir un material
//              de la lista disponible, indicar la cantidad a asignar y
//              mostrar un listado editable de materiales seleccionados,
//              compatible con el backend (material + cantidadAsignada).

// =========================
// Importaciones principales
// =========================
import React, { useState } from "react";          // Importa React y el hook useState.
import {
  Package,                                       // Ícono para representar materiales.
  Plus,                                          // Ícono para agregar nuevos elementos.
  Trash2,                                        // Ícono para eliminar materiales de la lista.
} from "lucide-react";                           // Íconos usados de manera consistente en PCM.

// =========================
// Componente principal
// =========================

/**
 * Selector de materiales para proyectos.
 *
 * Props:
 * - materialesDisponibles: arreglo de materiales del inventario
 *   (al menos {_id, nombre, unidadMedida, cantidad}).
 * - materialesSeleccionados: arreglo controlado desde el padre con
 *   objetos { material: id, cantidadAsignada }.
 * - onCambiarMateriales: función que recibe el nuevo arreglo cuando se agrega
 *   o elimina un material.
 * - etiqueta: texto opcional para la etiqueta del bloque.
 */
const SelectorMaterialesProyecto = ({
  materialesDisponibles = [],                 // Lista de materiales posibles.
  materialesSeleccionados = [],               // Lista actual de materiales asignados.
  onCambiarMateriales = () => {},             // Callback al cambiar la lista.
  etiqueta = "Materiales asignados al proyecto", // Etiqueta superior del bloque.
}) => {
  // Estado local para el material que se está seleccionando en el formulario.
  const [materialSeleccionadoId, setMaterialSeleccionadoId] = useState(""); // Id del material elegido en el select.
  // Estado local para la cantidad que se desea asignar al material elegido.
  const [cantidadAsignada, setCantidadAsignada] = useState("");            // Cantidad en texto para poder validarla.

  // Busca un material de la lista por su id.
  const obtenerMaterialPorId = (id) =>
    materialesDisponibles.find((mat) => mat._id === id);                   // Devuelve el material cuyo _id coincida.

  // Maneja el cambio del select de material.
  const manejarCambioMaterial = (evento) => {
    // Actualiza el id seleccionado desde el valor del select.
    setMaterialSeleccionadoId(evento.target.value);
  };

  // Maneja el cambio del input de cantidad.
  const manejarCambioCantidad = (evento) => {
    // Actualiza el estado local de la cantidad con el valor del input.
    setCantidadAsignada(evento.target.value);
  };

  // Agrega un nuevo material a la lista de seleccionados.
  const manejarAgregarMaterial = () => {
    // Si no se ha seleccionado ningún material, no hacemos nada.
    if (!materialSeleccionadoId) return;

    // Convierte la cantidad a número.
    const cantidadNumero = Number(cantidadAsignada);
    // Valida que sea un número positivo.
    if (!Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
      // Si no es válido, simplemente no agrega (el padre podría mostrar errores si se desea).
      return;
    }

    // Verifica si el material ya existe en la lista actual.
    const yaExiste = materialesSeleccionados.some(
      (item) => item.material === materialSeleccionadoId
    );

    // Si ya existe, podríamos sumar cantidades o no permitir duplicados.
    // Por ahora, para mantener el control simple, NO permitimos duplicados.
    if (yaExiste) {
      // Evita agregar de nuevo para no confundir al backend.
      return;
    }

    // Construye el nuevo arreglo con el material agregado.
    const nuevaLista = [
      ...materialesSeleccionados,                                    // Copia los materiales actuales.
      {
        material: materialSeleccionadoId,                            // Id del material.
        cantidadAsignada: cantidadNumero,                            // Cantidad asignada como número.
      },
    ];

    // Llama al callback del padre con la nueva lista.
    onCambiarMateriales(nuevaLista);

    // Limpia el formulario local de selección.
    setMaterialSeleccionadoId("");                                   // Resetea el select.
    setCantidadAsignada("");                                         // Resetea la cantidad.
  };

  // Elimina un material de la lista de seleccionados.
  const manejarEliminarMaterial = (idMaterial) => {
    // Genera una nueva lista excluyendo el material con ese id.
    const nuevaLista = materialesSeleccionados.filter(
      (item) => item.material !== idMaterial
    );
    // Propaga la lista actualizada al padre.
    onCambiarMateriales(nuevaLista);
  };

  // Renderiza el componente.
  return (
    <section
      className="
        pcm-card                                  /* Tarjeta PCM para contener todo el bloque */
        w-full                                    /* Ancho completo */
        flex flex-col                             /* Layout en columna */
        gap-3                                     /* Espaciado interno */
      "
    >
      {/* Encabezado con icono y texto de la sección */}
      <header
        className="
          flex items-center justify-between       /* Icono y texto de un lado, nada al otro por ahora */
          gap-2
        "
      >
        <div className="flex items-center gap-2">
          {/* Icono de materiales */}
          <div
            className="
              rounded-full                         /* Círculo */
              bg-pcm-secondary/10                  /* Fondo con tinte secundario */
              p-2                                  /* Espacio alrededor del ícono */
            "
          >
            <Package
              className="
                w-4 h-4                            /* Tamaño pequeño del ícono */
                text-pcm-secondary                 /* Color secundario PCM */
              "
            />
          </div>
          {/* Texto del encabezado */}
          <div className="flex flex-col">
            <h3
              className="
                text-xs                            /* Tamaño pequeño */
                font-semibold                      /* Semi-negrita */
                text-pcm-text                      /* Color principal PCM */
              "
            >
              {etiqueta}
            </h3>
            <p
              className="
                text-[11px]                        /* Texto muy pequeño */
                text-pcm-muted                     /* Color atenuado PCM */
              "
            >
              Asigna materiales desde el inventario al proyecto indicando
              la cantidad reservada para su ejecución.
            </p>
          </div>
        </div>
      </header>

      {/* Fila de controles para seleccionar material y cantidad */}
      <div
        className="
          flex flex-col                           /* Apila en columna en móviles */
          gap-2
          sm:flex-row                             /* En pantallas pequeñas, pasa a fila */
        "
      >
        {/* Select de material disponible */}
        <div className="flex-1 flex flex-col gap-1">
          <label
            className="
              text-[11px]                         /* Texto muy pequeño */
              font-medium                         /* Peso medio */
              text-pcm-text                       /* Color principal */
            "
          >
            Material
          </label>
          <select
            className={`
              pcm-select                           /* Estilo base PCM para selects */
              w-full                               /* Ancho completo */
              text-xs                              /* Texto pequeño */
              text-pcm-text                        /* Color de texto principal */
            `}
            value={materialSeleccionadoId}         // Valor controlado del select.
            onChange={manejarCambioMaterial}      // Maneja el cambio de material.
          >
            {/* Opción por defecto */}
            <option value="">
              Selecciona un material...
            </option>

            {/* Opciones generadas desde materialesDisponibles */}
            {materialesDisponibles.map((material) => {
              // Prepara un texto con el stock disponible y unidad.
              const stockTexto =
                material.cantidad != null
                  ? ` - Stock: ${material.cantidad} ${material.unidadMedida || ""}`
                  : "";

              // Devuelve la opción del select para este material.
              return (
                <option key={material._id} value={material._id}>
                  {material.nombre || "Material sin nombre"}
                  {stockTexto}
                </option>
              );
            })}
          </select>
        </div>

        {/* Input de cantidad a asignar */}
        <div className="flex-1 flex flex-col gap-1">
          <label
            className="
              text-[11px]
              font-medium
              text-pcm-text
            "
          >
            Cantidad a asignar
          </label>
          <input
            type="number"                          // Input numérico.
            min="0"                                // No permite valores negativos.
            step="any"                             // Permite decimales.
            className="
              w-full                               /* Ocupa ancho completo */
              rounded-pcm-xl                       /* Bordes PCM */
              border                               /* Borde sutil */
              border-pcm-surfaceSoft               /* Color de borde suave */
              bg-pcm-surface                       /* Fondo de superficie */
              px-3 py-2                            /* Relleno interno */
              text-xs                              /* Texto pequeño */
              text-pcm-text                        /* Color texto */
              outline-none                         /* Quita borde azul por defecto */
              focus:border-pcm-primary             /* Borde se pinta con color primario al foco */
              focus:ring-0                         /* Evita anillos adicionales */
            "
            value={cantidadAsignada}               // Valor controlado del input.
            onChange={manejarCambioCantidad}      // Maneja el cambio de cantidad.
          />
        </div>

        {/* Botón para agregar material a la lista */}
        <div
          className="
            flex items-end                        /* Alinea el botón al final vertical */
          "
        >
          <button
            type="button"                          // Evita enviar formularios al hacer click.
            onClick={manejarAgregarMaterial}      // Llama a la función de agregar.
            className="
              pcm-btn-primary                      /* Botón primario PCM */
              flex items-center gap-2             /* Ícono y texto en fila */
              text-xs                             /* Texto pequeño */
            "
          >
            <Plus className="w-3 h-3" />          {/* Ícono de agregar */}
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* Listado de materiales seleccionados */}
      <div
        className="
          border                                   /* Borde alrededor del listado */
          border-pcm-surfaceSoft                  /* Color de borde suave PCM */
          rounded-pcm-xl                          /* Bordes redondeados PCM */
          bg-pcm-surfaceSoft                      /* Fondo suave PCM */
          max-h-48                                /* Altura máxima para lista */
          overflow-hidden                          /* Oculta scroll nativo */
        "
      >
        {/* Encabezado de la lista */}
        <div
          className="
            flex
            items-center
            justify-between
            px-3 py-2
            bg-pcm-surface                        /* Encabezado con fondo de superficie */
          "
        >
          <span className="text-[11px] font-semibold text-pcm-text">
            Material
          </span>
          <span className="text-[11px] font-semibold text-pcm-text">
            Cantidad
          </span>
          <span className="text-[11px] font-semibold text-pcm-text">
            Acción
          </span>
        </div>

        {/* Cuerpo de la lista con scroll personalizado PCM */}
        <div
          className="
            pcm-scroll-y                           /* Usa scroll personalizado PCM */
            max-h-40                               /* Limita aún más la altura interna */
          "
        >
          {materialesSeleccionados.length === 0 ? (
            // Mensaje cuando no hay materiales seleccionados.
            <p
              className="
                px-3 py-2
                text-[11px]
                text-pcm-muted
              "
            >
              Aún no has asignado materiales a este proyecto.
            </p>
          ) : (
            // Lista de materiales seleccionados.
            <ul
              className="
                divide-y                            /* Línea divisoria entre filas */
                divide-pcm-surfaceSoft             /* Color de división */
              "
            >
              {materialesSeleccionados.map((item) => {
                // Busca la información del material por id.
                const material = obtenerMaterialPorId(item.material);
                // Construye un nombre legible.
                const nombreMaterial =
                  material?.nombre || "Material no encontrado";
                // Construye un texto de unidad si existe.
                const unidadTexto = material?.unidadMedida
                  ? ` (${material.unidadMedida})`
                  : "";

                // Devuelve una fila de la lista.
                return (
                  <li
                    key={item.material}
                    className="
                      flex items-center justify-between
                      px-3 py-2
                      text-xs
                      text-pcm-text
                    "
                  >
                    <span className="truncate max-w-[55%]">
                      {nombreMaterial}
                      {unidadTexto}
                    </span>
                    <span>
                      {item.cantidadAsignada}
                    </span>
                    <button
                      type="button"
                      onClick={() => manejarEliminarMaterial(item.material)}
                      className="
                        pcm-btn-ghost                    /* Botón tipo ghost PCM */
                        flex items-center gap-1
                        text-[11px]
                      "
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Quitar</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Nota explicativa al final */}
      <p
        className="
          text-[11px]
          text-pcm-muted
        "
      >
        Esta lista se envía al backend como un arreglo de objetos con el id del
        material y la cantidad asignada. El consumo y devoluciones se manejan
        después desde los servicios de inventario.
      </p>
    </section>
  );
};

// Exporta el componente por defecto.
export default SelectorMaterialesProyecto;
