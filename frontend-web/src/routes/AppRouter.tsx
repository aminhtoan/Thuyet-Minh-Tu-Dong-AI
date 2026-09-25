import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPlaceholder } from '../pages/DashboardPlaceholder'
import { HistoryPlaceholder } from '../pages/HistoryPlaceholder'
import { LoginPlaceholder } from '../pages/LoginPlaceholder'
import { NewProjectPlaceholder } from '../pages/NewProjectPlaceholder'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectsPlaceholder } from '../pages/ProjectsPlaceholder'
import { RegisterPlaceholder } from '../pages/RegisterPlaceholder'
import { SettingsPlaceholder } from '../pages/SettingsPlaceholder'

export function AppRouter() {
  return <BrowserRouter><Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/login" element={<LoginPlaceholder />} /><Route path="/register" element={<RegisterPlaceholder />} /><Route element={<AppShell />}><Route path="/dashboard" element={<DashboardPlaceholder />} /><Route path="/projects" element={<ProjectsPlaceholder />} /><Route path="/projects/new" element={<NewProjectPlaceholder />} /><Route path="/history" element={<HistoryPlaceholder />} /><Route path="/settings" element={<SettingsPlaceholder />} /></Route><Route path="*" element={<NotFoundPage />} /></Routes></BrowserRouter>
}
