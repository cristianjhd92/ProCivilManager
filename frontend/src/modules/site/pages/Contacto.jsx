// File: frontend/src/modules/site/pages/Contacto.jsx
// Description: Página pública de contacto de ProCivil Manager. Incluye un hero
//              con datos de contacto, un formulario con campos personalizados
//              y un dropdown PCM reutilizable, una sección con mapa de Bogotá,
//              y bloques de "Valor diferencial" y "Compromiso de respuesta"
//              con mejor jerarquía visual y tarjetas más vivas.

// =========================
// Importaciones principales
// =========================
import React, {
  useState,    // Hook para manejar estado local (formularios, secciones visibles, etc.).
  useEffect,   // Hook para manejar efectos secundarios (IntersectionObserver, timeouts).
  useRef      // Hook para referenciar nodos DOM (cerrar dropdown al hacer clic fuera).
} from 'react';

// Importa componentes de layout público (cabecera y pie de página).
import EncabezadoPrincipal from '../../../shared/components/layout/BarraNavegacionPublica'; // Cabecera / barra de navegación principal pública.
import PieDePaginaPrincipal from '../../../shared/components/layout/PieDePagina';           // Pie de página global público.

// =======================================================
// Opciones reutilizables para el tipo de proyecto
// (se usan en el dropdown PCM y luego podremos reusarlas en otras pantallas)
// =======================================================
const OPCIONES_TIPO_PROYECTO = [
  {
    valor: 'residencial',                                                                // Valor que se guarda en el estado / se envía al backend.
    titulo: 'Residencial',                                                               // Texto principal que verá el usuario.
    resumen: 'Conjuntos residenciales, edificios, viviendas VIS/VIP.'                   // Línea descriptiva corta.
  },
  {
    valor: 'comercial',
    titulo: 'Comercial',
    resumen: 'Locales, centros comerciales, oficinas y espacios corporativos.'
  },
  {
    valor: 'industrial',
    titulo: 'Industrial',
    resumen: 'Plantas, naves industriales, plataformas logísticas.'
  },
  {
    valor: 'infraestructura',
    titulo: 'Infraestructura',
    resumen: 'Vías, urbanismo, obras hidráulicas y equipamientos públicos.'
  }
];

// =======================================================
// Subcomponentes reutilizables para campos del formulario
// =======================================================

// Campo de texto genérico con etiqueta encima (input type="text" / "email" / "tel").
const CampoTextoFormulario = ({
  nombre,       // Nombre del campo (atributos name/id).
  etiqueta,     // Texto de la etiqueta que se muestra sobre el input.
  tipo = 'text',// Tipo de input (text, email, tel, etc.), por defecto "text".
  placeholder,  // Placeholder que se verá dentro del input.
  valor,        // Valor actual del campo (controlado por React).
  onChange      // Función manejadora para el evento onChange.
}) => (
  <div className="space-y-1.5">{/* Contenedor del campo con pequeño espacio entre etiqueta e input. */}
    <label
      htmlFor={nombre}                                                      // Asocia la etiqueta con el id del input para accesibilidad.
      className="text-xs font-semibold tracking-wide text-pcm-muted uppercase" // Estilos de la etiqueta (pequeña, mayúsculas, color tenue).
    >
      {etiqueta}                                                            {/* Muestra el texto de la etiqueta que llega por props. */}
    </label>
    <input
      id={nombre}                                                           // Id para relacionar con la etiqueta y focos.
      name={nombre}                                                         // Name para el envío del formulario y manejo de estado.
      type={tipo}                                                           // Tipo de input (text, email, tel, etc.).
      placeholder={placeholder}                                            // Placeholder descriptivo dentro del campo.
      value={valor}                                                         // Valor actual controlado desde el componente padre.
      onChange={onChange}                                                   // Llama a la función de cambio que actualiza el estado.
      className="
        w-full
        rounded-xl
        border border-white/15
        bg-pcm-bg/70
        px-4 py-3
        text-sm text-pcm-text
        placeholder:text-pcm-muted/80
        backdrop-blur-sm
        focus:border-pcm-primary/70
        focus:outline-none
        focus:ring-2 focus:ring-pcm-primary/60
        transition
      "                                                                     // Estilos del input: fondo translúcido, borde suave, foco con ring PCM.
    />
  </div>
);

