// File: frontend/src/App.jsx
// Description: Componente principal de la aplicación ProCivil Manager.
//              Define las rutas del frontend usando React Router DOM v7,
//              incluyendo páginas públicas, rutas protegidas por autenticación
//              y rutas exclusivas por rol (admin / líder de obra / cliente).
//              Envuelve toda la app con el ProveedorMensajeSesion para manejar
//              un banner global de mensajes de sesión (ej. "Tu sesión expiró"),
//              y aplica el tema visual PCM mediante el contenedor principal.
//              Además, expone rutas internas específicas para los manuales de
//              usuario por rol y el manual técnico del administrador.

// =========================
// Importaciones principales
// =========================
import React from 'react';                             // Importa React para poder crear componentes funcionales.

// Importa los componentes de enrutamiento de React Router DOM.
import {
  Routes,                                             // Contenedor que agrupa todas las rutas de la aplicación.
  Route,                                              // Componente que define una ruta individual.
} from 'react-router-dom';                            // Origen: react-router-dom v7 (compatible con React 19 y Vite 7).

// ===============================
// Páginas públicas (sitio público)
// ===============================
import Inicio from './modules/site/pages/Inicio.jsx';               // Página de inicio / landing principal (ruta "/").
import Contacto from './modules/site/pages/Contacto.jsx';           // Página de contacto público.
import Servicios from './modules/site/pages/Servicios.jsx';         // Página de servicios.
import ProyectosPublicos from './modules/site/pages/ProyectosPublicos.jsx'; // Página pública de portafolio de proyectos.
import RecuperarContrasena from './modules/auth/pages/RecuperarContrasena.jsx'; // Pantalla pública para solicitar recuperación.

// ==================================
// Páginas de autenticación (auth)
// ==================================
import InicioSesion from './modules/auth/pages/InicioSesion.jsx';         // Pantalla de inicio de sesión.
import Registro from './modules/auth/pages/Registro.jsx';                 // Pantalla de registro de usuarios.
import CambioContrasena from './modules/auth/pages/CambioContrasena.jsx'; // Pantalla para definir nueva contraseña.

// ==================================
// Páginas de perfil y panel interno
// ==================================
import VistaPerfil from './modules/profile/pages/VistaPerfil.jsx';    // Página de perfil de usuario autenticado.
import TableroTrabajo from './modules/workspace/layout/TableroTrabajo.jsx';    // Layout principal del panel de trabajo (admin / líder / cliente).

// ==================================
// Páginas de manuales de usuario / técnico
// ==================================
import ManualUsuarioAdmin from './modules/manuals/pages/ManualUsuarioAdmin.jsx';       // Manual de usuario para rol administrador.
import ManualUsuarioLider from './modules/manuals/pages/ManualUsuarioLider.jsx';       // Manual de usuario para rol líder de obra.
import ManualUsuarioCliente from './modules/manuals/pages/ManualUsuarioCliente.jsx';   // Manual de usuario para rol cliente.
import ManualUsuarioAuditor from './modules/manuals/pages/ManualUsuarioAuditor.jsx';   // Manual de usuario para rol auditor.
import ManualTecnicoAdmin from './modules/manuals/pages/ManualTecnicoAdmin.jsx';       // Manual técnico interno para administrador.

// ======================================
// Componentes de rutas protegidas por rol
// ======================================
import RutaPrivada from './shared/components/routing/RutaPrivada.jsx';          // Ruta protegida genérica: exige usuario autenticado (cualquier rol).
import RutaAdmin from './shared/components/routing/RutaAdmin.jsx';              // Ruta protegida exclusiva para rol administrador.
import RutaLider from './shared/components/routing/RutaLider.jsx';              // Ruta protegida exclusiva para rol líder de obra.
import RutaCliente from './shared/components/routing/RutaCliente.jsx';          // Ruta protegida exclusiva para rol cliente.

// ======================================
// Contexto y banner de mensajes de sesión
// ======================================
import BannerMensajeSesion from './shared/components/feedback/BannerMensajeSesion.jsx'; // Banner flotante que muestra mensajes globales de sesión.
import {
  ProveedorMensajeSesion,                             // Proveedor del contexto que expone el estado y setter de mensajes de sesión.
} from './shared/context/ContextoMensajeSesion.jsx';  // Contexto de mensajes de sesión consumido por rutas protegidas y otros componentes.

