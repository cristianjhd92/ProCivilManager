// File: frontend/src/modules/projects/modals/ModalCrearProyecto.jsx     // Ruta del archivo dentro del módulo de proyectos.
// Description: Modal para crear nuevos proyectos desde el panel de      // Descripción general: modal interno (admin / líder) que
//              administración (roles admin / líder). Usa el tema visual // permite registrar un proyecto completo (datos básicos,
//              PCM, valida campos clave (fechas, teléfono, requeridos)  // fechas, presupuesto, estado, prioridad, contacto y
//              y crea el proyecto en el backend mediante el servicio    // equipo) y lo envía al backend con createProject,
//              createProject. Notifica al componente padre mediante     // mostrando errores en el modal y notificando al padre
//              las props onSave y onClose, sin usar ModalGenerico.      // vía onSave / onClose. Usa estilos y helpers PCM.

// =========================
// Importaciones principales
// =========================
import React, { useState, useEffect, useRef } from "react";              // Importa React y los hooks para estado, efectos y referencias.

// =========================
// Íconos de interfaz (lucide-react)
// =========================
import {
  X,                                                                    // Ícono de cierre del modal.
  Building2,                                                             // Ícono de edificio para representar proyectos.
  Calendar,                                                              // Ícono de calendario para fechas.
  DollarSign,                                                            // Ícono de dinero para presupuesto.
  Clock,                                                                 // Ícono de reloj para duración.
  Flag,                                                                  // Ícono de bandera para estado del proyecto.
  TrendingUp,                                                            // Ícono de gráfica para progreso.
  Users,                                                                 // Ícono de usuarios para el equipo.
} from "lucide-react";

// =========================
// Servicios de API (backend PCM)
// =========================
import {
  createProject as crearProyecto,
  obtenerMateriales,
  obtenerUsuarios,
} from "../../../services/api/api.js"; // Importa funciones para crear proyectos, cargar materiales y obtener usuarios.

// Importa componentes específicos del módulo de proyectos para manejar criterios de avance y selección de materiales.
import SelectorCriteriosProyecto from "../components/SelectorCriteriosProyecto.jsx";
import SelectorMaterialesProyecto from "../components/selectorMaterialesProyecto.jsx";
import SelectorClienteProyecto from "../components/selectorClienteProyecto.jsx";

// =========================
// Estado inicial del formulario
// =========================
const estadoInicialFormulario = {                                        // Objeto con los valores por defecto del formulario de proyecto.
  title: "",                                                             // Nombre del proyecto.
  location: "",                                                          // Ubicación del proyecto.
  // Nuevos campos para país y ciudad (información geográfica)
  country: "Colombia",                                                   // País donde se ejecuta la obra (por defecto Colombia).
  city: "",                                                              // Ciudad o municipio del proyecto.
  type: "obra civil",                                                    // Tipo de proyecto (por defecto "obra civil").
  duration: "",                                                          // Duración en días (se maneja como string en el input).
  startDate: "",                                                         // Fecha de inicio (YYYY-MM-DD).
  endDate: "",                                                           // Fecha de fin (YYYY-MM-DD).
  budget: "",                                                            // Presupuesto en COP (string para input numérico).
  status: "planning",                                                    // Estado inicial del proyecto.
  priority: "media",                                                     // Prioridad por defecto (media).
  email: "",                                                             // Correo del cliente.
  phone: "",                                                             // Teléfono del cliente.
  progress: 0,                                                           // Progreso inicial en porcentaje.
  team: [""],                                                            // Lista de integrantes del equipo (al menos un campo vacío).
};

// =========================
// Funciones auxiliares
// =========================

/**
 * Valida el teléfono de contacto.
 * - Limpia todos los caracteres no numéricos.
 * - Considera válido un número con al menos 7 dígitos (fijo o celular).
 */
const esTelefonoValido = (telefono) => {                                 // Función helper para validar la longitud del teléfono.
  const soloDigitos = (telefono || "").replace(/\D/g, "");               // Elimina espacios, guiones y otros símbolos, dejando solo dígitos.
  return soloDigitos.length >= 7;                                        // Requiere al menos 7 dígitos para considerarse válido.
};

/**
 * Componente ModalCrearProyecto
 *
 * Props:
 *  - isOpen: boolean que controla si el modal está visible.
 *  - onClose: función que se ejecuta al cerrar el modal.
 *  - onSave: función que se llama al crear el proyecto (recibe el proyecto creado).
 *
 * Nota: por compatibilidad con el resto del proyecto, los nombres de las props
 * se mantienen en inglés (isOpen, onClose, onSave), pero internamente todo
 * se maneja en español.
 */
