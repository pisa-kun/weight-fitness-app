# Application Design 概要

**状態**: ユーザーレビュー待ち  
**設計レベル**: 高レベル責務・インターフェース。詳細業務ルール、技術スタック、AWS構成は後続設計で決定する。

## 設計方針

- UI、アプリケーションサービス、S3データアクセスを責務別モジュールに分けた、単一アプリ／リリース単位とする。主な配置判断は低運用費用を優先する（Application Design Q1-X、Q6-A）。
- 体重、ミッション、月間目標等の通常画面データは月単位JSONとしてS3へ保存する。月単位の分割を採用する（FR-08、Application Design Q2-B）。
- S3バケットは非公開とし、JSONと画像の全読み書きをバックエンド経由にする（FR-08、Application Design Q3-A）。
- 記録、ミッション、月間目標、カレンダー照会、料理画像に機能別ユースケースサービスを設ける（Application Design Q4-A）。
- コンポーネント境界では成功値または型付きエラーを使い、サービス層・API層が利用者向けエラーへ変換する（Application Design Q5-A）。
- AWSサービス、言語、フレームワーク、実行方式、料金の選定はこの設計では固定せず、NFR Requirements／Infrastructure Designで比較する。

## コンポーネント概要

1. **Web UI**: カレンダー、日次入力、ミッション、月間目標、画像表示を提供する。
2. **Application API**: UI要求を受け取り、サービス呼び出しと安全な応答を行う。
3. **Feature Services**: 機能別ユースケースと整合性確認を調整する。
4. **Monthly JSON Store**: 月単位JSONの読書きと更新バージョンを扱う。
5. **Image Object Store**: 料理画像の保存・取得を扱う。
6. **Private S3 Access**: 非公開S3とのバックエンド内アクセスを提供する。
7. **Result and Error Mapping**: 型付きエラーを一貫した画面応答へ変換する。

## サービスと主要な依存

- DailyRecordService、MissionService、MonthlyGoalService、CalendarQueryService、FoodImageServiceを機能別に分ける。
- Feature ServicesはMonthlyJsonRepositoryまたはImageObjectStoreを介して永続化する。
- JSON・画像の両ストアはPrivateS3ObjectAdapterを共有し、S3 SDKやAWS詳細を機能サービスから隠す。
- 同時更新は月JSONの期待バージョンを使う抽象契約で競合を通知する。具体的な競合解決と再試行は後続のFunctional/NFR設計で決める。

## 意図的に未決定の事項

- 技術スタック、AWSサービス、実行形態、デプロイ構成、料金見積もり。
- 月JSON内の完全なスキーマ、月境界・タイムゾーン、初期ミッション。
- バックアップ、復元、全データ削除の要否と方式。JSONの通常保存とは別に設計で確認する。
- 画像とJSON参照の部分成功時の補償、画像形式・サイズ上限。
- URLを知る人がログインなしで健康情報にアクセスできるリスクへの最終確認。S3は非公開のままとし、公開前にはアカウント・アクセス方式・費用の承認が必要。

## 成果物

- コンポーネントと責務: `components.md`
- 高レベルメソッド: `component-methods.md`
- ユースケースサービス: `services.md`
- 依存関係とデータフロー: `component-dependency.md`
