/**
 * Agents SDKの会話履歴・セッション管理を、Codex threadの連続turnで置き換える例。
 */

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, createExampleWorkspace, displayFinalResponse, displayItemSummary, displayThreadInfo, displayWorkspace } from './helpers.js';

const workspace = await createExampleWorkspace('example03', 'k21-codex-thread-memory-');

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
追加制約です。最初の5分で「Codex SDKでも一部の単発実行は表現できるが、アプリ内エージェントや明示的なtool orchestrationはAgents SDKが自然」と明確に言いたいです。
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
