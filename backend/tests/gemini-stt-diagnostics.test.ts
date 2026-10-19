import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { TranscriptSegment } from '../src/models/TranscriptSegment.js';
import { candidateGroups, validateSource } from '../src/services/translation/group-plan.js';
import { GeminiSttError, mapGeminiTranscript, timestampIntervalEvidence, type GeminiSttDiagnostic } from '../src/services/stt/gemini-stt.provider.js';

const privateText = 'PRIVATE_TRANSCRIPT_KEY_TOKEN_SENTINEL';
const word = (extra: Record<string, unknown> = {}) => ({ type: 'word_info', text: privateText, start_offset: '0s', end_offset: '1s', ...extra });
const response = (words: unknown[] = [word()]) => ({ status: 'completed', output_text: privateText, steps: [{ type: 'model_output', content: [{ type: 'text', annotations: words }] }] });
type Case = [string, unknown, number, GeminiSttDiagnostic, string?];
const cases: Case[] = [
  ['schema', { status: 'completed', steps: privateText }, 2, { code: 'RESPONSE_SCHEMA_INVALID', issueCount: 1 }],
  ['null response', null, 2, { code: 'RESPONSE_SCHEMA_INVALID', issueCount: 1 }],
  ['missing status', { steps: [] }, 2, { code: 'RESPONSE_SCHEMA_INVALID', issueCount: 1 }],
  ['incomplete', { ...response(), status: privateText }, 2, { code: 'INTERACTION_NOT_COMPLETED' }],
  ['duration', response(), NaN, { code: 'SOURCE_DURATION_INVALID' }],
  ['no speech', { ...response(), output_text: '' }, 2, { code: 'TRANSCRIPT_EMPTY' }, 'STT_NO_SPEECH'],
  ['annotations', response([]), 2, { code: 'WORD_ANNOTATIONS_MISSING', wordCount: 0 }],
  ['word text', response([word({ text: '' })]), 2, { code: 'WORD_SCHEMA_INVALID', wordIndex: 0, issueCount: 1 }],
  ['missing start', response([word({ start_offset: undefined })]), 2, { code: 'TIMESTAMP_MISSING', wordIndex: 0, field: 'start_offset' }],
  ['null end', response([word({ end_offset: null })]), 2, { code: 'TIMESTAMP_MISSING', wordIndex: 0, field: 'end_offset' }],
  ['empty end', response([word({ end_offset: '' })]), 2, { code: 'TIMESTAMP_MISSING', wordIndex: 0, field: 'end_offset' }],
  ['numeric offset', response([word({ start_offset: 0 })]), 2, { code: 'TIMESTAMP_FORMAT_INVALID', wordIndex: 0, field: 'start_offset' }],
  ['invalid offset', response([word({ end_offset: privateText })]), 2, { code: 'TIMESTAMP_FORMAT_INVALID', wordIndex: 0, field: 'end_offset' }],
  ['negative offset', response([word({ start_offset: '-1s' })]), 2, { code: 'TIMESTAMP_FORMAT_INVALID', wordIndex: 0, field: 'start_offset' }],
  ['non finite offset', response([word({ end_offset: `${'9'.repeat(400)}s` })]), 2, { code: 'TIMESTAMP_NON_FINITE', wordIndex: 0, field: 'end_offset' }],
  ['overlap', response([word(), word({ start_offset: '0.5s', end_offset: '2s' })]), 2, { code: 'TIMESTAMP_OVERLAP_OR_ORDER', wordIndex: 1, wordCount: 2 }],
  ['out of order', response([word({ start_offset: '1s', end_offset: '2s' }), word()]), 2, { code: 'TIMESTAMP_OVERLAP_OR_ORDER', wordIndex: 1, wordCount: 2 }],
  ['zero interval', response([word({ end_offset: '0s' })]), 2, { code: 'TIMESTAMP_INTERVAL_INVALID', wordIndex: 0 }],
  ['reverse interval', response([word({ start_offset: '1s', end_offset: '0s' })]), 2, { code: 'TIMESTAMP_INTERVAL_INVALID', wordIndex: 0 }],
  ['beyond duration', response([word({ end_offset: '3s' })]), 2, { code: 'TIMESTAMP_BEYOND_DURATION', wordIndex: 0 }],
];

