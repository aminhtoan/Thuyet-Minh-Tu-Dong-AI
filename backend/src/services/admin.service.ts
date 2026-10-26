import mongoose, { type Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { AuthSession } from '../models/AuthSession.js';
import { Language } from '../models/Language.js';
import { Media } from '../models/Media.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project, type ProjectDocument } from '../models/Project.js';
import { Translation } from '../models/Translation.js';
import { User, type UserDocument } from '../models/User.js';
import { Voice } from '../models/Voice.js';
import { ListenEvent } from '../models/ListenEvent.js';
import { VisitQR } from '../models/VisitQR.js';
import { Visitor } from '../models/Visitor.js';
import type { ProcessingJobStatus, ProcessingJobType } from '../constants/processing-job.constants.js';
import type { MediaType, ProjectStatus } from '../constants/project.constants.js';
import type { UserStatus } from '../constants/user.constants.js';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/env.js';
import { availableUserFilter } from './user-availability.js';
import { parseUserAgent } from '../utils/user-agent.js';

type PageInput = { page: number; limit: number };
const pagination = (input: PageInput, total: number) => ({ ...input, total, totalPages: Math.ceil(total / input.limit) });
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const processingStatuses: ProjectStatus[] = ['TRANSCRIBING', 'TRANSLATING', 'GENERATING_AUDIO', 'PROCESSING_VIDEO'];
const availableCustomerFilter = (filter: mongoose.QueryFilter<UserDocument> = {}): mongoose.QueryFilter<UserDocument> => availableUserFilter({ role: 'CUSTOMER', ...filter });

const userDto = (user: UserDocument & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }) => ({
  id: user._id.toString(), fullName: user.fullName, email: user.email, role: user.role, status: user.status,
  avatarUrl: user.avatarUrl ?? null, createdAt: user.createdAt, updatedAt: user.updatedAt,
});

const projectDto = async (project: ProjectDocument & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }) => {
  const [owner, media, translations] = await Promise.all([
    User.findById(project.userId), Media.findOne({ projectId: project._id }), Translation.find({ projectId: project._id, status: 'READY' }).select('targetLanguage'),
  ]);
  return { id: project._id.toString(), user: owner ? { id: owner._id.toString(), fullName: owner.fullName, email: owner.email } : null,
    name: project.name, description: project.description, sourceLanguage: project.sourceLanguage,
    targetLanguages: [...new Set(translations.map((item) => item.targetLanguage))], status: project.status, progress: project.progress,
    media: media ? { originalName: media.originalName, mediaType: media.mediaType, mimeType: media.mimeType, fileSize: media.fileSize, duration: media.duration ?? null } : null,
    createdAt: project.createdAt, updatedAt: project.updatedAt };
};

const jobDto = async (job: InstanceType<typeof ProcessingJob>) => {
  const project = await Project.findById(job.projectId);
  const owner = project ? await User.findById(project.userId) : null;
  return { id: job._id.toString(), project: project ? { id: project._id.toString(), name: project.name } : null,
    customer: owner ? { id: owner._id.toString(), fullName: owner.fullName, email: owner.email } : null,
    type: job.type, targetLanguage: job.targetLanguage ?? null, status: job.status, progress: job.progress,
    errorMessage: job.errorMessage ?? null, startedAt: job.startedAt ?? null, completedAt: job.completedAt ?? null,
    createdAt: job.createdAt, updatedAt: job.updatedAt };
};

import { getListenBreakdown } from './analytics.service.js';

