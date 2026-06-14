/**
 * Codex SDKの最小構成で、リポジトリを読み取るコーディングエージェントとして使う例。
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
README.md と src ディレクトリを確認し、このリポジトリの目的を日本語で2文以内で説明してください。
ファイルは変更しないでください。
`.trim());

console.log('\n=== Codexの回答 ===\n');
console.log(turn.finalResponse);
console.log('\nThread ID:', thread.id);
