# k21_2026_lecture4

ワークショップのプログラム例です。`src/lecture1` の LLM / Responses API 入門、`src/k21_2026_lecture2` の会話履歴・instructions・推論設定、`src/k21_2026_lecture3` の Function Calling / Agents SDK / Hosted tools / Handoff / Guardrails / Tracing / MCP の流れを引き継ぎ、Codex SDK を扱います。

第4回の流れは、最初に「Agents SDK で作っていた単発実行や構造化出力の一部は Codex SDK でも表現できる」ことを確認します。ただし、Codex SDK は Agents SDK の完全上位互換ではありません。低レイテンシのアプリ内チャット、明示的な tool orchestration、handoff、guardrails、tracing を組み込むエージェントには Agents SDK が自然です。Codex SDK は、コードベースを読み、ファイルを編集し、コマンドで検証し、レビューし、作業を再開する開発ワークフローに進むほど価値が大きくなります。

## 問題構成

1. Agents SDK 的なプログラムを Codex SDK でも表現し、使い分けを確認する
   - `example01.ts`: lecture3 / lecture4 のREADMEを読んだうえで用途ごとの SDK 選定表を JSON で返し、Agents SDK が自然な領域と Codex SDK が自然な領域を確認します。
   - `example02.ts`: 非構造な開発相談と実在する壊れた教材ファイルを読み、後続の修正作業で使いやすい JSON に整理します。
   - `example03.ts`: 同じ thread に連続依頼し、追加制約を反映した計画更新を行います。
   - `example04.ts`: `runStreamed()` で、複数ファイルを読む調査の進行イベントと read-only の安全確認を観察します。
2. Agents SDK の tool / code interpreter 的な処理から、Codex SDK の workspace 作業へ進む
   - `example05.ts`: ファイル読み取り tool を自作せず、既存リポジトリの複数教材ファイルを根拠に回答します。
   - `example06.ts`: `workspace-write` で再利用可能な分析スクリプト、npm script、README 手順を追加し、コマンドで検証します。
3. Codex SDK でしか作りにくい開発ワークフローに進む
   - `example07.ts`: `workspace-write` で既存コードを編集し、`file_change` と検証コマンドを確認します。
   - `example08.ts`: 落ちているテストを実行し、バグ修正と再検証を1つの turn で行います。
   - `example09.ts`: read-only sandbox でコードレビューだけを許可し、変更がないことを確認します。
   - `example10.ts`: read-only で調査した thread を workspace-write で再開し、調査、計画、実装、検証を段階的に進めます。
   - `example11.ts`: 実装担当 thread とレビュー担当 thread を分け、レビュー結果を実装担当へ戻します。
   - `example12.ts`: `resumeThread()` で中断した開発作業を別プロセス想定で再開します。
   - `example13.ts`: `webSearchMode` で外部公式情報とローカルコードベース文脈を組み合わせ、例外だけでなく `error` item や `web_search` item 不在もフォールバック対象として扱います。
   - `example14.ts`: Agents SDK と Codex SDK に同じ単発依頼を投げ、モデル条件を表示したうえで usage の違いを比較します。

## プログラム例

- `example01.ts`
  - 概要: lecture3 / lecture4 のREADMEを読み、用途ごとの推奨 SDK と理由を JSON で返します。
  - 学習のねらい: Codex SDK でも単発 `run()` と構造化出力は使えますが、純粋なアプリ内対話は Agents SDK、コードベースを読む開発作業は Codex SDK が自然であることを、実際の教材ファイルを根拠に確認します。
- `example02.ts`
  - 概要: 自然文のバグ報告と、実在する `survey.csv` / `scripts/analyze-survey.js` / `scripts/analyze-survey.test.js` を読み、調査対象ファイル、根拠、疑わしい原因、検証コマンド、必要権限を JSON に整理します。
  - 学習のねらい: structured output を「JSONで返せる」だけで終わらせず、後続の修正作業、UI 表示、CI が参照しやすい情報として使います。出力されるファイル名やコマンドは推測ではなく、workspace に存在する教材ファイルに基づきます。
- `example03.ts`
  - 概要: 同じ Codex thread で、最初の計画に追加制約を与えて計画を更新します。
  - 学習のねらい: Agents SDK の会話履歴やセッション管理に相当する文脈保持を、Codex thread が担えることを確認します。ただし、アプリ内エージェント制御は Agents SDK が自然である点も残します。
- `example04.ts`
  - 概要: `runStreamed()` のイベントを表示し、複数ファイルを読む調査の進行と、read-only でファイル変更が起きていないことを観察します。
  - 学習のねらい: chat の文字列 streaming だけでなく、開発エージェントの作業進行を UI やログに流せることを確認します。streaming の場合も、完了した item を見て安全確認できることを示します。
- `example05.ts`
  - 概要: lecture3 の Hosted code interpreter 例と lecture4 の Codex SDK 例を読み、一時分析とリポジトリに残る作業の違いを根拠ファイル名付きで整理します。
  - 学習のねらい: Agents SDK なら file search / read file tool を自作したくなる処理を、Codex SDK では workspace の読み取り能力として扱えることを学びます。
- `example06.ts`
  - 概要: `survey.csv` を分析する再利用可能な `scripts/analyze-survey.js`、npm script、README 手順を作成し、`node scripts/analyze-survey.js` で検証します。
  - 学習のねらい: Hosted code interpreter 的な一時分析ではなく、リポジトリに残せるスクリプトと実行手順を作るところに Codex SDK の価値があることを確認します。
