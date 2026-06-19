/**
 * 非構造な開発依頼を、後続のCodex作業に渡すstructured outputへ変換する例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayJson, displayThreadInfo, displayWorkspace, parseJson } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-structured-triage-'));
await writeFile(
  join(workspace, 'bug-report.md'),
  `
# 受講者から届いた開発相談

演習用のアンケート集計スクリプトを動かすと、満足度の平均が 19 と表示されます。
入力データは 5, 3, 4, 2, 5 なので、期待値は 3.8 のはずです。

講義では、Codexにどのファイルを読ませ、どのコマンドで検証させるべきかをUIに表示したいです。
いきなりファイルを書き換える前に、調査対象、疑わしい原因、実行すべき検証コマンド、書き込み権限が必要かを機械的に扱える形にしてください。
`.trim()
);

const RepairPlanSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesToInspect: {
      type: 'array',
      items: { type: 'string' },
    },
    suspectedCause: { type: 'string' },
    commandsToRun: {
      type: 'array',
      items: { type: 'string' },
    },
    requiresWriteAccess: { type: 'boolean' },
    nextStep: { type: 'string', enum: ['inspect', 'edit', 'ask-human'] },
  },
  required: ['summary', 'filesToInspect', 'suspectedCause', 'commandsToRun', 'requiresWriteAccess', 'nextStep'],
  additionalProperties: false,
} as const;

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(
  `
bug-report.md を読み、次のCodex turnを制御するための修正計画JSONにしてください。
commandsToRun には、受講者が見ても分かる素のコマンドだけを入れてください。
まだファイルは変更しないでください。
`.trim(),
  { outputSchema: RepairPlanSchema }
);

type RepairPlan = {
  commandsToRun: string[];
  filesToInspect: string[];
  nextStep: 'inspect' | 'edit' | 'ask-human';
  requiresWriteAccess: boolean;
  summary: string;
  suspectedCause: string;
};

const parsed = parseJson<RepairPlan>(turn.finalResponse);
displayWorkspace(workspace);
displayFinalResponse('JSON文字列', turn.finalResponse);
displayJson('パース後の修正計画', parsed);
displayJson('アプリ側で次のturnに渡す制御情報', {
  nextSandboxMode: parsed.requiresWriteAccess ? 'workspace-write' : 'read-only',
  nextStep: parsed.nextStep,
  commandsToRun: parsed.commandsToRun,
});
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
