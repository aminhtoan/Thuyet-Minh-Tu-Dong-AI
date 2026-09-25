import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DashboardPlaceholder } from '../pages/DashboardPlaceholder'
import { HistoryPlaceholder } from '../pages/HistoryPlaceholder'
import { HomePlaceholder } from '../pages/HomePlaceholder'
import { LoginPlaceholder } from '../pages/LoginPlaceholder'
import { NewProjectPlaceholder } from '../pages/NewProjectPlaceholder'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectsPlaceholder } from '../pages/ProjectsPlaceholder'
import { RegisterPlaceholder } from '../pages/RegisterPlaceholder'
import { SettingsPlaceholder } from '../pages/SettingsPlaceholder'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePlaceholder />} />
        <Route path="/login" element={<LoginPlaceholder />} />
        <Route path="/register" element={<RegisterPlaceholder />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
        <Route path="/projects" element={<ProjectsPlaceholder />} />
        <Route path="/projects/new" element={<NewProjectPlaceholder />} />
        <Route path="/history" element={<HistoryPlaceholder />} />
        <Route path="/settings" element={<SettingsPlaceholder />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
