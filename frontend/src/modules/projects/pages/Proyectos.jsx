// File: frontend/src/modules/projects/pages/Proyectos.jsx                   // Ruta del archivo dentro del módulo de proyectos.
// Description: Página pública de listado de proyectos/obras. Permite       // Descripción: muestra un listado público de proyectos,
//              filtrar por estado y tipo, buscar por nombre/ubicación y     // con filtros (estado, tipo, búsqueda) y un modal de
//              abrir un modal con el detalle completo de cada proyecto.    // detalle. Usa layout público (Encabezado/Pie) y el
//              Usa el layout público compartido y el tema visual PCM,      // tema visual PCM, sin utilidades bg-gradient-to-*,
//              reemplazando los gradientes de Tailwind por fondos          // aprovechando los fondos personalizados bg-pcm-* y
//              personalizados bg-pcm-* y helpers globales.                 // helpers como .pcm-btn-primary y bg-pcm-diagonal-soft.


// ==========================
// Importaciones principales
// ==========================
import React, { useState, useEffect } from "react";                                   // Importa React y los hooks de estado/efecto.

// Importa modal de detalle de proyecto.
import ModalDetalleProyecto from "../modals/ModalDetalleProyecto.jsx";               // Modal para mostrar detalle completo de un proyecto.

// Importa componentes de layout público (cabecera y pie de página).
import EncabezadoPrincipal from "../../../shared/components/layout/BarraNavegacionPublica.jsx"; // Cabecera / barra de navegación principal.
import PieDePaginaPrincipal from "../../../shared/components/layout/PieDePagina.jsx";           // Pie de página global (extensión unificada).

// =======================================
// Componente reutilizable: dropdown PCM
// =======================================

