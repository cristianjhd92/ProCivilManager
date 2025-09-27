import React from 'react';

const AlertMessage = ({ type, children }) => {
  // Colores e íconos según tipo de alerta
  const styles = {
    error: {
      bg: "bg-red-600/10",
      border: "border-red-600/40",
      text: "text-red-500",
      icon: (
        <svg
          className="w-5 h-5 text-red-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: "bg-yellow-600/10",
      border: "border-yellow-600/40",
      text: "text-yellow-500",
      icon: (
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19.07a10 10 0 1114.14 0 10 10 0 01-14.14 0z" />
        </svg>
      ),
    },
    info: {
      bg: "bg-blue-600/10",
      border: "border-blue-600/40",
      text: "text-blue-500",
      icon: (
        <svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
      ),
    },
    success: {
      bg: "bg-green-600/10",
      border: "border-green-600/40",
      text: "text-green-500",
      icon: (
        <svg
          className="w-5 h-5 text-green-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border ${style.bg} ${style.border} ${style.text} font-medium shadow-md`}
      role="alert"
    >
      {style.icon}
      <span>{children}</span>
    </div>
  );
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <AlertMessage type="warning">Por favor, inicia sesión para continuar.</AlertMessage>;
  }

  let user;
  try {
    user = JSON.parse(userStr);
  } catch (error) {
    return <AlertMessage type="error">Error de autenticación. Por favor inicia sesión nuevamente.</AlertMessage>;
  }

  if (user.role !== 'admin') {
    return <AlertMessage type="error">No tienes permiso para acceder a esta sección.</AlertMessage>;
  }

  // Usuario autenticado y con rol admin
  return children;
};

export default AdminRoute;
