/**
 * 主要概念を組み合わせ、第3回講義改善レポートを構造化して作成する総合例。
 */

import { Agent, run, tool, webSearchTool, withTrace } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const LectureImprovementReport = z.object({
  title: z.string(),
  averageSatisfaction: z.number(),
  hardestTopic: z.string(),
  currentSdkTopics: z.array(z.string()).min(2),
  risks: z.array(z.string()).min(1),
  nextActions: z.array(z.string()).length(3),
});

const computeSurveyStats = tool({
  name: 'compute_survey_stats',
  description: '満足度と難しかったトピックから平均満足度と最頻出トピックを計算します。',
  parameters: z
    .object({
      scores: z.array(z.number()).min(1),
      hardestTopics: z.array(z.string()).min(1),
    })
    .strict(),
  strict: true,
  execute({ scores, hardestTopics }) {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const counts = new Map<string, number>();
    for (const topic of hardestTopics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
    const hardestTopic = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return { average, hardestTopic };
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
最新情報は web_search で確認し、アンケート集計は compute_survey_stats を使ってください。
currentSdkTopics は、tools、hosted tools、handoffs、guardrails、tracing、MCP、structured output の中から、今回の講義改善に関係するものだけを選んでください。
最終出力は指定された構造に従ってください。
`.trim(),
  model: 'gpt-5-mini',
  tools: [webSearchTool({ searchContextSize: 'low' }), computeSurveyStats],
  inputGuardrails: [safeLectureRequest],
  outputType: LectureImprovementReport,
});

const request = `
第3回講義の改善レポートを作ってください。
アンケート:
- Alice: 満足度5, 難しかった=tools
- Bob: 満足度3, 難しかった=MCP
- Carol: 満足度4, 難しかった=MCP
- Dave: 満足度2, 難しかった=guardrails
- Eve: 満足度5, 難しかった=tools
OpenAI Agents SDK の現在の主要機能も確認し、次回アクションを3つ出してください。
`.trim();

await withTrace('k21_2026_lecture3_integrated_workflow', async () => {
  const response = await run(agent, request, { maxTurns: 10 });
  console.log('\n=== 構造化された改善レポート ===\n');
  console.dir(response.finalOutput, { depth: null });
});
