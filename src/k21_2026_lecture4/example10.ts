/**
 * 複数のCodex threadを使い、実装担当とレビュー担当を分ける例。
 */

import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import {
  assertNoFileChanges,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-multi-thread-'));
const filePath = join(workspace, 'topics.json');
await writeFile(filePath, JSON.stringify({ topics: ['tools', 'MCP', 'guardrails'] }, null, 2));

const codex = new Codex();
const implementer = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const implementation = await implementer.run(`
topics.json に各題材の minutes: 23 と objective を追加してください。
各題材には codexSdkConnection も追加し、第4回のCodex SDKでどの概念に対応するかを書いてください。
objective は90分ワークショップで観察できる行動として書いてください。
`.trim());
displayWorkspace(workspace);
displayFinalResponse('実装担当', implementation.finalResponse);
displayItemSummary(implementation.items);
displayFileChanges(implementation.items);

const reviewer = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const review = await reviewer.run(`
topics.json を読み、lecture4の教材データとして不足している点をレビューしてください。
実装担当の出力に対するレビューとして、よい点と不足点を分けてください。
ファイルは変更しないでください。
`.trim());
displayFinalResponse('レビュー担当', review.finalResponse);
displayItemSummary(review.items);
assertNoFileChanges(review.items);
displayThreadInfo(implementer.id, implementation.usage);
displayThreadInfo(reviewer.id, review.usage);
console.log('\n=== topics.json ===\n');
console.log(await readFile(filePath, 'utf8'));
