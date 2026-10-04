# NFR Design Plan - weight-fitness-app

**回答方式**: ユーザー委任（2026-10-04）。各回答は「AI判断（ユーザー委任）」。

## 計画

- [x] NFR Requirementsの分析
- [x] 耐障害・スケーラビリティ・性能・セキュリティ・論理コンポーネントの質問整理
- [x] 回答の確定（委任）
- [x] `nfr-design-patterns.md` 作成
- [x] `logical-components.md` 作成

## Question 1（耐障害・再試行）
S3書込失敗や競合時の再試行はどうしますか。

A) サーバー側の自動再試行はAWS SDK標準（一時エラーのみ）に任せる。409 Conflictはサーバーで自動再試行せず、画面で「最新を読み込む」「草稿を再適用して保存」を利用者が選ぶ

B) サーバーで競合時に自動マージする

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: BR-15/BR-16の後着自動上書き禁止に一致）

## Question 2（画像と月JSONの部分失敗）
画像追加・削除の2段階更新が途中で失敗した場合の補償はどうしますか。

A) 追加: 画像オブジェクト保存→月JSON条件付き更新。JSON更新失敗時は保存済みオブジェクトを削除して失敗を返す。削除: 月JSONから参照を除去→オブジェクト削除。オブジェクト削除失敗時は`PartialDeletionFailure`を返し、再試行時は参照がなくても決定的キーのオブジェクト削除を冪等に再実行する

B) 補償を行わない

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: BR-14の「成功通知時点で整合」を満たす）

## Question 3（スケーラビリティ）
スケール方式はどうしますか。

A) Lambdaの自動スケールに任せ、予約同時実行数は設定しない（個人利用で十分小さい）。暴走防止としてアカウント既定の上限に依存する

B) 予約同時実行数を設定する

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 新規アカウントでは予約同時実行の設定自体が制限される場合があるため）

## Question 4（性能）
性能上の工夫はどうしますか。

A) 静的資産はCloudFrontでキャッシュ（ハッシュ付きファイルは長期、`index.html`はno-cache）。APIはキャッシュ無効。画像は`Cache-Control: private, max-age=86400`で返す（imageIdは不変）。Lambdaメモリ512 MB

B) APIもCloudFrontでキャッシュする

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 同期の即時性を優先しAPIはキャッシュしない）

## Question 5（セキュリティパターン）
未認証前提での防御はどうしますか。

A) CloudFront OAC（S3・Lambda URL）、セキュリティヘッダー（HSTS、CSP、X-Content-Type-Options、Referrer-Policy、X-Frame-Options）、サーバー側検証、画像はマジックバイト検証、エラー秘匿

B) Aに加えWAF（月額費用増）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: WAFは月額固定費がかかるため見送り。必要なら後から追加可能）

## Question 6（論理コンポーネント）
キュー・キャッシュ・サーキットブレーカー等は必要ですか。

A) 不要。同期処理のみで、キュー・キャッシュ層・サーキットブレーカーは導入しない

B) 画像処理を非同期キューに分離する

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 規模に対し過剰）
