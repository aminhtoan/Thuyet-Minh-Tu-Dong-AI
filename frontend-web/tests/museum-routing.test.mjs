import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as router from 'react-router-dom'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../src/', import.meta.url))
const read = (path) => readFileSync(resolve(root, path), 'utf8')

function renderRoute(path, authenticated = false, editorialCatalog, publicVideoCatalog, videoAssets = new Set()) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const exports = {}
    cache.set(file, exports)
    const source = readFileSync(file, 'utf8').replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.VITE_VOICE_DESIGN_PREVIEW_ENABLED', 'undefined')
    runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
      exports,
      require(name) {
        if (name === 'react-router-dom') return { ...router, BrowserRouter: ({ children }) => React.createElement(router.MemoryRouter, { initialEntries: [path] }, children) }
        if (!name.startsWith('.')) return require(name)
        if (name.endsWith('.css')) return {}
        if (name.endsWith('/lib/api')) return { session: { isAuthenticated: () => authenticated } }
        if (name.endsWith('/publicMediaAssets')) return { publicMuseumAssetPaths: videoAssets }
        // Existing workspace pages are markers; the real RequireAuth is loaded below.
        if (/\/pages\//.test(name) && !/\/Museum(?:Placeholder|Home|Explore|Exhibition|Videos|VideoDetail)Page$/.test(name)) {
          const component = name.split('/').at(-1)
          return { [component]: () => React.createElement('p', null, `PRIVATE_OR_AUTH:${component}`) }
        }
        if (name.endsWith('/layout/AppShell')) return { AppShell: () => React.createElement(router.Outlet) }
        const base = resolve(dirname(file), name)
        const target = [base, `${base}.tsx`, `${base}.ts`, `${base}/index.ts`].find((item) => existsSync(item) && statSync(item).isFile())
        const loaded = load(target)
        if (name.endsWith('/museum/exhibitions') && editorialCatalog !== undefined) {
          return { ...loaded, getPublishedExhibitions: () => loaded.getPublishedExhibitions(editorialCatalog) }
        }
        if (name.endsWith('/museum/publicVideos') && publicVideoCatalog !== undefined) {
          return { ...loaded, getPublishedPublicVideos: () => loaded.getPublishedPublicVideos(publicVideoCatalog, videoAssets) }
        }
        return loaded
      },
    })
    return exports
  }
  return renderToStaticMarkup(React.createElement(load(resolve(root, 'routes/AppRouter.tsx')).AppRouter))
}

test('anonymous public routes including trailing slash render museum shell without JWT', () => {
  for (const path of ['/', '/kham-pha', '/kham-pha/', '/thuyet-minh', '/thuyet-minh/', '/ve-bao-tang']) {
    const html = renderRoute(path)
    assert.match(html, /museum-public-layout/)
    assert.match(html, path === '/' ? /Những câu chuyện lịch sử/ : path.startsWith('/kham-pha') ? /Chuyên đề đang được chuẩn bị/ : path.startsWith('/thuyet-minh') ? /Video đang được chuẩn bị/ : /Nội dung đang được chuẩn bị/)
    assert.match(html, /<header|<nav|<main|<footer/)
    assert.doesNotMatch(html, /PRIVATE_OR_AUTH:/)
  }
})

test('root remains public for signed-in visitors; header exposes editor workspace only when signed in', () => {
  assert.match(renderRoute('/'), /href="\/login"[^>]*>Đăng nhập/)
  const html = renderRoute('/', true)
  assert.match(html, /href="\/dashboard"[^>]*>Không gian biên tập/)
  assert.doesNotMatch(html, /PRIVATE_OR_AUTH:DashboardPlaceholder/)
})

