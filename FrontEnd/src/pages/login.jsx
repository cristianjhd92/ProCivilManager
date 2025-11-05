import { useState, useEffect } from "react";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buttonText, setButtonText] = useState("Iniciar Sesión");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const container = document.querySelector(".login-container");
    if (container) {
      container.style.opacity = "0";
      container.style.transform = "translateY(30px)";
      setTimeout(() => {
        container.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
        container.style.opacity = "1";
        container.style.transform = "translateY(0)";
      }, 100);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setButtonText("Iniciando sesión...");
    setAlert(null);

    try {
      const response = await fetch("http://localhost:5000/api/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en el inicio de sesión");
      }

      // Guardar token y usuario en localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ Notificación personalizada con nombre y rol
      setButtonText("✅ ¡Sesión iniciada!");
      setAlert({
        type: "success",
        message: `¡Inicio exitoso! Bienvenido ${data.user.firstName} (${data.user.role})`,
      });

      // Redireccionar después de 1s
      setTimeout(() => {
        window.location.href = data.redirectTo || "/";
      }, 1000);
    } catch (error) {
      setAlert({ type: "error", message: error.message });
      setButtonText("Iniciar Sesión");
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
          backgroundSize: "50px 50px",
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

      {/* Login Container */}
      <div className="login-container relative z-10 w-[480px] max-w-[90vw]">
        <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent rounded-3xl" />

          <div className="relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mb-6 shadow-2xl">
                <span className="text-white font-bold text-2xl">SG</span>
              </div>
              <h1 className="text-4xl font-black text-white mb-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  SGPCMD
                </span>
              </h1>
              <p className="text-gray-400 text-lg font-medium">
                Sistema de Gestión de Proyectos
              </p>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto mt-4" />
            </div>

            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">Bienvenido de vuelta</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Inicia sesión en tu cuenta para acceder a tu panel de control
              </p>
            </div>

            {/* ✅ Alerta */}
            {alert && (
              <div
                className={`p-4 rounded-2xl mb-8 text-sm font-medium border backdrop-blur-sm transition-all duration-300 ${
                  alert.type === "error"
                    ? "bg-red-500/10 text-red-300 border-red-500/30 shadow-lg shadow-red-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      alert.type === "error" ? "bg-red-400" : "bg-emerald-400"
                    }`}
                  />
                  {alert.message}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300 tracking-wider uppercase">
                  Contraseña
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Ingresa tu contraseña"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-6 py-4 pr-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors duration-200 text-xl p-1"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/0 to-orange-500/0 group-focus-within:from-orange-500/10 group-focus-within:to-amber-500/10 transition-all duration-300 pointer-events-none" />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm pt-2">
                <label className="flex items-center gap-3 text-gray-300 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-5 h-5 opacity-0 absolute"
                    />
                    <div className="w-5 h-5 border-2 border-white/20 rounded bg-white/5 group-hover:border-orange-500/50 transition-colors duration-200" />
                    <div className="absolute top-1 left-1 w-3 h-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-sm opacity-0 scale-0 group-has-[:checked]:opacity-100 group-has-[:checked]:scale-100 transition-all duration-200" />
                  </div>
                  <span className="font-medium">Recordarme</span>
                </label>
                <a
                  href="/recuperar"
                  className="text-orange-400 hover:text-orange-300 font-bold transition-colors duration-200 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
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
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/50 to-amber-600/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                )}

                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading && (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {buttonText}
                </span>
              </button>
            </form>

            {/* ✅ Botón de volver al inicio */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="text-orange-400 hover:text-orange-300 font-bold transition-colors duration-200 hover:underline"
              >
                ← Volver al inicio
              </button>
            </div>

            {/* Registro */}
            <div className="text-center mt-10 pt-8 border-t border-white/10">
              <p className="text-gray-400 text-lg">
                ¿No tienes una cuenta?{" "}
                <a
                  href="/register"
                  className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 font-bold hover:from-orange-300 hover:to-amber-400 transition-all duration-200"
                >
                  Regístrate aquí
                </a>
              </p>
            </div>
          </div>

          {/* Decorativos */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full translate-y-20 -translate-x-20" />
        </div>
      </div>

      {/* Estilos personalizados */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
