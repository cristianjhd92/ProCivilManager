import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import React, { useState, useEffect  } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, Building2, FileText, Download,  X, DollarSign, Clock } from 'lucide-react';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState([]);
  const [proyectosRecientes, setProyectosRecientes] = useState([]);
  const [userToDelete, setUserToDelete] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [editProjectForm, setEditProjectForm] = useState({});


 
  useEffect(() => {
    const fetchStatsOverview = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/stats/overview');
        const data = await res.json();
  
        setStats([
          {
            title: 'Proyectos Totales',
            value: data.totalProyectos,
            icon: Building2,
            color: 'from-orange-500 to-orange-600',
          },
          {
            title: 'Presupuesto Total',
            value: `$${data.presupuestoTotal}`,
            icon: DollarSign,
            color: 'from-green-500 to-green-600',
          },
          {
            title: 'Progreso Promedio',
            value: `${data.progresoPromedio}%`,
            icon: Clock,
            color: 'from-blue-500 to-blue-600',
          },
        ]);
  
        setChartData(
          data.proyectosMensuales.map(item => ({
            month: `${item._id.month}/${item._id.year}`,
            proyectos: item.total,
          }))
        );
  
        setPieData(
          Object.entries(data.proyectosPorTipo).map(([name, value], index) => ({
            name,
            value,
            color: ['#f97316', '#3b82f6', '#10b981', '#ec4899'][index % 4],
          }))
        );
  
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };
  
    fetchStatsOverview();
    
    const fetchProyectosRecientes = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/proyectos/recientes');
        const data = await res.json();
        setProyectosRecientes(data);
      } catch (error) {
        console.error('Error al cargar proyectos recientes:', error);
      }
    };
    
    fetchProyectosRecientes();

    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/user/users");
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
      }
    };
  
    fetchUsers();

    const fetchProyectos = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/proyectos");
        const data = await res.json();
        setProjects(data);
      } catch (error) {
        console.error("Error al cargar proyectos:", error);
      }
    };
  
    fetchProyectos();

    const fetchEmails = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/contact"); 
        const data = await res.json();
        setEmails(data);
      } catch (error) {
        console.error("Error al cargar emails:", error);
      }
    };

    fetchEmails();

    
  }, []);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
  
    doc.setFontSize(18);
    doc.text("Reporte de Estadísticas", 14, 20);
  
    doc.setFontSize(12);
    doc.text("Resumen General", 14, 35);
  
    // Tabla de estadísticas principales
    const statsTable = stats.map(stat => [stat.title, stat.value]);
    autoTable(doc, {
      head: [["Métrica", "Valor"]],
      body: statsTable,
      startY: 40,
    });
  
    // Proyectos por tipo
    if (pieData.length > 0) {
      const pieTable = pieData.map(item => [item.name, item.value]);
      doc.text("Proyectos por Tipo", 14, doc.lastAutoTable.finalY + 10);
      autoTable(doc, {
        head: [["Tipo", "Cantidad"]],
        body: pieTable,
        startY: doc.lastAutoTable.finalY + 15,
      });
    }
  
    // Proyectos recientes
    if (proyectosRecientes.length > 0) {
      const proyectosTable = proyectosRecientes.map(p => [
        p.title,
        p.email,
        `$${p.budget}`,
        `${p.progress}%`,
      ]);
      doc.text("Proyectos Recientes", 14, doc.lastAutoTable.finalY + 10);
      autoTable(doc, {
        head: [["Título", "Cliente", "Presupuesto", "Progreso"]],
        body: proyectosTable,
        startY: doc.lastAutoTable.finalY + 15,
      });
    }
  
    doc.save("reporte_estadisticas.pdf");
  };
  


  // 📌 todas las funciones aquí (ANTES del return)

  const handleEditUser = (user) => {
    setSelectedUser(user._id);  // solo guardamos el ID
    setEditUserForm({ ...user }); // el form se controla aparte
  };
  

  const handleEditProject = (project) => {
    setProjectToEdit(project._id);
    setEditProjectForm({ ...project });
  };
  

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };




  const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900/95 to-blue-900/95 backdrop-blur-xl rounded-3xl border-2 border-orange-500 border-opacity-30 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
          <div className="p-8">
            <div className="flex justify-end mb-6">
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-orange-400 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
              >
                <X size={28} />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Estadísticas */}
      <div className="grid grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20 hover:bg-opacity-15 transition-all">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="text-white" size={24} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-gray-300 text-sm">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
          <h3 className="text-xl font-semibold text-white mb-6">Evolución de Proyectos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="proyectos" stroke="#f97316" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
          <h3 className="text-xl font-semibold text-white mb-6">Distribución por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de Proyectos Recientes */}
      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl border border-white border-opacity-20">
        <div className="p-6 border-b border-white border-opacity-20">
          <h3 className="text-xl font-semibold text-white">Proyectos Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white border-opacity-20">
                <th className="text-left p-4 text-gray-300">Proyecto</th>
                <th className="text-left p-4 text-gray-300">Cliente</th>
                <th className="text-left p-4 text-gray-300">Progreso</th>
                <th className="text-left p-4 text-gray-300">Presupuesto</th>
              </tr>
            </thead>
            <tbody>
            {proyectosRecientes.map((project) => (
                  <tr key={project._id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5">
                    <td className="p-4 text-white">{project.title}</td>
                    <td className="p-4 text-gray-300">{project.email}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-sm">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-white">${project.budget.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div 
          key={project._id}
          className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20 hover:bg-opacity-15 transition-all"
        >
          {/* Título y cliente */}
          <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
          <p className="text-gray-300 mb-4">{project.email}</p>
  
          {/* Barra de progreso */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div 
                className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                style={{ width: `${project.progress || 0}%` }}
              ></div>
            </div>
            <span className="text-white text-sm">{project.progress || 0}%</span>
          </div>
  
          {/* Presupuesto y tipo */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-orange-400 font-semibold">
              ${project.budget?.toLocaleString()}
            </span>
            <span className="text-sm text-gray-400">{project.type}</span>
          </div>
  
          {/* Botones de acción */}
          <div className="flex justify-between items-center space-x-2">
            <button 
              onClick={() => setSelectedProject(project)}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Ver Detalles
            </button>
            <button 
              onClick={() => handleEditProject(project)}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
            >
              Editar
            </button>
            <button 
              onClick={() => setProjectToDelete(project)}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
  

  const renderUsers = () => (
    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl border border-white border-opacity-20">
      <div className="p-6 border-b border-white border-opacity-20">
        <h3 className="text-xl font-semibold text-white">Gestión de Usuarios</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white border-opacity-20">
              <th className="text-left p-4 text-gray-300">Nombre</th>
              <th className="text-left p-4 text-gray-300">Email</th>
              <th className="text-left p-4 text-gray-300">Rol</th>
              <th className="text-left p-4 text-gray-300">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5">
                <td className="p-4 text-white">{user.firstName} {user.lastName}</td>
                <td className="p-4 text-gray-300">{user.email}</td>
                <td className="p-4 text-gray-300">{user.role}</td>
                <td className="p-4 flex space-x-2">
                <button 
                  onClick={() => handleEditUser(user)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Editar
                </button>
                <button 
                  onClick={() => setUserToDelete(user)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                >
                  Eliminar
                </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  

  const renderContact = () => (
    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl border border-white border-opacity-20">
      <div className="p-6 border-b border-white border-opacity-20">
        <h3 className="text-xl font-semibold text-white">Bandeja de Entrada</h3>
      </div>
  
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-800 text-gray-200 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Correo</th>
              <th className="px-6 py-3">Empresa</th>
              <th className="px-6 py-3">Proyecto</th>
              <th className="px-6 py-3">Mensaje</th>
              <th className="px-6 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {emails.map((email) => (
              <tr
                key={email._id}
                onClick={() => setSelectedEmail(email)}
                className="hover:bg-white/5 cursor-pointer transition"
              >
                <td className="px-6 py-4">{email.name}</td>
                <td className="px-6 py-4">{email.email}</td>
                <td className="px-6 py-4">{email.company || "-"}</td>
                <td className="px-6 py-4">{email.projectType || "-"}</td>
                <td className="px-6 py-4 truncate max-w-xs">{email.message}</td>
                <td className="px-6 py-4">
                  {email.createdAt ? new Date(email.createdAt).toLocaleString() : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  


  const renderReports = () => (
    <div className="space-y-6">
      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
        <h3 className="text-xl font-semibold text-white mb-6">Generar Reportes</h3>
        <div className="grid grid-cols-2 gap-6">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-red-400 hover:from-red-600 hover:to-red-500 text-white py-3 px-6 rounded-lg transition-all"
          >
            <FileText size={20} />
            <span>Descargar PDF</span>
          </button>
          <button 
            onClick={() => alert('Descargando reporte Excel...')}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 text-white py-3 px-6 rounded-lg transition-all"
          >
            <Download size={20} />
            <span>Descargar Excel</span>
          </button>
        </div>
      </div>
    </div>
  );

  const sections = {
    dashboard: { title: 'Dashboard Principal', component: renderDashboard },
    users: { title: 'Gestión de Usuarios', component: renderUsers },
    projects: { title: 'Proyectos de Construcción', component: renderProjects },
    contact: { title: 'Centro de Contacto', component: renderContact },
    reports: { title: 'Reportes y Estadísticas', component: renderReports }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      {/* Navbar Horizontal Mejorado */}
      <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-blue-900 backdrop-blur-xl border-b-2 border-orange-500 border-opacity-30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-12">
              {/* Logo mejorado */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                    ConstructAdmin
                  </h1>
                  <p className="text-xs text-gray-400">Sistema de Gestión</p>
                </div>
              </div>
              
              {/* Menu mejorado */}
              <div className="flex space-x-2">
                {Object.entries(sections).map(([key, section]) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                      activeSection === key
                        ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/25'
                        : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-sm'
                    }`}
                  >
                    {activeSection === key && (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl blur opacity-30"></div>
                    )}
                    <span className="relative">{section.title.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Usuario mejorado */}
            <div className="flex items-center space-x-4">
              <div
                onClick={handleLogout} 
                className="flex items-center space-x-3 bg-white bg-opacity-10 backdrop-blur-sm rounded-full px-4 py-2 border border-white border-opacity-20 cursor-pointer hover:bg-opacity-20 transition"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-inner">
                  <User size={20} className="text-white" />
                </div>
                <div className="text-right">
                  <p className="text-white font-medium text-sm">Admin Usuario</p>
                  <p className="text-gray-400 text-xs">Administrador</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Header de Sección */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-2 h-12 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {sections[activeSection].title}
          </h2>
        </div>
        
        {/* Contenido Principal */}
        {sections[activeSection].component()}
      </div>

      {/* Modal de Email */}
     {/* ==== MODAL DETALLE CONTACTO ==== */}
<div
  className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition ${
    selectedEmail ? "block" : "hidden"
  }`}
>
  <div className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl shadow-lg text-white">
    {selectedEmail && (
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-orange-400 mb-4">Detalle del Contacto</h3>

        <p><span className="font-semibold text-gray-300">Nombre:</span> {selectedEmail.name}</p>
        <p><span className="font-semibold text-gray-300">Correo:</span> {selectedEmail.email}</p>
        {selectedEmail.company && (
          <p><span className="font-semibold text-gray-300">Empresa:</span> {selectedEmail.company}</p>
        )}
        {selectedEmail.phone && (
          <p><span className="font-semibold text-gray-300">Teléfono:</span> {selectedEmail.phone}</p>
        )}
        {selectedEmail.projectType && (
          <p><span className="font-semibold text-gray-300">Tipo de Proyecto:</span> {selectedEmail.projectType}</p>
        )}

        <p><span className="font-semibold text-gray-300">Mensaje:</span></p>
        <div className="p-4 bg-gray-800 rounded-lg text-gray-200 max-h-60 overflow-y-auto">
          {selectedEmail.message}
        </div>

        <p className="text-sm text-gray-500">
          {selectedEmail.createdAt ? new Date(selectedEmail.createdAt).toLocaleString() : ""}
        </p>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => setSelectedEmail(null)}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    )}
  </div>
</div>

      {/* ==== MODAL EDITAR USUARIO (versión persistente) ==== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition ${selectedUser ? "block" : "hidden"}`}>
        <div className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl shadow-lg">
          {editUserForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch(`http://localhost:5000/api/user/users/${selectedUser}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editUserForm),
                  });
                  const data = await res.json();
                  setUsers(users.map((u) => (u._id === selectedUser ? data.user : u)));
                  setSelectedUser(null);
                  setEditUserForm({});
                } catch (err) {
                  console.error("Error al actualizar usuario:", err);
                }
              }}
              className="text-white space-y-6"
            >
              <h3 className="text-2xl font-bold text-orange-400 mb-6">Editar Usuario</h3>

              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={editUserForm.firstName || ""} onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })} placeholder="Nombre" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="text" value={editUserForm.lastName || ""} onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })} placeholder="Apellido" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="email" value={editUserForm.email || ""} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} placeholder="Correo" className="col-span-2 p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="text" value={editUserForm.phone || ""} onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })} placeholder="Teléfono" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="text" value={editUserForm.role || ""} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })} placeholder="Rol" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
              </div>

              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => { setSelectedUser(null); setEditUserForm({}); }} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">Guardar Cambios</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal Confirmación de Eliminación */}
      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)}>
        {userToDelete && (
          <div className="text-white space-y-6">
            <h3 className="text-2xl font-bold text-red-400">¿Eliminar Usuario?</h3>
            <p className="text-gray-300">
              Estás a punto de eliminar al usuario <span className="font-semibold text-white">
                {userToDelete.firstName} {userToDelete.lastName}
              </span>. 
              Esta acción no se puede deshacer.
            </p>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`http://localhost:5000/api/user/users/${userToDelete._id}`, {
                      method: "DELETE",
                    });
                    setUsers(users.filter((u) => u._id !== userToDelete._id));
                    setUserToDelete(null);
                  } catch (error) {
                    console.error("Error al eliminar usuario:", error);
                  }
                }}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Proyecto */}
      <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)}>
        {selectedProject && (
          <div className="text-white">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                <Building2 size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedProject.title}</h3>
                <p className="text-orange-400">Detalles del Proyecto</p>
              </div>
            </div>

            <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white border-opacity-10 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Cliente (Email):</p>
                  <p className="text-gray-200">{selectedProject.email}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Ubicación:</p>
                  <p className="text-gray-200">{selectedProject.location}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Tipo:</p>
                  <p className="text-gray-200">{selectedProject.type}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Presupuesto:</p>
                  <p className="text-gray-200 font-bold">${selectedProject.budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Duración (meses):</p>
                  <p className="text-gray-200">{selectedProject.duration}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Prioridad:</p>
                  <p className="text-gray-200 capitalize">{selectedProject.priority}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Estado:</p>
                  <p className="text-gray-200 capitalize">{selectedProject.status}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Fecha Inicio:</p>
                  <p className="text-gray-200">{new Date(selectedProject.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Fecha Fin:</p>
                  <p className="text-gray-200">{new Date(selectedProject.endDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Progreso */}
              <div className="mb-6">
                <p className="text-orange-400 font-semibold">Progreso del Proyecto:</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-4">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-1000 shadow-lg"
                      style={{ width: `${selectedProject.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-bold">{selectedProject.progress}%</span>
                </div>
              </div>

              {/* Equipo */}
              <div>
                <p className="text-orange-400 font-semibold text-sm mb-2">Equipo Asignado:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.team.map((member, index) => (
                    <span key={index} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm">
                      {member}
                    </span>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-orange-400 font-semibold text-sm mb-2">Descripción:</p>
                <p className="text-gray-200">{selectedProject.description}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ==== MODAL EDITAR PROYECTO (versión persistente) ==== */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition ${projectToEdit ? "block" : "hidden"}`}>
        <div className="bg-gray-900 rounded-xl p-8 w-full max-w-3xl shadow-lg overflow-y-auto max-h-[90vh]">
          {editProjectForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch(`http://localhost:5000/api/proyectos/${projectToEdit}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editProjectForm),
                  });
                  const data = await res.json();
                  setProjects(projects.map((p) => (p._id === projectToEdit ? data.proyecto : p)));
                  setProjectToEdit(null);
                  setEditProjectForm({});
                } catch (err) {
                  console.error("Error al actualizar proyecto:", err);
                }
              }}
              className="text-white space-y-6"
            >
              <h3 className="text-2xl font-bold text-orange-400 mb-6">Editar Proyecto</h3>

              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={editProjectForm.title || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, title: e.target.value })} placeholder="Título" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="text" value={editProjectForm.location || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, location: e.target.value })} placeholder="Ubicación" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="text" value={editProjectForm.type || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, type: e.target.value })} placeholder="Tipo" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="number" value={editProjectForm.budget || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, budget: e.target.value })} placeholder="Presupuesto" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="number" value={editProjectForm.duration || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, duration: e.target.value })} placeholder="Duración (meses)" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="text" value={editProjectForm.priority || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, priority: e.target.value })} placeholder="Prioridad" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="date" value={editProjectForm.startDate ? editProjectForm.startDate.substring(0,10) : ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, startDate: e.target.value })} className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="date" value={editProjectForm.endDate ? editProjectForm.endDate.substring(0,10) : ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, endDate: e.target.value })} className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="email" value={editProjectForm.email || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, email: e.target.value })} placeholder="Correo del Cliente" className="col-span-2 p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="text" value={editProjectForm.status || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, status: e.target.value })} placeholder="Estado" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
                <input type="number" value={editProjectForm.progress || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, progress: e.target.value })} placeholder="Progreso (%)" className="p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"/>
              </div>

              <textarea value={editProjectForm.description || ""} onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })} placeholder="Descripción" className="w-full p-3 rounded-lg bg-gray-800 border border-white/20 focus:border-orange-400"></textarea>

              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => { setProjectToEdit(null); setEditProjectForm({}); }} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">Guardar Cambios</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal Confirmar Eliminación Proyecto */}
      <Modal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)}>
        {projectToDelete && (
          <div className="text-white space-y-6">
            <h3 className="text-2xl font-bold text-red-400">¿Eliminar Proyecto?</h3>
            <p className="text-gray-300">
              El proyecto <span className="font-semibold text-white">{projectToDelete.title}</span> será eliminado permanentemente.
            </p>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`http://localhost:5000/api/proyectos/${projectToDelete._id}`, {
                      method: "DELETE",
                    });
                    setProjects(projects.filter((p) => p._id !== projectToDelete._id));
                    setProjectToDelete(null);
                  } catch (error) {
                    console.error("Error al eliminar proyecto:", error);
                  }
                }}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;