test('safe Gemini parser diagnostics distinguish every rejection without exposing provider data', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('NETWORK_FORBIDDEN'); });
  for (const [name, value, duration, diagnostic, publicCode = 'STT_INVALID_RESPONSE'] of cases) {
    await t.test(name, () => assert.throws(() => mapGeminiTranscript(value, duration, 'vi'), (error: unknown) => {
      assert.ok(error instanceof GeminiSttError);
      assert.equal(error.code, publicCode);
      assert.equal(error.message, publicCode);
      const metadata = { ...error.diagnostic! };
      delete metadata.timestampEvidence;
      assert.deepEqual(metadata, diagnostic);
      assert.ok(Object.isFrozen(error.diagnostic));
      assert.ok(!JSON.stringify(error).includes(privateText));
      assert.ok(!error.stack?.includes(privateText));
      return true;
    }));
  }
  assert.equal(log.mock.callCount(), 0, 'parser never logs raw responses or content');
});

test('AI-STT-06 bounded timestamp evidence, precision classification and development gate', async (t) => {
  await t.test('equal offsets include numeric evidence only', () => {
    const evidence = timestampIntervalEvidence('100.125s', '100.125s');
    assert.equal(evidence.relation, 'EQUAL');
    assert.equal(evidence.precision, 'NO_COLLAPSE');
    assert.deepEqual(evidence.start, { raw: '100.125s', type: 'string', decimalPlaces: 3, parsed: 100.125 });
  });
  await t.test('reversed numeric scalars', () => {
    const evidence = timestampIntervalEvidence(100.126, 100.125);
    assert.equal(evidence.relation, 'REVERSED');
    assert.equal(evidence.start?.type, 'number');
    assert.equal(evidence.end?.parsed, 100.125);
  });
  await t.test('distinct exact decimals collapse to the same Number', () => {
    const evidence = timestampIntervalEvidence('100.125000000000000001s', '100.125000000000000002s');
    assert.equal(evidence.precision, 'PRECISION_COLLAPSE');
    assert.equal(evidence.relation, 'EQUAL');
    assert.equal(evidence.start?.decimalPlaces, 18);
  });
  await t.test('equivalent decimal spelling is not precision collapse', () => {
    assert.equal(timestampIntervalEvidence('0100.1250s', '100.125s').precision, 'NO_COLLAPSE');
  });
  await t.test('unsafe timestamps suppress both values without coercing payloads', () => {
    const unsafe = [privateText, `1s\n${privateText}`, '1s\n', '9'.repeat(65), NaN, Infinity, null, {}, [], { toString() { throw new Error('MUST_NOT_COERCE'); } }];
    for (const value of unsafe) {
      for (const [start, end] of [[value, '1s'], ['1s', value]]) {
        const evidence = timestampIntervalEvidence(start, end);
        assert.equal(evidence.valuesSuppressed, true);
        assert.equal(evidence.start, undefined);
        assert.equal(evidence.end, undefined);
        assert.ok(!JSON.stringify(evidence).includes(privateText));
      }
    }
  });
  await t.test('valid positive interval produces no error evidence', () => {
    assert.equal(timestampIntervalEvidence('1s', '2s').valuesSuppressed, true);
    assert.equal(mapGeminiTranscript(response([word()]), 2, 'vi').segments.length, 1);
  });
  await t.test('production/test do not attach evidence; development does; public code unchanged', () => {
    const previous = process.env.NODE_ENV;
    try {
      for (const environment of ['development', 'production', 'test']) {
        process.env.NODE_ENV = environment;
        assert.throws(() => mapGeminiTranscript(response([word({ end_offset: '0s' })]), 2, 'vi'), (error: unknown) => {
          assert.ok(error instanceof GeminiSttError);
          assert.equal(error.code, 'STT_INVALID_RESPONSE');
          assert.equal(error.diagnostic?.code, 'TIMESTAMP_INTERVAL_INVALID');
          assert.equal(Boolean(error.diagnostic?.timestampEvidence), environment === 'development');
          assert.ok(!JSON.stringify(error).includes(privateText));
          return true;
        });
      }
    } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
  });
});

