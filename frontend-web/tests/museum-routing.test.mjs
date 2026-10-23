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
        if (/\/pages\//.test(name) && !/\/Museum(?:Placeholder|Home|About|Explore|Exhibition|Videos|VideoDetail)Page$/.test(name)) {
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
    assert.match(html, path === '/' ? /Những câu chuyện lịch sử/ : path.startsWith('/kham-pha') ? /Các chuyên đề/ : path.startsWith('/thuyet-minh') ? /Chưa có video/ : /Về bảo tàng/)
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
  for (const text of ['Những câu chuyện lịch sử', 'từ hiện thực.', 'Không gian trưng bày', 'Lắng nghe theo cách của bạn', 'Một hành trình qua những câu chuyện', 'Dành thời gian để khám phá.', 'Chưa có hình ảnh']) assert.ok(html.includes(text))
  assert.doesNotMatch(html, /<img|<iframe|<video|<audio/)
})

test('Museum polish keeps editorial cards and video non-interactive and footer links public', () => {
  const html = renderRoute('/')
  const topics = html.match(/<div class="museum-home__topics">([\s\S]*?)<\/section>/)?.[1]
  assert.ok(topics)
  assert.equal((topics.match(/museum-home__topic-top/g) || []).length, 3)
  assert.doesNotMatch(topics, /Đang chuẩn bị/)
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
  const html = renderRoute('/', false, undefined, undefined, new Set(['/museum/images/hero.jpg']))
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

test('compact shared shell preserves the homepage marker, public navigation and footer content', () => {
  const home = renderRoute('/')
  assert.match(home, /museum-public-layout--home/)
  for (const path of ['/kham-pha', '/thuyet-minh', '/ve-bao-tang', '/not-a-page']) {
    assert.doesNotMatch(renderRoute(path), /museum-public-layout--home/)
  }
  const css = read('styles/museum-layout.css')
  assert.match(css, /museum-public-layout \.museum-header__row[^}]*min-height: 72px; padding-block: 8px/)
  assert.match(css, /museum-public-layout \.museum-footer[^}]*padding-block: clamp\(28px, 3vw, 40px\)/)
  assert.match(css, /museum-public-layout \.museum-footer__notice[^}]*margin-top: 20px; padding-top: 16px/)
  assert.doesNotMatch(home, /Website thuyết minh đang được phát triển|museum-footer__notice/)
  for (const path of ['/kham-pha', '/thuyet-minh', '/ve-bao-tang']) assert.ok(home.includes(`href="${path}"`))
})

test('all five public pages retain a single shell, original navigation and honest content availability', () => {
  const inventory = new Set(['hero', 'museum-intro', 'exhibition-history', 'exhibition-people', 'exhibition-peace', 'featured-video'].map(name => `/museum/images/${name}.jpg`))
  inventory.add('/museum/videos/bao-tang-chung-tich-chien-tranh.mp4')
  inventory.add('/museum/posters/bao-tang-chung-tich-chien-tranh.jpg')
  for (const path of ['/', '/kham-pha', '/thuyet-minh', '/ve-bao-tang', '/thuyet-minh/bao-tang-chung-tich-chien-tranh']) {
    const html = renderRoute(path, false, undefined, undefined, inventory)
    assert.equal((html.match(/class="museum-header"/g) || []).length, 1)
    assert.equal((html.match(/class="museum-footer"/g) || []).length, 1)
    assert.equal((html.match(/<h1\b/g) || []).length, 1)
    for (const target of ['/', '/kham-pha', '/thuyet-minh', '/ve-bao-tang']) assert.ok(html.includes(`href="${target}"`))
    assert.doesNotMatch(html, /Ảnh minh họa|Ảnh demo|Website thuyết minh đang được phát triển|Chưa có nội dung công khai/)
    assert.match(html, /id="museum-language" disabled=""/)
    if (path.startsWith('/thuyet-minh/')) {
      assert.equal((html.match(/type="radio"[^>]*disabled=""/g) || []).length, 4)
      assert.match(html, /Sẵn sàng/)
      assert.match(html, /Đang chuẩn bị/)
    }
  }
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
  assert.doesNotMatch(html, /Khung hình từ video giới thiệu bảo tàng/)
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
    assert.match(html, /Chưa có hình ảnh/)
  }
  assert.doesNotMatch(renderRoute('/', false, undefined, [fixture], new Set()), /<img/)
  assert.match(read('components/museum/MuseumHomeImage.tsx'), /onError=\{\(\) => setFailedSources/)
})

