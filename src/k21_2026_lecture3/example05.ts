/**
 * Hosted web searchを使い、改善計画に必要なAgents SDK機能を外部情報に基づいて確認する例。
 */

import { Agent, run, webSearchTool } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Workshop topic researcher with hosted search',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [webSearchTool({ searchContextSize: 'low' })],
});

const agentWithoutHostedSearch = new Agent({
  name: 'Workshop topic researcher without hosted search',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
});

const requestBase = `
あなたはAIエージェント開発ワークショップの教材調査担当です。
tools、structured output、guardrails を、学習サイト利用ログ、参加者アンケート、改善計画のいずれかを扱う演習題材として整理してください。
各題材について「何を解決するか」と「演習で見せる理由」を1文ずつ書き、最後に公式参考URLだけを列挙して締めてください。
参考URLは platform.openai.com、developers.openai.com、openai.github.io/openai-agents-js/ に限定してください。
Python SDKドキュメント、openai.com のニュース記事、第三者記事、追加質問、次の作業提案は含めないでください。
`.trim();

const responseWithoutHostedSearch = await run(
  agentWithoutHostedSearch,
  `
${requestBase}
外部検索ツールは使えません。手元のモデル知識だけで回答してください。
`.trim(),
  {
    maxTurns: 5,
  }
);
const responseWithHostedSearch = await run(
  agent,
  `
${requestBase}
必ず web_search を使い、OpenAI公式ドキュメントまたはAgents SDK JavaScript/TypeScript公式ドキュメントだけを根拠にしてください。
`.trim(),
  {
    maxTurns: 5,
  }
);
displayResults(responseWithoutHostedSearch.finalOutput, responseWithHostedSearch.finalOutput);
displayHostedSearchCalls(responseWithHostedSearch.newItems);

function displayResults(finalOutputWithoutHostedSearch: unknown, finalOutputWithHostedSearch: unknown) {
  console.log('\n=== Hosted web searchなしの最終出力 ===\n');
  console.log(outputToText(finalOutputWithoutHostedSearch));
  console.log('\n=== Hosted web searchありの最終出力 ===\n');
  console.log(outputToText(finalOutputWithHostedSearch));
}

function displayHostedSearchCalls(items: { toJSON(): unknown }[]) {
  console.log('\n=== Hosted web search呼び出し ===\n');
  console.dir(extractHostedSearchCalls(items), { depth: null });
}

function outputToText(finalOutput: unknown) {
  return typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput);
}

function extractHostedSearchCalls(items: { toJSON(): unknown }[]) {
  return items.flatMap((item) => {
    const itemJson = item.toJSON() as {
      rawItem?: {
        name?: string;
        status?: string;
        type?: string;
        providerData?: { action?: unknown };
      };
    };
    if (itemJson.rawItem?.type !== 'hosted_tool_call' || itemJson.rawItem.name !== 'web_search_call') {
      return [];
    }
    return [
      {
        status: itemJson.rawItem.status,
        action: itemJson.rawItem.providerData?.action,
      },
    ];
  });
}
