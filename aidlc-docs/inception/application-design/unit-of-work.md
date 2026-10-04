# Unit of Work

**状態**: 承認済み  
**Unit ID**: UOW-01  
**Unit名**: `weight-fitness-app`  
**Unit数**: 1  
**デプロイ単位**: 単一アプリ／単一リリース

## 目的

体重・運動・ミッション・月間目標・料理画像をカレンダーで管理するアプリ全体を、一人の開発者が順番に実装・検証する単一の開発Unitとする。Unit内はレイヤーで整理し、責務間の依存はApplication Designで定めた方向に限定する。

## 責務

- レスポンシブWeb UIとPWA資産
- HTTP Application API
- 日次記録、ミッション、月間目標、カレンダー、料理画像の機能サービス
- 月単位JSONを用いたアプリデータの通常永続化
- 全月共有Mission Configuration JSONの通常永続化とversion競合制御
- 非公開S3上のJSON・画像へのバックエンド経由アクセス
- 日付単位の料理画像個別削除と月JSON参照の整合
- 型付きエラーの伝達と利用者向けエラー変換
- Unit内の自動テスト

## 含まれるストーリー

US-01〜US-11の全ストーリーを本Unitが実装する。対応表は`unit-of-work-story-map.md`を参照。

## Unit境界と依存

- Unit間の依存はない。Q2のUnit間依存は、Q6-Cにより単一UnitのためN/Aとする。
- 内部の実装依存はPresentation → API → Application → Domain/Repository Interface → S3 Adapterの一方向とする。
- JSONと画像はブラウザーから直接S3へ送受信せず、バックエンドを経由する。
- MissionServiceはMissionConfigurationRepositoryとMonthlyJsonRepositoryを使い分け、共有定義と日別スナップショットを別JSONとして扱う。
- S3バケットは非公開。認証なしのアプリURLアクセスは全利用者が同じデータ領域を共有する。
- AWSサービス、フレームワーク、同期の条件付き書込方式は後続NFR／Infrastructure設計で決める。

## Greenfieldコード配置方針

コード生成ルールに従い、アプリケーションコードはワークスペースルート以下へ置く。単一Unitの基本配置を採用し、同一コードベース内をレイヤーで整理する。

```text
src/
  presentation/
  api/
  application/
  domain/
  infrastructure/
tests/
config/
```

- `src/presentation/`: Web UIとPWA
- `src/api/`: HTTP API境界
- `src/application/`: 機能別ユースケースサービス
- `src/domain/`: 日付記録、ミッション、画像参照、Result/Errorなどの共有モデル
- `src/infrastructure/`: 月次JSONリポジトリ、MissionConfigurationRepository、画像オブジェクトストア、非公開S3アダプター
- `tests/`: レイヤー内の例ベーステストと、選択済み範囲のプロパティベーステスト
- `config/`: 環境別設定テンプレート。秘密値は含めず、環境変数等で注入する。

具体的な言語・フレームワーク、ビルド設定はNFR Requirementsで決定する。ドキュメントは`aidlc-docs/`に置き、アプリケーションコードを同ディレクトリへ置かない。

## 開発順序

1. 共有ドメイン型、API契約、月次JSON契約を確定する。
2. 非公開S3のJSON・画像アクセスアダプターと型付きエラー境界を実装する。
3. Application APIとユースケースサービスを接続する。
4. 日次記録、ミッション、目標、カレンダー、画像の画面機能を実装する。
5. Unit全体を統合し、受け入れ条件とテストを検証する。

この順序はレイヤー依存の初期案であり、詳細な実装手順はFunctional DesignとCode Generation Planで定める。

## Unitとして未決定の事項

バックアップ・復元・全データ削除の要否、AWSアカウント・リージョン・サービス・料金は本Unit分割では確定しない。設計・デプロイの承認ゲートに従う。
