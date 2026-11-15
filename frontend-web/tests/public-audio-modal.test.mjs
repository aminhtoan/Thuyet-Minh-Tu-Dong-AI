import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const modal = read('features/results/AudioGuideModal.tsx')
const listing = read('components/museum/MuseumCustomerAudioSection.tsx')
const resultHook = read('features/results/useResult.ts')
const styles = read('styles/museum-layout.css')

test('public audio starts paused and only play control can start playback', () => {
  assert.doesNotMatch(modal, /\bautoPlay\b|\bautoplay\b/)
  assert.equal((modal.match(/\.play\(\)/g) || []).length, 1)
  assert.match(modal, /const togglePlay = \(\) =>[\s\S]*?audioRef\.current\.play\(\)/)
  assert.match(modal, /const selectLanguage = [\s\S]*?stopPlayback\(\)[\s\S]*?setIsPlaying\(false\)/)
})

test('modal consumes only the public narration URL supplied by the listing contract', () => {
  assert.match(listing, /\/projects\/public-audio-guides/)
  assert.match(listing, /availableLanguages=\{activeItem\.availableLanguages\}/)
  assert.match(modal, /publicAudioUrl\(selectedLanguage\?\.audioUrl\)/)
  assert.match(modal, /env\.apiBaseUrl\.replace\(\/\\\/api\\\/\?\$\/[, ]/)
  assert.doesNotMatch(modal, /resultService|getByProjectId|getLanguageVariants|getFile|createObjectURL|revokeObjectURL/)
  assert.doesNotMatch(modal, /source-media|\/source\b|accessToken|refreshToken|Authorization/)
})

test('missing, failed and stalled public audio reach a finite accessible error state', () => {
  assert.match(modal, /audioUrl \? null : unavailableMessage/)
  assert.match(modal, /onError=\{\(\) => \{[\s\S]*?setLoadingAudio\(false\)[\s\S]*?setAudioError\(unavailableMessage\)/)
  assert.match(modal, /window\.setTimeout\([\s\S]*?setAudioError\(unavailableMessage\)[\s\S]*?15_000/)
  assert.match(modal, /className="museum-audio-modal__error" role="alert"/)
  assert.doesNotMatch(modal, /console\.(?:error|log)|stack|token/)
})

test('close, language changes and unmount stop the current media resource', () => {
  assert.match(modal, /const handleClose = useCallback\(\(\) => \{\s*stopPlayback\(true\)\s*onClose\(\)/)
  assert.match(modal, /audio\.pause\(\)[\s\S]*?audio\.currentTime = 0/)
  assert.match(modal, /audio\.removeAttribute\('src'\)[\s\S]*?audio\.load\(\)/)
  assert.match(modal, /return \(\) => \{[\s\S]*?stopPlayback\(true\)[\s\S]*?returnFocusRef\.current\?\.focus\(\)/)
})

test('modal remains dismissible and keyboard-accessible during loading and errors', () => {
  assert.match(modal, /role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?aria-labelledby="museum-audio-modal-title"/)
  assert.match(modal, /aria-label="Đóng cửa sổ nghe"/)
  assert.match(modal, /e\.key === 'Escape'[\s\S]*?handleClose\(\)/)
  assert.match(modal, /e\.key !== 'Tab'[\s\S]*?querySelectorAll<HTMLElement>/)
  assert.match(modal, /role="status" aria-live="polite"/)
  assert.match(styles, /museum-audio-modal__error[^}]*overflow-wrap: anywhere/)
})

test('protected Result and Library loading remain separate from the public modal', () => {
  assert.match(resultHook, /resultService\.getByProjectId/)
  assert.match(resultHook, /resultService\.getFile/)
  assert.match(resultHook, /URL\.createObjectURL/)
  assert.doesNotMatch(modal, /\bfetch\s*\(|\bapi\s*\(/)
})
