// Vite's Object.keys(glob) transform inventories filenames without importing
// or loading video bytes into the JS bundle. No private API access.
const paths = Object.keys(import.meta.glob([
  '/public/museum-media/**/*.{mp4,webm,vtt,avif,webp,png,jpg,jpeg}',
  '/public/museum/videos/**/*.{mp4,webm}',
  '/public/museum/posters/**/*.{avif,webp,png,jpg,jpeg}',
  '/public/museum/captions/**/*.vtt',
  '/public/images/museum/**/*.{avif,webp,png,jpg,jpeg}',
]))
export const publicMuseumAssetPaths: ReadonlySet<string> = new Set(
  paths.map((path) => path.replace(/^\/public\//, '/')),
)
