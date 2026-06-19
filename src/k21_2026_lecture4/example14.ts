/**
 * 同じ依頼でも、Agents SDK と Codex SDK で usage のトークン量が異なることを確認する例。
 */

import { Agent, run, type Usage as AgentsUsage } from '@openai/agents';
import type { Usage as CodexUsage } from '@openai/codex-sdk';

import { createCodex, displayFinalResponse, displayItemSummary, displayJson, displayThreadInfo, displayWorkspace } from './helpers.js';

const model = 'gpt-5.4-nano';
const workspace = process.cwd();

const task = `
次の架空の授業アンケート結果だけを根拠に、次回のAIエージェント開発講座で優先して扱うべき改善点を3つ挙げてください。
この依頼は本文だけで完結します。ファイルやコマンドは使わず、回答は日本語で5文以内にしてください。

- 参加者数: 18
- 平均満足度: 4.1 / 5
- 難しかった題材: MCP 8件、Handoff 5件、Guardrails 3件、Tracing 2件
- もっと見たい内容: 実コードのデバッグ 9件、SDKの使い分け 6件、料金とトークン使用量 5件
- 自由記述: 「同じタスクでもSDKによって裏側の動きが違うことを数字で見たい」
`.trim();

const agentsResult = await run(createAgentsSdkAgent(), task, { maxTurns: 1 });
const codexThread = createCodex().startThread({
  approvalPolicy: 'never',
  model,
  modelReasoningEffort: 'low',
  sandboxMode: 'read-only',
  workingDirectory: workspace,
});
const codexResult = await codexThread.run(task);

displayWorkspace(workspace);
displayFinalResponse('Agents SDK の回答', stringifyFinalOutput(agentsResult.finalOutput));
displayFinalResponse('Codex SDK の回答', codexResult.finalResponse);
displayJson('usage比較', {
  agentsSdk: toComparableAgentsUsage(agentsResult.state.usage),
  codexSdk: toComparableCodexUsage(codexResult.usage),
  note: '同じユーザー依頼でも、SDKが組み立てるシステム文脈や実行ループが異なるため、トークン量は一致しません。',
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
