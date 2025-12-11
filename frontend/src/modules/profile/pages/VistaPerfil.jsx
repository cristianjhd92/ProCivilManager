// File: frontend/src/modules/profile/pages/VistaPerfil.jsx                 // Ruta del archivo dentro del módulo de perfil.
// Description: Vista de perfil de usuario dentro del panel interno de      // Descripción: permite al usuario autenticado consultar
//              ProCivil Manager. Permite actualizar datos básicos          // y actualizar su información básica (nombre, correo,
//              (nombre, correo, teléfono, empresa, cargo) y cambiar la     // teléfono, empresa y cargo) y cambiar su contraseña
//              contraseña con validaciones de fuerza, coincidencia y       // con validaciones de seguridad, consumiendo los
//              feedback visual, consumiendo los endpoints /user/me y       // endpoints /user/me y /user/me/password del backend
//              /user/me/password del backend PCM. Los colores y acentos    // PCM. La tarjeta se adapta visualmente al rol del
//              del panel se ajustan dinámicamente según el rol del         // usuario (admin, líder, cliente, auditor) usando las
//              usuario mediante las clases globales .pcm-panel y           // clases .pcm-panel y .pcm-panel--ROL definidas en el
//              .pcm-panel--ROL del tema PCM, y el avatar muestra un        // tema visual global de ProCivil Manager con un “glow”
//              resplandor suave acorde al rol para la demo.                // suave en el avatar según el rol.

import React, { useState, useEffect } from 'react'; // Importa React y los hooks useState/useEffect para manejar estado y efectos.

// Importa íconos desde lucide-react para la interfaz.
import {
  User,          // Ícono de usuario (para campos de nombre y pestaña de información).
  Mail,          // Ícono de sobre (para correo electrónico).
  Phone,         // Ícono de teléfono (para contacto).
  Building2,     // Ícono de edificio (para empresa).
  Briefcase,     // Ícono de maletín (para cargo).
  Lock,          // Ícono de candado (para contraseñas y pestaña de seguridad).
  Eye,           // Ícono de ojo abierto (mostrar contraseña).
  EyeOff,        // Ícono de ojo tachado (ocultar contraseña).
  X              // Ícono de X (cerrar mensaje global de feedback).
} from 'lucide-react'; // Importa los íconos desde la librería lucide-react.

// Define la URL base de la API leyendo la variable de entorno de Vite o usando un fallback local.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // Usa VITE_API_URL o un valor local por defecto.

// Expresión regular para validar un teléfono colombiano de exactamente 10 dígitos.
const CO_PHONE_REGEX = /^\d{10}$/; // Acepta exactamente 10 dígitos numéricos.

// =======================================================================
// Funciones auxiliares para aplicar colores según el rol del usuario
// =======================================================================

/**
 * obtenerClasesRolPanel
 * Devuelve las clases base de panel PCM según el rol del usuario:
 *  - admin         → .pcm-panel .pcm-panel--admin
 *  - lider de obra → .pcm-panel .pcm-panel--lider
 *  - cliente       → .pcm-panel .pcm-panel--cliente
 *  - auditor       → .pcm-panel .pcm-panel--auditor
 *  - cualquier otro valor → .pcm-panel
 */
const obtenerClasesRolPanel = (rol) => {                                 // Función que traduce el rol a clases de panel PCM.
  switch (rol) {                                                         // Evalúa el rol recibido.
    case 'admin':                                                        // Si el rol es admin...
      return 'pcm-panel pcm-panel--admin';                               // Devuelve clases de panel para administradores.
    case 'lider de obra':                                                // Si el rol es líder de obra...
    case 'lider':                                                        // Soporta variante corta "lider".
    case 'lider_obra':                                                   // Soporta variante con guion bajo.
      return 'pcm-panel pcm-panel--lider';                               // Devuelve clases de panel para líderes.
    case 'cliente':                                                      // Si el rol es cliente...
      return 'pcm-panel pcm-panel--cliente';                             // Devuelve clases de panel para clientes.
    case 'auditor':                                                      // Si el rol es auditor...
      return 'pcm-panel pcm-panel--auditor';                             // Devuelve clases de panel para auditores.
    default:                                                             // Cualquier otro valor de rol...
      return 'pcm-panel';                                                // Usa la clase base de panel sin acento específico.
  }
};

/**
 * obtenerClasesAvatarRol
 * Devuelve clases de fondo/anillo/sombra para el avatar según el rol:
 *  - admin         → fondo azul PCM, anillo y glow azul.
 *  - lider de obra → fondo naranja PCM (secondary), anillo naranja.
 *  - cliente       → fondo verde PCM (accent), anillo verde.
 *  - auditor       → fondo azul con anillo más frío para diferenciar.
 */
const obtenerClasesAvatarRol = (rol) => {                                // Función que define el “glow” del avatar según el rol.
  switch (rol) {                                                         // Evalúa el rol.
    case 'admin':                                                        // Admin → azul PCM.
      return 'bg-pcm-primary ring-2 ring-pcm-primary/80 shadow-pcm-tab-glow animate-pulse-soft';
    case 'lider de obra':                                                // Líder de obra → naranja PCM (secondary).
    case 'lider':
    case 'lider_obra':
      return 'bg-pcm-secondary ring-2 ring-pcm-secondary/80 shadow-pcm-tab-glow animate-pulse-soft';
    case 'cliente':                                                      // Cliente → verde PCM (accent).
      return 'bg-pcm-accent ring-2 ring-pcm-accent/80 shadow-pcm-tab-glow animate-pulse-soft';
    case 'auditor':                                                      // Auditor → tono más neutro/frío.
      return 'bg-pcm-primary ring-2 ring-pcm-accent/80 shadow-pcm-tab-glow animate-pulse-soft';
    default:                                                             // Rol desconocido → azul PCM base.
      return 'bg-pcm-primary ring-2 ring-pcm-primary/70 shadow-pcm-tab-glow';
  }
};

/**
 * obtenerClasesSegmentoTabsRol
 * Devuelve el color de fondo del segmento deslizante de las pestañas
 * según el rol del usuario (para que el “pill” tenga el color del rol).
 */
const obtenerClasesSegmentoTabsRol = (rol) => {                          // Define el color del fondo deslizante de las pestañas.
  switch (rol) {
    case 'admin':                                                        // Admin → azul PCM.
      return 'bg-pcm-primary';
    case 'lider de obra':                                                // Líder de obra → naranja PCM.
    case 'lider':
    case 'lider_obra':
      return 'bg-pcm-secondary';
    case 'cliente':                                                      // Cliente → verde PCM.
      return 'bg-pcm-accent';
    case 'auditor':                                                      // Auditor → tono derivado del accent.
      return 'bg-pcm-accent';
    default:                                                             // Rol desconocido → azul PCM.
      return 'bg-pcm-primary';
  }
};