- `example07.ts`
  - 概要: `lessonCatalog.js` に入力検証を追加し、正常系と異常系の実行確認、`git diff` を行います。
  - 学習のねらい: read-only の問い合わせから、権限付きの実装作業へ進んだときに何が起きるかを `file_change` とコマンド実行で確認します。
- `example08.ts`
  - 概要: 壊れた `discount.js` を、`node --test discount.test.js` の失敗を見ながら修正します。
  - 学習のねらい: コードを読み、直し、コマンドで確認する Codex SDK の中核ループを体験します。テストコマンドが修正前後に実行され、最後に成功したことも host 側で確認します。
- `example09.ts`
  - 概要: 小さなプロジェクトを read-only でレビューし、修正提案だけを受け取ります。
  - 学習のねらい: レビューでは書き込み権限を渡さないという、アプリケーション側の安全境界を作れることを確認します。
- `example10.ts`
  - 概要: 1つの thread を read-only で開始して調査だけを行い、同じ thread ID を `workspace-write` で再開して実装と検証を進めます。
  - 学習のねらい: 独立した単発依頼ではなく、開発文脈を持ち続けるエージェントとして Codex を使います。調査 turn では sandbox と `assertNoFileChanges()` で「変更していない」ことを確認し、実装 turn では `assertNoCommandExecutions()` で「検証は次の turn」と分けたことを確認します。
- `example11.ts`
  - 概要: 実装担当 thread がコードを書き、レビュー担当 thread が read-only で検査し、指摘を実装担当へ戻して再修正します。
  - 学習のねらい: Agents SDK の Handoff とは別に、Codex SDK の複数 thread と sandbox 権限で役割分担できることを学びます。これはOSレベルの完全隔離ではなく、ホストアプリが各 turn に渡す役割と権限を分ける設計例です。
- `example12.ts`
  - 概要: 1回目の実行は read-only で計画と thread ID だけを出力し、2回目の実行で `--thread` と `--workspace` を渡して固定の一時ワークスペースで実装と検証を再開します。
  - 学習のねらい: 長い開発作業や人間の確認を挟む作業を、プロセスをまたいで再開できることを確認します。
- `example13.ts`
  - 概要: ローカルの Codex SDK 使用コードを読み、web search で公式情報を確認して改善案を出します。web search が使えない環境や、`web_search` item を確認できない環境では、web search の成否を断定せずローカル文脈のみの調査にフォールバックします。
  - 学習のねらい: 外部情報検索だけでなく、ローカルコードベース文脈と組み合わせるところに Codex SDK の価値があることを確認します。
- `example14.ts`
  - 概要: 架空のインシデント引き継ぎメモを同じ入力として Agents SDK と Codex SDK の両方に渡し、モデル条件、回答、usage を比較します。
  - 学習のねらい: 同じ単発依頼でも、SDK が組み立てる実行文脈やループが異なるため、トークン使用量や item の見え方が一致しないことを確認します。既定では Agents SDK に `gpt-5.4-nano`、Codex SDK に Codex CLI の既定モデルを使い、`SDK_COMPARE_MODEL` などで条件を揃えた場合も usage 項目の定義差があるため、厳密な項目比較ではないことを出力します。

## 補足

- Codex SDK の本質的な呼び出しである `new Codex()`、`startThread()`、`resumeThread()`、`run()`、`runStreamed()` は各 `exampleXX.ts` に直接書いています。`helpers.ts` は表示、JSON parse、item 集計、一時ワークスペース用の環境変数準備など、講義の本筋ではない処理だけをまとめています。
- Codex SDK はローカルの `codex` CLI を起動し、JSONL イベントでやり取りします。
- `codex` CLI が使える状態で実行してください。API キーまたは Codex のログイン状態は、ローカル環境の設定に従います。
- 各 example はリポジトリルートから `bun src/k21_2026_lecture4/exampleXX.ts` の形で実行してください。`example01.ts`、`example04.ts`、`example05.ts`、`example13.ts` は `process.cwd()` を作業ディレクトリとして使います。
- すべての書き込み例は一時ワークスペースを使い、現在のリポジトリ本体を書き換えません。
- `workspace-write` の例では、必要に応じて `skipGitRepoCheck: true` を使います。
- `example06` 以降は `workspace-write` を使う例が含まれます。講義では、どの時点で read-only から書き込み権限へ切り替えるかを明示してください。
- コマンド実行例では、node を mise などで管理している環境でも教材プロンプトに環境固有の変数を混ぜないため、Codex CLI 側の `MISE_CACHE_DIR` を一時ワークスペースの `.mise-cache` に設定し、`.git/info/exclude` で git の表示から除外しています。
- `example12.ts` は初回実行だけでは計画で止まります。表示された再開コマンドを実行すると、同じ thread と初回実行時に作成した一時ワークスペースを使って実装と検証を続けます。
- `example13.ts` は `webSearchMode: 'live'` を使うため、実行環境の Codex CLI で web search が利用できる必要があります。`run()` の例外、`error` item、`web_search` item 不在のいずれかを検出した場合は、web search が失敗したとは断定せず、ローカルコード文脈だけで補足点を出すフォールバックを実行します。
- `example14.ts` は既定で Agents SDK に `gpt-5.4-nano`、Codex SDK に Codex CLI の既定モデルを使います。両方に同じモデル名を明示したい場合は `SDK_COMPARE_MODEL`、片方だけ条件を変えたい場合は `AGENTS_COMPARE_MODEL` または `CODEX_COMPARE_MODEL` で上書きできますが、モデルや usage 項目の定義が違う場合は厳密な usage 比較ではありません。