// Componente de lista desplegable personalizada (reemplaza <select> nativo con estilo PCM).
const ListaDesplegablePcm = ({
  id,                                                                              // ID del control (se asocia con el <label htmlFor> externo).
  valor,                                                                           // Valor actualmente seleccionado.
  onChange,                                                                        // Función callback cuando cambia la selección.
  opciones,                                                                        // Arreglo de opciones { valor, texto }.
  placeholder = "Selecciona una opción",                                          // Texto por defecto cuando no hay selección.
}) => {
  const [abierto, setAbierto] = useState(false);                                   // Estado local para controlar si el menú está abierto o cerrado.

  // Busca la opción seleccionada a partir del valor actual.
  const opcionSeleccionada = opciones.find((opcion) => opcion.valor === valor);    // Encuentra el objeto de opción cuyo valor coincide.

  // Alterna el estado abierto/cerrado del dropdown.
  const alternarAbierto = () => {
    setAbierto((previo) => !previo);                                               // Cambia de true a false o viceversa.
  };

  // Maneja la selección de una opción.
  const manejarSeleccion = (nuevoValor) => {
    onChange(nuevoValor);                                                          // Notifica al componente padre el nuevo valor.
    setAbierto(false);                                                             // Cierra el dropdown después de seleccionar.
  };

  return (
    <div className="relative min-w-[150px]">                                       {/* Contenedor relativo para posicionar el panel flotante. */}
      <button
        id={id}                                                                    // Asigna el ID para que el <label htmlFor> pueda enfocarlo.
        type="button"                                                              // Botón normal que no envía formularios.
        onClick={alternarAbierto}                                                 // Al hacer clic, alterna abierto/cerrado.
        className="bg-white/90 backdrop-blur rounded-xl border-0 px-4 py-3
                   focus:outline-none focus:ring-4 focus:ring-pcm-primary/50
                   text-gray-800 font-medium shadow-lg w-full
                   flex items-center justify-between gap-2
                   transition-all duration-300"                                   // Estilos coherentes con el resto de la landing.
      >
        <span className="truncate text-left">                                      {/* Texto actual del dropdown (opción seleccionada o placeholder). */}
          {opcionSeleccionada ? opcionSeleccionada.texto : placeholder}
        </span>
        {/* Icono simple de flecha indicando que es desplegable */}
        <span
          className={`transform transition-transform duration-200 ${
            abierto ? "rotate-180" : "rotate-0"
          }`}
        >
          ▼
        </span>
      </button>

      {/* Panel flotante con las opciones, solo se muestra cuando abierto es true */}
      {abierto && (
        <div
          className="absolute mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100
                     z-20 max-h-64 overflow-y-auto"
        >
          {opciones.map((opcion) => (
            <button
              key={opcion.valor}                                                   // Clave única basada en el valor de la opción.
              type="button"                                                        // Botón simples para cada opción.
              onClick={() => manejarSeleccion(opcion.valor)}                      // Al hacer clic, selecciona la opción.
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-2
                          hover:bg-pcm-primary/10 transition-colors duration-150 ${
                            valor === opcion.valor
                              ? "text-pcm-primary font-semibold"
                              : "text-gray-700"
                          }`}
            >
              <span className="truncate">{opcion.texto}</span>                     {/* Muestra el texto de la opción. */}
              {valor === opcion.valor && (                                         // Marca la opción seleccionada con un check simple.
                <span className="text-pcm-primary text-xs font-bold">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; // Cierra el componente ListaDesplegablePcm.


// ===================================================
// Componente principal de la página pública Proyectos
// ===================================================
const Proyectos = () => {
  // ==========================
  // ESTADOS PRINCIPALES
  // ==========================
  const [proyectos, setProyectos] = useState([]);                                    // Lista completa de proyectos traídos del backend.
  const [filtroEstado, setFiltroEstado] = useState("");                              // Filtro por estado (active, planning, completed o vacío = todos).
  const [filtroTipo, setFiltroTipo] = useState("");                                  // Filtro por tipo de proyecto (residential, commercial, etc.).
  const [terminoBusqueda, setTerminoBusqueda] = useState("");                        // Texto de búsqueda libre (nombre / ubicación).

  const [seccionesVisibles, setSeccionesVisibles] = useState(new Set());             // Set con IDs de tarjetas ya animadas al entrar al viewport.

  // Estados para el modal de detalle.
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);            // Proyecto actualmente seleccionado para ver el detalle.
  const [modalAbierto, setModalAbierto] = useState(false);                           // Controla la visibilidad del modal.

  // ==========================
  // CARGA DE PROYECTOS DESDE EL BACKEND
  // ==========================
  useEffect(() => {
    // Llama al endpoint público/listado de proyectos al montar el componente.
    fetch(`${import.meta.env.VITE_API_URL}/proyectos`)                               // Usa la ruta en minúsculas para coherencia con el backend.
      .then((res) => res.json())                                                     // Parsea la respuesta como JSON.
      .then((data) => setProyectos(data))                                            // Guarda la lista de proyectos en el estado local.
      .catch((err) => console.error("Error al obtener proyectos:", err));            // Muestra el error en consola (se podría mejorar con feedback visual).
  }, []);                                                                            // Solo se ejecuta una vez al montar el componente.

  // ==========================
  // INTERSECTION OBSERVER PARA ANIMAR TARJETAS AL SCROLLEAR
  // ==========================
  useEffect(() => {
    // Crea un observer que marca como "visible" las secciones cuando entran al viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Recorre cada entrada (tarjeta observada).
          if (entry.isIntersecting) {                                                // Cuando una tarjeta entra al viewport...
            setSeccionesVisibles((prev) => {                                         // Actualiza el Set de secciones visibles.
              const siguiente = new Set(prev);                                       // Crea un nuevo Set a partir del anterior (evita mutaciones directas).
              siguiente.add(entry.target.id);                                        // Agrega el id del elemento que se hizo visible.
              return siguiente;                                                      // Devuelve el nuevo Set (dispara re-render).
            });
          }
        });
      },
      {
        threshold: 0.1,                                                              // Se considera visible cuando el 10% del elemento entra al viewport.
        rootMargin: "0px 0px -50px 0px",                                             // Margen inferior para disparar la animación un poco antes.
      }
    );

    // Selecciona todas las tarjetas que tengan el atributo data-fade-in.
    const secciones = document.querySelectorAll("[data-fade-in]");                   // Busca nodos en el DOM con el atributo data-fade-in.
    secciones.forEach((seccion) => observer.observe(seccion));                       // Empieza a observar cada tarjeta.

    // Limpieza: desconecta el observer cuando el componente se desmonta o cambian dependencias.
    return () => observer.disconnect();                                              // Evita fugas de memoria.
  }, [proyectos]);                                                                   // Se vuelve a ejecutar si cambia la lista de proyectos.

  // ==========================
  // TRADUCIR ESTADO INTERNO A TEXTO LEGIBLE
  // ==========================
  const obtenerTextoEstado = (estado) => {
    // Mapea códigos internos de estado a textos legibles en español.
    const textosEstado = {
      active: "En Progreso",                                                         // Proyecto en ejecución.
      planning: "Planificación",                                                     // Proyecto en etapa de planificación.
      completed: "Completado",                                                       // Proyecto ya finalizado.
    };
    return textosEstado[estado] || "Desconocido";                                    // Valor por defecto si no coincide ningún estado conocido.
  };

  // ==========================
  // FILTRADO Y BÚSQUEDA LOCAL DE PROYECTOS
  // ==========================
  const proyectosFiltrados = proyectos.filter((proyecto) => {
    // Normaliza campos que podrían venir undefined del backend.
    const titulo = (proyecto.title || "").toLowerCase();                             // Título en minúsculas o cadena vacía.
    const ubicacion = (proyecto.location || "").toLowerCase();                       // Ubicación en minúsculas o cadena vacía.
    const consulta = terminoBusqueda.toLowerCase();                                  // Texto de búsqueda en minúsculas.

    // Coincidencia por estado según filtro actual (o todos si el filtro está vacío).
    const coincideEstado =
      !filtroEstado || proyecto.status === filtroEstado;                             // Sin filtro => siempre true.

    // Coincidencia por tipo según filtro actual (o todos si está vacío).
    const coincideTipo =
      !filtroTipo || proyecto.type === filtroTipo;                                   // Sin filtro => siempre true.

    // Coincidencia por búsqueda de texto (título o ubicación).
    const coincideBusqueda =
      !terminoBusqueda ||                                                             // Si el término está vacío, no filtra por texto.
      titulo.includes(consulta) ||
      ubicacion.includes(consulta);

    // El proyecto se incluye en el listado final solo si cumple las tres condiciones.
    return coincideEstado && coincideTipo && coincideBusqueda;
  });

  // ==========================
  // LIMPIAR TODOS LOS FILTROS
  // ==========================
  const limpiarFiltros = () => {
    setFiltroEstado("");                                                             // Resetea filtro de estado.
    setFiltroTipo("");                                                               // Resetea filtro de tipo.
    setTerminoBusqueda("");                                                          // Resetea campo de búsqueda.
  };

  // ==========================
  // MANEJO DEL MODAL DE DETALLE
  // ==========================
  const abrirModalProyecto = (proyecto) => {
    setProyectoSeleccionado(proyecto);                                               // Guarda el proyecto que se va a mostrar en el modal.
    setModalAbierto(true);                                                           // Muestra el modal.
  };

  const cerrarModalProyecto = () => {
    setModalAbierto(false);                                                          // Oculta el modal.
    setProyectoSeleccionado(null);                                                   // Limpia el proyecto seleccionado.
  };

  // ==========================
  // COMPONENTE TARJETA DE PROYECTO
  // ==========================
  const TarjetaProyecto = ({ proyecto }) => {
    // Asegura que team sea siempre un arreglo (evita errores si viene undefined).
    const equipo = Array.isArray(proyecto.team) ? proyecto.team : [];                // Lista de miembros del equipo o lista vacía.

    // ID consistente tanto para key como para IntersectionObserver.
    const idProyecto = proyecto._id || proyecto.id;                                  // Usa _id (Mongo) o id simple según lo que venga del backend.
    const idTarjeta = `proyecto-${idProyecto}`;                                      // ID único para la tarjeta (lo usa el observer y el Set).

    // Valor seguro de progreso (número) para la barra de avance.
    const progresoSeguro =
      typeof proyecto.progress === "number" ? proyecto.progress : 0;                 // Si no es número, se usa 0.

    return (
      <div
        data-fade-in                                                                 // Marca esta tarjeta para que el IntersectionObserver la escuche.
        id={idTarjeta}                                                               // ID único usado en seccionesVisibles para la animación.
        className={`group relative bg-white/90 backdrop-blur-sm rounded-pcm-xl shadow-pcm-soft p-8 space-y-6 transition-all duration-700 hover:scale-[1.02] hover:shadow-2xl hover:bg-white border border-gray-100/60 overflow-hidden cursor-pointer ${
          seccionesVisibles.has(idTarjeta)                                          // Si el Set contiene el id, se muestra con opacidad y animación.
            ? "opacity-100 translate-y-0 animate-fade-in-up"
            : "opacity-0 translate-y-12"
        }`}
        onClick={() => abrirModalProyecto(proyecto)}                                // Al hacer clic en la tarjeta se abre el modal de detalle.
      >
        {/* Fondo decorativo sutil usando gradiente PCM global en vez de bg-gradient-to-* */}
        <div className="absolute inset-0 bg-pcm-diagonal-soft opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-pcm-xl" />

        {/* Contenido principal de la tarjeta */}
        <div className="relative z-10">
          {/* Badge de estado del proyecto */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-md ${
              proyecto.status === "active"
                ? "bg-pcm-estado-active text-blue-50 border border-blue-300"
                : proyecto.status === "planning"
                ? "bg-pcm-estado-planning text-purple-50 border border-purple-300"
                : "bg-pcm-estado-completed text-green-50 border border-green-300"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                proyecto.status === "active"
                  ? "bg-emerald-500 animate-pulse"                                   // Punto animado para proyectos activos.
                  : proyecto.status === "planning"
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
            />
            {obtenerTextoEstado(proyecto.status)}                                     {/* Texto legible del estado. */}
          </div>

          {/* Título del proyecto */}
          <h3 className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-pcm-primary transition duration-300">
            {proyecto.title}
          </h3>

          {/* Ubicación del proyecto */}
          <div className="flex items-center gap-3 text-gray-700">
            <div className="flex items-center justify-center w-8 h-8 bg-pcm-primary/10 rounded-full">
              <span className="text-pcm-primary text-sm">📍</span>
            </div>
            <span className="font-medium">{proyecto.location}</span>
          </div>

          {/* Descripción breve (limitada a 3 líneas visuales) */}
          <p className="text-gray-600 leading-relaxed line-clamp-3">
            {proyecto.description}
          </p>

          {/* Bloque de estadísticas: presupuesto y duración */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {proyecto.budget}
              </p>
              <p className="text-sm text-gray-600 font-medium">Presupuesto</p>
            </div>
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {proyecto.duration}
              </p>
              <p className="text-sm text-gray-600 font-medium">Duración</p>
            </div>
          </div>

          {/* Barra de progreso del proyecto */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">
                Progreso del Proyecto
              </span>
              <span className="text-lg font-bold text-pcm-primary">
                {progresoSeguro}%
              </span>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-pcm-estado-active rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${progresoSeguro}%` }}                               // Asegura que siempre haya un número (si no, 0%).
              />
              <div className="absolute inset-0 bg-white/20 rounded-full opacity-50" />{/* Capa de brillo simple (sin gradiente utilitario). */}
            </div>
          </div>

          {/* Sección de equipo del proyecto */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {equipo.slice(0, 4).map((integrante, indice) => (
                  <div
                    key={indice}
                    className="w-10 h-10 rounded-full bg-pcm-primary text-white flex items-center justify-center font-bold shadow-lg border-2 border-white ring-2 ring-pcm-primary/10 transition-transform duration-200 hover:scale-110"
                    title={`Miembro: ${integrante}`}
                  >
                    {integrante}
                  </div>
                ))}
                {equipo.length > 4 && (
                  <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold shadow-lg border-2 border-white ring-2 ring-gray-100">
                    +{equipo.length - 4}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Equipo</p>
              <p className="font-bold text-gray-900">
                {equipo.length} miembros
              </p>
            </div>
          </div>

          {/* Indicador de que la tarjeta es clicable / ver más */}
          <div className="flex items-center justify-center gap-2 text-pcm-primary font-semibold text-sm mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>Ver detalles completos</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        {/* Decoración en la esquina superior derecha usando gradiente PCM global */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pcm-diagonal-soft rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-all duration-500 opacity-0 group-hover:opacity-100" />
      </div>
    );
  };

  // ==========================
  // RENDER PRINCIPAL DE LA PÁGINA
  // ==========================
  return (
    <div className="font-sans leading-relaxed text-gray-900 bg-gray-50 bg-pcm-diagonal-soft min-h-screen overflow-x-hidden">
      {/* Cabecera global del sitio (layout público) */}
      <EncabezadoPrincipal />

      {/* HERO: encabezado de la página de proyectos */}
      <section className="relative overflow-hidden bg-pcm-bg bg-pcm-diagonal-soft pt-28 pb-16">
        {/* Elementos decorativos de fondo (manchas de color con animate-blob) */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-pcm-primary/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pcm-secondary/15 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-20 left-1/3 w-2 h-2 bg-pcm-primary rounded-full animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-1000" />
        </div>

        {/* Contenido del hero */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          {/* Título principal con doble línea y degradado PCM */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight animate-fade-in-up">
            <span className="text-transparent bg-clip-text bg-pcm-radial-soft block mb-2">
              Nuestros
            </span>
            <span className="text-transparent bg-clip-text bg-pcm-diagonal-soft">
              Proyectos
            </span>
          </h1>

          {/* Descripción corta del bloque */}
          <p
            className="text-xl text-gray-300 max-w-2xl mx-auto mb-16 leading-relaxed font-light animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}                                       // Ligeramente después del título.
          >
            Descubre los proyectos de construcción que hemos gestionado
            exitosamente con
            <span className="font-semibold text-pcm-secondary">
              {" "}
              ProCivil Manager
            </span>
            . Cada uno representa nuestra dedicación a la excelencia y la
            innovación en el contexto colombiano.
          </p>

          {/* Bloque de filtros flotante sobre el hero */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl animate-slide-up-soft">
            <div className="flex flex-wrap justify-center items-center gap-8">
              {/* Filtro de Estado */}
              <div className="flex flex-col items-start gap-2">
                <label
                  htmlFor="estado"
                  className="font-bold text-white text-sm tracking-wide"
                >
                  ESTADO
                </label>
                <ListaDesplegablePcm
                  id="estado"                                                        // ID asociado al label de ESTADO.
                  valor={filtroEstado}                                               // Valor actual del filtro de estado.
                  onChange={(nuevoValor) => setFiltroEstado(nuevoValor)}            // Actualiza el filtro de estado según selección.
                  opciones={[
                    { valor: "", texto: "Todos los estados" },                      // Opción para no filtrar por estado.
                    { valor: "active", texto: "En Progreso" },                      // Estado activo.
                    { valor: "planning", texto: "Planificación" },                  // Estado en planificación.
                    { valor: "completed", texto: "Completado" },                    // Estado completado.
                  ]}
                  placeholder="Todos los estados"                                   // Placeholder por defecto cuando no hay selección.
                />
              </div>

              {/* Filtro de Tipo */}
              <div className="flex flex-col items-start gap-2">
                <label
                  htmlFor="tipo"
                  className="font-bold text-white text-sm tracking-wide"
                >
                  TIPO
                </label>
                <ListaDesplegablePcm
                  id="tipo"                                                         // ID asociado al label de TIPO.
                  valor={filtroTipo}                                                // Valor actual del filtro de tipo.
                  onChange={(nuevoValor) => setFiltroTipo(nuevoValor)}             // Actualiza el filtro de tipo según selección.
                  opciones={[
                    { valor: "", texto: "Todos los tipos" },                        // Opción para no filtrar por tipo.
                    // IMPORTANTE: estos valores deben coincidir con los que guarda el backend en project.type
                    { valor: "residential", texto: "Residencial" },                 // Tipo residencial.
                    { valor: "commercial", texto: "Comercial" },                    // Tipo comercial.
                    { valor: "industrial", texto: "Industrial" },                   // Tipo industrial.
                  ]}
                  placeholder="Todos los tipos"                                     // Placeholder por defecto cuando no hay selección.
                />
              </div>

              {/* Campo de búsqueda por nombre / ubicación */}
              <div className="flex flex-col items-start gap-2">
                <label className="font-bold text-white text-sm tracking-wide">
                  BUSCAR
                </label>
                <input
                  type="text"                                                       // Campo de texto simple.
                  placeholder="Nombre o ubicación del proyecto..."                 // Placeholder guiando al usuario.
                  value={terminoBusqueda}                                          // Valor actual de la búsqueda.
                  onChange={(e) => setTerminoBusqueda(e.target.value)}            // Actualiza texto de búsqueda.
                  className="bg-white/90 backdrop-blur rounded-xl border-0 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-pcm-primary/50 text-gray-800 font-medium shadow-lg min-w-[200px] placeholder-gray-500 transition-all duration-300"
                />
              </div>

              {/* Botón para limpiar todos los filtros */}
              <div className="flex flex-col justify-end h-full">
                <button
                  onClick={limpiarFiltros}                                        // Llama a la función que resetea filtros.
                  className="pcm-btn-primary mt-6 px-8 py-3"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GRID PRINCIPAL DE PROYECTOS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        {proyectosFiltrados.length > 0 ? (                                          // Si hay proyectos tras el filtrado...
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {proyectosFiltrados.map((proyecto) => (
              <TarjetaProyecto
                key={proyecto._id || proyecto.id}                                   // Key estable (usa _id o id).
                proyecto={proyecto}                                                 // Pasa el proyecto completo como prop.
              />
            ))}
          </div>
        ) : (
          // Estado vacío: cuando no hay resultados según filtros / búsqueda.
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl text-gray-400">🔍</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">
              No se encontraron proyectos
            </h3>
            <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
              Intenta ajustar los filtros o realizar una búsqueda diferente para
              encontrar los proyectos que buscas.
            </p>
          </div>
        )}
      </section>

      {/* Modal de detalle de proyecto (solo se muestra si hay uno seleccionado) */}
      {modalAbierto && proyectoSeleccionado && (
        <ModalDetalleProyecto
          project={proyectoSeleccionado}                                             // Proyecto a mostrar en el modal (prop conservando nombre del componente original).
          onClose={cerrarModalProyecto}                                             // Callback para cerrar el modal.
        />
      )}

      {/* Pie de página global (layout público) */}
      <PieDePaginaPrincipal />
    </div>
  );
};

// Exporta el componente principal para usarlo en el enrutador.
export default Proyectos;
