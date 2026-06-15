/**
 * read-only sandboxを使い、Codexにレビューだけを許可してファイル変更を防ぐ例。
 */

import { Codex } from '@openai/codex-sdk';

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

const fileChanges = turn.items.filter((item) => item.type === 'file_change');
console.log('\n=== レビュー結果 ===\n');
console.log(turn.finalResponse);
console.log('\nfile_change items:', fileChanges.length);
