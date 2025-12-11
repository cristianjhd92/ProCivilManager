// File: frontend/src/modules/workspace/components/BarraNavegacion.jsx
// Description: Barra lateral de navegación del tablero de trabajo interno
//              (administrador / líder de obra / cliente / auditor) de ProCivil Manager.
//              Aplica fondos, acentos y degradados según el rol del usuario
//              tanto en el encabezado, como en las opciones del menú, la zona
//              de ayuda y en el footer de "Cerrar sesión", manteniendo las
//              animaciones existentes en los botones de sección y añadiendo
//              accesos a manuales de usuario por rol (y manual técnico solo
//              para administradores).

// ==========================
// Importaciones principales
// ==========================
import React, {                         // Importa React para poder usar JSX y hooks.
  useEffect,                            // Hook para manejar efectos secundarios (lectura de localStorage).
  useState,                             // Hook para manejar estado local (nombre y rol del usuario).
} from "react";
import { useNavigate } from "react-router-dom"; // Hook de React Router para navegar a rutas internas (manuales).

// ==========================
// Importación de íconos
// ==========================
import {
  Building2,        // Ícono tipo edificio para el logo de ProCivil Manager.
  User,             // Ícono de usuario para el avatar de la parte inferior.
  LayoutDashboard,  // Ícono de dashboard principal.
  Users,            // Ícono de usuarios.
  FolderKanban,     // Ícono de proyectos/tableros.
  Mail,             // Ícono de correo/bandeja de entrada.
  BarChart3,        // Ícono de reportes/estadísticas.
  Warehouse,        // Ícono de almacenes.
  Package,          // Ícono de materiales.
  Bell,             // Ícono de alertas.
  ClipboardList,    // Ícono de solicitudes/listas.
  FileText,         // Ícono de registros de auditoría/documentos.
  IdCard,           // Ícono de perfil/credencial.
  LogOut,           // Ícono de salida para reforzar la acción de cerrar sesión.
  HelpCircle,       // Ícono de ayuda general (manual de usuario).
  BookOpen,         // Ícono para el manual técnico (solo admin).
  Clock3,           // Ícono de reloj para el historial de proyectos.
  FilePlus2,        // Ícono de archivo con signo + para "Solicitar proyecto".
} from "lucide-react";                   // Importa los íconos desde lucide-react.

