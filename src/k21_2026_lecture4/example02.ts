/**
 * 同じCodex threadに続けて依頼し、前ターンのリポジトリ理解を引き継ぐ例。
 */

import { Codex } from '@openai/codex-sdk';

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: process.cwd(),
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const first = await thread.run(`
src/k21_2026_lecture3 の構成を確認し、講義3がどのような流れでAgents SDKを教えているかを3点で要約してください。
ファイルは変更しないでください。
`.trim());
console.log('\n=== 1回目 ===\n');
console.log(first.finalResponse);

const second = await thread.run(`
先ほどの理解を踏まえて、lecture4でCodex SDKを教える場合に対応させるべき概念を3つ挙げてください。
ファイルは変更しないでください。
`.trim());
console.log('\n=== 2回目 ===\n');
console.log(second.finalResponse);
console.log('\nThread ID:', thread.id);
