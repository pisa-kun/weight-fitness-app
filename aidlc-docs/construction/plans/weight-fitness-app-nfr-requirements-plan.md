# NFR Requirements Plan - weight-fitness-app

**Unit**: UOW-01 `weight-fitness-app`  
**回答方式**: 2026-10-04のユーザー指示（AI-DLCの続行とアプリ実装完了まで進めること）による委任。各回答は「AI判断（ユーザー委任）」として根拠を記す。変更希望があれば回答を書き換えて再実行を依頼できる。

## 計画

- [x] Functional Design成果物の分析
- [x] 規模・性能・可用性・セキュリティ・技術選定・信頼性・保守性・使い勝手の質問整理
- [x] 回答の確定（委任）と曖昧さの確認
- [x] `nfr-requirements.md` 作成
- [x] `tech-stack-decisions.md` 作成（PBT-09を含む）

## Question 1（規模）
想定する同時利用者数・データ量はどの程度ですか。

A) 1名中心、同時アクセスは最大2〜3端末、月JSONは数十KB、画像は月最大62枚

B) 家族など数名が日常的に同時編集する

C) 不特定多数

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 要件の「主利用者1名・主に1台、複数端末同期」に一致）

## Question 2（性能）
画面応答の目標はどの程度ですか。

A) 月表示・保存とも通常2秒以内（コールドスタート時は3秒程度まで許容）

B) 常に200ms以内

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 個人利用で低コスト優先のため、常時稼働を前提としない）

## Question 3（可用性）
可用性・障害時の期待はどの程度ですか。

A) マネージドサービス標準の可用性で十分。冗長構成やSLAは設けない。データはS3の耐久性に依存する

B) マルチリージョン冗長

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: Resiliency Baseline無効、低コスト優先）

## Question 4（セキュリティ）
未認証URLアクセスを前提に、最低限どの保護を入れますか。

A) HTTPS強制、S3非公開（Block Public Access + OAC）、S3サーバー側暗号化、入力検証、内部エラー詳細の非開示、検索エンジン非インデックス（noindex / robots.txt）

B) Aに加えてログイン認証を追加

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: FR-09でログインなしが確定済み。Security Baselineは無効だがNFR-02の制約を満たす最小限を適用）

## Question 5（技術スタック・言語）
実装言語とフレームワークは何を使いますか。

A) TypeScriptで統一。フロントエンドはReact + Vite、バックエンドはAWS Lambda（Node.js 22）、IaCはAWS CDK（TypeScript）

B) Python（FastAPI）+ 別言語フロントエンド

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 1言語で型を共有でき、Lambdaの従量課金で低コスト）

## Question 6（PBTフレームワーク / PBT-09）
プロパティベーステストの基盤は何を使いますか。

A) Vitest + fast-check

B) Jest + fast-check

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: Viteと設定を共有でき、fast-checkはshrinking・seed再現・カスタム生成器に対応）

## Question 7（画像サイズとLambdaの制約）
Lambdaの同期呼び出しはリクエスト/レスポンス約6 MBが上限で、10 MBの画像をバックエンド経由でそのまま送れません。どう扱いますか。

A) 利用者は10 MBまでの画像を選択できる。ブラウザーで長辺を縮小しJPEGへ再圧縮して転送上限（3.5 MB）以下にしてからバックエンド経由で保存する。S3直接アップロードは行わない

B) 署名付きURLでブラウザーからS3へ直接アップロードする（Application Design Q3-Aと矛盾）

C) 常時稼働のコンテナ（App Runner/ECS）を使い10 MBをそのまま受ける（月額費用が増加）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: Q3-A「全転送をバックエンド経由」と低コストを両立。原画像は保存しない点を利用者へ明示する）

## Question 8（監視・ログ）
監視・アラートはどうしますか。

A) CloudWatch Logs（保持30日）のみ。アラートは設けない。ログに体重値・画像本体を出さない

B) CloudWatch Alarms + SNS通知も設ける

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 個人利用・低コスト）

## Question 9（保守性・テスト）
品質基準はどうしますか。

A) TypeScript strict、ESLintは導入せず`tsc --noEmit`で型検査、Vitestで例ベース+PBT、CIはGitHub Actionsでテストとビルドを実行（PBTは固定seedをログ出力）

B) カバレッジ閾値を必須にする

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 1名開発に釣り合う最小構成。PBT-08のCI要件を満たす）

## Question 10（使い勝手・アクセシビリティ）
UIの基準はどうしますか。

A) スマートフォン縦画面優先、タップ領域44px以上、フォームにlabel、モーダルはdialog要素とEscで閉じる、色だけに頼らずテキスト/記号でも状態を示す

B) デスクトップ優先

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: NFR-01・NFR-04と整合）

## 曖昧さの確認

委任回答はいずれも単一の選択肢で、追加の明確化は不要と判断した。Q7は承認済みFR-06（10 MBまで受付）とLambda制約の調整であり、利用者に見える影響（保存画像は再圧縮版）を完了報告で明示する。