export const dashboard = async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [
    totalCustomers,
    totalProjects,
    processing,
    failed,
    totalListens,
    webListens,
    mobileListens,
    recentProjects,
    recentJobs,
    recentActivities,
    queuedJobs,
    activeJobs,
    completedToday,
    failedJobs,
    listenAnalytics,
  ] = await Promise.all([
    User.countDocuments(availableCustomerFilter()),
    Project.countDocuments(),
    Project.countDocuments({ status: { $in: processingStatuses } }),
    Project.countDocuments({ status: 'FAILED' }),
    ListenEvent.countDocuments(),
    ListenEvent.countDocuments({ platform: 'web' }),
    ListenEvent.countDocuments({ platform: 'mobile' }),
    Project.find().sort({ updatedAt: -1 }).limit(5),
    ProcessingJob.find().sort({ updatedAt: -1 }).limit(5),
    ActivityLog.find().sort({ createdAt: -1 }).limit(6),
    ProcessingJob.countDocuments({ status: 'QUEUED' }),
    ProcessingJob.countDocuments({ status: 'PROCESSING' }),
    ProcessingJob.countDocuments({ status: 'COMPLETED', completedAt: { $gte: today } }),
    ProcessingJob.countDocuments({ status: 'FAILED' }),
    getListenBreakdown(),
  ]);
  return {
    stats: {
      totalCustomers,
      totalProjects,
      processing,
      failed,
      totalListens,
      listenStats: {
        total: totalListens,
        web: webListens,
        mobile: mobileListens,
      },
    },
    listenAnalytics,
    recentProjects: await Promise.all(recentProjects.map(projectDto)),
    processingJobs: await Promise.all(recentJobs.map(jobDto)),
    recentActivities: await Promise.all(recentActivities.map(activityDto)),
    jobSummary: { queued: queuedJobs, processing: activeJobs, completedToday, failed: failedJobs },
    generatedAt: new Date(),
  };
};

type UsersInput = PageInput & { search?: string; status?: UserStatus; sort: 'NEWEST'|'OLDEST'|'NAME_ASC'|'NAME_DESC' };
export const listUsers = async (input: UsersInput) => {
  const filter: Record<string, unknown> = availableCustomerFilter();
  if (input.status) filter.status = input.status;
  if (input.search) { const regex = new RegExp(escapeRegex(input.search), 'i'); filter.$or = [{ fullName: regex }, { email: regex }]; }
  const sort: Record<string, 1 | -1> = input.sort === 'OLDEST' ? { createdAt: 1 } : input.sort === 'NAME_ASC' ? { fullName: 1 } : input.sort === 'NAME_DESC' ? { fullName: -1 } : { createdAt: -1 };
  const [users, total, active, blocked, newCustomers] = await Promise.all([User.find(filter).sort(sort).skip((input.page - 1) * input.limit).limit(input.limit), User.countDocuments(filter), User.countDocuments(availableCustomerFilter({ status: 'ACTIVE' })), User.countDocuments(availableCustomerFilter({ status: 'BLOCKED' })), User.countDocuments(availableCustomerFilter({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }))]);
  const items = await Promise.all(users.map(async (user) => {
    const [projectCount, completedProjectCount, processingProjectCount, failedProjectCount, lastActivity] = await Promise.all([Project.countDocuments({ userId: user._id }), Project.countDocuments({ userId: user._id, status: 'COMPLETED' }), Project.countDocuments({ userId: user._id, status: { $in: processingStatuses } }), Project.countDocuments({ userId: user._id, status: 'FAILED' }), ActivityLog.findOne({ userId: user._id }).sort({ createdAt: -1 })]);
    return { ...userDto(user), projectCount, completedProjectCount, processingProjectCount, failedProjectCount, lastActiveAt: lastActivity?.createdAt ?? user.updatedAt };
  }));
  return { items, summary: { total: await User.countDocuments(availableCustomerFilter()), active, blocked, newCustomers }, pagination: pagination(input, total) };
};

export const getUser = async (id: string) => {
  const user = await User.findOne(availableCustomerFilter({ _id: id })); if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy khách hàng.');
  const projects = await Project.find({ userId: user._id }).sort({ updatedAt: -1 });
  return { ...userDto(user), projects: await Promise.all(projects.map(projectDto)) };
};

export const updateUserStatus = async (id: string, status: UserStatus, adminId: string) => {
  if (id === adminId) throw new AppError(400, 'ADMIN_SELF_UPDATE_FORBIDDEN', 'Không thể thay đổi trạng thái tài khoản quản trị hiện tại.');
  const user = await User.findOneAndUpdate(availableCustomerFilter({ _id: id }), { $set: { status } }, { returnDocument: 'after', runValidators: true });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy khách hàng.');
  if (status === 'BLOCKED') await AuthSession.deleteMany({ userId: user._id });
  try { await ActivityLog.create({ userId: adminId, action: status === 'BLOCKED' ? 'CUSTOMER_BLOCKED' : 'CUSTOMER_UNBLOCKED', entityType: 'User', entityId: user._id, description: status === 'BLOCKED' ? 'Quản trị viên đã khóa tài khoản khách hàng.' : 'Quản trị viên đã mở khóa tài khoản khách hàng.' }); } catch { /* best effort */ }
  return userDto(user);
};

