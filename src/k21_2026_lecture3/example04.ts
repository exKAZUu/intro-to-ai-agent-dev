/**
 * Tavily検索ツールを自作し、改善計画に必要なAgents SDK機能を外部情報に基づいて確認する例。
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
    const officialResults = results.filter((result) => isAllowedOfficialUrl(result.url));
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

function isAllowedOfficialUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    if (!officialDomains.includes(parsedUrl.hostname)) {
      return false;
    }
    return parsedUrl.hostname !== 'openai.github.io' || parsedUrl.pathname.includes('/openai-agents-js/');
  } catch {
    return false;
  }
}

const agent = new Agent({
  name: 'Workshop topic researcher with Tavily',
  instructions: `
あなたはAIエージェント開発ワークショップの教材調査担当です。
必ず tavily_search を使い、OpenAI公式ドキュメントまたは公式Agents SDK JavaScript/TypeScriptドキュメントだけを根拠にしてください。
OpenAI Agents SDKの tools、structured output、guardrails を、ワークショップの改善題材として調べてください。
演習で作るものは、学習サイト利用ログ、参加者アンケート、改善計画のいずれかを扱うものに限定してください。
最終回答は日本語で、各題材について「教材で扱う理由」と「演習で作るもの」を1文ずつ書き、最後に参考URLを列挙してください。
参考URLには Python SDK ドキュメントや第三者記事を含めないでください。
参考URLの列挙で回答を締め、追加質問や次の作業提案は書かないでください。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [tavilySearch],
});

const response = await run(
  agent,
  'OpenAI Agents SDK JavaScript TypeScript の tools、structured output、guardrails を、学習サイト利用ログ、参加者アンケート、改善計画に結びつく改善題材として調べてください。',
  { maxTurns: 5 }
);
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== Tavilyによる題材調査 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
