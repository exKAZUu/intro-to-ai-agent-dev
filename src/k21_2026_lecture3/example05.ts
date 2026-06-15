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

const response = await run(
  agent,
  `
あなたはAIエージェント開発ワークショップの教材調査担当です。
必ず web_search を使い、OpenAI公式ドキュメントまたは公式Agents SDK JavaScript/TypeScriptドキュメントだけを根拠にしてください。
ワークショップの改善題材は tools、structured output、guardrails の3つにそろえてください。
演習で扱う題材は、学習サイト利用ログ、参加者アンケート、改善計画のいずれかに限定してください。
各題材について「何を解決するか」と「演習で見せるべき理由」を1文ずつ書き、最後に参考URLを列挙してください。
参考URLには Python SDK ドキュメントや第三者記事を含めないでください。
参考URLの列挙で回答を締め、追加質問や次の作業提案は書かないでください。
`.trim(),
  {
    maxTurns: 5,
  }
);
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== Hosted web search による題材調査 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
