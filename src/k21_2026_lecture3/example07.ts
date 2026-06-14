/**
 * Hosted web searchを使い、自作検索ツールを書かずに最新情報を調べる例。
 */

import { Agent, run, webSearchTool } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Hosted search lecture assistant',
  instructions: `
あなたはAIエージェント開発講座の教材調査担当です。
web_search を使って、Agents SDK の handoff、guardrail、tracing を講義で説明するための短い説明を作ってください。
最終回答では、各機能について「何を解決するか」「講義で見せるべき理由」を1文ずつ書いてください。
`.trim(),
  model: 'gpt-5-mini',
  tools: [webSearchTool({ searchContextSize: 'low' })],
});

const response = await run(agent, 'OpenAI Agents SDK handoff guardrail tracing を講義用に整理してください。', {
  maxTurns: 5,
});
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== Hosted web search の結果 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
