/**
 * Tracingの有無を比較し、CSV読み取りと集計ツールを使う改善フローを記録する例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run, tool, withTrace } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const readSurveyCsv = tool({
  name: 'read_survey_csv',
  description: 'survey.csvの演習アンケート回答をCSVテキストとして読み取ります。',
  parameters: z.object({}).strict(),
  strict: true,
  async execute() {
    return await readFile(new URL('./survey.csv', import.meta.url), 'utf8');
  },
});

const calculateSurveyStats = tool({
  name: 'calculate_survey_stats',
  description: '演習アンケート回答から満足度平均、ハンズオン完了率、最多の難所を正確に集計します。',
  parameters: z
    .object({
      rows: z
        .array(
          z
            .object({
              hands_on_completed: z.string(),
              hardest_topic: z.string(),
              satisfaction: z.number(),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
  strict: true,
  execute({ rows }) {
    return computeSurveyStats(rows);
  },
});

const agent = new Agent({
  name: 'Trace workshop improvement analyst',
  instructions:
    'あなたは演習アンケートを分析するアシスタントです。CSVの内容を確認し、数値集計は利用可能な集計ツールで正確に処理してください。',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [readSurveyCsv, calculateSurveyStats],
});

const traceName = 'workshop_improvement_trace';
const prompt = `
survey.csv の演習アンケートを分析し、改善コメントを1行で返してください。
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
    return itemJson.rawItem?.type === 'function_call' && itemJson.rawItem.name != null ? [itemJson.rawItem.name] : [];
  });
  console.log(`tool: ${calls.length === 0 ? 'なし' : calls.join(' -> ')}`);
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function computeSurveyStats(rows: SurveyStatsRow[]) {
  const topicCounts = new Map<string, number>();
  for (const row of rows) {
    topicCounts.set(row.hardest_topic, (topicCounts.get(row.hardest_topic) ?? 0) + 1);
  }
  const maxTopicCount = Math.max(...topicCounts.values());
  return {
    averageSatisfaction: rows.reduce((sum, row) => sum + row.satisfaction, 0) / rows.length,
    handsOnCompletionRate: rows.filter((row) => row.hands_on_completed === '完了').length / rows.length,
    topHardestTopics: [...topicCounts.entries()].filter(([, count]) => count === maxTopicCount).map(([topic]) => topic),
  };
}

type SurveyStatsRow = {
  hands_on_completed: string;
  hardest_topic: string;
  satisfaction: number;
};
