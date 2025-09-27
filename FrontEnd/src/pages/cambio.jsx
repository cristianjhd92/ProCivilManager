import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function CambiarContrasena() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");

  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const showAlert = (msg, type = "error") => setAlert({ msg, type });
  const clearAlert = () => setAlert(null);

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async () => {
    if (!token) {
      showAlert("Token no válido o expirado.");
      return;
    }
  
    if (passwords.newPassword.length < 6) {
      showAlert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
  
    if (passwords.newPassword !== passwords.confirmPassword) {
      showAlert("Las contraseñas no coinciden.");
      return;
    }
  
    setLoading(true);
    clearAlert();
  
    try {
      const response = await fetch(`http://localhost:5000/api/user/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword: passwords.newPassword,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.msg || "Error al cambiar la contraseña.");
      }
  
      showAlert("¡Contraseña cambiada exitosamente!", "success");
  
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      showAlert(error.message || "Error desconocido al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPasswords((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (!token) {
      showAlert("Token inválido o no proporcionado.");
    }
  }, [token]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden font-sans">
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

      {/* Change Password Container */}
      <div className="relative z-10 w-[480px] max-w-[90vw]">
        {/* Glass Card */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
          {/* Inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent rounded-3xl" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Icon Section */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mb-6 shadow-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2m8 0V7a4 4 0 00-8 0v2m8 0H7" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-white mb-3">
                Nueva{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  Contraseña
                </span>
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed">
                Ingresa tu nueva contraseña segura y confírmala para completar el proceso de recuperación.
              </p>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto mt-6" />
            </div>

            {/* Alert */}
            {alert && (
              <div
                className={`p-4 rounded-2xl mb-8 text-sm font-medium border backdrop-blur-sm transition-all duration-300 animate-[slideInDown_0.3s_ease-out] ${
                  alert.type === "success"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/20"
                    : "bg-red-500/10 text-red-300 border-red-500/30 shadow-lg shadow-red-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    alert.type === "success" ? "bg-emerald-400" : "bg-red-400"
                  }`} />
                  <div className="leading-relaxed">{alert.msg}</div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-8">
              {/* New Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Nueva contraseña
                </label>
                <div className="relative group">
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={passwords.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                    required
                    className="w-full px-6 py-4 pr-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("newPassword")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors duration-200 text-xl p-1"
                  >
                    {showPasswords.newPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 px-1">
                  Debe contener al menos 6 caracteres
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Confirmar contraseña
                </label>
                <div className="relative group">
                  <input
                    type={showPasswords.confirmPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    value={passwords.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                    className="w-full px-6 py-4 pr-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirmPassword")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors duration-200 text-xl p-1"
                  >
                    {showPasswords.confirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 px-1">
                  Debe coincidir con la contraseña anterior
                </p>
              </div>

              {/* Password Match Indicator */}
              {passwords.newPassword && passwords.confirmPassword && (
                <div className={`p-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                  passwords.newPassword === passwords.confirmPassword
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/10 text-red-300 border border-red-500/30"
                }`}>
                  <div className="flex items-center gap-2">
                    {passwords.newPassword === passwords.confirmPassword ? (
                      <>
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Las contraseñas coinciden
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Las contraseñas no coinciden
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !token}
                  className={`group relative w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-300 overflow-hidden ${
                    loading || !token
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {loading ? "Cambiando contraseña..." : "Cambiar contraseña"}
                  </span>
                </button>
              </div>
            </div>

            {/* Back to Login */}
            <div className="text-center mt-10 pt-8 border-t border-white/10">
              <p className="text-gray-400 text-sm mb-4">¿Ya tienes acceso a tu cuenta?</p>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-bold transition-colors duration-200 hover:underline text-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al inicio de sesión
              </a>
            </div>

            {/* Security Info */}
            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Consejos de seguridad
              </h3>
              <ul className="text-gray-400 text-sm leading-relaxed space-y-1">
                <li>• Usa al menos 8 caracteres con mayúsculas, minúsculas y números</li>
                <li>• Evita usar información personal como fechas o nombres</li>
                <li>• No compartas tu contraseña con nadie</li>
              </ul>
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