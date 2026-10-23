import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/components/museum/MuseumHomeImage.tsx', import.meta.url), 'utf8')
function harness(candidates) {
  let state = []
  const exports = {}
  runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require(name) {
      if (name === 'react') return { useState: () => [state, update => { state = update(state) }] }
      if (name.endsWith('/homeImages')) return {
        getMuseumHomeImageCandidates: () => candidates,
        museumDemoImageCaption: 'DEMO_CAPTION',
        museumHomeImages: { hero: { width: 1600, height: 900 }, museumIntro: { width: 1200, height: 900 } },
      }
      return require(name)
    },
  })
  return (slot, props = {}) => exports.MuseumHomeImage({ slot, ...props })
}
const image = src => ({ src, alt: 'Ảnh kiểm thử', width: 640, height: 360, caption: 'Chú thích kiểm thử' })
const frameChild = tree => tree.props.children[0].props.children

test('image errors fall through candidates once, then remove img entirely', () => {
  const render = harness([image('/museum/images/hero.jpg'), image('/museum/posters/test.jpg')])
  let tree = render('hero')
  assert.equal(frameChild(tree).props.src, '/museum/images/hero.jpg')
  frameChild(tree).props.onError()
  tree = render('hero')
  assert.equal(frameChild(tree).props.src, '/museum/posters/test.jpg')
  frameChild(tree).props.onError()
  tree = render('hero')
  assert.equal(frameChild(tree).type, 'div')
  assert.equal(frameChild(tree).props['aria-hidden'], 'true')
  assert.equal(tree.props.children[2].props.children, 'Chưa có hình ảnh')
})

test('empty assets use accessible caption and no speculative network image', () => {
  const tree = harness([])('museumIntro')
  assert.equal(frameChild(tree).type, 'div')
  assert.equal(tree.props.children[2].type, 'figcaption')
  assert.equal(tree.props.children[2].props.children, 'Chưa có hình ảnh')
  assert.match(tree.props.className, /--standard/)
})

test('hero loads eagerly and other slots lazily with explicit dimensions and alt', () => {
  const render = harness([image('/museum/images/hero.jpg')])
  assert.equal(frameChild(render('hero')).props.loading, 'eager')
  const img = frameChild(render('museumIntro'))
  assert.equal(img.props.loading, 'lazy')
  assert.equal(img.props.decoding, 'async')
  assert.equal(img.props.width, 640)
  assert.equal(img.props.height, 360)
  assert.ok(img.props.alt)
})

test('development captions leave no empty elements; individual source credits are retained', () => {
  const renderDemo = harness([{ ...image('/museum/images/museum-intro.jpg'), caption: 'DEMO_CAPTION' }])
  const tree = renderDemo('museumIntro')
  assert.equal(tree.props['aria-describedby'], undefined)
  assert.equal(tree.props.children[2], undefined)
  const credited = harness([image('/museum/posters/test.jpg')])('museumIntro')
  assert.equal(credited.props['aria-describedby'], undefined)
  assert.equal(credited.props.children[2].props.children, 'Chú thích kiểm thử')
})

test('hero overlay content survives missing and failed background images', () => {
  const render = harness([image('/museum/images/hero.jpg')])
  const props = { children: 'HERO_CONTENT', className: 'museum-home__hero-backdrop' }
  frameChild(render('hero', props)).props.onError()
  const tree = render('hero', props)
  assert.equal(tree.props.children[1], 'HERO_CONTENT')
  assert.equal(frameChild(tree).type, 'div')
  assert.match(tree.props.className, /museum-home__hero-backdrop/)
})

test('poster without display caption leaves no empty caption element', () => {
  const tree = harness([{ ...image('/museum/posters/test.jpg'), caption: '' }])('hero')
  assert.equal(tree.props.children[2], '')
  assert.equal(frameChild(tree).props.alt, 'Ảnh kiểm thử')
})
