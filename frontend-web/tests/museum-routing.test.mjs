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
          return { ...loaded, museumPublicVideos: publicVideoCatalog, getPublishedPublicVideos: () => loaded.getPublishedPublicVideos(publicVideoCatalog, videoAssets) }
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
  assert.equal((list.match(/class="museum-home__language-icon" aria-hidden="true"/g) || []).length, 4)
  assert.equal((list.match(/<p lang="en">/g) || []).length, 4)
  assert.equal((list.match(/class="museum-home__language-state"/g) || []).length, 4)
  assert.equal((list.match(/Đang chuẩn bị/g) || []).length, 4)
  assert.match(html, /Khám phá những câu chuyện lịch sử qua nhiều ngôn ngữ, kết nối ký ức với người nghe trên khắp thế giới\./)
  assert.doesNotMatch(html, /Ngôn ngữ gốc: Tiếng Việt \(vi\)/)
  assert.doesNotMatch(list, /<button|<a\b|<audio|<select|<img|tabindex=|role="button"|onClick|[\u{1F1E6}-\u{1F1FF}]/u)
})

test('multilingual cards use compact neutral badges and four/two/one-column responsive layout', () => {
  const css = read('styles/museum-home.css')
  assert.match(css, /museum-home__languages[^}]*repeat\(4, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?museum-home__languages[^}]*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?museum-home__languages[^}]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /museum-home__languages li[^}]*grid-template-columns: 32px minmax\(0, 1fr\)[^}]*padding: 14px/)
  assert.match(css, /museum-home__language-state[^}]*background: var\(--museum-color-surface-muted\)[^}]*color: var\(--museum-color-muted-text\)/)
  const badge = css.match(/museum-home__language-state[^}]*}/)[0]
  assert.doesNotMatch(badge, /cursor: pointer|(?:^|[;{])\s*width: 100%|border-top:|transition:|transform:/)
  assert.doesNotMatch(css, /museum-home__language-code/)
})

test('language cards render four distinct centered text icons without changing their labels or status', () => {
  const html = renderRoute('/')
  const list = html.match(/<ul class="museum-home__languages"[^>]*>([\s\S]*?)<\/ul>/)[1]
  const cards = list.match(/<li>[\s\S]*?<\/li>/g)
  const expected = [['EN', 'Tiếng Anh'], ['TH', 'Tiếng Thái'], ['가', 'Tiếng Hàn'], ['中', 'Tiếng Trung giản thể']]
  assert.equal(cards.length, expected.length)
  const icons = cards.map((card, index) => {
    const icon = card.match(/<span class="museum-home__language-icon" aria-hidden="true">([^<]+)<\/span>/)[1]
    assert.equal(icon, expected[index][0])
    assert.ok(card.includes(`<h3>${expected[index][1]}</h3>`))
    assert.match(card, /<span class="museum-home__language-state">Đang chuẩn bị<\/span>/)
    assert.doesNotMatch(card, /<svg|<button|<a\b|tabindex=|role="button"/)
    return icon
  })
  assert.equal(new Set(icons).size, 4)
  const style = read('styles/museum-home.css').match(/\.museum-theme \.museum-home__language-icon \{[^}]+}/)[0]
  assert.match(style, /display: grid; place-items: center/)
  assert.match(style, /width: 32px; height: 32px/)
  assert.match(style, /border-radius: var\(--museum-radius-sm\)/)
  assert.match(style, /background: var\(--museum-color-accent-soft\); color: var\(--museum-color-primary\)/)
  assert.match(style, /font-family: inherit; font-size: \.875rem; font-weight: 700; line-height: 1/)
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

test('full-width hero contains readable overlay content without a development caption or empty row', () => {
  const html = renderRoute('/', false, undefined, undefined, new Set(['/images/museum/hero.jpg']))
  const hero = html.match(/<section class="museum-home__hero"[\s\S]*?<\/section>/)[0]
  assert.doesNotMatch(hero, /museum-home__hero-grid/)
  assert.ok(hero.indexOf('museum-home__hero-backdrop') < hero.indexOf('museum-container'))
  assert.doesNotMatch(hero, /<figcaption|aria-describedby=|Ảnh minh họa bố cục —/)
  for (const path of ['/kham-pha', '/thuyet-minh']) assert.ok(hero.includes(`href="${path}"`))
  const css = read('styles/museum-home.css')
  assert.match(css, /hero-backdrop[^}]*min-block-size: 500px/)
  assert.match(css, /hero-backdrop[^}]*grid-template-rows: 1fr;/)
  assert.match(css, /hero-backdrop > \.museum-home-image__frame[^}]*position: absolute; inset: 0/)
  assert.match(css, /linear-gradient\(90deg, rgb\(17 28 50 \/ 96%\)/)
  assert.match(css, /hero-backdrop > figcaption[^}]*position: relative/)
  assert.doesNotMatch(css, /100vw|max-height:|line-clamp/)
})

