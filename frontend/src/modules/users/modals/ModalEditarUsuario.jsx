// File: frontend/src/modules/users/modals/ModalEditarUsuario.jsx
// Description: Modal autónomo para editar usuarios desde el panel de administración
//              de ProCivil Manager (PCM). Implementa su propio overlay + tarjeta
//              (sin usar el ModalGenerico), permite modificar nombre, apellido,
//              correo, teléfono (normalizado a 10 dígitos locales colombianos con
//              prefijo +57) y el rol del sistema. Usa el servicio actualizarUsuario
//              para persistir cambios en el backend e integra helpers visuales PCM
//              (pcm-overlay-suave, pcm-scroll-y, pcm-select-*, pcm-borde-animado)
//              adaptando sutilmente el color del avatar según el rol del usuario
//              que opera el panel (admin, líder de obra, cliente, auditor).

// =========================
// Importaciones principales
// =========================
import React, {                                              // Importa React para poder usar JSX y hooks.
  useState,                                                  // Hook para manejar estados locales del componente.
  useEffect,                                                 // Hook para manejar efectos secundarios (normalizaciones, listeners).
} from 'react';
import {                                                     // Importa íconos desde lucide-react para mejorar la interfaz del modal.
  User as UserIcon,                                          // Ícono de usuario para el encabezado del modal.
  Loader2,                                                   // Ícono de spinner para indicar estado de guardado.
} from 'lucide-react';

// =========================
// Importación de servicios
// =========================
import { actualizarUsuario } from '../../../services/api/api.js'; // Servicio para actualizar usuarios en la API de backend.

// =========================
// Helpers de normalización y validación
// =========================

/**
 * Normaliza un teléfono cualquiera a solo los 10 dígitos locales colombianos.
 * - Elimina todo lo que no sean números.
 * - Si viene como 57XXXXXXXXXX (con indicativo), conserva los últimos 10 dígitos.
 * - Si viene con más de 10 dígitos, también conserva los últimos 10.
 * - Si tiene 10 o menos, devuelve hasta 10 dígitos.
 */
const normalizeToLocalPhone = (rawPhone) => {                // Declara la función que normaliza el teléfono recibido.
  const onlyDigits = (rawPhone || '')                        // Asegura que haya string aunque venga null/undefined.
    .toString()                                              // Convierte el valor a cadena para poder manipularlo.
    .replace(/\D/g, '');                                     // Elimina todo lo que no sean dígitos del 0 al 9.

  if (onlyDigits.length > 10 && onlyDigits.startsWith('57')) { // Si hay más de 10 dígitos y comienza por 57 (indicativo Colombia).
    return onlyDigits.slice(-10);                            // Retorna solo los últimos 10 (parte local sin el 57).
  }

  if (onlyDigits.length > 10) {                              // Si tiene más de 10 dígitos y no empieza en 57.
    return onlyDigits.slice(-10);                            // También recorta a los últimos 10 dígitos.
  }

  return onlyDigits.slice(0, 10);                            // Si tiene 10 o menos, recorta a máximo 10 dígitos.
};

/**
 * Valida un correo electrónico básico:
 * - Debe tener algo antes y después de '@' y un punto en el dominio.
 */
const isValidEmail = (email) => {                            // Declara la función de validación de correo.
  if (!email) return false;                                  // Si no se envió correo, retorna inválido.
  const trimmed = email.trim();                              // Elimina espacios al inicio y al final.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);         // Usa una expresión regular sencilla para validar formato general.
};

/**
 * Devuelve la clase de color de borde del avatar según el rol del usuario operador.
 * Esto permite que el modal siga el esquema de colores por rol:
 * - Admin: azul (pcm.primary)
 * - Líder de obra: naranja (pcm.secondary)
 * - Cliente: verde (pcm.accent)
 * - Auditor: morado
 */
