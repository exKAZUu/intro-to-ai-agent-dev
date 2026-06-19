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

第3回のtoolsとMCPの違いはなんとなく分かりましたが、第4回でCodex SDKを学ぶ理由がまだ分かりません。
Agents SDKだけでよいのではないか、という疑問があります。
逆に、Codex SDKだけで十分ならAgents SDKを学ぶ意味が薄くなるのではないか、という疑問もあります。
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
Agents SDKが向く場面、Codex SDKが向く場面、両者を組み合わせる場面を必ず含めてください。
Codex SDKだけで十分だと誤解されないように、使い分けを明確にしてください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
