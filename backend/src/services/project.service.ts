import type { Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { Media } from '../models/Media.js';
import { Narration } from '../models/Narration.js';
import { Result } from '../models/Result.js';
import { Project, type ProjectDocument } from '../models/Project.js';
import { Transcript } from '../models/Transcript.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';
import { Translation } from '../models/Translation.js';
import type { ProjectStatus } from '../constants/project.constants.js';
import { AppError } from '../utils/app-error.js';
import { safeDeleteStoredFile } from '../utils/file.js';
import { resolveProjectWorkflows } from './project-workflow.service.js';

interface ProjectInput { name: string; description?: string; sourceLanguage: string }
interface ListInput { search?: string; status?: ProjectStatus; page: number; limit: number }

const serialize = (project: ProjectDocument & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }) => ({
  id: project._id.toString(), name: project.name, description: project.description,
  sourceLanguage: project.sourceLanguage, status: project.status, progress: project.progress,
  createdAt: project.createdAt, updatedAt: project.updatedAt,
});

const serializeWithWorkflow = async (projects: Array<ProjectDocument & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }>) => {
  const workflows = await resolveProjectWorkflows(projects.map((project) => ({ id: project._id.toString(), status: project.status })));
  return projects.map((project) => ({ ...serialize(project), workflow: workflows.get(project._id.toString()) }));
};

const log = async (userId: string, action: string, entityId: Types.ObjectId, description: string) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Project', entityId, description }); } catch { /* best effort */ }
};

const owned = async (id: string, userId: string) => {
  const project = await Project.findOne({ _id: id, userId });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  return project;
};

export const create = async (userId: string, input: ProjectInput) => {
  const project = await Project.create({ ...input, description: input.description ?? '', userId, status: 'DRAFT', progress: 0 });
  void log(userId, 'PROJECT_CREATED', project._id, 'Dự án đã được tạo.');
  return serialize(project);
};

export const list = async (userId: string, input: ListInput) => {
  const filter: Record<string, unknown> = { userId };
  if (input.status) filter.status = input.status;
  if (input.search) {
    const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }];
  }
  const [projects, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit),
    Project.countDocuments(filter),
  ]);
  return { projects: await serializeWithWorkflow(projects), pagination: { ...input, search: undefined, status: undefined, total, totalPages: Math.ceil(total / input.limit) } };
};

export const get = async (id: string, userId: string) => {
  const project = await owned(id, userId);
  const [serialized] = await serializeWithWorkflow([project]);
  return serialized;
};

export const update = async (id: string, userId: string, input: Partial<ProjectInput>) => {
  const project = await Project.findOneAndUpdate({ _id: id, userId }, { $set: input }, { returnDocument: 'after', runValidators: true });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  void log(userId, 'PROJECT_UPDATED', project._id, 'Dự án đã được cập nhật.');
  return serialize(project);
};

export const remove = async (id: string, userId: string) => {
  const project = await owned(id, userId);
  const media = await Media.findOne({ projectId: project._id });
  const narrations = await Narration.find({ projectId: project._id }).select('audioPath');
  const results = await Result.find({ projectId: project._id }).select('videoPath');
  await Promise.all([Media.deleteMany({ projectId: project._id }), Narration.deleteMany({ projectId: project._id }), Result.deleteMany({ projectId: project._id }), Project.deleteOne({ _id: project._id })]);
  if (media) {
    const otherMediaCount = await Media.countDocuments({ storagePath: media.storagePath, projectId: { $ne: project._id } });
    if (otherMediaCount === 0) await safeDeleteStoredFile(media.storagePath);
  }
  await Promise.all(narrations.filter((item) => item.audioPath).map((item) => safeDeleteStoredFile(item.audioPath)));
  await Promise.all(results.filter((item) => item.videoPath).map((item) => safeDeleteStoredFile(item.videoPath)));
  void log(userId, 'PROJECT_DELETED', project._id, 'Dự án đã được xóa.');
};