type ProjectsInput = PageInput & { search?: string; status?: ProjectStatus; language?: string; mediaType?: MediaType };
export const listProjects = async (input: ProjectsInput) => {
  const filter: Record<string, unknown> = {}; if (input.status) filter.status = input.status; if (input.language) filter.sourceLanguage = input.language;
  if (input.search) { const regex = new RegExp(escapeRegex(input.search), 'i'); const owners = await User.find({ $or: [{ fullName: regex }, { email: regex }] }).select('_id'); filter.$or = [{ name: regex }, { userId: { $in: owners.map((owner) => owner._id) } }]; }
  if (input.mediaType) { const media = await Media.find({ mediaType: input.mediaType }).select('projectId'); filter._id = { $in: media.map((item) => item.projectId) }; }
  const [projects, total, all, processing, completed, failed] = await Promise.all([Project.find(filter).sort({ updatedAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit), Project.countDocuments(filter), Project.countDocuments(), Project.countDocuments({ status: { $in: processingStatuses } }), Project.countDocuments({ status: 'COMPLETED' }), Project.countDocuments({ status: 'FAILED' })]);
  return { items: await Promise.all(projects.map(projectDto)), summary: { total: all, processing, completed, failed }, pagination: pagination(input, total) };
};
export const getProject = async (id: string) => { const project = await Project.findById(id); if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.'); return { project: await projectDto(project), jobs: await Promise.all((await ProcessingJob.find({ projectId: id }).sort({ createdAt: -1 })).map(jobDto)) }; };

type JobsInput = PageInput & { search?: string; type?: ProcessingJobType; status?: ProcessingJobStatus };
export const listJobs = async (input: JobsInput) => {
  const filter: Record<string, unknown> = {}; if (input.type) filter.type = input.type; if (input.status) filter.status = input.status;
  if (input.search) { const regex = new RegExp(escapeRegex(input.search), 'i'); const projects = await Project.find({ name: regex }).select('_id'); filter.$or = [...(mongoose.isValidObjectId(input.search) ? [{ _id: input.search }] : []), { projectId: { $in: projects.map((project) => project._id) } }]; }
  const [jobs, total, queued, processing, completed, failed, cancelled] = await Promise.all([ProcessingJob.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit), ProcessingJob.countDocuments(filter), ProcessingJob.countDocuments({ status: 'QUEUED' }), ProcessingJob.countDocuments({ status: 'PROCESSING' }), ProcessingJob.countDocuments({ status: 'COMPLETED' }), ProcessingJob.countDocuments({ status: 'FAILED' }), ProcessingJob.countDocuments({ status: 'CANCELLED' })]);
  return { items: await Promise.all(jobs.map(jobDto)), summary: { queued, processing, completed, failed, cancelled }, pagination: pagination(input, total) };
};
export const getJob = async (id: string) => { const job = await ProcessingJob.findById(id); if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Không tìm thấy công việc xử lý.'); return jobDto(job); };

export const listLanguages = async (input: { search?: string; isActive?: boolean }) => { const filter: Record<string, unknown> = {}; if (input.isActive !== undefined) filter.isActive = input.isActive; if (input.search) { const regex = new RegExp(escapeRegex(input.search), 'i'); filter.$or = [{ code: regex }, { name: regex }, { nativeName: regex }]; } const items = await Language.find(filter).sort({ code: 1 }); return Promise.all(items.map(async (language) => ({ id: language._id.toString(), code: language.code, name: language.name, nativeName: language.nativeName, isActive: language.isActive, voiceCount: await Voice.countDocuments({ languageId: language._id }) }))); };
export const listVoices = async (input: { language?: string; languageId?: string; provider?: string; isActive?: boolean }) => { const languageFilter: Record<string, unknown> = {}; if (input.language) languageFilter.code = input.language; const languageIds = input.languageId ? [input.languageId] : input.language ? (await Language.find(languageFilter).select('_id')).map((item) => item._id) : undefined; const filter: Record<string, unknown> = {}; if (languageIds) filter.languageId = { $in: languageIds }; if (input.provider) filter.provider = input.provider; if (input.isActive !== undefined) filter.isActive = input.isActive; const items = await Voice.find(filter).sort({ name: 1 }); const languages = await Language.find({ _id: { $in: items.map((item) => item.languageId) } }); const map = new Map(languages.map((language) => [language._id.toString(), language])); return items.map((voice) => ({ id: voice._id.toString(), language: map.has(voice.languageId.toString()) ? { id: voice.languageId.toString(), code: map.get(voice.languageId.toString())?.code, name: map.get(voice.languageId.toString())?.name } : null, provider: voice.provider, providerVoiceId: voice.providerVoiceId, name: voice.name, gender: voice.gender, description: voice.description, previewUrl: voice.previewUrl ?? null, isActive: voice.isActive, createdAt: voice.createdAt, updatedAt: voice.updatedAt })); };

const activityDto = async (log: InstanceType<typeof ActivityLog>) => { const user = await User.findById(log.userId); return { id: log._id.toString(), actor: user ? { id: user._id.toString(), fullName: user.fullName, email: user.email, role: user.role } : null, action: log.action, entityType: log.entityType, entityId: log.entityId.toString(), description: log.description, createdAt: log.createdAt }; };
export const listLogs = async (input: PageInput & { search?: string; role?: 'CUSTOMER'|'ADMIN'; entityType?: string; action?: string; days?: number }) => { const filter: Record<string, unknown> = {}; if (input.role) { const users = await User.find({ role: input.role }).select('_id'); filter.userId = { $in: users.map((user) => user._id) }; } if (input.entityType) filter.entityType = input.entityType; if (input.action) filter.action = input.action; if (input.days) filter.createdAt = { $gte: new Date(Date.now() - input.days * 86400000) }; if (input.search) { const regex = new RegExp(escapeRegex(input.search), 'i'); filter.$or = [{ action: regex }, { description: regex }, { entityType: regex }]; } const [items, total] = await Promise.all([ActivityLog.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit), ActivityLog.countDocuments(filter)]); return { items: await Promise.all(items.map(activityDto)), pagination: pagination(input, total) }; };

export const getSettings = () => ({ editable: false, environment: env.nodeEnv, upload: { maxSizeMb: env.maxUploadSizeMb, supportedMediaTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4'] }, authentication: { accessTokenTtl: env.jwtAccessExpiresIn, refreshTokenTtl: env.jwtRefreshExpiresIn }, processing: { mode: 'synchronous', ffmpegBinarySource: process.env.FFMPEG_PATH?.trim() ? 'configured-path' : 'system-path', ffprobeBinarySource: process.env.FFPROBE_PATH?.trim() ? 'configured-path' : 'system-path', sttProviderConfigured: Boolean(process.env.STT_PROVIDER?.trim()), translationProviderConfigured: Boolean(process.env.TRANSLATION_PROVIDER?.trim()), ttsProviderConfigured: Boolean(process.env.TTS_PROVIDER?.trim()) } });

type VisitQrInput = PageInput & { search?: string; source?: string; os?: string; deviceType?: string; startDate?: string; endDate?: string; visitorDays?: number };

const languageLabels: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'Tiếng Anh',
  ja: 'Tiếng Nhật',
  ko: 'Tiếng Hàn',
  fr: 'Tiếng Pháp',
  zh: 'Tiếng Trung',
};

function getDominantLanguage(langs: (string | null | undefined)[]): { label: string; code: string } {
  const map: Record<string, number> = {};
  for (const l of langs) {
    if (!l) continue;
    const clean = l.toLowerCase();
    map[clean] = (map[clean] || 0) + 1;
  }
  let max = 0;
  let dominantCode = '';
  for (const [k, v] of Object.entries(map)) {
    if (v > max) {
      max = v;
      dominantCode = k;
    }
  }
  if (!dominantCode) return { label: '—', code: '' };
  const label = languageLabels[dominantCode] || dominantCode.toUpperCase();
  return {
    label: `${label} (${dominantCode.toUpperCase()})`,
    code: dominantCode.toLowerCase(),
  };
}

function getVisitorId(ip: string, ua: string): string {
  const raw = `${ip}_${ua}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
  return `Khách #${hex}`;
}

export const listVisitQr = async (input: VisitQrInput) => {
  const filter: Record<string, unknown> = {};
  if (input.source) filter.source = input.source;
  if (input.os) filter.os = input.os;
  if (input.deviceType) filter.deviceType = input.deviceType;
  if (input.startDate || input.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (input.startDate) dateFilter.$gte = new Date(input.startDate);
    if (input.endDate) {
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }
  if (input.search) {
    const regex = new RegExp(escapeRegex(input.search), 'i');
    filter.$or = [{ ipAddress: regex }, { source: regex }, { os: regex }, { browser: regex }, { userAgent: regex }, { location: regex }];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visitorDays = input.visitorDays;
  const listenFilter: Record<string, unknown> = {};
  if (visitorDays && visitorDays > 0) {
    const from = new Date(Date.now() - visitorDays * 24 * 60 * 60 * 1000);
    listenFilter.createdAt = { $gte: from };
  }

  const [items, total, todayCount, allCount, todayUniqueIps, totalUniqueIps, totalListens, webListens, mobileListens, visitorAgg, visitorDocs] = await Promise.all([
    VisitQR.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit),
    VisitQR.countDocuments(filter),
    VisitQR.countDocuments({ createdAt: { $gte: today } }),
    VisitQR.countDocuments(),
    VisitQR.distinct('ipAddress', { createdAt: { $gte: today }, ipAddress: { $ne: null } }),
    VisitQR.distinct('ipAddress', { ipAddress: { $ne: null } }),
    ListenEvent.countDocuments(),
    ListenEvent.countDocuments({ platform: 'web' }),
    ListenEvent.countDocuments({ platform: 'mobile' }),
    ListenEvent.aggregate<{
      _id: { ipAddress: string; userAgent: string };
      totalListens: number;
      lastListenedAt: Date;
      languages: (string | null)[];
    }>([
      { $match: listenFilter },
      {
        $group: {
          _id: {
            ipAddress: { $ifNull: ['$ipAddress', 'unknown'] },
            userAgent: { $ifNull: ['$userAgent', 'unknown'] },
          },
          totalListens: { $sum: 1 },
          lastListenedAt: { $max: '$createdAt' },
          languages: { $push: '$languageCode' },
        },
      },
      { $sort: { totalListens: -1, lastListenedAt: -1 } },
      { $limit: 100 },
    ]),
    Visitor.find({}).sort({ lastVisitAt: -1 }).limit(100),
  ]);

  const visitors = visitorDocs.map((v) => ({
    id: v._id.toString(),
    visitorCode: v.visitorCode,
    ipAddress: v.ipAddress,
    deviceType: v.deviceType,
    os: v.os,
    browser: v.browser,
    totalScans: v.totalScans,
    totalListens: v.totalListens,
    languages: v.languages,
    firstVisitAt: v.firstVisitAt.toISOString(),
    lastVisitAt: v.lastVisitAt.toISOString(),
  }));

  const topVisitors = visitorAgg.map((v) => {
    const ip = v._id.ipAddress !== 'unknown' ? v._id.ipAddress : null;
    const ua = v._id.userAgent !== 'unknown' ? v._id.userAgent : null;
    const parsed = parseUserAgent(ua);
    const visitorId = getVisitorId(ip || '0.0.0.0', ua || '');
    const dominantLang = getDominantLanguage(v.languages);

    return {
      visitorId,
      ipAddress: ip,
      deviceType: parsed.deviceType,
      os: parsed.os,
      browser: parsed.browser,
      totalListens: v.totalListens,
      language: dominantLang.label,
      languageCode: dominantLang.code,
      lastListenedAt: v.lastListenedAt ? v.lastListenedAt.toISOString() : new Date().toISOString(),
    };
  });

  return {
    items: items.map((v) => ({
      id: v._id.toString(),
      source: v.source,
      ipAddress: v.ipAddress,
      userAgent: v.userAgent,
      deviceType: v.deviceType,
      os: v.os,
      browser: v.browser,
      targetPath: v.targetPath,
      location: v.location,
      createdAt: v.createdAt,
    })),
    topVisitors,
    visitors,
    summary: {
      totalListens,
      listenStats: {
        total: totalListens,
        web: webListens,
        mobile: mobileListens,
      },
      today: todayCount,
      todayUnique: todayUniqueIps.length,
      total: allCount,
      totalUnique: totalUniqueIps.length,
    },
    pagination: pagination(input, total),
  };
};

