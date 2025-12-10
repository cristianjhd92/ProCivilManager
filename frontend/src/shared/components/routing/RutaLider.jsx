// File: frontend/src/shared/components/routing/RutaPrivada.jsx               // Ruta del archivo dentro del frontend de ProCivil Manager (PCM).
// Description: Ruta protegida genérica. Verifica que exista un token y un    // Asegura autenticación básica antes de mostrar rutas internas.
//              objeto "user" válido en localStorage antes de permitir el     // Si la sesión es inválida o está corrupta, limpia los datos y
//              acceso. Si la sesión es inválida o está corrupta, limpia      // redirige al inicio de sesión, disparando además un mensaje global
//              los datos y redirige al inicio de sesión, disparando además   // en el contexto de sesión para mostrar un aviso tipo
//              un mensaje global en el contexto de sesión para mostrar       // "Tu sesión expiró" mediante BannerMensajeSesion.

// =========================
// Importaciones principales
// =========================
import React, { useEffect } from 'react';                                      // Importa React y el hook useEffect para manejar efectos secundarios.
import { Navigate } from 'react-router-dom';                                   // Importa Navigate para realizar redirecciones declarativas.

// Importa el hook del contexto de mensajes de sesión, que permite configurar
// un mensaje global consumido por BannerMensajeSesion.
import {
  useMensajeSesion                                                             // Hook personalizado que expone las funciones del contexto de mensajes.
} from '../../context/ContextoMensajeSesion.jsx';                              // Ruta al contexto global de mensajes de sesión refactorizado en español.

// ============================================================================
// Subcomponente: RedireccionSesionExpirada
// ============================================================================
// Encapsula la lógica de:
//   - Disparar el mensaje global de "sesión expirada/invalidada" usando el contexto.
//   - Redirigir al usuario a la ruta de inicio de sesión ("/login").
// Esto permite reutilizar el patrón mensaje + navegación de forma limpia y consistente.
const RedireccionSesionExpirada = ({ texto }) => {                             // Declara el subcomponente que recibe el texto del mensaje a mostrar.
  const {
    establecerMensajeSesion                                                     // Función para actualizar el mensaje de sesión en el contexto global.
  } = useMensajeSesion();                                                      // Usa el hook personalizado para acceder al contexto de mensajes.

  useEffect(() => {                                                            // Define un efecto que se ejecuta cuando se monta este subcomponente.
    establecerMensajeSesion({                                                  // Configura un nuevo mensaje de sesión en el contexto global.
      tipo: 'advertencia',                                                     // Tipo de mensaje: advertencia (coincide con BannerMensajeSesion).
      texto                                                                    // Texto que se mostrará en el banner de sesión.
    });
  }, [establecerMensajeSesion, texto]);                                        // Dependencias: función del contexto y texto (evita efectos innecesarios).

  // Redirige inmediatamente al inicio de sesión.
  // Se usa `replace` para no dejar la ruta anterior en el historial del navegador,
  // de modo que al hacer "Atrás" el usuario no vuelva a una vista protegida inválida.
  return (
    <Navigate                                                                  // Componente de React Router que realiza una redirección declarativa.
      to="/login"                                                              // Ruta de destino: pantalla de inicio de sesión de ProCivil Manager.
      replace                                                                  // Reemplaza la entrada actual en el historial para evitar navegación hacia atrás.
    />
  );
};

// ============================================================================
// Componente principal: RutaPrivada
// ============================================================================
// Envuelve cualquier ruta que requiera que el usuario esté autenticado.
// NO valida roles específicos, solo que exista una sesión básica válida:
//
//   - Debe existir un token en localStorage (por ejemplo, un JWT).
//   - Debe existir un objeto "user" serializado en localStorage.
//   - El objeto "user" debe ser un JSON parseable (sin corrupción).
//
// Si la sesión es inválida o está corrupta:
//   1) Limpia los datos de autenticación del localStorage.
//   2) Dispara un mensaje global de "sesión expirada / inválida".
//   3) Redirige a "/login" usando RedireccionSesionExpirada.
const RutaPrivada = ({ children }) => {                                        // Declara el componente RutaPrivada, que recibe como children la ruta protegida.
  const token = localStorage.getItem('token');                                 // Lee el token almacenado en localStorage (se guarda al iniciar sesión).
  const usuarioCadena = localStorage.getItem('user');                          // Lee la cadena de usuario (datos serializados como JSON) desde localStorage.

  // Si no hay token o no hay usuario, consideramos que la sesión es inválida.
  if (!token || !usuarioCadena) {                                              // Verifica si falta alguno de los elementos necesarios para una sesión válida.
    localStorage.removeItem('token');                                          // Elimina el token de autenticación del almacenamiento local.
    localStorage.removeItem('user');                                           // Elimina los datos del usuario del almacenamiento local.

    // Usa el subcomponente RedireccionSesionExpirada para:
    //   - Disparar un mensaje global informando que la sesión no es válida.
    //   - Redirigir inmediatamente a la pantalla de inicio de sesión.
    return (
      <RedireccionSesionExpirada
        texto="Tu sesión expiró o no es válida. Por favor inicia sesión nuevamente."
      />
    );
  }

  try {
    // Intenta validar que la cadena de usuario sea un JSON correcto.
    // No necesitamos el valor parseado aquí, solo verificar que no esté corrupto.
    JSON.parse(usuarioCadena);                                                // Si falla el parseo, se lanzará una excepción.
  } catch (error) {                                                           // Captura cualquier error de parseo del JSON.
    console.error(                                                            // Muestra un mensaje en consola para facilitar la depuración en desarrollo.
      'Datos de usuario inválidos en localStorage:',
      error
    );

    localStorage.removeItem('token');                                         // Elimina el token del almacenamiento local al detectar corrupción.
    localStorage.removeItem('user');                                          // Elimina los datos de usuario corruptos.

    // De nuevo, usa RedireccionSesionExpirada para mostrar mensaje global y redirigir.
    return (
      <RedireccionSesionExpirada
        texto="Tu sesión expiró o tus datos eran inválidos. Inicia sesión de nuevo para continuar."
      />
    );
  }

  // Si existe token y los datos de usuario son válidos, se considera la sesión correcta
  // y se permite el acceso al contenido protegido.
  return children;                                                             // Renderiza los hijos (la ruta protegida envuelta por RutaPrivada).
};

// =========================
// Exportación del componente
// =========================
export default RutaPrivada;                                                    // Exporta RutaPrivada como exportación por defecto para usarla en la configuración de rutas protegidas.
