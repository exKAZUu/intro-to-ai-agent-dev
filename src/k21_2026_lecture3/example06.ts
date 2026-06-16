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

const csv = await readSurveyCsv();
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
次の演習後アンケートを集計し、回答者数、平均満足度、ハンズオン完了率、最難関トピック、参加形態ごとの傾向、改善優先度の高い施策を説明してください。
最後は改善優先度の高い施策で締め、追加質問や次の作業提案は書かないでください。

${csvText}
`.trim();
}

function displayComparison(results: { withCodeInterpreter: unknown; withoutCodeInterpreter: unknown }) {
  console.log('\n=== Code Interpreterなしの最終出力 ===\n');
  displayFinalOutput(results.withoutCodeInterpreter);
  console.log('\n=== Code Interpreterありの最終出力 ===\n');
  displayFinalOutput(results.withCodeInterpreter);
  console.log('\n=== Code Interpreterなし/ありの比較ポイント ===\n');
  console.log('なし: CSVを自然文として読むだけで、集計や並べ替えをLLMの推論に任せます。');
  console.log('あり: code_interpreter に表計算を任せ、回答者数・平均・完了率・最頻出トピックを計算結果として回答に反映します。');
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

async function readSurveyCsv() {
  return await readFile(new URL('./survey.csv', import.meta.url), 'utf8');
}
