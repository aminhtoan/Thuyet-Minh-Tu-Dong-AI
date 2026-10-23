import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('Museum aliases the shared approved palette without leaking scoped overrides', async () => {
  const [museum, customer, globalCss] = await Promise.all([
    readSource('../src/styles/museum-theme.css'),
    readSource('../src/styles/tokens.css'),
    readSource('../src/styles/global.css'),
  ])

  assert.match(museum, /^\.museum-theme\s*\{/m)
  assert.doesNotMatch(museum, /:root\s*\{/)
  for (const token of ['background', 'white', 'section', 'primary', 'text', 'accent', 'border', 'secondary-text']) assert.ok(museum.includes(`var(--brand-${token})`))
  for (const color of ['#5850ec', '#794cff', '#111c32', '#f8fafc', '#f1f5f9']) assert.ok(customer.toLowerCase().includes(color))
  assert.match(globalCss, /@import '\.\/museum-theme\.css'/)
})

test('Museum tokens cover typography, rhythm, containers, focus and responsive boundaries', async () => {
  const css = await readSource('../src/styles/museum-theme.css')

  assert.match(css, /--museum-font-family: var\(--brand-font-family\)/)
  assert.match(css, /--museum-space-16:/)
  assert.match(css, /--museum-radius-lg:/)
  assert.match(css, /--museum-shadow-lg:/)
  assert.match(css, /--museum-container-content: 75rem/)
  for (const width of ['375px', '768px', '1024px', '1280px', '1440px']) assert.ok(css.includes(width))
  assert.match(css, /\.museum-theme :focus-visible\s*\{[^}]*outline: 3px solid var\(--museum-color-focus\)/s)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /\.museum-button\s*\{[^}]*min-height: 44px/s)
})

test('Museum primitives reuse existing Button, Card and Badge while headings keep unique relationships', async () => {
  const [button, card, badge, heading, container] = await Promise.all([
    readSource('../src/components/museum/MuseumButton.tsx'),
    readSource('../src/components/museum/MuseumCard.tsx'),
    readSource('../src/components/museum/MuseumBadge.tsx'),
    readSource('../src/components/museum/MuseumSectionHeading.tsx'),
    readSource('../src/components/museum/MuseumContainer.tsx'),
  ])

  assert.match(button, /import \{ Button \} from '\.\.\/common\/Button'/)
  assert.match(card, /import \{ Card \} from '\.\.\/common\/Card'/)
  assert.match(badge, /import \{ Badge \} from '\.\.\/common\/Badge'/)
  assert.match(heading, /const titleId = useId\(\)/)
  assert.match(heading, /aria-describedby=\{description \? descriptionId : undefined\}/)
  assert.match(container, /size\?: 'readable' \| 'content' \| 'wide'/)
})
