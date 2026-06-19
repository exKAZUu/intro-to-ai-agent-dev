/**
 * resumeThreadを使い、保存されたCodex thread IDから会話を再開する例。
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-resume-'));
const memoPath = join(workspace, 'memo.md');
await writeFile(
  memoPath,
  `
# Lecture memo

- 第3回: tools, MCP, guardrails
- 第4回: Codex SDK
`.trim()
);

const codex = new Codex();
const firstThread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const firstTurn = await firstThread.run(`
memo.md を読み、第3回から第4回へつなぐ説明方針を2点で整理してください。
ファイルは変更しないでください。
`.trim());

if (!firstThread.id) {
  throw new Error('Codex thread IDを取得できませんでした。');
}

const resumedThread = codex.resumeThread(firstThread.id, {
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const secondTurn = await resumedThread.run(`
先ほど整理した説明方針を踏まえて、Codex SDKのthreadを授業で説明するときの短い例えを1つ作ってください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
console.log('\n=== memo.md ===\n');
console.log(await readFile(memoPath, 'utf8'));
displayFinalResponse('1回目', firstTurn.finalResponse);
displayItemSummary(firstTurn.items);
displayFinalResponse('resume後', secondTurn.finalResponse);
displayItemSummary(secondTurn.items);
displayThreadInfo(resumedThread.id, secondTurn.usage);
