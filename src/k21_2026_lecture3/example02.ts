/**
 * Responses APIのFunction Callingで汎用計算関数を呼び出し、アクセスログ集計を安定させる例。
 */

import OpenAI from 'openai';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const client = new OpenAI();

const tools: OpenAI.Responses.ResponseCreateParams['tools'] = [
  {
    type: 'function',
    name: 'calc',
    description: '四則演算だけで構成されたJavaScript式を計算します。',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '例: 1200 * 8 + 3400',
        },
      },
      required: ['expression'],
      additionalProperties: false,
    },
    strict: true,
  },
];

const input: OpenAI.Responses.ResponseCreateParams['input'] = [
  {
    role: 'user',
    content: `
対象期間の総リクエスト数は 987,654,321 件です。
通常演習ページは 1,234,567 件/週で37週間、補講演習ページは 891,011 件/週で19週間です。
演習ページの合計アクセス数と、それ以外のリクエスト数を求めてください。
最後に「演習ページ=..., その他=...」と書いてください。
`.trim(),
  },
];

let finalOutput = '';
for (let turn = 0; turn < 6; turn++) {
  const response = await client.responses.create({
    model: 'gpt-5.4-nano',
    reasoning: { effort: 'low', summary: 'auto' },
    tools,
    input,
  });

  displayFunctionCalls(response.output);
  const functionCalls = response.output.filter((item) => item.type === 'function_call');
  let madeFunctionCall = functionCalls.length > 0;
  if (functionCalls.length > 0) {
    input.push(...(response.output as ResponseInputItem[]));
  }
  for (const item of functionCalls) {
    madeFunctionCall = true;

    const args = parseCalcArguments(item.arguments);
    input.push({
      type: 'function_call_output',
      call_id: item.call_id,
      output: JSON.stringify(executeCalc(args.expression)),
    });
  }

  if (!madeFunctionCall) {
    finalOutput = response.output_text;
    break;
  }
}

displayResult(finalOutput);

function displayFunctionCalls(items: OpenAI.Responses.ResponseOutputItem[]) {
  const calls = items.flatMap((item) =>
    item.type === 'function_call' ? [{ name: item.name, arguments: item.arguments }] : []
  );
  if (calls.length > 0) {
    console.log('\n=== Function Calling ===\n');
    console.dir(calls, { depth: null });
  }
}

function parseCalcArguments(rawArguments: string): { expression: string } {
  const parsed = JSON.parse(rawArguments) as { expression: string };
  return { expression: parsed.expression };
}

function executeCalc(expression: string) {
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return { error: '四則演算以外の式は実行できません。' };
  }
  return { result: Function(`"use strict"; return (${expression});`)() };
}

function displayResult(output: string) {
  console.log('\n=== 回答 ===\n');
  console.log(output || '回答を生成できませんでした。');
  console.log('\n期待される正解: 演習ページ=62608188, その他=925046133');
}
