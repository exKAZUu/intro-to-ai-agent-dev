/**
 * Tavily検索ツールを自作し、演習で扱うAgents SDK機能を外部情報に基づいて選ぶ例。
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

const agent = new Agent({
  name: 'Lecture topic researcher',
  instructions: `
あなたはAIエージェント開発講座の教材調査担当です。
前の例で演習運営計画を作ったので、次は演習グループに割り当てる題材を選びます。
必ず tavily_search を使い、tools、MCP、guardrails を第3回演習で扱う題材として調べてください。
最終回答は必ず日本語で書き、各題材について「選ぶ理由」と「演習で作るもの」を書き、最後に参考URLを列挙してください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [tavilySearch],
});

const response = await run(
  agent,
  'OpenAI Agents SDK JavaScript TypeScript の tools、MCP、guardrails を第3回演習題材として調べてください。',
  { maxTurns: 5 }
);
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== 演習題材の調査結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
