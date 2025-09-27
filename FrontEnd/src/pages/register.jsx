import { useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Importa useNavigate

export default function Register() {
  const navigate = useNavigate(); // 👈 Inicializa el hook de navegación

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
    newsletter: false,
  });

  const [passwordStrength, setPasswordStrength] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  // Verifica la seguridad de la contraseña
  const checkPasswordStrength = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const strength = [minLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    if (strength < 3) return { level: "weak", text: "Contraseña débil - Agrega mayúsculas, números y símbolos" };
    if (strength < 5) return { level: "medium", text: "Contraseña media - Considera agregar más caracteres especiales" };
    return { level: "strong", text: "Contraseña fuerte" };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;

    if (name === "phone") {
      let val = newValue.replace(/\D/g, "");
      if (val.startsWith("57")) val = val.substring(2);
      if (val.length > 10) val = val.substring(0, 10);
      if (val.length >= 3) val = val.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
      newValue = val ? "+57 " + val : "";
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    if (name === "password") {
      if (newValue.length > 0) setPasswordStrength(checkPasswordStrength(newValue));
      else setPasswordStrength(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.terms) {
      setAlert({ type: "error", message: "Debes aceptar los términos y condiciones" });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setAlert({ type: "error", message: "Las contraseñas no coinciden" });
      return;
    }

    if (passwordStrength?.level === "weak") {
      setAlert({ type: "error", message: "La contraseña es muy débil. Crea una más segura." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setAlert({ type: "error", message: "Por favor, ingresa un correo electrónico válido" });
      return;
    }

    setLoading(true);
    setAlert(null);

    // 🔗 Aquí se conecta con el backend
    try {
      const response = await fetch("http://localhost:5000/api/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en el registro");
      }

      setAlert({
        type: "success",
        message: "¡Cuenta creada exitosamente!",
      });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        terms: false,
        newsletter: false,
      });

      setPasswordStrength(null);

      // ✅ Redirige al login después de 1.5 segundos
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      
    } catch (error) {
      setAlert({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden font-sans py-8">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Animated Floating Elements */}
      <div className="absolute w-72 h-72 top-[-10%] left-[-5%] bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
      <div className="absolute w-96 h-96 top-[70%] right-[-10%] bg-gradient-to-r from-blue-500/15 to-purple-500/15 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_2s]" />
      <div className="absolute w-48 h-48 bottom-[10%] left-[80%] bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-2xl animate-[float_6s_ease-in-out_infinite_4s]" />
      
      {/* Subtle geometric shapes */}
      <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-orange-400 rounded-full animate-pulse opacity-60" />
      <div className="absolute bottom-1/3 left-1/5 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-40 delay-1000" />
      <div className="absolute top-2/3 right-1/5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse opacity-50 delay-2000" />

      {/* Register Container */}
      <div className="relative z-10 w-full max-w-2xl mx-4">
        {/* Glass Card */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 lg:p-12 shadow-2xl relative overflow-hidden">
          {/* Inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent rounded-3xl" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Logo Section */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mb-6 shadow-2xl">
                <span className="text-white font-bold text-2xl">SG</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-white mb-3">
                Únete a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  Procivil Manager
                </span>
              </h1>
              <p className="text-gray-400 text-lg lg:text-xl leading-relaxed max-w-lg mx-auto">
                Crea tu cuenta y comienza a gestionar tus proyectos de construcción con las mejores herramientas
              </p>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto mt-4" />
            </div>

            {/* Alert */}
            {alert && (
              <div
                className={`p-4 rounded-2xl mb-8 text-sm font-medium border backdrop-blur-sm transition-all duration-300 animate-[slideInDown_0.3s_ease-out] ${
                  alert.type === "error"
                    ? "bg-red-500/10 text-red-300 border-red-500/30 shadow-lg shadow-red-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.type === "error" ? "bg-red-400" : "bg-emerald-400"
                  }`} />
                  {alert.message}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Nombre
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Tu nombre"
                      required
                      className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Apellido
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Tu apellido"
                      required
                      className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu@email.com"
                    required
                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Teléfono
                </label>
                <div className="relative group">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+57 300 123 4567"
                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Contraseña
                  </label>
                  <div className="relative group">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Crea una contraseña segura"
                      required
                      className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                    Confirmar contraseña
                  </label>
                  <div className="relative group">
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirma tu contraseña"
                      required
                      className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="lg:col-span-2">
                  <div
                    className={`p-4 rounded-2xl text-sm font-medium border backdrop-blur-sm transition-all duration-300 ${
                      passwordStrength.level === "weak"
                        ? "bg-red-500/10 text-red-300 border-red-500/30 shadow-lg shadow-red-500/10"
                        : passwordStrength.level === "medium"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/10"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        passwordStrength.level === "weak" ? "bg-red-400" :
                        passwordStrength.level === "medium" ? "bg-amber-400" : "bg-emerald-400"
                      }`} />
                      {passwordStrength.text}
                    </div>
                  </div>
                </div>
              )}

              {/* Terms Checkbox */}
              <div className="flex items-start gap-4 pt-4">
                <div className="relative mt-1">
                  <input 
                    type="checkbox" 
                    name="terms"
                    checked={formData.terms}
                    onChange={handleChange}
                    className="w-5 h-5 opacity-0 absolute"
                  />
                  <div className="w-5 h-5 border-2 border-white/20 rounded bg-white/5 hover:border-orange-500/50 transition-colors duration-200" />
                  <div className="absolute top-1 left-1 w-3 h-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-sm opacity-0 scale-0 transition-all duration-200"
                       style={{ opacity: formData.terms ? 1 : 0, transform: formData.terms ? 'scale(1)' : 'scale(0)' }} />
                </div>
                <label className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                  Acepto los{" "}
                  <a href="#" className="text-orange-400 hover:text-orange-300 font-bold transition-colors duration-200 hover:underline">
                    términos y condiciones
                  </a>{" "}
                  y la{" "}
                  <a href="#" className="text-orange-400 hover:text-orange-300 font-bold transition-colors duration-200 hover:underline">
                    política de privacidad
                  </a>{" "}
                  de Procivil Manager
                </label>
              </div>

              {/* Newsletter Checkbox */}
              <div className="flex items-start gap-4">
                <div className="relative mt-1">
                  <input 
                    type="checkbox" 
                    name="newsletter"
                    checked={formData.newsletter}
                    onChange={handleChange}
                    className="w-5 h-5 opacity-0 absolute"
                  />
                  <div className="w-5 h-5 border-2 border-white/20 rounded bg-white/5 hover:border-orange-500/50 transition-colors duration-200" />
                  <div className="absolute top-1 left-1 w-3 h-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-sm opacity-0 scale-0 transition-all duration-200"
                       style={{ opacity: formData.newsletter ? 1 : 0, transform: formData.newsletter ? 'scale(1)' : 'scale(0)' }} />
                </div>
                <label className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                  Quiero recibir noticias y actualizaciones por correo electrónico
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`group relative w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-300 overflow-hidden ${
                    loading
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:shadow-2xl hover:shadow-orange-500/25 active:scale-[0.98]"
                  }`}
                >
                  {/* Button Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Loading Animation */}
                  {loading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/50 to-amber-600/50">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                  )}
                  
                  {/* Button Content */}
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {loading && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </span>
                </button>
              </div>
            </form>

            {/* Login Link */}
            <div className="text-center mt-10 pt-8 border-t border-white/10">
              <p className="text-gray-400 text-lg mb-4">¿Ya tienes una cuenta?</p>
              <a 
                href="/login" 
                className="inline-flex items-center px-8 py-3 rounded-2xl border-2 border-orange-400/50 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 font-bold transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25"
              >
                Iniciar Sesión
              </a>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full translate-y-20 -translate-x-20" />
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes slideInDown {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}