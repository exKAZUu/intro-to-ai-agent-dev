/**
 * Hosted code interpreterを使い、演習アンケートを自然文で分析する例。
 */

import { readFile } from 'node:fs/promises';
import { Agent, codeInterpreterTool, run } from '@openai/agents';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agentWithoutCodeInterpreter = new Agent({
  name: 'Survey analyst without code interpreter',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
});

const agentWithCodeInterpreter = new Agent({
  name: 'Survey analyst with code interpreter',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [codeInterpreterTool()],
});

const csv = await readFile(new URL('./survey.csv', import.meta.url), 'utf8');
const promptWithoutCodeInterpreter = buildPrompt(csv, {
  instruction: 'ツールは使えません。CSVを自然文として読んで分析してください。',
});
const promptWithCodeInterpreter = buildPrompt(csv, {
  instruction: '必ず code_interpreter を使ってCSVを集計してから分析してください。',
});

const responseWithoutCodeInterpreter = await run(agentWithoutCodeInterpreter, promptWithoutCodeInterpreter, { maxTurns: 3 });
const responseWithCodeInterpreter = await run(agentWithCodeInterpreter, promptWithCodeInterpreter, { maxTurns: 6 });

displayComparison({
  withCodeInterpreter: responseWithCodeInterpreter.finalOutput,
  withoutCodeInterpreter: responseWithoutCodeInterpreter.finalOutput,
});

function buildPrompt(csvText: string, options: { instruction: string }) {
  return `
あなたはワークショップの改善担当です。
${options.instruction}
次の演習後アンケートを集計してください。
出力は次の3行だけにしてください。説明、根拠、追加質問、次の作業提案は書かないでください。

全体: 回答者数、平均満足度、ハンズオン完了率
参加形態: 教室参加/オンライン参加/録画視聴それぞれの人数、平均満足度、ハンズオン完了率
最難関: 最多の hardest_topic と件数

${csvText}
`.trim();
}

function displayComparison(results: { withCodeInterpreter: unknown; withoutCodeInterpreter: unknown }) {
  console.log('\n=== なし ===\n');
  displayFinalOutput(results.withoutCodeInterpreter);
  console.log('\n=== あり ===\n');
  displayFinalOutput(results.withCodeInterpreter);
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
