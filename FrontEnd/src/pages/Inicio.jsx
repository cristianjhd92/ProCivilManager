import React, { useState, useEffect } from 'react';
import Header from '../components/NavBar';
import Fotter from '../components/Fotter';

const HomePage = () => {
  const [visibleSections, setVisibleSections] = useState(new Set());

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

    // Observar todas las secciones con fade-in
    const sections = document.querySelectorAll('[data-fade-in]');
    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-sans leading-relaxed text-gray-800 overflow-x-hidden">
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
          {/* Hero Text */}
          <div className="text-white animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Gestión de Proyectos{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                Inteligente
              </span>{' '}
              para Construcción
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Optimiza tus proyectos de construcción con nuestra plataforma avanzada. 
              Control total desde la planificación hasta la entrega final.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
            </div>
          </div>

          {/* Hero Visual - Dashboard Mockup */}
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 relative overflow-hidden">
              {/* Dashboard Header */}
              <div className="absolute top-0 left-0 right-0 h-15 bg-gradient-to-r from-orange-500 to-orange-400 rounded-t-3xl"></div>
              
              {/* Dashboard Content */}
              <div className="pt-10">
                <h4 className="text-white text-xl font-semibold mb-6">Dashboard de Proyectos</h4>
                
                {/* Project Progress Bars */}
                <div className="space-y-4">
                  <div>
                    <div className="text-white/70 text-sm mb-2">Proyecto Torre Central</div>
                    <div className="bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-full w-3/4 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-white/70 text-sm mb-2">Residencial Los Pinos</div>
                    <div className="bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-full w-11/25 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-white/70 text-sm mb-2">Complejo Comercial Norte</div>
                    <div className="bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-full w-9/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features"
        data-fade-in
        className={`py-32 bg-gray-50 transition-all duration-700 ${
          visibleSections.has('features') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Funciones Principales
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Todo lo que necesitas para gestionar tus proyectos de construcción 
              de manera eficiente y profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '📊',
                title: 'Dashboard Intuitivo',
                description: 'Visualiza el progreso de todos tus proyectos en tiempo real con gráficos interactivos y métricas clave.'
              },
              {
                icon: '👥',
                title: 'Gestión de Equipos',
                description: 'Administra roles, asigna tareas y mantén a todo tu equipo coordinado y productivo.'
              },
              {
                icon: '📅',
                title: 'Planificación Avanzada',
                description: 'Crea cronogramas detallados con dependencias, recursos y hitos críticos del proyecto.'
              },
              {
                icon: '💰',
                title: 'Control de Costos',
                description: 'Monitorea presupuestos, gastos reales y proyecciones financieras con precisión.'
              },
              {
                icon: '📱',
                title: 'App Móvil',
                description: 'Accede a toda la información desde el campo con nuestra aplicación móvil optimizada.'
              },
              {
                icon: '📋',
                title: 'Reportes Detallados',
                description: 'Genera informes automáticos de progreso, calidad y rendimiento para stakeholders.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400"></div>
                
                <div className="w-15 h-15 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        id="stats"
        data-fade-in
        className={`py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white transition-all duration-700 ${
          visibleSections.has('stats') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            {[
              { number: '500+', label: 'Proyectos Completados' },
              { number: '98%', label: 'Satisfacción del Cliente' },
              { number: '25%', label: 'Reducción en Tiempos' },
              { number: '24/7', label: 'Soporte Técnico' }
            ].map((stat, index) => (
              <div key={index} className="group">
                <h3 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </h3>
                <p className="text-lg text-gray-300">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Fotter />

      {/* Custom Styles for animations */}
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
        .w-11/25 { width: 45%; }
        .w-9/10 { width: 90%; }
      `}</style>
    </div>
  );
};

export default HomePage;