/**
 * Tracingの有無を比較し、ツール利用を含む改善フローを記録する例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run, tool, withTrace } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const surveyRows = await readSurveyRows();

const summarizeSurvey = tool({
  name: 'summarize_survey',
  description: '読み込み済みの演習アンケートから満足度平均、ハンズオン完了率、最多の難所を集計します。',
  parameters: z.object({}).strict(),
  strict: true,
  execute() {
    return computeSurveySummary(surveyRows);
  },
});

const agent = new Agent({
  name: 'Trace workshop improvement analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [summarizeSurvey],
});

const traceName = 'workshop_improvement_trace';
const prompt = `
読み込み済みの演習アンケートを集計し、改善コメントを1行で返してください。
満足度平均、ハンズオン完了率、最多の難所を含めてください。
`.trim();

const responseWithoutTrace = await run(agent, prompt, { maxTurns: 5 });
let responseWithTrace: typeof responseWithoutTrace | undefined;

await withTrace(traceName, async () => {
  responseWithTrace = await run(agent, prompt, { maxTurns: 5 });
});

console.log('\n=== なし ===\n');
console.log('trace: なし');
displayToolCalls(responseWithoutTrace.newItems);
displayFinalOutput(responseWithoutTrace.finalOutput);
console.log('\n=== あり ===\n');
console.log(`trace: ${traceName}`);
displayToolCalls(responseWithTrace?.newItems ?? []);
displayFinalOutput(responseWithTrace?.finalOutput);
console.log('確認: Traces画面でTrace名、エージェント名、ツール呼び出しを確認できます。');
console.log('Traces画面: https://platform.openai.com/traces');

function displayToolCalls(items: { toJSON(): unknown }[]) {
  const calls = items.flatMap((item) => {
    const itemJson = item.toJSON() as { rawItem?: { name?: string; type?: string } };
    return itemJson.rawItem?.type === 'function_call' && itemJson.rawItem.name === 'summarize_survey'
      ? ['summarize_survey']
      : [];
  });
  console.log(`tool: ${calls.length}回`);
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

async function readSurveyRows() {
  const [, ...lines] = (await readFile(new URL('./survey.csv', import.meta.url), 'utf8')).trim().split('\n');
  return lines.map((line) => {
    const columns = line.split(',');
    const satisfaction = columns[3];
    const hardestTopic = columns[4];
    const handsOnCompleted = columns[5];
    if (satisfaction == null || hardestTopic == null || handsOnCompleted == null) {
      throw new Error(`survey.csv has an invalid row: ${line}`);
    }
    return {
      handsOnCompleted: handsOnCompleted === '完了',
      hardestTopic: String(hardestTopic),
      satisfaction: Number(satisfaction),
    };
  });
}

function computeSurveySummary(rows: Awaited<ReturnType<typeof readSurveyRows>>) {
  const topicCounts = new Map<string, number>();
  for (const row of rows) {
    topicCounts.set(row.hardestTopic, (topicCounts.get(row.hardestTopic) ?? 0) + 1);
  }
  const maxTopicCount = Math.max(...topicCounts.values());
  return {
    averageSatisfaction: rows.reduce((sum, row) => sum + row.satisfaction, 0) / rows.length,
    handsOnCompletionRate: rows.filter((row) => row.handsOnCompleted).length / rows.length,
    topHardestTopics: [...topicCounts.entries()].filter(([, count]) => count === maxTopicCount).map(([topic]) => topic),
  };
}
