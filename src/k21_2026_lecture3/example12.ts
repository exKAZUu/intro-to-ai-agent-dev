/**
 * Tracingの有無を比較し、アンケート集計ツールを使う改善フローを記録する例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run, tool, withTrace } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const summarizeSurvey = tool({
  name: 'summarize_survey',
  description: 'survey.csvの演習アンケートから満足度平均、ハンズオン完了率、難所別件数を集計します。',
  parameters: z.object({}).strict(),
  strict: true,
  async execute() {
    const rows = await readSurveyRows();
    return computeSurveyStats(rows);
  },
});

const agent = new Agent({
  name: 'Trace workshop improvement analyst',
  instructions: 'あなたは演習アンケートを分析するアシスタントです。',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [summarizeSurvey],
});

const traceName = 'workshop_improvement_trace';
const prompt = `
survey.csv の演習アンケートから、次回に向けた改善コメントのみを1行で返してください。
`.trim();

const responseWithoutTrace = await run(agent, prompt, { maxTurns: 5 });
let responseWithTrace: typeof responseWithoutTrace | undefined;

await withTrace(traceName, async () => {
  responseWithTrace = await run(agent, prompt, { maxTurns: 5 });
});

console.log('\n=== なし ===\n');
console.log('trace: なし');
displayToolCalls(responseWithoutTrace.newItems);
displaySurveySummary(responseWithoutTrace.newItems);
displayFinalOutput(responseWithoutTrace.finalOutput);
console.log('\n=== あり ===\n');
console.log(`trace: ${traceName}`);
displayToolCalls(responseWithTrace?.newItems ?? []);
displaySurveySummary(responseWithTrace?.newItems ?? []);
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

function displaySurveySummary(items: { toJSON(): unknown }[]) {
  const summary = extractSurveySummary(items);
  if (!summary) {
    return;
  }
  console.log(
    `集計: 平均=${summary.averageSatisfaction}, 完了率=${summary.handsOnCompletionRate}, 最多=${summary.topHardestTopics
      .map((topic) => `${topic.topic} ${topic.count}件`)
      .join(' / ')}`
  );
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function extractSurveySummary(items: { toJSON(): unknown }[]) {
  for (const item of items) {
    const itemJson = item.toJSON() as {
      output?: string;
      rawItem?: { name?: string; output?: { text?: string } | string; type?: string };
    };
    if (itemJson.rawItem?.type !== 'function_call_result' || itemJson.rawItem.name !== 'summarize_survey') {
      continue;
    }
    const output = itemJson.output ?? (typeof itemJson.rawItem.output === 'string' ? itemJson.rawItem.output : itemJson.rawItem.output?.text);
    if (!output) {
      continue;
    }
    return JSON.parse(output) as SurveySummary;
  }
  return undefined;
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
    respondentCount: rows.length,
    topicCounts: Object.fromEntries(topicCounts),
    topHardestTopics: [...topicCounts.entries()]
      .filter(([, count]) => count === maxTopicCount)
      .map(([topic, count]) => ({ count, topic })),
  };
}

async function readSurveyRows() {
  const [headerLine, ...lines] = (await readFile(new URL('./survey.csv', import.meta.url), 'utf8')).trim().split('\n');
  if (headerLine == null) {
    throw new Error('survey.csv is empty.');
  }
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    return {
      hands_on_completed: row.hands_on_completed ?? '',
      hardest_topic: row.hardest_topic ?? '',
      satisfaction: Number(row.satisfaction),
    };
  });
}

type SurveyStatsRow = {
  hands_on_completed: string;
  hardest_topic: string;
  satisfaction: number;
};

type SurveySummary = ReturnType<typeof computeSurveyStats>;
