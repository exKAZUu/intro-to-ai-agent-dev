/**
 * Hosted code interpreter相当の表形式データ処理を、Codex SDKのファイル作成とコマンド実行で置き換える例。
 */

import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';

import {
  createCodexEnv,
  displayCommandExecutions,
  displayFileChanges,
  displayFinalResponse,
  displayItemSummary,
  displayThreadInfo,
  displayWorkspace,
} from './helpers.js';

const execFileAsync = promisify(execFile);
const workspace = await mkdtemp(join(tmpdir(), 'k21-codex-code-interpreter-'));
const scriptPath = join(workspace, 'scripts', 'analyze-survey.js');
const readmePath = join(workspace, 'README.md');
await mkdir(join(workspace, 'scripts'));
await writeFile(
  join(workspace, 'package.json'),
  `
{"type":"module","scripts":{"analyze":"node scripts/analyze-survey.js"}}
`.trim()
);
await writeFile(
  readmePath,
  `
# Survey tools

アンケートCSVを再利用可能なスクリプトで集計します。
`.trim()
);
await writeFile(
  join(workspace, 'survey.csv'),
  `
name,attendance_type,satisfaction,hardest_topic,hands_on_completed,request
Alice,対面,5,tools,完了,実用例を増やしたい
Bob,オンライン,3,MCP,未完了,接続手順を詳しく知りたい
Carol,対面,4,MCP,完了,Excel連携を試したい
Dave,録画,2,guardrails,未完了,失敗例があると理解しやすい
Eve,対面,5,tools,完了,業務に近い題材がよい
`.trim()
);
await execFileAsync('git', ['init'], { cwd: workspace });

const codex = new Codex({ env: createCodexEnv(workspace) });
const thread = codex.startThread({
  workingDirectory: workspace,
  skipGitRepoCheck: true,
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  modelReasoningEffort: 'low',
});

const turn = await thread.run(`
scripts/analyze-survey.js を作成し、survey.csv を読み込んで分析してください。
package.json の analyze script で実行できるようにし、README.md に実行手順を追記してください。
node scripts/analyze-survey.js を実行し、平均満足度、ハンズオン完了率、最頻出の難所を確認してください。
最頻出の難所が同数なら、すべて出してください。
スクリプトはJSONを標準出力する形にしてください。
最終回答には、実行したコマンドとJSONの要点を含めてください。
`.trim());

displayWorkspace(workspace);
displayFinalResponse('Codexの回答', turn.finalResponse);
console.log('\n=== 作成されたanalyze-survey.js ===\n');
console.log(await readFile(scriptPath, 'utf8'));
console.log('\n=== 更新されたREADME.md ===\n');
console.log(await readFile(readmePath, 'utf8'));
displayItemSummary(turn.items);
displayFileChanges(turn.items);
displayCommandExecutions(turn.items);
displayThreadInfo(thread.id, turn.usage);
