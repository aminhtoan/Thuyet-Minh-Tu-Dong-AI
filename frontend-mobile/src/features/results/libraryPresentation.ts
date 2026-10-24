import type { Project } from '../projects/types';

// Equivalent to Web libraryProduct + RESULT route access. Progress, media URLs
// and translation metadata are never evidence of a completed artifact.
export function libraryProduct(project: Project) {
  const workflow = project.workflow;
  if (project.status !== 'COMPLETED' || !workflow || workflow.processing || workflow.state !== 'COMPLETED' || workflow.step !== 'RESULT') return null;
  const target = workflow.targetLanguage;
  if (!target || typeof target.code !== 'string') return null;
  const language = target.code.trim().toLowerCase();
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(language)) return null;
  if (workflow.mediaType === 'VIDEO') {
    if (target.source !== 'RESULT' || !workflow.artifact?.resultReady) return null;
  } else if (workflow.mediaType === 'AUDIO') {
    if (target.source !== 'NARRATION' || !workflow.artifact?.narrationReady) return null;
  } else return null;
  return { project, mediaType: workflow.mediaType, language,
    path: `/projects/${encodeURIComponent(project.id)}/result?language=${encodeURIComponent(language)}` };
}
export type LibraryProduct = NonNullable<ReturnType<typeof libraryProduct>>;
export type LibraryFilters = { query: string; media: string; language: string };
export function filterLibrary(products: readonly LibraryProduct[], filters: LibraryFilters) {
  const query = filters.query.trim().toLocaleLowerCase('vi');
  return products.filter(item => item.project.name.toLocaleLowerCase('vi').includes(query)
    && (filters.media === 'ALL' || item.mediaType === filters.media)
    && (filters.language === 'ALL' || item.language === filters.language));
}
// Same configured language names as Web library; unknown verified codes remain visible.
export const libraryLanguageNames: Record<string, string> = { vi: 'Vietnamese', en: 'English', ja: 'Japanese', ko: 'Korean' };