test('all customer and workflow URLs retain RequireAuth and existing destinations', () => {
  for (const path of ['/dashboard', '/projects', '/projects/new', '/projects/example', ...['transcript', 'translation', 'voice', 'generate', 'result'].map((step) => `/projects/example/${step}`), '/history', '/settings']) {
    assert.doesNotMatch(renderRoute(path), /PRIVATE_OR_AUTH:|museum-public-layout/)
    assert.match(renderRoute(path, true), /PRIVATE_OR_AUTH:/)
  }
  for (const path of ['/login', '/register']) assert.doesNotMatch(renderRoute(path), /museum-public-layout/)
})

test('unknown URLs render public 404 and never expose project or result data', () => {
  const html = renderRoute('/not-a-page')
  assert.match(html, /Không tìm thấy trang/)
  assert.match(html, /href="\/"[^>]*>Về trang chủ/)
  for (const path of ['components/museum/MuseumHeader.tsx', 'components/museum/MuseumFooter.tsx', 'components/layout/PublicMuseumLayout.tsx', 'pages/MuseumPlaceholderPage.tsx']) {
    assert.doesNotMatch(read(path), /\b(api|apiBlob|fetch)\s*\(|accessToken|createObjectURL/)
  }
})

test('navigation exposes current page, unique language labels and honest language shell', () => {
  const html = renderRoute('/thuyet-minh')
  assert.match(html, /aria-current="page"[^>]*href="\/thuyet-minh"/)
  assert.match(html, /href="#museum-main"/)
  for (const id of ['museum-language', 'museum-mobile-language']) {
    assert.equal(html.split(`id="${id}"`).length - 1, 1)
    assert.match(html, new RegExp(`for="${id}"`))
  }
  for (const code of ['vi', 'en', 'th', 'ko', 'zh-CN']) assert.ok(html.includes(`value="${code}"`))
  assert.doesNotMatch(html, /Hiện hỗ trợ giao diện tiếng Việt|museum-language-notice|museum-mobile-language-notice/)
  assert.match(html, /class="visually-hidden">Ngôn ngữ giao diện/)
  assert.match(html, /<select[^>]*disabled/)
})

test('mobile menu uses modal focus containment, Escape, focus return and restored body scroll', () => {
  const header = read('components/museum/MuseumHeader.tsx')
  assert.match(header, /dialog\.showModal\(\)/)
  assert.match(header, /onCancel=\{\(\) => setOpen\(false\)\}/)
  assert.match(header, /trigger\?\.focus\(\)/)
  assert.match(header, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(header, /document\.body\.style\.overflow = previousOverflow/)
  assert.match(header, /aria-expanded=\{open\}/)
  assert.match(header, /desktop\.removeEventListener/)
})

test('homepage renders six sections, one main heading and transparent editorial placeholders', () => {
  const html = renderRoute('/')
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.equal((html.match(/<section\b/g) || []).length, 6)
  for (const text of ['Những câu chuyện lịch sử', 'từ hiện thực.', 'Không gian trưng bày', 'Lắng nghe theo cách của bạn', 'Một hành trình qua những câu chuyện', 'Dành thời gian để khám phá.', 'Các chủ đề biên tập dự kiến.', 'Hình ảnh bảo tàng đang được chuẩn bị']) assert.ok(html.includes(text))
  assert.doesNotMatch(html, /<img|<iframe|<video|<audio/)
})

test('Museum polish keeps editorial cards and video non-interactive and footer links public', () => {
  const html = renderRoute('/')
  const topics = html.match(/<div class="museum-home__topics">([\s\S]*?)<\/section>/)?.[1]
  assert.ok(topics)
  assert.equal((topics.match(/museum-home__topic-top/g) || []).length, 3)
  assert.equal((topics.match(/Đang chuẩn bị/g) || []).length, 3)
  assert.doesNotMatch(topics, /href="\/kham-pha\/|tabindex=|<button/)
  const video = html.match(/<div class="museum-home__video-empty">([\s\S]*?)<div class="museum-home__video-copy">/)?.[1]
  assert.ok(video)
  assert.match(video, /Video đang được chuẩn bị/)
  assert.doesNotMatch(video, /<button|tabindex=|role="button"|<video/)
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0]
  assert.ok(footer)
  for (const path of ['/kham-pha', '/thuyet-minh', '/ve-bao-tang']) assert.ok(footer.includes(`href="${path}"`))
  assert.doesNotMatch(footer, /mailto:|tel:/)
})

test('homepage CTAs reach public destinations and editor CTA only appears with a session', () => {
  const html = renderRoute('/')
  for (const [label, path] of [['Khám phá bảo tàng', '/kham-pha'], ['Xem thuyết minh', '/thuyet-minh'], ['Tìm hiểu về bảo tàng', '/ve-bao-tang'], ['Bắt đầu khám phá', '/kham-pha']]) {
    assert.match(html, new RegExp(`href="${path}"[^>]*>${label}`))
  }
  assert.doesNotMatch(html, /href="\/dashboard"/)
  const authenticatedHtml = renderRoute('/', true)
  assert.match(authenticatedHtml, /museum-home__text-link" href="\/dashboard"[^>]*>Không gian biên tập/)
})

test('homepage presents all four planned languages without pretending media is available', () => {
  const html = renderRoute('/')
  const list = html.match(/<ul class="museum-home__languages"[^>]*>([\s\S]*?)<\/ul>/)?.[1]
  assert.ok(list)
  assert.equal((list.match(/<li>/g) || []).length, 4)
  for (const name of ['English', 'Thai', 'Korean', 'Simplified Chinese']) assert.ok(list.includes(name))
  for (const label of ['Tiếng Anh', 'Tiếng Thái', 'Tiếng Hàn', 'Tiếng Trung giản thể']) assert.match(list, new RegExp(`<h3>${label}</h3>`))
  for (const code of ['en', 'th', 'ko', 'zh-CN']) assert.ok(list.includes(`>${code}</span>`))
  assert.equal((list.match(/Đang chuẩn bị/g) || []).length, 4)
  assert.match(html, /Ngôn ngữ gốc: Tiếng Việt \(vi\)/)
  assert.doesNotMatch(list, /<button|<a\b|<audio/)
})

test('featured video remains an honest empty state with no protected requests or media URLs', () => {
  const html = renderRoute('/')
  assert.match(html, /Video đang được chuẩn bị/)
  assert.match(html, /href="\/thuyet-minh"[^>]*>Đến trang Thuyết minh/)
  assert.doesNotMatch(html, /blob:|https?:\/\/|<video|<iframe|autoplay/)
  assert.doesNotMatch(read('pages/MuseumHomePage.tsx'), /\b(api|apiBlob|fetch)\s*\(|\/projects|accessToken|createObjectURL|onClick/)
})

test('homepage CSS scopes layout and provides shrinkable columns, mobile stacking and stable visual areas', () => {
  const css = read('styles/museum-home.css')
  assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 1023px\)/)
  assert.match(css, /@media \(max-width: 767px\)/)
  assert.match(css, /@media \(max-width: 479px\)/)
  assert.match(css, /aspect-ratio: 16 \/ 9/)
  assert.match(css, /min-height: 44px/)
  assert.match(css, /museum-home__hero :focus-visible/)
  assert.doesNotMatch(css, /overflow-x: hidden|:root|\banimation:/)
  assert.match(read('styles/museum-theme.css'), /prefers-reduced-motion: reduce/)
})

// Controlled fixtures exist only in tests; the application catalog stays empty.
const editorialFixture = {
  slug: 'test-editorial', title: 'Chuyên đề kiểm thử', summary: 'Tóm tắt chỉ dùng trong test.',
  sections: [{ heading: 'Nội dung kiểm thử', paragraphs: ['Văn bản Unicode: ký ức và hòa bình.'] }],
  source: { label: 'Nguồn kiểm thử', reference: 'Fixture nội bộ, không phải nội dung bảo tàng.', verifiedOn: '2026-10-19' },
  publication: 'ready',
}

test('Explore and trailing-slash routes show editorial intro, breadcrumb and honest empty catalog', () => {
  for (const path of ['/kham-pha', '/kham-pha/']) {
    const html = renderRoute(path)
    assert.match(html, /<h1[^>]*>Khám phá bảo tàng/)
    assert.match(html, /aria-label="Đường dẫn trang"/)
    assert.match(html, /aria-current="page">Khám phá/)
    assert.match(html, /Chuyên đề đang được chuẩn bị/)
    assert.match(html, /href="\/thuyet-minh"[^>]*>Đến trang Thuyết minh/)
    assert.doesNotMatch(html, /museum-explore__card |href="\/kham-pha\//)
  }
})

test('valid curated test entry renders public detail, source, breadcrumb and safe CTA', () => {
  const html = renderRoute('/kham-pha/test-editorial', false, [editorialFixture])
  for (const text of [editorialFixture.title, editorialFixture.sections[0].heading, editorialFixture.sections[0].paragraphs[0], editorialFixture.source.label]) assert.ok(html.includes(text))
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.match(html, /aria-current="page">Chuyên đề kiểm thử/)
  assert.match(html, /href="\/kham-pha"[^>]*>Quay lại Khám phá/)
  assert.match(html, /href="\/thuyet-minh"[^>]*>Xem thuyết minh/)
  assert.match(html, /Hình ảnh chuyên đề đang được chuẩn bị/)
  assert.doesNotMatch(html, /PRIVATE_OR_AUTH:|<img/)
  const listing = renderRoute('/kham-pha', false, [editorialFixture])
  assert.match(listing, /href="\/kham-pha\/test-editorial"/)
  assert.doesNotMatch(listing, /Chuyên đề đang được chuẩn bị/)
})

test('unknown, draft, source-missing and duplicate slugs never expose unpublished detail', () => {
  const missingSource = { ...editorialFixture, source: { ...editorialFixture.source, reference: '' } }
  for (const catalog of [[], [{ ...editorialFixture, publication: 'draft' }], [missingSource], [editorialFixture, editorialFixture]]) {
    const html = renderRoute('/kham-pha/test-editorial', false, catalog)
    assert.match(html, /Không tìm thấy chuyên đề/)
    assert.doesNotMatch(html, /Văn bản Unicode|Nguồn kiểm thử/)
    assert.match(html, /href="\/kham-pha"[^>]*>Quay lại Khám phá/)
    assert.match(renderRoute('/kham-pha', false, catalog), /Chuyên đề đang được chuẩn bị/)
  }
  for (const slug of ['not-found', '__proto__', 'constructor', 'test-editorial/extra']) {
    assert.match(renderRoute(`/kham-pha/${slug}`), /Không tìm thấy/)
  }
})

test('curated images require a local public asset with alt, caption and credit', () => {
  const image = { src: '/museum-media/test-photo.webp', alt: 'Ảnh kiểm thử', caption: 'Chú thích kiểm thử', credit: 'Nguồn ảnh kiểm thử' }
  assert.match(renderRoute('/kham-pha/test-editorial', false, [{ ...editorialFixture, image }]), /<img[^>]*src="\/museum-media\/test-photo.webp"[^>]*alt="Ảnh kiểm thử"/)
  for (const src of ['https://example.test/photo.jpg', '/api/projects/private/result', 'blob:private', '/museum-media/../private.jpg']) {
    const html = renderRoute('/kham-pha/test-editorial', false, [{ ...editorialFixture, image: { ...image, src } }])
    assert.doesNotMatch(html, /<img/)
    assert.match(html, /Hình ảnh chuyên đề đang được chuẩn bị/)
  }
})

test('Explore boundary never calls private data APIs; content is escaped and layout stays scoped', () => {
  for (const path of ['pages/MuseumExplorePage.tsx', 'pages/MuseumExhibitionPage.tsx', 'features/museum/exhibitions.ts']) {
    assert.doesNotMatch(read(path), /\b(api|apiBlob|fetch)\s*\(|accessToken|createObjectURL|dangerouslySetInnerHTML/)
  }
  const html = renderRoute('/kham-pha/test-editorial', false, [{ ...editorialFixture, title: '<script>test</script>' }])
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
  const css = read('styles/museum-explore.css')
  assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 767px\)/)
  assert.doesNotMatch(css, /overflow-x: hidden|:root/)
})

const publicVideoAssets = new Set(['/museum-media/test-only-vi.mp4', '/museum-media/test-only-en.webm', '/museum-media/test-only-en.vtt'])
const publicVideoFixture = {
  slug: 'test-only-public-video', title: 'Video fixture công khai', description: 'Chỉ dùng trong test render.',
  visibility: 'PUBLIC', publishedStatus: 'PUBLISHED', sourceLanguage: 'vi',
  sourceAttribution: { label: 'Nguồn fixture', reference: 'Test nội bộ' },
  rights: { confirmed: true, license: 'License fixture', credit: 'Credit fixture', verificationReference: 'Test review' },
  languageVariants: [
    { language: 'vi', state: 'AVAILABLE', videoUrl: '/museum-media/test-only-vi.mp4', transcript: { language: 'vi', text: 'Bản ghi kiểm thử.' } },
    { language: 'en', state: 'AVAILABLE', videoUrl: '/museum-media/test-only-en.webm', captionUrl: '/museum-media/test-only-en.vtt', captionLanguage: 'en' },
    { language: 'th', state: 'PROCESSING' },
  ],
}

test('public video catalog stays empty without fake player and accepts only published test fixtures', () => {
  for (const path of ['/thuyet-minh', '/thuyet-minh/']) {
    const html = renderRoute(path)
    assert.match(html, /Video đang được chuẩn bị/)
    assert.match(html, /aria-current="page">Thuyết minh/)
    assert.doesNotMatch(html, /<video|<track|<iframe|PRIVATE_OR_AUTH:/)
  }
  const listing = renderRoute('/thuyet-minh', false, undefined, [publicVideoFixture], publicVideoAssets)
  assert.match(listing, /href="\/thuyet-minh\/test-only-public-video"/)
  assert.doesNotMatch(listing, /<video/)
})

test('video detail uses native player, real variant states, attribution and public CTA', () => {
  const html = renderRoute('/thuyet-minh/test-only-public-video', false, undefined, [publicVideoFixture], publicVideoAssets)
  assert.match(html, /<video[^>]*controls=""[^>]*preload="metadata"[^>]*src="\/museum-media\/test-only-vi.mp4"/)
  assert.doesNotMatch(html, /auto[Pp]lay|<track|test-only-en.webm|test-only-en.vtt/)
  for (const text of ['Bản ghi kiểm thử.', 'Nguồn fixture', 'License fixture', 'Sẵn sàng', 'Đang xử lý', 'Đang chuẩn bị']) assert.ok(html.includes(text))
  assert.match(html, /href="\/thuyet-minh"[^>]*>Quay lại danh sách video/)
  assert.match(html, /href="\/kham-pha"[^>]*>Khám phá bảo tàng/)
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
})

test('unpublished/missing asset video slugs fail closed and public video UI does not access private APIs', () => {
  for (const [catalog, assets] of [[[], publicVideoAssets], [[{ ...publicVideoFixture, publishedStatus: 'DRAFT' }], publicVideoAssets], [[publicVideoFixture], new Set()]]) {
    const html = renderRoute('/thuyet-minh/test-only-public-video', false, undefined, catalog, assets)
    assert.match(html, /Không tìm thấy video/)
    assert.doesNotMatch(html, /<video|Bản ghi kiểm thử/)
  }
  for (const file of ['pages/MuseumVideosPage.tsx', 'pages/MuseumVideoDetailPage.tsx', 'components/museum/MuseumVideoPlayer.tsx', 'features/museum/publicVideos.ts']) {
    assert.doesNotMatch(read(file), /\b(api|apiBlob|fetch)\s*\(|useSearchParams|accessToken|createObjectURL|dangerouslySetInnerHTML/)
  }
})
