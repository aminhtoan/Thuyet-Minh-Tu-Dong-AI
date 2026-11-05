import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { customerAttemptMessage } from '../src/features/translation/customerAttemptPresentation.mjs';

test('HTTP 504/408 remains an uncertain timeout, never permission to retry', () => {
  for (const providerHttpStatus of [408, 504]) {
    const message = customerAttemptMessage({ status: 'UNCERTAIN', providerHttpStatus });
    assert.match(message, new RegExp(`HTTP ${providerHttpStatus}`));
    assert.match(message, /hết thời gian chờ/); assert.match(message, /không gửi lại/);
    assert.doesNotMatch(customerAttemptMessage({ status: 'DRAFT_SAVED', providerHttpStatus }), /HTTP/);
  }
});
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('normal Customer uses existing same-origin API/session, explicit normal POST and no refresh retry', async () => {
  const code = await read('src/features/translation/groupTranslationService.ts');
  const body = code.slice(code.indexOf('async customerGenerate'), code.indexOf('async customerDraft'));
  assert.match(body, /\/projects\/\$\{projectId\}\/translations/);
  assert.match(body, /targetLanguage, format: 'GROUPS_V1'/);
  assert.match(body, /}, false\)/);
  assert.doesNotMatch(body, /permit|18083|controlled|localStorage|sessionStorage|refresh|retry/);
});
test('all server attempt states have safe Vietnamese feedback; uncertain/unknown never invite AI retry', () => {
  assert.equal(customerAttemptMessage(null), null);
  for (const status of ['NOT_SENT', 'PROCESSING', 'DRAFT_SAVED', 'FAILED_PRE_DISPATCH', 'FAILED_RESPONSE', 'EXPIRED', 'UNCERTAIN', 'NEW_UNKNOWN_STATE']) {
    const message = customerAttemptMessage({ status }); assert.ok(message);
    if (status === 'UNCERTAIN') assert.match(message, /Không nhấn Dịch lại/);
    assert.doesNotMatch(message, /Hãy.*Dịch lại|Tự động dịch lại/);
  }
});

test('400/503 server evidence gives distinct actionable feedback without authorizing model switch/retry', () => {
  for (const status of ['UNCERTAIN', 'FAILED_RESPONSE']) {
    const bad = customerAttemptMessage({ status, providerHttpStatus: 400 });
    assert.match(bad, /HTTP 400/); assert.match(bad, /billing/); assert.match(bad, /chưa xác định nguyên nhân cụ thể/);
    const unavailable = customerAttemptMessage({ status, providerHttpStatus: 503 });
    assert.match(unavailable, /HTTP 503/); assert.match(unavailable, /tạm thời không khả dụng/);
    for (const text of [bad, unavailable]) assert.match(text, /Không nhấn Dịch lại hoặc chuyển model/);
  }
  assert.doesNotMatch(customerAttemptMessage({ status: 'DRAFT_SAVED', providerHttpStatus: 400 }), /HTTP 400/);
  assert.doesNotMatch(customerAttemptMessage({ status: 'UNCERTAIN' }), /HTTP 400|HTTP 503/);
});
test('reload status is authenticated GET only with no refresh; persisted attempt prevents generating after refresh', async () => {
  const api = await read('src/features/translation/groupTranslationService.ts');
  const getter = api.slice(api.indexOf('async customerState'), api.indexOf('async saved'));
  assert.match(getter, /customer-draft\/\$\{encodeURIComponent\(targetLanguage\)\}/); assert.match(getter, /}, false\)/); assert.doesNotMatch(getter, /POST|preview|approve/);
  const ui = await read('src/features/translation/GroupTranslationWorkspace.tsx');
  assert.match(ui, /if \(state.attempt\) return/); assert.match(ui, /submitted \|\| attempt/);
  assert.match(ui, /Kiểm tra trạng thái/);
  assert.doesNotMatch(ui, /setInterval|setTimeout.*customerGenerate/);
});
test('Customer branch does not require diagnostic service or per-project setup and preserves workflow guard', async () => {
  const code = await read('src/pages/TranslationPage.tsx');
  assert.ok(code.indexOf('if (!access.allowed)') < code.indexOf('VITE_CUSTOMER_TRANSLATION_ENABLED'));
  assert.ok(code.indexOf('VITE_CUSTOMER_TRANSLATION_ENABLED') < code.indexOf('<TranslationSourcePreflight key='));
  assert.match(code, /canMutate=\{access.canMutate\} notice=\{access.reason\} customerMode/);
  assert.match(await read('.env.example'), /VITE_CUSTOMER_TRANSLATION_ENABLED=false/);
});
test('manual Customer click only, double submit/error latch, durable GET recovery and separate manual approval', async () => {
  const code = await read('src/features/translation/GroupTranslationWorkspace.tsx');
  assert.match(code, /customerMode && \(submitted \|\|/); assert.match(code, /if \(customerMode\) setSubmitted\(true\)/);
  assert.match(code, /customerMode \? await groupTranslationService.customerGenerate\(project.id, target\)/);
  assert.match(code, /await groupTranslationService.customerState\(project.id, controller.signal, effectiveTarget\)/);
  assert.match(code, /customerTargetLabel\(target\)/);
  assert.match(code, /if \(!canMutate \|\| !draft \|\| !reviewed/);
  assert.match(code, /Chỉ tải lại dữ liệu; không tự gửi lại yêu cầu AI/);
  const effect = code.slice(code.indexOf('useEffect(() => {\n    const controller'), code.indexOf('function changeTarget'));
  assert.doesNotMatch(effect, /customerGenerate|\.preview\(|\.approve\(/);
});
