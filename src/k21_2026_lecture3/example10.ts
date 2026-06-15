/**
 * Tracingを使い、ツール利用を含む改善フローを1つの処理として記録する例。
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
  name: 'Trace workshop improvement analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [computeAverage],
});

const surveyRows = await readSurveyRows();
const traceName = 'workshop_improvement_trace';

await withTrace(traceName, async () => {
  const response = await run(
    agent,
    `
次の演習アンケートを分析し、改善コメントを簡潔に返してください。
満足度平均は必ず compute_average を使ってください。
満足度は ${surveyRows.map((row) => row.satisfaction).join(', ')} です。
難所は ${surveyRows.map((row) => row.hardestTopic).join(', ')} です。
ハンズオン未完了者は${surveyRows.filter((row) => !row.handsOnCompleted).length}人で、自由記述では実用例、後続処理、失敗例、接続手順への要望が多いです。
`.trim(),
    { maxTurns: 5 }
  );
  console.log('\n=== Trace対象の改善フロー ===\n');
  console.log(response.finalOutput);
});

console.log('\n=== Traceの確認ポイント ===\n');
console.log(`Trace名: ${traceName}`);
console.log('OpenAIのTraces画面で、このTrace名、エージェント名、compute_averageのツール呼び出しを確認してください。');
console.log('\n=== Tracingなし/ありの比較 ===\n');
console.log('なし: 実行後に、どの処理が同じ改善フローに属するかを後から追跡しにくくなります。');
console.log(`あり: withTrace により Trace名「${traceName}」でツール呼び出しを含む一連の処理を確認できます。`);