test('six homepage slots preserve assets and alt without development notices or empty captions', () => {
  const files = ['hero', 'museum-intro', 'exhibition-history', 'exhibition-people', 'exhibition-peace', 'featured-video']
  const inventory = new Set(files.map(file => `/museum/images/${file}.jpg`))
  const html = renderRoute('/', false, undefined, undefined, inventory)
  assert.equal((html.match(/<img\b/g) || []).length, 6)
  assert.equal((html.match(/data-image-slot=/g) || []).length, 6)
  assert.doesNotMatch(html, /<figcaption|museum-topics-image-notice|museum-home__image-notice/)
  const visibleText = html.replace(/<[^>]*>/g, '')
  assert.doesNotMatch(visibleText, /Ảnh minh họa|Ảnh demo|không phải tư liệu lịch sử đã xác minh/)
  assert.equal((html.match(/loading="eager"/g) || []).length, 1)
  assert.equal((html.match(/loading="lazy"/g) || []).length, 5)
  for (const file of files) assert.ok(html.includes(`src="/museum/images/${file}.jpg"`))
  for (const image of html.match(/<img\b[^>]*>/g)) {
    assert.match(image, /alt="[^"]+"/)
    assert.match(image, /width="\d+" height="\d+"/)
    assert.match(image, /decoding="async"/)
  }
  const topics = html.match(/<div class="museum-home__topics">([\s\S]*?)<\/section>/)[1]
  assert.doesNotMatch(topics, /Đang chuẩn bị/)
  assert.doesNotMatch(topics.split('<a class="museum-home__text-link')[0], /<a\b|<button/)
})

test('featured thumbnail prioritizes the matching approved poster while hero prefers its own image', () => {
  const poster = '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg'
  const html = renderRoute('/', false, undefined, undefined, new Set([poster, '/museum/images/hero.jpg', '/museum/images/featured-video.jpg']))
  const hero = html.match(/data-image-slot="hero"[\s\S]*?<\/figure>/)[0]
  const video = html.match(/data-image-slot="featuredVideo"[\s\S]*?<\/figure>/)[0]
  assert.match(hero, /src="\/museum\/images\/hero.jpg"/)
  assert.ok(video.includes(`src="${poster}"`))
  assert.doesNotMatch(video, /src="\/museum\/images\/featured-video.jpg"/)
  assert.doesNotMatch(video, /<figcaption|Khung hình từ video giới thiệu bảo tàng/)
})

test('unrelated catalog posters cannot illustrate the featured museum video', () => {
  const posterUrl = '/museum/posters/unrelated.jpg'
  const html = renderRoute('/', false, undefined, [{ slug: 'unrelated', visibility: 'PUBLIC', publishedStatus: 'PUBLISHED', rights: { confirmed: true }, posterUrl }], new Set([posterUrl]))
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /Video đang được chuẩn bị/)
})

test('missing slot assets never emit broken img tags or affect public publication contracts', () => {
  const html = renderRoute('/', false, undefined, undefined, new Set(['/museum/images/unconfigured.jpg']))
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
  const sharedLayout = layout.split('/* Shared compact shell:')[0]
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
    assert.match(html, /Các chuyên đề/)
    assert.match(html, /href="\/thuyet-minh"[^>]*>Đến trang Thuyết minh/)
    assert.doesNotMatch(html, /museum-explore__card |href="\/kham-pha\//)
  }
})