test('compact shell is homepage-only and preserves public navigation and footer content', () => {
  const home = renderRoute('/')
  assert.match(home, /museum-public-layout--home/)
  for (const path of ['/kham-pha', '/thuyet-minh', '/ve-bao-tang', '/not-a-page']) {
    assert.doesNotMatch(renderRoute(path), /museum-public-layout--home/)
  }
  const css = read('styles/museum-layout.css')
  assert.match(css, /museum-public-layout--home \.museum-header__row[^}]*min-height: 72px; padding-block: 8px/)
  assert.match(css, /museum-public-layout--home \.museum-footer[^}]*padding-block: clamp\(28px, 3vw, 40px\)/)
  assert.match(css, /museum-public-layout--home \.museum-footer__notice[^}]*margin-top: 20px; padding-top: 16px/)
  assert.match(home, /Website thuyết minh đang được phát triển/)
  for (const path of ['/kham-pha', '/thuyet-minh', '/ve-bao-tang']) assert.ok(home.includes(`href="${path}"`))
})

test('compact homepage retains readable sizes, bounded media and content-driven responsive height', () => {
  const css = read('styles/museum-home.css')
  assert.match(css, /--museum-home-section-space: clamp\(32px, 4vw, 48px\)/)
  assert.match(css, /font-size: clamp\(2.75rem, 3.6vw, 3.25rem\)/)
  assert.match(css, /hero-backdrop[^}]*min-block-size: 500px/)
  assert.match(css, /hero-backdrop[^}]*min-block-size: 480px/)
  assert.match(css, /hero-backdrop[^}]*min-block-size: 0/)
  assert.match(css, /museum-home__intro-image[^}]*max-width: 480px/)
  assert.match(css, /museum-home__video-empty[^}]*max-width: 520px/)
  assert.match(css, /museum-home__topic \.museum-home-image__frame[^}]*aspect-ratio: 16 \/ 10/)
  assert.match(css, /museum-home__topic[^}]*padding: 16px/)
  assert.match(css, /museum-home__languages li[^}]*padding: 14px/)
  assert.match(css, /min-height: 44px/)
  assert.doesNotMatch(css, /(?:^|[;{])\s*(?:zoom|transform)\s*:|max-height:|line-clamp|text-overflow: ellipsis|overflow-x: hidden/)
})

test('homepage hero reuses only an existing public approved poster without media playback', () => {
  const path = '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg'
  const html = renderRoute('/', false, undefined, undefined, new Set([path]))
  assert.match(html, /museum-home__hero-backdrop/)
  assert.match(html, /<img[^>]*width="640"[^>]*height="360"/)
  assert.ok(html.includes(`src="${path}"`))
  assert.match(html, /alt="Không gian ngoài trời trong video giới thiệu/)
  assert.match(html, /Khung hình từ video giới thiệu bảo tàng/)
  assert.doesNotMatch(html, /<video|<iframe|<audio|autoplay/)
  const css = read('styles/museum-home.css')
  assert.match(css, /museum-home-image--wide[^}]*aspect-ratio: 16 \/ 9/)
  assert.match(css, /museum-home-image__frame img[^}]*object-fit: cover/)
})

