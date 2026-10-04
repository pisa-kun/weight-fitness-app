# 環境設定

秘密値はこのディレクトリに置かない。実行時設定は環境変数で注入する。

| 変数 | 用途 | 既定 |
|---|---|---|
| `DATA_BUCKET_NAME` | Lambdaが読み書きする非公開S3バケット名（CDKが設定） | なし（必須） |
| `AWS_REGION` | Lambdaランタイムが自動設定 | - |
| `DEV_API_PORT` | ローカルdev-serverのポート | `8787` |
| `PBT_SEED` | プロパティベーステストのseed固定 | 未指定時はランダム（実行ごとに出力） |

テンプレートは `config/env.example` を参照。