test('Explore preparation cards reuse the exact homepage images without publication or dead links', () => {
  const filenames = ['exhibition-history', 'exhibition-people', 'exhibition-peace']
  const assets = new Set(filenames.map(name => `/museum/images/${name}.jpg`))
  const html = renderRoute('/kham-pha', false, undefined, undefined, assets)
  const previews = html.match(/<div class="museum-explore__grid museum-explore__previews">([\s\S]*?)<a class="museum-explore__text-link/)[1]
  assert.equal((previews.match(/museum-explore__preview-copy/g) || []).length, 3)
  assert.doesNotMatch(previews, /Đang chuẩn bị/)
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  for (const [index, title] of ['Lịch sử và ký ức', 'Câu chuyện con người', 'Giá trị của hòa bình'].entries()) {
    assert.ok(previews.includes(`<h3>${title}</h3>`))
    assert.ok(previews.includes(`src="/museum/images/${filenames[index]}.jpg"`))
    assert.ok(renderRoute('/', false, undefined, undefined, assets).includes(`src="/museum/images/${filenames[index]}.jpg"`))
  }
  const images = previews.match(/<img\b[^>]*>/g)
  assert.equal(images.length, 3)
  for (const image of images) {
    assert.match(image, /alt="[^"]+"/)
    assert.match(image, /loading="lazy"/)
    assert.match(image, /width="800" height="600"/)
  }
  assert.doesNotMatch(previews, /<a\b|<button|tabindex=|role="button"|<figcaption/)
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /Ảnh minh họa|Ảnh demo/)
  for (const slug of filenames) assert.match(renderRoute(`/kham-pha/${slug}`, false, undefined, undefined, assets), /Không tìm thấy chuyên đề/)
})

test('Explore missing images retain three honest preparation cards and stable scoped responsive areas', () => {
  const html = renderRoute('/kham-pha')
  assert.equal((html.match(/museum-explore__preview-copy/g) || []).length, 3)
  assert.equal((html.match(/Chưa có hình ảnh/g) || []).length, 3)
  assert.doesNotMatch(html, /<img|href="\/kham-pha\/|museum-explore__empty"/)
  const css = read('styles/museum-explore.css')
  assert.match(css, /museum-explore__grid[^}]*repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?museum-explore__grid[^}]*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?museum-explore__grid[^}]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /museum-explore--listing \.museum-explore__preview[^}]*height: 100%; padding: 16px/)
  assert.match(css, /museum-explore__preview \.museum-home-image__frame[^}]*aspect-ratio: 16 \/ 10/)
  assert.doesNotMatch(css, /line-clamp|text-overflow: ellipsis|overflow-x: hidden|100vw/)
})

