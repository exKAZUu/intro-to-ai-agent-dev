/**
 * Structured outputと集計ツールを併用し、アンケート分析結果を正確なオブジェクトとして受け取る例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import { computeSurveyStats as computeExpectedSurveyStats, readSurveyRows } from './survey-data.js';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const SurveyAnalysis = z.object({
  respondentCount: z.number().int().describe('アンケート回答者数'),
  averageScore: z.number().describe('満足度の平均値'),
  handsOnCompletionRate: z.number().describe('ハンズオン完了率。0から1の値'),
  hardestTopics: z.array(z.string()).min(1).describe('最も多く難しいと回答されたトピック。同率なら複数。'),
  recommendedTopics: z.array(z.string()).length(3).describe('90分授業で優先して扱う題材を3つ'),
  improvementActions: z.array(z.string()).length(3).describe('講義改善のために行うアクションを3つ'),
});

const computeSurveyStats = tool({
  name: 'compute_survey_stats',
  description: '満足度、難しかったトピック、ハンズオン完了状況から回答者数、平均満足度、完了率、最頻出トピックを計算します。',
  parameters: z
    .object({
      scores: z.array(z.number()).min(1),
      hardestTopics: z.array(z.string()).min(1),
      handsOnCompleted: z.array(z.boolean()).min(1),
    })
    .strict(),
  strict: true,
  execute({ scores, hardestTopics, handsOnCompleted }) {
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const counts = new Map<string, number>();
    for (const topic of hardestTopics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
    const maxCount = Math.max(...counts.values());
    return {
      respondentCount: scores.length,
      averageScore,
      handsOnCompletionRate: handsOnCompleted.filter(Boolean).length / handsOnCompleted.length,
      hardestTopics: [...counts.entries()].filter(([, count]) => count === maxCount).map(([topic]) => topic),
    };
  },
});

const agent = new Agent({
  name: 'Structured survey analyst',
  instructions: `
第3回講義のアンケートを分析し、指定された構造で結果を返してください。
回答者数、平均満足度、ハンズオン完了率、最頻出トピックは必ず compute_survey_stats を使ってください。
recommendedTopics は tools、structured output、guardrails、MCP の中から選んでください。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [computeSurveyStats],
  outputType: SurveyAnalysis,
});

const surveyRows = await readSurveyRows();
const survey = {
  scores: surveyRows.map((row) => row.satisfaction),
  hardestTopics: surveyRows.map((row) => row.hardestTopic),
  handsOnCompleted: surveyRows.map((row) => row.handsOnCompleted),
  requestSummary: surveyRows.map((row) => row.request),
};

const response = await run(agent, `以下のアンケートデータを分析してください。\n\n${JSON.stringify(survey)}`, { maxTurns: 5 });

console.log('\n=== パース済みオブジェクト ===\n');
console.dir(response.finalOutput, { depth: null });
console.log('\n平均満足度だけをプログラムから参照:', response.finalOutput?.averageScore);
console.log('ハンズオン完了率だけをプログラムから参照:', response.finalOutput?.handsOnCompletionRate);
displayExpectedStats(computeExpectedSurveyStats(surveyRows));

function displayExpectedStats(stats: ReturnType<typeof computeExpectedSurveyStats>) {
  console.log('\n=== プログラム側で検算した主要値 ===\n');
  console.log(`回答者数: ${stats.respondentCount}`);
  console.log(`平均満足度: ${stats.averageSatisfaction}`);
  console.log(`ハンズオン完了率: ${stats.handsOnCompletionRate}`);
  console.log(`最頻出トピック: ${stats.hardestTopics.join(', ')}`);
}
