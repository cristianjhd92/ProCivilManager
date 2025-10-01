
import React, { useState, useEffect } from 'react';
import Header from '../components/NavBar';
import Fotter from '../components/Fotter';

const ConstructionHistory = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  const API_URL = 'http://localhost:5000/api/proyectos'; // Cambia por tu API

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          setError('No autenticado. Por favor inicia sesión.');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/mis-proyectos`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Token inválido o expirado. Por favor inicia sesión de nuevo.');
          } else {
            setError('Error al obtener proyectos.');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setProjects(data);
      } catch (err) {
        setError('Error en la conexión con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Filtrado y búsqueda
  const filteredProjects = projects.filter(project => {
    const matchesFilter = filter === 'all' || project.status === filter;
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Configuraciones UI con fallback para evitar undefined
  const projectTypes = {
    residential: { label: 'Residencial', icon: '🏠', color: 'from-emerald-500 via-teal-400 to-cyan-400' },
    commercial: { label: 'Comercial', icon: '🏢', color: 'from-blue-500 via-indigo-400 to-purple-400' },
    industrial: { label: 'Industrial', icon: '🏭', color: 'from-orange-500 via-red-400 to-pink-400' },
    infrastructure: { label: 'Infraestructura', icon: '🛤️', color: 'from-amber-500 via-yellow-400 to-orange-400' }
  };

  const priorityConfig = {
    low: { label: 'Baja', color: 'bg-gradient-to-r from-green-500 to-emerald-500', textColor: 'text-green-100', shadowColor: 'shadow-green-500/30' },
    medium: { label: 'Media', color: 'bg-gradient-to-r from-yellow-500 to-amber-500', textColor: 'text-yellow-100', shadowColor: 'shadow-yellow-500/30' },
    high: { label: 'Alta', color: 'bg-gradient-to-r from-red-500 to-rose-500', textColor: 'text-red-100', shadowColor: 'shadow-red-500/30' }
  };

  const statusConfig = {
    pending: { label: 'Pendiente', color: 'bg-gradient-to-r from-gray-500 to-slate-500', textColor: 'text-gray-100', shadowColor: 'shadow-gray-500/30' },
    planning: { label: 'Planificación', color: 'bg-gradient-to-r from-purple-500 to-pink-500', textColor: 'text-purple-100', shadowColor: 'shadow-purple-500/30' }, // NUEVO
    active: { label: 'En Progreso', color: 'bg-gradient-to-r from-blue-500 to-indigo-500', textColor: 'text-blue-100', shadowColor: 'shadow-blue-500/30' },
    completed: { label: 'Completado', color: 'bg-gradient-to-r from-green-500 to-emerald-500', textColor: 'text-green-100', shadowColor: 'shadow-green-500/30' }
  };
  

  // Componente para cada tarjeta de proyecto
  const ProjectCard = ({ project }) => {
    const projectTypeConfig = projectTypes[project.type] || { color: 'from-gray-500 to-gray-400', icon: '❓' };
    const priorityConf = priorityConfig[project.priority] || { label: 'Desconocida', color: 'bg-gradient-to-r from-gray-500 to-slate-500', textColor: 'text-gray-100', shadowColor: 'shadow-gray-500/30' };
    const statusConf = statusConfig[project.status] || { label: 'Desconocido', color: 'bg-gradient-to-r from-gray-500 to-slate-500', textColor: 'text-gray-100', shadowColor: 'shadow-gray-500/30' };

    return (
      
      <div className="group relative">
        <div 
          className="bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all duration-500 cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20 relative overflow-hidden"
          onClick={() => setSelectedProject(project)}
        >
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${projectTypeConfig.color} flex items-center justify-center text-2xl shadow-xl transform group-hover:scale-110 transition-transform duration-300`}>
                  {projectTypeConfig.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl mb-1 group-hover:text-blue-200 transition-colors duration-300">{project.title}</h3>
                  <p className="text-gray-300 text-sm flex items-center">
                    <span className="mr-2">📍</span> 
                    {project.location}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-3">
                <span className={`px-4 py-2 rounded-full text-xs font-semibold ${statusConf.color} ${statusConf.textColor} shadow-lg ${statusConf.shadowColor} backdrop-blur-sm`}>
                  {statusConf.label}
                </span>
                <span className={`px-3 py-1 rounded-xl text-xs font-medium ${priorityConf.color} ${priorityConf.textColor} shadow-md ${priorityConf.shadowColor}`}>
                  {priorityConf.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-1 font-medium">💰 Presupuesto:</p>
                <p className="text-white font-bold text-lg">{project.budget}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-1 font-medium">⏱️ Duración:</p>
                <p className="text-white font-bold text-lg">{project.duration}</p>
              </div>
            </div>

            {project.status === 'active' && (
              <div className="mb-6 bg-white/5 rounded-2xl p-5 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-300 text-sm font-medium flex items-center">
                    <span className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></span>
                    Progreso del Proyecto
                  </span>
                  <span className="text-orange-400 font-bold text-lg">{project.progress}%</span>
                </div>
                <div className="bg-white/10 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 h-3 rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden"
                    style={{ width: `${project.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/5 rounded-2xl p-4 mb-5 border border-white/10">
              <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{project.description}</p>
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t border-white/10">
              <span className="flex items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                Creado: {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center group-hover:text-blue-300 transition-colors duration-300">
                Ver detalles 
                <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal para mostrar detalles del proyecto seleccionado
  const ProjectModal = ({ project, onClose }) => {
    const projectTypeConfig = projectTypes[project.type] || { color: 'from-gray-500 to-gray-400', icon: '❓' };
    const priorityConf = priorityConfig[project.priority] || { label: 'Desconocida', color: 'bg-gradient-to-r from-gray-500 to-slate-500', textColor: 'text-gray-100', shadowColor: 'shadow-gray-500/30' };
    const statusConf = statusConfig[project.status] || { label: 'Desconocido', color: 'bg-gradient-to-r from-gray-500 to-slate-500', textColor: 'text-gray-100', shadowColor: 'shadow-gray-500/30' };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-blue-900/95 backdrop-blur-2xl rounded-3xl p-10 max-w-4xl w-full border border-white/20 relative max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-all duration-300 bg-white/10 rounded-full p-2 hover:bg-white/20 hover:rotate-90 transform"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${projectTypeConfig.color} flex items-center justify-center text-3xl mx-auto mb-6 shadow-2xl`}>
              {projectTypeConfig.icon}
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">{project.title}</h2>
            <p className="text-gray-300 text-lg flex items-center justify-center">
              <span className="mr-2">📍</span> 
              {project.location}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 backdrop-blur-sm">
              <h4 className="text-white font-bold mb-5 text-lg flex items-center">
                <span className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">📊</span>
                Información General
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400 font-medium">Tipo:</span>
                  <span className="text-white font-semibold">{projectTypeConfig.label}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400 font-medium">Presupuesto:</span>
                  <span className="text-white font-bold text-lg">{project.budget}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400 font-medium">Duración:</span>
                  <span className="text-white font-bold text-lg">{project.duration}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 font-medium">Prioridad:</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-medium ${priorityConf.color} ${priorityConf.textColor}`}>
                    {priorityConf.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 backdrop-blur-sm">
              <h4 className="text-white font-bold mb-5 text-lg flex items-center">
                <span className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center mr-3 text-sm">📅</span>
                Cronograma
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400 font-medium">Inicio:</span>
                  <span className="text-white font-semibold">{new Date(project.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400 font-medium">Fin estimado:</span>
                  <span className="text-white font-semibold">{new Date(project.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 font-medium">Estado:</span>
                  <span className={`px-4 py-2 rounded-full text-xs font-semibold ${statusConf.color} ${statusConf.textColor} shadow-lg`}>
                    {statusConf.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {project.status === 'active' && (
            <div className="mb-8 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-2xl p-6 border border-orange-500/20">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-300 font-medium flex items-center text-lg">
                  <span className="w-3 h-3 bg-orange-400 rounded-full mr-3 animate-pulse"></span>
                  Progreso del Proyecto
                </span>
                <span className="text-orange-400 font-bold text-2xl">{project.progress}%</span>
              </div>
              <div className="bg-white/20 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 h-4 rounded-full transition-all duration-1000 shadow-lg relative overflow-hidden"
                  style={{ width: `${project.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 backdrop-blur-sm">
            <h4 className="text-white font-bold mb-5 text-lg flex items-center">
              <span className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center mr-3 text-sm">📝</span>
              Descripción Detallada
            </h4>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-base">{project.description}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-900 overflow-hidden">
       <Header />
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 p-8 mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-white via-blue-200 to-indigo-200 bg-clip-text text-transparent">
              Historial de Construcciones
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Gestiona y supervisa todos tus proyectos de construcción desde una vista centralizada
            </p>
          </div>

          {/* Controles de filtro y búsqueda */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-10 space-y-6 lg:space-y-0 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <label className="font-semibold text-white flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Filtrar por estado:
              </label>
              <select
                className="rounded-xl p-3 text-gray-900 bg-white shadow-lg border-0 focus:ring-2 focus:ring-blue-500 transition-all duration-300 font-medium"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="planning">Planificación</option>
                <option value="pending">Pendiente</option>
                <option value="active">En Progreso</option>
                <option value="completed">Completado</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por título o ubicación..."
                className="rounded-xl p-3 pl-12 w-full lg:w-80 text-gray-900 bg-white shadow-lg border-0 focus:ring-2 focus:ring-blue-500 transition-all duration-300 font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Mensajes de estado */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-center text-gray-300 text-lg">Cargando proyectos...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8 backdrop-blur-sm">
              <p className="text-center text-red-400 font-medium text-lg">{error}</p>
            </div>
          )}

          {/* Lista de proyectos */}
          {!loading && !error && filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🔍</span>
              </div>
              <p className="text-gray-300 text-xl font-medium">No se encontraron proyectos</p>
              <p className="text-gray-400 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProjects.map(project => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>

          {/* Modal con detalles del proyecto */}
          {selectedProject && (
            <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
          )}
        </div>
      </div>

      < Fotter />
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </section>

  );
};

export default ConstructionHistory;