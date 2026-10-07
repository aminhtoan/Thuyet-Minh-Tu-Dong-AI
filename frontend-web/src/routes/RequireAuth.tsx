import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { session } from '../lib/api'
export function RequireAuth() { const location = useLocation(); return session.isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace state={{ returnUrl: location.pathname + location.search }} /> }