test('homepage hero rejects private, draft, unapproved and missing poster assets', () => {
  const posterUrl = '/museum/posters/test-only.jpg'
  const fixture = { slug: 'bao-tang-chung-tich-chien-tranh', visibility: 'PUBLIC', publishedStatus: 'PUBLISHED', rights: { confirmed: true }, posterUrl }
  for (const patch of [{ visibility: 'PRIVATE' }, { publishedStatus: 'DRAFT' }, { rights: { confirmed: false } }, { posterUrl: '/projects/private.jpg' }]) {
    const html = renderRoute('/', false, undefined, [{ ...fixture, ...patch }], new Set([posterUrl]))
    assert.doesNotMatch(html, /<img/)
    assert.match(html, /Hình ảnh bảo tàng đang được chuẩn bị/)
  }
  assert.doesNotMatch(renderRoute('/', false, undefined, [fixture], new Set()), /<img/)
  assert.match(read('components/museum/MuseumHomeImage.tsx'), /onError=\{\(\) => setFailedSources/)
})

test('six homepage slots preserve assets and alt without development notices or empty captions', () => {
  const files = ['hero', 'museum-intro', 'exhibition-history', 'exhibition-people', 'exhibition-peace', 'featured-video']
  const inventory = new Set(files.map(file => `/images/museum/${file}.jpg`))
  const html = renderRoute('/', false, undefined, undefined, inventory)
  assert.equal((html.match(/<img\b/g) || []).length, 6)
  assert.equal((html.match(/data-image-slot=/g) || []).length, 6)
  assert.doesNotMatch(html, /<figcaption|museum-topics-image-notice|museum-home__image-notice/)
  const visibleText = html.replace(/<[^>]*>/g, '')
  assert.doesNotMatch(visibleText, /Ảnh minh họa|Ảnh demo|không phải tư liệu lịch sử đã xác minh/)
  assert.equal((html.match(/loading="eager"/g) || []).length, 1)
  assert.equal((html.match(/loading="lazy"/g) || []).length, 5)
  for (const file of files) assert.ok(html.includes(`src="/images/museum/${file}.jpg"`))
  for (const image of html.match(/<img\b[^>]*>/g)) {
    assert.match(image, /alt="[^"]+"/)
    assert.match(image, /width="\d+" height="\d+"/)
    assert.match(image, /decoding="async"/)
  }
  const topics = html.match(/<div class="museum-home__topics">([\s\S]*?)<\/section>/)[1]
  assert.equal((topics.match(/Đang chuẩn bị/g) || []).length, 3)
  assert.doesNotMatch(topics.split('<a class="museum-home__text-link')[0], /<a\b|<button/)
})

test('featured thumbnail prioritizes the matching approved poster while hero prefers its own image', () => {
  const poster = '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg'
  const html = renderRoute('/', false, undefined, undefined, new Set([poster, '/images/museum/hero.jpg', '/images/museum/featured-video.jpg']))
  const hero = html.match(/data-image-slot="hero"[\s\S]*?<\/figure>/)[0]
  const video = html.match(/data-image-slot="featuredVideo"[\s\S]*?<\/figure>/)[0]
  assert.match(hero, /src="\/images\/museum\/hero.jpg"/)
  assert.ok(video.includes(`src="${poster}"`))
  assert.doesNotMatch(video, /src="\/images\/museum\/featured-video.jpg"/)
  assert.match(video, /Khung hình từ video giới thiệu bảo tàng/)
})

test('unrelated catalog posters cannot illustrate the featured museum video', () => {
  const posterUrl = '/museum/posters/unrelated.jpg'
  const html = renderRoute('/', false, undefined, [{ slug: 'unrelated', visibility: 'PUBLIC', publishedStatus: 'PUBLISHED', rights: { confirmed: true }, posterUrl }], new Set([posterUrl]))
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /Video đang được chuẩn bị/)
})