export const branchLanguage = async (sourceProjectId: string, userId: string, targetLanguage: string) => {
  const sourceProject = await owned(sourceProjectId, userId);
  const media = await Media.findOne({ projectId: sourceProject._id });
  if (!media) throw new AppError(400, 'MEDIA_NOT_FOUND', 'Dự án nguồn chưa có tệp phương tiện.');
  const transcript = await Transcript.findOne({ projectId: sourceProject._id });
  if (!transcript) throw new AppError(400, 'TRANSCRIPT_NOT_FOUND', 'Dự án nguồn chưa có bản bóc băng.');
  const segments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 });

  const languageLabels: Record<string, string> = { en: 'Tiếng Anh', ja: 'Tiếng Nhật', fr: 'Tiếng Pháp', ko: 'Tiếng Hàn', zh: 'Tiếng Trung', vi: 'Tiếng Việt' };
  const targetLabel = languageLabels[targetLanguage] || targetLanguage.toUpperCase();
  const cleanName = sourceProject.name.replace(/\s*\([^)]*\)$/, '');
  const newName = `${cleanName} (${targetLabel})`;

  const newProject = await Project.create({
    name: newName,
    description: sourceProject.description,
    sourceLanguage: sourceProject.sourceLanguage,
    userId,
    status: 'TRANSCRIBED',
    progress: 40,
  });

  await Media.create({
    projectId: newProject._id,
    originalName: media.originalName,
    fileName: media.fileName,
    mediaType: media.mediaType,
    mimeType: media.mimeType,
    fileSize: media.fileSize,
    duration: media.duration,
    storagePath: media.storagePath,
  });

  const newTranscript = await Transcript.create({
    projectId: newProject._id,
    languageCode: transcript.languageCode,
    fullText: transcript.fullText,
    status: 'READY',
    revision: 1,
  });

  if (segments.length) {
    await TranscriptSegment.insertMany(segments.map((s) => ({
      transcriptId: newTranscript._id,
      sequence: s.sequence,
      startTime: s.startTime,
      endTime: s.endTime,
      text: s.text,
    })));
  }

  void log(userId, 'PROJECT_BRANCHED', newProject._id, `Đã tạo phiên bản ${targetLabel} từ dự án ${sourceProject.name}.`);
  const [serialized] = await serializeWithWorkflow([newProject]);
  return { project: serialized, targetLanguage };
};

export const getLanguageVariants = async (projectId: string, userId: string, currentLanguage?: string) => {
  const currentProject = await owned(projectId, userId);
  const media = await Media.findOne({ projectId: currentProject._id });
  let projectIds: Types.ObjectId[] = [currentProject._id];
  if (media) {
    const relatedMedias = await Media.find({ storagePath: media.storagePath });
    projectIds = relatedMedias.map((m) => m.projectId as Types.ObjectId);
  }
  const relatedProjects = await Project.find({ _id: { $in: projectIds }, userId });
  const relatedIds = relatedProjects.map((p) => p._id);
  const [results, narrations, translations] = await Promise.all([
    Result.find({ projectId: { $in: relatedIds } }),
    Narration.find({ projectId: { $in: relatedIds } }),
    Translation.find({ projectId: { $in: relatedIds } }),
  ]);

  const LANGUAGE_METAS: Record<string, { name: string; flag: string }> = {
    en: { name: 'Tiếng Anh', flag: '🇬🇧' },
    ja: { name: 'Tiếng Nhật', flag: '🇯🇵' },
    fr: { name: 'Tiếng Pháp', flag: '🇫🇷' },
    ko: { name: 'Tiếng Hàn', flag: '🇰🇷' },
    zh: { name: 'Tiếng Trung', flag: '🇨🇳' },
    vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
  };

  const variantMap = new Map<string, {
    projectId: string;
    language: string;
    name: string;
    flag: string;
    hasResult: boolean;
    status: string;
    isCurrent: boolean;
  }>();

  for (const proj of relatedProjects) {
    const pId = proj._id.toString();
    const projResults = results.filter((r) => r.projectId.toString() === pId);
    const projNarrations = narrations.filter((n) => n.projectId.toString() === pId);
    const projTranslations = translations.filter((t) => t.projectId.toString() === pId);

    for (const r of projResults) {
      const lang = r.languageCode;
      if (!variantMap.has(lang) || !variantMap.get(lang)?.hasResult) {
        const meta = LANGUAGE_METAS[lang] || { name: lang.toUpperCase(), flag: '🌐' };
        variantMap.set(lang, {
          projectId: pId,
          language: lang,
          name: meta.name,
          flag: meta.flag,
          hasResult: true,
          status: proj.status,
          isCurrent: pId === projectId && (!currentLanguage || lang === currentLanguage),
        });
      }
    }

    for (const n of projNarrations) {
      const lang = n.languageCode;
      if (!variantMap.has(lang)) {
        const meta = LANGUAGE_METAS[lang] || { name: lang.toUpperCase(), flag: '🌐' };
        variantMap.set(lang, {
          projectId: pId,
          language: lang,
          name: meta.name,
          flag: meta.flag,
          hasResult: true,
          status: proj.status,
          isCurrent: pId === projectId && (!currentLanguage || lang === currentLanguage),
        });
      }
    }

    for (const t of projTranslations) {
      const lang = t.targetLanguage;
      if (!variantMap.has(lang)) {
        const meta = LANGUAGE_METAS[lang] || { name: lang.toUpperCase(), flag: '🌐' };
        variantMap.set(lang, {
          projectId: pId,
          language: lang,
          name: meta.name,
          flag: meta.flag,
          hasResult: false,
          status: proj.status,
          isCurrent: pId === projectId && (!currentLanguage || lang === currentLanguage),
        });
      }
    }

    for (const [code, meta] of Object.entries(LANGUAGE_METAS)) {
      if (proj.name.includes(`(${meta.name})`) && !variantMap.has(code)) {
        variantMap.set(code, {
          projectId: pId,
          language: code,
          name: meta.name,
          flag: meta.flag,
          hasResult: false,
          status: proj.status,
          isCurrent: pId === projectId && (!currentLanguage || code === currentLanguage),
        });
      }
    }
  }

  if (variantMap.size === 0) {
    variantMap.set('en', {
      projectId: currentProject._id.toString(),
      language: 'en',
      name: 'Tiếng Anh',
      flag: '🇬🇧',
      hasResult: false,
      status: currentProject.status,
      isCurrent: true,
    });
  }

  return Array.from(variantMap.values());
};

