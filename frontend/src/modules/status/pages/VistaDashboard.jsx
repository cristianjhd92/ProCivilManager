// File: frontend/src/modules/status/pages/VistaDashboard.jsx
// Description: Vista principal del panel interno de ProCivil Manager (PCM).
//              Muestra indicadores clave (KPIs), gráficas y listados de proyectos,
//              adaptando textos y resúmenes según el rol del usuario
//              (administrador, líder de obra, cliente). También permite navegar
//              hacia otras secciones (solicitudes, alertas, almacenes, materiales),
//              usando el tema visual PCM (paleta `pcm`, sombras, animaciones y
//              helpers .pcm-panel/.pcm-panel--ROL) y ofreciendo filtros para acotar
//              la información (por ejemplo, por año en las gráficas y selección
//              de proyectos para los KPIs).

// =========================
// Importaciones principales
// =========================
import React, { useState, useMemo } from 'react';                 // Importa React y los hooks useState/useMemo para manejar estado local y cálculos derivados.

// =========================
// Importación de componentes de gráficas (Recharts)
// =========================
import {
  LineChart,                                                     // Componente para gráficas de línea.
  Line,                                                          // Elemento que dibuja la línea de datos.
  XAxis,                                                         // Eje X de la gráfica.
  YAxis,                                                         // Eje Y de la gráfica.
  CartesianGrid,                                                 // Cuadrícula de fondo para la gráfica.
  Tooltip,                                                       // Tooltip que aparece al pasar el mouse.
  ResponsiveContainer,                                           // Contenedor que adapta la gráfica al tamaño disponible.
  PieChart,                                                      // Componente para gráficas de pastel.
  Pie,                                                           // Elemento que dibuja el pastel.
  Cell,                                                          // Celda para personalizar el color de cada porción.
} from 'recharts';                                               // Importa todos los componentes necesarios desde Recharts.

// =========================
// Importación de íconos (lucide-react)
// =========================
import {
  Building2,                                                     // Ícono para representar proyectos/edificaciones.
  DollarSign,                                                    // Ícono para representar dinero/presupuesto.
  Clock,                                                         // Ícono para representar tiempo/progreso.
  MapPin,                                                        // Ícono para mostrar ubicación geográfica.
  CheckCircle2,                                                  // Ícono para indicar selección activa/correcta.
} from 'lucide-react';                                           // Importa los íconos desde lucide-react.

// =========================
// Importación de componentes internos
// =========================
import ResumenSolicitudesProyectoCliente from '../../requests/pages/ResumenSolicitudesProyectoCliente.jsx'; // Widget de resumen de solicitudes por proyecto para el rol cliente.

