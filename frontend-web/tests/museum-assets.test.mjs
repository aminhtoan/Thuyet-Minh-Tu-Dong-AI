import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const publicRoot = new URL('../public/', import.meta.url)
const hash = path => createHash('sha256').update(readFileSync(new URL(path, publicRoot))).digest('hex')
// Pre-migration inventory: original bytes must remain unchanged, not re-encoded.
const originals = {
  'images/exhibition-history.jpg': '332f75c449a9d9e9e6ba2f02b7b1fd6f410d454f3f7573b5db9cce96f6786d85',
  'images/exhibition-peace.jpg': '186a2fc2b456619ae4e481afcb7442aa17c7fceb8dd6f585858744fb8f356558',
  'images/exhibition-people.jpg': '806dfc5ea54f22f5dcc7ea531938d46da126c3562d33023031f69d9ad00848bb',
  'images/featured-video.jpg': 'c40f05dac8bf59d95928762ca41d467c13a959326d49a64e6c5602e30773640d',
  'images/hero.jpg': '4909e09700a57b3b7b63c92f5a887888dce56705b31c165137dc104d6acc181b',
  'images/museum-intro.jpg': '95fb96eb7a7c7ec4174b96284dc6f971a2c028fe1e0ac2c98c817dd1faffdfd0',
  'posters/bao-tang-chung-tich-chien-tranh.jpg': 'c0864ca18256fa82076c73cde72d8734b9507107ca62266baaba2f740da181ef',
  'videos/bao-tang-chung-tich-chien-tranh.mp4': 'e2c4d40dbf7f0d4f6337655da5c2c094ac1d7955a631eadd2146447c1152ec64',
}

test('canonical museum assets retain all eight original media hashes', () => {
  assert.equal(new Set(Object.values(originals)).size, 8)
  for (const [path, digest] of Object.entries(originals)) assert.equal(hash(`museum/${path}`), digest, path)
})

test('six legacy image URLs retain byte-identical compatibility copies', () => {
  for (const path of Object.keys(originals).filter(path => path.startsWith('images/'))) {
    assert.equal(hash(`images/museum/${path.slice('images/'.length)}`), hash(`museum/${path}`))
  }
  assert.deepEqual(readdirSync(new URL('museum/captions/', publicRoot)), ['.gitkeep'])
})

test('application image configuration and asset inventory use the canonical root', () => {
  const config = readFileSync(new URL('../src/features/museum/homeImages.ts', import.meta.url), 'utf8')
  const inventory = readFileSync(new URL('../src/features/museum/publicMediaAssets.ts', import.meta.url), 'utf8')
  assert.equal((config.match(/src: '\/museum\/images\//g) || []).length, 6)
  assert.match(inventory, /\/public\/museum\/images\/\*\*/)
  assert.doesNotMatch(config + inventory, /\/images\/museum\//)
})
