/**
 * Hosted web searchを使い、Tavilyラッパーを書かずに同じ演習題材調査を行う例。
 */

import { Agent, run, webSearchTool } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Hosted topic researcher',
  instructions: `
あなたはAIエージェント開発講座の教材調査担当です。
前の例では Tavily ツールで演習題材を調べました。この例では web_search を使って同じ目的を達成します。
前の例で選んだ題材との接続を保つため、第3回演習の題材は必ず tools、MCP、guardrails の3つにしてください。
各題材について「何を解決するか」「演習で見せるべき理由」を1文ずつ書いてください。
`.trim(),
  model: 'gpt-5-mini',
  tools: [webSearchTool({ searchContextSize: 'low' })],
});

const response = await run(agent, 'OpenAI Agents SDK の tools、MCP、guardrails を第3回演習題材として講義用に整理してください。', {
  maxTurns: 5,
});
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== Hosted web search による演習題材調査 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