test('public visitor pages omit development copy while preserving availability, errors and inactive topics', () => {
  const assets = new Set(['hero', 'museum-intro', 'exhibition-history', 'exhibition-people', 'exhibition-peace', 'featured-video'].map(name => `/museum/images/${name}.jpg`))
  for (const path of ['/', '/kham-pha', '/ve-bao-tang', '/thuyet-minh', '/not-a-page']) {
    const html = renderRoute(path, false, undefined, undefined, assets)
    assert.doesNotMatch(html, /Chuyên đề đang được chuẩn bị|sau khi được duyệt|sẵn sàng để công bố|Website thuyết minh đang được phát triển|Ảnh minh họa|Ảnh demo|museum-footer__notice/)
    assert.match(html, /<header[\s\S]*<main[\s\S]*<footer/)
  }
  const listing = renderRoute('/kham-pha', false, undefined, undefined, assets)
  const topics = listing.match(/<div class="museum-explore__grid museum-explore__previews">([\s\S]*?)<a class="museum-explore__text-link/)[1]
  assert.doesNotMatch(topics, /Đang chuẩn bị|<a\b|<button|tabindex=|role="button"/)
  assert.equal((topics.match(/<h3>/g) || []).length, 3)
  assert.match(listing, /Không gian trưng bày là nơi kết nối câu chuyện, hình ảnh và tư liệu/)
  const home = renderRoute('/', false, undefined, undefined, assets)
  const languages = home.match(/<ul class="museum-home__languages"[^>]*>([\s\S]*?)<\/ul>/)[1]
  assert.equal((languages.match(/Đang chuẩn bị/g) || []).length, 4)
  assert.match(renderRoute('/not-a-page'), /Đường dẫn không tồn tại/)
  assert.match(renderRoute('/thuyet-minh/not-published'), /Không tìm thấy video/)
  assert.match(renderRoute('/kham-pha/not-published'), /Không tìm thấy chuyên đề/)
  assert.match(renderRoute('/thuyet-minh'), /Chưa có video được công bố/)
})

test('valid curated test entry renders public detail, source, breadcrumb and safe CTA', () => {
  const html = renderRoute('/kham-pha/test-editorial', false, [editorialFixture])
  for (const text of [editorialFixture.title, editorialFixture.sections[0].heading, editorialFixture.sections[0].paragraphs[0], editorialFixture.source.label]) assert.ok(html.includes(text))
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.match(html, /aria-current="page">Chuyên đề kiểm thử/)
  assert.match(html, /href="\/kham-pha"[^>]*>Quay lại Khám phá/)
  assert.match(html, /href="\/thuyet-minh"[^>]*>Xem thuyết minh/)
  assert.match(html, /Chưa có hình ảnh/)
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
    assert.match(renderRoute('/kham-pha', false, catalog), /Các chuyên đề/)
  }
  for (const slug of ['not-found', '__proto__', 'constructor', 'test-editorial/extra']) {
    assert.match(renderRoute(`/kham-pha/${slug}`), /Không tìm thấy/)
  }
})

