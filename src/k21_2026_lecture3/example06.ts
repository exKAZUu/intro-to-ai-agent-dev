/**
 * Tavily検索ツールの有無を比較し、Agents SDK機能の公式URL確認に使う例。
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

const agentWithoutTavily = new Agent({
  name: 'Workshop topic researcher without Tavily',
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

const responseWithoutTavily = await run(
  agentWithoutTavily,
  `
${requestBase}
外部検索ツールは使えません。手元のモデル知識だけで回答してください。
`.trim(),
  { maxTurns: 5 }
);
const responseWithTavily = await run(
  agent,
  `
${requestBase}
必ず tavily_search を使ってURLを確認してください。
`.trim(),
  { maxTurns: 8 }
);
displayResults(responseWithoutTavily.finalOutput, responseWithTavily.finalOutput);
displayToolCalls(responseWithTavily.newItems);

function displayResults(finalOutputWithoutTavily: unknown, finalOutputWithTavily: unknown) {
  console.log('\n=== Tavilyなしの最終出力 ===\n');
  console.log(outputToText(finalOutputWithoutTavily));
  console.log('\n=== Tavilyありの最終出力 ===\n');
  console.log(outputToText(finalOutputWithTavily));
}

function displayToolCalls(items: { toJSON(): unknown }[]) {
  console.log('\n=== Tavily検索ツール呼び出し ===\n');
  console.dir(extractTavilyToolCalls(items), { depth: null });
}

function outputToText(finalOutput: unknown) {
  return typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput);
}

function extractTavilyToolCalls(items: { toJSON(): unknown }[]) {
  const calls = new Map<string, { arguments?: string; urls: string[] }>();
  for (const item of items) {
    const itemJson = item.toJSON() as {
      rawItem?: {
        callId?: string;
        name?: string;
        arguments?: string;
        output?: { text?: string };
      };
      output?: string;
    };
    const callId = itemJson.rawItem?.callId;
    if (!callId || itemJson.rawItem?.name !== 'tavily_search') {
      continue;
    }
    const current = calls.get(callId) ?? { urls: [] };
    const output = itemJson.output ?? itemJson.rawItem.output?.text;
    calls.set(callId, {
      ...current,
      ...(itemJson.rawItem.arguments ? { arguments: itemJson.rawItem.arguments } : {}),
      urls: output ? extractUrlsFromToolOutput(output) : current.urls,
    });
  }
  return [...calls.values()];
}

function extractUrlsFromToolOutput(output: string) {
  try {
    const parsed = JSON.parse(output) as { results?: { url?: unknown }[] };
    return parsed.results?.flatMap((result) => (typeof result.url === 'string' ? [result.url] : [])) ?? [];
  } catch {
    return [];
  }
}
