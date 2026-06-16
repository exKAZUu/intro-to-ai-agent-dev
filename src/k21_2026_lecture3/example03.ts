/**
 * Responses APIのFunction Callingで業務専用関数を呼び出し、入力契約を明確にする例。
 */

import OpenAI from 'openai';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const client = new OpenAI();

const tools: OpenAI.Responses.ResponseCreateParams['tools'] = [
  {
    type: 'function',
    name: 'compute_access_log_summary',
    description: '学習サイトの総リクエスト数、通常演習ページと補講演習ページの週次アクセス数、各ページの対象週数、キャッシュヒット率から利用ログを集計します。',
    parameters: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number', description: '対象期間の総リクエスト数' },
        weeklyRegularPracticePageRequests: { type: 'number', description: '通常演習ページの1週間あたりのリクエスト数' },
        weeklySupplementPracticePageRequests: { type: 'number', description: '補講演習ページの1週間あたりのリクエスト数' },
        regularPracticeWeeks: { type: 'number', description: '通常演習ページの対象週数' },
        supplementPracticeWeeks: { type: 'number', description: '補講演習ページの対象週数' },
        cacheHitRate: { type: 'number', description: 'キャッシュヒット率。68%なら0.68' },
      },
      required: [
        'totalRequests',
        'weeklyRegularPracticePageRequests',
        'weeklySupplementPracticePageRequests',
        'regularPracticeWeeks',
        'supplementPracticeWeeks',
        'cacheHitRate',
      ],
      additionalProperties: false,
    },
    strict: true,
  },
];

const input: OpenAI.Responses.ResponseCreateParams['input'] = [
  {
    role: 'developer',
    content: `
あなたは学習サイトのアクセスログ集計担当です。
集計は必ず compute_access_log_summary 関数を使い、暗算で答えないでください。
最終回答では、関数が返した通常演習ページアクセス数、補講演習ページアクセス数、演習ページアクセス数、その他リクエスト数、キャッシュヒット数、オリジン到達数をまとめてください。
`.trim(),
  },
  {
    role: 'user',
    content: `
対象期間の総リクエスト数は 987,654,321 件です。
通常演習ページは1週間あたり 1,234,567 件アクセスされ、対象期間は37週間です。
補講演習ページは1週間あたり 891,011 件アクセスされ、対象期間は19週間です。
キャッシュヒット率は68%でした。
この学習サイトの利用ログを集計してください。
`.trim(),
  },
];

let finalOutput = '';
for (let turn = 0; turn < 4; turn++) {
  const response = await client.responses.create({
    model: 'gpt-5.4-nano',
    reasoning: { effort: 'low', summary: 'auto' },
    tools,
    input,
  });

  displayFunctionCalls(response.output);
  const functionCalls = response.output.filter((item) => item.type === 'function_call');
  let madeFunctionCall = false;
  if (functionCalls.length > 0) {
    input.push(...(response.output as ResponseInputItem[]));
  }
  for (const item of functionCalls) {
    madeFunctionCall = true;

    const args = parseAccessLogArguments(item.arguments);
    input.push({
      type: 'function_call_output',
      call_id: item.call_id,
      output: JSON.stringify(computeAccessLogSummary(args)),
    });
  }

  if (!madeFunctionCall) {
    finalOutput = response.output_text;
    break;
  }
}

displayResult(finalOutput);

function displayFunctionCalls(items: OpenAI.Responses.ResponseOutputItem[]) {
  const calls = items.flatMap((item) => (item.type === 'function_call' ? [{ name: item.name, arguments: item.arguments }] : []));
  if (calls.length > 0) {
    console.log('\n=== Function Calling ===\n');
    console.dir(calls, { depth: null });
  }
}

function parseAccessLogArguments(rawArguments: string) {
  return JSON.parse(rawArguments) as {
    cacheHitRate: number;
    regularPracticeWeeks: number;
    supplementPracticeWeeks: number;
    totalRequests: number;
    weeklyRegularPracticePageRequests: number;
    weeklySupplementPracticePageRequests: number;
  };
}

function computeAccessLogSummary(args: ReturnType<typeof parseAccessLogArguments>) {
  const regularPracticePageRequests = args.weeklyRegularPracticePageRequests * args.regularPracticeWeeks;
  const supplementPracticePageRequests = args.weeklySupplementPracticePageRequests * args.supplementPracticeWeeks;
  const practicePageRequests = regularPracticePageRequests + supplementPracticePageRequests;
  const cacheHits = Math.round(args.totalRequests * args.cacheHitRate);
  return {
    regularPracticePageRequests,
    supplementPracticePageRequests,
    practicePageRequests,
    otherRequests: args.totalRequests - practicePageRequests,
    cacheHits,
    originRequests: args.totalRequests - cacheHits,
  };
}

function displayResult(output: string) {
  console.log('\n=== 利用ログ集計 ===\n');
  console.log(output || '回答を生成できませんでした。');
}