/**
 * obtenerClasesTabActivaRol
 * Devuelve las clases de brillo (texto + sombra) para la pestaña activa
 * del selector, usando el color del rol. Aquí solo se resalta el texto
 * con drop-shadow para evitar bordes raros alrededor del botón.
 */
const obtenerClasesTabActivaRol = (rol) => {                             // Define el brillo visual de la pestaña activa según el rol.
  switch (rol) {
    case 'admin':                                                        // Admin → texto claro con brillo suave.
    case 'lider de obra':                                                // Líder → usa el mismo brillo, cambia solo el color del pill.
    case 'lider':
    case 'lider_obra':
    case 'cliente':                                                      // Cliente → igual patrón de brillo.
    case 'auditor':                                                      // Auditor → igual patrón de brillo.
      return 'text-pcm-bg drop-shadow-md';
    default:                                                             // Valor por defecto.
      return 'text-pcm-bg drop-shadow-md';
  }
};

/**
 * obtenerClasesBotonPrimarioRol
 * Devuelve clases extra para remarcar los botones primarios (acciones
 * principales) con un anillo acorde al rol del usuario.
 */
const obtenerClasesBotonPrimarioRol = (rol) => {                         // Define el contorno de los botones primarios según el rol.
  switch (rol) {
    case 'admin':                                                        // Admin → anillo azul PCM.
      return 'ring-1 ring-pcm-primary/70';
    case 'lider de obra':                                                // Líder → anillo naranja PCM.
    case 'lider':
    case 'lider_obra':
      return 'ring-1 ring-pcm-secondary/70';
    case 'cliente':                                                      // Cliente → anillo verde PCM.
      return 'ring-1 ring-pcm-accent/70';
    case 'auditor':                                                      // Auditor → anillo frío/accent.
      return 'ring-1 ring-pcm-accent/70';
    default:                                                             // Sin rol → sin anillo extra.
      return '';
  }
};

// =========================
// Input genérico reutilizable
// =========================

// Componente base para inputs de texto/email, con ícono opcional y estilos PCM.
const CampoEntrada = ({
  icon: Icono,      // Ícono opcional que se mostrará a la izquierda del input.
  label,           // Etiqueta visible encima del input.
  name,            // Nombre del input (mapea al estado formData).
  type = 'text',   // Tipo de input, por defecto "text".
  value,           // Valor actual del input (controlado).
  onChange,        // Función que se llama al cambiar el valor.
  placeholder,     // Texto de ejemplo dentro del input.
  required = false,// Marca el campo como obligatorio a nivel HTML si es true.
  pattern,         // Patrón opcional para validación nativa.
  title            // Texto de ayuda para el patrón nativo (tooltip de error del navegador).
}) => (
  // Contenedor vertical del label + input.
  <div className="space-y-1">
    {/* Etiqueta del campo, en mayúsculas y con estilo PCM. */}
    <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
      {label}
    </label>

    {/* Caja del input con fondo suave y borde que se resalta al enfocar. */}
    <div
      className="flex items-center gap-2 bg-pcm-surfaceSoft/80 border border-white/10 rounded-xl px-3 h-11
                 focus-within:border-pcm-primary focus-within:shadow-pcm-soft transition-all"
    >
      {/* Ícono a la izquierda, si se envió Icono como prop. */}
      {Icono && (
        <Icono
          size={18}                      // Define el tamaño del ícono.
          className="text-pcm-muted shrink-0" // Color tenue y evita que el ícono se encoja.
        />
      )}

      {/* Input controlado que ocupa el espacio restante. */}
      <input
        name={name}                      // Nombre del campo (clave en formData).
        type={type}                      // Tipo de input (text, email, etc.).
        value={value}                    // Valor controlado desde el estado.
        onChange={onChange}              // Handler de cambio.
        placeholder={placeholder}        // Placeholder descriptivo.
        required={required}              // Campo obligatorio si corresponde.
        pattern={pattern}                // Patrón de validación si se pasa.
        title={title}                    // Texto de ayuda para el patrón.
        className="flex-1 bg-transparent outline-none text-sm text-pcm-text placeholder-pcm-muted/70"
      />
    </div>
  </div>
); // Cierra el componente CampoEntrada.

// =========================
// Input específico de teléfono (+57 fijo)
// =========================

// Campo especializado para teléfono colombiano: bloquea el prefijo +57 y solo acepta 10 dígitos.
const CampoTelefono = ({
  label,          // Etiqueta visible del campo.
  name,           // Nombre del input (para consistencia con formData).
  value,          // Valor actual (10 dígitos locales sin +57).
  onChangeDigits, // Función que recibe directamente los dígitos limpios.
  isFocused,      // Booleano para saber si el campo está enfocado (para mostrar ayuda).
  onFocus,        // Handler cuando el input recibe foco.
  onBlur          // Handler cuando el input pierde foco.
}) => {
  // Maneja el cambio en el input, filtrando caracteres y limitando a 10 dígitos.
  const manejarCambioLocal = (e) => {
    const crudo = e.target.value;                 // Captura el valor sin procesar.
    const soloDigitos = crudo.replace(/\D/g, ''); // Elimina cualquier carácter no numérico.
    const limitado = soloDigitos.slice(0, 10);    // Limita a máximo 10 dígitos.
    onChangeDigits(limitado);                     // Envía los dígitos limpios al estado padre.
  };

  // Renderiza el campo de teléfono completo.
  return (
    <div className="space-y-1">
      {/* Etiqueta del campo de teléfono. */}
      <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
        {label}
      </label>

      {/* Caja de teléfono con ícono, prefijo +57 y campo para los 10 dígitos. */}
      <div
        className="flex items-center gap-2 bg-pcm-surfaceSoft/80 border border-white/10 rounded-xl px-3 h-11
                   focus-within:border-pcm-primary focus-within:shadow-pcm-soft transition-all"
      >
        {/* Ícono de teléfono al inicio. */}
        <Phone
          size={18}                            // Tamaño del ícono de teléfono.
          className="text-pcm-muted shrink-0"  // Color tenue y evita que se encoja.
        />

        {/* Prefijo internacional fijo (+57) en un pequeño chip. */}
        <span
          className="px-2 py-1 rounded-lg bg-pcm-surface text-sm font-medium text-pcm-text shrink-0"
        >
          +57
        </span>

        {/* Input para los 10 dígitos del número celular. */}
        <input
          name={name}                          // Nombre del campo (para compatibilidad).
          type="tel"                           // Tipo telefónico.
          value={value}                        // Valor controlado (solo dígitos).
          onChange={manejarCambioLocal}        // Handler local que limpia caracteres.
          onFocus={onFocus}                    // Dispara el estado de focus.
          onBlur={onBlur}                      // Limpia estado de focus.
          maxLength={10}                       // Máximo 10 caracteres.
          placeholder="3001234567"             // Ejemplo de número celular.
          className="flex-1 bg-transparent outline-none text-sm text-pcm-text placeholder-pcm-muted/70"
        />
      </div>

      {/* Chip de ayuda que solo aparece cuando el campo está enfocado. */}
      {isFocused && (
        <div className="mt-1">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                       bg-pcm-surface/90 border border-pcm-primary/40 text-[11px] text-pcm-muted"
          >
            Ingresa solo números, 10 dígitos (ejemplo: 3001234567).
          </span>
        </div>
      )}
    </div>
  );
}; // Cierra el componente CampoTelefono.