// =====================================================================
// Componente principal: VistaDashboard
// =====================================================================
const VistaDashboard = ({
  proyectos = [],                                                // Arreglo de proyectos que alimenta KPIs, gráficas y listado general.
  proyectosRecientes = [],                                       // Arreglo de proyectos recientes para tarjetas destacadas.
  solicitudes = [],                                              // Arreglo de solicitudes asociadas al usuario o al sistema completo.
  almacenes = [],                                                // Arreglo de almacenes registrados en PCM.
  materiales = [],                                               // Arreglo de materiales registrados.
  usuarios = [],                                                 // Arreglo de usuarios (visible principalmente para administrador).
  alertasSinLeer = 0,                                            // Número de alertas no leídas o sin resolver.
  rolUsuario = '',                                               // Rol del usuario actual (admin, lider de obra, cliente).
  estaCargando = false,                                          // Bandera que indica si el dashboard está cargando datos.
  alNavegarSeccion,                                              // Callback opcional para cambiar de sección dentro del panel (TableroTrabajo).
}) => {
  // =========================
  // Estado local del componente
  // =========================

  const [terminoBusqueda, setTerminoBusqueda] = useState('');    // Texto ingresado en el buscador de proyectos.
  const [idsSeleccionados, setIdsSeleccionados] = useState([]);  // Lista de IDs de proyectos seleccionados para KPIs y gráficas.
  const [anioSeleccionado, setAnioSeleccionado] = useState('todos'); // Año seleccionado para filtrar las gráficas o "todos".
  // Métrica seleccionada para la gráfica de evolución. Puede ser "proyectos" (cantidad),
  // "presupuesto" (suma de budget) o "progreso" (promedio de progreso en %).
  const [metricaLinea, setMetricaLinea] = useState('proyectos');

  // =========================
  // Helpers visuales: clases según tipo de proyecto
  // =========================

  // Función que devuelve clases Tailwind distintas según el tipo de proyecto.
  const obtenerClasesTipoProyecto = (tipoProyecto) => {
    // Si no se recibe tipo, se devuelve un estilo neutro PCM.
    if (!tipoProyecto) {
      return 'bg-pcm-bg/80 border border-white/10 text-pcm-text';          // Estilo base PCM neutro.
    }

    // Normaliza el texto a string en minúsculas para evaluar.
    const tipoNormalizado = tipoProyecto.toString().toLowerCase();         // Convierte el tipo a minúsculas.

    // Para proyectos residenciales.
    if (tipoNormalizado.includes('residen')) {                             // Si la palabra incluye "residen", se asume residencial.
      return 'bg-emerald-500/10 border border-emerald-400/60 text-emerald-200';
    }

    // Para proyectos comerciales.
    if (tipoNormalizado.includes('comer')) {                               // Si incluye "comer", se asume comercial.
      return 'bg-sky-500/10 border border-sky-400/60 text-sky-200';
    }

    // Para proyectos industriales.
    if (tipoNormalizado.includes('indus')) {                               // Si incluye "indus", se asume industrial.
      return 'bg-purple-500/10 border border-purple-400/60 text-purple-200';
    }

    // Para otros tipos no categorizados explícitamente.
    return 'bg-orange-500/10 border border-orange-400/60 text-orange-100'; // Estilo genérico para otros tipos.
  };

  // =========================
  // Ordenamiento de proyectos
  // =========================

  // Función que ordena proyectos por progreso y luego por título.
  const ordenarProyectos = (lista) => {
    // Si la lista no es un arreglo, se retorna arreglo vacío.
    if (!Array.isArray(lista)) return [];                                  // Protección ante datos inesperados.

    // Crea una copia superficial para no mutar el arreglo original.
    const copia = [...lista];                                              // Copia el arreglo para ordenar sin afectar el prop.

    // Ordena la copia con una función comparadora.
    copia.sort((proyectoA, proyectoB) => {
      // Toma el progreso de cada proyecto como número, con fallback a 0.
      const progresoA =
        typeof proyectoA.progress === 'number' ? proyectoA.progress : 0;   // Progreso del proyecto A.
      const progresoB =
        typeof proyectoB.progress === 'number' ? proyectoB.progress : 0;   // Progreso del proyecto B.

      // Si los progresos son distintos, ordena de mayor a menor progreso.
      if (progresoB !== progresoA) {
        return progresoB - progresoA;                                      // Orden descendente por progreso.
      }

      // Si el progreso es igual, ordena alfabéticamente por título.
      const tituloA = (proyectoA.title || '').toLowerCase();               // Título de A en minúsculas.
      const tituloB = (proyectoB.title || '').toLowerCase();               // Título de B en minúsculas.

      return tituloA.localeCompare(tituloB);                               // Orden alfabético por título.
    });

    // Retorna la lista ya ordenada.
    return copia;                                                          // Devuelve la copia ordenada.
  };

  // =========================
  // Navegación a otras secciones
  // =========================

  // Función helper que centraliza la navegación hacia otras secciones del panel.
  const manejarNavegacion = (claveSeccion) => {
    // Verifica que exista un callback y que la clave de sección sea string.
    if (
      typeof alNavegarSeccion === 'function' &&                            // Se asegura que se recibió un callback.
      typeof claveSeccion === 'string'                                     // Y que la clave de sección es una cadena válida.
    ) {
      // Llama al callback con la sección objetivo.
      alNavegarSeccion(claveSeccion);                                      // Delegar navegación al layout (TableroTrabajo).
    }
  };

  // =========================
  // Textos / etiquetas según rol del usuario
  // =========================

  // Título para la gráfica de evolución (línea).
  const tituloEvolucion =
    rolUsuario === 'cliente'
      ? 'Evolución de mis proyectos (creados por mes)'                      // Texto para clientes.
      : rolUsuario === 'lider de obra'
        ? 'Evolución de proyectos asignados (creados por mes)'                // Texto para líderes de obra.
        : 'Evolución de proyectos del sistema (creados por mes)';             // Texto para administradores u otros.

  // Título para la gráfica de distribución (pastel).
  const tituloDistribucion =
    rolUsuario === 'cliente'
      ? 'Tipos de mis proyectos'                                            // Distribución de tipos solo de cliente.
      : 'Distribución por tipo de proyecto';                                // Distribución general.

  // Título para el listado de proyectos.
  const tituloTablaProyectos =
    rolUsuario === 'cliente'
      ? 'Mis proyectos'                                                     // Listado de proyectos del cliente.
      : rolUsuario === 'lider de obra'
        ? 'Proyectos asignados'                                               // Listado de proyectos a cargo del líder.
        : 'Proyectos del sistema';                                            // Listado global para administrador.

  // Placeholder del campo de búsqueda según rol.
  const placeholderBusqueda =
    rolUsuario === 'cliente'
      ? 'Buscar en mis proyectos por título o ubicación...'                 // Placeholder orientado a cliente.
      : 'Buscar por título o ubicación...';                                 // Placeholder genérico.

  // =========================
  // Resumen de solicitudes (conteo por estado)
  // =========================

  const resumenSolicitudes = useMemo(() => {
    // Estructura base con todos los contadores inicializados en cero.
    const base = {
      total: 0,                                                             // Total de solicitudes.
      pendiente: 0,                                                         // Cantidad de solicitudes pendientes.
      aprobada: 0,                                                          // Cantidad de solicitudes aprobadas.
      rechazada: 0,                                                         // Cantidad de solicitudes rechazadas.
      procesada: 0,                                                         // Cantidad de solicitudes procesadas.
    };

    // Si no hay solicitudes o no es un arreglo, retorna la base vacía.
    if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
      return base;                                                          // Devuelve todos los contadores en cero.
    }

    // Crea una copia de los contadores para modificarla.
    const copia = { ...base };                                              // Objeto acumulador.

    // Recorre cada solicitud para incrementar contadores.
    solicitudes.forEach((solicitud) => {
      // Normaliza el estado de la solicitud a minúsculas.
      const estadoNormalizado = (solicitud.estado || '').toLowerCase();    // Estado en minúsculas.

      // Incrementa el total general.
      copia.total += 1;                                                     // Suma siempre al total.

      // Incrementa el contador específico según estado.
      if (estadoNormalizado === 'pendiente') copia.pendiente += 1;         // Suma a pendientes.
      if (estadoNormalizado === 'aprobada') copia.aprobada += 1;           // Suma a aprobadas.
      if (estadoNormalizado === 'rechazada') copia.rechazada += 1;         // Suma a rechazadas.
      if (estadoNormalizado === 'procesada') copia.procesada += 1;         // Suma a procesadas.
    });

    // Devuelve el objeto con los contadores ya consolidados.
    return copia;                                                           // Retorna el resumen de estados de solicitudes.
  }, [solicitudes]);                                                        // Se recalcula solo cuando cambia el arreglo de solicitudes.

  // Bandera para decidir si se muestra el bloque de resumen de solicitudes.
  const mostrarResumenSolicitudes =
    rolUsuario === 'cliente' ||
    rolUsuario === 'admin' ||
    rolUsuario === 'lider de obra';                                         // Muestra el bloque para estos roles.

  // Título del bloque de resumen de solicitudes según rol.
  const tituloResumenSolicitudes =
    rolUsuario === 'admin'
      ? 'Solicitudes del sistema'                                           // Título para administrador.
      : rolUsuario === 'lider de obra'
        ? 'Mis solicitudes de materiales'                                     // Título para líder.
        : 'Resumen de mis solicitudes';                                       // Título para cliente.

  // Subtítulo del bloque de resumen de solicitudes según rol.
  const subtituloResumenSolicitudes =
    rolUsuario === 'admin'
      ? 'Estado actual de todas las solicitudes registradas en la plataforma.'           // Subtítulo para admin.
      : rolUsuario === 'lider de obra'
        ? 'Estado de las solicitudes de materiales que has gestionado para tus obras.'     // Subtítulo para líder.
        : 'Estado actual de las solicitudes de proyectos que has enviado.'                 // Subtítulo para cliente.

  // =========================
  // Filtro de proyectos por búsqueda
  // =========================

  const proyectosFiltrados = useMemo(() => {
    // Normaliza el término de búsqueda (trim + toLowerCase).
    const termino = terminoBusqueda.trim().toLowerCase();                  // Texto de búsqueda normalizado.

    // Asegura que la lista de proyectos sea un arreglo.
    const listaBase = Array.isArray(proyectos) ? proyectos : [];           // Si no es arreglo, usa vacío.

    // Si no hay término de búsqueda, retorna todos los proyectos ordenados.
    if (!termino) {
      return ordenarProyectos(listaBase);                                  // Ordena y devuelve la lista completa.
    }

    // Filtra proyectos que coincidan en título o ubicación.
    const listaFiltrada = listaBase.filter((proyecto) => {
      const titulo = (proyecto.title || '').toLowerCase();                 // Título del proyecto.
      const ubicacion = (proyecto.location || '').toLowerCase();           // Ubicación del proyecto.
      return titulo.includes(termino) || ubicacion.includes(termino);      // Devuelve los que coincidan con el término.
    });

    // Retorna la lista filtrada y ordenada.
    return ordenarProyectos(listaFiltrada);                                 // Ordena los proyectos filtrados.
  }, [proyectos, terminoBusqueda]);                                         // Se recalcula al cambiar proyectos o el texto de búsqueda.

  // =========================
  // Proyectos visibles (para KPIs y gráficas)
  // =========================

  const proyectosVisibles = useMemo(() => {
    // Si no hay selección manual, se consideran todos los proyectos recibidos.
    if (idsSeleccionados.length === 0) return proyectos;                   // Sin selección explícita, se usan todos.

    // Crea un Set con los IDs seleccionados para búsquedas rápidas.
    const conjuntoIds = new Set(idsSeleccionados);                         // Conjunto de IDs seleccionados.

    // Retorna solo los proyectos cuyo ID esté en el conjunto de seleccionados.
    return proyectos.filter(
      (proyecto) => conjuntoIds.has(proyecto._id || proyecto.id),          // Coincidencia por _id o id.
    );
  }, [proyectos, idsSeleccionados]);                                       // Depende de la lista completa y de la selección actual.

  // =========================
  // Años disponibles y proyectos para gráficas (filtro por año)
  // =========================

  const aniosDisponibles = useMemo(() => {
    // Set para ir almacenando años únicos.
    const setAnios = new Set();                                            // Conjunto de años detectados.

    // Recorre proyectos visibles y extrae el año de createdAt si es válido.
    proyectosVisibles.forEach((proyecto) => {
      const fechaCreacion = proyecto.createdAt
        ? new Date(proyecto.createdAt)                                     // Crea fecha a partir de createdAt.
        : null;

      if (fechaCreacion && !Number.isNaN(fechaCreacion.getTime())) {       // Verifica que la fecha sea válida.
        setAnios.add(fechaCreacion.getFullYear());                         // Añade el año al conjunto.
      }
    });

    // Convierte el Set a arreglo y lo ordena de mayor a menor (años recientes primero).
    return Array.from(setAnios).sort((a, b) => b - a);                     // Ordena años descendente.
  }, [proyectosVisibles]);                                                 // Se recalcula cuando cambian los proyectos visibles.

  const proyectosParaGraficas = useMemo(() => {
    // Si no se ha elegido un año específico, se usan todos los proyectos visibles.
    if (anioSeleccionado === 'todos') return proyectosVisibles;           // Sin filtro de año, se usan todos.

    // Convierte el año seleccionado a número (por seguridad).
    const anioNumero = Number(anioSeleccionado);                           // Convierte el string de año a número.

    // Filtra solo proyectos creados en el año seleccionado.
    return proyectosVisibles.filter((proyecto) => {
      const fechaCreacion = proyecto.createdAt
        ? new Date(proyecto.createdAt)                                     // Crea fecha a partir de createdAt.
        : null;

      if (!fechaCreacion || Number.isNaN(fechaCreacion.getTime())) return false; // Descarta fechas inválidas.
      return fechaCreacion.getFullYear() === anioNumero;                  // Conserva los del año seleccionado.
    });
  }, [proyectosVisibles, anioSeleccionado]);                               // Depende del conjunto visible y del año elegido.

  // =========================
  // KPIs principales (indicadores grandes)
  // =========================

  const indicadoresPrincipales = useMemo(() => {
    // Calcula el total de proyectos visibles.
    const totalProyectos = proyectosVisibles.length;                       // Número de proyectos considerados.

    // Suma los presupuestos de los proyectos visibles.
    const presupuestoTotal = proyectosVisibles.reduce(
      (acumulado, proyecto) => acumulado + (Number(proyecto.budget) || 0), // Acumula el campo budget.
      0,
    );

    // Calcula el progreso promedio de los proyectos visibles.
    const progresoPromedio = totalProyectos
      ? proyectosVisibles.reduce(
        (acumulado, proyecto) => acumulado + (proyecto.progress || 0),   // Suma el progreso de cada proyecto.
        0,
      ) / totalProyectos                                                  // Divide entre el total de proyectos.
      : 0;                                                                  // Si no hay proyectos, el promedio es 0.

    // Etiquetas según rol para el KPI de total de proyectos.
    const etiquetaTotal =
      rolUsuario === 'cliente'
        ? 'Mis proyectos'                                                  // Etiqueta para cliente.
        : rolUsuario === 'lider de obra'
          ? 'Proyectos asignados'                                            // Etiqueta para líder.
          : 'Proyectos totales';                                             // Etiqueta para admin.

    // Etiquetas según rol para el KPI de presupuesto.
    const etiquetaPresupuesto =
      rolUsuario === 'cliente'
        ? 'Presupuesto de mis proyectos'                                   // Presupuesto de proyectos del cliente.
        : rolUsuario === 'lider de obra'
          ? 'Presupuesto asignado'                                           // Presupuesto de proyectos asignados.
          : 'Presupuesto total';                                             // Presupuesto global.

    // Etiquetas según rol para el KPI de progreso.
    const etiquetaProgreso =
      rolUsuario === 'cliente'
        ? 'Progreso promedio de mis proyectos'                             // Progreso promedio para cliente.
        : rolUsuario === 'lider de obra'
          ? 'Progreso promedio asignado'                                     // Progreso promedio de proyectos asignados.
          : 'Progreso promedio general';                                     // Progreso promedio global.

    // Retorna un arreglo de objetos con la info necesaria para pintar las tarjetas.
    // Se usa "claseFondo" en lugar de gradientes Tailwind para cumplir la regla de no usar bg-gradient-to-*.
    return [
      {
        titulo: etiquetaTotal,                                             // Título de la tarjeta.
        valor: totalProyectos,                                             // Valor numérico principal.
        Icono: Building2,                                                  // Ícono a mostrar.
        claseFondo: 'pcm-fondo-degradado-principal',                       // Fondo degradado global PCM (helper CSS).
      },
      {
        titulo: etiquetaPresupuesto,                                       // Título del KPI de presupuesto.
        valor: presupuestoTotal,                                           // Suma de los presupuestos.
        Icono: DollarSign,                                                 // Ícono de dinero.
        claseFondo: 'bg-emerald-600',                                      // Fondo sólido verde asociado a presupuesto.
      },
      {
        titulo: etiquetaProgreso,                                          // Título del KPI de progreso promedio.
        valor: `${progresoPromedio.toFixed(2)}%`,                          // Progreso formateado a 2 decimales.
        Icono: Clock,                                                      // Ícono de reloj (tiempo/avance).
        claseFondo: 'pcm-fondo-degradado-principal',                       // Degradado PCM reutilizado.
      },
    ];
  }, [proyectosVisibles, rolUsuario]);                                     // Se recalcula cuando cambian proyectos visibles o el rol.

  // Helper para formatear números como moneda abreviada.
  const formatearMonedaCorta = (valor) => {
    // Si el valor no es válido o es falsy (incluye 0), retorna $0 explícitamente.
    if (!valor || Number.isNaN(valor)) return '$0';                        // Manejo de casos nulos o NaN.

    // Convierte a número seguro.
    const numero = Number(valor);                                          // Se asegura de tener un número.

    // Aplica abreviaciones estándar (K, M, B).
    if (numero >= 1_000_000_000) return `$${(numero / 1_000_000_000).toFixed(2)}B`; // Billones.
    if (numero >= 1_000_000) return `$${(numero / 1_000_000).toFixed(2)}M`;         // Millones.
    if (numero >= 1_000) return `$${(numero / 1_000).toFixed(1)}K`;                 // Miles.

    // Si es menor a mil, usa formato local con separadores.
    return `$${numero.toLocaleString()}`;                               // Formato estándar con separador de miles.
  };

  // =========================
  // Formateador para valores de la gráfica de línea según la métrica
  // =========================
  const formatearValorMetricaLinea = (valor) => {
    // Si la métrica es presupuesto, aplica formateo de moneda abreviada.
    if (metricaLinea === 'presupuesto') {
      return formatearMonedaCorta(valor);
    }
    // Si la métrica es progreso, añade el símbolo de porcentaje.
    if (metricaLinea === 'progreso') {
      return `${valor}%`;
    }
    // Para proyectos (conteo), retorna el número tal cual.
    return valor;
  };

  // =========================
  // Resumen de inventario (materiales / almacenes)
  // =========================

  const resumenInventario = useMemo(() => {
    // Toma el total de materiales.
    const materialesTotales = materiales.length;                            // Número total de materiales.

    // Contadores para materiales críticos y sin stock.
    let materialesCriticos = 0;                                             // Contador de materiales en nivel crítico.
    let materialesSinStock = 0;                                             // Contador de materiales sin stock.

    // Recorre cada material.
    materiales.forEach((material) => {
      // Determina el stock actual con distintos posibles nombres de campo.
      const stockActual = Number(
        material.cantidad ||
        material.stock ||
        material.existencia ||
        0,
      );                                                                    // Stock actual del material.

      // Determina el stock mínimo (umbral crítico).
      const stockMinimo = Number(
        material.stockMin ||
        material.minStock ||
        material.minimo ||
        material.stockMinimo ||
        0,
      );                                                                    // Stock mínimo esperado.

      // Si el stock es <= 0, se considera sin stock.
      if (stockActual <= 0) {
        materialesSinStock += 1;                                            // Incrementa contador sin stock.
      } else if (stockMinimo > 0 && stockActual <= stockMinimo) {
        // Si está por debajo o igual al mínimo, se considera crítico.
        materialesCriticos += 1;                                            // Incrementa contador crítico.
      }
    });

    // Devuelve el resumen consolidado.
    return {
      materialesTotales,                                                    // Total de materiales registrados.
      almacenesTotales: almacenes.length,                                   // Total de almacenes registrados.
      materialesCriticos,                                                   // Materiales en nivel crítico.
      materialesSinStock,                                                   // Materiales sin stock.
    };
  }, [materiales, almacenes]);                                             // Se recalcula al cambiar materiales o almacenes.

  // =========================
  // Indicadores secundarios según rol
  // =========================

  const indicadoresSecundarios = useMemo(() => {
    // Arreglo que acumula los distintos indicadores.
    const items = [];                                                       // Lista de indicadores secundarios.

    // Configuración de indicadores para administrador.
    if (rolUsuario === 'admin') {
      items.push({
        etiqueta: 'Usuarios registrados',                                   // Nombre del indicador.
        valor: usuarios.length,                                             // Valor asociado.
        claseFondoPunto: 'bg-sky-500',                                      // Color del punto indicador.
        claseTextoValor: 'text-sky-400',                                    // Color del valor.
        seccionDestino: 'users',                                            // Sección a la que navega al hacer clic.
      });

      items.push({
        etiqueta: 'Proyectos registrados',
        valor: proyectos.length,
        claseFondoPunto: 'bg-emerald-500',
        claseTextoValor: 'text-emerald-400',
        seccionDestino: 'projects',
      });

      items.push({
        etiqueta: 'Alertas abiertas',
        valor: alertasSinLeer,
        claseFondoPunto: 'bg-rose-500',
        claseTextoValor: 'text-rose-400',
        textoAyuda: 'Alertas del sistema sin marcar como resueltas.',
        seccionDestino: 'alertas',
      });

      items.push({
        etiqueta: 'Solicitudes pendientes',
        valor: resumenSolicitudes.pendiente,
        claseFondoPunto: 'bg-amber-500',
        claseTextoValor: 'text-amber-400',
        textoAyuda: 'Solicitudes que requieren revisión o decisión.',
        seccionDestino: 'solicitudes',
      });

      items.push({
        etiqueta: 'Almacenes registrados',
        valor: resumenInventario.almacenesTotales,
        claseFondoPunto: 'bg-indigo-500',
        claseTextoValor: 'text-indigo-400',
        seccionDestino: 'almacenes',
      });

      items.push({
        etiqueta: 'Materiales registrados',
        valor: resumenInventario.materialesTotales,
        claseFondoPunto: 'bg-fuchsia-500',
        claseTextoValor: 'text-fuchsia-400',
        textoAyuda:
          resumenInventario.materialesTotales > 0
            ? `${resumenInventario.materialesCriticos} con stock crítico, ${resumenInventario.materialesSinStock} sin stock.`
            : 'Sin materiales cargados en el sistema.',
        seccionDestino: 'materiales',
      });
    }

    // Configuración de indicadores para líder de obra.
    if (rolUsuario === 'lider de obra') {
      items.push({
        etiqueta: 'Proyectos asignados',
        valor: proyectos.length,
        claseFondoPunto: 'bg-emerald-500',
        claseTextoValor: 'text-emerald-400',
        seccionDestino: 'projects',
      });

      items.push({
        etiqueta: 'Solicitudes de materiales pendientes',
        valor: resumenSolicitudes.pendiente,
        claseFondoPunto: 'bg-amber-500',
        claseTextoValor: 'text-amber-400',
        textoAyuda: 'Solicitudes de materiales aún no aprobadas o procesadas.',
        seccionDestino: 'solicitudes',
      });

      items.push({
        etiqueta: 'Alertas abiertas',
        valor: alertasSinLeer,
        claseFondoPunto: 'bg-rose-500',
        claseTextoValor: 'text-rose-400',
        textoAyuda: 'Alertas relacionadas con los proyectos a tu cargo.',
        seccionDestino: 'alertas',
      });

      items.push({
        etiqueta: 'Almacenes disponibles',
        valor: resumenInventario.almacenesTotales,
        claseFondoPunto: 'bg-indigo-500',
        claseTextoValor: 'text-indigo-400',
        seccionDestino: 'almacenes',
      });

      items.push({
        etiqueta: 'Materiales registrados',
        valor: resumenInventario.materialesTotales,
        claseFondoPunto: 'bg-sky-500',
        claseTextoValor: 'text-sky-400',
        textoAyuda:
          resumenInventario.materialesTotales > 0
            ? `${resumenInventario.materialesCriticos} con stock crítico, ${resumenInventario.materialesSinStock} sin stock.`
            : 'Consulta con administración la carga de materiales.',
        seccionDestino: 'materiales',
      });
    }

    // Configuración de indicadores para cliente.
    if (rolUsuario === 'cliente') {
      items.push({
        etiqueta: 'Mis proyectos registrados',
        valor: proyectos.length,
        claseFondoPunto: 'bg-emerald-500',
        claseTextoValor: 'text-emerald-400',
      });

      items.push({
        etiqueta: 'Mis solicitudes pendientes',
        valor: resumenSolicitudes.pendiente,
        claseFondoPunto: 'bg-amber-500',
        claseTextoValor: 'text-amber-400',
        seccionDestino: 'solicitudes',
      });

      items.push({
        etiqueta: 'Alertas abiertas para mí',
        valor: alertasSinLeer,
        claseFondoPunto: 'bg-rose-500',
        claseTextoValor: 'text-rose-400',
        textoAyuda: 'Notificaciones importantes sobre el avance de tus proyectos.',
        seccionDestino: 'alertas',
      });

      items.push({
        etiqueta: 'Total de solicitudes',
        valor: resumenSolicitudes.total,
        claseFondoPunto: 'bg-sky-500',
        claseTextoValor: 'text-sky-400',
        seccionDestino: 'solicitudes',
      });
    }

    // Retorna el arreglo de indicadores secundarios para ser renderizado.
    return items;                                                           // Devuelve los indicadores configurados según rol.
  }, [
    rolUsuario,                                                             // Depende del rol actual.
    usuarios.length,                                                        // De la cantidad de usuarios.
    proyectos.length,                                                       // De la cantidad de proyectos.
    resumenSolicitudes.pendiente,                                           // De las solicitudes pendientes.
    resumenSolicitudes.total,                                               // Del total de solicitudes.
    alertasSinLeer,                                                         // De la cantidad de alertas sin leer.
    resumenInventario.almacenesTotales,                                     // Del total de almacenes.
    resumenInventario.materialesTotales,                                    // Del total de materiales.
    resumenInventario.materialesCriticos,                                   // De materiales críticos.
    resumenInventario.materialesSinStock,                                   // De materiales sin stock.
  ]);

  // =========================
  // Resumen de estados de proyectos
  // =========================

  const resumenEstadosProyectos = useMemo(() => {
    // Estructura base con contadores para cada estado.
    const base = {
      total: proyectosVisibles.length,                                      // Total de proyectos visibles.
      planificado: 0,                                                       // Proyectos planificados.
      enEjecucion: 0,                                                       // Proyectos en ejecución.
      finalizado: 0,                                                        // Proyectos finalizados.
      suspendido: 0,                                                        // Proyectos suspendidos.
      otros: 0,                                                             // Proyectos con estado no clasificado.
    };

    // Si no hay proyectos visibles, devuelve la base tal cual.
    if (proyectosVisibles.length === 0) return base;                        // Evita procesar cuando no hay proyectos.

    // Recorre cada proyecto visible.
    proyectosVisibles.forEach((proyecto) => {
      // Toma el estado desde distintos posibles nombres de campo.
      const estadoBruto = (
        proyecto.status ||
        proyecto.estado ||
        proyecto.state ||
        ''
      )
        .toString()
        .toLowerCase()
        .trim();                                                            // Normaliza el estado a minúsculas.

      // Si no hay estado, se suma a "otros".
      if (!estadoBruto) {
        base.otros += 1;                                                    // Incrementa otros.
        return;                                                             // Continúa con el siguiente proyecto.
      }

      // Clasifica el estado según palabras clave.
      if (estadoBruto.includes('plan')) {
        base.planificado += 1;                                              // Estado planificado.
      } else if (estadoBruto.includes('ejec')) {
        base.enEjecucion += 1;                                              // Estado en ejecución.
      } else if (estadoBruto.includes('final')) {
        base.finalizado += 1;                                               // Estado finalizado.
      } else if (estadoBruto.includes('susp')) {
        base.suspendido += 1;                                               // Estado suspendido.
      } else {
        base.otros += 1;                                                    // Estados no clasificados.
      }
    });

    // Retorna la estructura ya consolidada.
    return base;                                                            // Devuelve el resumen de estados de proyectos.
  }, [proyectosVisibles]);                                                  // Se recalcula cuando cambia el conjunto de proyectos visibles.

  // Título del bloque de estados de proyectos según rol.
  const tituloEstadosProyectos =
    rolUsuario === 'cliente'
      ? 'Estado de mis proyectos'                                           // Texto para cliente.
      : rolUsuario === 'lider de obra'
        ? 'Estado de proyectos asignados'                                     // Texto para líder.
        : 'Estado de los proyectos del sistema';                              // Texto para admin.

  // =========================
  // Datos para gráficas (línea y pastel)
  // =========================

  const datosGraficaLinea = useMemo(() => {
    // Nombres cortos de los meses en español para el eje X (visible al usuario).
    const nombresMeses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];

    // Prepara un arreglo con objetos para acumular métricas por mes.
    // Cada elemento tendrá: proyectos (conteo), presupuesto (suma) y progreso
    // (acumulado y contador para calcular promedio).
    const acumuladores = Array.from({ length: 12 }, () => ({
      proyectos: 0,
      presupuesto: 0,
      progresoSum: 0,
      progresoCount: 0,
    }));

    // Recorre los proyectos filtrados para gráficas (aplicando filtro de año).
    proyectosParaGraficas.forEach((proyecto) => {
      const fechaCreacion = proyecto.createdAt ? new Date(proyecto.createdAt) : null;
      if (fechaCreacion && !Number.isNaN(fechaCreacion.getTime())) {
        const mesIndex = fechaCreacion.getMonth();
        // Suma uno al conteo de proyectos.
        acumuladores[mesIndex].proyectos += 1;
        // Suma el presupuesto (budget) si es numérico.
        const presupuestoNum = Number(proyecto.budget) || 0;
        acumuladores[mesIndex].presupuesto += presupuestoNum;
        // Suma el progreso para calcular promedio si existe.
        const progresoNum = Number(proyecto.progress);
        if (!Number.isNaN(progresoNum)) {
          acumuladores[mesIndex].progresoSum += progresoNum;
          acumuladores[mesIndex].progresoCount += 1;
        }
      }
    });

    // Construye el arreglo final con valores promediados de progreso.
    return nombresMeses.map((mes, idx) => {
      const acc = acumuladores[idx];
      const promedioProgreso = acc.progresoCount > 0
        ? parseFloat((acc.progresoSum / acc.progresoCount).toFixed(2))
        : 0;
      return {
        month: mes,
        proyectos: acc.proyectos,
        presupuesto: acc.presupuesto,
        progreso: promedioProgreso,
      };
    });
  }, [proyectosParaGraficas]);

  const datosGraficaPastel = useMemo(() => {
    // Paleta de colores fija para los distintos segmentos.
    const paletaColores = [
      '#F97316', // Naranja (cercano a pcm.primary).
      '#10B981', // Verde.
      '#3B82F6', // Azul.
      '#F59E0B', // Amarillo.
      '#A855F7', // Morado.
      '#EF4444', // Rojo.
      '#14B8A6', // Turquesa.
    ];

    // Determina si se debe agrupar por tipo o por estado según el rol.
    const agruparPorEstado = rolUsuario !== 'admin' && rolUsuario !== 'auditor';

    const conteos = {};

    proyectosParaGraficas.forEach((proyecto) => {
      if (agruparPorEstado) {
        // Agrupar por estado (status) para roles no admin.
        const estadoBruto = (
          proyecto.status ||
          proyecto.estado ||
          proyecto.state ||
          'Otro'
        )
          .toString()
          .trim();
        conteos[estadoBruto] = (conteos[estadoBruto] || 0) + 1;
      } else {
        // Agrupar por tipo para admin/auditor.
        const tipo = proyecto.type || 'Otro';
        conteos[tipo] = (conteos[tipo] || 0) + 1;
      }
    });

    // Transformar en arreglo compatible con PieChart.
    return Object.entries(conteos).map(([name, value], index) => ({
      name,
      value,
      color: paletaColores[index % paletaColores.length],
    }));
  }, [proyectosParaGraficas, rolUsuario]);

  // =========================
  // Selección de proyectos (para filtrar KPIs/gráficas)
  // =========================

  // Alterna la selección de un proyecto individual.
  const alternarSeleccionProyecto = (idProyecto) => {
    setIdsSeleccionados((idsPrevios) => {
      // Si el ID ya está seleccionado, se elimina de la lista.
      if (idsPrevios.includes(idProyecto)) {
        return idsPrevios.filter((id) => id !== idProyecto);                // Quita el ID de la selección.
      }
      // Si no está seleccionado, se agrega.
      return [...idsPrevios, idProyecto];                                   // Añade el ID a la selección.
    });
  };

  // Selecciona o deselecciona todos los proyectos actualmente filtrados.
  const alternarSeleccionTodos = () => {
    // Si ya están todos los proyectos filtrados seleccionados, limpia la selección.
    if (
      idsSeleccionados.length === proyectosFiltrados.length &&
      proyectosFiltrados.length > 0
    ) {
      setIdsSeleccionados([]);                                              // Limpia la selección completa.
    } else {
      // Si no, selecciona todos los IDs de la lista filtrada.
      setIdsSeleccionados(
        proyectosFiltrados.map((proyecto) => proyecto._id || proyecto.id),  // Mapea a la lista de IDs visibles.
      );
    }
  };

  // =========================
  // Bandera para proyectos recientes
  // =========================

  const hayProyectosRecientes =
    Array.isArray(proyectosRecientes) && proyectosRecientes.length > 0;     // true si vienen proyectos recientes del backend.

  // =========================
  // Render del componente
  // =========================

  return (
    // Contenedor principal de la vista; se añade pcm-panel-fondo para integrarse con el tema por rol.
    <div className="space-y-8 pcm-panel-fondo">
      {/* Banner global de carga del dashboard */}
      {estaCargando && (
        <div
          className="w-full px-4 py-3 rounded-pcm-xl bg-pcm-bg/80 border border-pcm-primary/40
                     text-xs md:text-sm text-pcm-text flex items-center justify-between
                     shadow-pcm-soft animate-fade-in-soft"
        >
          <span>
            Cargando datos del tablero principal. Algunos indicadores pueden tardar unos segundos en actualizarse.
          </span>
          <span className="ml-4 h-3 w-3 rounded-full bg-pcm-primary animate-pulse-soft" />
        </div>
      )}

      {/* Grid de indicadores principales (KPIs grandes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
        {indicadoresPrincipales.map((indicador, indice) => {
          // Desestructura el objeto para mayor claridad.
          const { titulo, valor, Icono, claseFondo } = indicador;           // Toma los datos de cada indicador.

          return (
            <div
              key={indice}
              className="bg-pcm-surfaceSoft/80 backdrop-blur-xl rounded-pcm-xl p-6
                         border border-white/10 hover:border-pcm-primary/60
                         transition-all duration-300 shadow-pcm-soft
                         hover:shadow-pcm-soft hover:shadow-pcm-primary/30"
            >
              <div
                className={`w-14 h-14 rounded-xl ${claseFondo}
                            flex items-center justify-center mb-4 shadow-pcm-soft`}
              >
                <Icono className="text-white" size={26} />                   {/* Ícono principal del KPI. */}
              </div>

              <h3 className="text-3xl font-bold text-pcm-text mb-2 truncate">
                {/* Si el título menciona presupuesto, formatea el valor como moneda corta */}
                {titulo.toLowerCase().includes('presupuesto')
                  ? formatearMonedaCorta(valor)                             // Muestra moneda abreviada.
                  : valor}
              </h3>

              <p className="text-pcm-muted text-sm font-medium">
                {titulo}                                                    {/* Texto descriptivo del KPI. */}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bloque de proyectos recientes (si el backend los envía) */}
      {hayProyectosRecientes && (
        <div
          className="bg-pcm-surfaceSoft/80 backdrop-blur-xl rounded-pcm-xl p-6
                     border border-white/10 shadow-pcm-soft animate-fade-in-soft"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm md:text-base font-semibold text-pcm-text flex items-center">
                <span className="w-1 h-5 bg-pcm-primary rounded-full mr-3" />
                Proyectos recientes
              </h3>
              <p className="text-xs text-pcm-muted mt-1">
                Últimos proyectos creados o actualizados en el sistema según tu rol.
              </p>
            </div>

            {typeof alNavegarSeccion === 'function' && (
              <button
                type="button"
                onClick={() => manejarNavegacion('projects')}                // Navega al módulo de proyectos.
                className="px-4 py-2 rounded-lg text-xs sm:text-sm bg-pcm-primary
                           hover:bg-pcm-primary/90 text-white font-semibold
                           shadow-pcm-soft transition-all duration-200"
              >
                Ver todos los proyectos
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {proyectosRecientes.slice(0, 3).map((proyecto) => {
              // Obtiene datos básicos con fallback.
              const titulo = proyecto.title || 'Proyecto sin nombre';        // Toma el título o un texto por defecto.
              const ubicacion = proyecto.location || 'Ubicación no registrada'; // Ubicación con fallback.
              const tipo = proyecto.type || 'Sin tipo';                      // Tipo de proyecto con fallback.
              const progreso = proyecto.progress ?? 0;                       // Progreso con fallback a 0.

              // Intenta formatear fecha de creación de manera amigable.
              let textoFecha = 'Fecha no disponible';                        // Texto por defecto de fecha.
              if (proyecto.createdAt) {                                      // Si hay fecha de creación.
                const fecha = new Date(proyecto.createdAt);                  // Crea objeto Date.
                if (!Number.isNaN(fecha.getTime())) {                        // Verifica que sea válida.
                  textoFecha = fecha.toLocaleDateString('es-CO', {           // Formatea la fecha para Colombia.
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                }
              }

              return (
                <div
                  key={proyecto._id || proyecto.id}
                  className="rounded-pcm-xl border border-white/10 bg-pcm-bg/80
                             p-4 flex flex-col gap-2 shadow-pcm-soft"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-pcm-primary/15 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-pcm-primary" />  {/* Ícono de proyecto. */}
                      </div>
                      <h4 className="text-sm font-semibold text-pcm-text line-clamp-2">
                        {titulo}                                            {/* Título del proyecto reciente. */}
                      </h4>
                    </div>
                    <span className="text-[11px] text-pcm-muted whitespace-nowrap">
                      {textoFecha}                                          {/* Fecha de creación formateada. */}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-pcm-muted">
                    <span className="inline-flex items-center gap-1 max-w-[180px] truncate">
                      <MapPin className="w-3 h-3" />                        {/* Ícono de ubicación. */}
                      <span className="truncate">{ubicacion}</span>         {/* Ubicación corta. */}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full uppercase tracking-wide ${obtenerClasesTipoProyecto(
                        tipo,
                      )}`}
                    >
                      {tipo}                                                {/* Tipo de proyecto. */}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-pcm-bg/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pcm-primary"
                      style={{ width: `${progreso || 0}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-pcm-muted mt-1">
                    Avance actual:&nbsp;
                    <span className="font-semibold text-pcm-text">
                      {progreso ?? 0}%                                     {/* Texto de progreso numérico. */}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bloque resumen de solicitudes (visible para admin, líder y cliente) */}
      {mostrarResumenSolicitudes && (
        <div
          className="bg-pcm-surfaceSoft/80 backdrop-blur-xl rounded-pcm-xl p-6
                     border border-pcm-secondary/40 shadow-pcm-soft animate-fade-in-soft"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-pcm-text flex items-center">
                <span className="w-1 h-6 bg-pcm-secondary rounded-full mr-3" />
                {tituloResumenSolicitudes}                                  {/* Título según rol. */}
              </h3>
              <p className="text-xs sm:text-sm text-pcm-muted mt-1">
                {subtituloResumenSolicitudes}                               {/* Subtítulo contextual. */}
              </p>
            </div>

            {typeof alNavegarSeccion === 'function' && (
              <button
                type="button"
                onClick={() => manejarNavegacion('solicitudes')}
                className="px-4 py-2 rounded-lg text-xs sm:text-sm bg-pcm-primary
                           hover:bg-pcm-primary/90 text-white font-semibold
                           shadow-pcm-soft transition-all duration-200"
              >
                Ver detalle en Solicitudes
              </button>
            )}
          </div>

          {/* Cuatro tarjetas pequeñas con conteo por estado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-pcm-bg/80 border border-white/10 p-4">
              <p className="text-xs text-pcm-muted uppercase tracking-wide">
                Pendientes
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-300">
                {resumenSolicitudes.pendiente}
              </p>
            </div>

            <div className="rounded-xl bg-pcm-bg/80 border border-white/10 p-4">
              <p className="text-xs text-pcm-muted uppercase tracking-wide">
                Aprobadas
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">
                {resumenSolicitudes.aprobada}
              </p>
            </div>

            <div className="rounded-xl bg-pcm-bg/80 border border-white/10 p-4">
              <p className="text-xs text-pcm-muted uppercase tracking-wide">
                Rechazadas
              </p>
              <p className="mt-2 text-2xl font-bold text-rose-300">
                {resumenSolicitudes.rechazada}
              </p>
            </div>

            <div className="rounded-xl bg-pcm-bg/80 border border-white/10 p-4">
              <p className="text-xs text-pcm-muted uppercase tracking-wide">
                Procesadas
              </p>
              <p className="mt-2 text-2xl font-bold text-sky-300">
                {resumenSolicitudes.procesada}
              </p>
              <p className="mt-1 text-[11px] text-pcm-muted">
                Total: {resumenSolicitudes.total}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen extra específico para clientes: widget ResumenSolicitudesProyectoCliente */}
      {rolUsuario === 'cliente' && (
        <ResumenSolicitudesProyectoCliente solicitudes={solicitudes} />     // Muestra detalle por proyecto para el cliente.
      )}

      {/* Indicadores secundarios (tarjetas pequeñas clicables) */}
      {indicadoresSecundarios.length > 0 && (
        <div
          className="bg-pcm-bg/80 backdrop-blur-xl rounded-pcm-xl p-6
                     border border-white/10 shadow-pcm-soft animate-fade-in-soft"
        >
          <h3 className="text-sm md:text-base font-semibold text-pcm-text mb-4 flex items-center">
            <span className="w-1 h-5 bg-pcm-primary rounded-full mr-3" />
            Resumen rápido del sistema
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {indicadoresSecundarios.map((item, indice) => {
              // Determina si la tarjeta es clicable (tiene sección destino y callback).
              const esClicable =
                typeof alNavegarSeccion === 'function' && !!item.seccionDestino;

              return (
                <div
                  key={indice}
                  className={
                    `rounded-xl bg-pcm-surfaceSoft/80 border border-white/10
                     p-4 flex flex-col gap-1 shadow-pcm-soft ` +
                    (esClicable
                      ? 'cursor-pointer hover:border-pcm-primary/70 hover:shadow-pcm-primary/30 transition-all duration-200'
                      : '')
                  }
                  onClick={() => {
                    if (esClicable) {
                      manejarNavegacion(item.seccionDestino);               // Navega a la sección asociada al indicador.
                    }
                  }}
                >
                  <div
                    className={`inline-flex items-center justify-center w-7 h-7
                                rounded-full ${item.claseFondoPunto} bg-opacity-80 mb-1`}
                  />

                  <p className="text-[11px] text-pcm-muted uppercase tracking-wide">
                    {item.etiqueta}
                  </p>

                  <p className={`text-xl font-bold ${item.claseTextoValor}`}>
                    {item.valor}
                  </p>

                  {item.textoAyuda && (
                    <p className="text-[11px] text-pcm-muted mt-1">
                      {item.textoAyuda}
                    </p>
                  )}

                  {esClicable && (
                    <p className="text-[10px] text-pcm-primary mt-1">
                      Haz clic para ver detalle
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumen de estados de proyectos (planificados, en ejecución, etc.) */}
      {proyectosVisibles.length > 0 && (
        <div
          className="bg-pcm-bg/80 backdrop-blur-xl rounded-pcm-xl p-6
                     border border-emerald-500/40 shadow-pcm-soft animate-fade-in-soft"
        >
          <h3 className="text-sm md:text-base font-semibold text-pcm-text mb-4 flex items-center">
            <span className="w-1 h-5 bg-emerald-400 rounded-full mr-3" />
            {tituloEstadosProyectos}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="rounded-xl bg-pcm-surfaceSoft/80 border border-white/10 p-4">
              <p className="text-[11px] text-pcm-muted uppercase tracking-wide">
                Planificados
              </p>
              <p className="mt-1 text-xl font-bold text-amber-300">
                {resumenEstadosProyectos.planificado}
              </p>
            </div>

            <div className="rounded-xl bg-pcm-surfaceSoft/80 border border-white/10 p-4">
              <p className="text-[11px] text-pcm-muted uppercase tracking-wide">
                En ejecución
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-300">
                {resumenEstadosProyectos.enEjecucion}
              </p>
            </div>

            <div className="rounded-xl bg-pcm-surfaceSoft/80 border border-white/10 p-4">
              <p className="text-[11px] text-pcm-muted uppercase tracking-wide">
                Finalizados
              </p>
              <p className="mt-1 text-xl font-bold text-sky-300">
                {resumenEstadosProyectos.finalizado}
              </p>
            </div>

            <div className="rounded-xl bg-pcm-surfaceSoft/80 border border-white/10 p-4">
              <p className="text-[11px] text-pcm-muted uppercase tracking-wide">
                Suspendidos
              </p>
              <p className="mt-1 text-xl font-bold text-rose-300">
                {resumenEstadosProyectos.suspendido}
              </p>
            </div>

            <div className="rounded-xl bg-pcm-surfaceSoft/80 border border-white/10 p-4">
              <p className="text-[11px] text-pcm-muted uppercase tracking-wide">
                Otros / sin estado
              </p>
              <p className="mt-1 text-xl font-bold text-pcm-text">
                {resumenEstadosProyectos.otros}
              </p>
              <p className="mt-1 text-[11px] text-pcm-muted">
                Total: {resumenEstadosProyectos.total}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas principales: evolución (línea) y distribución (pastel) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de evolución mensual (línea) */}
        <div
          className="bg-pcm-surfaceSoft/80 backdrop-blur-xl rounded-pcm-xl p-6
                     border border-white/10 shadow-pcm-soft animate-slide-up-soft"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h3 className="text-xl font-semibold text-pcm-text flex items-center">
              <span className="w-1 h-6 bg-pcm-primary rounded-full mr-3" />
              {tituloEvolucion}
            </h3>

            {aniosDisponibles.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                {/* Filtro de año */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-pcm-muted uppercase tracking-wide">
                    Periodo:
                  </span>
                  <select
                    value={anioSeleccionado}
                    onChange={(evento) => setAnioSeleccionado(evento.target.value)}
                    className="px-2 py-1 rounded-lg bg-pcm-bg/80 border border-white/20
                               text-xs text-pcm-text focus:outline-none focus:border-pcm-primary
                               focus:ring-1 focus:ring-pcm-primary"
                  >
                    <option value="todos">Todos los años</option>
                    {aniosDisponibles.map((anio) => (
                      <option key={anio} value={anio}>
                        {anio}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Filtro de métrica */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-pcm-muted uppercase tracking-wide">
                    Métrica:
                  </span>
                  <select
                    value={metricaLinea}
                    onChange={(e) => setMetricaLinea(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-pcm-bg/80 border border-white/20
                               text-xs text-pcm-text focus:outline-none focus:border-pcm-primary
                               focus:ring-1 focus:ring-pcm-primary"
                  >
                    <option value="proyectos">Proyectos</option>
                    <option value="presupuesto">Presupuesto</option>
                    <option value="progreso">Progreso</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosGraficaLinea}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                tickFormatter={(valor) => formatearValorMetricaLinea(valor)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(value) => formatearValorMetricaLinea(value)}
              />
              <Line
                type="monotone"
                dataKey={metricaLinea}
                // El color de la línea varía según la métrica seleccionada
                stroke={
                  metricaLinea === 'proyectos'
                    ? '#F97316' // naranja para conteo de proyectos
                    : metricaLinea === 'presupuesto'
                      ? '#10B981' // verde para presupuesto
                      : '#3B82F6' // azul para progreso
                }
                strokeWidth={3}
                dot={{
                  fill:
                    metricaLinea === 'proyectos'
                      ? '#F97316'
                      : metricaLinea === 'presupuesto'
                        ? '#10B981'
                        : '#3B82F6',
                  r: 5,
                }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica de distribución por tipo (pastel) */}
        <div
          className="bg-pcm-surfaceSoft/80 backdrop-blur-xl rounded-pcm-xl p-6
                     border border-white/10 shadow-pcm-soft animate-slide-up-soft"
        >
          <h3 className="text-xl font-semibold text-pcm-text mb-2 flex items-center">
            <span className="w-1 h-6 bg-pcm-primary rounded-full mr-3" />
            {tituloDistribucion}
          </h3>

          <p className="text-[11px] text-pcm-muted mb-4">
            Distribución de tipos de proyecto considerando el periodo seleccionado
            en la gráfica de evolución.
          </p>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={datosGraficaPastel}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: '#94a3b8' }}
              >
                {datosGraficaPastel.map((entrada, indice) => (
                  <Cell
                    key={`cell-${indice}`}
                    fill={entrada.color}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listado de proyectos con búsqueda y selección múltiple */}
      <div
        className="bg-pcm-surfaceSoft/80 backdrop-blur-xl rounded-pcm-xl
                   border border-white/10 shadow-pcm-soft overflow-hidden
                   animate-slide-up-soft"
      >
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-pcm-text flex items-center">
            <span className="w-1 h-6 bg-pcm-primary rounded-full mr-3" />
            {tituloTablaProyectos}
          </h3>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <input
              type="text"
              placeholder={placeholderBusqueda}
              value={terminoBusqueda}
              onChange={(evento) => setTerminoBusqueda(evento.target.value)} // Actualiza el texto del buscador.
              className="w-full sm:w-1/2 px-4 py-2 rounded-lg bg-pcm-bg/80
                         border border-white/10 text-pcm-text placeholder-pcm-muted
                         focus:outline-none focus:border-pcm-primary focus:ring-1
                         focus:ring-pcm-primary"
            />

            <button
              type="button"
              onClick={alternarSeleccionTodos}                              // Alterna selección de todos los proyectos filtrados.
              className="px-4 py-2 rounded-lg bg-pcm-primary hover:bg-pcm-primary/90
                         text-white font-semibold shadow-pcm-soft transition-all duration-200"
            >
              {idsSeleccionados.length === proyectosFiltrados.length &&
                proyectosFiltrados.length > 0
                ? 'Deseleccionar todo'
                : 'Seleccionar todo'}
            </button>
          </div>

          <p className="mt-2 text-[11px] md:text-xs text-pcm-muted">
            {idsSeleccionados.length === 0
              ? `Mostrando ${proyectosFiltrados.length} proyecto(s)`       // Mensaje cuando no hay selección manual.
              : `${idsSeleccionados.length} proyecto(s) seleccionados`}
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="mt-0 space-y-3">
            {/* Estado vacío cuando no hay proyectos con el filtro actual */}
            {proyectosFiltrados.length === 0 ? (
              <div
                className="px-6 py-8 text-center border border-dashed border-white/20
                           rounded-pcm-xl bg-pcm-bg/80"
              >
                <p className="text-sm text-pcm-text">
                  No hay proyectos para mostrar con el filtro actual.
                </p>
                <p className="mt-1 text-xs text-pcm-muted">
                  Ajusta la búsqueda o limpia los filtros para ver más resultados.
                </p>
              </div>
            ) : (
              // Render de cada proyecto como fila clicable.
              proyectosFiltrados.map((proyecto) => {
                // Determina el ID único del proyecto.
                const idProyecto = proyecto._id || proyecto.id;

                // Determina si el proyecto se considera seleccionado.
                const estaSeleccionado =
                  idsSeleccionados.length === 0
                    ? true                                                  // Si no hay selección manual, todos se consideran seleccionados.
                    : idsSeleccionados.includes(idProyecto);                // Caso contrario, sólo los que están en la lista.

                return (
                  <button
                    key={`fila-${idProyecto}`}
                    type="button"
                    onClick={() => alternarSeleccionProyecto(idProyecto)}   // Alterna selección de este proyecto.
                    className={`w-full flex items-center justify-between gap-4
                                rounded-pcm-xl border px-4 py-3 text-left
                                transition-all duration-200
                                ${estaSeleccionado
                        ? 'border-pcm-primary bg-pcm-bg/95 shadow-pcm-soft'
                        : 'border-white/10 bg-pcm-bg/80 hover:border-pcm-primary/60 hover:bg-pcm-bg'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-pcm-text truncate">
                        {proyecto.title || 'Proyecto sin título'}           {/* Título o fallback. */}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-pcm-muted">
                        {proyecto.location && (
                          <span className="inline-flex items-center gap-1 max-w-[190px] truncate">
                            <MapPin className="w-3 h-3" />                  {/* Ícono de ubicación en fila. */}
                            <span className="truncate">
                              {proyecto.location}
                            </span>
                          </span>
                        )}

                        {proyecto.type && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide ${obtenerClasesTipoProyecto(
                              proyecto.type,
                            )}`}
                          >
                            {proyecto.type}                                 {/* Tipo de proyecto. */}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 h-1.5 rounded-full bg-pcm-bg/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pcm-primary"
                          style={{ width: `${proyecto.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-semibold text-pcm-text">
                        {proyecto.progress ?? 0}%
                      </span>

                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full border
                                    ${estaSeleccionado
                            ? 'border-pcm-primary bg-pcm-primary/15 text-pcm-primary'
                            : 'border-white/20 bg-pcm-bg text-pcm-muted'
                          }`}
                      >
                        {estaSeleccionado ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="block w-2 h-2 rounded-full bg-pcm-muted/70" />
                        )}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporta el componente principal del dashboard como exportación por defecto.
export default VistaDashboard;                                              // Permite usar VistaDashboard dentro del layout interno del workspace PCM.
