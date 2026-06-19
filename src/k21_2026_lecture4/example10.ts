/**
 * 1つのCodex threadで、調査、計画、実装、検証を段階的に進める例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  assertNoFileChanges,
  createCodexEnv,
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-staged-workflow-'));
await writeFile(join(workspace, 'package.json'), '{"type":"module"}');
await writeFile(
  join(workspace, 'README.md'),
  `
# Registration helper

Build a small module that normalizes workshop registration records.
The module should trim names, lower-case email addresses, and reject records without a name or email.
`.trim()
);
await writeFile(
  join(workspace, 'registration.test.js'),
  `
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeRegistration } from './registration.js';

test('normalizes a valid registration', () => {
  assert.deepEqual(normalizeRegistration({ name: '  Alice  ', email: 'ALICE@EXAMPLE.COM' }), {
    name: 'Alice',
    email: 'alice@example.com',
  });
});

test('rejects incomplete registrations', () => {
  assert.throws(() => normalizeRegistration({ name: '', email: 'a@example.com' }), /name/);
  assert.throws(() => normalizeRegistration({ name: 'Alice', email: '' }), /email/);
});
`.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex({ env: createCodexEnv(workspace) });
const investigationThread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

displayWorkspace(workspace);

const investigation = await investigationThread.run(`
README.md と registration.test.js を読み、必要な実装作業を2点で整理してください。
このturnではファイルを変更できない read-only sandbox で調査だけを行っています。
`.trim());
displayFinalResponse('調査', investigation.finalResponse);
displayItemSummary(investigation.items);
assertNoFileChanges(investigation.items);

if (!investigationThread.id) {
  throw new Error('Codex thread IDを取得できませんでした。');
}

const thread = codex.resumeThread(investigationThread.id, {
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const implementation = await thread.run(`
調査結果に基づき registration.js を作成してください。
実行確認は次のturnで行うので、このturnでは実装だけをしてください。
`.trim());
displayFinalResponse('実装', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);

const verification = await thread.run(`
node --test registration.test.js を実行し、すべてのテストが通ることを確認してください。
失敗した場合は registration.js を修正し、同じコマンドで再検証してください。
確認したコマンドと結果を回答に含めてください。
`.trim());
displayFinalResponse('検証', verification.finalResponse);
displayItemSummary(verification.items);
displayFileChanges(verification.items);
displayCommandExecutions(verification.items);
displayThreadInfo(thread.id, verification.usage);
console.log('\n=== registration.js ===\n');
console.log(await readFile(join(workspace, 'registration.js'), 'utf8'));
