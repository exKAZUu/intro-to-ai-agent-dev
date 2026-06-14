/**
 * 検索で確認した演習題材と計算ツールを組み合わせ、90分授業のローテーション計画を作る例。
 */

import { Agent, run, tool } from '@openai/agents';
import { tavily } from '@tavily/core';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';
process.env.TAVILY_API_KEY ||= 'tvly-<ここにTavilyのAPIキーを貼り付けてください>';

const tvly = tavily();
const tavilySearch = tool({
  name: 'tavily_search',
  description: '最新のウェブ検索結果を取得します。',
  parameters: z.object({ query: z.string().min(1) }).strict(),
  strict: true,
  async execute({ query }) {
    const { results } = await tvly.search(query, { maxResults: 4, includeAnswer: false, includeImages: false });
    return {
      results: results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
      })),
    };
  },
});

const computeRotationPlan = tool({
  name: 'compute_rotation_plan',
  description: '総授業時間、導入時間、まとめ時間、題材数から、各題材に使える演習時間を計算します。',
  parameters: z
    .object({
      totalMinutes: z.number().int(),
      introMinutes: z.number().int(),
      wrapUpMinutes: z.number().int(),
      topicCount: z.number().int().positive(),
    })
    .strict(),
  strict: true,
  execute({ totalMinutes, introMinutes, wrapUpMinutes, topicCount }) {
    const workshopMinutes = totalMinutes - introMinutes - wrapUpMinutes;
    return { workshopMinutes, minutesPerTopic: Math.floor(workshopMinutes / topicCount) };
  },
});

const agent = new Agent({
  name: 'Lecture rotation planner',
  instructions: `
あなたは第3回講義の90分授業計画を作ります。
演習題材の確認には tavily_search を使い、時間配分は compute_rotation_plan を使ってください。
前の例と同じ題材にそろえるため、扱う題材は必ず tools、MCP、guardrails の3つにしてください。
最終回答では、各題材の演習時間、授業の流れ、なぜその題材を扱うかを日本語でまとめ、参考URLも添えてください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [tavilySearch, computeRotationPlan],
});

const response = await run(
  agent,
  'Agents SDKの tools、MCP、guardrails を第3回演習題材にし、90分授業で導入10分、まとめ10分の場合のローテーション計画を作ってください。',
  { maxTurns: 8 }
);
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== 90分授業のローテーション計画 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
