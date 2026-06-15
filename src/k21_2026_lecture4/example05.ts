/**
 * read-only sandboxを使い、Codexにレビューだけを許可してファイル変更を防ぐ例。
 */

import { Codex } from '@openai/codex-sdk';

import { countItems, displayFinalResponse, displayItemSummary } from './helpers.js';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
src/k21_2026_lecture3/example04.ts から example07.ts をレビューし、検索からアンケート分析への接続性に問題がないか確認してください。
修正は提案だけにして、ファイルは絶対に変更しないでください。
`.trim());

displayFinalResponse('レビュー結果', turn.finalResponse);
displayItemSummary(turn.items);
console.log('\nfile_change items:', countItems(turn.items, 'file_change'));
