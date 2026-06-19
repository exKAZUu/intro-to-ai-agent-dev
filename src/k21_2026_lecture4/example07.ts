/**
 * workspace-write sandboxでファイル編集を許可し、file_changeを観察する例。
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  assertCommandSucceeded,
  createCodexEnv,
  createExampleWorkspace,
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await createExampleWorkspace('example07', 'k21-codex-workspace-write-');
const catalogPath = join(workspace, 'lessonCatalog.js');
await execFileAsync('git', ['init'], { cwd: workspace });
await execFileAsync('git', ['add', 'lessonCatalog.js'], { cwd: workspace });

const codex = new Codex({ env: createCodexEnv(workspace) });
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
lessonCatalog.js を編集し、lesson が不正な場合は分かりやすい Error を投げるようにしてください。
title は空でない文字列、minutes は正の数であることを確認してください。
編集後に node -e "import('node:assert/strict').then(async ({default: assert}) => { const {describeLesson} = await import('./lessonCatalog.js'); assert.equal(describeLesson({title:'Codex SDK', minutes:15}), 'Codex SDK: 15分'); assert.throws(() => describeLesson(null), /lesson|title|minutes/); assert.throws(() => describeLesson({title:'', minutes:15}), /title/); assert.throws(() => describeLesson({title:'Codex SDK', minutes:0}), /minutes/); console.log('ok'); })" を実行して動作確認してください。
最後に git diff -- lessonCatalog.js で差分を確認してください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
console.log('\n=== 編集後のlessonCatalog.js ===\n');
console.log(await readFile(catalogPath, 'utf8'));
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayCommandExecutions(turn.items);
assertCommandSucceeded(turn.items, 'node -e');
assertCommandSucceeded(turn.items, 'git diff -- lessonCatalog.js');
displayThreadInfo(thread.id, turn.usage);
