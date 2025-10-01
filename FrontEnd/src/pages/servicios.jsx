import React, { useState, useEffect } from 'react';
import Header from '../components/NavBar';
import Fotter from '../components/Fotter';

const ServicesPage = () => {
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

  const services = [
    {
      id: 'planificacion',
      icon: '📐',
      title: 'Planificación y Diseño',
      description: 'Desarrollo completo de planos, especificaciones técnicas y cronogramas de trabajo optimizados para cada proyecto.',
      features: [
        'Diseño arquitectónico y estructural',
        'Cronogramas detallados con dependencias',
        'Análisis de riesgos y contingencias',
        'Optimización de recursos y materiales'
      ]
    },
    {
      id: 'gestion',
      icon: '🏗️',
      title: 'Gestión de Obra',
      description: 'Supervisión completa del proyecto desde el inicio hasta la entrega, garantizando calidad y cumplimiento de plazos.',
      features: [
        'Supervisión técnica especializada',
        'Control de calidad en tiempo real',
        'Coordinación de contratistas',
        'Seguimiento de avance diario'
      ]
    },
    {
      id: 'presupuestos',
      icon: '💰',
      title: 'Control de Presupuestos',
      description: 'Análisis financiero detallado y control de costos para mantener tu proyecto dentro del presupuesto establecido.',
      features: [
        'Elaboración de presupuestos detallados',
        'Control de gastos en tiempo real',
        'Análisis de variaciones de costo',
        'Reportes financieros automáticos'
      ]
    },
    {
      id: 'consultoria',
      icon: '🎯',
      title: 'Consultoría Especializada',
      description: 'Asesoría técnica especializada para optimizar procesos, resolver problemas complejos y mejorar eficiencia.',
      features: [
        'Auditorías de procesos constructivos',
        'Optimización de metodologías',
        'Resolución de problemas técnicos',
        'Capacitación de equipos'
      ]
    },
    {
      id: 'tecnologia',
      icon: '📱',
      title: 'Soluciones Tecnológicas',
      description: 'Implementación de herramientas digitales avanzadas para modernizar y optimizar tus procesos constructivos.',
      features: [
        'Software de gestión personalizado',
        'Aplicaciones móviles para campo',
        'Integración con drones y BIM',
        'Automatización de reportes'
      ]
    },
    {
      id: 'mantenimiento',
      icon: '🔧',
      title: 'Mantenimiento Post-Entrega',
      description: 'Servicios de mantenimiento y soporte continuo para garantizar la durabilidad y funcionamiento óptimo.',
      features: [
        'Programas de mantenimiento preventivo',
        'Soporte técnico 24/7',
        'Garantías extendidas',
        'Actualizaciones y mejoras'
      ]
    }
  ];

  return (
    <div className="font-sans leading-relaxed text-gray-800 overflow-x-hidden">
    < Header />
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
        <div className="absolute w-20 h-20 bg-blue-500 bg-opacity-10 rounded-full top-1/5 left-1/12 animate-bounce" style={{ animationDelay: '0s', animationDuration: '6s' }} />
        <div className="absolute w-30 h-30 bg-blue-400 bg-opacity-10 rounded-full top-3/5 right-1/6 animate-bounce" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute w-15 h-15 bg-blue-600 bg-opacity-10 rounded-full bottom-1/5 left-1/5 animate-bounce" style={{ animationDelay: '4s', animationDuration: '6s' }} />

        <div className="max-w-7xl mx-auto px-8 text-center relative z-10">
          <div className="text-white animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Nuestros{' '}
              <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                Servicios
              </span>{' '}
              Especializados
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-4xl mx-auto">
              Ofrecemos soluciones integrales para la gestión de proyectos de construcción,
              desde la planificación inicial hasta el mantenimiento post-entrega.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section 
        id="services-grid"
        data-fade-in
        className={`py-32 bg-gray-50 transition-all duration-700 ${
          visibleSections.has('services-grid') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Servicios Profesionales
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Cada servicio está diseñado para maximizar la eficiencia y calidad de tus proyectos
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="bg-white rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden group"
              >
                {/* Service Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-white">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-15 h-15 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-center">{service.title}</h3>
                  <p className="text-blue-100 text-center">{service.description}</p>
                </div>

                {/* Service Content */}
                <div className="p-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Incluye:</h4>
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section 
        id="process"
        data-fade-in
        className={`py-24 bg-white transition-all duration-700 ${
          visibleSections.has('process') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Nuestro Proceso de Trabajo
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Seguimos una metodología probada que garantiza resultados exitosos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Consulta Inicial',
                description: 'Análisis detallado de requerimientos y objetivos del proyecto.'
              },
              {
                step: '02',
                title: 'Propuesta',
                description: 'Desarrollo de propuesta técnica y económica personalizada.'
              },
              {
                step: '03',
                title: 'Implementación',
                description: 'Ejecución del proyecto con seguimiento continuo y control de calidad.'
              },
              {
                step: '04',
                title: 'Entrega',
                description: 'Finalización del proyecto y soporte post-entrega garantizado.'
              }
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/30">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta"
        data-fade-in
        className={`py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white transition-all duration-700 ${
          visibleSections.has('cta') 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            ¿Listo para{' '}
            <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              Transformar
            </span>{' '}
            tu Proyecto?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Contacta con nuestro equipo de expertos y descubre cómo podemos ayudarte a alcanzar tus objetivos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300">
              Solicitar Consulta Gratuita
            </button>
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-full text-lg font-semibold backdrop-blur-sm hover:bg-white/10 hover:border-blue-400 hover:-translate-y-1 transition-all duration-300">
              Ver Portfolio
            </button>
          </div>
        </div>
      </section>

    < Fotter />

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

export default ServicesPage;