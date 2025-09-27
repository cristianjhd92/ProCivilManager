import React from 'react';
import './index.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// PÁGINAS
import HomePage from './pages/Inicio';
import Login from './pages/login';
import Register from './pages/register';
import RecuperacionContrasena from './pages/solicitar';
import Perfil from './pages/perfil';
import CambiarContrasena from './pages/cambio';
import Proyectos from './pages/proyectos';
import ContactPage from './pages/contacto';
import ProjectRegistrationForm from './pages/construccion_solicitud';
import ServicesPage from './pages/servicios';
import EmployeesPage from './pages/historial';

// ADMIN y LÍDER DE OBRA
import AdminDashboard from './Admin/Dashboard';
//import LiderDashboard from './pages/LiderDashboard'; // NUEVA página para líder de obra

// RUTAS PROTEGIDAS
import PrivateRoute from './components/PrivateRoute'; 
import AdminRoute from './components/AdminRoute';
//import LiderRoute from './components/LiderRoute';

function App() {
  return (
    <Router>
      <Routes>

        {/* RUTAS PÚBLICAS */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recuperar" element={<RecuperacionContrasena />} />
        <Route path="/Servicios" element={<ServicesPage />} />
        <Route path="/cambio" element={<CambiarContrasena />} />
        <Route path="/Contacto" element={<ContactPage />} />
        <Route path="/Proyectos" element={<Proyectos />} />

        {/* RUTA SOLO PARA ADMIN */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />

        {/* RUTA SOLO PARA LÍDER DE OBRA */}
        {/* <Route 
          path="/lider" 
          element={
            <LiderRoute>
              <LiderDashboard />
            </LiderRoute>
          } 
        /> */}

        {/* RUTAS PROTEGIDAS GENERALES (usuario autenticado, cualquier rol) */}
        <Route
          path="/perfil"
          element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          }
        />
        <Route
          path="/SolicitudP"
          element={
            <PrivateRoute>
              <ProjectRegistrationForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/Historial"
          element={
            <PrivateRoute>
              <EmployeesPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
