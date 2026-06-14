/**
 * Tracingを使い、handoffとツール利用を含む実行を1つの処理として記録する例。
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

const scoreAgent = new Agent({
  name: 'Trace score agent',
  handoffDescription: '数値集計を担当します。',
  instructions: '必要に応じて compute_average を使って集計してください。',
  model: 'gpt-4o-mini',
  tools: [computeAverage],
});

const triageAgent = Agent.create({
  name: 'Trace triage agent',
  instructions: '数値集計の依頼は Trace score agent に委譲し、最終回答を簡潔に返してください。',
  model: 'gpt-4o-mini',
  handoffs: [scoreAgent],
});

await withTrace('k21_2026_lecture3_tracing_example', async () => {
  const response = await run(triageAgent, '満足度 5, 3, 4, 2, 5 の平均を出して、講義改善コメントを1文で添えて。', {
    maxTurns: 6,
  });
  console.log('\n=== Trace対象の実行結果 ===\n');
  console.log(response.finalOutput);
});
