/**
 * 検索ツールと計算ツールを組み合わせ、取得した外部情報を処理して比較材料を作る例。
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
    const { results } = await tvly.search(query, { maxResults: 5, includeAnswer: false, includeImages: false });
    return {
      results: results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
      })),
    };
  },
});

const compareNumbers = tool({
  name: 'compare_numbers',
  description: '2つの数値の差分と比率を計算します。',
  parameters: z.object({ left: z.number(), right: z.number() }).strict(),
  strict: true,
  execute({ left, right }) {
    return { difference: left - right, ratio: left / right };
  },
});

const agent = new Agent({
  name: 'Framework comparison assistant',
  instructions: `
AIエージェント開発講座で使う比較材料を作ります。
GitHubスター数などの最新値は tavily_search で調べ、差分と比率は compare_numbers で計算してください。
数値の出典URLも必ず示してください。
`.trim(),
  model: 'gpt-4o-mini',
  modelSettings: { temperature: 0 },
  tools: [tavilySearch, compareNumbers],
});

const response = await run(
  agent,
  'OpenAI Agents SDK JavaScript と LangChain JavaScript の GitHub スター数を調べ、差分と比率を講義用にまとめてください。',
  { maxTurns: 8 }
);
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== 比較結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
