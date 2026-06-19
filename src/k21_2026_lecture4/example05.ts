/**
 * read-only sandboxを使い、Codexにレビューだけを許可してファイル変更を防ぐ例。
 */

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary } from './helpers.js';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
src/k21_2026_lecture3/example04.ts から example09.ts をレビューしてください。
Function CallingからAgents SDKのtool、外部検索、code interpreter、structured outputへ進む教材として、接続が弱い点を最大3件で指摘してください。
必要な修正は文章で提案するだけにし、ファイルは絶対に変更しないでください。
`.trim());

displayFinalResponse('レビュー結果', turn.finalResponse);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
