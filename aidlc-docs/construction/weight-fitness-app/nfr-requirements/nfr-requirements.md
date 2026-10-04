# NFR Requirements - weight-fitness-app

**状態**: 承認済み（ユーザー委任）  
**根拠**: `aidlc-docs/construction/plans/weight-fitness-app-nfr-requirements-plan.md`

| ID | 区分 | 要件 |
|---|---|---|
| NFR-U-01 | 規模 | 利用者1名中心、同時2〜3端末。月JSONは数十KB、画像は1日2枚・月最大62枚。オートスケール設計は不要 |
| NFR-U-02 | 性能 | 月表示・保存は通常2秒以内。Lambdaコールドスタート時は3秒程度まで許容 |
| NFR-U-03 | 可用性 | マネージドサービス標準の可用性。冗長化・SLAなし。データ耐久性はS3に依存し、S3バージョニングを有効化して誤上書きから復旧可能にする |
| NFR-U-04 | 通信 | CloudFront経由のHTTPSのみ。HTTPはHTTPSへリダイレクト |
| NFR-U-05 | データ保護 | S3はBlock Public Access全有効、SSE-S3暗号化、OAC経由のみ。Lambda Function URLもOAC（IAM認証）でCloudFrontからのみ呼び出し可能 |
| NFR-U-06 | 未認証アクセスの明示 | ログインなし（FR-09）。画面フッターに「URLを知る人は閲覧・編集できる」旨を常時表示し、`noindex`と`robots.txt`で検索エンジン登録を抑止する |
| NFR-U-07 | 入力検証 | 全入力をサーバー側で再検証する。日付・月はパターン検証、文字列長に上限を設ける（ミッション名50字、目標値50字、月間目標200字） |
| NFR-U-08 | 画像転送 | 利用者は10 MB以下のJPEG/PNG/WebPを選択できる。ブラウザーで長辺最大2048pxに縮小しJPEG再圧縮して3.5 MB以下にしてから送る。サーバーはマジックバイトで形式を検証し、3.5 MB超を`PayloadTooLarge`で拒否する |
| NFR-U-09 | 整合性 | 月JSONとMission ConfigurationはS3条件付き書込（If-Match / If-None-Match）で楽観ロックする。古いversionは409 Conflictと最新状態を返す |
| NFR-U-10 | エラー秘匿 | S3のキー・SDK例外・スタックトレースを応答に含めない。型付きエラーコードと日本語メッセージのみ返す |
| NFR-U-11 | ログ | CloudWatch Logs保持30日。体重値・画像本体・月間目標本文をログに出さない |
| NFR-U-12 | 保守性 | TypeScript strict。`tsc --noEmit`で型検査、Vitestで例ベース+PBT。GitHub Actionsでテスト・ビルド |
| NFR-U-13 | 使い勝手 | スマホ縦画面優先、タップ領域44px以上、ラベル付きフォーム、`dialog`要素のモーダル、色以外の記号・文言でも状態を示す |
| NFR-U-14 | 配色 | NFR-04の14色のみ。CSS中の色指定を自動テストで検査する |
| NFR-U-15 | PWA | Web App Manifestとサービスワーカーを提供しホーム画面追加に対応。オフライン動作は要件外のためAPIはキャッシュしない |
| NFR-U-16 | 費用 | 常時稼働リソースなし。従量課金のみで、個人利用では月数十円〜数百円程度を想定（詳細はInfrastructure Design） |

## 要件との差分・留意点

- **NFR-U-08**: FR-06の「1枚10 MBまで」は利用者が選択できるファイルの上限として満たす。保存されるのは縮小・再圧縮後の画像（JPEG）であり、原画像はS3へ保存しない。
- **NFR-U-05**: Security Baselineは無効だが、NFR-02のHTTPS・S3非公開を満たすための最小設定である。
