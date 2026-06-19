/**
 * Agents SDKの会話履歴・セッション管理を、Codex threadの連続turnで置き換える例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-thread-memory-'));
await writeFile(
  join(workspace, 'workshop.md'),
  `
# 90分ワークショップ

- 前提: 受講者は第3回でAgents SDKのtoolsとMCPを触った
- 目的: 第4回でCodex SDKの価値を理解する
- 制約: 最初はAgents SDKとの対応関係から入りたい
`.trim()
);

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const first = await thread.run(`
workshop.md を読み、第4回冒頭15分の説明計画を3点で作ってください。
ファイルは変更しないでください。
`.trim());

const second = await thread.run(`
追加制約です。最初の5分で「Codex SDKはAgents SDKの代替にもなる」と明確に言いたいです。
先ほどの計画を、追加制約を反映して更新してください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('1回目', first.finalResponse);
displayItemSummary(first.items);
displayFinalResponse('2回目', second.finalResponse);
displayItemSummary(second.items);
assertNoFileChanges([...first.items, ...second.items]);
displayThreadInfo(thread.id, second.usage);
