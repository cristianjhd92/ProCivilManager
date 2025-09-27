import { useState } from "react";

export default function RecuperacionContrasena() {
  const [email, setEmail] = useState("");
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const showAlert = (msg, type = "error") => setAlert({ msg, type });
  const clearAlert = () => setAlert(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert("Por favor, ingresa un correo válido.");
      return;
    }

    setLoading(true);
    clearAlert();

    try {
        const response = await fetch("http://localhost:5000/api/user/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al enviar el enlace.");
      }

      showAlert(
        "Hemos enviado un enlace de recuperación a " + email.replace(/(.{2}).+(@.+)/, "$1***$2"),
        "success"
      );
    } catch (error) {
      showAlert(error.message || "Error desconocido al enviar el correo.");
    } finally {
      setLoading(false);
    }
  };

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

      {/* Recovery Container */}
      <div className="relative z-10 w-[460px] max-w-[90vw]">
        {/* Glass Card */}
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
          {/* Inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent rounded-3xl" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Icon Section */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mb-6 shadow-2xl">
                <span className="text-white text-3xl">🔒</span>
              </div>
              <h1 className="text-3xl font-black text-white mb-3">
                ¿Olvidaste tu{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  contraseña?
                </span>
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed">
                No te preocupes. Ingresa tu correo electrónico y te enviaremos un enlace seguro para restablecerla.
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
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                  
                  {/* Email Icon */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 px-1">
                  Te enviaremos las instrucciones a este correo electrónico
                </p>
              </div>

              {/* Submit Button */}
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
                </span>
              </button>
            </form>

            {/* Back to Login */}
            <div className="text-center mt-10 pt-8 border-t border-white/10">
              <p className="text-gray-400 text-sm mb-4">¿Recordaste tu contraseña?</p>
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

            {/* Help Section */}
            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ¿Necesitas ayuda?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Si tienes problemas para recuperar tu cuenta, puedes contactar a nuestro equipo de soporte técnico.
              </p>
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