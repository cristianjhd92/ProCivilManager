import React, { useState } from 'react';

const Footer = () => {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = () => {
    if (email) {
      alert('¡Gracias por suscribirte! Te contactaremos pronto.');
      setEmail('');
    }
  };

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='footergrid' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='1'/></pattern></defs><rect width='100' height='100' fill='url(%23footergrid)'/></svg>")`
        }}
      />
      
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Brand Section */}
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-3xl font-extrabold mb-4">
              <span className="text-2xl">🏗️</span>
              <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
              Procivil Manager
              </span>
            </div>
            <p className="text-white/70 mb-6 leading-relaxed">
              La plataforma líder en gestión de proyectos de construcción. Transformamos la manera en que planificas, ejecutas y entregas tus proyectos.
            </p>
            <div className="flex gap-4">
              {['📘', '🐦', '💼', '📷', '📺'].map((icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center text-white transition-all duration-300 hover:bg-orange-500 hover:-translate-y-1"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Contact & Newsletter Section */}
          <div>
            <h4 className="text-xl font-semibold mb-6">Contacto</h4>
            
            {/* Contact Info */}
            <div className="space-y-4 mb-6">
              {[
                { icon: '📧', text: 'info@probuild.com' },
                { icon: '📞', text: '+57 (1) 234-5678' },
                { icon: '📍', text: 'Bogotá, Colombia' }
              ].map((contact, index) => (
                <div key={index} className="flex items-center gap-3 text-white/70">
                  <div className="w-9 h-9 bg-orange-500/20 rounded-lg flex items-center justify-center text-sm">
                    {contact.icon}
                  </div>
                  <span>{contact.text}</span>
                </div>
              ))}
            </div>

            {/* Newsletter */}
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
              <h4 className="text-lg font-semibold mb-2">Newsletter</h4>
              <p className="text-sm text-white/70 mb-4">
                Recibe las últimas noticias y actualizaciones
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu email"
                  className="w-full px-3 py-2 bg-white/10 border-none rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleNewsletterSubmit}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/30"
                >
                  Suscribir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white/60 text-sm">
            © 2024 ProBuild. Todos los derechos reservados.
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {['Términos de Servicio', 'Política de Privacidad', 'Cookies', 'Seguridad'].map((item, index) => (
              <a
                key={index}
                href="#"
                className="text-white/60 text-sm transition-colors duration-300 hover:text-orange-400"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;