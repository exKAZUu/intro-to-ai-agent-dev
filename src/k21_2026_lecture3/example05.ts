/**
 * アクセスログ分析に特化したツールを渡し、業務単位の入力契約にする例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const computeAccessLogSummary = tool({
  name: 'compute_access_log_summary',
  description: '学習サイトの総リクエスト数、通常演習ページと補講演習ページの週次アクセス数、各ページの対象週数、キャッシュヒット率から利用ログを集計します。',
  parameters: z
    .object({
      totalRequests: z.number().int().describe('対象期間の総リクエスト数'),
      weeklyRegularPracticePageRequests: z.number().int().describe('通常演習ページの1週間あたりのリクエスト数'),
      weeklySupplementPracticePageRequests: z.number().int().describe('補講演習ページの1週間あたりのリクエスト数'),
      regularPracticeWeeks: z.number().int().positive().describe('通常演習ページの対象週数'),
      supplementPracticeWeeks: z.number().int().positive().describe('補講演習ページの対象週数'),
      cacheHitRate: z.number().min(0).max(1).describe('キャッシュヒット率。68%なら0.68'),
    })
    .strict(),
  strict: true,
  execute({
    totalRequests,
    weeklyRegularPracticePageRequests,
    weeklySupplementPracticePageRequests,
    regularPracticeWeeks,
    supplementPracticeWeeks,
    cacheHitRate,
  }) {
    const regularPracticePageRequests = weeklyRegularPracticePageRequests * regularPracticeWeeks;
    const supplementPracticePageRequests = weeklySupplementPracticePageRequests * supplementPracticeWeeks;
    const practicePageRequests = regularPracticePageRequests + supplementPracticePageRequests;
    const otherRequests = totalRequests - practicePageRequests;
    const cacheHits = Math.round(totalRequests * cacheHitRate);
    return {
      regularPracticePageRequests,
      supplementPracticePageRequests,
      practicePageRequests,
      otherRequests,
      cacheHits,
      originRequests: totalRequests - cacheHits,
    };
  },
});

const agent = new Agent({
  name: 'Structured log analyst',
  model: 'gpt-5.4-nano',
  modelSettings: { reasoning: { effort: 'low', summary: 'auto' } },
  tools: [computeAccessLogSummary],
});

const request = `
対象期間の総リクエスト数は 987,654,321 件です。
通常演習ページは1週間あたり 1,234,567 件アクセスされ、対象期間は37週間です。
補講演習ページは1週間あたり 891,011 件アクセスされ、対象期間は19週間です。
キャッシュヒット率は68%でした。
この学習サイトの利用ログを集計してください。
必ず compute_access_log_summary を使い、暗算で答えないでください。
最終回答では、ツールが返した通常演習ページアクセス数、補講演習ページアクセス数、演習ページアクセス数、その他リクエスト数、キャッシュヒット数、オリジン到達数をまとめてください。
`.trim();

const response = await run(agent, request, { maxTurns: 5 });
displayToolCalls(response.newItems);
displayResult(response.finalOutput);
displayComparison();

function displayToolCalls(items: { toJSON(): unknown }[]) {
  console.log('\n=== ツール呼び出し ===\n');
  console.dir(extractToolCalls(items, 'compute_access_log_summary'), { depth: null });
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== 利用ログ集計 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}

function displayComparison() {
  console.log('\n=== 汎用計算ツール/業務専用ツールの比較 ===\n');
  console.log('汎用計算ツール: 式の作り方をLLMが毎回判断するため、必要な入力項目や単位の抜けを防ぎにくくなります。');
  console.log(
    '業務専用ツール: 総リクエスト数、2種類の週次アクセス数、各ページの対象週数、キャッシュヒット率を契約として受け取り、必要な集計をまとめて返せます。'
  );
}

function extractToolCalls(items: { toJSON(): unknown }[], toolName: string) {
  const calls = new Map<string, { arguments?: string; output?: string }>();
  for (const item of items) {
    const itemJson = item.toJSON() as { rawItem?: { callId?: string; name?: string; arguments?: string }; output?: string };
    const callId = itemJson.rawItem?.callId;
    if (!callId || itemJson.rawItem?.name !== toolName) {
      continue;
    }
    calls.set(callId, {
      ...calls.get(callId),
      ...(itemJson.rawItem.arguments ? { arguments: itemJson.rawItem.arguments } : {}),
      ...(itemJson.output ? { output: itemJson.output } : {}),
    });
  }
  return [...calls.values()];
}
