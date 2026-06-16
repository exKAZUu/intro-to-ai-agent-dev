/**
 * Tracingの有無を比較し、ツール利用を含む改善フローを記録する例。
 */

import { readFile } from 'node:fs/promises';
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

const agent = new Agent({
  name: 'Trace workshop improvement analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [computeAverage],
});

const surveyRows = await readSurveyRows();
const traceName = 'workshop_improvement_trace';
const prompt = `
次の演習アンケートを分析し、改善コメントを1行で返してください。
満足度平均は必ず compute_average を使ってください。
満足度は ${surveyRows.map((row) => row.satisfaction).join(', ')} です。
難所は ${surveyRows.map((row) => row.hardestTopic).join(', ')} です。
ハンズオン未完了者は${surveyRows.filter((row) => !row.handsOnCompleted).length}人で、自由記述では実用例、後続処理、失敗例、接続手順への要望が多いです。
`.trim();

const responseWithoutTrace = await run(agent, prompt, { maxTurns: 5 });
let responseWithTrace: typeof responseWithoutTrace | undefined;

await withTrace(traceName, async () => {
  responseWithTrace = await run(agent, prompt, { maxTurns: 5 });
});

console.log('\n=== なし ===\n');
console.log('trace: なし');
displayFinalOutput(responseWithoutTrace.finalOutput);
console.log('\n=== あり ===\n');
console.log(`trace: ${traceName}`);
displayFinalOutput(responseWithTrace?.finalOutput);
console.log('確認: Traces画面でTrace名、エージェント名、compute_averageを確認できます。');
console.log('Traces画面: https://platform.openai.com/traces');

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

async function readSurveyRows() {
  const [, ...lines] = (await readFile(new URL('./survey.csv', import.meta.url), 'utf8')).trim().split('\n');
  return lines.map((line) => {
    const [, , , satisfaction, hardestTopic, handsOnCompleted] = line.split(',');
    return {
      handsOnCompleted: handsOnCompleted === '完了',
      hardestTopic,
      satisfaction: Number(satisfaction),
    };
  });
}
