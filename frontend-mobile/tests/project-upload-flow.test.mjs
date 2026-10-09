import assert from 'node:assert/strict';
import test from 'node:test';
import { executeProjectUpload } from '../src/features/projects/projectUploadFlow.mjs';

const input = { project: { name: 'Android MP4', sourceLanguage: 'vi' }, retryProjectId: null };

test('upload success creates one project and never cleans existing data', async () => {
  const calls = [];
  const result = await executeProjectUpload(input, {
    createProject: async () => { calls.push('create:new'); return 'new-project'; },
    updateProject: async () => calls.push('update'),
    uploadFile: async (id) => calls.push(`upload:${id}`),
    deleteProject: async (id) => calls.push(`delete:${id}`),
    refreshProjects: async () => calls.push('refresh'),
  });
  assert.deepEqual(result, { ok: true, projectId: 'new-project' });
  assert.deepEqual(calls, ['create:new', 'upload:new-project', 'refresh']);
});

test('initial upload failure deletes only the newly created project', async () => {
  const deleted = [];
  const result = await executeProjectUpload(input, {
    createProject: async () => 'new-project', updateProject: async () => undefined,
    uploadFile: async () => { throw new Error('network'); },
    deleteProject: async (id) => { deleted.push(id); }, refreshProjects: async () => undefined,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(deleted, ['new-project']);
  assert.equal(result.retryProjectId, null);
});

test('cleanup failure makes retry reuse the same project without creating a duplicate', async () => {
  const failed = await executeProjectUpload(input, {
    createProject: async () => 'retained-project', updateProject: async () => undefined,
    uploadFile: async () => { throw new Error('network'); },
    deleteProject: async () => { throw new Error('offline'); }, refreshProjects: async () => undefined,
  });
  assert.equal(failed.retryProjectId, 'retained-project');
  let creates = 0; let updates = 0;
  const retried = await executeProjectUpload({ ...input, retryProjectId: failed.retryProjectId }, {
    createProject: async () => { creates += 1; return 'duplicate'; },
    updateProject: async (id) => { updates += 1; assert.equal(id, 'retained-project'); },
    uploadFile: async (id) => assert.equal(id, 'retained-project'),
    deleteProject: async () => undefined, refreshProjects: async () => undefined,
  });
  assert.equal(retried.ok, true);
  assert.equal(creates, 0);
  assert.equal(updates, 1);
});
