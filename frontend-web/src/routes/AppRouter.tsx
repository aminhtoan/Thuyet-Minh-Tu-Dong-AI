import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PublicMuseumLayout } from '../components/layout/PublicMuseumLayout'
import { MuseumPlaceholderPage } from '../pages/MuseumPlaceholderPage'
import { MuseumHomePage } from '../pages/MuseumHomePage'
import { MuseumExplorePage } from '../pages/MuseumExplorePage'
import { MuseumExhibitionPage } from '../pages/MuseumExhibitionPage'
import { MuseumVideosPage } from '../pages/MuseumVideosPage'
import { MuseumVideoDetailPage } from '../pages/MuseumVideoDetailPage'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPlaceholder } from '../pages/DashboardPlaceholder'
import { GeneratePage } from '../pages/GeneratePage'
import { HistoryPlaceholder } from '../pages/HistoryPlaceholder'
import { LoginPlaceholder } from '../pages/LoginPlaceholder'
import { NewProjectPlaceholder } from '../pages/NewProjectPlaceholder'
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
  return <BrowserRouter><Routes>
    <Route element={<PublicMuseumLayout />}>
      <Route path="/" element={<MuseumHomePage />} />
      <Route path="/kham-pha" element={<MuseumExplorePage />} />
      <Route path="/kham-pha/:slug" element={<MuseumExhibitionPage />} />
      <Route path="/thuyet-minh" element={<MuseumVideosPage />} />
      <Route path="/thuyet-minh/:slug" element={<MuseumVideoDetailPage />} />
      <Route path="/ve-bao-tang" element={<MuseumPlaceholderPage title="Về bảo tàng" />} />
      <Route path="*" element={<MuseumPlaceholderPage title="Không tìm thấy trang" notFound />} />
    </Route>
    <Route path="/login" element={<LoginPlaceholder />} /><Route path="/register" element={<RegisterPlaceholder />} />
    <Route element={<RequireAuth />}><Route element={<AppShell />}><Route path="/dashboard" element={<DashboardPlaceholder />} /><Route path="/projects" element={<ProjectsPlaceholder />} /><Route path="/projects/new" element={<NewProjectPlaceholder />} /><Route path="/projects/:projectId" element={<ProjectDetailPage />} /><Route path="/projects/:projectId/transcript" element={<TranscriptPage />} /><Route path="/projects/:projectId/translation" element={<TranslationPage />} /><Route path="/projects/:projectId/voice" element={<VoicePage />} /><Route path="/projects/:projectId/generate" element={<GeneratePage />} /><Route path="/projects/:projectId/result" element={<ResultPage />} /><Route path="/history" element={<HistoryPlaceholder />} /><Route path="/settings" element={<SettingsPlaceholder />} />{voiceDesignPreviewEnabled && VoiceDesignPreviewPage && <Route path="/design-preview/voice" element={<VoiceDesignPreviewPage />} />}</Route></Route>
  </Routes></BrowserRouter>
}