const obtenerClaseBordeAvatarRol = (rolUsuario) => {         // Declara la función que mapea el rol a una clase de borde.
  const rol = (rolUsuario || '')                             // Toma el rol recibido (puede venir null/undefined).
    .toString()                                              // Lo convierte a string por seguridad.
    .toLowerCase()                                           // Lo pasa a minúsculas para comparar sin sensibilidad.
    .trim();                                                 // Elimina espacios adicionales.

  if (rol.includes('admin')) {                               // Si el rol contiene "admin".
    return 'border-pcm-primary';                             // Usa borde azul PCM (administrador).
  }

  if (
    rol.includes('lider de obra') ||                         // Si contiene "lider de obra" sin tilde.
    rol.includes('líder de obra') ||                         // O "líder de obra" con tilde.
    rol.includes('lider')                                    // O simplemente "lider".
  ) {
    return 'border-pcm-secondary';                           // Usa borde naranja PCM (líder de obra).
  }

  if (rol.includes('cliente')) {                             // Si el rol contiene "cliente".
    return 'border-pcm-accent';                              // Usa borde turquesa/verde PCM (cliente).
  }

  if (rol.includes('auditor')) {                             // Si el rol contiene "auditor".
    return 'border-purple-500';                              // Usa borde morado estándar para auditor.
  }

  return 'border-pcm-primary';                               // Por defecto, retorna borde azul PCM.
};

/**
 * Opciones disponibles para el rol en el sistema.
 * Se usan para poblar el dropdown PCM personalizado.
 */
const OPCIONES_ROL = [                                       // Arreglo constante con las opciones posibles de rol.
  {
    valor: 'admin',                                          // Valor interno que se guarda en el backend.
    titulo: 'Administrador',                                 // Texto descriptivo visible en el dropdown.
    resumen: 'Control total del sistema y configuración.',   // Descripción corta bajo el título.
    chipCorto: 'Admin',                                      // Texto corto que aparece en el chip de estado.
  },
  {
    valor: 'lider de obra',                                  // Valor para los líderes de obra.
    titulo: 'Líder de obra',                                 // Texto visible para el usuario.
    resumen: 'Gestión operativa de proyectos y obras.',      // Explica su alcance en PCM.
    chipCorto: 'Líder',                                      // Texto corto para el chip.
  },
  {
    valor: 'cliente',                                        // Valor para clientes/copropiedades.
    titulo: 'Cliente',                                       // Texto visible para el usuario.
    resumen: 'Consulta de proyectos, avances y solicitudes.',// Describe las capacidades del cliente.
    chipCorto: 'Cliente',                                    // Texto corto para el chip.
  },
  {
    valor: 'auditor',                                        // Valor para perfiles de auditoría/SGI.
    titulo: 'Auditor',                                       // Texto visible en el dropdown.
    resumen: 'Revisión de cumplimiento y trazabilidad.',     // Describe su rol en el sistema.
    chipCorto: 'Auditor',                                    // Texto corto del chip.
  },
];

// =========================
// Componente principal: ModalEditarUsuario
// =========================

/**
 * Componente ModalEditarUsuario
 *
 * Props:
 *  - selectedUser:    ID del usuario seleccionado (string). Si es null, el modal no se muestra.
 *  - editUserForm:    Objeto con los datos del formulario (firstName, lastName, email, phone, role).
 *  - setEditUserForm: Función para actualizar el estado del formulario (la maneja el Dashboard padre).
 *  - onClose:         Callback para cerrar el modal (limpia selección en el padre).
 *  - onSave:          Callback que recibe el usuario actualizado cuando la operación es exitosa.
 *  - rolUsuario:      Rol del usuario que está usando el panel (admin / líder de obra / cliente / auditor),
 *                     para adaptar sutilmente el color del avatar y detalles visuales.
 */
