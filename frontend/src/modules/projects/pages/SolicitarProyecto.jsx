// File: frontend/src/modules/projects/pages/SolicitarProyecto.jsx
// Description: Vista interna del workspace para crear o solicitar un nuevo proyecto/obra.
//              Maneja un flujo en 2 pasos:
//              - Paso 1: datos generales del proyecto (país, ciudad, dirección, fechas, presupuesto en COP, equipo de trabajo).
//              - Paso 2: asignación o sugerencia de materiales desde el inventario.
//              Calcula automáticamente la duración en días a partir de la fecha de inicio y fin,
//              muestra el presupuesto en pesos colombianos y estructura el equipo de trabajo con
//              nombres/apellidos, tipo y número de documento y cargo. Usa un dropdown PCM
//              (ListaDesplegablePcm) para selects visibles y se integra con el backend a través
//              del endpoint POST /proyectos/crear.

// ==========================
// Importaciones principales
// ==========================
import React, {                      // Importa React para poder usar JSX y hooks.
  useState,                          // Hook para manejar estados locales del componente.
  useEffect,                         // Hook para manejar efectos secundarios (fetch, cálculos, etc.).
} from "react";
import { useNavigate } from "react-router-dom"; // Hook de React Router para redirecciones internas.

// ==========================
// Importación de íconos
// ==========================
import {
  Plus,                              // Ícono para acciones de agregar.
  Minus,                             // Ícono para acciones de quitar.
  Search,                            // Ícono de búsqueda.
  Package,                           // Ícono de materiales/inventario.
  Briefcase,                         // Ícono asociado a información de proyecto.
  DollarSign,                        // Ícono de dinero/presupuesto.
  Calendar,                          // Ícono de calendario.
  MapPin,                            // Ícono de ubicación.
  Users,                             // Ícono de equipo de trabajo.
  AlertCircle,                       // Ícono para mensajes de error/alerta.
  CheckCircle,                       // Ícono para confirmación/éxito.
  Trash2,                            // Ícono para eliminar elementos.
} from "lucide-react";

// ======================================
// Componente helper: ListaDesplegablePcm
// ======================================
const ListaDesplegablePcm = ({
  name,                              // Nombre del campo para el formulario.
  value,                             // Valor actual del select.
  onChange,                          // Manejador de cambio.
  children,                          // Opciones <option> hijas.
  className = "",                    // Clases adicionales opcionales.
  ...rest                            // Resto de props que se quieran pasar.
}) => {
  return (
    <select
      name={name}                    // Asigna el nombre para identificar el campo.
      value={value}                  // Vincula el valor controlado desde el estado.
      onChange={onChange}            // Ejecuta el manejador al cambiar de opción.
      className={                    // Clases de estilo combinando helper PCM y Tailwind.
        `pcm-select w-full rounded-2xl border border-white/5 ` +
        `bg-pcm-bg/60 px-4 py-3 text-pcm-text ` +
        `focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60 ` +
        className
      }
      {...rest}                      // Propaga el resto de props (por ejemplo, disabled).
    >
      {children}                     {/* Renderiza las opciones que reciba como children. */}
    </select>
  );
};

