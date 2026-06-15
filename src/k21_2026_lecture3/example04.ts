/**
 * Tavily検索ツールを自作し、講義改善に必要なAgents SDK機能を外部情報に基づいて確認する例。
 */

import { Agent, run, tool } from '@openai/agents';
import { tavily } from '@tavily/core';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';
process.env.TAVILY_API_KEY ||= 'tvly-<ここにTavilyのAPIキーを貼り付けてください>';

const officialDomains = ['developers.openai.com', 'platform.openai.com', 'openai.github.io'];
const tvly = tavily();
const tavilySearch = tool({
  name: 'tavily_search',
  description: 'OpenAI公式ドキュメントと公式Agents SDKドキュメントに限定して、最新のウェブ検索結果を取得します。',
  parameters: z.object({ query: z.string().min(1) }).strict(),
  strict: true,
  async execute({ query }) {
    const officialQuery = `${query} site:developers.openai.com OR site:platform.openai.com OR site:openai.github.io`;
    const { results } = await tvly.search(officialQuery, { maxResults: 8, includeAnswer: false, includeImages: false });
    const officialResults = results.filter((result) => officialDomains.some((domain) => new URL(result.url).hostname === domain));
    return {
      results: officialResults.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
      })),
      note:
        officialResults.length > 0
          ? '公式ドメインの結果だけを返しました。'
          : '公式ドメインの結果が見つかりませんでした。回答では情報不足として扱ってください。',
    };
  },
});

const agent = new Agent({
  name: 'Lecture topic researcher with Tavily',
  instructions: `
あなたはAIエージェント開発講座の教材調査担当です。
必ず tavily_search を使い、OpenAI公式ドキュメントまたは公式Agents SDKドキュメントだけを根拠にしてください。
OpenAI Agents SDKの tools、structured output、guardrails を第3回講義の改善題材として調べてください。
最終回答は日本語で、各題材について「講義で扱う理由」と「演習で作るもの」を1文ずつ書き、最後に参考URLを列挙してください。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [tavilySearch],
});

const response = await run(
  agent,
  'OpenAI Agents SDK JavaScript TypeScript の tools、structured output、guardrails を第3回講義の改善題材として調べてください。',
  { maxTurns: 5 }
);
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== Tavilyによる題材調査 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
