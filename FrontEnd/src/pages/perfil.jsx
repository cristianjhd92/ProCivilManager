import React, { useState, useEffect } from 'react';
import Header from '../components/NavBar';
import Fotter from '../components/Fotter';

const Perfil = () => {
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    empresa: '',
    cargo: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:5000/api/user/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Error al obtener perfil');
        }

        const data = await response.json();

        setFormData({
          nombre: data.firstName || '',
          apellido: data.lastName || '',
          email: data.email || '',
          telefono: data.phone || '',
          empresa: data.company || '',
          cargo: data.role || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === 'info') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setPasswordData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmitInfo = async () => {
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('No autenticado');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/user/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formData.nombre,
          lastName: formData.apellido,
          email: formData.email,
          phone: formData.telefono,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la información');
      }

      const updatedUser = await response.json();

      setMessage('Información actualizada correctamente');
      setFormData(prev => ({
        ...prev,
        nombre: updatedUser.user.firstName || prev.nombre,
        apellido: updatedUser.user.lastName || prev.apellido,
        email: updatedUser.user.email || prev.email,
        telefono: updatedUser.user.phone || prev.telefono,
      }));

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('No autenticado');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/user/me/password', {
        method: 'PUT',  // Cambiado a PUT y ruta actualizada
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar la contraseña');
      }

      setMessage('Contraseña cambiada correctamente');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans leading-relaxed text-gray-800 overflow-x-hidden min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <Header />

      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 py-32">
        <div 
          className="absolute inset-0 opacity-5 animate-pulse"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute w-20 h-20 bg-orange-500 bg-opacity-10 rounded-full top-1/4 left-1/12 animate-bounce" style={{ animationDelay: '0s', animationDuration: '6s' }} />
        <div className="absolute w-15 h-15 bg-orange-500 bg-opacity-10 rounded-full top-3/4 right-1/6 animate-bounce" style={{ animationDelay: '2s', animationDuration: '6s' }} />

        <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in">
            Mi <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">Perfil</span>
          </h1>
          <p className="text-xl text-gray-300 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>
      </section>

      <section 
        id="profile-content"
        className="py-16 transition-all duration-700 opacity-100 translate-y-0"
      >
        <div className="max-w-4xl mx-auto px-8">
          {/* Tabs */}
          <div className="flex space-x-4 mb-8 justify-center">
            <button
              className={`px-6 py-3 rounded-full font-semibold ${
                activeTab === 'info' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors duration-300'
              }`}
              onClick={() => setActiveTab('info')}
            >
              Información
            </button>
            <button
              className={`px-6 py-3 rounded-full font-semibold ${
                activeTab === 'password' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors duration-300'
              }`}
              onClick={() => setActiveTab('password')}
            >
              Contraseña
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-10">
            {activeTab === 'info' && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-8">
                  Actualizar Información Personal
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange(e, 'info')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 outline-none"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Apellido *</label>
                    <input
                      type="text"
                      name="apellido"
                      value={formData.apellido}
                      onChange={(e) => handleInputChange(e, 'info')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 outline-none"
                      placeholder="Tu apellido"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Correo Electrónico *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange(e, 'info')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 outline-none"
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange(e, 'info')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 outline-none"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                {message && (
                  <p className={`mt-4 font-semibold ${
                    message.toLowerCase().includes('error') || message.toLowerCase().includes('no') 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {message}
                  </p>
                )}

                <div className="pt-6">
                  <button
                    onClick={handleSubmitInfo}
                    disabled={loading}
                    className="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar Información'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="animate-fade-in space-y-6 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-8">
                  Cambiar Contraseña
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Contraseña Actual *</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => handleInputChange(e, 'password')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 outline-none"
                      placeholder="********"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Nueva Contraseña *</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => handleInputChange(e, 'password')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 outline-none"
                      placeholder="********"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Confirmar Nueva Contraseña *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handleInputChange(e, 'password')}
                      className="w-full px-4 py-3 rounded-xl border border-gray-400 bg-white text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 outline-none"
                      placeholder="********"
                      required
                    />
                  </div>
                </div>

                {message && (
                  <p className={`mt-4 font-semibold ${
                    message.toLowerCase().includes('error') || message.toLowerCase().includes('no') 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {message}
                  </p>
                )}

                <div className="pt-6">
                  <button
                    onClick={handleSubmitPassword}
                    disabled={loading}
                    className="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    <Fotter />
    </div>
  );
};

export default Perfil;