const ModalEditarUsuario = ({                                // Declara el componente funcional principal.
  selectedUser,                                              // ID del usuario que se está editando (string).
  editUserForm,                                              // Datos actuales del formulario de edición.
  setEditUserForm,                                           // Setter para actualizar el formulario en el componente padre.
  onClose,                                                   // Función para cerrar el modal (la pasa el padre).
  onSave,                                                    // Función para notificar guardado exitoso al padre.
  rolUsuario = 'admin',                                      // Rol del usuario que opera el panel (por defecto admin).
}) => {
  // Si no hay usuario seleccionado, no se debe mostrar el modal.
  if (!selectedUser) return null;                            // Evita montar el modal cuando no se está editando a nadie.

  // =========================
  // Estados locales del componente
  // =========================

  const [isSaving, setIsSaving] = useState(false);           // Indica si se está enviando la solicitud de guardado al backend.
  const [errorMessage, setErrorMessage] = useState('');      // Mensaje de error visible dentro del modal en caso de fallo.
  const [isPhoneFocused, setIsPhoneFocused] = useState(false); // Indica si el input de teléfono tiene foco.
  const [estaAbiertoDropdownRol, setEstaAbiertoDropdownRol] =
    useState(false);                                         // Indica si el dropdown PCM de rol está abierto.

  // =========================
  // Efectos
  // =========================

  // Al abrir el modal (o cambiar de usuario), normaliza el teléfono del formulario.
  useEffect(() => {                                          // Declara un efecto que se ejecuta cuando cambian dependencias.
    if (!editUserForm) return;                               // Si no hay formulario inicial, sale de forma segura.

    const normalizedPhone = normalizeToLocalPhone(           // Normaliza el teléfono actual a 10 dígitos locales.
      editUserForm.phone,
    );

    setEditUserForm((prev) => ({                             // Actualiza el formulario en el estado del padre.
      ...(prev || {}),                                       // Copia todos los campos previos (si existían).
      phone: normalizedPhone,                                // Sobrescribe el teléfono con el valor normalizado.
    }));
  }, [selectedUser, setEditUserForm, editUserForm]);         // Dependencias: cuando cambia el usuario o el form.

  // Efecto para cerrar el modal al presionar la tecla ESC.
  useEffect(() => {                                          // Declara el efecto que maneja la tecla Escape.
    const handleKeyDown = (event) => {                       // Define el manejador de eventos de teclado.
      if (event.key === 'Escape') {                          // Si la tecla presionada es ESC...
        handleClose();                                       // Llama a la función de cierre del modal.
      }
    };

    window.addEventListener('keydown', handleKeyDown);       // Registra el listener en el objeto window.

    return () => {                                           // Retorna la función de limpieza del efecto.
      window.removeEventListener('keydown', handleKeyDown);  // Elimina el listener al desmontar el componente.
    };
  });                                                        // Se ejecuta en cada render, limpiando y registrando de nuevo.

  // =========================
  // Derivados y validaciones
  // =========================

  // Helper genérico para actualizar un campo de texto (nombre, apellido, email, rol).
  const handleFieldChange = (fieldName, value) => {          // Declara la función para cambiar un campo del formulario.
    setEditUserForm((prev) => ({                             // Actualiza el estado en el componente padre.
      ...(prev || {}),                                       // Copia el estado previo para no perder otros campos.
      [fieldName]: value,                                    // Sobrescribe el campo indicado con el nuevo valor.
    }));
  };

  // Maneja el cambio en el campo teléfono aplicando restricciones de solo dígitos y máximo 10.
  const handlePhoneChange = (event) => {                     // Declara la función manejadora del cambio en teléfono.
    const rawValue = event.target.value;                     // Toma el valor crudo ingresado por el usuario.
    const digitsOnly = rawValue                              // Trabaja sobre ese valor para limpiarlo.
      .replace(/\D/g, '')                                    // Elimina caracteres no numéricos.
      .slice(0, 10);                                         // Recorta a un máximo de 10 dígitos.
    setEditUserForm((prev) => ({                             // Actualiza el formulario en el componente padre.
      ...(prev || {}),                                       // Mantiene intactos los demás campos.
      phone: digitsOnly,                                     // Guarda únicamente los dígitos locales.
    }));
  };

  // Deriva el teléfono local actual del formulario (aplicando nuevamente la normalización por seguridad).
  const localPhone = normalizeToLocalPhone(                  // Calcula el teléfono local que se mostrará en el input.
    editUserForm?.phone,
  );

  // Determina si el teléfono es válido: exactamente 10 dígitos locales.
  const isPhoneValid = !!localPhone && localPhone.length === 10; // Solo se considera válido si hay 10 dígitos.

  // Determina si el formulario completo es válido para habilitar el botón de guardar.
  const isFormValid =                                       // Calcula si el formulario es válido en su conjunto.
    !!editUserForm?.firstName?.trim() &&                    // Nombre obligatorio (no vacío ni solo espacios).
    !!editUserForm?.lastName?.trim() &&                     // Apellido obligatorio (no vacío ni solo espacios).
    isValidEmail(editUserForm?.email) &&                    // Correo debe tener un formato válido.
    !!editUserForm?.role &&                                 // Rol seleccionado (admin / líder de obra / cliente / auditor).
    isPhoneValid;                                           // Teléfono obligatorio y válido (10 dígitos).

  // Calcula la clase de borde del avatar en función del rol del usuario operador.
  const claseBordeAvatarRol = obtenerClaseBordeAvatarRol(   // Obtiene la clase de borde usando el helper definido arriba.
    rolUsuario,
  );

  // Rol normalizado actual del formulario, en minúsculas y sin espacios extra.
  const rolNormalizado = (editUserForm?.role || '')         // Toma el rol actual del formulario.
    .toString()                                             // Lo convierte a string por seguridad.
    .toLowerCase()                                          // Lo pasa a minúsculas para comparación.
    .trim();                                                // Elimina espacios adicionales.

  // Opción de rol actualmente seleccionada (si coincide con alguna del arreglo OPCIONES_ROL).
  const opcionRolSeleccionada = OPCIONES_ROL.find(          // Busca la opción que coincide con el rol normalizado actual.
    (opcion) => opcion.valor === rolNormalizado,
  );

  // =========================
  // Handlers de cierre y envío
  // =========================

  // Maneja el cierre local del modal (resetea estados internos y llama onClose).
  const handleClose = () => {                               // Declara la función que gestiona el cierre del modal.
    setIsSaving(false);                                     // Reinicia el estado de guardado.
    setErrorMessage('');                                    // Limpia cualquier mensaje de error previo.
    setIsPhoneFocused(false);                               // Quita la marca de foco en el teléfono.
    setEstaAbiertoDropdownRol(false);                       // Cierra el dropdown de rol si estaba abierto.
    if (onClose) {                                          // Verifica que se haya pasado el callback de cierre.
      onClose();                                            // Llama al callback del padre para cerrar el modal.
    }
  };

  // Maneja la selección de un nuevo rol desde el dropdown PCM.
  const handleSelectRol = (nuevoRol) => {                   // Declara la función que gestiona el cambio de rol.
    handleFieldChange('role', nuevoRol);                    // Actualiza el campo role en el formulario.
    setEstaAbiertoDropdownRol(false);                       // Cierra el dropdown después de seleccionar.
  };

  // Maneja el envío del formulario (guardado de cambios).
  const handleSubmit = async (event) => {                   // Declara la función que se ejecuta al enviar el formulario.
    event.preventDefault();                                 // Previene el comportamiento por defecto del formulario (recarga).

    if (isSaving || !isFormValid) return;                   // Si ya está guardando o el formulario no es válido, no hace nada.

    setIsSaving(true);                                      // Marca que se está realizando la petición al backend.
    setErrorMessage('');                                    // Limpia errores anteriores del estado.

    try {                                                   // Intenta ejecutar la lógica de guardado.
      // Prepara el objeto con los datos a enviar al backend.
      const payload = {
        firstName: (editUserForm.firstName || '').trim(),   // Nombre sin espacios al inicio/fin.
        lastName: (editUserForm.lastName || '').trim(),     // Apellido sin espacios al inicio/fin.
        email: (editUserForm.email || '').trim(),           // Email sin espacios al inicio/fin.
        phone: localPhone ? `57${localPhone}` : '',         // Teléfono en formato internacional 57 + 10 dígitos locales.
        role: rolNormalizado,                               // Rol normalizado en minúsculas para mantener consistencia.
      };

      const updatedUser = await actualizarUsuario(          // Llama al servicio de actualización y espera la respuesta.
        selectedUser,
        payload,
      );

      if (onSave) {                                         // Si el padre definió un callback onSave...
        onSave(updatedUser);                                // Le envía el usuario actualizado para que refresque la lista o el estado global.
      }

      handleClose();                                        // Cierra el modal y limpia estados internos si todo salió bien.
    } catch (error) {                                       // Captura cualquier error que ocurra durante la petición.
      console.error('Error al actualizar usuario:', error); // Log de error en la consola del navegador (debug).
      setErrorMessage(                                      // Actualiza el mensaje de error visible para el usuario.
        error?.response?.data?.message ||                   // Prioriza mensaje enviado por el backend si existe.
          error?.message ||
          'Ocurrió un error al actualizar el usuario.',     // Mensaje genérico si no hay detalle.
      );
      setIsSaving(false);                                   // Permite volver a intentar el guardado.
    }
  };

  // Maneja el click en el overlay de fondo (para cerrar al hacer click fuera).
  const handleOverlayClick = () => {                        // Declara la función que se dispara al hacer click fuera de la tarjeta.
    handleClose();                                          // Cierra el modal usando la lógica centralizada.
  };

  // Detiene la propagación del click dentro de la tarjeta para no cerrar el modal.
  const handleCardClick = (event) => {                      // Declara la función que maneja el click en el contenido del modal.
    event.stopPropagation();                                // Detiene la propagación del evento para que no llegue al overlay.
  };

  // =========================
  // Render del modal (overlay + tarjeta centrada)
  // =========================

  return (                                                   // Comienza el retorno del JSX del modal.
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4 sm:px-6 lg:px-8" // Overlay a pantalla completa, centrado.
      role="dialog"                                         // Rol ARIA para indicar que es un diálogo.
      aria-modal="true"                                     // Indica que es un modal que bloquea el fondo.
      onClick={handleOverlayClick}                          // Cierra el modal si se hace click sobre el fondo.
    >
      {/* Capa de fondo semitransparente con blur (usa helper PCM) */}
      <div
        className="absolute inset-0 pcm-overlay-suave backdrop-blur-sm" // Capa visual del overlay con desenfoque de fondo.
      />

      {/* Contenedor relativo de la tarjeta del modal */}
      <div
        className="relative z-10 w-full max-w-3xl"          // Contenedor centrado para la tarjeta del modal.
        onClick={handleCardClick}                           // Evita que los clics dentro de la tarjeta cierren el modal.
      >
        {/* Contenedor con borde degradado animado opcional */}
        {/* Cambio: se elimina animate-pcm-border-flow para que no rote toda la tarjeta */}
        <div className="bg-pcm-surfaceSoft">
          {/* Contenido real del modal dentro del borde animado */}
          <div
            className="bg-pcm-surfaceSoft rounded-pcm-xl border border-pcm-borderSoft/70 shadow-pcm-profunda animate-entrada-suave-arriba" // Tarjeta principal del modal con fondo PCM y animación de entrada.
          >
            {/* Encabezado del modal con ícono y descripción */}
            <div className="px-6 pt-6 pb-4 border-b border-pcm-borderSoft/60 flex items-center gap-3">
              {/* Avatar circular con ícono de usuario y borde según el rol */}
              <div
                className={`w-10 h-10 rounded-full pcm-fondo-degradado-principal flex items-center justify-center text-white shadow-pcm-suave border-2 ${claseBordeAvatarRol}`} // Avatar con degradado PCM y borde coloreado por rol.
              >
                <UserIcon size={20} />                      {/* Ícono de usuario centrado dentro del avatar. */}
              </div>

              {/* Título y descripción corta del modal */}
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-pcm-text">
                  Editar usuario
                </h2>
                <p className="text-xs sm:text-sm text-pcm-muted">
                  Actualiza la información del usuario seleccionado. Los cambios se
                  aplican de inmediato en el sistema.
                </p>
              </div>
            </div>

            {/* Cuerpo del formulario de edición */}
            <form
              onSubmit={handleSubmit}                       // Maneja el envío del formulario con la función definida.
              className="px-6 pb-6 pt-4 space-y-4 max-h-[70vh] pcm-scroll-y" // Aplica scroll interno suave si el contenido crece mucho.
            >
              {/* Grid de campos: nombre, apellido, correo, teléfono y rol */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campo: nombre */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
                    Nombre
                  </label>
                  <input
                    type="text"                            // Campo de texto para el nombre.
                    value={editUserForm?.firstName || ''} // Valor controlado desde editUserForm (nombre).
                    onChange={(e) =>                      // Cuando cambia el valor del input...
                      handleFieldChange('firstName', e.target.value) // Actualiza el campo firstName en el estado.
                    }
                    placeholder="Nombre del usuario"
                    className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-pcm-borderSoft/60 text-sm text-pcm-text placeholder-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/70 transition"
                  />
                </div>

                {/* Campo: apellido */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
                    Apellido
                  </label>
                  <input
                    type="text"                            // Campo de texto para el apellido.
                    value={editUserForm?.lastName || ''}  // Valor controlado desde editUserForm (apellido).
                    onChange={(e) =>                      // Cuando cambia el valor del input...
                      handleFieldChange('lastName', e.target.value) // Actualiza el campo lastName en el estado.
                    }
                    placeholder="Apellido del usuario"
                    className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-pcm-borderSoft/60 text-sm text-pcm-text placeholder-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/70 transition"
                  />
                </div>

                {/* Campo: correo electrónico (ocupa 2 columnas en desktop) */}
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
                    Correo electrónico
                  </label>
                  <input
                    type="email"                           // Campo de tipo email.
                    value={editUserForm?.email || ''}     // Valor controlado para el correo electrónico.
                    onChange={(e) =>                      // Cuando cambia el valor del input...
                      handleFieldChange('email', e.target.value) // Actualiza el campo email en el estado.
                    }
                    placeholder="correo@ejemplo.com"
                    className="w-full p-3 rounded-xl bg-pcm-bg/60 border border-pcm-borderSoft/60 text-sm text-pcm-text placeholder-pcm-muted focus:outline-none focus:ring-2 focus:ring-pcm-primary/70 transition"
                  />
                </div>

                {/* Campo: teléfono con prefijo +57 y validación de 10 dígitos */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
                    Teléfono
                  </label>

                  {/* Contenedor del input con prefijo +57 fijo */}
                  <div
                    className={[
                      'flex items-center gap-2 w-full px-3 py-2 rounded-xl border',
                      'bg-pcm-bg/60 text-sm transition',
                      isPhoneValid
                        ? 'border-pcm-borderSoft/60 focus-within:border-pcm-primary/70 focus-within:ring-2 focus-within:ring-pcm-primary/20'
                        : 'border-red-500/70 focus-within:ring-2 focus-within:ring-red-500/20',
                    ].join(' ')}                           // Contenedor que cambia de color según si el teléfono es válido.
                  >
                    {/* Chip con código de país +57 */}
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-lg bg-pcm-surfaceSoft text-xs font-semibold text-pcm-muted border border-pcm-borderSoft/70"
                    >
                      +57
                    </span>

                    {/* Input solo números, máximo 10 dígitos */}
                    <input
                      type="tel"                           // Tipo tel para teclados numéricos en dispositivos móviles.
                      inputMode="numeric"                  // Sugiere teclado numérico al sistema operativo.
                      pattern="[0-9]*"                     // Indica que se esperan solo dígitos.
                      value={localPhone}                   // Muestra solo los dígitos locales normalizados.
                      onChange={handlePhoneChange}         // Aplica limpieza y límite a 10 dígitos en cada cambio.
                      onFocus={() => setIsPhoneFocused(true)} // Marca que el campo está enfocado para mostrar ayuda.
                      onBlur={() => setIsPhoneFocused(false)} // Quita la marca de foco cuando se pierde el enfoque.
                      placeholder="3001234567"
                      className="flex-1 bg-transparent outline-none text-sm text-pcm-text placeholder-pcm-muted/70"
                    />
                  </div>

                  {/* Mensaje de ayuda / error para el teléfono */}
                  {(isPhoneFocused || (!isPhoneValid && !!localPhone)) && (
                    <p
                      className={`mt-1 text-[11px] ${
                        isPhoneValid ? 'text-pcm-muted' : 'text-red-400'
                      }`}
                    >
                      Ingresa solo números, 10 dígitos (ejemplo: 3001234567).
                    </p>
                  )}
                </div>

                {/* Selector de rol del sistema usando dropdown PCM personalizado */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-pcm-muted uppercase tracking-wide">
                    Rol en el sistema
                  </label>

                  {/* Contenedor relativo del dropdown PCM */}
                  <div className="pcm-select-contenedor">
                    {/* Botón principal del dropdown (estado cerrado/abierto) */}
                    <button
                      type="button"                        // Tipo botón para no disparar submit.
                      className={`pcm-select ${
                        estaAbiertoDropdownRol ? 'pcm-select-abierto' : ''
                      }`}                                  // Aplica clase extra si el dropdown está abierto.
                      onClick={() =>
                        setEstaAbiertoDropdownRol((prev) => !prev)
                      }                                    // Alterna entre abierto/cerrado al hacer click.
                    >
                      {/* Zona de texto principal del dropdown (título + resumen) */}
                      <div className="pcm-select-texto">
                        <span className="pcm-select-titulo">
                          {opcionRolSeleccionada
                            ? opcionRolSeleccionada.titulo
                            : 'Selecciona un rol'}
                        </span>
                        <span className="pcm-select-resumen">
                          {opcionRolSeleccionada
                            ? opcionRolSeleccionada.resumen
                            : 'Define el tipo de acceso del usuario dentro de PCM.'}
                        </span>
                      </div>

                      {/* Zona derecha del dropdown (chip + flecha) */}
                      <div className="pcm-select-estado">
                        <span className="pcm-select-chip-valor">
                          {opcionRolSeleccionada
                            ? opcionRolSeleccionada.chipCorto
                            : 'Sin rol'}
                        </span>
                        <span
                          className={`pcm-select-icono ${
                            estaAbiertoDropdownRol
                              ? 'pcm-select-icono-abierto'
                              : ''
                          }`}
                        >
                          ▾
                        </span>
                      </div>
                    </button>

                    {/* Lista desplegable de opciones (aparece solo cuando está abierto) */}
                    {estaAbiertoDropdownRol && (
                      <div className="pcm-select-lista pcm-scroll-y">
                        {OPCIONES_ROL.map((opcion) => (    // Recorre todas las opciones configuradas.
                          <button
                            key={opcion.valor}             // Clave única basada en el valor del rol.
                            type="button"                  // Botón simple, no envía formulario.
                            onClick={() =>                // Al hacer click en una opción...
                              handleSelectRol(opcion.valor) // Llama al handler para actualizar el rol.
                            }
                            className={`pcm-select-opcion ${
                              rolNormalizado === opcion.valor
                                ? 'pcm-select-opcion-activa'
                                : ''
                            }`}
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
              </div>

              {/* Mensaje de error general del modal (si existe) */}
              {errorMessage && (
                <div className="mt-2 text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-2">
                  {errorMessage}
                </div>
              )}

              {/* Footer con botones de acción */}
              <div className="mt-4 flex flex-col sm:flex-row justify-end gap-3">
                {/* Botón Cancelar (usa estilo ghost PCM) */}
                <button
                  type="button"
                  onClick={handleClose}                       // Llama a la función central de cierre.
                  disabled={isSaving}                        // Se desactiva mientras se está guardando.
                  className="pcm-btn-ghost pcm-btn-min-sm"   // Usa helper ghost + ancho mínimo pequeño PCM.
                >
                  Cancelar
                </button>

                {/* Botón Guardar cambios (usa CTA naranja PCM) */}
                <button
                  type="submit"
                  disabled={!isFormValid || isSaving}         // Deshabilita si falta algo o se está guardando.
                  className={`pcm-btn-primary pcm-btn-min-md ${
                    !isFormValid || isSaving
                      ? 'opacity-60 cursor-not-allowed'
                      : ''
                  }`}                                         // Usa helper de ancho mínimo medio PCM.
                >
                  {isSaving ? (                             // Si está guardando, muestra spinner y texto de carga.
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar cambios</span>            // Texto normal cuando no está guardando.
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporta el modal para ser usado en el Dashboard de administración.
export default ModalEditarUsuario;                            // Exportación por defecto con nombre en español consistente con el archivo.