// =========================
// Input específico de contraseña
// =========================

// Campo de contraseña con ícono, botón de ver/ocultar y estilo PCM.
const CampoContrasena = ({
  label,        // Etiqueta visible del campo.
  name,         // Nombre del input (para passwordData).
  value,        // Valor actual de la contraseña.
  onChange,     // Handler de cambios (actualiza passwordData).
  placeholder,  // Texto de ejemplo en el campo.
  onFocus,      // Handler cuando se enfoca el input.
  onBlur        // Handler cuando se desenfoca.
}) => {
  // Estado local para controlar si se muestra u oculta el texto de la contraseña.
  const [visible, setVisible] = useState(false);

  // Alterna entre mostrar y ocultar la contraseña.
  const alternarVisible = () => {
    setVisible((previo) => !previo); // Cambia el valor booleano (true ↔ false).
  };

  // Renderiza el campo de contraseña completo.
  return (
    <div className="space-y-1">
      {/* Etiqueta del campo de contraseña. */}
      <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
        {label}
      </label>

      {/* Caja visual de la contraseña, consistente con los demás inputs. */}
      <div
        className="flex items-center gap-2 bg-pcm-surfaceSoft/80 border border-white/10 rounded-xl px-3 h-11
                   focus-within:border-pcm-primary focus-within:shadow-pcm-soft transition-all"
      >
        {/* Ícono de candado a la izquierda. */}
        <Lock
          size={18}                            // Tamaño del ícono de candado.
          className="text-pcm-muted shrink-0"  // Color tenue y evita que se encoja.
        />

        {/* Input controlado de contraseña (o texto si está visible). */}
        <input
          name={name}                          // Nombre del campo (clave en passwordData).
          type={visible ? 'text' : 'password'} // Cambia entre texto y contraseña según estado.
          value={value}                        // Valor controlado desde el estado padre.
          onChange={onChange}                  // Handler de cambio.
          onFocus={onFocus}                    // Marca el campo como enfocado.
          onBlur={onBlur}                      // Desmarca el foco.
          placeholder={placeholder}            // Texto de ayuda.
          className="flex-1 bg-transparent outline-none text-sm text-pcm-text placeholder-pcm-muted/70"
        />

        {/* Botón de ojo para mostrar/ocultar la contraseña. */}
        <button
          type="button"                        // Botón simple, no envía formularios.
          onClick={alternarVisible}            // Alterna visibilidad de la contraseña.
          className="p-1 rounded-full hover:bg-white/5 transition duration-150 text-pcm-muted shrink-0"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} // Etiqueta accesible.
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}  {/* Cambia ícono según estado. */}
        </button>
      </div>
    </div>
  );
}; // Cierra el componente CampoContrasena.

// =========================
// Componente principal VistaPerfil
// =========================

