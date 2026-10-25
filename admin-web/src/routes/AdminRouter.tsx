import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { AdminAppShell } from '../components/layout/AdminAppShell';
import { RequireAdmin } from './RequireAdmin';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminCustomerDetailPage } from '../pages/AdminCustomerDetailPage';
import { AdminProjectsPage } from '../pages/AdminProjectsPage';
import { AdminJobsPage } from '../pages/AdminJobsPage';
import { AdminProjectDetailPage } from '../pages/AdminProjectDetailPage';
import { AdminJobDetailPage } from '../pages/AdminJobDetailPage';
import { AdminLanguagesPage } from '../pages/AdminLanguagesPage';
import { AdminVoicesPage } from '../pages/AdminVoicesPage';
import { AdminLogsPage } from '../pages/AdminLogsPage';
import { AdminSettingsPage } from '../pages/AdminSettingsPage';

export function AdminRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route element={<RequireAdmin />}>
            <Route element={<AdminAppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/users" element={<AdminUsersPage />} />
              <Route path="/users/:userId" element={<AdminCustomerDetailPage />} />
              <Route path="/projects" element={<AdminProjectsPage />} />
              <Route path="/projects/:projectId" element={<AdminProjectDetailPage />} />
              <Route path="/jobs" element={<AdminJobsPage />} />
              <Route path="/jobs/:jobId" element={<AdminJobDetailPage />} />
              <Route path="/languages" element={<AdminLanguagesPage />} />
              <Route path="/voices" element={<AdminVoicesPage />} />
              <Route path="/logs" element={<AdminLogsPage />} />
              <Route path="/settings" element={<AdminSettingsPage />} />
              <Route
                path="*"
                element={
                  <div className="card empty-state" style={{ margin: '40px auto', maxWidth: '500px' }}>
                    <h1>Không tìm thấy trang</h1>
                    <p>Đường dẫn quản trị không tồn tại.</p>
                    <Link to="/dashboard">Về bảng điều khiển</Link>
                  </div>
                }
              />
            </Route>
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
