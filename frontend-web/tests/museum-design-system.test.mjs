import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('Museum theme owns the approved palette without replacing Customer tokens', async () => {
  const [museum, customer, globalCss] = await Promise.all([
    readSource('../src/styles/museum-theme.css'),
    readSource('../src/styles/tokens.css'),
    readSource('../src/styles/global.css'),
  ])

  assert.match(museum, /^\.museum-theme\s*\{/m)
  assert.doesNotMatch(museum, /:root\s*\{/)
  for (const color of ['#f3ebdd', '#fffdf8', '#7a292e', '#612026', '#242321', '#b08a52', '#d8ccb8', '#625d55']) {
    assert.ok(museum.toLowerCase().includes(color))
  }
  for (const color of ['#5850ec', '#111c32', '#f8fafc']) assert.ok(customer.toLowerCase().includes(color))
  assert.match(globalCss, /@import '\.\/museum-theme\.css'/)
})

test('Museum tokens cover typography, rhythm, containers, focus and responsive boundaries', async () => {
  const css = await readSource('../src/styles/museum-theme.css')

  assert.match(css, /--museum-font-family: 'Be Vietnam Pro'/)
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
