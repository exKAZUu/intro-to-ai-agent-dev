/**
 * 主要概念を組み合わせ、改善レポートを構造化して作成する総合例。
 */

import { Agent, run, tool, webSearchTool, withTrace } from '@openai/agents';
import { z } from 'zod';
import { readSurveyRows } from './survey-data.js';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const WorkshopImprovementReport = z.object({
  title: z.string(),
  accessLogSummary: z.object({
    practicePageRequests: z.number().int(),
    otherRequests: z.number().int(),
    originRequests: z.number().int(),
  }),
  surveySummary: z.object({
    averageSatisfaction: z.number(),
    handsOnCompletionRate: z.number(),
    hardestTopics: z.array(z.string()).min(1),
  }),
  selectedExamples: z.array(z.string()).length(3),
  risks: z.array(z.string()).min(1),
  sources: z.array(z.string().describe('根拠にしたOpenAI公式URLまたはAgents SDK JavaScript/TypeScript公式URL')).min(1),
  nextActions: z.array(z.string()).length(3),
});

const computeAccessLogSummary = tool({
  name: 'compute_access_log_summary',
  description: '学習サイトの総リクエスト数、通常演習ページと補講演習ページの週次アクセス数、週数、キャッシュヒット率から利用ログを集計します。',
  parameters: z
    .object({
      totalRequests: z.number().int(),
      weeklyRegularPracticePageRequests: z.number().int(),
      weeklySupplementPracticePageRequests: z.number().int(),
      weeks: z.number().int().positive(),
      cacheHitRate: z.number().min(0).max(1),
    })
    .strict(),
  strict: true,
  execute({ totalRequests, weeklyRegularPracticePageRequests, weeklySupplementPracticePageRequests, weeks, cacheHitRate }) {
    const practicePageRequests = (weeklyRegularPracticePageRequests + weeklySupplementPracticePageRequests) * weeks;
    const cacheHits = Math.round(totalRequests * cacheHitRate);
    return {
      practicePageRequests,
      otherRequests: totalRequests - practicePageRequests,
      originRequests: totalRequests - cacheHits,
    };
  },
});

const computeSurveyStats = tool({
  name: 'compute_survey_stats',
  description: '満足度、難しかったトピック、ハンズオン完了状況から平均満足度、完了率、最頻出トピックを計算します。',
  parameters: z
    .object({
      scores: z.array(z.number()).min(1),
      hardestTopics: z.array(z.string()).min(1),
      handsOnCompleted: z.array(z.boolean()).min(1),
    })
    .strict(),
  strict: true,
  execute({ scores, hardestTopics, handsOnCompleted }) {
    const averageSatisfaction = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const counts = new Map<string, number>();
    for (const topic of hardestTopics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
    const maxCount = Math.max(...counts.values());
    return {
      averageSatisfaction,
      handsOnCompletionRate: handsOnCompleted.filter(Boolean).length / handsOnCompleted.length,
      hardestTopics: [...counts.entries()].filter(([, count]) => count === maxCount).map(([topic]) => topic),
    };
  },
});

const safeLearningRequest = {
  name: 'safe_learning_request',
  runInParallel: false,
  async execute({ input }: { input: string | unknown[] }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const blocked = ['個人情報', '参加者ID', '個人評価を推測'].some((word) => text.includes(word));
    return {
      tripwireTriggered: blocked,
      outputInfo: blocked ? '個人情報や個人評価推測を含む依頼は扱えません。' : '問題ありません。',
    };
  },
};

const agent = new Agent({
  name: 'Workshop improvement workflow',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [webSearchTool({ searchContextSize: 'low' }), computeAccessLogSummary, computeSurveyStats],
  inputGuardrails: [safeLearningRequest],
  outputType: WorkshopImprovementReport,
});

const surveyRows = await readSurveyRows();
const request = `
あなたはAIエージェント開発ワークショップの改善レポート作成担当です。
web_search でOpenAI公式ドキュメントまたはAgents SDK JavaScript/TypeScript公式ドキュメントを確認し、指定された構造の改善レポートを作ってください。
アクセスログ集計は compute_access_log_summary、アンケート集計は compute_survey_stats を使ってください。
selectedExamples は tools、hosted tools、code interpreter、structured output、handoffs、guardrails、tracing、MCP から90分で扱う3つを選んでください。
sources は developers.openai.com、platform.openai.com、openai.github.io/openai-agents-js/ の公式URLだけにしてください。
Python SDKドキュメント、openai.com のニュース記事、第三者記事は含めないでください。

学習サイト利用ログ:
- 総リクエスト数: 8,987,654,321,234,567
- 通常演習ページの週次アクセス数: 87,654,321,987
- 補講演習ページの週次アクセス数: 12,345,678,901
- 対象期間: 89週間
- キャッシュヒット率: 72%

アンケートは20件です。
- 満足度: ${surveyRows.map((row) => row.satisfaction).join(', ')}
- 難しかった題材: ${surveyRows.map((row) => row.hardestTopic).join(', ')}
- ハンズオン完了状況: ${surveyRows.map((row) => (row.handsOnCompleted ? '完了' : '未完了')).join(', ')}
- 参加形態: ${surveyRows.map((row) => row.attendanceType).join(', ')}
- 自由記述の主な要望: toolsの実用例、structured outputの後続処理、guardrailsの失敗例、MCPの接続手順
`.trim();

await withTrace('workshop_integrated_workflow', async () => {
  const response = await run(agent, request, { maxTurns: 10 });
  console.log('\n=== 構造化された改善レポート ===\n');
  console.dir(response.finalOutput, { depth: null });
  displaySourceCheck(response.finalOutput?.sources ?? []);
});

function displaySourceCheck(sources: string[]) {
  const unexpectedSources = sources.filter((source) => !isAllowedOfficialSource(source));
  console.log('\n=== 根拠URLの確認 ===\n');
  console.log(
    unexpectedSources.length === 0
      ? 'OpenAI公式URLまたはAgents SDK JavaScript/TypeScript公式URLだけが含まれています。'
      : `想定外のURLが含まれています: ${unexpectedSources.join(', ')}`
  );
}

function isAllowedOfficialSource(source: string) {
  try {
    const url = new URL(source);
    if (url.hostname === 'developers.openai.com' || url.hostname === 'platform.openai.com') {
      return true;
    }
    return url.hostname === 'openai.github.io' && url.pathname.includes('/openai-agents-js/');
  } catch {
    return false;
  }
}
