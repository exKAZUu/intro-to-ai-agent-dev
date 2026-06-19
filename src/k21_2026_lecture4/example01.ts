/**
 * Agents SDKの単発run()で作る受付エージェントを、Codex SDKのrun()で置き換える例。
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
回答は3文以内にし、Agents SDKでできることとCodex SDKで広がることを対比してください。
ファイルは変更しないでください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