test('valid Vietnamese timestamps remain unchanged, including adjacency and exact duration boundary', () => {
  const value = response([word({ text: 'Xin' }), word({ text: 'chào', start_offset: '1s', end_offset: '2s' })]);
  value.output_text = 'Xin chào';
  assert.deepEqual(mapGeminiTranscript(value, 2, 'vi'), { text: 'Xin chào', duration: 2, language: 'vi', segments: [{ start: 0, end: 1, text: 'Xin' }, { start: 1, end: 2, text: 'chào' }] });
});

test('AI-STT-04 interval diagnosis uses synthetic word 585, without changing timestamp rules', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('NETWORK_FORBIDDEN'); });
  const duration = 307.48;
  // 585 preceding words, all ordered and within source duration. Index is zero-based.
  const prefix = Array.from({ length: 585 }, (_, index) => word({ start_offset: `${index / 10}s`, end_offset: `${(index + 1) / 10}s` }));
  const rejects = (start: unknown, end: unknown, code: GeminiSttDiagnostic['code']) => {
    assert.throws(() => mapGeminiTranscript(response([...prefix, word({ start_offset: start, end_offset: end })]), duration, 'vi'), (error: unknown) => {
      assert.ok(error instanceof GeminiSttError);
      assert.equal(error.code, 'STT_INVALID_RESPONSE');
      assert.equal(error.diagnostic?.code, code);
      assert.equal(error.diagnostic?.wordIndex, 585);
      return true;
    });
  };
  await t.test('equal offsets cause interval invalid at index 585', () => rejects('100.125s', '100.125s', 'TIMESTAMP_INTERVAL_INVALID'));
  await t.test('reversed offsets cause the same interval diagnostic', () => rejects('100.126s', '100.125s', 'TIMESTAMP_INTERVAL_INVALID'));
  await t.test('equivalent decimal spellings remain equal', () => rejects('100.1250s', '100.125s', 'TIMESTAMP_INTERVAL_INVALID'));
  await t.test('milliseconds suffix is rejected as format, not interval', () => rejects('100125ms', '100126ms', 'TIMESTAMP_FORMAT_INVALID'));
  await t.test('clock notation is rejected as format, not interval', () => rejects('01:40.125', '01:40.126', 'TIMESTAMP_FORMAT_INVALID'));
  await t.test('missing timestamp has a distinct diagnostic', () => rejects('100.125s', undefined, 'TIMESTAMP_MISSING'));
  await t.test('seconds are not rounded to integer or millisecond boundaries', () => {
    for (const [start, end] of [['100.125s', '100.126s'], ['100.125000001s', '100.125000002s'], ['307.479999999s', '307.48s']]) {
      const result = mapGeminiTranscript(response([...prefix, word({ start_offset: start, end_offset: end })]), duration, 'vi');
      const last = result.segments[585]!;
      assert.equal(last.start, Number(start!.slice(0, -1)));
      assert.equal(last.end, Number(end!.slice(0, -1)));
      assert.ok(last.end > last.start);
    }
  });
  await t.test('millisecond values mislabeled as seconds are not silently rescaled', () => rejects('100125s', '100126s', 'TIMESTAMP_BEYOND_DURATION'));
  await t.test('sub-double-precision decimal differences can collapse; this alone is not evidence about the real response', () => {
    assert.equal(Number('100.125000000000000001'), Number('100.125000000000000002'));
    rejects('100.125000000000000001s', '100.125000000000000002s', 'TIMESTAMP_INTERVAL_INVALID');
  });
});

