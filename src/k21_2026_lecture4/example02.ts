/**
 * 非構造な開発依頼と実ファイルを読み、後続のCodex作業に渡すstructured outputへ変換する例。
 */

import { Codex } from '@openai/codex-sdk';

import {
  assertNoFileChanges,
  createExampleWorkspace,
  displayFinalResponse,
  displayItemSummary,
  displayJson,
  displayThreadInfo,
  displayWorkspace,
  parseJson,
} from './helpers.js';

const workspace = await createExampleWorkspace('example02', 'k21-codex-structured-triage-');

const RepairPlanSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesToInspect: {
      type: 'array',
      items: { type: 'string' },
    },
    suspectedCause: { type: 'string' },
    evidence: {
      type: 'array',
      items: { type: 'string' },
    },
    commandsToRun: {
      type: 'array',
      items: { type: 'string' },
    },
    requiresWriteAccess: { type: 'boolean' },
    nextStep: { type: 'string', enum: ['inspect', 'edit', 'ask-human'] },
  },
  required: ['summary', 'filesToInspect', 'suspectedCause', 'evidence', 'commandsToRun', 'requiresWriteAccess', 'nextStep'],
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
bug-report.md、survey.csv、scripts/analyze-survey.js、scripts/analyze-survey.test.js を読み、このあと修正作業に進むための確認事項をJSONで整理してください。
filesToInspect には、このworkspaceに実在するファイルを相対パスで入れてください。
evidence には、どの実ファイルから何を確認したかを短く入れてください。
commandsToRun には、受講者が見ても分かる素のコマンドだけを入れてください。
まだファイルは変更しないでください。
`.trim(),
  { outputSchema: RepairPlanSchema }
);

type RepairPlan = {
  commandsToRun: string[];
  evidence: string[];
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
displayJson('アプリ側で後続作業に渡す情報', {
  nextSandboxMode: parsed.requiresWriteAccess ? 'workspace-write' : 'read-only',
  nextStep: parsed.nextStep,
  commandsToRun: parsed.commandsToRun,
});
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);
