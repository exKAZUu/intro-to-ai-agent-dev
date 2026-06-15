/**
 * Codex SDKの最小構成で、リポジトリを読み取るコーディングエージェントとして使う例。
 */

import { Codex } from '@openai/codex-sdk';

import { displayFinalResponse, displayItemSummary, displayThreadInfo } from './helpers.js';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
README.md と src ディレクトリを確認し、このリポジトリの目的を日本語で2文以内で説明してください。
ファイルは変更しないでください。
`.trim());

displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
displayThreadInfo(thread.id, turn.usage);
