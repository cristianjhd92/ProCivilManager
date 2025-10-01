import React, { useState, useEffect } from 'react';
import Header from '../components/NavBar';
import Fotter from '../components/Fotter';

const ContactPage = () => {
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    projectType: '',
    message: ''
  });

  const [feedbackMessage, setFeedbackMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // Intersection Observer para animaciones de scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    const sections = document.querySelectorAll('[data-fade-in]');
    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación simple antes de enviar
    if (!formData.name || !formData.email || !formData.message) {
      setFeedbackMessage({ type: 'error', text: 'Por favor completa los campos Nombre, Email y Mensaje.' });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      //console.log('Respuesta del servidor:', data);

      if (response.ok) {
        setFeedbackMessage({ type: 'success', text: data.message || 'Formulario enviado con éxito' });
        setFormData({
          name: '',
          email: '',
          company: '',
          phone: '',
          projectType: '',
          message: ''
        });
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Error al enviar el formulario' });
      }
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: 'Error al enviar el formulario. Intenta más tarde.' });
      console.error(error);
    }
  };

  // Auto ocultar el mensaje de feedback después de 4 segundos
  useEffect(() => {
    if (feedbackMessage) {
      const timeout = setTimeout(() => {
        setFeedbackMessage(null);
      }, 4000); // Oculta mensaje después de 4 segundos
  
      return () => clearTimeout(timeout);
    }
  }, [feedbackMessage]);
  
  

  return (
    <div className="font-sans leading-relaxed text-gray-800 overflow-x-hidden min-h-screen">
        <Header />
      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex items-center overflow-hidden">
        {/* Animated Grid Background */}
        <div 
          className="absolute inset-0 opacity-5 animate-pulse"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating Elements */}
        <div className="absolute w-20 h-20 bg-orange-500 bg-opacity-10 rounded-full top-1/5 left-1/12 animate-bounce" style={{ animationDelay: '0s', animationDuration: '6s' }} />
        <div className="absolute w-30 h-30 bg-orange-500 bg-opacity-10 rounded-full top-3/5 right-1/6 animate-bounce" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute w-15 h-15 bg-orange-500 bg-opacity-10 rounded-full bottom-1/5 left-1/5 animate-bounce" style={{ animationDelay: '4s', animationDuration: '6s' }} />

        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Contact Info */}
          <div className="text-white animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              ¿Listo para{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                Transformar
              </span>{' '}
              tu Proyecto?
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Conecta con nuestro equipo de expertos y descubre cómo podemos 
              optimizar la gestión de tus proyectos de construcción.
            </p>

            {/* Contact Methods */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center">
                  📧
                </div>
                <div>
                  <p className="text-white font-semibold">Email</p>
                  <p className="text-gray-300">contacto@gestionproyectos.com</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center">
                  📱
                </div>
                <div>
                  <p className="text-white font-semibold">Teléfono</p>
                  <p className="text-gray-300">+57 (1) 234-5678</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center">
                  📍
                </div>
                <div>
                  <p className="text-white font-semibold">Oficina</p>
                  <p className="text-gray-300">Bogotá, Colombia</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-15 bg-gradient-to-r from-orange-500 to-orange-400 rounded-t-3xl"></div>
              
              <div className="pt-10">
                <h3 className="text-white text-2xl font-semibold mb-8 text-center">
                  Solicitar Información
                </h3>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="name"
                        placeholder="Nombre completo"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        name="company"
                        placeholder="Empresa"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Teléfono"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                    >
                      <option value="" className="text-gray-800">Tipo de proyecto</option>
                      <option value="residencial" className="text-gray-800">Residencial</option>
                      <option value="comercial" className="text-gray-800">Comercial</option>
                      <option value="industrial" className="text-gray-800">Industrial</option>
                      <option value="infraestructura" className="text-gray-800">Infraestructura</option>
                    </select>
                  </div>

                  <div>
                    <textarea
                      name="message"
                      placeholder="Cuéntanos sobre tu proyecto..."
                      rows="4"
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm resize-none"
                    ></textarea>
                  </div>

                  <button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-1 transition-all duration-300"
                  >
                    Enviar Mensaje
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section 
        id="why-choose"
        data-fade-in
        className={`py-32 bg-gray-50 transition-all duration-700 ${
          visibleSections.has('why-choose') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              ¿Por Qué Elegirnos?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nos especializamos en brindar soluciones integrales para la gestión 
              de proyectos de construcción con tecnología de vanguardia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Implementación Rápida',
                description: 'Configuración completa en menos de 24 horas. Comienza a gestionar tus proyectos inmediatamente.'
              },
              {
                icon: '🎯',
                title: 'Soporte Especializado',
                description: 'Equipo de expertos en construcción disponible 24/7 para resolver cualquier consulta técnica.'
              },
              {
                icon: '🔒',
                title: 'Seguridad Garantizada',
                description: 'Protección de datos con certificaciones internacionales y respaldos automáticos diarios.'
              }
            ].map((reason, index) => (
              <div
                key={index}
                className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group text-center"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400"></div>
                
                <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center text-3xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  {reason.icon}
                </div>
                
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                  {reason.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Response Time Section */}
      <section 
        id="response-time"
        data-fade-in
        className={`py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white transition-all duration-700 ${
          visibleSections.has('response-time') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Tiempo de Respuesta Garantizado
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Nos comprometemos a responder todas las consultas en tiempo récord
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { time: '< 2 horas', label: 'Consultas Generales', icon: '💬' },
              { time: '< 30 min', label: 'Soporte Técnico', icon: '🔧' },
              { time: '< 24 horas', label: 'Propuestas Comerciales', icon: '📋' }
            ].map((item, index) => (
              <div key={index} className="group">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent mb-2">
                  {item.time}
                </h3>
                <p className="text-gray-300">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Fotter />

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .w-15 { width: 60px; }
        .h-15 { height: 60px; }
        .w-30 { width: 120px; }
        .h-30 { height: 120px; }
        .w-20 { width: 80px; }
        .h-20 { height: 80px; }
      `}</style>
    </div>
  );
};

export default ContactPage;