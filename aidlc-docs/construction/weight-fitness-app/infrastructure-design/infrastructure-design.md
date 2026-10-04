# Infrastructure Design - weight-fitness-app

**状態**: 承認済み（ユーザー委任）。**未デプロイ**  
**リージョン**: `ap-northeast-1`  
**IaC**: AWS CDK v2（`infra/`）

## 論理コンポーネントとAWSサービスの対応

| 論理コンポーネント | AWSリソース | 主な設定 |
|---|---|---|
| Edge / CDN | CloudFront Distribution | HTTPS リダイレクト、HTTP/2・3、PriceClass 200（日本を含む）、Response Headers Policy（HSTS/CSP等） |
| Static Web Host | S3 `WebAssetsBucket` | Block Public Access、SSE-S3、OAC、`BucketDeployment`で`dist/web`を配置、スタック削除時に削除 |
| API Function | Lambda `ApiFunction` | Node.js 22 / arm64 / 512 MB / 15秒、`dist/api`、環境変数`DATA_BUCKET_NAME` |
| API入口 | Lambda Function URL | `AuthType: AWS_IAM`、CloudFront OAC経由のみ呼出可 |
| Data Bucket | S3 `DataBucket` | Block Public Access、SSE-S3、`enforceSSL`、バージョニング、非現行版30日削除、`RETAIN` |
| Log Store | CloudWatch Logs | `/aws/lambda/...` 保持30日 |

## CloudFrontビヘイビア

| パス | オリジン | キャッシュ | メソッド |
|---|---|---|---|
| `/api/*` | Lambda Function URL（OAC） | `CACHING_DISABLED` | ALL |
| 既定 | WebAssetsBucket（OAC） | `CACHING_OPTIMIZED` | GET/HEAD |

- `/api/*`のOrigin Request Policyは`ALL_VIEWER_EXCEPT_HOST_HEADER`。
- OAC経由でLambda URLへPOST/PUTする場合、ブラウザーは`x-amz-content-sha256`（本文のSHA-256）を送る。APIクライアントで自動付与する。
- `index.html`・`sw.js`・`manifest.webmanifest`はBucketDeployment時に`Cache-Control: no-cache`を付与する。

## IAM

- Lambda実行ロール: `DataBucket`に対する`s3:GetObject`、`s3:PutObject`、`s3:DeleteObject`、`s3:ListBucket`のみ（`grantReadWrite`相当+Delete）。
- CloudFront: OACによりWebAssetsBucketの`s3:GetObject`、Lambda URLの`lambda:InvokeFunctionUrl`のみ。

## 未認証アクセスに関する明示（US-09 / NFR-02）

CloudFrontのURLを知る人は、ログインなしで体重・ミッション・画像を閲覧・更新できる。デプロイ前にこのリスクを再確認すること（`deployment-architecture.md`のチェックリスト）。