// Campo de área de texto (textarea) con misma línea visual que los demás campos.
const CampoAreaFormulario = ({
  nombre,       // Nombre/id del campo.
  etiqueta,     // Etiqueta que aparece encima.
  placeholder,  // Placeholder dentro de la caja de texto.
  filas = 4,    // Cantidad de filas por defecto.
  valor,        // Valor actual del textarea.
  onChange      // Función para actualizar el estado al escribir.
}) => (
  <div className="space-y-1.5">{/* Contenedor del label y textarea. */}
    <label
      htmlFor={nombre}                                                      // Relaciona la etiqueta con el textarea.
      className="text-xs font-semibold tracking-wide text-pcm-muted uppercase"
    >
      {etiqueta}                                                            {/* Muestra el texto de la etiqueta. */}
    </label>
    <textarea
      id={nombre}                                                           // Id para accesibilidad.
      name={nombre}                                                         // Name para envío/manejo de estado.
      placeholder={placeholder}                                            // Mensaje guía dentro del área de texto.
      rows={filas}                                                          // Filas visibles configurables.
      value={valor}                                                         // Valor actual controlado desde el componente padre.
      onChange={onChange}                                                   // Actualiza el estado al escribir.
      className="
        w-full
        resize-none
        rounded-xl
        border border-white/15
        bg-pcm-bg/70
        px-4 py-3
        text-sm text-pcm-text
        placeholder:text-pcm-muted/80
        backdrop-blur-sm
        focus:border-pcm-primary/70
        focus:outline-none
        focus:ring-2 focus:ring-pcm-primary/60
        transition
      "                                                                     // Estilo coherente con los otros campos de formulario.
    />
  </div>
);