test('curated images require a local public asset with alt, caption and credit', () => {
  const image = { src: '/museum/images/test-photo.webp', alt: 'Ảnh kiểm thử', caption: 'Chú thích kiểm thử', credit: 'Nguồn ảnh kiểm thử' }
  for (const src of [image.src, '/museum-media/test-photo.webp']) {
    const html = renderRoute('/kham-pha/test-editorial', false, [{ ...editorialFixture, image: { ...image, src } }])
    assert.ok(html.includes(`src="${src}"`))
    assert.match(html, /<img[^>]*alt="Ảnh kiểm thử"/)
  }
  for (const src of ['https://example.test/photo.jpg', '/api/projects/private/result', 'blob:private', '/museum-media/../private.jpg']) {
    const html = renderRoute('/kham-pha/test-editorial', false, [{ ...editorialFixture, image: { ...image, src } }])
    assert.doesNotMatch(html, /<img/)
    assert.match(html, /Chưa có hình ảnh/)
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
    assert.match(html, /Chưa có video/)
    assert.match(html, /aria-current="page">Thuyết minh/)
    assert.doesNotMatch(html, /<video|<track|<iframe|PRIVATE_OR_AUTH:/)
  }
  const listing = renderRoute('/thuyet-minh', false, undefined, [publicVideoFixture], publicVideoAssets)
  assert.match(listing, /href="\/thuyet-minh\/test-only-public-video"/)
  assert.match(listing, /aria-label="Xem video: Video fixture công khai"[^>]*><svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>Xem video/)
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
  assert.match(html, /href="https:\/\/youtu.be\/_MN6nsn-XDM" target="_blank" rel="noopener noreferrer"[^>]*>Nguồn video gốc/)
  assert.doesNotMatch(html, /Chưa có bản ghi công khai cho ngôn ngữ này|museum-video__transcript-empty/)
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

test('narration listing preserves real content and navigation with a decorative Play CTA', () => {
  const assets = new Set(['/museum/videos/bao-tang-chung-tich-chien-tranh.mp4', '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg'])
  const html = renderRoute('/thuyet-minh', false, undefined, undefined, assets)
  assert.match(html, /class="museum-video museum-video--listing"/)
  assert.match(html, /<h1[^>]*>Thuyết minh bảo tàng<\/h1>/)
  assert.match(html, /Lắng nghe những câu chuyện lịch sử qua video và ngôn ngữ của bạn\./)
  assert.match(html, /aria-current="page">Thuyết minh/)
  const card = html.match(/<div class="card[^>]*museum-video__card"[\s\S]*?<\/section>/)[0]
  assert.ok(card.indexOf('museum-video__card-media') < card.indexOf('museum-video__card-copy'))
  const cta = card.match(/<a[^>]*museum-video__watch-link[^>]*>[\s\S]*?<\/a>/)[0]
  assert.match(cta, /href="\/thuyet-minh\/bao-tang-chung-tich-chien-tranh"/)
  assert.match(cta, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/)
  assert.match(cta, /<path d="M8 5v14l11-7Z"/)
  assert.equal(cta.replace(/<[^>]*>/g, ''), 'Xem video')
  assert.doesNotMatch(html, /<video|<iframe|autoplay|Ảnh demo|đang được phát triển/)
  const detail = renderRoute('/thuyet-minh/bao-tang-chung-tich-chien-tranh', false, undefined, undefined, assets)
  assert.doesNotMatch(detail, /museum-video--listing/)
  assert.match(detail, /<video[^>]*controls=""/)
})

test('about page reuses the homepage facade, approved copy and existing Explore destination', () => {
  const assets = new Set(['/museum/images/museum-intro.jpg'])
  for (const authenticated of [false, true]) {
    const html = renderRoute('/ve-bao-tang/', authenticated, undefined, undefined, assets)
    assert.equal((html.match(/<h1\b/g) || []).length, 1)
    assert.match(html, /<h1[^>]*>Về bảo tàng<\/h1>/)
    assert.match(html, /aria-current="page">Về bảo tàng/)
    assert.match(html, /data-image-slot="museumIntro"/)
    assert.match(html, /<img src="\/museum\/images\/museum-intro.jpg"[^>]*alt="Hình ảnh giới thiệu bảo tàng"[^>]*loading="lazy"/)
    assert.match(html, /Gìn giữ ký ức\. Kết nối hôm nay\./)
    assert.match(html, /<h2>Về bảo tàng<\/h2>/)
    assert.match(html, /<h2>Hành trình khám phá<\/h2>/)
    assert.match(html, /class="museum-about__cta" href="\/kham-pha"[^>]*>Khám phá bảo tàng/)
    assert.ok(html.indexOf('data-image-slot="museumIntro"') < html.indexOf('class="museum-about__copy"'))
    assert.doesNotMatch(html, /Chưa có nội dung công khai|Thông tin bảo tàng|Ảnh minh họa|Ảnh demo|placeholder|PRIVATE_OR_AUTH:/)
    const source = read('pages/MuseumAboutPage.tsx')
    assert.doesNotMatch(source, /\b(?:fetch|api|apiBlob)\s*\(|useEffect|accessToken/)
  }
})

test('about image absence has a fallback and page styles preserve responsive reflow', () => {
  const html = renderRoute('/ve-bao-tang')
  assert.match(html, /museum-home-image__fallback/)
  assert.doesNotMatch(html, /<img|Ảnh minh họa|demo|Chưa có nội dung công khai/)
  const css = read('styles/museum-about.css')
  assert.match(css, /museum-about__intro[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*museum-about__intro[^}]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*museum-about__information[^}]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /aspect-ratio: 4 \/ 3/)
  assert.match(css, /object-fit: cover/)
  assert.match(css, /cta[^}]*min-height: 44px/)
  assert.match(css, /focus-visible[^}]*outline: 3px solid/)
  assert.doesNotMatch(css, /line-clamp|100vw|(?:^|[;{])\s*(?:zoom:|transform:|height:\s*\d+px)/)
})

test('narration listing CSS bounds featured width and stacks media above copy on tablet', () => {
  const css = read('styles/museum-video.css')
  const listingCss = css.split('/* Narration listing only:')[1]
  assert.ok(listingCss)
  assert.match(listingCss, /museum-video__cards--featured[^}]*max-width: 1120px; margin-inline: auto/)
  assert.match(listingCss, /museum-video__card[^}]*grid-template-columns: minmax\(0, 1.1fr\) minmax\(0, 1fr\)/)
  assert.match(listingCss, /@media \(max-width: 1023px\)[\s\S]*?museum-video__card[^}]*grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /museum-video__poster[^}]*aspect-ratio: 16 \/ 9; object-fit: cover/)
  assert.match(css, /museum-video__card:hover[^}]*museum-video__card:focus-within/)
  assert.match(listingCss, /watch-link[^}]*min-height: 44px/)
  assert.match(listingCss, /watch-link:focus-visible,[\s\S]*?outline: 3px solid var\(--museum-color-focus\)/)
  assert.doesNotMatch(listingCss, /100vw|min-height: \d{3,}px|line-clamp|max-height:|overflow-x: hidden|position: absolute|(?:^|[;{])\s*height:\s*\d+px/)
})