// ─────────────────────────────────────────────
// Componente principal de la aplicación (App)
// ─────────────────────────────────────────────
function App() {
  // Retorna la estructura de enrutamiento de toda la aplicación,
  // envuelta por ProveedorMensajeSesion (para manejar mensajes globales de sesión),
  // asumiendo que el Router principal ya viene desde main.jsx.
  return (
    // ProveedorMensajeSesion expone el contexto de mensajes de sesión
    // (ej. tipo, texto, duración) a todo el árbol de componentes.
    <ProveedorMensajeSesion>
      {/* Contenedor general que aplica el fondo y el color de texto del tema PCM.
          min-h-screen garantiza que la vista ocupe al menos el alto completo de la ventana. */}
      <div className="min-h-screen bg-pcm-bg text-pcm-text">
        {/* Banner global de mensajes de sesión. */}
        <BannerMensajeSesion />

        {/* Routes agrupa todas las definiciones de rutas de la aplicación.
            El contexto de enrutamiento ya lo provee BrowserRouter desde main.jsx. */}
        <Routes>
          {/* ──────────────────────────────── */}
          {/* RUTAS PÚBLICAS (NO REQUIEREN LOGIN) */}
          {/* ──────────────────────────────── */}

          {/* Landing principal. */}
          <Route
            path="/"
            element={<Inicio />}                         // Usa el componente Inicio importado.
          />

          {/* Inicio de sesión. */}
          <Route
            path="/login"
            element={<InicioSesion />}                  // Usa el componente InicioSesion importado.
          />

          {/* Registro de usuarios (ruta "oficial" en español). */}
          <Route
            path="/registrar"
            element={<Registro />}                      // Usa el componente Registro importado.
          />

          {/* Alias en inglés para compatibilidad con URLs antiguas: /register. */}
          <Route
            path="/register"
            element={<Registro />}                      // Mismo componente Registro para alias /register.
          />

          {/* Recuperar contraseña. */}
          <Route
            path="/recuperar"
            element={<RecuperarContrasena />}           // Usa el componente RecuperarContrasena importado.
          />

          {/* Servicios (mayúscula, para coincidir con navbar antiguo). */}
          <Route
            path="/Servicios"
            element={<Servicios />}                     // Usa el componente Servicios importado.
          />

          {/* Alias en minúsculas para servicios. */}
          <Route
            path="/servicios"
            element={<Servicios />}                     // Mismo componente Servicios para alias en minúsculas.
          />

          {/* Página pública de portafolio de proyectos (vitrina comercial). */}
          <Route
            path="/proyectos-publicos"
            element={<ProyectosPublicos />}             // Usa el componente ProyectosPublicos importado.
          />

          {/* Alias corto opcional para el portafolio, útil en enlaces de marketing. */}
          <Route
            path="/portafolio"
            element={<ProyectosPublicos />}             // Mismo componente ProyectosPublicos para alias /portafolio.
          />

          {/* Contacto (mayúscula). */}
          <Route
            path="/Contacto"
            element={<Contacto />}                      // Usa el componente Contacto importado.
          />

          {/* Alias en minúsculas para contacto. */}
          <Route
            path="/contacto"
            element={<Contacto />}                      // Mismo componente Contacto para alias en minúsculas.
          />

          {/* Cambio de contraseña desde enlace con token. */}
          <Route
            path="/cambio-contrasena"
            element={<CambioContrasena />}              // Usa el componente CambioContrasena importado.
          />

          {/* ──────────────────────────────── */}
          {/* RUTAS PROTEGIDAS (REQUERIR LOGIN) */}
          {/* ──────────────────────────────── */}

          {/* Perfil de usuario autenticado. */}
          <Route
            path="/perfil"
            element={
              <RutaPrivada>
                <VistaPerfil />                         {/* Página de perfil interno, ya renombrada a VistaPerfil. */}
              </RutaPrivada>
            }
          />

          {/* Ruta /Proyectos protegida (heredada de la versión anterior). */}
          <Route
            path="/Proyectos"
            element={
              <RutaPrivada>
                {/* Se reutiliza el layout unificado del workspace. */}
                <TableroTrabajo />
              </RutaPrivada>
            }
          />

          {/* Alias en minúsculas para /proyectos (por si se navega así). */}
          <Route
            path="/proyectos"
            element={
              <RutaPrivada>
                <TableroTrabajo />
              </RutaPrivada>
            }
          />

          {/* ──────────────────────────────── */}
          {/* RUTAS EXCLUSIVAS POR ROL (ADMIN / LÍDER / CLIENTE) */}
          {/* ──────────────────────────────── */}

          {/* Panel del administrador. */}
          <Route
            path="/admin"
            element={
              <RutaAdmin>
                <TableroTrabajo />
              </RutaAdmin>
            }
          />

          {/* Panel del líder de obra. */}
          <Route
            path="/panel-lider"
            element={
              <RutaLider>
                <TableroTrabajo />
              </RutaLider>
            }
          />

          {/* Panel del cliente. */}
          <Route
            path="/panel-cliente"
            element={
              <RutaCliente>
                <TableroTrabajo />
              </RutaCliente>
            }
          />

          {/* ──────────────────────────────── */}
          {/* RUTAS DE MANUALES (USUARIO / TÉCNICO) */}
          {/* ──────────────────────────────── */}

          {/* Manual de usuario para administrador. */}
          <Route
            path="/manuales/admin"
            element={
              <RutaAdmin>
                <ManualUsuarioAdmin />
              </RutaAdmin>
            }
          />

          {/* Manual de usuario para líder de obra. */}
          <Route
            path="/manuales/lider"
            element={
              <RutaLider>
                <ManualUsuarioLider />
              </RutaLider>
            }
          />

          {/* Manual de usuario para cliente. */}
          <Route
            path="/manuales/cliente"
            element={
              <RutaCliente>
                <ManualUsuarioCliente />
              </RutaCliente>
            }
          />

          {/* Manual de usuario para auditor (por ahora solo exige login genérico). */}
          <Route
            path="/manuales/auditor"
            element={
              <RutaPrivada>
                <ManualUsuarioAuditor />
              </RutaPrivada>
            }
          />

          {/* Manual técnico interno, exclusivo para administrador. */}
          <Route
            path="/manuales/admin/tecnico"
            element={
              <RutaAdmin>
                <ManualTecnicoAdmin />
              </RutaAdmin>
            }
          />
        </Routes>
      </div>
    </ProveedorMensajeSesion>
  );
}

// Exporta el componente principal de la aplicación para que sea usado en main.jsx.
export default App;                                      // Exportación por defecto de App, compatible con Vite 7 y React 19.
