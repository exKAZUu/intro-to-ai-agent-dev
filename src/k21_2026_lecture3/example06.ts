/**
 * Hosted code interpreterを使い、演習アンケートを自然文で分析する例。
 */

import { Agent, codeInterpreterTool, run } from '@openai/agents';
import { readSurveyCsv } from './survey-data.js';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const agent = new Agent({
  name: 'Survey analyst with code interpreter',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [codeInterpreterTool()],
});

const csv = await readSurveyCsv();
const response = await run(
  agent,
  `
あなたはワークショップの改善担当です。
code_interpreter で次の演習後アンケートを集計し、回答者数、平均満足度、ハンズオン完了率、最難関トピック、参加形態ごとの傾向、改善優先度の高い施策を説明してください。
最後は改善優先度の高い施策で締め、追加質問や次の作業提案は書かないでください。

${csv}
`.trim(),
  { maxTurns: 6 }
);
displayResult(response.finalOutput);
displayComparison();

function displayResult(finalOutput: unknown) {
  console.log('\n=== アンケート分析 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayComparison() {
  console.log('\n=== Code Interpreterなし/ありの比較 ===\n');
  console.log('なし: CSVを自然文として読むだけでは、並べ替えや参加形態別集計を再現可能な計算として扱いにくくなります。');
  console.log('あり: code_interpreter に表計算を任せ、回答者数・平均・完了率・最頻出トピックを回答内で確認できます。');
}
