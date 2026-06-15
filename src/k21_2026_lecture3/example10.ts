/**
 * Tracingを使い、ツール利用を含む講義改善フローを1つの処理として記録する例。
 */

import { Agent, run, tool, withTrace } from '@openai/agents';
import { z } from 'zod';
import { readSurveyRows } from './survey-data.js';

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

const agent = new Agent({
  name: 'Trace lecture improvement analyst',
  instructions: `
第3回講義のアンケートを分析し、改善コメントを簡潔に返してください。
満足度平均は必ず compute_average を使ってください。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [computeAverage],
});

const surveyRows = await readSurveyRows();

await withTrace('k21_2026_lecture3_improvement_trace', async () => {
  const response = await run(
    agent,
    `
第3回アンケートは20件です。
満足度は ${surveyRows.map((row) => row.satisfaction).join(', ')} です。
難所は ${surveyRows.map((row) => row.hardestTopic).join(', ')} です。
ハンズオン未完了者は${surveyRows.filter((row) => !row.handsOnCompleted).length}人で、自由記述では実用例、後続処理、失敗例、接続手順への要望が多いです。
改善コメントを作ってください。
`.trim(),
    { maxTurns: 5 }
  );
  console.log('\n=== Trace対象の講義改善フロー ===\n');
  console.log(response.finalOutput);
});
