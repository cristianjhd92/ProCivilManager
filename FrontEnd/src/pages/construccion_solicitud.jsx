import React, { useState, useEffect } from 'react';
import Header from '../components/NavBar';
import Footer from '../components/Fotter';

const ProjectRegistrationForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    type: '',
    budget: '',
    duration: '',
    description: '',
    priority: 'medium',
    startDate: '',
    endDate: '',
    email: '',      
    team: []           
  });
  

  const [teamMember, setTeamMember] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formProgress, setFormProgress] = useState(0);

  const projectTypes = [
    { value: 'residential', label: 'Residencial', icon: '🏠', color: 'from-blue-500 to-blue-400' },
    { value: 'commercial', label: 'Comercial', icon: '🏢', color: 'from-green-500 to-green-400' },
    { value: 'industrial', label: 'Industrial', icon: '🏭', color: 'from-purple-500 to-purple-400' },
    { value: 'infrastructure', label: 'Infraestructura', icon: '🛤️', color: 'from-red-500 to-red-400' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Baja', color: 'bg-green-500', icon: '🟢' },
    { value: 'medium', label: 'Media', color: 'bg-yellow-500', icon: '🟡' },
    { value: 'high', label: 'Alta', color: 'bg-red-500', icon: '🔴' }
  ];

  const steps = [
    { number: 1, title: 'Información Básica', icon: '📋' },
    { number: 2, title: 'Detalles del Proyecto', icon: '🔧' },
    { number: 3, title: 'Equipo y Finalización', icon: '👥' }
  ];

  // Calcular progreso del formulario
  useEffect(() => {
    const fields = ['title', 'location', 'type', 'budget'];
    const completed = fields.filter(field => formData[field]).length;
    setFormProgress((completed / fields.length) * 100);
  }, [formData]);

  // Auto-ocultar mensajes
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addTeamMember = () => {
    if (teamMember.trim() && !formData.team.includes(teamMember.trim())) {
      setFormData(prev => ({
        ...prev,
        team: [...prev.team, teamMember.trim()]
      }));
      setTeamMember('');
    }
  };

  const removeTeamMember = (memberToRemove) => {
    setFormData(prev => ({
      ...prev,
      team: prev.team.filter(member => member !== memberToRemove)
    }));
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
  
    // Validación de campos obligatorios
    if (!formData.title || !formData.location || !formData.type || !formData.budget || !formData.email) {
      setMessage({ type: 'error', text: 'Por favor completa los campos obligatorios' });
      setIsSubmitting(false);
      setCurrentStep(1);
      return;
    }
  
    try {
      // Preparar datos (convertir tipos si es necesario)
      const projectData = {
        ...formData,
        budget: Number(formData.budget),
        duration: Number(formData.duration || 0),
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        progress: 0,
        status: 'planning'
      };
  
    // console.log("🚀 Enviando proyecto al backend:", projectData);
  
      const response = await fetch('http://localhost:5000/api/proyectos/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });
  
      const result = await response.json();
  
      if (response.ok) {
     //  console.log("✅ Proyecto guardado en backend:", result);
        setMessage({ type: 'success', text: 'Proyecto registrado exitosamente' });
  
        // Resetear formulario
        setFormData({
          title: '',
          location: '',
          type: '',
          budget: '',
          duration: '',
          description: '',
          team: [],
          priority: 'medium',
          startDate: '',
          endDate: '',
          email: ''
        });
        setCurrentStep(1);
        setFormProgress(0);
      } else {
     // console.error("❌ Error desde el backend:", result);
        setMessage({ type: 'error', text: result.message || 'Error al registrar el proyecto' });
      }
  
    } catch (error) {
   // console.error('❌ Error al enviar proyecto:', error);
      setMessage({ type: 'error', text: 'Error de conexión al backend' });
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const getSelectedProjectType = () => {
    return projectTypes.find(type => type.value === formData.type);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Información Básica del Proyecto</h3>
              <p className="text-gray-300 text-sm">Completa los datos principales de tu obra</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="text"
                  name="title"
                  placeholder="Título del proyecto *"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm transition-all duration-300"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-400">
                  {formData.title && '✓'}
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  name="location"
                  placeholder="Ubicación *"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm transition-all duration-300"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-400">
                  {formData.location && '✓'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-white font-medium">Tipo de Proyecto *</p>
              <div className="grid grid-cols-2 gap-3">
                {projectTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      formData.type === type.value
                        ? `bg-gradient-to-r ${type.color} border-orange-400 transform scale-105`
                        : 'bg-white/10 border-white/30 hover:border-orange-400/50 hover:bg-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="text-white font-medium text-sm">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              name="budget"
              placeholder="Presupuesto (ej: $1.5M) *"
              value={formData.budget}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm"
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Detalles del Proyecto</h3>
              <p className="text-gray-300 text-sm">Especifica los detalles técnicos y temporales</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="duration"
                placeholder="Duración estimada (ej: 12 meses)"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm"
              />
              
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Prioridad</label>
                <div className="flex gap-2">
                  {priorityLevels.map(priority => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        formData.priority === priority.value
                          ? `${priority.color} text-white transform scale-105`
                          : 'bg-white/20 text-gray-300 hover:bg-white/30'
                      }`}
                    >
                      {priority.icon} {priority.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Fecha de Inicio</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm"
                />
              </div>
              
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Fecha Estimada de Fin</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm"
                />
              </div>
            </div>

            <textarea
              name="description"
              placeholder="Descripción detallada del proyecto..."
              rows="4"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm resize-none"
            />
          </div>
        );

        case 3:
          return (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">email del Responsable</h3>
                <p className="text-gray-300 text-sm">Ingresa el email del usuario que registra la obra</p>
              </div>
        
              <div className="space-y-4">
                <input
                  type="email"
                  name="email"
                  placeholder="email electrónico *"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm"
                  required
                />
              </div>
        
              {/* Resumen del proyecto */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-white font-semibold mb-4">📋 Resumen del Proyecto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Título:</p>
                    <p className="text-white">{formData.title || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Ubicación:</p>
                    <p className="text-white">{formData.location || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tipo:</p>
                    <p className="text-white flex items-center gap-2">
                      {getSelectedProjectType()?.icon} {getSelectedProjectType()?.label || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Presupuesto:</p>
                    <p className="text-white">{formData.budget || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">email:</p>
                    <p className="text-white">{formData.email || 'No especificado'}</p>
                  </div>
                </div>
              </div>
            </div>
          );
      default:
        return null;
    }
  };

  return (
<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 pt-24 px-4 relative overflow-hidden">
  <Header />
      {/* Elementos decorativos animados */}
      <div className="absolute w-64 h-64 bg-orange-500/5 rounded-full top-10 left-10 animate-pulse"></div>
      <div className="absolute w-48 h-48 bg-orange-500/5 rounded-full bottom-10 right-10 animate-bounce" style={{ animationDuration: '3s' }}></div>
      <div className="absolute w-32 h-32 bg-orange-500/5 rounded-full top-1/2 right-1/4 animate-ping" style={{ animationDuration: '4s' }}></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header con progreso */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
            Registrar Nueva Obra
          </h1>
          
          {/* Barra de progreso */}
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-white/20 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${formProgress}%` }}
              ></div>
            </div>
            <p className="text-gray-300 text-sm">{Math.round(formProgress)}% completado</p>
          </div>

          {/* Steps indicator */}
          <div className="flex justify-center space-x-8 mb-8">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-300 ${
                  currentStep >= step.number
                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white'
                    : 'bg-white/20 text-gray-400'
                }`}>
                  {step.icon}
                </div>
                <p className={`text-xs mt-2 ${currentStep >= step.number ? 'text-white' : 'text-gray-400'}`}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-orange-400 rounded-t-3xl"></div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl text-center transition-all duration-300 ${
              message.type === 'success' 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {message.text}
            </div>
          )}

          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                currentStep === 1
                  ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              ← Anterior
            </button>

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-1 transition-all duration-300"
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                    : 'bg-gradient-to-r from-green-500 to-green-400 hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-1'
                } text-white`}
              >
                {isSubmitting ? '🔄 Registrando...' : '✓ Registrar Proyecto'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectRegistrationForm;