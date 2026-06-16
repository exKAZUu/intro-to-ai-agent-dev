/**
 * Tracingで、アンケート分析エージェントが根拠を集める過程を記録する例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run, tool, withTrace } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const getSurveySummary = tool({
  name: 'get_survey_summary',
  description: 'survey.csvの回答数、満足度平均、ハンズオン完了率、難所別件数を返します。',
  parameters: z.object({}).strict(),
  strict: true,
  async execute() {
    const rows = await readSurveyRows();
    const topicCounts = countTopics(rows);
    const maxCount = Math.max(...topicCounts.map((topic) => topic.count));
    return {
      averageSatisfaction: average(rows.map((row) => row.satisfaction)),
      completionRate: rows.filter((row) => row.hands_on_completed === '完了').length / rows.length,
      respondentCount: rows.length,
      topicCounts,
      topTopics: topicCounts.filter((topic) => topic.count === maxCount),
    };
  },
});

const getTopicRequests = tool({
  name: 'get_topic_requests',
  description: '指定した難所に関する自由記述を返します。',
  parameters: z
    .object({
      topics: z.array(z.string()).min(1).max(3),
    })
    .strict(),
  strict: true,
  async execute({ topics }) {
    const topicSet = new Set(topics);
    const rows = await readSurveyRows();
    return topics.map((topic) => ({
      requests: rows
        .filter((row) => topicSet.has(row.hardest_topic) && row.hardest_topic === topic)
        .map((row) => ({
          completed: row.hands_on_completed,
          request: row.request,
          satisfaction: row.satisfaction,
        })),
      topic,
    }));
  },
});

const agent = new Agent({
  name: 'Workshop improvement analyst',
  instructions: 'あなたは講義改善のためにアンケートを分析するアシスタントです。',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [getSurveySummary, getTopicRequests],
});

const traceName = 'workshop_improvement_trace';
const prompt = `
survey.csv の回答をもとに、次回の講義で優先すべき改善案を2つ提案してください。
各案には、対象、理由、具体策を含めてください。
最後に補足や次の提案は書かないでください。
`.trim();

let response: AgentRunSummary | undefined;
await withTrace(traceName, async () => {
  response = await run(agent, prompt, { maxTurns: 5 });
});

console.log('\n=== 実行結果 ===\n');
console.log(`trace: ${traceName}`);
displayToolCalls(response?.newItems ?? []);
displayFinalOutput(response?.finalOutput);
console.log('\n=== 確認先 ===\n');
console.log('Traces画面で、全体集計と自由記述の取得過程を確認できます。');
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

function countTopics(rows: SurveyRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.hardest_topic, (counts.get(row.hardest_topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ count, topic }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function readSurveyRows() {
  const [headerLine, ...lines] = (await readFile(new URL('./survey.csv', import.meta.url), 'utf8')).trim().split('\n');
  if (headerLine == null) {
    throw new Error('survey.csv is empty.');
  }
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as Record<string, string>;
    return {
      hands_on_completed: row.hands_on_completed ?? '',
      hardest_topic: row.hardest_topic ?? '',
      request: row.request ?? '',
      satisfaction: Number(row.satisfaction),
    };
  });
}

type SurveyRow = {
  hands_on_completed: string;
  hardest_topic: string;
  request: string;
  satisfaction: number;
};

type AgentRunSummary = {
  finalOutput: unknown;
  newItems: { toJSON(): unknown }[];
};
