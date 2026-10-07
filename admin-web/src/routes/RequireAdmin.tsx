import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { adminSession } from '../lib/api';
export function RequireAdmin() { const location = useLocation(); return adminSession.isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace state={{ returnUrl: location.pathname + location.search }} />; }
