import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);

    const handleClickOutside = (e) => {
      if (!e.target.closest('.navbar-container') && !e.target.closest('.user-menu')) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClickOutside);

    // Verificar sesión
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      const parsedUser = JSON.parse(user);
      const nombre = parsedUser.firstName || 'Usuario';
      setUserName(nombre);
      setIsLoggedIn(true);
    } else {
      setUserName('');
      setIsLoggedIn(false);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSmoothScroll = (e, to) => {
    if (to.startsWith('#') && location.pathname === '/') {
      e.preventDefault();
      const target = document.querySelector(to);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeMenu();
      }
    } else {
      e.preventDefault();
      closeMenu();
      navigate(to);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserName('');
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <nav
      className={`fixed top-0 w-full py-4 z-50 transition-all duration-300 navbar-container ${
        isScrolled ? 'bg-slate-900/98 backdrop-blur-xl' : 'bg-slate-900/95 backdrop-blur-xl'
      } border-b border-white/10`}
    >
      <div className="max-w-6xl mx-auto flex justify-between items-center px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-extrabold text-white no-underline"
          onClick={(e) => handleSmoothScroll(e, '#inicio')}
        >
          <span className="text-2xl">🏗️</span>
          <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
            Procivil Manager
          </span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex list-none gap-8">
          {[
            { to: '/', label: 'Inicio' },
            { to: '/Servicios', label: 'Servicios' },
            { to: '/Proyectos', label: 'Proyectos' },
            { to: '/Contacto', label: 'Contacto' },
          ].map((item) => (
            <li key={item.to}>
              <a
                href={item.to}
                onClick={(e) => handleSmoothScroll(e, item.to)}
                className="relative text-white no-underline font-medium py-2 transition-all duration-300 hover:text-orange-500 group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-4 relative">
          {!isLoggedIn ? (
            <Link
              to="/login"
              className="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-6 py-3 rounded-full no-underline font-semibold transition-all duration-300 hover:transform hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-orange-500/40"
              style={{ boxShadow: '0 20px 60px rgba(255, 107, 53, 0.3)' }}
            >
              Iniciar Sesión
            </Link>
          ) : (
            <>
              <button
                onClick={toggleMenu}
                className="user-menu flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold cursor-pointer select-none"
                aria-label="User menu"
              >
                👤 <span className="text-sm">{userName}</span>
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-40 rounded-lg shadow-lg border border-white/20 z-50 top-full"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                  }}
                >
                  <ul className="flex flex-col">
                    <li>
                      <Link
                        to="/perfil"
                        onClick={closeMenu}
                        className="block px-4 py-3 text-white hover:bg-orange-500 hover:text-white cursor-pointer transition"
                      >
                        Perfil
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/SolicitudP"
                        onClick={closeMenu}
                        className="block px-4 py-3 text-white hover:bg-orange-500 hover:text-white cursor-pointer transition"
                      >
                        Solicitar
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/historial"
                        onClick={closeMenu}
                        className="block px-4 py-3 text-white hover:bg-orange-500 hover:text-white cursor-pointer transition"
                      >
                        Historial
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-white hover:bg-red-600 hover:text-white cursor-pointer transition"
                      >
                        Cerrar sesión
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMenu}
            className="md:hidden flex flex-col cursor-pointer p-2 space-y-1"
            aria-label="Toggle menu"
          >
            <span
              className={`w-6 h-0.5 bg-white transition-all duration-300 rounded-sm ${
                isMenuOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            ></span>
            <span
              className={`w-6 h-0.5 bg-white transition-all duration-300 rounded-sm ${
                isMenuOpen ? 'opacity-0' : ''
              }`}
            ></span>
            <span
              className={`w-6 h-0.5 bg-white transition-all duration-300 rounded-sm ${
                isMenuOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            ></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-slate-900/98 backdrop-blur-xl border-t border-white/10 transition-all duration-300 ${
          isMenuOpen
            ? 'opacity-100 visible transform translate-y-0'
            : 'opacity-0 invisible transform -translate-y-4'
        }`}
        style={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)' }}
      >
        <ul className="flex flex-col list-none p-8 space-y-4">
          {[
            { to: '/', label: 'Inicio' },
            { to: '/Servicios', label: 'Servicios' },
            { to: '/Proyectos', label: 'Proyectos' },
            { to: '/Contacto', label: 'Contacto' },
          ].map((item) => (
            <li key={item.to}>
              <a
                href={item.to}
                onClick={(e) => handleSmoothScroll(e, item.to)}
                className="block text-white no-underline font-medium py-2 transition-all duration-300 hover:text-orange-500 hover:transform hover:translate-x-2"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Header;