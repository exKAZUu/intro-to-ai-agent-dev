/**
 * Hosted code interpreterを使い、第3回の試行授業後アンケートを自然文で分析する例。
 */

import { Agent, codeInterpreterTool, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Survey analyst',
  instructions: `
あなたは第3回講義の改善担当です。
アンケート集計や並べ替えが必要な場合は code_interpreter を使ってください。
最終回答では平均満足度、最も難しいとされたトピック、改善優先度の高い施策を説明してください。
`.trim(),
  model: 'gpt-5-mini',
  tools: [codeInterpreterTool()],
});

const csv = `
name,satisfaction,hardest_topic,request
Alice,5,tools,ツール設計の良い例を増やしてほしい
Bob,3,MCP,MCPの接続手順が難しい
Carol,4,MCP,Excel連携をもう一度見たい
Dave,2,guardrails,guardrailの使い所が分からない
Eve,5,tools,実用的なツール例が良かった
`.trim();

const response = await run(agent, `以下は第3回の試行授業後アンケートです。\n\n${csv}`, { maxTurns: 6 });
displayResult(response.finalOutput);

function displayResult(finalOutput: unknown) {
  console.log('\n=== アンケート分析 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
