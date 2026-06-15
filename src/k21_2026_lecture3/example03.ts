/**
 * アクセスログ分析に特化したツールを渡し、業務単位の入力契約にする例。
 */

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

process.env.OPENAI_API_KEY ||= '<ここにOpenAIのAPIキーを貼り付けてください>';

const computeAccessLogSummary = tool({
  name: 'compute_access_log_summary',
  description: '学習サイトの総リクエスト数、演習ページの週次アクセス数、週数、キャッシュヒット率から利用ログを集計します。',
  parameters: z
    .object({
      totalRequests: z.number().int().describe('対象期間の総リクエスト数'),
      weeklyPracticePageRequests: z.number().int().describe('演習ページの1週間あたりのリクエスト数'),
      weeks: z.number().int().positive().describe('対象期間の週数'),
      cacheHitRate: z.number().min(0).max(1).describe('キャッシュヒット率。72%なら0.72'),
    })
    .strict(),
  strict: true,
  execute({ totalRequests, weeklyPracticePageRequests, weeks, cacheHitRate }) {
    const practicePageRequests = weeklyPracticePageRequests * weeks;
    const otherRequests = totalRequests - practicePageRequests;
    const cacheHits = Math.round(totalRequests * cacheHitRate);
    return {
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
対象期間の総リクエスト数は 8,459,217 件です。
演習ページは1週間あたり 739,184 件アクセスされ、対象期間は8週間です。
キャッシュヒット率は72%でした。
この学習サイトの利用ログを集計してください。
必ず compute_access_log_summary を使い、暗算で答えないでください。
最終回答では、演習ページアクセス数、その他リクエスト数、キャッシュヒット数、オリジン到達数をまとめてください。
`.trim();

const response = await run(agent, request, { maxTurns: 5 });
displayToolCalls(response.newItems);
displayResult(response.finalOutput);

console.log('\n期待される主要値: 演習ページ=5913472, その他=2545745, キャッシュヒット=6090636, オリジン到達=2368581');

function displayToolCalls(items: { toJSON(): unknown }[]) {
  console.log('\n=== ツール呼び出し ===\n');
  console.dir(
    items.map((item) => item.toJSON()).filter((item) => JSON.stringify(item).includes('compute_access_log_summary')),
    { depth: null }
  );
}

function displayResult(finalOutput: unknown) {
  console.log('\n=== 利用ログ集計 ===\n');
  console.log(typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput));
}
