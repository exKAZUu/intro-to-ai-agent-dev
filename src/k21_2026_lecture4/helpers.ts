import type { ThreadEvent, ThreadItem, Usage } from '@openai/codex-sdk';

type ThreadItemType = ThreadItem['type'];

export function displayFinalResponse(label: string, finalResponse: string) {
  console.log(`\n=== ${label} ===\n`);
  console.log(finalResponse);
}

export function displayThreadInfo(threadId: string | null, usage: Usage | null) {
  console.log('\n=== Thread情報 ===\n');
  console.log('Thread ID:', threadId ?? '(初回イベント前のため未確定)');
  displayUsage(usage);
}

export function displayUsage(usage: Usage | null) {
  if (!usage) {
    console.log('usage: (未取得)');
    return;
  }
  console.log('usage:', usage);
}

export function displayItemSummary(items: ThreadItem[]) {
  const summary = summarizeItems(items);
  console.log('\n=== Codex item summary ===\n');
  console.dir(summary, { depth: null });
  displayErrors(items);
}

export function displayFileChanges(items: ThreadItem[]) {
  console.log('\n=== file_change items ===\n');
  console.dir(
    items.flatMap((item) => (item.type === 'file_change' ? [{ status: item.status, changes: item.changes }] : [])),
    { depth: null }
  );
}

export function displayCommandExecutions(items: ThreadItem[]) {
  console.log('\n=== command_execution items ===\n');
  console.dir(
    items.flatMap((item) =>
      item.type === 'command_execution'
        ? [
            {
              command: item.command,
              exitCode: item.exit_code,
              outputPreview: previewText(item.aggregated_output),
              status: item.status,
            },
          ]
        : []
    ),
    { depth: null }
  );
}

export function displayWebSearches(items: ThreadItem[]) {
  console.log('\n=== web_search items ===\n');
  console.dir(items.flatMap((item) => (item.type === 'web_search' ? [{ query: item.query }] : [])), { depth: null });
}

export function displayMcpToolCalls(items: ThreadItem[]) {
  console.log('\n=== mcp_tool_call items ===\n');
  console.dir(
    items.flatMap((item) =>
      item.type === 'mcp_tool_call'
        ? [
            {
              server: item.server,
              tool: item.tool,
              status: item.status,
              hasResult: item.result !== undefined,
            },
          ]
        : []
    ),
    { depth: null }
  );
}

export function displayErrors(items: ThreadItem[]) {
  const errors = items.flatMap((item) => (item.type === 'error' ? [{ message: item.message }] : []));
  if (errors.length === 0) return;

  console.log('\n=== error items ===\n');
  console.dir(errors, { depth: null });
}

export function displayJson(label: string, value: unknown) {
  console.log(`\n=== ${label} ===\n`);
  console.log(JSON.stringify(value, null, 2));
}

export function displayWorkspace(workspace: string) {
  console.log('\n=== Workspace ===\n');
  console.log(workspace);
}

export function displayEvent(event: ThreadEvent) {
  if (event.type === 'thread.started') {
    console.log('thread.started:', event.thread_id);
    return;
  }
  if (event.type === 'item.started' || event.type === 'item.updated' || event.type === 'item.completed') {
    console.log(`${event.type}: ${event.item.type}`);
    return;
  }
  if (event.type === 'turn.completed') {
    console.log('turn.completed:', event.usage);
    return;
  }
  if (event.type === 'turn.failed' || event.type === 'error') {
    console.log(`${event.type}:`, event.type === 'turn.failed' ? event.error.message : event.message);
    return;
  }
  console.log(event.type);
}

export function countItems(items: ThreadItem[], type: ThreadItemType) {
  return items.filter((item) => item.type === type).length;
}

export function assertNoFileChanges(items: ThreadItem[]) {
  const fileChangeCount = countItems(items, 'file_change');
  console.log('\nfile_change items:', fileChangeCount);
  if (fileChangeCount > 0) {
    throw new Error('read-onlyで実行したturnにfile_change itemが含まれています。');
  }
}

export function parseJson<T>(json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    throw new Error(`CodexのJSON出力を解析できませんでした: ${error}`);
  }
}

function summarizeItems(items: ThreadItem[]) {
  const summary = new Map<ThreadItemType, number>();
  for (const item of items) {
    summary.set(item.type, (summary.get(item.type) ?? 0) + 1);
  }
  return Object.fromEntries(summary);
}

function previewText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}
