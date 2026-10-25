import type { ProjectStatus, ProcessingJobStatus, ProcessingJobType } from './domain';
export type DashboardProject = {
  id: string; name: string; userId: string; customerName: string;
  sourceLanguage: string; targetLanguages: string[]; status: ProjectStatus; progress?: number; updatedAt: string;
};
export type DashboardJob = {
  id: string; projectId: string; projectName: string; type: ProcessingJobType;
  status: ProcessingJobStatus; progress?: number; startedAt?: string; updatedAt: string;
};
export type DashboardActivity = {
  id: string; userId: string; action: string; entityType: string;
  entityId: string; description: string; createdAt: string;
};
export type TopLanguageItem = {
  code: string;
  name: string;
  flag: string;
  count: number;
  percentage: number;
  web: number;
  mobile: number;
};

export type TopAudioItem = {
  projectId: string;
  title: string;
  languageCode: string;
  languageName: string;
  flag: string;
  count: number;
  web: number;
  mobile: number;
};

export type ListenAnalytics = {
  topLanguages: TopLanguageItem[];
  topAudios: TopAudioItem[];
};

export type AdminDashboardData = {
  source: 'ADMIN_API';
  stats: {
    totalCustomers: number;
    totalProjects: number;
    processing: number;
    failed: number;
    totalListens?: number;
    listenStats?: { total: number; web: number; mobile: number };
  };
  listenAnalytics?: ListenAnalytics;
  recentProjects: DashboardProject[];
  processingJobs: DashboardJob[];
  recentActivities: DashboardActivity[];
  jobSummary: { queued: number; processing: number; completedToday: number; failed: number };
  generatedAt: string;
};
