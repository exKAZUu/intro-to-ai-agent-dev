/**
 * Structured outputと集計ツールを併用し、アンケート分析結果を正確なオブジェクトとして受け取る例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const SurveyAnalysis = z.object({
  respondentCount: z.number().int().describe('アンケート回答者数'),
  averageScore: z.number().describe('満足度の平均値'),
  handsOnCompletionRate: z.number().describe('ハンズオン完了率。0から1の値'),
  hardestTopics: z.array(z.string()).min(1).describe('最も多く難しいと回答されたトピック。同率なら複数。'),
  recommendedTopics: z.array(z.string()).length(3).describe('90分ワークショップで優先して扱う題材を3つ'),
  improvementActions: z.array(z.string()).length(3).describe('ワークショップ改善のために行うアクションを3つ'),
});

const surveyRows = await readSurveyRows();

const computeSurveyStats = tool({
  name: 'compute_survey_stats',
  description: '読み込み済みの演習アンケートから回答者数、平均満足度、完了率、最頻出トピックを計算します。',
  parameters: z.object({}).strict(),
  strict: true,
  execute() {
    const stats = computeSurveyStatsFromRows(surveyRows);
    return {
      respondentCount: stats.respondentCount,
      averageScore: stats.averageSatisfaction,
      handsOnCompletionRate: stats.handsOnCompletionRate,
      hardestTopics: stats.hardestTopics,
    };
  },
});

const agent = new Agent({
  name: 'Structured survey analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [computeSurveyStats],
  outputType: SurveyAnalysis,
});

const survey = {
  summary: '20件の演習アンケート。主要な数値集計は compute_survey_stats が読み込み済みデータから計算します。',
  requestSummary: surveyRows.map((row) => row.request),
};

const response = await run(
  agent,
  `
次の演習アンケートを分析し、指定された構造で返してください。
回答者数、平均満足度、ハンズオン完了率、最頻出トピックは必ず compute_survey_stats で計算してください。
recommendedTopics は tools、structured output、guardrails、MCP から3つ選んでください。

${JSON.stringify(survey)}
`.trim(),
  { maxTurns: 5 }
);

console.log('\n=== パース済みオブジェクト ===\n');
console.dir(response.finalOutput, { depth: null });
console.log('\n平均満足度だけをプログラムから参照:', response.finalOutput?.averageScore);
console.log('ハンズオン完了率だけをプログラムから参照:', response.finalOutput?.handsOnCompletionRate);
displayComparison(response.finalOutput);

function displayComparison(finalOutput: unknown) {
  console.log('\n=== Structured outputなし/ありの比較 ===\n');
  console.log('なし: 自然文回答では、平均満足度や完了率を後続プログラムから安全に参照するには追加のパース処理が必要です。');
  console.log(
    typeof finalOutput === 'object' && finalOutput !== null
      ? 'あり: outputType により、averageScore や handsOnCompletionRate を型付きオブジェクトのプロパティとして参照できます。'
      : 'あり: outputType を指定しているため、本来は型付きオブジェクトとして参照できます。'
  );
}

async function readSurveyRows() {
  const [, ...lines] = (await readFile(new URL('./survey.csv', import.meta.url), 'utf8')).trim().split('\n');
  return lines.map((line) => {
    const [, , , satisfaction, hardestTopic, handsOnCompleted, , request] = line.split(',');
    return {
      handsOnCompleted: handsOnCompleted === '完了',
      hardestTopic: hardestTopic ?? '',
      request: request ?? '',
      satisfaction: Number(satisfaction),
    };
  });
}

function computeSurveyStatsFromRows(rows: Awaited<ReturnType<typeof readSurveyRows>>) {
  const topicCounts = new Map<string, number>();
  for (const row of rows) {
    topicCounts.set(row.hardestTopic, (topicCounts.get(row.hardestTopic) ?? 0) + 1);
  }
  const maxTopicCount = Math.max(...topicCounts.values());
  return {
    averageSatisfaction: rows.reduce((sum, row) => sum + row.satisfaction, 0) / rows.length,
    handsOnCompletionRate: rows.filter((row) => row.handsOnCompleted).length / rows.length,
    hardestTopics: [...topicCounts.entries()].filter(([, count]) => count === maxTopicCount).map(([topic]) => topic),
    respondentCount: rows.length,
  };
}
