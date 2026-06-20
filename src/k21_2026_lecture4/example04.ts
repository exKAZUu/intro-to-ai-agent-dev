/**
 * 同じ依頼でも、Agents SDK と Codex SDK で usage のトークン量が異なることを、比較条件付きで確認する例。
 */

import { Agent, run, type Usage as AgentsUsage } from '@openai/agents';
import { Codex, type ThreadOptions, type Usage as CodexUsage } from '@openai/codex-sdk';

import {
  displayFinalResponse,
  displayItemSummary,
  displayJson,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const model = 'gpt-5.5';
const workspace = process.cwd();

const task = `
あなたはSaaSのオンコール担当です。次のインシデント引き継ぎメモだけを根拠に、朝会で共有する優先対応を3つに絞ってください。
この依頼は本文だけで完結します。ファイルやコマンドは使わず、回答は日本語で5文以内にしてください。

- 対象サービス: B2B向け請求書レビューAPI
- 直近30分のエラー率: 通常0.2%前後に対して、特定テナント群で7.8%
- 影響: 有料顧客12社の夜間バッチが失敗し、うち3社は月末締め処理中
- 監視: p95 latencyは180msから2.4sへ悪化、DB CPUは通常40%から88%へ上昇
- 直近変更: 2時間前にPDF解析ジョブの並列数を4から16へ変更
- 暫定対応: ジョブキューを一時停止するとエラー率は0.6%まで低下したが、処理遅延が増える
- 制約: 30分以内に顧客影響を下げ、恒久対応は日中に設計する
`.trim();

const agentsResult = await run(createAgentsSdkAgent(), task, { maxTurns: 1 });

const codexThreadOptions: ThreadOptions = {
  approvalPolicy: 'never',
  model,
  modelReasoningEffort: 'low',
  sandboxMode: 'read-only',
  workingDirectory: workspace,
};
const codexThread = new Codex().startThread(codexThreadOptions);
const codexResult = await codexThread.run(task);

displayWorkspace(workspace);
displayFinalResponse('Agents SDK の回答', stringifyFinalOutput(agentsResult.finalOutput));
displayFinalResponse('Codex SDK の回答', codexResult.finalResponse);
displayJson('usage比較', {
  agentsSdk: toComparableAgentsUsage(agentsResult.state.usage),
  codexSdk: toComparableCodexUsage(codexResult.usage),
  models: {
    agentsSdk: model,
    codexSdk: model,
    sameModel: true,
  },
  comparisonScope:
    'この例では Agents SDK と Codex SDK のモデル名と reasoning effort をそろえます。ただしSDKが組み立てる文脈とusage項目の定義は異なるため、厳密なトークン量比較ではありません。',
  note: '同じユーザー依頼でも、SDKが組み立てる文脈や実行ループが異なるため、トークン量は一致しません。usage項目の定義もSDKごとに異なるため、項目単位の完全一致ではなく傾向を見る比較です。',
});
displayJson('Agents SDK raw response数', {
  rawResponses: agentsResult.rawResponses.length,
});
displayItemSummary(codexResult.items);
displayThreadInfo(codexThread.id, codexResult.usage);

function createAgentsSdkAgent() {
  return new Agent({
    model,
    modelSettings: {
      reasoning: { effort: 'low' },
      text: { verbosity: 'low' },
    },
    name: 'Token usage comparison agent',
  });
}

function stringifyFinalOutput(finalOutput: unknown) {
  return typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput);
}

function toComparableAgentsUsage(usage: AgentsUsage) {
  return {
    requests: usage.requests,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
}

function toComparableCodexUsage(usage: CodexUsage | null) {
  if (!usage) return null;
  return {
    cachedInputTokens: usage.cached_input_tokens,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    reasoningOutputTokens: usage.reasoning_output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
  };
}
