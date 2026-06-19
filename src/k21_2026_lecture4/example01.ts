/**
 * Codex SDKの最小構成で、read-onlyのリポジトリ調査を行う例。
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
README.md、package.json、src ディレクトリを確認してください。
このリポジトリの目的と、講義ごとの題材の進み方を日本語で3文以内で説明してください。
ファイルは変更しないでください。
`.trim());

displayFinalResponse('Codexの回答', turn.finalResponse);
displayItemSummary(turn.items);
displayThreadInfo(thread.id, turn.usage);
