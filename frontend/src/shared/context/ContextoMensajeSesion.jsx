// File: frontend/src/shared/context/ContextoMensajeSesion.jsx                   // Ruta del archivo dentro del frontend de ProCivil Manager.
// Description: Contexto global para manejar mensajes relacionados con la sesión // Administra mensajes de sesión a nivel global (por ejemplo:
//              (por ejemplo: "Tu sesión expiró"). Permite definir un mensaje,   // "Tu sesión expiró"). Cualquier componente puede leer/actualizar
//              limpiarlo y consumirlo desde cualquier parte de la aplicación    // el mensaje usando el hook useMensajeSesion. Se usa junto a rutas
//              usando el hook useMensajeSesion. Se usa junto a rutas protegidas // protegidas (RutaPrivada, RutaAdmin, RutaCliente) y un banner global
//              (por ejemplo, RutaPrivada) y un banner global (BannerMensajeSesion)
//              para mostrar avisos al usuario sobre el estado de su sesión.     // que muestra avisos al usuario sobre el estado de su sesión.

// =========================
// Importaciones principales
// =========================
import React, {                                                                  // Importa React y los hooks necesarios para crear y usar el contexto.
  createContext,                                                                 // Función para crear un contexto global de React.
  useContext,                                                                    // Hook para consumir el valor del contexto en otros componentes.
  useState,                                                                      // Hook para manejar el estado local del mensaje actual.
  useCallback,                                                                   // Hook para memorizar funciones y evitar recrearlas en cada render.
  useMemo                                                                        // Hook para memorizar objetos derivados (como el value del contexto).
} from 'react';

// =====================================================
// Creación del contexto para mensajes de sesión
// =====================================================

// Crea el contexto que almacenará la información de mensajes de sesión.
// El valor inicial es null, lo que significa "no hay mensaje disponible".
const ContextoMensajeSesion = createContext(null);                               // Contexto que contendrá mensajeSesion y funciones relacionadas.

// =====================================================
// Componente proveedor del contexto
// =====================================================
// Este componente debe envolver a la aplicación (por ejemplo, en App.jsx),
// para que cualquier componente hijo pueda usar el hook useMensajeSesion
// y acceder o modificar los mensajes de sesión.
export const ProveedorMensajeSesion = ({ children }) => {                        // Declara el componente proveedor que recibe todo el árbol de la app.
  // Estado para guardar el mensaje actual de sesión.
  // El mensaje puede ser:
  //   - null  → no hay mensaje activo.
  //   - { tipo, texto } → mensaje con tipo (advertencia, error, éxito, info)
  //                       y texto a mostrar en el banner global.
  const [mensajeSesion, establecerMensajeSesionEstado] = useState(null);         // Inicializa el estado del mensaje de sesión como null.

  // Función para establecer un nuevo mensaje de sesión.
  // Se espera recibir un objeto con la forma:
  //   { tipo: 'advertencia' | 'error' | 'exito' | 'info', texto: string }.
  const establecerMensajeSesion = useCallback((mensaje) => {                     // Función memorizada para actualizar el mensaje de sesión.
    // Nota: aquí asumimos que quien llama ya envía el objeto en el formato correcto.
    // Ejemplo de uso:
    //   establecerMensajeSesion({ tipo: 'advertencia', texto: 'Tu sesión expiró...' });
    establecerMensajeSesionEstado(mensaje);                                      // Actualiza el estado interno con el mensaje recibido.
  }, []);                                                                        // La función no depende de valores externos, referencia estable.

  // Función para limpiar el mensaje de sesión.
  // Se usará, por ejemplo, cuando el usuario cierre el banner de aviso.
  const limpiarMensajeSesion = useCallback(() => {                               // Función memorizada para eliminar el mensaje actual.
    establecerMensajeSesionEstado(null);                                         // Deja el estado en null (sin mensaje activo).
  }, []);                                                                        // Referencia estable, sin dependencias.

  // Valor que expondrá el contexto a los consumidores.
  // Incluye:
  //   - mensajeSesion: mensaje actual (null o { tipo, texto }).
  //   - establecerMensajeSesion: para definir un mensaje nuevo.
  //   - limpiarMensajeSesion: para borrar el mensaje actual.
  const valor = useMemo(
    () => ({                                                                     // Devuelve un objeto con el estado y las funciones públicas del contexto.
      mensajeSesion,                                                             // Mensaje de sesión activo que consumen otros componentes.
      establecerMensajeSesion,                                                   // Función para definir un mensaje nuevo.
      limpiarMensajeSesion                                                       // Función para limpiar el mensaje actual.
    }),
    [mensajeSesion, establecerMensajeSesion, limpiarMensajeSesion]               // Se recalcula solo cuando cambian estas referencias.
  );

  // Renderiza el proveedor del contexto envolviendo a los children.
  // Cualquier componente dentro de este árbol podrá usar useMensajeSesion
  // para leer o modificar el mensaje de sesión.
  return (
    <ContextoMensajeSesion.Provider value={valor}>                               {/* Provee el valor del contexto al árbol de componentes hijo. */}
      {children}                                                                 {/* Renderiza el árbol de componentes que podrán consumir el contexto. */}
    </ContextoMensajeSesion.Provider>
  );
};

// =====================================================
// Hook personalizado para consumir el contexto
// =====================================================
// Este hook evita tener que hacer useContext(ContextoMensajeSesion)
// manualmente en cada archivo y proporciona un punto único de acceso.
export const useMensajeSesion = () => {                                          // Declara el hook personalizado en español.
  const contexto = useContext(ContextoMensajeSesion);                            // Obtiene el valor actual del contexto usando useContext.

  // Si no hay contexto, significa que el hook se está usando fuera
  // de un ProveedorMensajeSesion. Esto normalmente es un error de integración.
  if (!contexto) {
    // Lanza un error claro en español para ayudar durante el desarrollo.
    // En producción también aparecería en consola y ayuda a detectar
    // que falta envolver la aplicación con ProveedorMensajeSesion.
    throw new Error(
      'useMensajeSesion debe usarse dentro de un <ProveedorMensajeSesion>. ' +
        'Asegúrate de envolver tu aplicación con ProveedorMensajeSesion en App.jsx.'
    );
  }

  // Si todo está bien, devuelve el objeto con:
  // { mensajeSesion, establecerMensajeSesion, limpiarMensajeSesion }.
  return contexto;                                                               // Retorna el valor del contexto para que el componente lo use.
};
