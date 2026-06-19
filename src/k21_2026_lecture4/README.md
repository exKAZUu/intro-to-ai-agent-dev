# k21_2026_lecture4

ワークショップのプログラム例です。第2回の Responses API、第3回の Function Calling / Agents SDK / Hosted tools / Handoff / Guardrails / Tracing / MCP の流れを引き継ぎ、Codex SDK を「コードベースを読み、作業し、検証する開発エージェントをアプリケーションから呼び出すためのSDK」として扱います。

中心テーマは、第3回で使った学習サイト利用ログ、演習アンケート、講義改善計画を、リポジトリ調査と実装作業に接続することです。前半では read-only の Codex thread でリポジトリ調査、会話状態、構造化出力、ストリーミングを確認します。後半では sandbox、ファイル編集、コマンド実行、レビュー担当の分離、Agents SDK からの Codex MCP 呼び出し、調査から検証までの一連の開発ワークフローに進みます。

## 問題構成

1. Codex SDK の最小単位を確認する
   - `example01.ts`: `Codex`、`startThread()`、`run()`、`sandboxMode: 'read-only'` の最小構成でリポジトリを調査します。
   - `example02.ts`: 同じ thread に連続で依頼し、前ターンの調査結果を次の設計判断に使います。
2. Codex の出力をプログラムから扱う
   - `example03.ts`: `outputSchema` で、第3回と第4回の対応関係を JSON として受け取ります。
   - `example04.ts`: `runStreamed()` で、途中イベント、item 種別、usage を観察します。
3. sandbox とレビュー境界を扱う
   - `example05.ts`: read-only sandbox でレビューだけを許可し、`file_change` が発生しないことを確認します。
4. 第3回の Hosted tools 相当を Codex SDK で再構成する
   - `example06.ts`: 一時ワークスペースでファイル作成、コマンド実行、構造化出力を組み合わせ、アンケート分析を再現します。
   - `example07.ts`: `webSearchMode` で外部検索を有効にし、手元のアンケート結果を公式情報で補強します。
5. ファイル編集と検証の開発ループに進む
   - `example08.ts`: `workspace-write` で講義計画ファイルを編集し、`file_change` を確認します。
   - `example09.ts`: バグ修正と検証コマンド実行を Codex に任せ、変更と実行結果を観察します。
6. 複数 thread と役割分担を扱う
   - `example10.ts`: 実装担当 thread と read-only レビュー担当 thread を分けます。
7. Agents SDK と Codex MCP を接続する
   - `example11.ts`: Agents SDK の受付エージェントが、コードベース調査だけを Codex MCP Server に委譲します。
8. 総合ワークフローとしてまとめる
   - `example12.ts`: 1つの Codex thread で調査、計画、実装、検証を段階的に進めます。
9. 長い開発作業の再開を扱う
   - `example13.ts`: `resumeThread()` で保存済み thread ID から会話を再開します。

## プログラム例

- `example01.ts`
  - 概要: Codex SDK の最小構成で、現在のリポジトリを read-only に調査します。
  - 学習のねらい: Responses API の単発応答や Agents SDK の `run()` と違い、Codex SDK では作業ディレクトリ、sandbox、approval policy を明示してコードベース文脈を読むエージェントを起動できることを確認します。
- `example02.ts`
  - 概要: 同じ Codex thread に、第3回の整理と第4回への対応付けを連続で依頼します。
  - 学習のねらい: `previous_response_id` を意識した第2回の会話履歴、Agents SDK の実行履歴と対応させながら、Codex thread が開発作業の文脈を保持する単位であることを確認します。
- `example03.ts`
  - 概要: `outputSchema` で、lecture3 の概念と Codex SDK の概念の対応表を JSON として受け取ります。
  - 学習のねらい: 第3回の Structured output と同様に、自然文ではなく後続処理しやすい型付きデータとして Codex のリポジトリ分析結果を扱えることを学びます。
- `example04.ts`
  - 概要: `runStreamed()` で、item の開始、更新、完了、turn 完了を逐次表示します。
  - 学習のねらい: 最終回答だけを待つのではなく、reasoning、コマンド実行、ファイル変更、エラーなどのイベントを UI やログに接続できることを確認します。
- `example05.ts`
  - 概要: read-only sandbox で第3回後半のサンプルをレビューし、修正は提案に限定します。
  - 学習のねらい: コードレビューや調査では read-only sandbox を使うと、モデルが変更したそうな場面でも作業権限を分離でき、`file_change` の有無で境界を観察できることを学びます。
- `example06.ts`
  - 概要: 一時ワークスペースに `survey.csv` を置き、Codex に分析スクリプト作成、実行、JSON 出力まで任せます。
  - 学習のねらい: 第3回の Hosted code interpreter と Structured output に対応させ、Codex ではファイルを作り、コマンドを実行し、その結果を `outputSchema` に沿って返せることを確認します。
- `example07.ts`
  - 概要: `webSearchMode: 'cached'` で、アンケート結果に基づく改善案を OpenAI 公式情報で補強します。
  - 学習のねらい: 第3回の web search と同様に、リポジトリ文脈やローカル分析結果だけでは足りない最新情報を検索で補えることを確認します。
- `example08.ts`
  - 概要: `workspace-write` の一時ワークスペースで `lecture_plan.md` を編集します。
  - 学習のねらい: read-only 調査から一歩進め、Codex SDK でファイル変更を許可したときに、変更後のファイル内容と `file_change` item を照合できることを学びます。
- `example09.ts`
  - 概要: 平均満足度計算のバグを修正し、`node survey.js` で検証します。
  - 学習のねらい: Codex SDK の本領である「コードを読む、直す、コマンドで確認する」ループを、小さな例で観察します。
- `example10.ts`
  - 概要: 実装担当 thread とレビュー担当 thread を分け、同じ一時ワークスペースを別権限で扱います。
  - 学習のねらい: Handoff のように役割を分ける考え方を Codex thread に移し、実装は `workspace-write`、レビューは `read-only` という境界を作れることを確認します。
- `example11.ts`
  - 概要: Agents SDK の受付エージェントが、Codex MCP Server の `codex` ツールへコードベース調査を委譲します。
  - 学習のねらい: 第3回の Handoff と MCP を発展させ、通常の会話エージェントから Codex のコードベース調査能力を専門ツールとして呼び出せることを学びます。
- `example12.ts`
  - 概要: 1つの Codex thread で、調査、計画、実装、検証を段階的に進めます。
  - 学習のねらい: 単発のツール呼び出しではなく、開発エージェントとして文脈を保持しながら作業を進める総合ワークフローを確認します。
- `example13.ts`
  - 概要: 1回目の Codex thread ID を保存し、`resumeThread()` で同じ会話を再開します。
  - 学習のねらい: Codex thread は `~/.codex/sessions` に保存されるため、長い調査や実装をアプリケーション側で中断・再開できることを確認します。

## 補足

- Codex SDK はローカルの `codex` CLI を起動し、JSONL イベントでやり取りします。
- `codex` CLI が使える状態で実行してください。API キーまたは Codex のログイン状態は、ローカル環境の設定に従います。
- `example06.ts`、`example08.ts`、`example09.ts`、`example10.ts`、`example12.ts`、`example13.ts` は一時ワークスペースを作成します。
- `workspace-write` の例は一時ディレクトリだけを書き換えるようにしています。現在のリポジトリ本体を書き換える例ではありません。
- `example07.ts` は `webSearchMode` を使うため、実行環境の Codex CLI で web search が利用できる必要があります。
- `example11.ts` は `codex mcp-server` を利用します。
