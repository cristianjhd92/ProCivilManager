import React, { useState, useEffect } from 'react';
import Header from '../components/NavBar';
import Footer from '../components/Fotter';

const Proyectos = () => {
  const [projects, setProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleSections, setVisibleSections] = useState(new Set());

  useEffect(() => {
    fetch('http://localhost:5000/api/proyectos')
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error('Error al obtener proyectos:', err));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const sections = document.querySelectorAll('[data-fade-in]');
    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  }, [projects]);

  const getStatusText = (status) => {
    const statusTexts = {
      'active': 'En Progreso',
      'planning': 'Planificación',
      'completed': 'Completado'
    };
    return statusTexts[status] || 'Desconocido';
  };

  const filteredProjects = projects.filter(project => {
    const matchesStatus = !statusFilter || project.status === statusFilter;
    const matchesType = !typeFilter || project.type === typeFilter;
    const matchesSearch = !searchQuery ||
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesType && matchesSearch;
  });

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setSearchQuery('');
  };

  const ProjectCard = ({ project }) => (
    <div
      data-fade-in
      id={`project-${project.id}`}
      className={`group relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 space-y-6 transition-all duration-700 hover:scale-[1.02] hover:shadow-2xl hover:bg-white border border-gray-100/50 overflow-hidden ${
        visibleSections.has(`project-${project.id}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      {/* Gradiente de fondo sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
      
      {/* Contenido */}
      <div className="relative z-10">
        {/* Badge de estado mejorado */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-md ${
          project.status === 'active' ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200' :
          project.status === 'planning' ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200' :
          'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            project.status === 'active' ? 'bg-emerald-500 animate-pulse' :
            project.status === 'planning' ? 'bg-amber-500' :
            'bg-blue-500'
          }`}></div>
          {getStatusText(project.status)}
        </div>

        {/* Título con mejor tipografía */}
        <h3 className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors duration-300">
          {project.title}
        </h3>

        {/* Ubicación mejorada */}
        <div className="flex items-center gap-3 text-gray-700">
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
            <span className="text-orange-600 text-sm">📍</span>
          </div>
          <span className="font-medium">{project.location}</span>
        </div>

        {/* Descripción con mejor espaciado */}
        <p className="text-gray-600 leading-relaxed line-clamp-3">{project.description}</p>

        {/* Stats mejorados */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900 mb-1">{project.budget}</p>
            <p className="text-sm text-gray-600 font-medium">Presupuesto</p>
          </div>
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900 mb-1">{project.duration}</p>
            <p className="text-sm text-gray-600 font-medium">Duración</p>
          </div>
        </div>

        {/* Barra de progreso mejorada */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Progreso del Proyecto</span>
            <span className="text-lg font-bold text-orange-600">{project.progress}%</span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-1000 ease-out shadow-sm"
              style={{ width: `${project.progress}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full opacity-50"></div>
          </div>
        </div>

        {/* Team section mejorado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {project.team.slice(0, 4).map((member, idx) => (
                <div
                  key={idx}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold shadow-lg border-3 border-white ring-2 ring-orange-100 transition-transform duration-200 hover:scale-110"
                  title={`Miembro: ${member}`}
                >
                  {member}
                </div>
              ))}
              {project.team.length > 4 && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 flex items-center justify-center font-bold shadow-lg border-3 border-white ring-2 ring-gray-100">
                  +{project.team.length - 4}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Equipo</p>
            <p className="font-bold text-gray-900">{project.team.length} miembros</p>
          </div>
        </div>
      </div>

      {/* Decoración hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100/50 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500 opacity-0 group-hover:opacity-100"></div>
    </div>
  );

  return (
    <div className="font-sans bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen overflow-x-hidden">
      <Header />

      {/* Hero Section Mejorado */}
      <section
        style={{ 
          background: 'linear-gradient(135deg, #0B1120 0%, #1a2332 50%, #2a3441 100%)',
          paddingTop: '7rem', 
          paddingBottom: '4rem' 
        }}
        className="relative overflow-hidden"
      >
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-20 left-1/3 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          {/* Título con animación mejorada */}
          <h1 className="text-6xl md:text-7xl font-black mb-8 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 block mb-2">
              Nuestros
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
              Proyectos
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-16 leading-relaxed font-light">
            Descubre los proyectos de construcción que hemos gestionado exitosamente con 
            <span className="font-semibold text-orange-400"> ProBuild</span>. 
            Cada uno representa nuestra dedicación a la excelencia y la innovación.
          </p>

          {/* Filtros rediseñados */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="flex flex-wrap justify-center items-center gap-8">
              {/* Filtro de Estado */}
              <div className="flex flex-col items-start gap-2">
                <label htmlFor="status" className="font-bold text-white text-sm tracking-wide">
                  ESTADO
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/90 backdrop-blur rounded-xl border-0 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-orange-400/50 text-gray-800 font-medium shadow-lg min-w-[150px] transition-all duration-300"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">En Progreso</option>
                  <option value="planning">Planificación</option>
                  <option value="completed">Completado</option>
                </select>
              </div>

              {/* Filtro de Tipo */}
              <div className="flex flex-col items-start gap-2">
                <label htmlFor="type" className="font-bold text-white text-sm tracking-wide">
                  TIPO
                </label>
                <select
                  id="type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white/90 backdrop-blur rounded-xl border-0 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-orange-400/50 text-gray-800 font-medium shadow-lg min-w-[150px] transition-all duration-300"
                >
                  <option value="">Todos los tipos</option>
                  <option value="residential">Residencial</option>
                  <option value="commercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>

              {/* Buscador */}
              <div className="flex flex-col items-start gap-2">
                <label className="font-bold text-white text-sm tracking-wide">
                  BUSCAR
                </label>
                <input
                  type="text"
                  placeholder="Nombre del proyecto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/90 backdrop-blur rounded-xl border-0 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-orange-400/50 text-gray-800 font-medium shadow-lg min-w-[200px] placeholder-gray-500 transition-all duration-300"
                />
              </div>

              {/* Botón limpiar */}
              <div className="flex flex-col justify-end h-full">
                <button
                  onClick={clearFilters}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 mt-6"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de proyectos mejorado */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {filteredProjects.map(project => (
              <ProjectCard key={project._id || project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl text-gray-400">🔍</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">No se encontraron proyectos</h3>
            <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
              Intenta ajustar los filtros o realizar una búsqueda diferente para encontrar los proyectos que buscas.
            </p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Proyectos;