test('detail polish preserves actual video, source rights and disabled language choices', () => {
  const inventory = new Set(['/museum/videos/bao-tang-chung-tich-chien-tranh.mp4', '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg'])
  const html = renderRoute('/thuyet-minh/bao-tang-chung-tich-chien-tranh', false, undefined, undefined, inventory)
  assert.match(html, /class="museum-video museum-video--detail"/)
  assert.match(html, /aria-current="page">Bảo tàng Chứng tích Chiến tranh — Video giới thiệu/)
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
  assert.equal((html.match(/<video\b/g) || []).length, 1)
  assert.match(html, /<video[^>]*controls=""[^>]*playsInline=""[^>]*preload="metadata"[^>]*src="\/museum\/videos\/bao-tang-chung-tich-chien-tranh.mp4"/)
  assert.match(html, /class="museum-video__language-status museum-video__language-status--ready">Sẵn sàng/)
  const radios = html.match(/<input\b[^>]*>/g)
  assert.equal(radios.length, 5)
  assert.equal(radios.filter(radio => radio.includes('disabled')).length, 4)
  assert.equal(radios.filter(radio => radio.includes('checked')).length, 1)
  assert.match(html, /Được chủ kênh cho phép tải và đăng lại trên website, theo xác nhận của người dùng\. Quyền cho phép cụ thể cho website, không phải giấy phép Creative Commons\./)
  assert.match(html, /href="https:\/\/youtu.be\/_MN6nsn-XDM" target="_blank" rel="noopener noreferrer"/)
  assert.match(html, /<nav class="museum-video__actions" aria-label="Tiếp tục khám phá">/)
  assert.match(html, /href="\/thuyet-minh"[^>]*>Quay lại danh sách video/)
  assert.match(html, /href="\/kham-pha"[^>]*>Khám phá bảo tàng/)
  assert.doesNotMatch(html, /Chưa có bản ghi công khai|Ngôn ngữ gốc:|<track|auto[Pp]lay|<iframe/)
  assert.doesNotMatch(renderRoute('/thuyet-minh', false, undefined, undefined, inventory), /museum-video--detail/)
})

test('detail styling prioritizes a centered player and reflows language and navigation controls', () => {
  const css = read('styles/museum-video.css')
  const detailCss = css.split('/* Detail presentation only:')[1]
  assert.ok(detailCss)
  assert.match(detailCss, /museum-video--detail > .museum-container[^}]*max-width: 1120px/)
  assert.match(detailCss, /experience--with-transcript[^}]*grid-template-columns: minmax\(0, 1fr\)[^}]*max-width: 1040px; margin-inline: auto/)
  assert.match(css, /player video[^}]*aspect-ratio: 16 \/ 9; object-fit: contain/)
  assert.match(css, /language-grid[^}]*repeat\(5, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?language-grid[^}]*repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?language-grid[^}]*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(detailCss, /input:disabled[^}]*cursor: not-allowed; border-style: dashed/)
  assert.match(detailCss, /focus-visible[^}]*outline: 3px solid var\(--museum-color-focus\)/)
  assert.match(detailCss, /@media \(max-width: 479px\)[\s\S]*?actions[^}]*flex-direction: column/)
  assert.doesNotMatch(detailCss, /line-clamp|100vw|overflow-x: hidden|(?:^|[;{])\s*(?:zoom:|transform:|height:\s*\d+px)/)
})

