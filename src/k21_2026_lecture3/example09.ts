/**
 * Structured outputと集計ツールを併用し、前例と同じアンケート分析結果を正確なオブジェクトとして受け取る例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const SurveyAnalysis = z.object({
  averageScore: z.number().describe('満足度の平均値'),
  hardestTopics: z.array(z.string()).min(1).describe('最も多く難しいと回答されたトピック。同率なら複数。'),
  improvementActions: z.array(z.string()).length(3).describe('次回までに行う改善アクションを3つ'),
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
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const counts = new Map<string, number>();
    for (const topic of hardestTopics) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
    const maxCount = Math.max(...counts.values());
    return {
      averageScore,
      hardestTopics: [...counts.entries()].filter(([, count]) => count === maxCount).map(([topic]) => topic),
    };
  },
});

const agent = new Agent({
  name: 'Structured survey analyst',
  instructions: `
第3回講義のアンケートを分析し、指定された構造で結果を返してください。
平均満足度と最頻出トピックは必ず compute_survey_stats を使ってください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [computeSurveyStats],
  outputType: SurveyAnalysis,
});

const csv = `
name,satisfaction,hardest_topic,request
Alice,5,tools,ツール設計の良い例を増やしてほしい
Bob,3,MCP,MCPの接続手順が難しい
Carol,4,MCP,Excel連携をもう一度見たい
Dave,2,guardrails,guardrailの使い所が分からない
Eve,5,tools,実用的なツール例が良かった
`.trim();

const response = await run(agent, `以下は第3回の試行授業後アンケートです。\n\n${csv}`, { maxTurns: 5 });

console.log('\n=== パース済みオブジェクト ===\n');
console.dir(response.finalOutput, { depth: null });
console.log('\n平均満足度だけをプログラムから参照:', response.finalOutput?.averageScore);
