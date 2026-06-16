/**
 * Structured outputの有無を比較し、集計済みデータの分析結果を型付きオブジェクトとして受け取る例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const SurveyRecommendation = z.object({
  priorityTopics: z
    .array(
      z.object({
        reason: z.string().max(120).describe('優先する理由'),
        topic: z.string().max(50).describe('優先して扱う題材'),
      })
    )
    .min(1)
    .max(3)
    .describe('次回ワークショップで優先して扱う題材'),
  improvementActions: z
    .array(
      z.object({
        action: z.string().max(100).describe('改善アクション'),
        expectedOutcome: z.string().max(120).describe('期待する効果'),
      })
    )
    .min(1)
    .max(3)
    .describe('次回ワークショップで実施する改善アクション'),
});

type SurveyRecommendationResult = z.infer<typeof SurveyRecommendation>;
type SurveyStats = ReturnType<typeof computeSurveyStatsFromRows>;
type SurveyAnalysisResult = SurveyStats & SurveyRecommendationResult;

const surveyRows = await readSurveyRows();
const surveyStats = computeSurveyStatsFromRows(surveyRows);

const agentWithoutStructuredOutput = new Agent({
  name: 'Natural language survey analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
});

const agentWithStructuredOutput = new Agent({
  name: 'Structured survey analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  outputType: SurveyRecommendation,
});

const survey = {
  summary: '20件の演習アンケート。数値集計はホスト側で完了済みです。',
  stats: surveyStats,
  requestSummary: surveyRows.map((row) => row.request),
};

const surveyContext = JSON.stringify(survey);

const naturalLanguagePrompt = `
次の演習アンケート集計を分析し、次回ワークショップで優先すべき題材と改善アクションを1段落で説明してください。
数値項目は stats の値をそのまま使ってください。

${surveyContext}
`.trim();

const structuredOutputPrompt = `
次の演習アンケート集計を分析し、次回ワークショップの改善に使う結果を返してください。
優先トピックと改善アクションは、stats と requestSummary に根拠があるものに絞ってください。
各項目は一覧表示しやすい短い文にしてください。

${surveyContext}
`.trim();

const responseWithoutStructuredOutput = await run(agentWithoutStructuredOutput, naturalLanguagePrompt, { maxTurns: 5 });
const responseWithStructuredOutput = await run(agentWithStructuredOutput, structuredOutputPrompt, { maxTurns: 5 });

displayComparison({
  withStructuredOutput: responseWithStructuredOutput.finalOutput,
  withoutStructuredOutput: responseWithoutStructuredOutput.finalOutput,
});

function displayComparison(results: { withStructuredOutput: unknown; withoutStructuredOutput: unknown }) {
  console.log('\n=== なし ===\n');
  console.log(`型: ${typeof results.withoutStructuredOutput}`);
  displayFinalOutput(results.withoutStructuredOutput);
  console.log('\n後続処理で使うには、文字列のパースやキー名ゆれへの対応が必要です。');

  console.log('\n=== あり ===\n');
  console.log(`型: ${typeof results.withStructuredOutput}`);
  const structuredOutput = parseSurveyRecommendation(results.withStructuredOutput);
  if (structuredOutput) {
    displayStructuredOutput({ ...surveyStats, ...structuredOutput });
  } else {
    displayFinalOutput(results.withStructuredOutput);
  }
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function parseSurveyRecommendation(value: unknown) {
  const parsed = SurveyRecommendation.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function displayStructuredOutput(output: SurveyAnalysisResult) {
  console.log('集計済み stats と structured output を結合した結果:');
  console.log(JSON.stringify(output, null, 2));
  console.log('\n結合後の分析結果を型付きオブジェクトとして直接参照できます。');
  console.log(`respondentCount=${output.respondentCount}`);
  console.log(`averageScore=${output.averageScore}`);
  console.log(`handsOnCompletionRate=${output.handsOnCompletionRate}`);
  console.log(`hardestTopics=${output.hardestTopics.join('/')}`);
  console.log(`priorityTopics=${output.priorityTopics.map((topic) => topic.topic).join('/')}`);
  console.log(`improvementActions=${output.improvementActions.map((action) => action.action).join('/')}`);
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
    averageScore: rows.reduce((sum, row) => sum + row.satisfaction, 0) / rows.length,
    handsOnCompletionRate: rows.filter((row) => row.handsOnCompleted).length / rows.length,
    hardestTopics: [...topicCounts.entries()].filter(([, count]) => count === maxTopicCount).map(([topic]) => topic),
    respondentCount: rows.length,
  };
}
