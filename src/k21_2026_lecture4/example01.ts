/**
 * Agents SDK的な単発run()をCodex SDKでも表現しつつ、実教材を読んで両SDKの自然な使い分けを確認する例。
 */

import { Codex } from '@openai/codex-sdk';

import {
  assertNoFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayJson,
  displayThreadInfo,
  displayWorkspace,
  parseJson,
} from './helpers.js';

const SelectionSchema = {
  type: 'object',
  properties: {
    choices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          useCase: { type: 'string' },
          recommendedSdk: { type: 'string', enum: ['Agents SDK', 'Codex SDK', 'Both'] },
          reason: { type: 'string' },
        },
        required: ['useCase', 'recommendedSdk', 'reason'],
        additionalProperties: false,
      },
    },
    ruleOfThumb: { type: 'string' },
  },
  required: ['choices', 'ruleOfThumb'],
  additionalProperties: false,
} as const;

const workspace = process.cwd();
const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(
  `
src/k21_2026_lecture3/README.md と src/k21_2026_lecture4/README.md を読み、
次の用途ごとのSDK選定をJSONで返してください。

- 受講者からの質問に答えるチャット
- 明示的なtoolsやMCPを組み込む業務支援
- リポジトリを読んでバグ修正案を出す開発支援
- 実際にソースコードを編集し、テストを実行して修正する作業
- Agents SDKのアプリ内エージェントからCodex SDKの開発作業へ渡す連携

判断は「できるか」ではなく「どちらが自然か」で行ってください。
Agents SDKが自然な用途と、Codex SDKが自然な用途を必ず両方含めてください。
ファイルは変更しないでください。
`.trim(),
  { outputSchema: SelectionSchema }
);

type SelectionResult = {
  choices: { reason: string; recommendedSdk: 'Agents SDK' | 'Codex SDK' | 'Both'; useCase: string }[];
  ruleOfThumb: string;
};

const parsed = parseJson<SelectionResult>(turn.finalResponse);

displayWorkspace(workspace);
displayFinalResponse('JSON文字列', turn.finalResponse);
displayJson('SDK選定表', parsed);
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
