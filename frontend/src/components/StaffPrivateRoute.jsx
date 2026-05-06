import React from 'react';
import { Navigate } from 'react-router-dom';

export default function StaffPrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('staff_token');
  const user = JSON.parse(localStorage.getItem('staff_user') || 'null');

  if (!token || !user) return <Navigate to="/staff/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/staff/login" replace />;
  }

  return children;
}