export const getPublicAudioGuides = async () => {
  const narrations = await Narration.find({ status: 'READY' }).sort({ createdAt: -1 });
  if (narrations.length === 0) return [];

  const projectIds = [...new Set(narrations.map((n) => n.projectId))];
  const projects = await Project.find({ _id: { $in: projectIds } });
  const projectMap = new Map(projects.map((p) => [p._id.toString(), p]));

  const medias = await Media.find({ projectId: { $in: projectIds } });
  const mediaMap = new Map(medias.map((m) => [m.projectId.toString(), m]));

  const LANGUAGE_METAS: Record<string, { name: string; flag: string }> = {
    vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
    en: { name: 'Tiếng Anh', flag: '🇬🇧' },
    ja: { name: 'Tiếng Nhật', flag: '🇯🇵' },
    ko: { name: 'Tiếng Hàn', flag: '🇰🇷' },
    zh: { name: 'Tiếng Trung', flag: '🇨🇳' },
    'zh-CN': { name: 'Tiếng Trung', flag: '🇨🇳' },
    fr: { name: 'Tiếng Pháp', flag: '🇫🇷' },
    de: { name: 'Tiếng Đức', flag: '🇩🇪' },
    es: { name: 'Tiếng Tây Ban Nha', flag: '🇪🇸' },
    ru: { name: 'Tiếng Nga', flag: '🇷🇺' },
    th: { name: 'Tiếng Thái', flag: '🇹🇭' },
  };

  const normalizeTitle = (name: string) =>
    name.replace(/\s*\((?:Tiếng\s+[^)]+|[A-Za-z\s]+)\)\s*$/i, '').trim();

  type PublicGuide = {
    key: string;
    title: string;
    description: string;
    mediaType: string;
    languages: Array<{
      code: string;
      name: string;
      flag: string;
      projectId: string;
      narrationId: string;
      audioUrl: string;
    }>;
  };

  const guideMap = new Map<string, PublicGuide>();

  for (const n of narrations) {
    const proj = projectMap.get(n.projectId.toString());
    if (!proj) continue;
    const isTestNoise = /^(?:S23\s|E2E\s|Test\s[a-f0-9-]{36})/i.test(proj.name);
    if (isTestNoise) continue;

    const baseTitle = normalizeTitle(proj.name) || proj.name;
    const media = mediaMap.get(proj._id.toString());
    const groupKey = media?.storagePath
      ? `media:${media.storagePath}`
      : media?.originalName && media?.fileSize
        ? `file:${media.originalName}:${media.fileSize}`
        : `title:${baseTitle.toLowerCase()}`;

    const langCode = n.languageCode;
    const meta = LANGUAGE_METAS[langCode] || { name: langCode.toUpperCase(), flag: '🌐' };

    const langOption = {
      code: langCode,
      name: meta.name,
      flag: meta.flag,
      projectId: proj._id.toString(),
      narrationId: n._id.toString(),
      audioUrl: `/api/projects/public-audio/${proj._id.toString()}/${n._id.toString()}`,
    };

    if (!guideMap.has(groupKey)) {
      guideMap.set(groupKey, {
        key: groupKey,
        title: baseTitle,
        description: proj.description || 'Bản thu thuyết minh AI hoàn chỉnh.',
        mediaType: media?.mediaType || 'AUDIO',
        languages: [langOption],
      });
    } else {
      const existing = guideMap.get(groupKey)!;
      if (!existing.languages.some((l) => l.code === langCode)) {
        existing.languages.push(langOption);
      }
    }
  }

  for (const guide of guideMap.values()) {
    if (!guide.languages.some((l) => l.code === 'vi')) {
      const primaryLang = guide.languages[0];
      const pId = primaryLang?.projectId;
      if (pId) {
        guide.languages.unshift({
          code: 'vi',
          name: 'Tiếng Việt',
          flag: '🇻🇳',
          projectId: pId,
          narrationId: 'source',
          audioUrl: `/api/projects/public-audio/${pId}/source`,
        });
      }
    } else {
      const viIndex = guide.languages.findIndex((l) => l.code === 'vi');
      if (viIndex > 0) {
        const viOption = guide.languages[viIndex];
        if (viOption) {
          guide.languages.splice(viIndex, 1);
          guide.languages.unshift(viOption);
        }
      }
    }
  }

  return Array.from(guideMap.values());
};

