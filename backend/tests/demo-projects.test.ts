import assert from 'node:assert/strict';
import test from 'node:test';
import { Project } from '../src/models/Project.js';
import { createProjectSchema } from '../src/validators/project.validator.js';
import { DEMO_DATABASE, DEMO_MARKER, demoProjects, validateDemoEnvironment } from '../src/scripts/demo-project-data.js';

test('Demo guard refuses production, normal DB, absent consent and absent URI', () => {
  for (const values of [{}, { NODE_ENV: 'production' }, { NODE_ENV: 'test', DEMO_DATABASE_CONFIRMED: DEMO_DATABASE, DEMO_MONGODB_URI: 'mongodb://localhost/multilingual_ai_narration' }]) assert.throws(() => validateDemoEnvironment(values));
  assert.equal(validateDemoEnvironment({ NODE_ENV: 'test', DEMO_DATABASE_CONFIRMED: DEMO_DATABASE, DEMO_MONGODB_URI: `mongodb://localhost/${DEMO_DATABASE}` }), `mongodb://localhost/${DEMO_DATABASE}`);
});
test('20 stable schema-valid drafts without fabricated artifacts; dates cover different periods', async () => {
  const records = demoProjects(new Date(2026, 9, 11, 12));
  assert.equal(records.length, 20);
  assert.equal(new Set(records.map(record => record._id)).size, 20);
  assert.deepEqual(records.map(record => record._id), demoProjects().map(record => record._id));
  for (const record of records) { assert.equal(record.status, 'DRAFT'); assert.equal(record.description, DEMO_MARKER); createProjectSchema.parse({ body: { name: record.name, description: record.description, sourceLanguage: record.sourceLanguage } }); await new Project({ ...record, userId: '0123456789abcdef01234567' }).validate(); }
  assert.ok(records.some(record => record.createdAt.getMonth() !== 9));
});
