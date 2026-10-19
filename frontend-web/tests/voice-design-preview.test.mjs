import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const router = await readFile(new URL('../src/routes/AppRouter.tsx', import.meta.url), 'utf8');
const preview = await readFile(new URL('../src/pages/VoiceDesignPreviewPage.tsx', import.meta.url), 'utf8');
const environment = await readFile(new URL('../.env.example', import.meta.url), 'utf8');

test('Voice design preview is explicit, development-only, opt-in and authenticated', () => {
  assert.match(router, /import\.meta\.env\.DEV/);
  assert.match(router, /VITE_VOICE_DESIGN_PREVIEW_ENABLED === 'true'/);
  assert.match(router, /lazy\(\(\) => import\('\.\.\/pages\/VoiceDesignPreviewPage'\)/);
  assert.match(environment, /VITE_VOICE_DESIGN_PREVIEW_ENABLED=false/);
  assert.match(router, /voiceDesignPreviewEnabled && VoiceDesignPreviewPage && <Route path="\/design-preview\/voice"/);
  assert.ok(router.indexOf('voiceDesignPreviewEnabled &&') > router.indexOf('<Route element={<RequireAuth />}'));
  assert.match(preview, /DESIGN PREVIEW/);
  assert.match(preview, /Dữ liệu dưới đây là minh họa giao diện/);
});

test('Voice design preview cannot call APIs, TTS or workflow mutations', () => {
  assert.doesNotMatch(preview, /useVoiceEditor|voiceService|narrationService|editor\.save|fetch\(|api</);
  assert.match(preview, /<WorkflowSteps workflow=\{undefined\}/);
  assert.match(preview, /<Button disabled>Tạo giọng đọc<\/Button>/);
  assert.match(preview, /disabled onPreview=\{noAction\} onSelect=\{noAction\}/);
});

test('Production Voice route remains guarded and unchanged', async () => {
  const voicePage = await readFile(new URL('../src/pages/VoicePage.tsx', import.meta.url), 'utf8');
  assert.match(voicePage, /resolveWorkflowRouteAccess\(project\.workflow, 'VOICE'/);
  assert.match(voicePage, /if \(!access\.allowed\)/);
  assert.match(voicePage, /<WorkflowRouteRecovery/);
  assert.doesNotMatch(voicePage, /VITE_VOICE_DESIGN_PREVIEW_ENABLED|design-preview/);
});
