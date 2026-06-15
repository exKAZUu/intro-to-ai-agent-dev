/**
 * Hosted web searchを使い、前例の検索部分をHosted toolに置き換える例。
 */

import { Agent, run, webSearchTool } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Lecture topic researcher with hosted search',
  instructions: `
あなたはAIエージェント開発講座の教材調査担当です。
この例では web_search を使って、前例のTavily検索ツールをHosted toolに置き換えます。
第3回講義の改善題材は tools、structured output、guardrails の3つにそろえてください。
各題材について「何を解決するか」と「演習で見せるべき理由」を1文ずつ書いてください。
`.trim(),
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [webSearchTool({ searchContextSize: 'low' })],
});

const response = await run(agent, 'OpenAI Agents SDK の tools、structured output、guardrails を講義用に整理してください。', {
  maxTurns: 5,
});
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== Hosted web search による題材調査 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
