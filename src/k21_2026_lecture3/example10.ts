/**
 * Handoffを使い、受付エージェントが専門エージェントへ処理を委譲する例。
 */

import { Agent, run, tool } from '@openai/agents';
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
  name: 'Score agent',
  handoffDescription: '成績やアンケートの数値集計を担当します。',
  instructions: '数値集計を行い、必要なら compute_average を使って簡潔に結果を返してください。',
  model: 'gpt-4o-mini',
  tools: [computeAverage],
});

const writingAgent = new Agent({
  name: 'Writing agent',
  handoffDescription: '講義紹介文や学生向け説明文の作成を担当します。',
  instructions: '大学講義向けに、誇張を避けた分かりやすい文章を作成してください。',
  model: 'gpt-4o-mini',
});

const triageAgent = Agent.create({
  name: 'Lecture support triage',
  instructions: `
ユーザの依頼を読み、数値集計なら Score agent に、文章作成なら Writing agent に委譲してください。
委譲後の結果をもとに、最終回答を日本語で簡潔に返してください。
`.trim(),
  model: 'gpt-4o-mini',
  handoffs: [scoreAgent, writingAgent],
});

const requests = [
  '第3回アンケートの満足度が 5, 3, 4, 2, 5 でした。平均を出してください。',
  '第3回講義の告知文を80字程度で作ってください。',
];

for (const request of requests) {
  const response = await run(triageAgent, request, { maxTurns: 6 });
  console.log(`\n=== 入力: ${request} ===\n`);
  console.log(response.finalOutput);
}
