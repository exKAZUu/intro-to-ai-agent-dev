/**
 * 01の自然文回答から一歩進め、アプリ側の分岐に使うstructured outputをCodex SDKで受け取る例。
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Codex } from '@openai/codex-sdk';

import { assertNoFileChanges, displayFinalResponse, displayItemSummary, displayJson, displayThreadInfo, displayWorkspace, parseJson } from './helpers.js';

const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-structured-triage-'));
await writeFile(
  join(workspace, 'requests.json'),
  JSON.stringify(
    [
      { id: 'r1', text: 'toolsとMCPの違いを演習前にもう一度説明してほしい' },
      { id: 'r2', text: 'Codex SDKでファイルを編集するときの安全な権限設定を知りたい' },
      { id: 'r3', text: '第3回のアンケート集計を次回改善案につなげたい' },
    ],
    null,
    2
  )
);

const TriageSchema = {
  type: 'object',
  properties: {
    requests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: ['concept', 'safety', 'analysis'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          owner: { type: 'string' },
          reply: { type: 'string' },
        },
        required: ['id', 'category', 'priority', 'owner', 'reply'],
        additionalProperties: false,
      },
    },
  },
  required: ['requests'],
  additionalProperties: false,
} as const;

const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'read-only',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(
  `
requests.json を読み、各相談を講義運営で扱いやすいJSONに分類してください。
owner は teacher, ta, curriculum のいずれかにしてください。
これは受講者へ直接返す文章ではなく、アプリ側が担当者への振り分けや優先対応に使うデータです。
ファイルは変更しないでください。
`.trim(),
  { outputSchema: TriageSchema }
);

type TriageResult = {
  requests: {
    category: 'concept' | 'safety' | 'analysis';
    id: string;
    owner: string;
    priority: 'high' | 'medium' | 'low';
    reply: string;
  }[];
};

const parsed = parseJson<TriageResult>(turn.finalResponse);
displayWorkspace(workspace);
displayFinalResponse('JSON文字列', turn.finalResponse);
displayJson('パース後の分類結果', parsed.requests);
displayJson('アプリ側で使う振り分け情報', {
  highPriorityRequestIds: parsed.requests.filter((request) => request.priority === 'high').map((request) => request.id),
  ownerQueues: groupByOwner(parsed.requests),
});
displayItemSummary(turn.items);
assertNoFileChanges(turn.items);
displayThreadInfo(thread.id, turn.usage);

function groupByOwner(requests: TriageResult['requests']) {
  return requests.reduce<Record<string, string[]>>((groups, request) => {
    const ownerRequests = groups[request.owner] ?? [];
    ownerRequests.push(request.id);
    groups[request.owner] = ownerRequests;
    return groups;
  }, {});
}
