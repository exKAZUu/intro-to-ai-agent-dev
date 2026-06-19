/**
 * Agents SDKの単発run()で作る受付エージェントをCodex SDKでも表現し、使い分けを確認する例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-agent-replacement-'));
await writeFile(
  join(workspace, 'request.md'),
  `
# 受講者からの相談

前回までに学んだ内容と今回の内容がどうつながるのか、まだ整理できていません。
場面ごとの判断基準を知りたいです。
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
request.md を読み、講義受付エージェントとして日本語で回答してください。
回答は4文以内にしてください。
第3回はAgents SDK、第4回はCodex SDKを指すものとして扱ってください。
アプリ内エージェント、コードベースを読む開発作業、両者を組み合わせるワークフローの3観点で判断基準を示してください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