test('video credits stay inline below media with full licence and no large technical panel', () => {
  const inventory = new Set(['/museum/videos/bao-tang-chung-tich-chien-tranh.mp4', '/museum/posters/bao-tang-chung-tich-chien-tranh.jpg'])
  const html = renderRoute('/thuyet-minh/bao-tang-chung-tich-chien-tranh', false, undefined, undefined, inventory)
  const credit = html.match(/<p class="museum-video__credit">[\s\S]*?<\/p>/)?.[0]
  assert.ok(credit)
  assert.match(credit, /href="https:\/\/youtu.be\/_MN6nsn-XDM" target="_blank" rel="noopener noreferrer" class="museum-video__source-link">Nguồn video gốc/)
  assert.match(credit, /class="visually-hidden"> \(mở trong thẻ mới\)/)
  assert.match(credit, /class="museum-video__credit-details">YouTube/)
  assert.doesNotMatch(credit, /Nguồn video: YouTube — xem video gốc/)
  assert.match(credit, /Được chủ kênh cho phép tải và đăng lại trên website, theo xác nhận của người dùng\. Quyền cho phép cụ thể cho website, không phải giấy phép Creative Commons\./)
  assert.ok(html.indexOf('</video>') < html.indexOf(credit))
  assert.ok(html.indexOf(credit) < html.indexOf('class="museum-video__actions"'))
  assert.doesNotMatch(html, /Nguồn và quyền sử dụng|class="museum-video__source"|museum-video__rights|Chưa có bản ghi công khai/)
  for (const state of ['Sẵn sàng', 'Đang chuẩn bị', 'Đang tải video']) assert.ok(html.includes(state))
  const withTranscript = renderRoute('/thuyet-minh/test-only-public-video', false, undefined, [publicVideoFixture], publicVideoAssets)
  assert.ok(withTranscript.indexOf('museum-video__credit') < withTranscript.indexOf('class="museum-video__transcript"'))
  assert.match(withTranscript, /Credit fixture — Nguồn fixture — Test nội bộ/)
  assert.match(withTranscript, /License fixture/)
  const css = read('styles/museum-video.css')
  assert.match(css, /museum-video__credit[^}]*margin: 0;[^}]*font-size: .875rem;[^}]*overflow-wrap: anywhere/)
  assert.doesNotMatch(css, /\.museum-video__source\s*\{|museum-video__rights/)
})

test('compact source label never removes distinct author credit or licence conditions', () => {
  const entry = { ...publicVideoFixture,
    sourceAttribution: { label: 'YouTube', reference: 'https://youtu.be/_MN6nsn-XDM' },
    rights: { ...publicVideoFixture.rights, credit: 'Tác giả kiểm thử — giữ nguyên ghi công', license: 'Điều kiện giấy phép kiểm thử — không lược bỏ' },
  }
  const html = renderRoute('/thuyet-minh/test-only-public-video', false, undefined, [entry], publicVideoAssets)
  const credit = html.match(/<p class="museum-video__credit">[\s\S]*?<\/p>/)[0]
  assert.match(credit, />Nguồn video gốc/)
  assert.match(credit, /Tác giả kiểm thử — giữ nguyên ghi công/)
  assert.match(credit, /Điều kiện giấy phép kiểm thử — không lược bỏ/)
  assert.doesNotMatch(credit, /<details|<summary|title=|hidden=""/)
  const css = read('styles/museum-video.css')
  assert.match(css, /source-link[^}]*min-height: 24px;[^}]*font-weight: 600;[^}]*text-decoration: underline/)
})
