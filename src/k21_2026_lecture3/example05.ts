/**
 * Tavily検索ツールを自作し、モデルの記憶ではなく外部情報を根拠に講義項目を整理する例。
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
  name: 'Lecture research assistant',
  instructions: `
あなたはAIエージェント開発講座の教材調査担当です。
必ず tavily_search を使い、検索結果に基づいて Agents SDK の主要機能を3つ選び、講義で扱う理由を説明してください。
最終回答は必ず日本語で書き、最後に参考URLを列挙してください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [tavilySearch],
});

const response = await run(
  agent,
  'OpenAI Agents SDK JavaScript TypeScript の主要機能 tools handoffs guardrails tracing を日本語の講義向けに整理してください。',
  {
    maxTurns: 5,
  }
);
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== 調査結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
