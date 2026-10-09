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
import type { ProcessingJobStatus, ProcessingJobType } from '../constants/processing-job.constants.js';
import type { MediaType, ProjectStatus } from '../constants/project.constants.js';
import type { UserStatus } from '../constants/user.constants.js';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/env.js';

type PageInput = { page: number; limit: number };
const pagination = (input: PageInput, total: number) => ({ ...input, total, totalPages: Math.ceil(total / input.limit) });
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const processingStatuses: ProjectStatus[] = ['TRANSCRIBING', 'TRANSLATING', 'GENERATING_AUDIO', 'PROCESSING_VIDEO'];

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

export const dashboard = async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [totalCustomers, totalProjects, processing, failed, recentProjects, recentJobs, recentActivities, queuedJobs, activeJobs, completedToday, failedJobs] = await Promise.all([
    User.countDocuments({ role: 'CUSTOMER' }), Project.countDocuments(), Project.countDocuments({ status: { $in: processingStatuses } }), Project.countDocuments({ status: 'FAILED' }),
    Project.find().sort({ updatedAt: -1 }).limit(5), ProcessingJob.find().sort({ updatedAt: -1 }).limit(5), ActivityLog.find().sort({ createdAt: -1 }).limit(6),
    ProcessingJob.countDocuments({ status: 'QUEUED' }), ProcessingJob.countDocuments({ status: 'PROCESSING' }), ProcessingJob.countDocuments({ status: 'COMPLETED', completedAt: { $gte: today } }), ProcessingJob.countDocuments({ status: 'FAILED' }),
  ]);
  return { stats: { totalCustomers, totalProjects, processing, failed }, recentProjects: await Promise.all(recentProjects.map(projectDto)),
    processingJobs: await Promise.all(recentJobs.map(jobDto)), recentActivities: await Promise.all(recentActivities.map(activityDto)),
    jobSummary: { queued: queuedJobs, processing: activeJobs, completedToday, failed: failedJobs }, generatedAt: new Date() };
};

type UsersInput = PageInput & { search?: string; status?: UserStatus; sort: 'NEWEST'|'OLDEST'|'NAME_ASC'|'NAME_DESC' };
export const listUsers = async (input: UsersInput) => {
  const filter: Record<string, unknown> = { role: 'CUSTOMER' };
  if (input.status) filter.status = input.status;
  if (input.search) { const regex = new RegExp(escapeRegex(input.search), 'i'); filter.$or = [{ fullName: regex }, { email: regex }]; }
  const sort: Record<string, 1 | -1> = input.sort === 'OLDEST' ? { createdAt: 1 } : input.sort === 'NAME_ASC' ? { fullName: 1 } : input.sort === 'NAME_DESC' ? { fullName: -1 } : { createdAt: -1 };
  const [users, total, active, blocked, newCustomers] = await Promise.all([User.find(filter).sort(sort).skip((input.page - 1) * input.limit).limit(input.limit), User.countDocuments(filter), User.countDocuments({ role: 'CUSTOMER', status: 'ACTIVE' }), User.countDocuments({ role: 'CUSTOMER', status: 'BLOCKED' }), User.countDocuments({ role: 'CUSTOMER', createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } })]);
  const items = await Promise.all(users.map(async (user) => {
    const [projectCount, completedProjectCount, processingProjectCount, failedProjectCount, lastActivity] = await Promise.all([Project.countDocuments({ userId: user._id }), Project.countDocuments({ userId: user._id, status: 'COMPLETED' }), Project.countDocuments({ userId: user._id, status: { $in: processingStatuses } }), Project.countDocuments({ userId: user._id, status: 'FAILED' }), ActivityLog.findOne({ userId: user._id }).sort({ createdAt: -1 })]);
    return { ...userDto(user), projectCount, completedProjectCount, processingProjectCount, failedProjectCount, lastActiveAt: lastActivity?.createdAt ?? user.updatedAt };
  }));
  return { items, summary: { total: await User.countDocuments({ role: 'CUSTOMER' }), active, blocked, newCustomers }, pagination: pagination(input, total) };
};

export const getUser = async (id: string) => {
  const user = await User.findOne({ _id: id, role: 'CUSTOMER' }); if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy khách hàng.');
  const projects = await Project.find({ userId: user._id }).sort({ updatedAt: -1 });
  return { ...userDto(user), projects: await Promise.all(projects.map(projectDto)) };
};

export const updateUserStatus = async (id: string, status: UserStatus, adminId: string) => {
  if (id === adminId) throw new AppError(400, 'ADMIN_SELF_UPDATE_FORBIDDEN', 'Không thể thay đổi trạng thái tài khoản quản trị hiện tại.');
  const user = await User.findOneAndUpdate({ _id: id, role: 'CUSTOMER' }, { $set: { status } }, { returnDocument: 'after', runValidators: true });
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
