/**
 * workspace-write sandboxでファイル編集を許可し、file_changeを観察する例。
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
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
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-workspace-write-'));
const catalogPath = join(workspace, 'lessonCatalog.js');
await writeFile(join(workspace, 'package.json'), '{"type":"module"}');
await writeFile(
  catalogPath,
  `
export function describeLesson(lesson) {
  return lesson.title + ": " + lesson.minutes + "分";
}
  `.trim()
);
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
編集後に node -e "import('./lessonCatalog.js').then(({describeLesson}) => console.log(describeLesson({title:'Codex SDK', minutes:15})))" を実行して動作確認してください。
最後に git diff -- lessonCatalog.js で差分を確認してください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
console.log('\n=== 編集後のlessonCatalog.js ===\n');
console.log(await readFile(catalogPath, 'utf8'));
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayCommandExecutions(turn.items);
displayThreadInfo(thread.id, turn.usage);