// ======================================
// Componente principal: SolicitarProyecto
// ======================================
const SolicitarProyecto = ({ rolUsuario = "" }) => {
  const navigate = useNavigate();    // Hook de navegación para redirigir a otras rutas internas.

  // ==========================
  // Derivados de rol
  // ==========================
  const esLiderObra = rolUsuario === "lider de obra"; // Bandera si el usuario es líder de obra.
  const esCliente = rolUsuario === "cliente";          // Bandera si el usuario es cliente.
  const esAdmin = rolUsuario === "admin";             // Bandera si el usuario es administrador.

  // Título principal interno según el rol.
  const tituloPantalla = esCliente
    ? "Solicitud de obra"                             // Para cliente: enfoque en solicitud.
    : "Nuevo proyecto / obra";                        // Para líder/admin: enfoque en creación formal.

  // Subtítulo explicativo también según el rol.
  const subtituloAccion = esCliente
    ? "Completa la información del proyecto para que nuestro equipo técnico evalúe y programe la obra."
    : "Completa la información del proyecto y asigna los materiales necesarios para registrar la obra en ProCivil Manager.";

  // ==========================
  // Estados principales
  // ==========================
  const [pasoActual, setPasoActual] = useState(1);    // Paso actual del flujo (1 o 2).
  const [estaCargando, setEstaCargando] = useState(false); // Indica si se está enviando la solicitud al backend.

  const [materiales, setMateriales] = useState([]);   // Lista de materiales disponibles traída desde el backend.
  const [terminoBusqueda, setTerminoBusqueda] = useState(""); // Término para filtrar materiales por nombre/categoría.

  // Estado de notificación flotante (éxito/error).
  const [notificacion, setNotificacion] = useState({
    show: false,                                      // Si la notificación está visible.
    type: "",                                         // Tipo de notificación ("success" | "error").
    message: "",                                      // Mensaje de texto a mostrar.
  });

  // Estado del formulario del proyecto (paso 1).
  const [datosProyecto, setDatosProyecto] = useState({
    title: "",                                        // Título del proyecto.
    pais: "Colombia",                                 // País del proyecto (por defecto Colombia).
    ciudad: "",                                       // Ciudad o municipio del proyecto.
    location: "",                                     // Dirección exacta de la obra.
    type: "residencial",                              // Tipo de proyecto (residencial por defecto).
    budget: "",                                       // Presupuesto en pesos colombianos (COP).
    duration: "",                                     // Duración en días (se calcula automáticamente).
    comentario: "",                                   // Comentarios adicionales.
    priority: "media",                                // Prioridad (baja, media, alta).
    startDate: "",                                    // Fecha de inicio.
    endDate: "",                                      // Fecha de fin.
    email: "",                                        // Correo de contacto.
    team: [],                                         // Equipo de trabajo: arreglo de objetos con datos completos.
  });

  // Estado para materiales seleccionados en el paso 2.
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState([]); // Materiales asignados o sugeridos.

  // Estado para capturar un nuevo integrante del equipo antes de agregarlo al arreglo.
  const [nuevoIntegrante, setNuevoIntegrante] = useState({
    nombresApellidos: "",                             // Nombres y apellidos completos.
    tipoDocumento: "",                                // Tipo de documento (CC, CE, TI, PAS...).
    numeroDocumento: "",                              // Número de documento.
    cargo: "",                                        // Cargo o rol dentro del proyecto.
  });

  // ==========================
  // Efecto: cargar materiales
  // ==========================
  useEffect(() => {
    // Al montar el componente se intenta cargar la lista de materiales.
    obtenerMateriales();
  }, []);                                             // Se ejecuta solo una vez al montar el componente.

  // ==========================
  // Efecto: calcular duración en días a partir de las fechas
  // ==========================
  useEffect(() => {
    // Si ambas fechas están diligenciadas se intenta calcular la duración.
    if (datosProyecto.startDate && datosProyecto.endDate) {
      const inicio = new Date(datosProyecto.startDate); // Convierte la fecha de inicio a objeto Date.
      const fin = new Date(datosProyecto.endDate);      // Convierte la fecha de fin a objeto Date.

      // Valida que las fechas sean válidas y que inicio sea anterior o igual a fin.
      if (
        !Number.isNaN(inicio.getTime()) &&
        !Number.isNaN(fin.getTime()) &&
        inicio <= fin
      ) {
        const diffMs = fin.getTime() - inicio.getTime(); // Diferencia en milisegundos.
        const diffDias = Math.floor(
          diffMs / (1000 * 60 * 60 * 24)                 // Convierte milisegundos a días completos.
        ) + 1;                                           // Se suma 1 para contar días calendario (incluyendo ambos extremos).

        setDatosProyecto((previo) => ({
          ...previo,                                     // Mantiene los demás campos del proyecto.
          duration: diffDias.toString(),                 // Guarda la duración en días como string.
        }));
      } else {
        // Si algo no cuadra (fechas inválidas o fin < inicio) se limpia la duración.
        setDatosProyecto((previo) => ({
          ...previo,
          duration: "",
        }));
      }
    } else {
      // Si falta alguna de las dos fechas, la duración se deja vacía.
      setDatosProyecto((previo) => ({
        ...previo,
        duration: "",
      }));
    }
  }, [datosProyecto.startDate, datosProyecto.endDate]); // Solo depende de cambios en las fechas.

  // ==========================
  // Función: obtener materiales del backend
  // ==========================
  const obtenerMateriales = async () => {
    try {
      const token = localStorage.getItem("token");    // Recupera el token JWT de localStorage.

      const response = await fetch(                  // Llama al endpoint de materiales del backend.
        `${import.meta.env.VITE_API_URL}/materiales`,
        {
          headers: {
            Authorization: `Bearer ${token}`,        // Envía el token por el header Authorization.
          },
        }
      );

      const data = await response.json();            // Parsea la respuesta JSON.

      if (!response.ok) {                            // Si el status no es 2xx se considera error.
        throw new Error(data.message || "Error al cargar materiales");
      }

      setMateriales(data);                           // Actualiza el listado de materiales disponibles.
    } catch (error) {
      mostrarNotificacion(                           // Muestra notificación de error en UI.
        "error",
        error.message || "Error al cargar materiales"
      );
    }
  };

  // ==========================
  // Función: mostrar notificación flotante
  // ==========================
  const mostrarNotificacion = (type, message) => {
    setNotificacion({ show: true, type, message });  // Muestra la notificación con tipo y mensaje.

    setTimeout(() => {
      // Después de 4 segundos se oculta automáticamente.
      setNotificacion({ show: false, type: "", message: "" });
    }, 4000);
  };

  // ==========================
  // Manejo de cambios en campos simples del proyecto (paso 1)
  // ==========================
  const manejarCambioCampo = (evento) => {
    const { name, value } = evento.target;           // Extrae el nombre del campo y el valor ingresado.

    setDatosProyecto((previo) => ({
      ...previo,                                     // Mantiene el resto del objeto sin cambios.
      [name]: value,                                 // Actualiza solo el campo que cambió.
    }));
  };

  // ==========================
  // Agregar integrante al equipo de trabajo
  // ==========================
  const agregarIntegranteEquipo = () => {
    const nombresLimpios = nuevoIntegrante.nombresApellidos.trim(); // Limpia espacios del nombre completo.
    const tipoDoc = nuevoIntegrante.tipoDocumento.trim();           // Limpia espacios del tipo de documento.
    const numeroDoc = nuevoIntegrante.numeroDocumento.trim();       // Limpia espacios del número de documento.
    const cargo = nuevoIntegrante.cargo.trim();                     // Limpia espacios del cargo.

    // Valida que todos los campos del integrante estén diligenciados.
    if (!nombresLimpios || !tipoDoc || !numeroDoc || !cargo) {
      mostrarNotificacion(
        "error",
        "Completa nombres y apellidos, tipo de documento, número de documento y cargo antes de agregar al equipo."
      );
      return;                                        // No continúa si falta información.
    }

    // Evita duplicar integrantes por número de documento.
    const yaExiste = datosProyecto.team.some(
      (integrante) => integrante.numeroDocumento === numeroDoc
    );

    if (yaExiste) {
      mostrarNotificacion(
        "error",
        "Ya registraste un integrante con ese número de documento."
      );
      return;                                        // No agrega si hay duplicado.
    }

    // Agrega el nuevo integrante con su estructura completa al arreglo team.
    setDatosProyecto((previo) => ({
      ...previo,
      team: [
        ...previo.team,                              // Mantiene los integrantes anteriores.
        {
          nombresApellidos: nombresLimpios,          // Guarda el nombre completo.
          tipoDocumento: tipoDoc,                    // Guarda el tipo de documento.
          numeroDocumento: numeroDoc,                // Guarda el número de documento.
          cargo,                                     // Guarda el cargo.
        },
      ],
    }));

    // Limpia los campos del formulario de nuevo integrante.
    setNuevoIntegrante({
      nombresApellidos: "",
      tipoDocumento: "",
      numeroDocumento: "",
      cargo: "",
    });
  };

  // ==========================
  // Eliminar integrante del equipo de trabajo
  // ==========================
  const eliminarIntegranteEquipo = (numeroDocumentoIntegrante) => {
    setDatosProyecto((previo) => ({
      ...previo,                                     // Mantiene el resto de información del proyecto.
      team: previo.team.filter(
        (integrante) =>
          integrante.numeroDocumento !== numeroDocumentoIntegrante // Filtra el que se quiere eliminar.
      ),
    }));
  };

  // ==========================
  // Agregar un material a la lista de seleccionados
  // ==========================
  const agregarMaterial = (material) => {
    const yaExiste = materialesSeleccionados.find(
      (m) => m.material === material._id            // Busca si ya se agregó ese material antes.
    );

    if (!yaExiste) {
      setMaterialesSeleccionados((previo) => [
        ...previo,                                   // Mantiene materiales ya seleccionados.
        {
          material: material._id,                    // ID del material (para backend).
          nombre: material.nombre,                   // Nombre del material.
          cantidadDisponible: material.cantidad,     // Cantidad disponible en inventario.
          precioUnitario: material.precioUnitario,   // Precio unitario del material.
          cantidadAsignada: 1,                       // Cantidad inicial asignada (1 por defecto).
        },
      ]);
    }
  };

  // ==========================
  // Eliminar un material de la lista de seleccionados
  // ==========================
  const eliminarMaterial = (idMaterial) => {
    setMaterialesSeleccionados((previo) =>
      previo.filter((m) => m.material !== idMaterial) // Filtra el material que se desea quitar.
    );
  };

  // ==========================
  // Actualizar cantidad asignada de un material
  // ==========================
  const actualizarCantidadMaterial = (idMaterial, nuevaCantidad) => {
    setMaterialesSeleccionados((previo) =>
      previo.map((m) =>
        m.material === idMaterial                    // Si es el material que buscamos...
          ? {
            ...m,                                  // Mantiene el resto de campos del material.
            cantidadAsignada: Math.max(
              1,                                   // Nunca menos de 1 unidad.
              Math.min(nuevaCantidad, m.cantidadDisponible) // Ni más de lo disponible.
            ),
          }
          : m                                        // Si no es el que buscamos, lo deja igual.
      )
    );
  };

  // ==========================
  // Calcular costo total de materiales
  // ==========================
  const calcularCostoTotal = () => {
    return materialesSeleccionados.reduce(
      (total, m) => total + m.cantidadAsignada * m.precioUnitario, // Suma cantidad * precio unitario.
      0                                                             // Valor inicial del acumulador.
    );
  };

  // ==========================
  // Validar paso 1 y pasar al paso 2
  // ==========================
  const manejarSiguientePaso = () => {
    const camposFaltantes = [];                   // Lista para acumular campos obligatorios faltantes.

    if (!datosProyecto.title.trim())
      camposFaltantes.push("Título del proyecto"); // Valida título.

    if (!datosProyecto.pais.trim())
      camposFaltantes.push("País");               // Valida país.

    if (!datosProyecto.ciudad.trim())
      camposFaltantes.push("Ciudad / municipio"); // Valida ciudad/municipio.

    if (!datosProyecto.location.trim())
      camposFaltantes.push("Dirección");          // Valida dirección.

    if (!datosProyecto.type.trim())
      camposFaltantes.push("Tipo de proyecto");   // Valida tipo.

    if (!datosProyecto.budget || Number(datosProyecto.budget) <= 0) {
      camposFaltantes.push("Presupuesto");        // Presupuesto debe ser > 0.
    }

    if (!datosProyecto.duration || Number(datosProyecto.duration) <= 0) {
      camposFaltantes.push("Duración (días)");    // Duración debe ser un valor positivo (calculado).
    }

    if (!datosProyecto.startDate)
      camposFaltantes.push("Fecha de inicio");    // Falta fecha de inicio.
    if (!datosProyecto.endDate)
      camposFaltantes.push("Fecha de fin");       // Falta fecha de fin.
    if (!datosProyecto.email.trim())
      camposFaltantes.push("Email de contacto");  // Falta correo.

    // Valida coherencia entre fechas (inicio no puede ser mayor que fin).
    if (datosProyecto.startDate && datosProyecto.endDate) {
      const inicio = new Date(datosProyecto.startDate); // Fecha de inicio.
      const fin = new Date(datosProyecto.endDate);      // Fecha de fin.

      if (inicio > fin) {
        mostrarNotificacion(
          "error",
          "La fecha de inicio no puede ser mayor que la fecha de fin."
        );
        return;                                    // Detiene el paso si las fechas no tienen sentido.
      }
    }

    // Valida formato básico de correo electrónico.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Expresión regular simple para correos.
    if (
      datosProyecto.email &&
      !emailRegex.test(datosProyecto.email.trim())  // Si el correo no cumple el patrón...
    ) {
      mostrarNotificacion(
        "error",
        "Ingresa un correo electrónico válido."
      );
      return;                                      // No continúa hasta que el correo sea válido.
    }

    // Si hay campos obligatorios faltantes, se informa y no se avanza.
    if (camposFaltantes.length > 0) {
      mostrarNotificacion(
        "error",
        `Por favor completa los siguientes campos obligatorios antes de continuar: ${camposFaltantes.join(
          ", "
        )}.`
      );
      return;
    }

    // Si todo está correcto, se pasa al paso 2.
    setPasoActual(2);
  };

  // ==========================
  // Enviar solicitud/creación de proyecto al backend
  // ==========================
  const enviarSolicitudProyecto = async () => {
    // Líder y admin deben asignar al menos un material; cliente puede enviar sin materiales.
    const debeExigirMateriales = esLiderObra || esAdmin;

    if (debeExigirMateriales && materialesSeleccionados.length === 0) {
      mostrarNotificacion(
        "error",
        "Debes asignar al menos un material a la obra antes de crear el proyecto."
      );
      return;
    }

    setEstaCargando(true);                        // Activa indicador de carga mientras se envía la información.

    try {
      const token = localStorage.getItem("token"); // Recupera el token JWT del almacenamiento local.

      // Construye el payload para el backend.
      const payload = {
        ...datosProyecto,                          // Incluye todos los campos del proyecto (incluyendo país y ciudad).
        materiales: materialesSeleccionados.map((m) => ({
          material: m.material,                    // ID del material.
          cantidadAsignada: m.cantidadAsignada,    // Cantidad asignada.
        })),
        rolOrigen: rolUsuario || undefined,        // Rol de quien crea/solicita el proyecto (opcional).
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/proyectos/crear`, // Endpoint de creación/solicitud de proyecto.
        {
          method: "POST",                         // Método POST para crear recurso.
          headers: {
            "Content-Type": "application/json",   // Cuerpo en formato JSON.
            Authorization: `Bearer ${token}`,     // Token JWT en el header.
          },
          body: JSON.stringify(payload),          // Convierte el payload a JSON.
        }
      );

      const data = await response.json();         // Parsea la respuesta JSON.

      if (response.ok) {
        // Mensaje según sea cliente o líder/admin.
        const mensajeExito = esCliente
          ? "Solicitud de proyecto enviada exitosamente."
          : "Proyecto creado exitosamente.";

        mostrarNotificacion("success", mensajeExito); // Notificación de éxito.

        setTimeout(() => {
          navigate("/Proyectos");                // Redirige a la vista de proyectos.
        }, 2000);
      } else {
        mostrarNotificacion(
          "error",
          data.message || "Error al crear proyecto"
        );
      }
    } catch (error) {
      mostrarNotificacion(
        "error",
        "Error de conexión con el servidor"
      );
    } finally {
      setEstaCargando(false);                   // Siempre desactiva el estado de carga al terminar.
    }
  };

  // ==========================
  // Filtrado de materiales por término de búsqueda
  // ==========================
  const materialesFiltrados = materiales.filter((m) => {
    const nombre = (m.nombre || "").toLowerCase();    // Normaliza nombre a minúsculas.
    const categoria = (m.categoria || "").toLowerCase(); // Normaliza categoría.
    const termino = terminoBusqueda.toLowerCase();    // Normaliza el término de búsqueda.

    return nombre.includes(termino) || categoria.includes(termino); // Coincidencia en nombre o categoría.
  });

  // ==========================
  // Presupuesto formateado en COP para mostrar ejemplo
  // ==========================
  const presupuestoFormateado =
    datosProyecto.budget && Number(datosProyecto.budget) > 0
      ? new Intl.NumberFormat("es-CO", {
        style: "currency",                         // Formato de moneda.
        currency: "COP",                           // Pesos colombianos.
        maximumFractionDigits: 0,                  // Sin decimales para ejemplo de obra.
      }).format(Number(datosProyecto.budget))
      : "";                                          // Si no hay presupuesto, no se muestra ejemplo.

  // ==========================
  // Render del componente
  // ==========================
  return (
    <div className="min-h-full bg-pcm-surface/40 rounded-pcm-xl border border-white/5 shadow-pcm-soft px-4 py-6 md:px-8 md:py-8">
      {/* Notificación flotante (éxito / error) */}
      {notificacion.show && (
        <div
          className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-pcm-xl shadow-pcm-soft flex items-center gap-3 border backdrop-blur-xl animate-slide-in-down-soft ${notificacion.type === "success"
              ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/40"
              : "bg-red-500/10 text-red-200 border-red-500/40"
            }`}
        >
          {/* Ícono según tipo de notificación */}
          {notificacion.type === "success" ? (
            <CheckCircle size={22} className="shrink-0" />
          ) : (
            <AlertCircle size={22} className="shrink-0" />
          )}

          {/* Contenido de la notificación */}
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-wide uppercase">
              {notificacion.type === "success" ? "Éxito" : "Atención"}
            </span>
            <span className="font-medium text-sm">{notificacion.message}</span>
          </div>
        </div>
      )}

      {/* Encabezado interno de la vista */}
      <div className="max-w-7xl mx-auto mb-8 animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
          {/* Título principal según rol */}
          <span className="block text-pcm-muted">
            {tituloPantalla}
          </span>
          {/* Subtítulo descriptivo */}
          <span className="mt-1 block text-sm md:text-base text-pcm-muted/80">
            {subtituloAccion}
          </span>
        </h1>
        <div className="mt-4 w-24 h-px bg-pcm-primary" />
      </div>

      {/* Stepper visual de pasos */}
      <div className="max-w-7xl mx-auto mb-8 animate-fade-in-up">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center">
          {/* Paso 1 */}
          <div
            className={`relative flex items-center gap-3 px-6 py-3 rounded-pcm-xl border text-sm font-medium transition-all duration-200 ${pasoActual === 1
                ? "bg-pcm-bg/80 text-pcm-text border-pcm-primary shadow-pcm-tab-glow"
                : "bg-pcm-surfaceSoft/80 text-pcm-muted border-white/5"
              }`}
          >
            {/* Burbuja con número o check */}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border transition-all duration-200 ${pasoActual === 1
                  ? "bg-pcm-primary text-slate-950 border-pcm-primary"
                  : pasoActual > 1
                    ? "bg-emerald-500/90 text-slate-950 border-emerald-400"
                    : "bg-slate-950/30 text-pcm-muted border-white/10"
                }`}
            >
              {pasoActual > 1 ? <CheckCircle size={14} /> : "1"}
            </div>

            {/* Texto del paso 1 */}
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-pcm-muted/80">
                Paso 1
              </span>
              <div className="flex items-center gap-2">
                <Briefcase size={18} />
                <span>Información del proyecto</span>
              </div>
            </div>

            {/* Barra inferior del paso activo */}
            <div
              className={`pointer-events-none absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-all duration-200 ${pasoActual === 1 ? "bg-pcm-primary" : "bg-transparent"
                }`}
            />
          </div>

          {/* Separador entre pasos en escritorio */}
          <div className="hidden h-px w-16 bg-pcm-primary/40 md:block" />

          {/* Paso 2 */}
          <div
            className={`relative flex items-center gap-3 px-6 py-3 rounded-pcm-xl border text-sm font-medium transition-all duration-200 ${pasoActual === 2
                ? "bg-pcm-bg/80 text-pcm-text border-pcm-primary shadow-pcm-tab-glow"
                : "bg-pcm-surfaceSoft/80 text-pcm-muted border-white/5"
              }`}
          >
            {/* Burbuja con número del paso 2 */}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border transition-all duration-200 ${pasoActual === 2
                  ? "bg-pcm-primary text-slate-950 border-pcm-primary"
                  : "bg-slate-950/30 text-pcm-muted border-white/10"
                }`}
            >
              2
            </div>

            {/* Texto del paso 2 */}
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wide text-pcm-muted/80">
                Paso 2
              </span>
              <div className="flex items-center gap-2">
                <Package size={18} />
                <span>
                  {esCliente
                    ? "Materiales sugeridos (opcional)"
                    : "Asignación de materiales"}
                </span>
              </div>
            </div>

            {/* Barra inferior del paso activo */}
            <div
              className={`pointer-events-none absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-all duration-200 ${pasoActual === 2 ? "bg-pcm-primary" : "bg-transparent"
                }`}
            />
          </div>
        </div>
      </div>

      {/* Contenido de los pasos */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Paso 1: Información del proyecto */}
        {pasoActual === 1 && (
          <div className="bg-pcm-surfaceSoft/90 rounded-pcm-xl shadow-pcm-soft p-6 md:p-8 border border-white/5 backdrop-blur-sm animate-fade-in-up">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Título del proyecto */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  Título del proyecto *
                </label>
                <input
                  type="text"
                  name="title"
                  value={datosProyecto.title}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder="Ej: Construcción Residencial Los Pinos"
                />
              </div>

              {/* País */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  País *
                </label>
                <input
                  type="text"
                  name="pais"
                  value={datosProyecto.pais}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder="Colombia"
                />
              </div>

              {/* Ciudad / municipio */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  Ciudad / municipio *
                </label>
                <input
                  type="text"
                  name="ciudad"
                  value={datosProyecto.ciudad}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder="Ej: Bogotá D.C."
                />
              </div>

              {/* Dirección exacta */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  <MapPin className="mr-2 inline" size={16} />
                  Dirección exacta *
                </label>
                <input
                  type="text"
                  name="location"
                  value={datosProyecto.location}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder="Dirección del proyecto (barrio, nomenclatura, referencia, etc.)"
                />
              </div>

              {/* Tipo de proyecto (dropdown PCM) */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  Tipo de proyecto *
                </label>
                <ListaDesplegablePcm
                  name="type"
                  value={datosProyecto.type}
                  onChange={manejarCambioCampo}
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="infraestructura">Infraestructura</option>
                </ListaDesplegablePcm>
              </div>

              {/* Presupuesto (COP) */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  <DollarSign className="mr-2 inline" size={16} />
                  Presupuesto estimado (COP) *
                </label>
                <input
                  type="number"
                  name="budget"
                  value={datosProyecto.budget}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder="Ej: 1500000"
                  min="0"
                  step="1000"
                />
                {/* Ejemplo formateado en pesos colombianos */}
                {presupuestoFormateado && (
                  <p className="mt-1 text-xs text-pcm-muted/80">
                    Ejemplo formateado:{" "}
                    <span className="font-semibold text-pcm-text">
                      {presupuestoFormateado}
                    </span>
                  </p>
                )}
              </div>

              {/* Duración (días) calculada automáticamente */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  Duración (días) *
                </label>
                <input
                  type="number"
                  name="duration"
                  value={datosProyecto.duration}
                  readOnly
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/40 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:outline-none"
                  placeholder="Se calcula automáticamente con base en las fechas"
                />
                <p className="mt-1 text-xs text-pcm-muted/80">
                  Este valor se calcula automáticamente a partir de la fecha de
                  inicio y la fecha de fin. Se cuenta en días calendario.
                </p>
              </div>

              {/* Fecha de inicio */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  <Calendar className="mr-2 inline" size={16} />
                  Fecha de inicio *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={datosProyecto.startDate}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                />
              </div>

              {/* Fecha de fin */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  <Calendar className="mr-2 inline" size={16} />
                  Fecha de fin *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={datosProyecto.endDate}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                />
              </div>

              {/* Email de contacto */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  Email de contacto *
                </label>
                <input
                  type="email"
                  name="email"
                  value={datosProyecto.email}
                  onChange={manejarCambioCampo}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder="contacto@proyecto.com"
                />
              </div>

              {/* Prioridad (dropdown PCM) */}
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  Prioridad
                </label>
                <ListaDesplegablePcm
                  name="priority"
                  value={datosProyecto.priority}
                  onChange={manejarCambioCampo}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </ListaDesplegablePcm>
              </div>

              {/* Equipo de trabajo con estructura completa */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  <Users className="mr-2 inline" size={16} />
                  Equipo de trabajo
                </label>

                {/* Formulario para capturar un nuevo integrante */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                  {/* Nombres y apellidos */}
                  <input
                    type="text"
                    value={nuevoIntegrante.nombresApellidos}
                    onChange={(e) =>
                      setNuevoIntegrante((previo) => ({
                        ...previo,
                        nombresApellidos: e.target.value,
                      }))
                    }
                    className="rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-sm text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                    placeholder="Nombres y apellidos"
                  />

                  {/* Tipo de documento (dropdown PCM) */}
                  <ListaDesplegablePcm
                    name="tipoDocumento"
                    value={nuevoIntegrante.tipoDocumento}
                    onChange={(e) =>
                      setNuevoIntegrante((previo) => ({
                        ...previo,
                        tipoDocumento: e.target.value,
                      }))
                    }
                  >
                    <option value="">Tipo de documento</option>
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="TI">Tarjeta de identidad</option>
                    <option value="PAS">Pasaporte</option>
                    <option value="PPT">Permiso de Protección Temporal</option>
                  </ListaDesplegablePcm>

                  {/* Número de documento */}
                  <input
                    type="text"
                    value={nuevoIntegrante.numeroDocumento}
                    onChange={(e) =>
                      setNuevoIntegrante((previo) => ({
                        ...previo,
                        numeroDocumento: e.target.value,
                      }))
                    }
                    className="rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-sm text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                    placeholder="Número de documento"
                  />

                  {/* Cargo */}
                  <input
                    type="text"
                    value={nuevoIntegrante.cargo}
                    onChange={(e) =>
                      setNuevoIntegrante((previo) => ({
                        ...previo,
                        cargo: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarIntegranteEquipo();
                      }
                    }}
                    className="rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-sm text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                    placeholder="Cargo (ej: Residente de obra)"
                  />
                </div>

                {/* Botón para agregar integrante al equipo */}
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={agregarIntegranteEquipo}
                    className="pcm-btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold"
                  >
                    <Plus size={18} />
                    <span>Agregar integrante</span>
                  </button>
                </div>

                {/* Listado de integrantes agregados */}
                <div className="flex flex-col gap-2">
                  {datosProyecto.team.length === 0 && (
                    <p className="text-xs text-pcm-muted/80">
                      Puedes agregar las personas clave que harán parte del equipo
                      de trabajo de esta obra.
                    </p>
                  )}

                  {datosProyecto.team.map((integrante) => (
                    <div
                      key={integrante.numeroDocumento}
                      className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-pcm-bg/70 p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm"
                    >
                      {/* Datos del integrante */}
                      <div className="flex-1 space-y-1">
                        <p>
                          <span className="font-semibold">Nombre: </span>
                          {integrante.nombresApellidos}
                        </p>
                        <p>
                          <span className="font-semibold">Documento: </span>
                          {integrante.tipoDocumento}{" "}
                          {integrante.numeroDocumento}
                        </p>
                        <p>
                          <span className="font-semibold">Cargo: </span>
                          {integrante.cargo}
                        </p>
                      </div>

                      {/* Botón para eliminar */}
                      <button
                        type="button"
                        onClick={() =>
                          eliminarIntegranteEquipo(
                            integrante.numeroDocumento
                          )
                        }
                        className="mt-2 inline-flex items-center justify-center rounded-2xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-red-700 sm:mt-0"
                      >
                        <Minus size={16} className="mr-1" />
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comentarios adicionales */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pcm-muted">
                  Comentarios adicionales
                </label>
                <textarea
                  name="comentario"
                  value={datosProyecto.comentario}
                  onChange={manejarCambioCampo}
                  className="h-32 w-full rounded-2xl border border-white/5 bg-pcm-bg/60 px-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder={
                    esCliente
                      ? "Describe brevemente el alcance, necesidades o restricciones de la obra..."
                      : "Información adicional sobre alcance, fases o restricciones del proyecto..."
                  }
                />
              </div>
            </div>

            {/* Botón para avanzar al paso 2 */}
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={manejarSiguientePaso}
                className="pcm-btn-primary inline-flex items-center gap-2 rounded-pcm-xl px-8 py-3 text-sm font-semibold"
              >
                <Package size={18} />
                <span>
                  {esCliente
                    ? "Siguiente: materiales (opcional)"
                    : "Siguiente: asignar materiales"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: materiales */}
        {pasoActual === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Bloque: búsqueda de materiales */}
            <div className="rounded-pcm-xl border border-white/5 bg-pcm-surfaceSoft/90 p-6 md:p-8 shadow-pcm-soft backdrop-blur-sm">
              <h2 className="mb-1 text-2xl font-semibold text-pcm-text">
                Materiales disponibles
              </h2>
              <p className="mb-6 text-sm text-pcm-muted">
                {esCliente
                  ? "Puedes sugerir los materiales que consideras necesarios para la obra. Nuestro equipo validará estos insumos contra el inventario real."
                  : "Busca en el inventario y agrega los materiales que se utilizarán en esta obra."}
              </p>
              <div className="relative mb-6">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pcm-muted"
                  size={20}
                />
                <input
                  type="text"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-pcm-bg/60 pl-12 pr-4 py-3 text-pcm-text placeholder-pcm-muted/80 focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                  placeholder="Buscar materiales por nombre o categoría..."
                />
              </div>

              {/* Grid de materiales filtrados */}
              <div className="grid max-h-96 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-3">
                {materialesFiltrados.map((material) => (
                  <div
                    key={material._id}
                    className="group rounded-2xl border border-white/5 bg-pcm-bg/70 p-4 transition-all duration-200 hover:border-pcm-primary/60 hover:bg-pcm-bg/90"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-pcm-text">
                          {material.nombre}
                        </h3>
                        <p className="text-xs text-pcm-muted">
                          {material.categoria}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => agregarMaterial(material)}
                        disabled={Boolean(
                          materialesSeleccionados.find(
                            (m) => m.material === material._id
                          )
                        )}
                        className="pcm-btn-primary p-2 text-slate-950 shadow-md transition-all duration-200 hover:shadow-lg disabled:bg-pcm-surfaceSoft disabled:text-pcm-muted disabled:shadow-none disabled:cursor-not-allowed"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pcm-muted">
                        Disponible:{" "}
                        <span className="font-semibold text-pcm-text">
                          {material.cantidad}
                        </span>
                      </span>
                      <span className="font-semibold text-emerald-400">
                        ${material.precioUnitario}
                      </span>
                    </div>
                  </div>
                ))}

                {materialesFiltrados.length === 0 && (
                  <div className="col-span-full py-10 text-center text-sm text-pcm-muted">
                    No se encontraron materiales que coincidan con la búsqueda.
                  </div>
                )}
              </div>
            </div>

            {/* Bloque: materiales seleccionados */}
            <div className="rounded-pcm-xl border border-white/5 bg-pcm-surfaceSoft/90 p-6 md:p-8 shadow-pcm-soft backdrop-blur-sm">
              <h2 className="mb-4 text-2xl font-semibold text-pcm-text">
                Materiales {esCliente ? "sugeridos" : "asignados"}
              </h2>

              {materialesSeleccionados.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="mx-auto mb-4 text-pcm-muted/40" size={64} />
                  <p className="text-lg text-pcm-muted">
                    No hay materiales {esCliente ? "sugeridos" : "asignados"}
                  </p>
                  <p className="text-sm text-pcm-muted/80">
                    {esCliente
                      ? "Puedes continuar sin materiales sugeridos. Nuestro equipo te orientará sobre el inventario necesario."
                      : "Selecciona materiales de la lista superior para asociarlos a esta obra."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Lista de materiales seleccionados */}
                  <div className="mb-6 space-y-4">
                    {materialesSeleccionados.map((material) => (
                      <div
                        key={material.material}
                        className="flex flex-col gap-4 md:flex-row md:items-center rounded-2xl border border-white/5 bg-pcm-bg/70 p-4"
                      >
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-pcm-text">
                            {material.nombre}
                          </h3>
                          <p className="text-xs text-pcm-muted">
                            Disponible: {material.cantidadDisponible} | Precio: $
                            {material.precioUnitario}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Botón para disminuir cantidad */}
                          <button
                            type="button"
                            onClick={() =>
                              actualizarCantidadMaterial(
                                material.material,
                                material.cantidadAsignada - 1
                              )
                            }
                            className="rounded-lg bg-pcm-surfaceSoft px-2 py-2 text-pcm-text transition hover:bg-pcm-bg/80"
                          >
                            <Minus size={16} />
                          </button>

                          {/* Input numérico para cantidad asignada */}
                          <input
                            type="number"
                            value={material.cantidadAsignada}
                            onChange={(e) =>
                              actualizarCantidadMaterial(
                                material.material,
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-20 rounded-lg border border-white/5 bg-pcm-surfaceSoft px-3 py-2 text-center text-pcm-text focus:border-pcm-primary/60 focus:outline-none focus:ring-2 focus:ring-pcm-primary/60"
                            min="1"
                            max={material.cantidadDisponible}
                          />

                          {/* Botón para aumentar cantidad */}
                          <button
                            type="button"
                            onClick={() =>
                              actualizarCantidadMaterial(
                                material.material,
                                material.cantidadAsignada + 1
                              )
                            }
                            className="rounded-lg bg-pcm-surfaceSoft px-2 py-2 text-pcm-text transition hover:bg-pcm-bg/80"
                          >
                            <Plus size={16} />
                          </button>

                          {/* Subtotal de ese material */}
                          <span className="w-24 text-right text-sm font-semibold text-emerald-400">
                            $
                            {(
                              material.cantidadAsignada * material.precioUnitario
                            ).toFixed(2)}
                          </span>

                          {/* Botón para eliminar material */}
                          <button
                            type="button"
                            onClick={() =>
                              eliminarMaterial(material.material)
                            }
                            className="rounded-lg bg-red-600 px-2 py-2 text-white transition hover:bg-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumen de costos */}
                  <div className="border-t border-white/5 pt-4">
                    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-pcm-text">
                        <span className="mr-2 font-semibold">
                          Costo total de materiales:
                        </span>
                        <span className="text-emerald-400 text-lg font-bold">
                          ${calcularCostoTotal().toFixed(2)}
                        </span>
                      </div>

                      {datosProyecto.budget && (
                        <div className="text-sm text-pcm-muted">
                          Porcentaje del presupuesto:{" "}
                          <span className="font-semibold text-pcm-text">
                            {(
                              (calcularCostoTotal() /
                                Number(datosProyecto.budget || 1)) *
                              100
                            ).toFixed(2)}
                            %
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botones de navegación y envío */}
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              {/* Volver al paso 1 */}
              <button
                type="button"
                onClick={() => setPasoActual(1)}
                className="inline-flex items-center justify-center rounded-pcm-xl border border-white/10 bg-pcm-bg/70 px-8 py-3 text-sm font-semibold text-pcm-text transition-all duration-200 hover:bg-pcm-surfaceSoft hover:shadow-md"
              >
                Volver a información del proyecto
              </button>

              {/* Enviar solicitud / crear proyecto */}
              <button
                type="button"
                onClick={enviarSolicitudProyecto}
                disabled={estaCargando}
                className="pcm-btn-primary inline-flex items-center justify-center gap-2 rounded-pcm-xl px-8 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-pcm-surfaceSoft disabled:text-pcm-muted"
              >
                {estaCargando ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {esCliente ? "Enviando solicitud..." : "Creando..."}
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    {esCliente ? "Enviar solicitud" : "Crear proyecto"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ======================================
// Exportación del componente
// ======================================
export default SolicitarProyecto;     // Exporta el componente para ser usado en el layout del workspace.
