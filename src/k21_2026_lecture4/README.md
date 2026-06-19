# k21_2026_lecture4

ワークショップのプログラム例です。`src/lecture1` の LLM / Responses API 入門、`src/k21_2026_lecture2` の会話履歴・instructions・推論設定、`src/k21_2026_lecture3` の Function Calling / Agents SDK / Hosted tools / Handoff / Guardrails / Tracing / MCP の流れを引き継ぎ、Codex SDK を扱います。

第4回の流れは、最初に「Agents SDK で作っていたエージェント的な処理を Codex SDK で置き換えられる」ことを確認し、その後で「Codex SDK でないと実用的に作りにくい、コードベースを読み、ファイルを編集し、コマンドで検証し、レビューし、再開できる開発エージェント」へ進む構成です。

## 問題構成

1. Agents SDK 的なプログラムを Codex SDK で置き換える
   - `example01.ts`: `run()` で受付エージェント風の単発応答を作り、Agents SDK と Codex SDK の使い分けを確認します。
   - `example02.ts`: `outputSchema` で、分類・優先度付けの構造化出力を受け取ります。
   - `example03.ts`: 同じ thread に連続依頼し、会話状態を使った計画更新を行います。
   - `example04.ts`: `runStreamed()` で、進行中イベントを UI ログのように観察します。
2. Agents SDK の tool / code interpreter 的な処理を Codex SDK で置き換える
   - `example05.ts`: ファイル読み取りツールを自作せず、read-only workspace のファイルを根拠に回答します。
   - `example06.ts`: 一時ワークスペースに CSV と分析スクリプトを作り、実行結果を JSON として受け取ります。
3. Codex SDK でしか作りにくい開発ワークフローに進む
   - `example07.ts`: `workspace-write` でファイルを編集し、`file_change` を確認します。
   - `example08.ts`: バグ修正と検証コマンド実行を1つの turn で行います。
   - `example09.ts`: read-only sandbox でコードレビューだけを許可し、変更がないことを確認します。
   - `example10.ts`: 実装担当 thread とレビュー担当 thread を分けます。
   - `example11.ts`: 1つの thread で調査、計画、実装、検証を段階的に進めます。
   - `example12.ts`: `resumeThread()` で中断した開発作業を再開します。
   - `example13.ts`: `webSearchMode` で外部公式情報とローカルコードベース文脈を組み合わせます。

## プログラム例

- `example01.ts`
  - 概要: 一時ワークスペースの `request.md` を読み、受付エージェント風に短い回答を返しながら、Agents SDK と Codex SDK の使い分けを整理します。
  - 学習のねらい: Agents SDK の `Agent` + `run()` で作る単発エージェントは Codex SDK でも表現できますが、アプリ内エージェントには Agents SDK、コードベースを読む開発作業には Codex SDK が向くことを確認します。
- `example02.ts`
  - 概要: `requests.json` の問い合わせを、カテゴリ、優先度、担当、返信文に分類し、アプリ側の振り分けに使える JSON として受け取ります。
  - 学習のねらい: 01のような「人に返す自然文」ではなく、後続処理が参照する機械可読データを Codex SDK の `outputSchema` で受け取れることを確認します。
- `example03.ts`
  - 概要: 同じ Codex thread で、最初の計画に追加制約を与えて計画を更新します。
  - 学習のねらい: Agents SDK の会話履歴やセッション管理に相当する文脈保持を、Codex thread が担えることを確認します。
- `example04.ts`
  - 概要: `runStreamed()` のイベントを表示し、最終回答までの進行を観察します。
  - 学習のねらい: Agents SDK の streaming と同じように、UI やログに途中経過を流せることを確認します。
- `example05.ts`
  - 概要: FAQ と講義ノートのファイルを読み、根拠ファイル名付きで回答します。
  - 学習のねらい: Agents SDK なら file search / read file tool を自作したくなる処理を、Codex SDK では workspace の読み取り能力として扱えることを学びます。
- `example06.ts`
  - 概要: `survey.csv` から分析スクリプトを作成・実行し、スクリプトが出力した JSON を確認します。
  - 学習のねらい: code interpreter 的な表形式データ処理を、ファイル作成とコマンド実行の組み合わせで再現します。
- `example07.ts`
  - 概要: `lecture_plan.md` を編集し、変更後のファイル内容と `file_change` item を表示します。
  - 学習のねらい: read-only の問い合わせから、権限付きの実装作業へ進む境界を確認します。
- `example08.ts`
  - 概要: 壊れた `survey.js` を修正し、`node survey.js` で `average=3.8` を検証します。
  - 学習のねらい: コードを読み、直し、コマンドで確認する Codex SDK の中核ループを体験します。
- `example09.ts`
  - 概要: 小さなプロジェクトを read-only でレビューし、修正提案だけを受け取ります。
  - 学習のねらい: レビューでは書き込み権限を渡さないという、アプリケーション側の安全境界を作れることを確認します。
- `example10.ts`
  - 概要: 実装担当 thread がコードを書き、レビュー担当 thread が read-only で検査します。
  - 学習のねらい: Agents SDK の Handoff とは別に、Codex SDK の複数 thread と sandbox 権限で役割分担できることを学びます。
- `example11.ts`
  - 概要: 1つの thread で調査、計画、実装、検証を段階的に進めます。
  - 学習のねらい: 独立したツール呼び出しではなく、開発文脈を持ち続けるエージェントとして Codex を使います。
- `example12.ts`
  - 概要: 計画作成後に thread ID を使って再開し、同じ文脈で実装と検証を続けます。
  - 学習のねらい: 長い開発作業や人間の確認を挟む作業を、プロセスをまたいで再開できることを確認します。
- `example13.ts`
  - 概要: ローカルの Codex SDK 使用コードを読み、web search で公式情報を確認して改善案を出します。
  - 学習のねらい: 外部情報検索だけでなく、ローカルコードベース文脈と組み合わせるところに Codex SDK の価値があることを確認します。

## 補足

- Codex SDK はローカルの `codex` CLI を起動し、JSONL イベントでやり取りします。
- `codex` CLI が使える状態で実行してください。API キーまたは Codex のログイン状態は、ローカル環境の設定に従います。
- すべての書き込み例は一時ワークスペースを使い、現在のリポジトリ本体を書き換えません。
- `workspace-write` の例では、必要に応じて `skipGitRepoCheck: true` を使います。
- `example13.ts` は `webSearchMode` を使うため、実行環境の Codex CLI で web search が利用できる必要があります。
