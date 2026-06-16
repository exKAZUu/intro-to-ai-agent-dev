/**
 * Hosted code interpreterの有無を比較し、演習アンケートを集計する例。
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
const prompt = `
次のCSVを集計してください。
全体、参加形態別、最多の hardest_topic を3行で答えてください。
全体と参加形態別には、回答者数、平均満足度、ハンズオン完了率を含めてください。
最多の hardest_topic が同数なら、すべて挙げてください。

${csv}
`.trim();

const responseWithoutCodeInterpreter = await run(agentWithoutCodeInterpreter, prompt, { maxTurns: 3 });
const responseWithCodeInterpreter = await run(agentWithCodeInterpreter, prompt, { maxTurns: 6 });

displayComparison({
  codeInterpreterCalls: extractCodeInterpreterCalls(responseWithCodeInterpreter.newItems),
  withCodeInterpreter: responseWithCodeInterpreter.finalOutput,
  withoutCodeInterpreter: responseWithoutCodeInterpreter.finalOutput,
});

function displayComparison(results: {
  codeInterpreterCalls: { status?: string }[];
  withCodeInterpreter: unknown;
  withoutCodeInterpreter: unknown;
}) {
  console.log('\n=== なし ===\n');
  displayFinalOutput(results.withoutCodeInterpreter);
  console.log('\n=== あり ===\n');
  console.log(`code interpreter: ${results.codeInterpreterCalls.length}回`);
  displayFinalOutput(results.withCodeInterpreter);
}

function displayFinalOutput(finalOutput: unknown) {
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function extractCodeInterpreterCalls(items: { toJSON(): unknown }[]) {
  return items.flatMap((item) => {
    const itemJson = item.toJSON() as { rawItem?: { status?: string; type?: string } };
    return itemJson.rawItem?.type === 'hosted_tool_call' ? [{ status: itemJson.rawItem.status }] : [];
  });
}