test('missing slot assets never emit broken img tags or affect public publication contracts', () => {
  const html = renderRoute('/', false, undefined, undefined, new Set(['/images/museum/unconfigured.jpg']))
  assert.doesNotMatch(html, /<img/)
  assert.equal((html.match(/data-image-slot=/g) || []).length, 6)
  const source = read('features/museum/homeImages.ts') + read('components/museum/MuseumHomeImage.tsx')
  assert.doesNotMatch(source, /\bfetch\s*\(|accessToken|createObjectURL|dangerouslySetInnerHTML|https?:\/\//)
})

test('homepage polish preserves scoped blue surfaces, long-text reflow and public menu safety', () => {
  const home = read('styles/museum-home.css'), layout = read('styles/museum-layout.css')
  assert.match(home, /museum-home__hero[^}]*background: var\(--brand-dark\)/)
  assert.match(home, /museum-home__section--surface[^}]*var\(--museum-color-surface-muted\)/)
  assert.match(home, /museum-home__closing-row[^}]*display: flex; flex-wrap: wrap/)
  assert.match(home, /museum-home__link[\s\S]*?overflow-wrap: anywhere/)
  assert.match(home, /--museum-home-section-space:/)
  const sharedLayout = layout.split('/* Homepage refinement only;')[0]
  assert.ok(sharedLayout.lastIndexOf('@media (max-width: 479px)') > sharedLayout.lastIndexOf('@media (max-width: 767px)'))
  assert.match(layout, /museum-footer__row > \*,[\s\S]*?min-width: 0; overflow-wrap: anywhere/)
  assert.doesNotMatch(home + layout, /text-overflow: ellipsis|line-clamp|overflow-x: hidden/)
  const header = read('components/museum/MuseumHeader.tsx')
  assert.match(header, /dialog\.showModal\(\)/)
  assert.match(header, /trigger\?\.focus\(\)/)
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
  assert.match(listing, /aria-label="Xem video: Video fixture công khai"[^>]*>Xem video/)
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

test('actual authorized catalog entry renders publicly with local MP4, source credit and unavailable target languages', () => {
  const inventory = new Set(['/museum/videos/bao-tang-chung-tich-chien-tranh.mp4', '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg'])
  const listing = renderRoute('/thuyet-minh', false, undefined, undefined, inventory)
  assert.match(listing, /Bảo tàng Chứng tích Chiến tranh — Video giới thiệu/)
  assert.match(listing, /href="\/thuyet-minh\/bao-tang-chung-tich-chien-tranh"/)
  assert.match(listing, />Xem video<\/a>/)
  const html = renderRoute('/thuyet-minh/bao-tang-chung-tich-chien-tranh?videoUrl=https://example.test/private.mp4', false, undefined, undefined, inventory)
  assert.match(html, /src="\/museum\/videos\/bao-tang-chung-tich-chien-tranh.mp4"/)
  assert.match(html, /poster="\/museum\/posters\/bao-tang-chung-tich-chien-tranh.jpg"/)
  assert.doesNotMatch(html, /class="museum-video__transcript"|museum-video__experience--with-transcript/)
  assert.match(html, /href="https:\/\/youtu.be\/_MN6nsn-XDM" target="_blank" rel="noopener noreferrer">Nguồn video: YouTube — xem video gốc/)
  assert.match(html, /Chưa có bản ghi công khai cho ngôn ngữ này/)
  assert.doesNotMatch(html, /<track|autoplay|example.test\/private.mp4/)
  const radios = html.match(/<input\b[^>]*>/g)
  for (const code of ['vi', 'en', 'th', 'ko', 'zh-CN']) {
    const radio = radios.find((input) => input.includes(`value="${code}"`))
    assert.ok(radio)
    if (code === 'vi') assert.doesNotMatch(radio, /disabled/); else assert.match(radio, /disabled/)
  }
  assert.match(renderRoute('/thuyet-minh/not-published', false, undefined, undefined, inventory), /Không tìm thấy video/)
})

test('single video uses a featured card while multiple published videos retain the responsive grid', () => {
  const catalog = [{ ...publicVideoFixture, posterUrl: '/museum/posters/test-only.jpg' }]
  const inventory = new Set([...publicVideoAssets, '/museum/posters/test-only.jpg'])
  const featured = renderRoute('/thuyet-minh', false, undefined, catalog, inventory)
  assert.match(featured, /museum-video__cards--featured/)
  assert.match(featured, /<img[^>]*src="\/museum\/posters\/test-only.jpg"[^>]*loading="eager"/)
  const multiple = renderRoute('/thuyet-minh', false, undefined, [...catalog, { ...catalog[0], slug: 'second-test-only', title: 'Video test thứ hai' }], inventory)
  assert.doesNotMatch(multiple, /museum-video__cards--featured/)
  assert.equal((multiple.match(/museum-video__card-copy/g) || []).length, 2)
  assert.match(multiple, /loading="lazy"/)
  const detailWithTranscript = renderRoute('/thuyet-minh/test-only-public-video', false, undefined, catalog, inventory)
  assert.match(detailWithTranscript, /museum-video__experience--with-transcript/)
  assert.match(detailWithTranscript, /class="museum-video__transcript"/)
  assert.match(detailWithTranscript, /Bản ghi kiểm thử/)
})
