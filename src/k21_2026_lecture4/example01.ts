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

第3回ではAgents SDKを使って、ユーザーからの相談を受け付けたり、toolsやMCPで外部機能を呼び出したりするエージェントを作りました。
第4回ではCodex SDKを使うと聞きましたが、似たようなエージェント実行に見えてしまい、どちらを選べばよいのか迷っています。
たとえば、受講者からの質問に答えるチャット、社内資料を参照する業務支援、リポジトリを読んでバグ修正案を出す開発支援、実際にテストを実行して修正する作業では、それぞれどちらを使うべきですか。
両方を組み合わせるなら、どこで役割を分けると自然ですか。
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

const turn = await thread.run('request.md を読み、講義受付エージェントとして日本語で4文以内で回答してください。');

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
