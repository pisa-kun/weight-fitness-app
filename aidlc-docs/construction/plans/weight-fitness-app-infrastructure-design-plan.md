# Infrastructure Design Plan - weight-fitness-app

**回答方式**: ユーザー委任（2026-10-04）。デプロイはユーザーが別PCのAWS認証情報で実施するため、本PCではIaC実装と`cdk synth`までに留める。

## 計画

- [x] Functional Design・NFR Designの分析
- [x] デプロイ環境・計算・ストレージ・メッセージング・ネットワーク・監視・共有基盤の質問整理
- [x] 回答の確定（委任）
- [x] `infrastructure-design.md` 作成
- [x] `deployment-architecture.md` 作成（費用見積もり・デプロイ前承認事項を含む）

## Question 1（デプロイ環境）
環境構成とデプロイ方法はどうしますか。

A) `ap-northeast-1`に単一環境（本番のみ）。AWS CDKで定義し、ユーザーが別PCから`cdk bootstrap`/`cdk deploy`を実行する

B) dev/prodの2環境

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: NFR-07とユーザー指示に一致）

## Question 2（計算基盤）
APIの実行基盤は何にしますか。

A) AWS Lambda（Node.js 22、arm64、512 MB、タイムアウト15秒）+ Function URL（IAM認証、CloudFront OAC）

B) API Gateway HTTP API + Lambda

C) App Runner / ECS Fargate

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 常時費用ゼロ、API Gateway分の構成要素も不要）

## Question 3（ストレージ）
データ保存はどうしますか。

A) データ用S3バケット1つ（非公開、SSE-S3、バージョニング有効、非現行バージョンは30日で削除、`RemovalPolicy.RETAIN`）。Web資産用S3バケットを別に1つ（非公開、再作成可能）

B) データと資産を同一バケット

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 健康データをスタック削除で失わないよう保持し、資産とは権限を分ける）

## Question 4（メッセージング）
非同期処理・キューは必要ですか。

A) 不要

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: NFR Design Q6）

## Question 5（ネットワーク）
入口とルーティングはどうしますか。

A) CloudFront単一ディストリビューション（既定ドメイン`*.cloudfront.net`）。`/api/*`はLambda URLへ（キャッシュ無効、全メソッド許可）、その他はWeb資産バケットへ。SPAの404/403は`index.html`へフォールバックしない（ルーティングは単一ページのため不要）。VPCは使わない

B) 独自ドメイン + ACM

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: NFR-07で独自ドメイン不要）

## Question 6（監視）
監視・ログはどうしますか。

A) Lambdaのロググループを保持30日で作成。CloudFrontアクセスログ・アラームは設けない

B) CloudFrontログとアラームも設ける

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: NFR-U-11）

## Question 7（共有基盤）
他システムと共有する基盤はありますか。

A) なし。単一スタック`WeightFitnessAppStack`で完結する

X) Other (please describe after [Answer]: tag below)

[Answer]: A（AI判断（ユーザー委任）: 単一Unit）
