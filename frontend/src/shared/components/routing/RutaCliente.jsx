// File: frontend/src/shared/components/routing/RutaCliente.jsx           // Ruta del archivo dentro del frontend de ProCivil Manager (PCM).
// Description: Componente de ruta protegida específico para el rol      // Se encarga de envolver vistas exclusivas para usuarios con rol
//              "cliente" en ProCivil Manager. Reutiliza la lógica de    // "cliente", apoyándose en RutaAdmin como guard genérico que valida
//              autenticación y validación de rol ya implementada en     // token, usuario en localStorage y permisos de rol antes de mostrar
//              RutaAdmin, limitando el acceso únicamente a usuarios     // el contenido protegido (children) dentro de la aplicación PCM.
//              autenticados cuyo rol normalizado sea exactamente        // Esto facilita declarar rutas exclusivas para clientes en React Router.
//              "cliente".                                               // Mantiene consistencia con el modelo de roles del backend PCM.

// =========================
// Importaciones principales
// =========================
import React from 'react';                                                // Importa React para poder definir el componente funcional y usar JSX.
import RutaAdmin from './RutaAdmin.jsx';                                  // Importa el guard genérico que valida token, usuario y roles permitidos.

// =====================
// Componente RutaCliente
// =====================
// Props esperadas:
//   - children: componente(s) React que se desean proteger y mostrar
//               únicamente a usuarios autenticados con rol "cliente".
const RutaCliente = ({                                                    // Declara el componente funcional RutaCliente.
  children,                                                               // Desestructura la prop children, que contiene el contenido protegido.
}) => {
  // Envuelve las vistas hijas en RutaAdmin, pero restringiendo
  // específicamente el acceso al rol "cliente". Si el usuario:
  //   - no tiene token,
//   - no tiene objeto "user" válido en localStorage, o
  //   - tiene un rol diferente a "cliente",
  // RutaAdmin mostrará una alerta visual alineada al tema PCM en lugar
  // del contenido protegido (children).
  return (
    <RutaAdmin rolesPermitidos={['cliente']}>                             {/* Indica a RutaAdmin que solo acepte usuarios cuyo rol normalizado sea "cliente". */}
      {children}                                                          {/* Renderiza el contenido protegido solo cuando RutaAdmin valida autenticación y rol. */}
    </RutaAdmin>
  );
};

// =========================
// Exportación del componente
// =========================
export default RutaCliente;                                               // Exporta RutaCliente como exportación por defecto para usarlo en la configuración de rutas protegidas.
