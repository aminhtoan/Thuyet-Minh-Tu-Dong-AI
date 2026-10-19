import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPlaceholder } from '../pages/DashboardPlaceholder'
import { GeneratePage } from '../pages/GeneratePage'
import { HistoryPlaceholder } from '../pages/HistoryPlaceholder'
import { LoginPlaceholder } from '../pages/LoginPlaceholder'
import { NewProjectPlaceholder } from '../pages/NewProjectPlaceholder'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectsPlaceholder } from '../pages/ProjectsPlaceholder'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { RegisterPlaceholder } from '../pages/RegisterPlaceholder'
import { ResultPage } from '../pages/ResultPage'
import { SettingsPlaceholder } from '../pages/SettingsPlaceholder'
import { TranscriptPage } from '../pages/TranscriptPage'
import { TranslationPage } from '../pages/TranslationPage'
import { VoicePage } from '../pages/VoicePage'
import { RequireAuth } from './RequireAuth'

const VoiceDesignPreviewPage = import.meta.env.DEV
  ? lazy(() => import('../pages/VoiceDesignPreviewPage').then((module) => ({ default: module.VoiceDesignPreviewPage })))
  : null
const voiceDesignPreviewEnabled = import.meta.env.DEV
  && import.meta.env.VITE_VOICE_DESIGN_PREVIEW_ENABLED === 'true'

export function AppRouter() {
  return <BrowserRouter><Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/login" element={<LoginPlaceholder />} /><Route path="/register" element={<RegisterPlaceholder />} /><Route element={<RequireAuth />}><Route element={<AppShell />}><Route path="/dashboard" element={<DashboardPlaceholder />} /><Route path="/projects" element={<ProjectsPlaceholder />} /><Route path="/projects/new" element={<NewProjectPlaceholder />} /><Route path="/projects/:projectId" element={<ProjectDetailPage />} /><Route path="/projects/:projectId/transcript" element={<TranscriptPage />} /><Route path="/projects/:projectId/translation" element={<TranslationPage />} /><Route path="/projects/:projectId/voice" element={<VoicePage />} /><Route path="/projects/:projectId/generate" element={<GeneratePage />} /><Route path="/projects/:projectId/result" element={<ResultPage />} /><Route path="/history" element={<HistoryPlaceholder />} /><Route path="/settings" element={<SettingsPlaceholder />} />{voiceDesignPreviewEnabled && VoiceDesignPreviewPage && <Route path="/design-preview/voice" element={<VoiceDesignPreviewPage />} />}</Route></Route><Route path="*" element={<NotFoundPage />} /></Routes></BrowserRouter>
}
