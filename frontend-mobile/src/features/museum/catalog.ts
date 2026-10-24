import snapshot from './catalog.generated.json';

export const publicMuseum = snapshot;
export type PublicMuseumVideo = typeof snapshot.videos[number];
export type PublicExhibition = { slug: string; title: string; summary: string; sections: { heading: string; paragraphs: string[] }[]; source: { label: string; reference: string }; image?: { src: string; alt: string; caption: string; credit: string } };
export const publishedExhibitions: PublicExhibition[] = snapshot.exhibitions;
export function findPublicVideo(slug: unknown) {
  return typeof slug === 'string' ? publicMuseum.videos.find(video => video.slug === slug && video.visibility === 'PUBLIC' && video.publishedStatus === 'PUBLISHED' && video.rights.confirmed) : undefined;
}
export function publicSourceUrl(video: PublicMuseumVideo) {
  const reference = video.sourceAttribution.reference;
  return /^https:\/\/(?:youtu\.be\/[a-zA-Z0-9_-]{11}|(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11})$/.test(reference) ? reference : undefined;
}
export function languageAvailable(video: PublicMuseumVideo, language: string) {
  return video.languageVariants.filter(variant => variant.language === language).length === 1
    && video.languageVariants.some(variant => variant.language === language && variant.state === 'AVAILABLE' && 'videoUrl' in variant && Boolean(variant.videoUrl));
}