test('AI-STT-08 touching zero-duration words become phrases using unchanged source boundaries', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('NETWORK_FORBIDDEN'); });
  const w = (text: string, start: string, end: string) => word({ text, start_offset: start, end_offset: end });
  const map = (words: ReturnType<typeof word>[], duration = 3) => {
    const value = response(words); value.output_text = words.map(item => item.text).join(' ');
    const before = JSON.stringify(value);
    const result = mapGeminiTranscript(value, duration, 'vi');
    assert.equal(JSON.stringify(value), before, 'never mutate provider response');
    assert.equal(result.segments.map(segment => segment.text).join(' '), value.output_text);
    return result;
  };
  await t.test('middle and trailing boundary words retain text and positive timestamps', () => {
    assert.deepEqual(map([w('Một', '0s', '1s'), w('từ', '1s', '1s'), w('nữa', '1s', '1s'), w('sau', '1s', '2s')]).segments,
      [{ start: 0, end: 1, text: 'Một từ nữa' }, { start: 1, end: 2, text: 'sau' }]);
  });
  await t.test('leading points join only at the next positive interval start', () => {
    assert.deepEqual(map([w('Lời', '0s', '0s'), w('mở', '0s', '0s'), w('đầu', '0s', '1s')]).segments, [{ start: 0, end: 1, text: 'Lời mở đầu' }]);
  });
  await t.test('point after a gap can join a following exact boundary', () => {
    assert.deepEqual(map([w('Một', '0s', '1s'), w('hai', '2s', '2s'), w('ba', '2s', '3s')]).segments,
      [{ start: 0, end: 1, text: 'Một' }, { start: 2, end: 3, text: 'hai ba' }]);
  });
  await t.test('zero at source duration preserves the exact positive interval', () => {
    assert.deepEqual(map([w('Cuối', '2s', '3s'), w('cùng.', '3s', '3s')]).segments, [{ start: 2, end: 3, text: 'Cuối cùng.' }]);
  });
  await t.test('synthetic index 585 at 182.800s is preserved in a touching phrase', () => {
    const prefix = Array.from({ length: 584 }, (_, i) => w(`từ${i}`, `${i * 0.3}s`, `${(i + 1) * 0.3}s`));
    const result = map([...prefix, w('trước', `${584 * 0.3}s`, '182.800s'), w('điểm', '182.800s', '182.800s'), w('sau', '182.800s', '183s')], 307.48);
    assert.deepEqual(result.segments[584], { start: 584 * 0.3, end: 182.8, text: 'trước điểm' });
  });
  await t.test('isolated, all-zero, reversed, overlap, out-of-range and precision collapse still fail closed', () => {
    for (const [words, code] of [
      [[w('a', '1s', '1s')], 'TIMESTAMP_INTERVAL_INVALID'],
      [[w('a', '0s', '0s'), w('b', '0s', '0s')], 'TIMESTAMP_INTERVAL_INVALID'],
      [[w('a', '0s', '1s'), w('b', '2s', '2s')], 'TIMESTAMP_INTERVAL_INVALID'],
      [[w('a', '1s', '1s'), w('b', '2s', '3s')], 'TIMESTAMP_INTERVAL_INVALID'],
      [[w('a', '2s', '1s')], 'TIMESTAMP_INTERVAL_INVALID'],
      [[w('a', '0s', '2s'), w('b', '1s', '1s')], 'TIMESTAMP_OVERLAP_OR_ORDER'],
      [[w('a', '4s', '4s')], 'TIMESTAMP_BEYOND_DURATION'],
      [[w('a', '1.000000000000000001s', '1.000000000000000002s')], 'TIMESTAMP_INTERVAL_INVALID'],
    ] as const) assert.throws(() => mapGeminiTranscript(response([...words]), 3, 'vi'), (error: unknown) => error instanceof GeminiSttError && error.diagnostic?.code === code);
  });
  await t.test('normalized phrases validate for persistence, GROUPS_V1 and Web display without DB writes', async () => {
    const result = map([w('Xin', '0s', '1s'), w('chào', '1s', '1s'), w('bạn.', '1s', '2s')]);
    const transcriptId = new Types.ObjectId();
    const documents = result.segments.map((segment, i) => new TranscriptSegment({ transcriptId, sequence: i + 1, startTime: segment.start, endTime: segment.end, text: segment.text }));
    for (const document of documents) assert.equal(document.validateSync(), undefined);
    const segments = documents.map(document => ({ id: String(document._id), sequence: document.sequence, text: document.text, startTime: document.startTime, endTime: document.endTime }));
    const source = { transcriptId: String(transcriptId), transcriptRevision: 1, fullText: result.text, languageCode: 'vi', segments };
    assert.doesNotThrow(() => validateSource(source));
    const groups = candidateGroups(source);
    assert.equal(groups.map(group => group.sourceText).join(' '), result.text);
    assert.ok(groups.every(group => group.endTime > group.startTime));
    const { groupTranscriptSegments } = await import('../../frontend-web/src/features/transcript/transcriptPresentation.mjs');
    assert.equal(groupTranscriptSegments(segments).map((group: { text: string }) => group.text).join(' '), result.text);
  });
});
