/**
 * resumeThreadを使い、中断した開発作業を別プロセス想定で再開する例。
 */

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  createCodexEnv,
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const threadId = getArgValue('--thread');
const existingWorkspace = getArgValue('--workspace');

if (threadId && existingWorkspace) {
  await resumeWork(threadId, existingWorkspace);
} else {
  await planWork();
}

async function planWork() {
  const workspace = join(tmpdir(), 'k21-codex-resume-workflow');
  await mkdir(workspace, { recursive: true });
  await writeFile(join(workspace, 'package.json'), '{"type":"module"}');
  await writeFile(
    join(workspace, 'task.md'),
    `
# Task

Create validator.js for workshop signup data.
It should export validateSignup(input), return normalized data for valid input, and throw clear errors for missing name or invalid email.
`.trim()
  );
  await writeFile(
    join(workspace, 'validator.test.js'),
    `
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateSignup } from './validator.js';

test('normalizes valid signup data', () => {
  assert.deepEqual(validateSignup({ name: '  Alice ', email: 'ALICE@EXAMPLE.COM' }), {
    name: 'Alice',
    email: 'alice@example.com',
  });
});

test('rejects invalid data', () => {
  assert.throws(() => validateSignup({ name: '', email: 'a@example.com' }), /name/);
  assert.throws(() => validateSignup({ name: 'Alice', email: 'alice' }), /email/);
});
`.trim()
  );
  await execFileAsync('git', ['init'], { cwd: workspace });

  const codex = new Codex({ env: createCodexEnv(workspace) });
  const thread = codex.startThread({
    workingDirectory: workspace,
    skipGitRepoCheck: true,
    sandboxMode: 'workspace-write',
    approvalPolicy: 'never',
    modelReasoningEffort: 'low',
  });

  const plan = await thread.run(`
task.md と validator.test.js を読み、実装計画を2点で作ってください。
まだファイルは作成しないでください。
`.trim());

  if (!thread.id) {
    throw new Error('Codex thread IDを取得できませんでした。');
  }

  displayWorkspace(workspace);
  displayFinalResponse('計画', plan.finalResponse);
  displayItemSummary(plan.items);
  displayThreadInfo(thread.id, plan.usage);
  console.log('\n=== 再開コマンド ===\n');
  console.log(`bun src/k21_2026_lecture4/example12.ts --thread ${thread.id} --workspace ${workspace}`);
}

async function resumeWork(threadId: string, workspace: string) {
  const codex = new Codex({ env: createCodexEnv(workspace) });
  const resumedThread = codex.resumeThread(threadId, {
    workingDirectory: workspace,
    skipGitRepoCheck: true,
    sandboxMode: 'workspace-write',
    approvalPolicy: 'never',
    modelReasoningEffort: 'low',
  });

  const implementation = await resumedThread.run(`
先ほどの計画に基づき validator.js を作成してください。
node --test validator.test.js を実行し、すべてのテストが通ることを確認してください。
失敗した場合は validator.js を修正し、同じコマンドで再検証してください。
`.trim());

  displayWorkspace(workspace);
  displayFinalResponse('resume後の実装', implementation.finalResponse);
  displayItemSummary(implementation.items);
  displayFileChanges(implementation.items);
  displayCommandExecutions(implementation.items);
  displayThreadInfo(resumedThread.id, implementation.usage);
  console.log('\n=== validator.js ===\n');
  console.log(await readFile(join(workspace, 'validator.js'), 'utf8'));
}

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}
