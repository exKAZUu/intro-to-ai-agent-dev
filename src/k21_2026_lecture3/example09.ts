/**
 * Structured outputを使い、アンケート分析結果を後続処理しやすいオブジェクトとして受け取る例。
 */

import { Agent, run } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const SurveyAnalysis = z.object({
  averageScore: z.number().describe('満足度の平均値'),
  hardestTopic: z.string().describe('最も多く難しいと回答されたトピック'),
  improvementActions: z.array(z.string()).length(2).describe('次回までに行う改善アクションを2つ'),
});

const agent = new Agent({
  name: 'Structured survey analyst',
  instructions: '講義アンケートを分析し、指定された構造で結果を返してください。',
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  outputType: SurveyAnalysis,
});

const survey = `
Alice: 満足度5, 難しかった=tools, 要望=ツール設計の良い例を増やしてほしい
Bob: 満足度3, 難しかった=MCP, 要望=MCPの接続手順が難しい
Carol: 満足度4, 難しかった=MCP, 要望=Excel連携をもう一度見たい
`.trim();

const response = await run(agent, survey);

console.log('\n=== パース済みオブジェクト ===\n');
console.dir(response.finalOutput, { depth: null });
console.log('\n平均満足度だけをプログラムから参照:', response.finalOutput?.averageScore);