// =====================================
// Componente principal: BarraNavegacion
// =====================================
const BarraNavegacion = ({
  seccionActiva,                        // Clave de la sección actualmente activa en el tablero.
  establecerSeccionActiva,              // Función para cambiar la sección activa.
  secciones,                            // Objeto con la definición de todas las secciones del menú.
  alCerrarSesion,                       // Callback para ejecutar el cierre de sesión.
  alertasSinLeer,                       // Número de alertas sin leer (se muestra en un badge rojo).
}) => {
  // Hook de navegación para ir a rutas internas (por ejemplo, manuales).
  const navegar = useNavigate();        // En este archivo se usa solo para posibles usos futuros.

  // Estado local: nombre del usuario que se muestra en el footer.
  const [nombreUsuario, setNombreUsuario] = useState("Usuario");
  // Estado local: rol del usuario tal como viene de localStorage (puede venir en inglés o español).
  const [rolUsuario, setRolUsuario] = useState("");

  // ==========================
  // Mapa clave de sección → ícono
  // ==========================
  const mapaIconos = {
    // Dashboard / inicio
    dashboard: LayoutDashboard,

    // Perfil
    perfil: IdCard,

    // Usuarios
    users: Users,
    usuarios: Users,

    // Proyectos
    projects: FolderKanban,
    proyectos: FolderKanban,

    // Historial de proyectos (cliente)
    historialProyectos: Clock3,

    // Contacto / correo / bandeja
    contact: Mail,
    contacto: Mail,
    inbox: Mail,
    bandejaEntrada: Mail,
    bandeja_entrada: Mail,
    bandejaDeEntrada: Mail,

    // Reportes
    reports: BarChart3,
    reportes: BarChart3,

    // Almacenes / materiales
    almacenes: Warehouse,
    materiales: Package,
    materials: Package,

    // Solicitudes
    solicitudes: ClipboardList,
    historialSolicitudes: ClipboardList,

    // Acción: solicitar proyecto (cliente)
    solicitarProyecto: FilePlus2,

    // Auditoría / registros
    audit: FileText,
    auditoria: FileText,
    registrosAuditoria: FileText,
    registros_auditoria: FileText,
    registrosDeAuditoria: FileText,

    // Alertas
    alertas: Bell,
  };

  // ==========================
  // Efecto: lectura de usuario desde localStorage
  // ==========================
  useEffect(() => {
    try {
      // Intenta leer primero la clave estándar PCM y luego una clave legacy "user".
      const cadenaUsuario =
        localStorage.getItem("pcm_usuario") ||
        localStorage.getItem("user") ||
        "{}";                             // Si no encuentra nada, usa un objeto vacío.

      const almacenado = JSON.parse(cadenaUsuario); // Convierte la cadena JSON a objeto.

      // Construye el nombre completo usando posibles campos en inglés o español.
      const nombreCompleto = `${almacenado.firstName || almacenado.nombre || ""} ${almacenado.lastName || almacenado.apellido || ""
        }`.trim();                          // Une nombre y apellido y recorta espacios.

      // Obtiene el rol almacenado (en inglés o español).
      const rolDetectado =
        almacenado.role ||                // Rol en inglés (admin, client, etc.).
        almacenado.rol || "";             // Rol en español (administrador, cliente, etc.).

      // Actualiza estados locales con valores calculados o valores por defecto.
      setNombreUsuario(nombreCompleto || "Usuario");
      setRolUsuario(rolDetectado || "");
    } catch {
      // Si algo falla al parsear o leer, se asegura de dejar valores seguros.
      setNombreUsuario("Usuario");
      setRolUsuario("");
    }
  }, []);                                  // Solo se ejecuta una vez al montar el componente.

  // Normaliza el rol a minúsculas y sin espacios sobrantes para poder compararlo.
  const rolNormalizado = (rolUsuario || "").toLowerCase().trim();

  // ==========================
  // Helpers de rol (booleanos)
  // ==========================
  // Detecta si es administrador, admitiendo variaciones como "Administrador" o "ROLE_ADMIN".
  const esAdmin =
    rolNormalizado === "admin" ||
    rolNormalizado === "administrador" ||
    rolNormalizado.includes("admin");

  // Detecta si es líder de obra, admitiendo "líder", "lider" o cadenas que lo incluyan.
  const esLiderObra =
    rolNormalizado === "lider de obra" ||
    rolNormalizado === "líder de obra" ||
    rolNormalizado === "lider" ||
    rolNormalizado.includes("lider");

  // Detecta si es cliente (admite "client" por si viniera en inglés).
  const esCliente =
    rolNormalizado === "cliente" ||
    rolNormalizado.includes("client");

  // Detecta si es auditor.
  const esAuditor =
    rolNormalizado === "auditor" ||
    rolNormalizado.includes("auditor");

  // ==========================
  // Mapa rol técnico → etiqueta legible
  // ==========================
  const mapaEtiquetaRol = {
    admin: "Administrador",
    administrador: "Administrador",
    "lider de obra": "Líder de obra",
    "líder de obra": "Líder de obra",
    lider: "Líder de obra",
    cliente: "Cliente",
    auditor: "Auditor",
  };

  // Determina la etiqueta legible que se mostrará bajo el nombre del usuario.
  const etiquetaRol =
    mapaEtiquetaRol[rolNormalizado] || (rolUsuario ? rolUsuario : "");

  // ==========================
  // Clases de fondo del sidebar según el rol
  // ==========================
  const claseSidebarRol =
    esAdmin
      ? "pcm-sidebar-admin"        // Sidebar azul para administradores.
      : esCliente
        ? "pcm-sidebar-cliente"    // Sidebar verde para clientes.
        : esLiderObra
          ? "pcm-sidebar-lider"    // Sidebar naranja para líderes.
          : esAuditor
            ? "pcm-sidebar-auditor"// Sidebar morado para auditores.
            : "pcm-sidebar-admin"; // Fallback: azul de admin.

  // ==========================
  // Ruta del manual de usuario según el rol
  // ==========================
  const obtenerRutaManualUsuario = () => {
    // Si no hay rol, se envía al índice general de manuales.
    if (!rolNormalizado) return "/manuales";

    // Admin → manual de administrador.
    if (esAdmin) return "/manuales/admin";

    // Líder de obra → manual para líderes.
    if (esLiderObra) return "/manuales/lider";

    // Cliente → manual de cliente.
    if (esCliente) return "/manuales/cliente";

    // Auditor → manual de auditor.
    if (esAuditor) return "/manuales/auditor";

    // Cualquier otro rol extraño → índice general.
    return "/manuales";
  };

  // ==========================
  // Clases del bloque de ayuda según rol
  // ==========================
  const obtenerClasesAyudaPorRol = () => {
    if (esAdmin) {
      // Admin → borde azul por rol admin.
      return "border-pcm-roleAdmin/60 bg-pcm-surfaceSoft/80";
    }
    if (esLiderObra) {
      // Líder → borde naranja por rol líder.
      return "border-pcm-roleLider/60 bg-pcm-surfaceSoft/80";
    }
    if (esCliente) {
      // Cliente → borde verde por rol cliente.
      return "border-pcm-roleCliente/60 bg-pcm-surfaceSoft/80";
    }
    if (esAuditor) {
      // Auditor → borde morado por rol auditor.
      return "border-pcm-roleAuditor/60 bg-pcm-surfaceSoft/80";
    }
    // Fallback neutro pero coherente con PCM.
    return "border-pcm-primary/40 bg-pcm-surfaceSoft/80";
  };

  // ==========================
  // Clases del botón "Manual de usuario" según rol
  // ==========================
  const obtenerClasesBotonManualUsuario = () => {
    if (esAdmin) {
      // Admin → botón azul sólido.
      return "bg-pcm-roleAdmin text-pcm-bg border border-pcm-roleAdmin/80 hover:shadow-pcm-tab-glow";
    }
    if (esLiderObra) {
      // Líder → botón naranja sólido.
      return "bg-pcm-roleLider text-pcm-bg border border-pcm-roleLider/80 hover:shadow-pcm-tab-glow";
    }
    if (esCliente) {
      // Cliente → botón verde sólido.
      return "bg-pcm-roleCliente text-pcm-bg border border-pcm-roleCliente/80 hover:shadow-pcm-tab-glow";
    }
    if (esAuditor) {
      // Auditor → botón morado sólido.
      return "bg-pcm-roleAuditor text-pcm-bg border border-pcm-roleAuditor/80 hover:shadow-pcm-tab-glow";
    }
    // Fallback: botón con color principal PCM.
    return "bg-pcm-primary text-pcm-bg border border-pcm-primary/80 hover:shadow-pcm-tab-glow";
  };

  // ==========================
  // Clases del botón "Manual técnico PCM" según rol
  // ==========================
  const obtenerClasesBotonManualTecnico = () => {
    if (esAdmin) {
      // Admin → borde azul y hover con leve fondo azul.
      return "border-pcm-roleAdmin/80 text-pcm-text hover:bg-pcm-roleAdmin/15 hover:border-pcm-roleAdmin";
    }
    if (esLiderObra) {
      // Líder → borde naranja.
      return "border-pcm-roleLider/80 text-pcm-text hover:bg-pcm-roleLider/15 hover:border-pcm-roleLider";
    }
    if (esCliente) {
      // Cliente → borde verde.
      return "border-pcm-roleCliente/80 text-pcm-text hover:bg-pcm-roleCliente/15 hover:border-pcm-roleCliente";
    }
    if (esAuditor) {
      // Auditor → borde morado.
      return "border-pcm-roleAuditor/80 text-pcm-text hover:bg-pcm-roleAuditor/15 hover:border-pcm-roleAuditor";
    }
    // Fallback neutro.
    return "border-white/30 text-pcm-text hover:bg-white/10 hover:border-white/60";
  };

  // ==========================
  // Handlers de navegación a manuales
  // ==========================
  const manejarIrAManualUsuario = () => {
    // Calcula la ruta específica según el rol actual.
    const rutaManual = obtenerRutaManualUsuario();
    // Abre el manual en una pestaña nueva.
    window.open(rutaManual, "_blank", "noopener,noreferrer");
  };

  const manejarIrAManualTecnico = () => {
    // Ruta fija acordada para el manual técnico PCM de administradores.
    window.open("/manuales/admin/tecnico", "_blank", "noopener,noreferrer");
  };

  // Flag que indica si se debe mostrar el botón de manual técnico (solo admin).
  const hayManualTecnico = esAdmin;

  // ==========================
  // Render del componente
  // ==========================
  return (
    <div
      className={`
        fixed left-0 top-0
        h-screen w-72
        border-r border-white/10
        shadow-pcm-soft
        flex flex-col
        pcm-sidebar-raiz
        ${claseSidebarRol}
      `}
    >
      {/* CABECERA: logo + nombre del sistema */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          {/* Logo circular con degradado controlado por CSS según el rol */}
          <div
            className="
              w-12 h-12
              rounded-pcm-xl
              flex items-center justify-center
              pcm-sidebar-logo
            "
          >
            <Building2 size={28} className="text-white" />
          </div>

          {/* Nombre del sistema y subtítulo */}
          <div>
            <h1
              className="
                text-xl font-bold
                pcm-sidebar-titulo
              "
            >
              ProCivil Manager
            </h1>
            <p className="text-xs pcm-sidebar-subtitulo">
              Sistema de gestión
            </p>
          </div>
        </div>
      </div>

      {/* ZONA CENTRAL: lista de opciones del menú + bloque de ayuda */}
      <div
        className="
          flex-1
          overflow-y-auto
          pcm-scroll-y
          py-6 px-3
        "
      >
        {/* Lista principal de secciones del tablero */}
        <div className="space-y-2">
          {Object.entries(secciones).map(([clave, seccion]) => {
            // Determina el ícono de la sección (por key o override explícito).
            const Icono = seccion.iconoOpcional || mapaIconos[clave];
            // Determina si esta sección es la activa.
            const esActiva = seccionActiva === clave;
            // Título visible de la sección (en español).
            const tituloVisible = seccion.titulo || seccion.title || clave;

            // -----------------------------
            // Lógica del badge numérico
            // -----------------------------
            const tieneBadgeSeccion =
              typeof seccion.badge === "number" && seccion.badge > 0; // Badge definido en la sección.
            const tieneBadgeAlertas =
              clave === "alertas" &&
              typeof alertasSinLeer === "number" &&
              alertasSinLeer > 0;                                     // Badge específico de alertas.

            // Determina si se muestra algún badge.
            const mostrarBadge = tieneBadgeSeccion || tieneBadgeAlertas;
            // Valor numérico a mostrar en el badge.
            const valorBadge = tieneBadgeAlertas
              ? alertasSinLeer
              : seccion.badge;

            return (
              <button
                key={clave}
                type="button"
                onClick={() => establecerSeccionActiva(clave)} // Cambia la sección activa al hacer clic.
                aria-current={esActiva ? "page" : undefined}   // Marca a11y para la sección activa.
                className={`
                  w-full
                  flex items-center space-x-3
                  px-4 py-3
                  rounded-pcm-xl
                  font-medium text-sm
                  border
                  transition-all duration-300
                  ${esActiva
                    ? "pcm-sidebar-opcion-activa text-white shadow-pcm-soft border-white/20 translate-x-1"
                    : "text-pcm-muted border-transparent hover:text-pcm-text hover:bg-white/5 hover:border-white/15 hover:translate-x-1"
                  }
                `}
              >
                {/* Ícono de la sección (si existe uno mapeado) */}
                {Icono && <Icono size={20} />}

                {/* Título + badge juntos para que la burbuja roja se vea pegada al texto */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="truncate">{tituloVisible}</span>

                  {mostrarBadge && (
                    <span
                      className="
                        inline-flex items-center justify-center
                        px-2 py-0.5
                        text-[10px] font-bold text-white
                        bg-red-600
                        rounded-full
                        shadow-md
                        shrink-0
                      "
                    >
                      {valorBadge > 99 ? "99+" : valorBadge}
                    </span>
                  )}
                </div>

                {/* Indicador lateral de sección activa (barrita vertical) */}
                {esActiva && (
                  <div
                    className="
                      ml-2
                      w-1.5 h-8
                      rounded-full
                      animate-fade-in-soft
                      pcm-sidebar-indicador-activo
                    "
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* BLOQUE DE AYUDA / MANUALES POR ROL */}
        <div className="mt-6">
          <div
            className={`
              rounded-pcm-xl
              border
              px-3
              ${hayManualTecnico ? "py-3" : "py-4"}
              shadow-pcm-soft
              ${obtenerClasesAyudaPorRol()}
            `}
          >
            <div className="flex flex-col gap-2">
              {/* Botón principal: manual de usuario específico por rol */}
              <button
                type="button"
                onClick={manejarIrAManualUsuario}
                className={`
                  inline-flex items-center justify-center
                  gap-2
                  w-full
                  rounded-full
                  px-3 py-1.5
                  text-[11px] font-semibold
                  shadow-pcm-soft
                  hover:scale-105
                  active:scale-95
                  transition duration-200
                  ${obtenerClasesBotonManualUsuario()}
                `}
              >
                <HelpCircle size={14} className="shrink-0" />
                <span>Manual de usuario</span>
              </button>

              {/* Botón secundario: manual técnico PCM (solo administradores) */}
              {hayManualTecnico && (
                <button
                  type="button"
                  onClick={manejarIrAManualTecnico}
                  className={`
                    inline-flex items-center justify-center
                    gap-2
                    w-full
                    rounded-full
                    px-3 py-1.5
                    text-[11px] font-semibold
                    bg-pcm-surface/80
                    hover:scale-105
                    active:scale-95
                    transition duration-200
                    ${obtenerClasesBotonManualTecnico()}
                  `}
                >
                  <BookOpen size={14} className="shrink-0" />
                  <span>Manual técnico PCM</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: datos de usuario + botón de cerrar sesión */}
      <div className="p-4 border-t border-white/10">
        <button
          type="button"
          onClick={alCerrarSesion}          // Ejecuta el callback de cierre de sesión.
          className="
            group
            w-full
            flex items-center space-x-3
            rounded-pcm-xl
            px-3 py-3
            border border-white/20
            cursor-pointer
            backdrop-blur-sm
            transition-all duration-300
            hover:shadow-xl hover:shadow-red-500/60 hover:-translate-y-0.5
            hover:animate-pulse-soft
            pcm-sidebar-footer
          "
        >
          {/* Avatar circular con ícono de usuario */}
          <div
            className="
              w-10 h-10
              rounded-full
              flex items-center justify-center
              shadow-inner
              shrink-0
              pcm-sidebar-avatar
              group-hover:ring-2 group-hover:ring-offset-2
              transition-all duration-300
            "
          >
            <User size={20} className="text-white" />
          </div>

          {/* Nombre, rol y acción de cierre de sesión */}
          <div className="flex-1 min-w-0 text-left">
            {/* Nombre de la persona logueada */}
            <p
              className="
                text-pcm-text
                font-medium text-sm
                truncate
                group-hover:text-white
              "
              title={nombreUsuario}
            >
              {nombreUsuario}
            </p>

            {/* Rol legible si existe */}
            {etiquetaRol && (
              <p className="text-xs font-semibold leading-tight truncate pcm-sidebar-rol">
                Rol: {etiquetaRol}
              </p>
            )}

            {/* Acción de cerrar sesión con ícono y texto en mayúsculas */}
            <p
              className="
                mt-1
                inline-flex items-center gap-1.5
                text-[11px] font-semibold
                text-red-300
                group-hover:text-red-50
                group-hover:animate-pulse-soft
              "
            >
              <LogOut size={14} className="shrink-0" />
              <span className="uppercase tracking-wide">
                Cerrar sesión
              </span>
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

// Exporta el componente principal de la barra interna para ser usado en TableroTrabajo.
export default BarraNavegacion;