const ModalCrearProyecto = ({ isOpen, onClose, onSave }) => {            // Declara el componente funcional principal del modal.

  // =========================
  // Estado local del componente
  // =========================
  const [formulario, setFormulario] = useState(estadoInicialFormulario); // Estado con todos los campos del formulario de proyecto.
  const [guardando, setGuardando] = useState(false);                     // Bandera para indicar si se está guardando en el backend.
  const [error, setError] = useState("");                                // Mensaje de error visible en el modal (string vacío si no hay).

  // =========================
  // Estados para criterios de avance y materiales
  // =========================
  // Guarda la lista de criterios de avance seleccionados y su progreso calculado.
  const [criteriosAvance, setCriteriosAvance] = useState([]);
  const [progresoCriterios, setProgresoCriterios] = useState(0);

  // Estados para manejar la selección de materiales. materialsDisponibles se carga
  // desde el backend una vez se abre el modal y materialesSeleccionados almacena
  // la lista controlada de asignaciones { material: id, cantidadAsignada }.
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState([]);

  // =========================
  // Estados para la selección del cliente
  // =========================
  const [clientesDisponibles, setClientesDisponibles] = useState([]);   // Lista de usuarios con rol cliente disponibles en la app.
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');   // ID del cliente elegido o 'propio' si es proyecto propio.
  const [esProyectoPropio, setEsProyectoPropio] = useState(false);      // Bandera que indica si el proyecto es propio (sin cliente).

  /**
   * Maneja la actualización de la lista de materiales seleccionados.
   * Se pasa como callback al componente SelectorMaterialesProyecto.
   *
   * @param {Array} nuevaLista Lista de objetos { material, cantidadAsignada }.
   */
  const manejarCambioMateriales = (nuevaLista) => {
    setMaterialesSeleccionados(nuevaLista);
  };

  /**
   * Callback que se pasa al componente SelectorCriteriosProyecto.
   * Recibe el arreglo actualizado de criterios y el porcentaje calculado,
   * actualiza los estados locales y sincroniza el campo progress del formulario.
   *
   * @param {Array} listaNueva   Nuevos criterios con estado de cumplimiento.
   * @param {number} avance      Porcentaje calculado a partir de criterios.
   */
  const manejarCambioCriterios = (listaNueva, avance) => {
    setCriteriosAvance(listaNueva);
    setProgresoCriterios(avance);
    setFormulario((prev) => ({
      ...prev,
      progress: avance,
    }));
  };

  /**
   * Maneja el cambio de cliente seleccionado en el selector.
   * Actualiza el estado clienteSeleccionado y la bandera esProyectoPropio
   * según el valor recibido. Si el valor es 'propio', marca el proyecto
   * como propio y limpia el cliente seleccionado; de lo contrario,
   * asigna el id del cliente y marca como no propio.
   *
   * @param {string} nuevoValor Id del cliente seleccionado o 'propio'
   */
  const manejarCambioCliente = (nuevoValor) => {
    if (nuevoValor === 'propio') {
      setEsProyectoPropio(true);
      setClienteSeleccionado('propio');
    } else if (!nuevoValor) {
      // Si se limpia la selección, resetea ambos estados.
      setEsProyectoPropio(false);
      setClienteSeleccionado('');
    } else {
      setEsProyectoPropio(false);
      setClienteSeleccionado(nuevoValor);
    }
  };

  // Referencia al input del nombre para hacer foco inicial al abrir
  const referenciaNombreProyecto = useRef(null);                         // useRef para enfocar el campo "Nombre del proyecto".

  // =========================
  // Efectos
  // =========================
  useEffect(() => {                                                      // Efecto que se ejecuta cuando cambia isOpen.
    if (isOpen) {                                                        // Solo aplica lógica cuando el modal se abre.
      setFormulario(estadoInicialFormulario);                            // Resetea el formulario al estado inicial.
      setError("");                                                      // Limpia mensajes de error previos.

      // Resetea criterios y progreso al abrir el modal.
      setCriteriosAvance([]);
      setProgresoCriterios(0);

      // Resetea los materiales seleccionados.
      setMaterialesSeleccionados([]);

      // Resetea la selección de cliente y la bandera de proyecto propio.
      setClienteSeleccionado('');
      setEsProyectoPropio(false);

      // Carga la lista de usuarios con rol "cliente" desde el backend. Filtra
      // aquellos que no están eliminados lógicamente. Si ocurre algún error,
      // deja la lista vacía. Esta lista se usa en el selector de clientes.
      obtenerUsuarios()
        .then((listaUsuarios) => {
          if (Array.isArray(listaUsuarios)) {
            const soloClientes = listaUsuarios.filter(
              (u) => u.role === 'cliente' && (!u.isDeleted || u.isDeleted === false)
            );
            setClientesDisponibles(soloClientes);
          } else {
            setClientesDisponibles([]);
          }
        })
        .catch(() => {
          setClientesDisponibles([]);
        });

      // Carga la lista de materiales disponibles desde el backend. Si
      // ocurre algún error, se deja la lista vacía sin afectar al resto
      // del formulario.
      obtenerMateriales()
        .then((lista) => {
          if (Array.isArray(lista)) {
            setMaterialesDisponibles(lista);
          } else {
            setMaterialesDisponibles([]);
          }
        })
        .catch(() => {
          setMaterialesDisponibles([]);
        });

      // Se usa un pequeño delay para garantizar que el input exista en el DOM
      setTimeout(() => {                                                 // Programa la ejecución para el siguiente ciclo de render.
        if (referenciaNombreProyecto.current) {                          // Verifica que la referencia al input no sea nula.
          referenciaNombreProyecto.current.focus();                      // Coloca el foco en el campo de nombre del proyecto.
        }
      }, 0);                                                             // Delay mínimo (0 ms).
    }
  }, [isOpen]);                                                          // Dependencia: se ejecuta cada vez que cambie isOpen.

  // Efecto para calcular automáticamente la duración en días cuando cambian las fechas
  useEffect(() => {
    const { startDate, endDate } = formulario;
    // Si ambas fechas están definidas, calcula la duración en días
    if (startDate && endDate) {
      const inicio = new Date(startDate);
      const fin = new Date(endDate);
      // Calcula la diferencia en milisegundos y la convierte a días (ceiling para incluir día inicial)
      const msPorDia = 1000 * 60 * 60 * 24;
      const diff = fin - inicio;
      // Si la fecha de fin es anterior, la duración será 0
      const dias = diff >= 0 ? Math.ceil(diff / msPorDia) : 0;
      // Actualiza la duración en el formulario sólo si es diferente para evitar renderizados innecesarios
      setFormulario((estadoAnterior) => {
        const duracionActual = estadoAnterior.duration;
        const nuevaDuracion = dias.toString();
        if (duracionActual === nuevaDuracion) return estadoAnterior;
        return { ...estadoAnterior, duration: nuevaDuracion };
      });
    } else {
      // Si faltan fechas, limpia la duración
      setFormulario((estadoAnterior) =>
        estadoAnterior.duration !== ''
          ? { ...estadoAnterior, duration: '' }
          : estadoAnterior
      );
    }
    // Dependencias: startDate y endDate del formulario
  }, [formulario.startDate, formulario.endDate]);

  // =========================
  // Manejadores de cambios en el formulario
  // =========================

  /**
   * Manejador genérico para inputs controlados.
   * Utiliza el atributo "name" de cada input para actualizar el campo correspondiente.
   */
  const manejarCambioCampo = (evento) => {                               // Handler genérico para cualquier cambio en los inputs.
    const { name, value } = evento.target;                               // Extrae el nombre del campo y su valor actual.
    setFormulario((estadoAnterior) => ({                                 // Actualiza el estado tomando como base el estado anterior.
      ...estadoAnterior,                                                 // Copia todas las propiedades previas del formulario.
      [name]: value,                                                     // Sobrescribe solo el campo que cambió.
    }));
  };

  /**
   * Actualiza un integrante del equipo según su índice.
   * @param {number} indice - posición del integrante en el array team.
   * @param {string} valor - nuevo valor (nombre del integrante).
   */
  const manejarCambioIntegranteEquipo = (indice, valor) => {             // Maneja cambios en los campos de integrantes del equipo.
    setFormulario((estadoAnterior) => {                                  // Usa el estado previo del formulario.
      const equipoActualizado = [...estadoAnterior.team];                // Crea una copia superficial del array team.
      equipoActualizado[indice] = valor;                                 // Reemplaza el valor en la posición indicada.
      return { ...estadoAnterior, team: equipoActualizado };             // Devuelve el nuevo estado con el team actualizado.
    });
  };

  /**
   * Agrega un nuevo campo para un integrante del equipo.
   * Se añade un string vacío al array team.
   */
  const agregarIntegranteEquipo = () => {                                // Handler para el botón "Agregar integrante".
    setFormulario((estadoAnterior) => ({                                 // Actualiza el estado del formulario.
      ...estadoAnterior,                                                 // Copia el resto de propiedades.
      team: [...estadoAnterior.team, ""],                                // Agrega un nuevo string vacío al array del equipo.
    }));
  };

  /**
   * Elimina un integrante del equipo según su índice.
   * @param {number} indice - posición del integrante a eliminar.
   */
  const eliminarIntegranteEquipo = (indice) => {                         // Maneja la eliminación de un integrante del equipo.
    setFormulario((estadoAnterior) => ({                                 // Usa el estado anterior para generar el nuevo.
      ...estadoAnterior,                                                 // Copia todas las demás propiedades del formulario.
      team: estadoAnterior.team.filter((_, i) => i !== indice),          // Filtra el integrante cuyo índice coincide con el indicado.
    }));
  };

  /**
   * Cierra el modal limpiando el formulario y el error,
   * luego llama al callback onClose si está definido.
   */
  const manejarCerrar = () => {                                          // Función centralizada para cerrar y resetear el modal.
    setFormulario(estadoInicialFormulario);                              // Restablece el formulario a su estado inicial.
    setError("");                                                        // Limpia cualquier mensaje de error.
    if (typeof onClose === "function") {                                 // Verifica que onClose exista y sea una función.
      onClose();                                                         // Llama al callback de cierre provisto por el componente padre.
    }
  };

  /**
   * Maneja el envío del formulario al backend.
   * Realiza validación básica en frontend y usa crearProyecto para persistir.
   * Además, maneja de forma robusta la respuesta del backend, aceptando
   * tanto { proyecto: {...} } como un objeto de proyecto plano.
   */
  const manejarEnvioFormulario = async (evento) => {                     // Handler del evento submit del formulario.
    evento.preventDefault();                                             // Evita la recarga completa de la página.
    setGuardando(true);                                                  // Activa la bandera de guardado mientras se procesa.
    setError("");                                                        // Limpia cualquier error previo.

    try {
      // Construye el payload en el formato esperado por el backend
      const datosProyecto = {                                            // Objeto que se enviará a la API de creación de proyectos.
        title: formulario.title.trim(),                                  // Nombre del proyecto sin espacios al inicio o final.
        location: formulario.location.trim(),                            // Ubicación también recortada.
        pais: formulario.country.trim(),                                 // País del proyecto (campo requerido por backend).
        ciudad: formulario.city.trim(),                                  // Ciudad del proyecto (campo requerido por backend).
        type: formulario.type,                                           // Tipo de proyecto seleccionado.
        duration: Number(formulario.duration) || 0,                      // Duración convertida a número (0 si no es válida).
        startDate: formulario.startDate,                                 // Fecha de inicio tal cual la selecciona el usuario.
        endDate: formulario.endDate,                                     // Fecha de fin.
        budget: Number(formulario.budget) || 0,                          // Presupuesto en número (0 si no es válido).
        status: formulario.status || "planning",                         // Estado del proyecto, con valor por defecto.
        priority: formulario.priority || "media",                        // Prioridad, con valor por defecto.
        email: formulario.email.trim(),                                  // Correo de contacto opcional (no se usa para asociar cliente).
        phone: formulario.phone.trim(),                                  // Teléfono del cliente sin espacios extra.
        // Progreso inicial y equipo (opcionales pero soportados por el backend)
        progress: Number(formulario.progress) || 0,                      // Progreso inicial convertido a número (0 si no es válido).
        team: formulario.team                                            // Equipo del proyecto.
          .map((miembro) => miembro.trim())                              // Elimina espacios sobrantes en cada nombre.
          .filter((miembro) => miembro.length > 0),                      // Quita entradas vacías del array.

        // Se incluye la lista de criterios de avance con su estado de cumplimiento
        // y porcentaje definido. Si no hay criterios definidos, el backend
        // generará su propia plantilla por defecto.
        criteriosAvance: criteriosAvance.map((c) => ({
          codigo: c.codigo,
          nombre: c.nombre,
          descripcion: c.descripcion,
          porcentaje: c.porcentaje,
          cumplido: !!c.cumplido,
          fechaCumplimiento: c.cumplido ? c.fechaCumplimiento || new Date().toISOString() : null,
        })),

        // Incluye los materiales seleccionados en el formato esperado por el backend
        materiales: materialesSeleccionados.map((item) => ({
          material: item.material,
          cantidadAsignada: item.cantidadAsignada,
        })),

        // Bandera de proyecto propio y referencia a cliente seleccionado
        esProyectoPropio: esProyectoPropio,
        clienteId:
          clienteSeleccionado && clienteSeleccionado !== 'propio'
            ? clienteSeleccionado
            : undefined,
      };

      // Validación básica: campos obligatorios
      if (
        !datosProyecto.title ||                                          // Requiere título.
        !datosProyecto.location ||                                       // Requiere ubicación.
        !datosProyecto.pais ||                                           // Requiere país.
        !datosProyecto.ciudad ||                                         // Requiere ciudad.
        !datosProyecto.type ||                                           // Requiere tipo de proyecto.
        !datosProyecto.duration ||                                       // Requiere duración mayor que 0.
        !datosProyecto.startDate ||                                      // Requiere fecha de inicio.
        !datosProyecto.endDate ||                                        // Requiere fecha de fin.
        !datosProyecto.budget ||                                         // Requiere presupuesto mayor que 0.
        !datosProyecto.phone ||                                          // Requiere teléfono del cliente.
        (!esProyectoPropio && (!clienteSeleccionado || clienteSeleccionado === '')) // Si no es propio, debe seleccionar cliente.
      ) {
        setError(
          "Por favor completa todos los campos obligatorios marcados con *." // Mensaje de error para campos requeridos.
        );
        setGuardando(false);                                              // Desactiva la bandera de guardado.
        return;                                                           // Detiene la ejecución del submit.
      }

      // Validación específica de teléfono (mínimo de dígitos)
      if (!esTelefonoValido(datosProyecto.phone)) {                       // Verifica la longitud mínima del teléfono.
        setError(
          "Ingresa un teléfono de contacto válido (mínimo 7 dígitos)."    // Mensaje específico para teléfono inválido.
        );
        setGuardando(false);                                              // Desactiva la bandera de guardado.
        return;                                                           // Detiene el envío.
      }

      // Validación adicional: coherencia de fechas
      const fechaInicio = new Date(datosProyecto.startDate);             // Convierte la fecha de inicio a objeto Date.
      const fechaFin = new Date(datosProyecto.endDate);                  // Convierte la fecha de fin a objeto Date.
      if (fechaFin < fechaInicio) {                                      // Si la fecha de fin es anterior a la de inicio...
        setError(
          "La fecha de fin no puede ser anterior a la fecha de inicio."  // Mensaje de validación de fechas.
        );
        setGuardando(false);                                             // Desactiva la bandera de guardado.
        return;                                                          // Detiene el envío.
      }

      // Llama al servicio de API para crear el proyecto en el backend
      const respuesta = await crearProyecto(datosProyecto);              // Espera la respuesta de la API de creación de proyectos.

      // Normaliza la respuesta para aceptar tanto { proyecto: {...} } como un objeto plano de proyecto.
      const proyectoCreado = respuesta?.proyecto || respuesta;          // Toma proyecto de respuesta.proyecto o la respuesta directa.

      // Verifica que realmente tengamos un proyecto creado con _id antes de continuar.
      if (!proyectoCreado || !proyectoCreado._id) {                     // Si no hay proyecto válido (sin _id) se considera error.
        setError(
          respuesta?.message ||                                         // Usa el mensaje del backend si viene.
          "No se pudo crear el proyecto."                               // Mensaje genérico de respaldo.
        );
        setGuardando(false);                                            // Desactiva la bandera de guardado.
        return;                                                         // Termina la función sin cerrar el modal.
      }

      // Si el componente padre pasó un onSave, se llama con el proyecto creado ya normalizado
      if (typeof onSave === "function") {                               // Verifica que onSave sea una función válida.
        onSave(proyectoCreado);                                         // Notifica al padre con el nuevo proyecto creado.
      }

      // Resetea el formulario tras la creación exitosa
      setFormulario(estadoInicialFormulario);                           // Vuelve a colocar el formulario en valores iniciales.

      // Cierra el modal notificando al padre
      if (typeof onClose === "function") {                              // Verifica que onClose exista.
        onClose();                                                      // Ejecuta el cierre del modal (flujo controlado por el padre).
      }
    } catch (errorCapturado) {                                          // Captura errores inesperados (red, servidor, etc.).
      console.error("Error al crear proyecto:", errorCapturado);        // Loguea el error en consola para depuración.
      setError(
        errorCapturado?.response?.data?.message ||                      // Usa el mensaje específico del backend si existe...
        errorCapturado?.message ||                                      // ...o el mensaje genérico del error...
        "Ocurrió un error al crear el proyecto."                        // ...o un mensaje de respaldo.
      );
    } finally {
      setGuardando(false);                                              // Siempre desactiva la bandera de guardado al final.
    }
  };

  // =========================
  // Renderizado condicional
  // =========================

  // Si el modal no debe estar abierto, no se renderiza nada.
  if (!isOpen) return null;                                              // Evita montar el contenido si isOpen es false.

  // =========================
  // Render principal del modal
  // =========================
  return (
    // Capa oscura de fondo que cubre toda la pantalla y centra el contenido del modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70
                 backdrop-blur-sm p-4 overflow-y-auto"                  // ⬅️ Agregado overflow-y-auto para permitir scroll del overlay.
    >
      {/* Contenedor principal del modal usando la tarjeta estándar PCM con efecto de entrada. */}
      <div
        className="pcm-card bg-pcm-bg/95 pcm-fondo-degradado-principal
                   border border-pcm-primary/30 w-full max-w-4xl max-h-screen
                   overflow-hidden animate-slide-up-soft"              // ⬅️ Reemplazado max-h-[90vh] por max-h-screen.
      >
        {/* Layout interno en columna: header fijo, contenido scrollable y footer de acciones. */}
        <div className="flex flex-col h-full">
          {/* Encabezado del modal con ícono, título y botón de cierre. */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            {/* Lado izquierdo: ícono de proyecto y textos. */}
            <div className="flex items-center gap-3">
              {/* Ícono dentro de un fondo sólido acorde a la paleta PCM. */}
              <div className="w-11 h-11 rounded-2xl bg-pcm-primary flex items-center justify-center shadow-md ring-2 ring-pcm-secondary/60">
                <Building2 size={22} className="text-white" />           {/* Ícono de edificio en blanco sobre el fondo primario. */}
              </div>
              {/* Título y subtítulo del modal. */}
              <div>
                <h3 className="text-lg md:text-xl font-bold text-pcm-text">
                  Crear nuevo proyecto                                   {/* Título principal del modal. */}
                </h3>
                <p className="text-xs md:text-sm text-pcm-accent/80">
                  Registra un proyecto para gestionarlo desde el panel administrativo.
                </p>
              </div>
            </div>
            {/* Botón de cierre con ícono X. */}
            <button
              type="button"                                              // Evita que funcione como submit del formulario.
              onClick={manejarCerrar}                                    // Cierra el modal usando la función centralizada.
              className="text-pcm-muted hover:text-pcm-accent transition-all duration-150 p-2
                         hover:bg-white/5 rounded-full hover:scale-110"
            >
              <X size={20} />                                            {/* Ícono de cierre de lucide-react. */}
            </button>
          </div>

          {/* Contenido scrollable + formulario. */}
          <form
            onSubmit={manejarEnvioFormulario}                            // Form principal que envía todos los datos al backend.
            className="flex flex-col flex-1"                             // Ocupa el alto restante del modal.
          >
            {/* Contenedor scrollable con los campos del formulario. */}
            <div className="pcm-scroll-y flex-1 p-6">
              {/* Bloque para mostrar el mensaje de error si existe. */}
              {error && (
                <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 text-sm px-4 py-3">
                  {error}                                                {/* Mensaje de error visible para el usuario. */}
                </div>
              )}

              {/* Contenedor de campos con espaciado vertical. */}
              <div className="space-y-5 text-pcm-text">
                {/* Línea 1: título y ubicación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo: nombre del proyecto */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                      Nombre del proyecto *                              {/* Campo obligatorio para identificar el proyecto. */}
                    </label>
                    <input
                      ref={referenciaNombreProyecto}                     // Referencia usada para dar foco automático al abrir.
                      type="text"                                        // Tipo de input texto.
                      name="title"                                       // Clave dentro del estado formulario.
                      value={formulario.title}                           // Valor controlado desde el estado.
                      onChange={manejarCambioCampo}                      // Actualiza el estado usando el handler genérico.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text placeholder-pcm-muted/70"
                      placeholder="Ej. Rehabilitación Vial Calle 80"    // Ejemplo de nombre de proyecto típico en Bogotá.
                    />
                  </div>
                  {/* Campo: ubicación */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                      Ubicación *                                        {/* Campo obligatorio para la ciudad/dirección. */}
                    </label>
                    <input
                      type="text"                                        // Input tipo texto.
                      name="location"                                    // Clave en el estado formulario.
                      value={formulario.location}                        // Valor controlado.
                      onChange={manejarCambioCampo}                      // Actualiza el estado.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text placeholder-pcm-muted/70"
                      placeholder="Bogotá D.C."                          // Ejemplo de ubicación en contexto colombiano.
                    />
                  </div>
                </div>

                {/* Línea nueva: país y ciudad (información geográfica) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo: país */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                      País *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formulario.country}
                      onChange={manejarCambioCampo}
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text placeholder-pcm-muted/70"
                      placeholder="Colombia"
                    />
                  </div>
                  {/* Campo: ciudad */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formulario.city}
                      onChange={manejarCambioCampo}
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text placeholder-pcm-muted/70"
                      placeholder="Ej. Bogotá D.C."
                    />
                  </div>
                </div>

                {/* Línea 2: tipo de proyecto y duración */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo: tipo de proyecto */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                      Tipo de proyecto *                                 {/* Campo obligatorio con lista de opciones. */}
                    </label>
                    <select
                      name="type"                                        // Clave en formulario.
                      value={formulario.type}                            // Valor actual seleccionado.
                      onChange={manejarCambioCampo}                      // Handler genérico.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text"
                    >
                      <option value="obra civil">Obra civil</option>     {/* Opción por defecto: obra civil. */}
                      <option value="diseño">Diseño</option>             {/* Proyecto de diseño. */}
                      <option value="interventoría">Interventoría</option> {/* Proyecto de interventoría. */}
                    </select>
                  </div>
                  {/* Campo: duración del proyecto en días (calculado automáticamente) */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Clock size={14} className="text-pcm-muted" />
                      Duración (días) *
                    </label>
                    <input
                      type="number"
                      name="duration"
                      min="0"
                      value={formulario.duration}
                      readOnly
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text placeholder-pcm-muted/70"
                      placeholder="Se calcula automáticamente"
                    />
                  </div>
                </div>

                {/* Línea 3: fechas de inicio y fin */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo: fecha de inicio */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Calendar size={14} className="text-pcm-muted" />  {/* Ícono de calendario. */}
                      Fecha de inicio *                                   {/* Campo obligatorio. */}
                    </label>
                    <input
                      type="date"                                        // Input tipo fecha.
                      name="startDate"                                   // Vinculado a formulario.startDate.
                      value={formulario.startDate}                       // Valor controlado.
                      onChange={manejarCambioCampo}                      // Actualiza el estado.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text"
                    />
                  </div>
                  {/* Campo: fecha de fin */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Calendar size={14} className="text-pcm-muted" />  {/* Ícono de calendario. */}
                      Fecha de fin *                                      {/* Campo obligatorio. */}
                    </label>
                    <input
                      type="date"                                        // Input tipo fecha.
                      name="endDate"                                     // Vinculado a formulario.endDate.
                      value={formulario.endDate}                         // Valor controlado.
                      onChange={manejarCambioCampo}                      // Actualiza el estado.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text"
                    />
                  </div>
                </div>

                {/* Línea 4: presupuesto, estado y prioridad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Campo: presupuesto */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <DollarSign size={14} className="text-pcm-muted" /> {/* Ícono de dinero. */}
                      Presupuesto (COP) *                                 {/* Campo obligatorio de presupuesto. */}
                    </label>
                    <input
                      type="number"                                       // Input numérico.
                      name="budget"                                       // Vinculado a formulario.budget.
                      min="0"                                             // Valor mínimo 0.
                      value={formulario.budget}                           // Valor controlado.
                      onChange={manejarCambioCampo}                       // Actualiza estado.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text placeholder-pcm-muted/70"
                      placeholder="Ej. 150000000"                         // Ejemplo de presupuesto en COP.
                    />
                  </div>
                  {/* Campo: estado del proyecto */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Flag size={14} className="text-pcm-muted" />      {/* Ícono de bandera. */}
                      Estado                                             {/* Campo opcional (tiene valor por defecto). */}
                    </label>
                    <select
                      name="status"                                      // Vinculado a formulario.status.
                      value={formulario.status}                          // Valor actual.
                      onChange={manejarCambioCampo}                      // Handler genérico.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text"
                    >
                      <option value="planning">Planificación</option>    {/* Proyecto en etapa de planificación. */}
                      <option value="in-progress">En progreso</option>   {/* Proyecto en ejecución. */}
                      <option value="on-hold">En pausa</option>          {/* Proyecto con avance detenido. */}
                      <option value="completed">Completado</option>      {/* Proyecto finalizado. */}
                    </select>
                  </div>
                  {/* Campo: prioridad del proyecto */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                      Prioridad                                           {/* Campo opcional (tiene valor por defecto). */}
                    </label>
                    <select
                      name="priority"                                     // Vinculado a formulario.priority.
                      value={formulario.priority}                         // Valor actual.
                      onChange={manejarCambioCampo}                       // Handler genérico.
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text"
                    >
                      <option value="alta">Alta</option>                 {/* Prioridad alta. */}
                      <option value="media">Media</option>               {/* Prioridad media. */}
                      <option value="baja">Baja</option>                 {/* Prioridad baja. */}
                    </select>
                  </div>
                </div>

                {/* Línea 5: cliente asociado / propio y teléfono de contacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector de cliente o proyecto propio */}
                  <div>
                    <SelectorClienteProyecto
                      clientes={clientesDisponibles}
                      valorSeleccionado={clienteSeleccionado}
                      onCambiarCliente={manejarCambioCliente}
                      esRequerido={true}
                      deshabilitado={false}
                      etiqueta="Cliente / Propietario *"
                    />
                  </div>
                  {/* Campo: teléfono de contacto */}
                  <div>
                    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                      Teléfono de contacto *
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formulario.phone}
                      onChange={manejarCambioCampo}
                      inputMode="tel"
                      className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                 focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                 text-sm text-pcm-text placeholder-pcm-muted/70"
                      placeholder="3001234567"
                    />
                  </div>
                </div>
                {/* Línea adicional: correo de contacto opcional */}
                <div>
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 block">
                    Correo de contacto (opcional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formulario.email}
                    onChange={manejarCambioCampo}
                    className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                               focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                               text-sm text-pcm-text placeholder-pcm-muted/70"
                    placeholder="contacto@dominio.com"
                  />
                </div>

                {/* Línea 6: progreso calculado (solo lectura) */}
                <div>
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                    <TrendingUp size={14} className="text-pcm-muted" />  {/* Ícono de progreso. */}
                    Progreso (%)                                           {/* Muestra el avance calculado a partir de criterios. */}
                  </label>
                  <input
                    type="number"
                    name="progress"
                    min="0"
                    max="100"
                    value={formulario.progress}
                    readOnly
                    className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                               focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                               text-sm text-pcm-text placeholder-pcm-muted/70"
                    placeholder="0"
                  />
                  {/* Barra de progreso visual para complementar el valor numérico */}
                  {formulario.progress !== undefined && formulario.progress !== '' && (
                    <div className="mt-2">
                      <div className="bg-pcm-bg/60 rounded-full h-2 w-full overflow-hidden">
                        <div
                          className="h-full bg-pcm-primary transition-all duration-300"
                          style={{ width: `${formulario.progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-pcm-muted mt-1">
                        El avance se actualiza automáticamente según los criterios seleccionados.
                      </p>
                    </div>
                  )}
                </div>

                {/*
                 * Bloque: criterios de avance
                 * Permite marcar criterios que definen el avance del proyecto. El componente
                 * genera una lista basada en el tipo de proyecto seleccionado y actualiza
                 * el progreso de manera automática al seleccionarlos o deseleccionarlos.
                 */}
                <SelectorCriteriosProyecto
                  tipo={formulario.type}
                  criteriosIniciales={criteriosAvance}
                  onCriteriosChange={manejarCambioCriterios}
                />

                {/*
                 * Bloque: selección de materiales
                 * Permite agregar materiales disponibles del inventario al proyecto con sus
                 * cantidades. Este apartado es opcional al crear el proyecto; si no se
                 * asignan materiales, el arreglo enviado al backend será vacío.
                 */}
                <SelectorMaterialesProyecto
                  materialesDisponibles={materialesDisponibles}
                  materialesSeleccionados={materialesSeleccionados}
                  onCambiarMateriales={manejarCambioMateriales}
                  etiqueta="Materiales asignados al proyecto (opcional)"
                />

                {/* Línea 7: equipo del proyecto (lista dinámica) */}
                <div>
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users size={14} className="text-pcm-muted" />       {/* Ícono de usuarios. */}
                    Equipo (opcional)                                    {/* Campo no obligatorio, lista dinámica. */}
                  </label>
                  <div className="space-y-2">
                    {/* Renderiza un input por cada integrante definido en formulario.team */}
                    {formulario.team.map((integrante, indice) => (       // Recorre el array de integrantes.
                      <div key={indice} className="flex gap-2">
                        <input
                          type="text"                                    // Input de texto.
                          value={integrante}                             // Valor del integrante actual.
                          onChange={(evento) =>
                            manejarCambioIntegranteEquipo(indice, evento.target.value)
                          }                                              // Actualiza el integrante según su índice.
                          className="flex-1 p-3 rounded-xl bg-pcm-bg/60 border border-white/10
                                     focus:outline-none focus:border-pcm-primary focus:ring-1 focus:ring-pcm-primary/60
                                     text-sm text-pcm-text placeholder-pcm-muted/70"
                          placeholder="Nombre del integrante"            // Placeholder genérico para el equipo.
                        />
                        {/* Botón para eliminar integrante, solo aparece si hay más de uno */}
                        {formulario.team.length > 1 && (                 // Solo muestra el botón si hay más de un integrante.
                          <button
                            type="button"                                // No dispara el submit del formulario.
                            onClick={() => eliminarIntegranteEquipo(indice)} // Elimina el integrante con ese índice.
                            className="px-3 py-2 rounded-xl bg-red-500/80 text-white text-xs
                                       hover:bg-red-600 transition-all duration-150"
                          >
                            ✕                                            {/* Carácter de cierre como ícono. */}
                          </button>
                        )}
                      </div>
                    ))}
                    {/* Botón para agregar un nuevo integrante al equipo */}
                    <button
                      type="button"                                      // Evita enviar el formulario.
                      onClick={agregarIntegranteEquipo}                  // Agrega un nuevo campo al array team.
                      className="text-xs font-semibold text-pcm-primary hover:text-pcm-secondary transition-all duration-150"
                    >
                      + Agregar integrante                               {/* Texto del botón de agregado. */}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con botones de acción (cancelar / crear). */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-pcm-bg/80">
              {/* Botón cancelar: cierra el modal sin enviar información */}
              <button
                type="button"                                            // No dispara submit.
                onClick={manejarCerrar}                                  // Llama a la función de cierre centralizada.
                className="pcm-btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={guardando}                                     // Se deshabilita mientras está guardando.
              >
                Cancelar                                                 {/* Texto del botón de cancelación. */}
              </button>
              {/* Botón de envío del formulario: crea el proyecto en backend */}
              <button
                type="submit"                                            // Dispara manejarEnvioFormulario.
                disabled={guardando}                                     // Se deshabilita mientras se procesa la creación.
                className="pcm-btn-primary min-w-[150px]
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {guardando ? "Creando..." : "Crear proyecto"}            {/* Texto dinámico según estado de guardado. */}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente para usarlo en otras partes del panel de administración
export default ModalCrearProyecto;                                      // Exportación por defecto del componente refactorizado en español.
