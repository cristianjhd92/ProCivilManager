// components/LiderRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const LiderRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user || user.role !== 'lider de obra') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default LiderRoute;
