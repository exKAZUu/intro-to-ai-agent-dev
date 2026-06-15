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
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [tavilySearch],
});

const response = await run(
  agent,
  `
あなたはAIエージェント開発ワークショップの教材調査担当です。
必ず tavily_search を使い、OpenAI公式ドキュメントまたはAgents SDK JavaScript/TypeScript公式ドキュメントだけを根拠にしてください。
tools、structured output、guardrails を、学習サイト利用ログ、参加者アンケート、改善計画のいずれかを扱う演習題材として整理してください。
各題材について「教材で扱う理由」と「演習で作るもの」を1文ずつ書き、最後に公式参考URLだけを列挙して締めてください。
Python SDKドキュメント、第三者記事、追加質問、次の作業提案は含めないでください。
`.trim(),
  { maxTurns: 5 }
);
displayResult(response.finalOutput);
displayComparison(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== Tavilyによる題材調査 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayComparison(finalOutput: unknown) {
  const text = typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput);
  const officialUrlCount = text.match(/https?:\/\/(?:developers\.openai\.com|platform\.openai\.com|openai\.github\.io)\/[^\s)]+/g)?.length ?? 0;
  console.log('\n=== Tavily検索ツールなし/ありの比較 ===\n');
  console.log('なし: 手元のモデル知識だけでは、公式ドキュメントを最新確認した根拠URL付き調査という要件を満たせません。');
  console.log(`あり: tavily_search の結果を公式ドメインに絞り込み、公式URLを ${officialUrlCount} 件含む調査として確認できます。`);
}
