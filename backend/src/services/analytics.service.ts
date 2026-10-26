import type { Types } from 'mongoose';
import { ListenEvent } from '../models/ListenEvent.js';
import { Project } from '../models/Project.js';
import { Language } from '../models/Language.js';

export interface TopLanguageItem {
  code: string;
  name: string;
  flag: string;
  count: number;
  percentage: number;
  web: number;
  mobile: number;
}

export interface TopAudioItem {
  projectId: string;
  title: string;
  languageCode: string;
  languageName: string;
  flag: string;
  count: number;
  web: number;
  mobile: number;
}

export interface ListenBreakdown {
  topLanguages: TopLanguageItem[];
  topAudios: TopAudioItem[];
}

const LANGUAGE_METAS: Record<string, { name: string; flag: string }> = {
  vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
  en: { name: 'Tiếng Anh', flag: '🇬🇧' },
  ja: { name: 'Tiếng Nhật', flag: '🇯🇵' },
  ko: { name: 'Tiếng Hàn', flag: '🇰🇷' },
  zh: { name: 'Tiếng Trung', flag: '🇨🇳' },
  'zh-cn': { name: 'Tiếng Trung', flag: '🇨🇳' },
  fr: { name: 'Tiếng Pháp', flag: '🇫🇷' },
  de: { name: 'Tiếng Đức', flag: '🇩🇪' },
  es: { name: 'Tiếng Tây Ban Nha', flag: '🇪🇸' },
  ru: { name: 'Tiếng Nga', flag: '🇷🇺' },
  th: { name: 'Tiếng Thái', flag: '🇹🇭' },
};

// hàm này dùng để lấy thống kê số lượt nghe dự án 
export const getListenBreakdown = async (): Promise<ListenBreakdown> => {
  // lấy tổng số lượt nghe 
  const [totalListens, langAgg, projectAgg, dbLanguages] = await Promise.all([
    ListenEvent.countDocuments(),
    ListenEvent.aggregate<{ _id: string; total: number; web: number; mobile: number }>([
      { $match: { languageCode: { $ne: null } } },
      {
        $group: {
          _id: '$languageCode',
          total: { $sum: 1 },
          web: { $sum: { $cond: [{ $eq: ['$platform', 'web'] }, 1, 0] } },
          mobile: { $sum: { $cond: [{ $eq: ['$platform', 'mobile'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
    ListenEvent.aggregate<{
      _id: { projectId: Types.ObjectId | null; languageCode: string | null };
      total: number;
      web: number;
      mobile: number;
    }>([
      { $match: { projectId: { $ne: null } } },
      {
        $group: {
          _id: { projectId: '$projectId', languageCode: '$languageCode' },
          total: { $sum: 1 },
          web: { $sum: { $cond: [{ $eq: ['$platform', 'web'] }, 1, 0] } },
          mobile: { $sum: { $cond: [{ $eq: ['$platform', 'mobile'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
    Language.find().select('code name nativeName'),
  ]);

  const dbLangMap = new Map(dbLanguages.map((l) => [l.code.toLowerCase(), l.name]));

  const topLanguages: TopLanguageItem[] = langAgg.map((item) => {
    const code = (item._id || '').toLowerCase();
    const meta = LANGUAGE_METAS[code] || {
      name: dbLangMap.get(code) || code.toUpperCase(),
      flag: '🌐',
    };
    const percentage = totalListens > 0 ? Math.round((item.total / totalListens) * 1000) / 10 : 0;
    return {
      code,
      name: meta.name,
      flag: meta.flag,
      count: item.total,
      percentage,
      web: item.web,
      mobile: item.mobile,
    };
  });

  const projectIds = projectAgg
    .map((item) => item._id.projectId)
    .filter((id): id is Types.ObjectId => Boolean(id));

  const projects = await Project.find({ _id: { $in: projectIds } }).select('name');
  const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]));

  const topAudios: TopAudioItem[] = projectAgg.map((item) => {
    const pId = item._id.projectId ? item._id.projectId.toString() : '';
    const langCode = item._id.languageCode ? item._id.languageCode.toLowerCase() : '';
    const meta = LANGUAGE_METAS[langCode] || {
      name: dbLangMap.get(langCode) || langCode.toUpperCase(),
      flag: '🌐',
    };
    const rawTitle = projectMap.get(pId) || 'Bản thu thuyết minh';
    const title = rawTitle.replace(/\s*\((?:Tiếng\s+[^)]+|[A-Za-z\s]+)\)\s*$/i, '').trim() || rawTitle;
    return {
      projectId: pId,
      title,
      languageCode: langCode,
      languageName: meta.name,
      flag: meta.flag,
      count: item.total,
      web: item.web,
      mobile: item.mobile,
    };
  });

  return { topLanguages, topAudios };
};
