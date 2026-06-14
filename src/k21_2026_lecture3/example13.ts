/**
 * Tracingを使い、handoffとツール利用を含む講義改善フローを1つの処理として記録する例。
 */

import { Agent, run, tool, withTrace } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const computeAverage = tool({
  name: 'compute_average',
  description: '数値配列の平均値を計算します。',
  parameters: z.object({ values: z.array(z.number()).min(1) }).strict(),
  strict: true,
  execute({ values }) {
    return { average: values.reduce((sum, value) => sum + value, 0) / values.length };
  },
});

const analysisAgent = new Agent({
  name: 'Trace survey analysis agent',
  handoffDescription: 'アンケート集計を担当します。',
  instructions:
    '満足度平均は compute_average を使って計算し、tools、MCP、guardrails のどれを優先改善すべきかを整理してください。',
  model: 'gpt-4o-mini',
  tools: [computeAverage],
});

const triageAgent = Agent.create({
  name: 'Trace lecture improvement triage',
  instructions: 'アンケート分析の依頼は Trace survey analysis agent に委譲し、最終回答を簡潔に返してください。',
  model: 'gpt-4o-mini',
  handoffs: [analysisAgent],
});

await withTrace('k21_2026_lecture3_improvement_trace', async () => {
  const response = await run(
    triageAgent,
    '第3回アンケートの満足度 5, 3, 4, 2, 5 と難所 tools, MCP, MCP, guardrails, tools から、改善コメントを作ってください。',
    { maxTurns: 6 }
  );
  console.log('\n=== Trace対象の講義改善フロー ===\n');
  console.log(response.finalOutput);
});