const VistaPerfil = ({ usuarioActual, onPerfilActualizado }) => {
  // Controla qué pestaña está activa: "info" (información personal) o "password" (seguridad).
  const [activeTab, setActiveTab] = useState('info'); // Estado para la pestaña activa.

  // Estado para los datos básicos del usuario.
  const [formData, setFormData] = useState({
    nombre: '',    // Nombre del usuario.
    apellido: '',  // Apellido del usuario.
    email: '',     // Correo electrónico.
    telefono: '',  // Teléfono local (10 dígitos sin +57).
    empresa: '',   // Empresa (solo visual por ahora).
    cargo: ''      // Cargo (solo visual por ahora).
  });

  // Estado para el formulario de cambio de contraseña.
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',  // Contraseña actual.
    newPassword: '',      // Nueva contraseña.
    confirmPassword: ''   // Confirmación de la nueva contraseña.
  });

  // Bandera global de carga (se comparte entre guardar info y cambiar contraseña).
  const [loading, setLoading] = useState(false); // Indica si hay una petición en curso.

  // Texto del mensaje global (éxito o error).
  const [message, setMessage] = useState(null); // Contenido del mensaje global.

  // Tipo del mensaje global: 'success' o 'error'.
  const [messageType, setMessageType] = useState(null); // Tipo de mensaje global.

  // Nombre del campo actualmente enfocado (para mostrar ayudas contextuales).
  const [focusedField, setFocusedField] = useState(null); // Identifica el campo en foco.

  // =========================
  // Cálculos de fuerza y validaciones de contraseña
  // =========================

  // Extrae los valores de la contraseña desde el estado.
  const newPassword = passwordData.newPassword;           // Nueva contraseña.
  const confirmPassword = passwordData.confirmPassword;   // Confirmación de nueva contraseña.
  const currentPassword = passwordData.currentPassword;   // Contraseña actual.

  // Condiciones de complejidad de la nueva contraseña.
  const hasMinLength = newPassword.length >= 8;           // Mínimo 8 caracteres.
  const hasLetter = /[A-Za-z]/.test(newPassword);         // Contiene al menos una letra.
  const hasNumber = /\d/.test(newPassword);               // Contiene al menos un número.
  const hasUpper = /[A-Z]/.test(newPassword);             // Contiene mayúsculas.
  const hasLower = /[a-z]/.test(newPassword);             // Contiene minúsculas.
  const hasExtraLength = newPassword.length >= 12;        // Tiene 12 o más caracteres.
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);    // Contiene al menos un carácter especial.

  // Puntaje de fuerza acumulado.
  let strengthScore = 0;                                  // Inicializa puntaje en 0.

  if (hasMinLength) strengthScore += 1;                   // Suma si cumple longitud mínima.
  if (hasLetter && hasNumber) strengthScore += 1;         // Suma si combina letras y números.
  if (hasUpper && hasLower) strengthScore += 1;           // Suma si tiene mayúsculas y minúsculas.
  if (hasExtraLength) strengthScore += 1;                 // Suma si es más larga (12+).
  if (hasSpecial) strengthScore += 1;                     // Suma si tiene símbolo especial.

  // Etiqueta para mostrar al usuario la fuerza de la contraseña.
  let strengthLabel = 'Débil';                            // Valor por defecto.

  if (!newPassword) {
    strengthLabel = 'Sin contraseña';                     // Si no ha escrito nada.
  } else if (strengthScore <= 1) {
    strengthLabel = 'Débil';                              // Puntaje muy bajo.
  } else if (strengthScore <= 3) {
    strengthLabel = 'Media';                              // Puntaje intermedio.
  } else {
    strengthLabel = 'Fuerte';                             // Puntaje alto.
  }

  // Determina si nueva y confirmación coinciden (cuando ambos campos tienen contenido).
  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;                      // true si ambas coinciden.

  // Determina si la nueva contraseña es igual a la actual.
  const isNewSameAsCurrent =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    currentPassword === newPassword;                      // true si usuario repite misma contraseña.

  // =========================
  // Autocierre del mensaje global
  // =========================

  useEffect(() => {
    // Si no hay mensaje, no configura el timeout.
    if (!message) return;                                 // Sale si no hay mensaje activo.

    // Crea un temporizador para ocultar el mensaje a los 5 segundos.
    const timer = setTimeout(() => {
      setMessage(null);           // Limpia el texto del mensaje.
      setMessageType(null);       // Limpia el tipo del mensaje.
    }, 5000);                     // Espera 5 segundos.

    // Limpia el timeout si el mensaje cambia o se desmonta el componente.
    return () => clearTimeout(timer);                     // Evita fugas de memoria.
  }, [message]);                                          // Se ejecuta cada vez que cambia message.

  // =========================
  // Carga inicial del perfil desde la API
  // =========================

  useEffect(() => {
    // Función interna asíncrona para obtener los datos del usuario.
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');        // Lee el token del almacenamiento local.

      if (!token) return;                                 // Si no hay token, no llama al backend.

      try {
        // Llama al endpoint /user/me para obtener la información del usuario autenticado.
        const response = await fetch(`${API_URL}/user/me`, {
          method: 'GET',                                  // Método GET.
          headers: {
            'Content-Type': 'application/json',           // Encabezado de contenido.
            Authorization: `Bearer ${token}`              // Token JWT en el header.
          }
        });

        if (!response.ok) {                               // Si la respuesta no es OK...
          throw new Error('Error al obtener el perfil del usuario'); // Lanza un error.
        }

        const data = await response.json();               // Parsea la respuesta a JSON.

        // Normaliza el teléfono removiendo todo lo que no sean dígitos.
        const rawPhone = data.phone || '';                // Toma phone o cadena vacía.
        const phoneDigits = rawPhone.replace(/\D/g, '');  // Limpia caracteres no numéricos.
        let localPhone = '';                              // Teléfono local sin prefijo.

        if (phoneDigits.length === 10) {
          localPhone = phoneDigits;                       // Usa tal cual si son 10 dígitos.
        } else if (phoneDigits.length > 10) {
          localPhone = phoneDigits.slice(-10);            // Toma los últimos 10 si tiene más.
        }

        // Carga los datos en el formulario de info básica.
        setFormData({
          nombre: data.firstName || '',                   // Nombre del usuario.
          apellido: data.lastName || '',                  // Apellido del usuario.
          email: data.email || '',                        // Correo electrónico.
          telefono: localPhone,                           // Teléfono local normalizado.
          empresa: data.company || '',                    // Empresa (si existe).
          cargo: data.position || ''                      // Cargo/posición (si existe).
        });
      } catch (error) {
        setMessageType('error');                          // Marca el mensaje como error.
        setMessage(
          error.message || 'No se pudo cargar la información del perfil' // Mensaje de error.
        );
      }
    };

    fetchUserProfile();                                   // Ejecuta la carga al montar.
  }, []);                                                 // Dependencias vacías → solo al montar.

  // =========================
  // Handlers comunes de cambio en inputs
  // =========================

  // Función genérica para gestionar cambios en inputs de info básica o contraseñas.
  const manejarCambio = (e, esPassword = false) => {
    const { name, value } = e.target;                    // Extrae nombre y valor del input.

    if (esPassword) {
      // Si el cambio es de un campo de contraseña, actualiza passwordData.
      setPasswordData((previo) => ({
        ...previo,                                       // Mantiene otros campos de passwordData.
        [name]: value                                    // Actualiza solo el campo correspondiente.
      }));
    } else {
      // En caso contrario, actualiza formData (info básica).
      setFormData((previo) => ({
        ...previo,                                       // Mantiene otros campos de formData.
        [name]: value                                    // Actualiza el campo correspondiente.
      }));
    }
  };

  // =========================
  // Guardar información básica (nombre, correo, teléfono, empresa, cargo)
  // =========================

  const manejarEnvioInfo = async () => {
    const nombreTrim = formData.nombre.trim();           // Recorta espacios del nombre.
    const apellidoTrim = formData.apellido.trim();       // Recorta espacios del apellido.
    const emailTrim = formData.email.trim();             // Recorta espacios del correo.
    const telefonoTrim = formData.telefono.trim();       // Recorta espacios del teléfono.
    const empresaTrim = formData.empresa.trim();         // Recorta espacios de la empresa.
    const cargoTrim = formData.cargo.trim();             // Recorta espacios del cargo.

    // Validación de campos obligatorios.
    if (!nombreTrim || !apellidoTrim || !emailTrim) {
      setMessageType('error');                           // Marca como error.
      setMessage('Por favor completa nombre, apellido y correo electrónico.'); // Mensaje de error.
      return;                                            // Detiene el flujo.
    }

    // Validación básica de formato de correo.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;     // Expresión simple de correo.
    if (!emailRegex.test(emailTrim)) {
      setMessageType('error');                           // Marca como error.
      setMessage(
        'El correo electrónico no tiene un formato válido (ejemplo: usuario@dominio.com).' // Mensaje de error.
      );
      return;                                            // Detiene el flujo.
    }

    // Validación de teléfono si se diligenció.
    if (telefonoTrim && !CO_PHONE_REGEX.test(telefonoTrim)) {
      setMessageType('error');                           // Marca como error.
      setMessage('El teléfono debe tener exactamente 10 dígitos numéricos (ejemplo: 3001234567).'); // Mensaje.
      return;                                            // Detiene el flujo.
    }

    // Prepara el teléfono en formato internacional con +57.
    const phoneToSend = telefonoTrim ? `+57${telefonoTrim}` : ''; // Arma el teléfono con prefijo.

    setLoading(true);                                    // Activa bandera de carga.
    setMessage(null);                                    // Limpia mensajes previos.
    setMessageType(null);                                // Limpia el tipo de mensaje.

    const token = localStorage.getItem('token');         // Lee el token desde localStorage.

    if (!token) {                                        // Si no hay token...
      setMessageType('error');                           // Marca error.
      setMessage('No autenticado');                      // Indica que no hay sesión.
      setLoading(false);                                 // Quita la bandera de carga.
      return;                                            // Detiene el flujo.
    }

    try {
      // Llama al endpoint de actualización de perfil.
      const response = await fetch(`${API_URL}/user/me`, {
        method: 'PUT',                                   // Método PUT para actualizar.
        headers: {
          'Content-Type': 'application/json',            // Envío JSON.
          Authorization: `Bearer ${token}`               // Token JWT.
        },
        body: JSON.stringify({
          firstName: nombreTrim,                         // Nuevo nombre.
          lastName: apellidoTrim,                        // Nuevo apellido.
          email: emailTrim,                              // Nuevo correo.
          phone: phoneToSend,                            // Nuevo teléfono con +57.
          company: empresaTrim || undefined,             // Nueva empresa (si se diligencia).
          position: cargoTrim || undefined               // Nuevo cargo (si se diligencia).
        })
      });

      if (!response.ok) {                               // Si la respuesta no es OK...
        const errorData = await response.json().catch(() => null); // Intenta parsear error.
        throw new Error(
          (errorData && errorData.message) || 'Error al actualizar la información' // Mensaje de error.
        );
      }

      const updatedUserResponse = await response.json(); // Parsea la respuesta.
      const updatedUser = updatedUserResponse.user || updatedUserResponse; // Toma user si viene envuelto.

      // Normaliza nuevamente el teléfono retornado.
      const updatedRawPhone = updatedUser.phone || phoneToSend || ''; // Teléfono devuelto o enviado.
      const updatedDigits = updatedRawPhone.replace(/\D/g, '');       // Solo dígitos.
      let updatedLocalPhone = telefonoTrim;                           // Teléfono local por defecto.

      if (updatedDigits.length === 10) {
        updatedLocalPhone = updatedDigits;                            // Usa tal cual si son 10 dígitos.
      } else if (updatedDigits.length > 10) {
        updatedLocalPhone = updatedDigits.slice(-10);                 // Usa últimos 10 si tiene más.
      }

      setMessageType('success');                                      // Marca mensaje de éxito.
      setMessage('Información actualizada correctamente');            // Mensaje de éxito.

      // Actualiza el formulario con los datos más recientes.
      setFormData((previo) => ({
        ...previo,                                                   // Mantiene otros campos.
        nombre: updatedUser.firstName || nombreTrim,                 // Actualiza nombre.
        apellido: updatedUser.lastName || apellidoTrim,              // Actualiza apellido.
        email: updatedUser.email || emailTrim,                       // Actualiza correo.
        telefono: updatedLocalPhone,                                 // Actualiza teléfono local.
        empresa: updatedUser.company || empresaTrim,                 // Actualiza empresa.
        cargo: updatedUser.position || cargoTrim                     // Actualiza cargo.
      }));

      // Sincroniza también el objeto de usuario en localStorage para 'user' y 'pcm_usuario'.
      try {
        const storedRaw =
          localStorage.getItem('user') ||                            // Lee usuario bajo 'user'.
          localStorage.getItem('pcm_usuario');                        // O bajo 'pcm_usuario' si existe.
        const storedUser = storedRaw ? JSON.parse(storedRaw) : {};   // Parsea o usa objeto vacío.

        const mergedUser = {
          ...storedUser,                                            // Mezcla datos anteriores.
          ...updatedUser,                                           // Mezcla lo retornado por el backend.
          firstName: updatedUser.firstName || nombreTrim,           // Nuevo nombre.
          lastName: updatedUser.lastName || apellidoTrim,           // Nuevo apellido.
          email: updatedUser.email || emailTrim,                    // Nuevo correo.
          phone: updatedUser.phone || phoneToSend,                  // Nuevo teléfono completo.
          company: updatedUser.company || empresaTrim,              // Nueva empresa.
          position: updatedUser.position || cargoTrim               // Nuevo cargo.
        };

        localStorage.setItem('user', JSON.stringify(mergedUser));   // Guarda el usuario actualizado (clave legacy).
        localStorage.setItem('pcm_usuario', JSON.stringify(mergedUser)); // Guarda también bajo la clave estándar PCM.
      } catch (storageError) {
        console.error('Error al sincronizar el usuario en localStorage:', storageError); // Log de error silencioso.
      }

      // Notifica al TableroTrabajo (si mandó callback) para que:
      //  - actualice la lista de usuarios,
      //  - actualice usuarioActual/rolUsuario,
      //  - y recargue desde API si es necesario.
      if (typeof onPerfilActualizado === 'function') {
        try {
          const usuarioParaSincronizar = {
            ...(usuarioActual || {}),                  // Mezcla datos previos del usuario en sesión.
            ...updatedUser                              // Aplica datos frescos que devuelve el backend.
          };
          onPerfilActualizado(usuarioParaSincronizar);  // Dispara la sincronización global.
        } catch (callbackError) {
          console.error('Error notificando actualización de perfil al TableroTrabajo:', callbackError);
        }
      }
    } catch (error) {
      setMessageType('error');                                      // Marca mensaje de error.
      setMessage(error.message);                                    // Muestra mensaje de error.
    } finally {
      setLoading(false);                                            // Quita la bandera de carga.
    }
  };

  // =========================
  // Guardar nueva contraseña
  // =========================

  const manejarEnvioContrasena = async () => {
    // Verifica que todos los campos de contraseña estén llenos.
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setMessageType('error');                                      // Marca error.
      setMessage('Por favor completa todos los campos de contraseña.'); // Mensaje de error.
      return;                                                       // Detiene el flujo.
    }

    // Evita repetir la misma contraseña actual.
    if (isNewSameAsCurrent) {
      setMessageType('error');                                      // Marca error.
      setMessage('La nueva contraseña no puede ser igual a la contraseña actual.'); // Mensaje.
      return;                                                       // Detiene el flujo.
    }

    // Verifica requisitos mínimos (8 caracteres, letras, números y especial).
    if (!hasMinLength || !hasLetter || !hasNumber || !hasSpecial) {
      setMessageType('error');                                      // Marca error.
      setMessage(
        'La nueva contraseña debe tener al menos 8 caracteres e incluir letras, números y al menos un carácter especial.' // Mensaje.
      );
      return;                                                       // Detiene el flujo.
    }

    // Verifica coincidencia de nueva y confirmación.
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessageType('error');                                      // Marca error.
      setMessage('Las contraseñas nuevas no coinciden');            // Mensaje.
      return;                                                       // Detiene el flujo.
    }

    setLoading(true);                                               // Activa bandera de carga.
    setMessage(null);                                               // Limpia mensaje previo.
    setMessageType(null);                                           // Limpia tipo previo.

    const token = localStorage.getItem('token');                    // Lee token del localStorage.

    if (!token) {                                                   // Si no hay token...
      setMessageType('error');                                      // Marca error.
      setMessage('No autenticado');                                 // Mensaje.
      setLoading(false);                                            // Quita bandera de carga.
      return;                                                       // Detiene el flujo.
    }

    try {
      // Llama al endpoint de cambio de contraseña.
      const response = await fetch(`${API_URL}/user/me/password`, {
        method: 'PUT',                                              // Método PUT.
        headers: {
          'Content-Type': 'application/json',                       // Envío JSON.
          Authorization: `Bearer ${token}`                          // Token en header.
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,            // Contraseña actual.
          newPassword: passwordData.newPassword                     // Nueva contraseña.
        })
      });

      if (!response.ok) {                                           // Si no es OK...
        const errorData = await response.json().catch(() => null);  // Intenta parsear error.
        throw new Error(
          (errorData && errorData.message) || 'Error al cambiar la contraseña' // Mensaje.
        );
      }

      setMessageType('success');                                    // Marca éxito.
      setMessage('Contraseña cambiado correctamente');              // Mensaje de éxito.

      // Limpia los campos de contraseña después de actualizar.
      setPasswordData({
        currentPassword: '',                                        // Limpia actual.
        newPassword: '',                                            // Limpia nueva.
        confirmPassword: ''                                         // Limpia confirmación.
      });
    } catch (error) {
      setMessageType('error');                                      // Marca error.
      setMessage(error.message);                                    // Mensaje de error.
    } finally {
      setLoading(false);                                            // Quita bandera de carga.
    }
  };

  // -------------------------------------------------------------------
  // Detección del rol del usuario actual para aplicar colores por rol
  // -------------------------------------------------------------------

  let rolUsuarioActual = 'admin';                                   // Rol por defecto (admin) para el diseño del panel.

  try {
    let usuarioLocal = null;                                        // Variable para almacenar el usuario base.

    if (usuarioActual && typeof usuarioActual === 'object') {
      usuarioLocal = usuarioActual;                                 // Usa directamente el usuario recibido por props.
    } else {
      const rawUser =
        localStorage.getItem('user') ||                             // Intenta leer el usuario guardado bajo 'user'.
        localStorage.getItem('pcm_usuario') ||                      // O bajo 'pcm_usuario' si existe.
        '{}';                                                       // Si no hay nada, usa objeto vacío.

      usuarioLocal = JSON.parse(rawUser);                           // Parsea el JSON almacenado.
    }

    if (usuarioLocal && typeof usuarioLocal.role === 'string') {    // Si tiene propiedad role en inglés...
      rolUsuarioActual = usuarioLocal.role;                         // Usa ese valor como rol.
    } else if (usuarioLocal && typeof usuarioLocal.rol === 'string') { // Si tiene propiedad rol en español...
      rolUsuarioActual = usuarioLocal.rol;                          // Usa ese valor como rol.
    }
  } catch (error) {
    rolUsuarioActual = 'admin';                                     // Si algo falla, conserva admin como valor seguro.
  }

  const clasesPanelRol = obtenerClasesRolPanel(rolUsuarioActual);   // Obtiene las clases de panel según el rol.
  const clasesAvatarRol = obtenerClasesAvatarRol(rolUsuarioActual); // Obtiene las clases de “glow” para el avatar según el rol.
  const clasesSegmentoTabsRol = obtenerClasesSegmentoTabsRol(rolUsuarioActual); // Color del pill de pestañas según el rol.
  const clasesTabActivaRol = obtenerClasesTabActivaRol(rolUsuarioActual);       // Brillo de pestaña activa según el rol.
  const clasesBotonPrimarioRol = obtenerClasesBotonPrimarioRol(rolUsuarioActual); // Contorno de botones primarios según el rol.

  // =========================
  // Render principal
  // =========================

  return (
    // Contenedor principal de la vista de perfil, con altura mínima de pantalla y espaciado vertical.
    <div className="min-h-screen flex flex-col gap-6">
      {/* Tarjeta principal con efecto glassmorphism y bordes PCM, adaptada al rol mediante pcm-panel-fondo y pcm-panel--ROL. */}
      <div
        className={`pcm-panel-fondo ${clasesPanelRol} border border-white/10 rounded-pcm-xl shadow-pcm-soft
                   backdrop-blur-md overflow-hidden`}
      >
        {/* Encabezado de la tarjeta (avatar + textos + selector de pestañas) adaptado al color del rol. */}
        <div className="pcm-panel-header border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          {/* Bloque de avatar + descripción de la sección. */}
          <div className="flex items-center gap-3">
            {/* Avatar circular con color y glow PCM según el rol. */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-pcm-bg shadow-pcm-soft ${clasesAvatarRol}`}
            >
              <User size={20} />  {/* Ícono de usuario dentro del avatar. */}
            </div>

            {/* Textos descriptivos de la sección. */}
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-semibold text-pcm-text">
                Configuración de cuenta
              </span>
              <span className="text-xs text-pcm-muted">
                Administra tu información personal y la seguridad de acceso.
              </span>
            </div>
          </div>

          {/* Selector de pestañas mejorado (información vs seguridad) sin cambiar el tamaño general. */}
          <div
            className="relative inline-flex items-center text-xs md:text-sm bg-pcm-surfaceSoft/60 rounded-full p-1.5
                       border border-white/10 shadow-pcm-inner overflow-hidden"
            role="tablist"
            aria-label="Secciones de configuración de cuenta"
          >
            {/* Fondo deslizante que se mueve bajo la pestaña activa (segment control) y toma el color del rol. */}
            <div
              className={`absolute inset-y-1 w-1/2 rounded-full 
                          ${clasesSegmentoTabsRol}
                          transition-pcm-tab duration-pcm-normal ease-pcm-soft shadow-pcm-tab-glow
                          ${activeTab === 'info' ? 'left-1' : 'left-1/2'}`}
            />

            {/* Pestaña: Información personal. */}
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              aria-selected={activeTab === 'info'}
              role="tab"
              aria-label="Mostrar información personal"
              className={`relative z-10 flex-1 px-3 md:px-4 py-1.5 rounded-full
                          flex items-center justify-center gap-1.5 md:gap-2
                          transition-pcm-tab duration-pcm-normal ease-pcm-soft
                          focus:outline-none focus-visible:outline-none
                          ${
                            activeTab === 'info'
                              ? `font-semibold ${clasesTabActivaRol}`
                              : 'text-pcm-muted opacity-80 hover:opacity-100 hover:text-pcm-text'
                          }`}
            >
              {/* Ícono de usuario con leve animación cuando la pestaña está activa. */}
              <User
                size={14}
                className={`shrink-0 ${
                  activeTab === 'info' ? 'animate-pulse-soft' : ''
                }`}
              />
              {/* Texto de la pestaña. */}
              <span className="whitespace-nowrap">
                Información personal
              </span>
            </button>

            {/* Pestaña: Seguridad y contraseña. */}
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              aria-selected={activeTab === 'password'}
              role="tab"
              aria-label="Mostrar seguridad y contraseña"
              className={`relative z-10 flex-1 px-3 md:px-4 py-1.5 rounded-full
                          flex items-center justify-center gap-1.5 md:gap-2
                          transition-pcm-tab duration-pcm-normal ease-pcm-soft
                          focus:outline-none focus-visible:outline-none
                          ${
                            activeTab === 'password'
                              ? `font-semibold ${clasesTabActivaRol}`
                              : 'text-pcm-muted opacity-80 hover:opacity-100 hover:text-pcm-text'
                          }`}
            >
              {/* Ícono de candado con leve animación cuando la pestaña está activa. */}
              <Lock
                size={14}
                className={`shrink-0 ${
                  activeTab === 'password' ? 'animate-pulse-soft' : ''
                }`}
              />
              {/* Texto de la pestaña. */}
              <span className="whitespace-nowrap">
                Seguridad y contraseña
              </span>
            </button>
          </div>
        </div>

        {/* Contenido de la tarjeta (mensaje global + panel de la pestaña activa). */}
        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
          {/* Mensaje global de feedback (éxito/error) con botón de cierre. */}
          {message && (
            <div
              className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 text-xs md:text-sm
                          ${
                            messageType === 'error'
                              ? 'border-red-500/40 bg-red-500/10 text-red-100'
                              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                          }`}
            >
              {/* Ícono circular a la izquierda (¡ o ✓). */}
              <div className="mt-0.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">
                  {messageType === 'error' ? '!' : '✓'}
                </span>
              </div>

              {/* Texto del mensaje. */}
              <p className="flex-1">
                {message}
              </p>

              {/* Botón para cerrar el mensaje manualmente. */}
              <button
                type="button"
                onClick={() => {
                  setMessage(null);          // Limpia el texto del mensaje.
                  setMessageType(null);      // Limpia el tipo del mensaje.
                }}
                className="ml-2 rounded-full p-1 hover:bg-white/10 transition duration-150"
                aria-label="Cerrar mensaje"
              >
                <X size={14} />              {/* Ícono de cierre. */}
              </button>
            </div>
          )}

          {/* Pestaña: Información personal */}
          {activeTab === 'info' && (
            <div className="space-y-4 md:space-y-5 animate-fade-in-soft">
              {/* Fila 1: Nombre + Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <CampoEntrada
                  icon={User}                                  // Ícono de usuario.
                  label="Nombre"                               // Etiqueta del campo.
                  name="nombre"                                // Nombre en formData.
                  value={formData.nombre}                      // Valor actual.
                  onChange={manejarCambio}                     // Handler genérico.
                  placeholder="Nombre del usuario"             // Placeholder.
                  required                                     // Campo obligatorio.
                />
                <CampoTelefono
                  label="Teléfono (opcional)"                  // Etiqueta del teléfono.
                  name="telefono"                              // Nombre del campo.
                  value={formData.telefono}                    // Valor de 10 dígitos.
                  onChangeDigits={(digits) =>
                    setFormData((previo) => ({
                      ...previo,
                      telefono: digits                         // Actualiza solo teléfono.
                    }))
                  }
                  isFocused={focusedField === 'telefono'}      // Control de ayuda contextual.
                  onFocus={() => setFocusedField('telefono')}  // Marca foco.
                  onBlur={() => setFocusedField(null)}         // Desmarca foco.
                />
              </div>

              {/* Fila 2: Apellido + Empresa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <CampoEntrada
                  icon={User}                                  // Ícono de usuario.
                  label="Apellido"                             // Etiqueta del campo.
                  name="apellido"                              // Nombre en formData.
                  value={formData.apellido}                    // Valor actual.
                  onChange={manejarCambio}                     // Handler genérico.
                  placeholder="Apellidos del usuario"          // Placeholder.
                  required                                     // Campo obligatorio.
                />
                <CampoEntrada
                  icon={Building2}                             // Ícono de empresa.
                  label="Empresa (opcional)"                   // Etiqueta descriptiva.
                  name="empresa"                               // Nombre en formData.
                  value={formData.empresa}                     // Valor actual.
                  onChange={manejarCambio}                     // Handler genérico.
                  placeholder="Nombre de la empresa"           // Placeholder.
                />
              </div>

              {/* Fila 3: Correo + Cargo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <CampoEntrada
                  icon={Mail}                                  // Ícono de correo.
                  label="Correo electrónico"                   // Etiqueta del campo.
                  name="email"                                 // Clave en formData.
                  type="email"                                 // Tipo email.
                  value={formData.email}                       // Valor actual.
                  onChange={manejarCambio}                     // Handler genérico.
                  placeholder="usuario@ejemplo.com"            // Placeholder.
                  required                                     // Campo obligatorio.
                />
                <CampoEntrada
                  icon={Briefcase}                             // Ícono de cargo.
                  label="Cargo (opcional)"                     // Etiqueta.
                  name="cargo"                                 // Nombre en formData.
                  value={formData.cargo}                       // Valor actual.
                  onChange={manejarCambio}                     // Handler genérico.
                  placeholder="Cargo o rol en la empresa"      // Placeholder.
                />
              </div>

              {/* Botón de guardar información básica con brillo PCM y acento por rol. */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"                                // Botón normal.
                  onClick={manejarEnvioInfo}                   // Envía cambios de info básica.
                  disabled={loading}                           // Deshabilita mientras hay petición.
                  className={`pcm-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold
                             transition duration-200 hover:shadow-pcm-tab-glow hover:scale-105 active:scale-95
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pcm-primary/70
                             focus-visible:ring-offset-2 focus-visible:ring-offset-pcm-bg
                             disabled:opacity-60 disabled:cursor-not-allowed
                             ${clasesBotonPrimarioRol}`}       // Añade anillo acorde al rol.
                >
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {/* Pestaña: Seguridad y contraseña */}
          {activeTab === 'password' && (
            <div className="max-w-xl space-y-4 md:space-y-5 animate-fade-in-soft">
              {/* Contraseña actual */}
              <CampoContrasena
                label="Contraseña actual"                      // Etiqueta del campo.
                name="currentPassword"                         // Nombre en passwordData.
                value={passwordData.currentPassword}           // Valor actual.
                onChange={(e) => manejarCambio(e, true)}       // Handler en modo password.
                onFocus={() => setFocusedField('currentPassword')} // Marca foco.
                onBlur={() => setFocusedField(null)}           // Desmarca foco.
                placeholder="Introduce tu contraseña actual"   // Placeholder.
              />

              {/* Nueva contraseña + indicador de fuerza estilizado */}
              <div className="space-y-1">
                <CampoContrasena
                  label="Nueva contraseña"                     // Etiqueta del campo.
                  name="newPassword"                           // Nombre en passwordData.
                  value={passwordData.newPassword}             // Valor actual.
                  onChange={(e) => manejarCambio(e, true)}     // Handler de contraseña.
                  onFocus={() => setFocusedField('newPassword')} // Marca foco.
                  onBlur={() => setFocusedField(null)}         // Desmarca foco.
                  placeholder="Mínimo 8 caracteres, con letras, números y un carácter especial"
                />

                {/* Panel elegante de fuerza de contraseña (solo cuando está escribiendo la nueva) */}
                {newPassword && focusedField === 'newPassword' && (
                  <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-pcm-surface/90 px-3 py-3 shadow-pcm-soft">
                    {/* Encabezado del panel: título + etiqueta de nivel */}
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      {/* Lado izquierdo con ícono y texto */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`
                            inline-flex h-4 w-4 items-center justify-center rounded-full
                            ${
                              strengthLabel === 'Débil'
                                ? 'bg-red-500/80 text-red-50'
                                : strengthLabel === 'Media'
                                ? 'bg-amber-400/80 text-amber-50'
                                : 'bg-emerald-500/80 text-emerald-50'
                            }
                          `}
                        >
                          <Lock size={10} /> {/* Ícono pequeño de candado dentro del punto. */}
                        </span>
                        <span className="font-semibold text-pcm-text">
                          Seguridad de la contraseña
                        </span>
                      </div>

                      {/* Etiqueta de nivel (Débil / Media / Fuerte) con color acorde */}
                      <span
                        className={
                          strengthLabel === 'Débil'
                            ? 'text-red-400 font-semibold'
                            : strengthLabel === 'Media'
                            ? 'text-amber-400 font-semibold'
                            : strengthLabel === 'Fuerte'
                            ? 'text-emerald-400 font-semibold'
                            : 'text-pcm-muted font-semibold'
                        }
                      >
                        {strengthLabel}
                      </span>
                    </div>

                    {/* Barra de progreso de fuerza. */}
                    <div className="h-1.5 w-full bg-pcm-surfaceSoft rounded-full overflow-hidden">
                      <div
                        className={`
                          h-full transition-all
                          ${
                            strengthLabel === 'Débil'
                              ? 'w-1/3 bg-red-500'
                              : strengthLabel === 'Media'
                              ? 'w-2/3 bg-amber-400'
                              : 'w-full bg-emerald-500'
                          }
                        `}
                      />
                    </div>

                    {/* Lista de criterios con color según cumplimiento. */}
                    <ul className="text-[11px] space-y-0.5 text-pcm-muted">
                      <li className={hasMinLength ? 'text-emerald-300' : ''}>
                        • Mínimo 8 caracteres
                      </li>
                      <li className={hasLetter && hasNumber ? 'text-emerald-300' : ''}>
                        • Debe incluir letras y números
                      </li>
                      <li className={hasSpecial ? 'text-emerald-300' : ''}>
                        • Debe incluir al menos un carácter especial (ej: !, #, ?, %)
                      </li>
                      <li className={hasUpper && hasLower ? 'text-emerald-300' : ''}>
                        • Recomendado: combinar mayúsculas y minúsculas
                      </li>
                      <li className={hasExtraLength ? 'text-emerald-300' : ''}>
                        • Recomendado: 12 caracteres o más
                      </li>
                    </ul>

                    {/* Chip específico si intenta usar la misma contraseña actual */}
                    {isNewSameAsCurrent && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-400/40 px-2 py-0.5 text-[11px] text-red-300">
                        <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-red-500/70 text-[9px]">
                          !
                        </span>
                        <span>La nueva contraseña no puede ser igual a la actual.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmar nueva contraseña + mensaje de coincidencia. */}
              <div className="space-y-1">
                <CampoContrasena
                  label="Confirmar nueva contraseña"           // Etiqueta del campo.
                  name="confirmPassword"                       // Nombre en passwordData.
                  value={passwordData.confirmPassword}         // Valor actual.
                  onChange={(e) => manejarCambio(e, true)}     // Handler de contraseña.
                  onFocus={() => setFocusedField('confirmPassword')} // Marca foco.
                  onBlur={() => setFocusedField(null)}         // Desmarca foco.
                  placeholder="Repite la nueva contraseña"     // Placeholder.
                />

                {/* Chip de estado de coincidencia, visible mientras el campo de confirmación tiene contenido y foco. */}
                {confirmPassword.length > 0 && focusedField === 'confirmPassword' && (
                  <div className="mt-1">
                    <span
                      className={
                        passwordsMatch
                          ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-400/40'
                          : 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-red-500/10 text-red-300 border border-red-400/40'
                      }
                    >
                      {passwordsMatch
                        ? 'Las contraseñas coinciden.'
                        : 'Las contraseñas no coinciden.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón de cambiar contraseña con brillo PCM y acento por rol. */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"                                // Botón normal.
                  onClick={manejarEnvioContrasena}             // Envía cambio de contraseña.
                  disabled={loading}                           // Deshabilita en carga.
                  className={`pcm-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold
                             transition duration-200 hover:shadow-pcm-tab-glow hover:scale-105 active:scale-95
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pcm-primary/70
                             focus-visible:ring-offset-2 focus-visible:ring-offset-pcm-bg
                             disabled:opacity-60 disabled:cursor-not-allowed
                             ${clasesBotonPrimarioRol}`}       // Añade anillo acorde al rol.
                >
                  {loading ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; // Cierra el componente principal VistaPerfil.

// Exporta el componente para usarlo en el layout del Admin/Workspace.
export default VistaPerfil; // Exportación por defecto del componente VistaPerfil.
