/**
 * Hosted web searchの有無を比較し、Agents SDK機能の公式URL確認に使う例。
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
次の3項目について、公式参考URLを1件ずつ探してください。
- Agents SDK JavaScript/TypeScript の tools
- Structured Outputs
- Agents SDK JavaScript/TypeScript の guardrails
出力は「項目名: URL」の3行だけにしてください。
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
必ず web_search を使ってURLを確認してください。
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