// =======================================================
// Dropdown PCM reutilizable (lista desplegable personalizada)
// =======================================================
const ListaDesplegablePcm = ({
  nombre,           // Nombre / id lógico del campo (se usará para el estado del formulario).
  etiqueta,         // Texto de la etiqueta sobre el dropdown.
  valor,            // Valor actualmente seleccionado (string).
  onChange,         // Función que recibe el "evento" para actualizar el estado padre.
  opciones,         // Arreglo de opciones: { valor, titulo, resumen }.
  placeholder = 'Selecciona una opción' // Texto que se muestra cuando no hay selección.
}) => {
  const [abierto, setAbierto] = useState(false);                   // Estado para saber si el dropdown está abierto o cerrado.
  const contenedorRef = useRef(null);                              // Referencia al contenedor para detectar clics fuera.

  const opcionSeleccionada = opciones.find(                         // Busca la opción cuyo valor coincide con el valor actual.
    (opcion) => opcion.valor === valor
  );

  // Maneja la selección de una opción dentro de la lista desplegable.
  const manejarSeleccion = (opcion) => {
    onChange({                                                     // Simula un evento estándar de input para reutilizar manejarCambioInput.
      target: {
        name: nombre,                                              // Name del campo que se está actualizando.
        value: opcion.valor                                        // Nuevo valor seleccionado.
      }
    });
    setAbierto(false);                                             // Cierra el dropdown al seleccionar.
  };

  // Efecto para cerrar el dropdown al hacer clic por fuera.
  useEffect(() => {
    const manejarClickDocumento = (evento) => {                    // Función que se ejecuta en cada clic global.
      if (
        contenedorRef.current &&                                   // Verifica que la referencia exista.
        !contenedorRef.current.contains(evento.target)             // Verifica que el clic NO fue dentro del contenedor del dropdown.
      ) {
        setAbierto(false);                                         // Cierra el dropdown.
      }
    };

    document.addEventListener('mousedown', manejarClickDocumento); // Se suscribe al evento de clic en todo el documento.

    return () => {
      document.removeEventListener('mousedown', manejarClickDocumento); // Limpia el listener al desmontar el componente.
    };
  }, []);

  return (
    <div className="space-y-1.5">{/* Contenedor general del campo (etiqueta + dropdown). */}
      <label
        htmlFor={nombre}                                            // Id lógico de referencia del campo.
        className="text-xs font-semibold tracking-wide text-pcm-muted uppercase"
      >
        {etiqueta}                                                  {/* Etiqueta superior del campo. */}
      </label>

      <div
        ref={contenedorRef}                                         // Asocia el contenedor principal a la referencia para detectar clics fuera.
        className="pcm-select-contenedor"                           // Clase helper global para manejar posición relativa.
      >
        <button
          type="button"                                             // Botón que abre/cierra la lista desplegable.
          className={`
            pcm-select                                             
            ${abierto ? 'pcm-select-abierto' : ''}                 // Aplica estilo extra cuando el dropdown está abierto.
          `}
          onClick={() => setAbierto((previo) => !previo)}           // Alterna el estado abierto/cerrado al hacer clic.
        >
          <div className="pcm-select-texto">{/* Zona izquierda: título y resumen. */}
            <span className="pcm-select-titulo">
              {opcionSeleccionada ? opcionSeleccionada.titulo : placeholder}
            </span>
            <span className="pcm-select-resumen">
              {opcionSeleccionada
                ? opcionSeleccionada.resumen
                : 'Selecciona el tipo de proyecto que mejor se ajusta a tu caso.'}
            </span>
          </div>

          <div className="pcm-select-estado">{/* Zona derecha: “pill” con valor corto + flecha. */}
            <span className="pcm-select-chip-valor">
              {opcionSeleccionada ? opcionSeleccionada.titulo : 'Sin seleccionar'}
            </span>
            <span
              className={`
                pcm-select-icono
                ${abierto ? 'pcm-select-icono-abierto' : ''}
              `}
            >
              ▼
            </span>
          </div>
        </button>

        {abierto && (                                                // Solo renderiza la lista cuando el estado abierto es true.
          <div
            className="
              pcm-select-lista
              pcm-scroll-y
            "
          >
            {opciones.map((opcion) => (                              // Recorre todas las opciones configuradas.
              <button
                key={opcion.valor}                                   // Usa el valor como clave única.
                type="button"                                        // Cada opción se comporta como un botón.
                onClick={() => manejarSeleccion(opcion)}             // Al hacer clic se selecciona la opción.
                className={`
                  pcm-select-opcion
                  ${valor === opcion.valor ? 'pcm-select-opcion-activa' : ''}
                `}
              >
                <span className="pcm-select-opcion-titulo">
                  {opcion.titulo}
                </span>
                <span className="pcm-select-opcion-resumen">
                  {opcion.resumen}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================================
// Componente principal de la página
// ==================================
const Contacto = () => {
  // =====================================================
  // ESTADO: SECCIONES VISIBLES (PARA ANIMACIONES CON SCROLL)
  // =====================================================
  const [seccionesVisibles, setSeccionesVisibles] = useState(
    new Set()                                                                  // Se inicializa con un Set vacío.
  );

  // =====================================================
  // ESTADO: DATOS DEL FORMULARIO DE CONTACTO
  // =====================================================
  const [datosFormulario, setDatosFormulario] = useState({
    name: '',                                                                  // Nombre de la persona que contacta.
    email: '',                                                                 // Correo electrónico de contacto.
    company: '',                                                               // Empresa (opcional).
    phone: '',                                                                 // Teléfono (opcional).
    projectType: '',                                                           // Tipo de proyecto (residencial, comercial, etc.).
    message: ''                                                                // Mensaje o descripción del proyecto.
  });

  // =====================================================
  // ESTADO: MENSAJE DE RETROALIMENTACIÓN (ÉXITO / ERROR)
  // =====================================================
  const [mensajeRetroalimentacion, setMensajeRetroalimentacion] = useState(null); // Mensaje de feedback después de intentar enviar el formulario.

  // =====================================================
  // URL DE GOOGLE MAPS PARA LA UBICACIÓN (FICTICIA) EN BOGOTÁ
  // =====================================================
  const urlMapaOficina =
    'https://www.google.com/maps?q=Bogota%20Colombia&output=embed';           // URL de Google Maps embed para una ubicación genérica en Bogotá.

  // =====================================================
  // EFECTO: CONFIGURAR INTERSECTION OBSERVER PARA FADE-IN
  // =====================================================
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {   // Verifica existencia de window/document para evitar errores en SSR.
      return;                                                                 // Si no hay DOM, no configura el observer.
    }

    const observador = new IntersectionObserver(                              // Crea una instancia de IntersectionObserver.
      (entradas) => {                                                         // Callback que se ejecuta cuando cambian intersecciones.
        entradas.forEach((entrada) => {                                       // Recorre cada entrada observada.
          if (entrada.isIntersecting) {                                       // Si la sección entra al viewport.
            setSeccionesVisibles((previo) => {                                // Actualiza el estado de secciones visibles.
              const siguiente = new Set(previo);                              // Crea un nuevo Set basado en el anterior (inmutabilidad).
              siguiente.add(entrada.target.id);                               // Agrega el id de la sección que se hizo visible.
              return siguiente;                                               // Devuelve el nuevo Set para actualizar estado.
            });
          }
        });
      },
      {
        threshold: 0.1,                                                       // Se dispara cuando al menos el 10 % del elemento es visible.
        rootMargin: '0px 0px -50px 0px'                                       // Ajusta el borde inferior para anticipar la animación.
      }
    );

    const secciones = document.querySelectorAll('[data-fade-in]');            // Selecciona todos los elementos que tengan el atributo data-fade-in.
    secciones.forEach((seccion) => observador.observe(seccion));              // Asocia el observador a cada sección.

    return () => {
      observador.disconnect();                                                // Limpia el observer al desmontar para evitar fugas de memoria.
    };
  }, []);

  // =====================================================
  // MANEJO DE CAMBIOS EN LOS CAMPOS DEL FORMULARIO
  // =====================================================
  const manejarCambioInput = (evento) => {                                    // Maneja el onChange de cualquier input/textarea/select.
    const { name, value } = evento.target;                                    // Obtiene el nombre y el valor del campo que cambió.
    setDatosFormulario((previo) => ({                                         // Actualiza el estado del formulario.
      ...previo,                                                              // Mantiene el resto de campos sin cambios.
      [name]: value                                                           // Actualiza el campo específico usando su name como clave.
    }));
  };

  // =====================================================
  // MANEJO DEL ENVÍO DEL FORMULARIO DE CONTACTO
  // =====================================================
  const manejarEnvioFormulario = async (evento) => {                          // Maneja el submit del formulario de contacto.
    evento.preventDefault();                                                  // Previene el comportamiento por defecto (recarga de página).

    if (!datosFormulario.name || !datosFormulario.email || !datosFormulario.message) { // Validación mínima de campos obligatorios.
      setMensajeRetroalimentacion({                                           // Configura un mensaje de error en el estado.
        type: 'error',                                                        // Tipo de mensaje: error.
        text: 'Por favor completa los campos Nombre, Email y Mensaje.'        // Texto que verá el usuario.
      });
      return;                                                                 // Corta la ejecución si la validación falla.
    }

    try {
      const respuesta = await fetch(                                          // Llama al endpoint de contacto en el backend PCM.
        `${import.meta.env.VITE_API_URL}/contacto`,                           // Endpoint /contacto del backend (controlado por variable de entorno).
        {
          method: 'POST',                                                     // Método HTTP POST.
          headers: {
            'Content-Type': 'application/json'                                // Indica que el cuerpo viaja como JSON.
          },
          body: JSON.stringify(datosFormulario)                               // Envía todos los campos del formulario serializados.
        }
      );

      const datos = await respuesta.json();                                   // Parsea la respuesta del backend como JSON.

      if (respuesta.ok) {                                                    // Si el status HTTP está en el rango 2xx.
        setMensajeRetroalimentacion({                                         // Configura mensaje de éxito.
          type: 'success',                                                    // Tipo: éxito.
          text: datos.message || 'Formulario enviado con éxito.'              // Usa mensaje del backend o uno por defecto.
        });

        setDatosFormulario({                                                  // Limpia el formulario en caso de éxito.
          name: '',
          email: '',
          company: '',
          phone: '',
          projectType: '',
          message: ''
        });
      } else {                                                                // Si el servidor responde con error (status no 2xx).
        setMensajeRetroalimentacion({                                         // Configura mensaje de error.
          type: 'error',                                                      // Tipo: error.
          text: datos.error || 'Error al enviar el formulario.'               // Mensaje para el usuario.
        });
      }
    } catch (error) {                                                         // Si ocurre un error de red u otro imprevisto.
      setMensajeRetroalimentacion({                                           // Configura un mensaje genérico.
        type: 'error',
        text: 'Error al enviar el formulario. Intenta más tarde.'             // Mensaje genérico para fallos de red.
      });
      console.error(error);                                                   // Log en consola útil durante desarrollo.
    }
  };

  // =====================================================
  // EFECTO: AUTO-OCULTAR EL MENSAJE DE FEEDBACK
  // =====================================================
  useEffect(() => {                                                           // Efecto que observa cambios en mensajeRetroalimentacion.
    if (mensajeRetroalimentacion) {                                           // Solo aplica si existe un mensaje visible.
      const temporizador = setTimeout(() => {                                 // Crea un temporizador.
        setMensajeRetroalimentacion(null);                                    // Limpia el mensaje después del tiempo definido.
      }, 4000);                                                               // 4000 ms = 4 segundos en pantalla.

      return () => {
        clearTimeout(temporizador);                                           // Limpia el timeout si el componente se desmonta o el mensaje cambia.
      };
    }
  }, [mensajeRetroalimentacion]);

  // ==========================
  // RENDER PRINCIPAL DEL COMPONENTE
  // ==========================
  return (
    <div
      className="
        pcm-page
        font-sans
        leading-relaxed
        overflow-x-hidden
      "                                                                         // Usa helper PCM, fuente sans y evita scroll horizontal.
    >
      {/* Cabecera del sitio (navbar fijo) */}
      <EncabezadoPrincipal />

      {/* Contenido principal de la página de contacto */}
      <main className="pt-24 md:pt-28">{/* Agrega padding-top para compensar la barra fija */}

        {/* ==========================
            HERO PRINCIPAL DE CONTACTO
           ========================== */}
        <section
          className="
            relative
            flex
            min-h-[calc(100vh-6rem)]
            items-center
            overflow-hidden
            pcm-fondo-degradado-principal
          "                                                                     // Hero con fondo degradado usando helper PCM.
        >
          {/* Fondo con grid sutil animado en baja opacidad */}
          <div
            className="absolute inset-0 opacity-10 animate-pulse"              // Capa de fondo con animación suave sobre todo el hero.
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")` // SVG embebido como patrón de cuadrícula.
            }}
          />

          {/* Burbujas de color flotantes para dar profundidad, usando paleta PCM */}
          <div
            className="
              absolute
              w-20 h-20 md:w-30 md:h-30
              rounded-full
              bg-pcm-primary/25
              top-[20%] left-[8.333%]
              blur-2xl
              animate-float-slow
            "
          />
          <div
            className="
              absolute
              w-30 h-30
              rounded-full
              bg-pcm-secondary/25
              top-[60%] right-[16.666%]
              blur-3xl
              animate-float-medium
            "
          />
          <div
            className="
              absolute
              w-15 h-15
              rounded-full
              bg-pcm-accent/25
              bottom-[20%] left-[20%]
              blur-2xl
              animate-float-fast
            "
          />

          {/* Contenedor principal del hero (dos columnas en pantallas grandes) */}
          <div
            className="
              pcm-container
              grid grid-cols-1
              items-center
              gap-16
              lg:grid-cols-2
            "
          >
            {/* Columna izquierda: información de contacto y texto principal */}
            <div className="space-y-8 animate-fade-in-up">
              {/* Pastilla superior con promesa de respuesta */}
              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full
                  border border-white/20
                  bg-black/30
                  px-4 py-1.5
                  text-[11px]
                  text-white/80
                  shadow-pcm-soft
                  backdrop-blur-md
                "
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse-soft" />{/* Punto animado para dar sensación de “online”. */}
                Respuesta en menos de 24 horas hábiles
              </div>

              {/* Título principal y descripción */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
                  ¿Listo para{' '}
                  <span
                    className="
                      pcm-text-degradado-hero
                      bg-clip-text
                      text-transparent
                    "                                                               // Aplica degradado bonito específico para el texto.
                  >
                    transformar
                  </span>{' '}
                  tu proyecto?
                </h1>

                <p className="text-base md:text-lg leading-relaxed text-pcm-muted">
                  Conecta con nuestro equipo y descubre cómo ProCivil Manager puede
                  optimizar la gestión, el control y la trazabilidad de tus obras
                  de construcción en Colombia.
                </p>
              </div>

              {/* Bloque de métodos de contacto directos (email, teléfono, oficina) */}
              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-center space-x-4">
                  <div
                    className="
                      flex h-12 w-12 items-center justify-center
                      rounded-full
                      bg-pcm-primary
                      text-xl
                      text-pcm-bg
                      shadow-pcm-soft
                    "
                  >
                    📧
                  </div>
                  <div>
                    <p className="font-semibold text-pcm-text">Correo electrónico</p>
                    <p className="text-pcm-muted">contacto@procivilmanager.com</p>
                  </div>
                </div>

                {/* Teléfono */}
                <div className="flex items-center space-x-4">
                  <div
                    className="
                      flex h-12 w-12 items-center justify-center
                      rounded-full
                      bg-pcm-primary
                      text-xl
                      text-pcm-bg
                      shadow-pcm-soft
                    "
                  >
                    📱
                  </div>
                  <div>
                    <p className="font-semibold text-pcm-text">
                      Línea de atención / WhatsApp
                    </p>
                    <p className="text-pcm-muted">+57 317 882 3120</p>
                  </div>
                </div>

                {/* Oficina */}
                <div className="flex items-center space-x-4">
                  <div
                    className="
                      flex h-12 w-12 items-center justify-center
                      rounded-full
                      bg-pcm-primary
                      text-xl
                      text-pcm-bg
                      shadow-pcm-soft
                    "
                  >
                    📍
                  </div>
                  <div>
                    <p className="font-semibold text-pcm-text">Oficina</p>
                    <p className="text-pcm-muted">Bogotá, Colombia</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: formulario de contacto mejorado */}
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: '0.08s' }}                                   // Pequeño retraso para diferenciar de la columna izquierda.
            >
              <div
                className="
                  relative
                  overflow-hidden
                  rounded-pcm-xxl
                  border border-pcm-primary/40
                  bg-pcm-surface/95
                  shadow-pcm-soft
                  backdrop-blur-2xl
                "
              >
                {/* Barra de carga superior tipo PCM dentro del cuadro */}
                <div
                  className="
                    absolute left-6 right-6 top-0
                    h-1.5
                    rounded-full
                    pcm-barra-carga-hero
                    animate-shimmer
                  "
                />

                {/* Contenido del formulario totalmente contenido en el card */}
                <div className="relative px-8 pt-8 pb-8 md:px-9 md:pt-10 md:pb-9 space-y-6">
                  {/* Encabezado textual del formulario */}
                  <div className="space-y-1 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
                      Solicitar información
                    </p>
                    <h2 className="text-xl md:text-2xl font-semibold text-white">
                      Cuéntanos sobre tu proyecto
                    </h2>
                    <p className="text-[11px] md:text-xs text-white/80">
                      Te contactaremos para entender mejor el alcance y compartir una
                      propuesta alineada a tus necesidades.
                    </p>
                  </div>

                  {/* Sección: datos de contacto */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-pcm-muted">
                      Datos de contacto
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CampoTextoFormulario
                        nombre="name"
                        etiqueta="Nombre completo"
                        tipo="text"
                        placeholder="Ingresa tu nombre"
                        valor={datosFormulario.name}
                        onChange={manejarCambioInput}
                      />
                      <CampoTextoFormulario
                        nombre="email"
                        etiqueta="Email"
                        tipo="email"
                        placeholder="tucorreo@empresa.com"
                        valor={datosFormulario.email}
                        onChange={manejarCambioInput}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CampoTextoFormulario
                        nombre="company"
                        etiqueta="Empresa (opcional)"
                        tipo="text"
                        placeholder="Nombre de la empresa"
                        valor={datosFormulario.company}
                        onChange={manejarCambioInput}
                      />
                      <CampoTextoFormulario
                        nombre="phone"
                        etiqueta="Teléfono / WhatsApp"
                        tipo="tel"
                        placeholder="+57 ..."
                        valor={datosFormulario.phone}
                        onChange={manejarCambioInput}
                      />
                    </div>
                  </div>

                  {/* Separador visual ligero */}
                  <div className="h-px bg-pcm-border/60" />

                  {/* Sección: información del proyecto */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-pcm-muted">
                      Información del proyecto
                    </p>

                    {/* Dropdown PCM reutilizable para tipo de proyecto */}
                    <ListaDesplegablePcm
                      nombre="projectType"
                      etiqueta="Tipo de proyecto"
                      valor={datosFormulario.projectType}
                      onChange={manejarCambioInput}
                      opciones={OPCIONES_TIPO_PROYECTO}
                      placeholder="Selecciona el tipo de proyecto"
                    />

                    <CampoAreaFormulario
                      nombre="message"
                      etiqueta="Descripción del proyecto"
                      placeholder="Cuéntanos sobre tu proyecto, ubicación, alcance y tiempos estimados..."
                      filas={4}
                      valor={datosFormulario.message}
                      onChange={manejarCambioInput}
                    />
                  </div>

                  {/* Botón de envío y feedback */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="submit"
                      onClick={manejarEnvioFormulario}
                      className="
                        w-full
                        pcm-btn-primary
                        justify-center
                        text-base
                        py-3.5
                        shadow-pcm-soft
                        transition-all duration-300
                        hover:-translate-y-1 hover:shadow-2xl
                      "
                    >
                      Enviar mensaje
                    </button>

                    {mensajeRetroalimentacion && (
                      <p
                        className={`
                          text-center text-sm
                          ${
                            mensajeRetroalimentacion.type === 'success'
                              ? 'text-emerald-300'
                              : 'text-red-300'
                          }
                        `}
                      >
                        {mensajeRetroalimentacion.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================
            SECCIÓN: UBICACIÓN Y MAPA
           ========================== */}
        <section
          id="map-location"
          data-fade-in
          className={`
            py-24
            bg-pcm-bg/95
            transition-all duration-700
            ${
              seccionesVisibles.has('map-location')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }
          `}
        >
          <div
            className="
              pcm-container
              grid gap-10
              lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]
              items-center
            "
          >
            {/* Columna izquierda: texto descriptivo de la ubicación */}
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-pcm-text">
                Nuestra ubicación en Bogotá
              </h2>
              <p className="text-lg text-pcm-muted">
                Atendemos tus proyectos desde Bogotá D.C., con cobertura en distintos
                municipios de Cundinamarca y otras ciudades del país. Puedes agendar
                una visita o reunión presencial coordinando previamente por WhatsApp.
              </p>
              <p className="text-sm text-pcm-muted">
                Usa el mapa para ubicar la oficina y, si lo prefieres, abre directamente
                la ubicación en Google Maps para calcular la ruta desde tu punto de origen.
              </p>

              {/* Botón para abrir directamente Google Maps en otra pestaña */}
              <a
                href={urlMapaOficina}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-2
                  pcm-btn-primary
                  px-6 py-3
                  text-sm font-semibold
                  shadow-pcm-soft
                  transition-all duration-300
                  hover:-translate-y-0.5 hover:shadow-2xl
                "
              >
                Ver ubicación en Google Maps
                <span className="text-lg">↗</span>
              </a>
            </div>

            {/* Columna derecha: contenedor visual del mapa */}
            <div
              className="
                relative
                h-72 w-full
                overflow-hidden
                rounded-3xl
                border border-white/15
                bg-pcm-surface/80
                shadow-pcm-soft
              "
            >
              <iframe
                title="Ubicación oficina ProCivil Manager"
                src={urlMapaOficina}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div
                className="
                  pointer-events-none
                  absolute inset-0
                  rounded-3xl
                  ring-1 ring-white/15
                "
              />
            </div>
          </div>
        </section>

        {/* ==========================
            SECCIÓN: ¿POR QUÉ ELEGIRNOS?
           ========================== */}
        <section
          id="why-choose"
          data-fade-in
          className={`
            py-24
            bg-pcm-surfaceSoft
            transition-all duration-700
            ${
              seccionesVisibles.has('why-choose')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }
          `}
        >
          <div className="pcm-container">
            {/* Título y descripción de la sección totalmente centrados */}
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-base md:text-lg font-bold uppercase tracking-[0.25em] text-pcm-primary mb-3">
                Valor diferencial
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-pcm-text mb-4">
                ¿Por qué elegirnos?
              </h2>
              <p className="text-sm md:text-base text-pcm-muted">
                Nos especializamos en brindar soluciones integrales para la gestión
                de proyectos de construcción, combinando experiencia en obra,
                interventoría y tecnología de vanguardia.
              </p>
            </div>

            {/* Tarjetas de motivos para elegir la plataforma */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mt-10">
              {[
                {
                  icon: '⚡',
                  title: 'Implementación rápida',
                  description:
                    'Configuración completa en muy poco tiempo. Comienza a centralizar tus proyectos, contratos y reportes casi de inmediato.'
                },
                {
                  icon: '🎯',
                  title: 'Soporte especializado',
                  description:
                    'Equipo con experiencia en obra civil, interventoría y gestión de proyectos disponible para acompañarte en la operación diaria.'
                },
                {
                  icon: '🔒',
                  title: 'Seguridad de la información',
                  description:
                    'Protección de datos con buenas prácticas, control de accesos y respaldos frecuentes de tu información crítica.'
                }
              ].map((razon, indiceRazon) => (
                <div
                  key={indiceRazon}
                  className="
                    group
                    relative
                    overflow-hidden
                    rounded-3xl
                    bg-pcm-bg/95
                    p-8
                    text-center
                    shadow-pcm-soft
                    transition-all duration-300
                    hover:-translate-y-2 hover:shadow-2xl
                    border border-pcm-border/60
                  "
                >
                  {/* Borde/halo superior de color */}
                  <div
                    className="
                      absolute inset-x-0 top-0
                      h-1
                      pcm-fondo-degradado-principal
                    "
                  />

                  {/* Icono central con degradado */}
                  <div
                    className="
                      mx-auto mb-6
                      flex h-20 w-20 items-center justify-center
                      rounded-2xl
                      pcm-fondo-degradado-principal
                      text-3xl text-slate-950
                      shadow-pcm-soft
                      transition
                      group-hover:scale-110
                    "
                  >
                    {razon.icon}
                  </div>

                  {/* Título */}
                  <h3
                    className="
                      mb-4
                      text-2xl font-semibold
                      text-pcm-text
                    "
                  >
                    {razon.title}
                  </h3>

                  {/* Descripción */}
                  <p className="leading-relaxed text-pcm-muted">
                    {razon.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================
            SECCIÓN: TIEMPOS DE RESPUESTA
           ========================== */}
        <section
          id="response-time"
          data-fade-in
          className={`
            py-24
            pcm-fondo-degradado-principal
            text-white
            transition-all duration-700
            ${
              seccionesVisibles.has('response-time')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }
          `}
        >
          <div className="pcm-container text-center">
            {/* Encabezado de la sección, centrado y con buen tamaño */}
            <div className="max-w-3xl mx-auto mb-10">
              <p className="text-base md:text-lg font-bold uppercase tracking-[0.25em] text-pcm-primary mb-3">
                Compromiso de respuesta
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Tiempo de respuesta comprometido
              </h2>
              <p className="text-sm md:text-base text-white/85">
                Sabemos que tus proyectos no pueden esperar. Por eso definimos tiempos
                de respuesta claros para cada tipo de solicitud y canal de comunicación.
              </p>
            </div>

            {/* Tarjetas con tiempos de respuesta para distintos tipos de consulta */}
            <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
              {[
                { time: '< 2 horas', label: 'Consultas generales', icon: '💬' },
                { time: '< 30 min', label: 'Soporte técnico', icon: '🔧' },
                { time: '< 24 horas', label: 'Propuestas comerciales', icon: '📋' }
              ].map((item, indiceItem) => (
                <div
                  key={indiceItem}
                  className="
                    group
                    pcm-card-respuesta
                    transition-all duration-300
                    hover:-translate-y-2 hover:shadow-2xl
                  "
                >
                  <div
                    className="
                      mx-auto mb-4
                      flex h-16 w-16 items-center justify-center
                      rounded-2xl
                      bg-pcm-bg/90
                      text-2xl text-pcm-text
                      shadow-pcm-soft
                      transition
                      group-hover:scale-110
                    "
                  >
                    {item.icon}
                  </div>
                  <h3
                    className="
                      mb-2
                      text-2xl font-bold
                      pcm-text-resaltado-respuesta
                    "
                  >
                    {item.time}
                  </h3>
                  <p className="text-sm text-white/85">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Pie de página global */}
      <PieDePaginaPrincipal />
    </div>
  );
};

// Exporta el componente para usarlo en el enrutador principal.
export default Contacto;
