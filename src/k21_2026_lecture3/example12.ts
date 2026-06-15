/**
 * 主要概念を組み合わせ、第3回講義改善レポートを構造化して作成する総合例。
 */

import { Agent, run, tool, webSearchTool, withTrace } from '@openai/agents';
import { z } from 'zod';
import { readSurveyRows } from './survey-data.js';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const LectureImprovementReport = z.object({
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
  description: '教材サイトの総リクエスト数、演習ページの週次アクセス数、週数、キャッシュヒット率から利用ログを集計します。',
  parameters: z
    .object({
      totalRequests: z.number().int(),
      weeklyPracticePageRequests: z.number().int(),
      weeks: z.number().int().positive(),
      cacheHitRate: z.number().min(0).max(1),
    })
    .strict(),
  strict: true,
  execute({ totalRequests, weeklyPracticePageRequests, weeks, cacheHitRate }) {
    const practicePageRequests = weeklyPracticePageRequests * weeks;
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

const safeLectureRequest = {
  name: 'safe_lecture_request',
  runInParallel: false,
  async execute({ input }: { input: string | unknown[] }) {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const blocked = ['個人情報', '学生番号', '成績を推測'].some((word) => text.includes(word));
    return {
      tripwireTriggered: blocked,
      outputInfo: blocked ? '個人情報や成績推測を含む依頼は扱えません。' : '問題ありません。',
    };
  },
};

const agent = new Agent({
  name: 'Lecture improvement workflow',
  instructions: `
あなたはAIエージェント開発講座の改善レポート作成担当です。
最新情報は web_search で確認し、OpenAI公式ドキュメントまたは公式Agents SDK JavaScript/TypeScriptドキュメントだけを根拠にしてください。
アクセスログ集計は compute_access_log_summary、アンケート集計は compute_survey_stats を使ってください。
selectedExamples は tools、hosted tools、code interpreter、structured output、handoffs、guardrails、tracing、MCP の中から、次回90分授業で扱う3つを選んでください。
sources には根拠にした公式URLだけを入れてください。Python SDKドキュメントや第三者記事のURLは含めないでください。
最終出力は指定された構造に従ってください。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [webSearchTool({ searchContextSize: 'low' }), computeAccessLogSummary, computeSurveyStats],
  inputGuardrails: [safeLectureRequest],
  outputType: LectureImprovementReport,
});

const surveyRows = await readSurveyRows();
const request = `
第3回講義の改善レポートを作ってください。
教材サイト利用ログ:
- 総リクエスト数: 8,459,217
- 演習ページの週次アクセス数: 739,184
- 対象期間: 8週間
- キャッシュヒット率: 72%

アンケートは20件です。
- 満足度: ${surveyRows.map((row) => row.satisfaction).join(', ')}
- 難しかった題材: ${surveyRows.map((row) => row.hardestTopic).join(', ')}
- ハンズオン完了状況: ${surveyRows.map((row) => (row.handsOnCompleted ? '完了' : '未完了')).join(', ')}
- 参加形態: ${surveyRows.map((row) => row.attendanceType).join(', ')}
- 自由記述の主な要望: toolsの実用例、structured outputの後続処理、guardrailsの失敗例、MCPの接続手順

OpenAI Agents SDK の現在の主要機能も公式ドキュメントで確認し、次回アクションを3つ出してください。
`.trim();

await withTrace('k21_2026_lecture3_integrated_workflow', async () => {
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
