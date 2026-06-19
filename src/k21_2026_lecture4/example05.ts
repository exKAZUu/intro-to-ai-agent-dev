/**
 * Agents SDKで自作しがちなファイル読み取りtoolを、Codex SDKのworkspace読み取りで置き換える例。
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-file-tool-'));
await mkdir(join(workspace, 'docs'));
await writeFile(
  join(workspace, 'docs', 'faq.md'),
  `
# FAQ

Q. Agents SDKとCodex SDKの違いは？
A. Agents SDKはアプリ内のエージェント実行を組み立てるSDKで、Codex SDKはコードベースを読んで作業する開発エージェントを呼び出すSDKです。
`.trim()
);
await writeFile(
  join(workspace, 'docs', 'lecture4.md'),
  `
# Lecture4

最初はCodex SDKをAgents SDKの代替として見せる。
後半はファイル編集、コマンド実行、レビュー、resumeThreadを扱う。
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

const turn = await thread.run(`
docs 配下を読み、受講者に「第4回でCodex SDKを学ぶ理由」を説明してください。
回答には根拠にしたファイル名を含めてください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
