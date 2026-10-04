# Code Generation Plan - weight-fitness-app

**Unit**: UOW-01 `weight-fitness-app`（Greenfield / 単一Unit）  
**ワークスペースルート**: `c:\Users\4101480\develop\weight-fitness-app`  
**承認**: ユーザー委任（2026-10-04）  
**本計画がCode Generationの唯一の手順書である。** アプリケーションコードはワークスペースルート配下、文書は`aidlc-docs/`のみ。

## Unit Context

- **ストーリー**: US-01〜US-11（全件）
- **依存Unit**: なし
- **所有データ**: `config/mission-configuration.json`、`months/{YYYY-MM}.json`、`images/{date}/{imageId}`（S3）
- **レイヤー依存**: presentation → api（HTTP） → application → domain / repository interface → infrastructure
- **PBT対象（PBT-01の性質一覧を参照）**: Month Document・Mission ConfigurationのJSON往復（PBT-02）、体重・件数・画像枚数・完了判定・過去snapshot保持の不変条件（PBT-03）、ドメイン生成器（PBT-07）、seed記録（PBT-08）

## API契約（HTTP）

| メソッド | パス | 本文 | 応答 |
|---|---|---|---|
| GET | `/api/months/{YYYY-MM}` | - | MonthView |
| PUT | `/api/days/{YYYY-MM-DD}` | `{weightKg?, missionCompletions?, expectedVersion}` | MonthView |
| PUT | `/api/months/{YYYY-MM}/goal` | `{goal, expectedVersion}` | MonthView |
| GET | `/api/missions` | - | MissionConfigView または null |
| PUT | `/api/missions` | `{definitions, expectedVersion}` | MissionConfigView |
| POST | `/api/days/{date}/images` | 画像バイト列（`x-expected-version`ヘッダー） | MonthView |
| GET | `/api/images/{date}/{imageId}` | - | 画像バイト列 |
| DELETE | `/api/days/{date}/images/{imageId}` | -（`x-expected-version`ヘッダー） | MonthView |

エラーは`{error: {code, message, details?}, latest?}`。409時は`latest`に最新状態を含める。

## Steps

- [x] Step 1: プロジェクト構成（`package.json`、`tsconfig.json`、`vite.config.ts`、`vitest.config.ts`、`scripts/build-api.mjs`、`config/`）
- [x] Step 2: Domain層（`src/domain/`: dates, result, weight, missions, month-document, day-logic, images）— US-01〜04, US-06, US-07, US-10
- [x] Step 3: Domain層テスト（例ベース `tests/domain/`、PBT `tests/pbt/`、共有生成器 `tests/pbt/generators.ts`）
- [x] Step 4: Repository層（`src/infrastructure/`: object-store, memory-object-store, s3-object-store, repositories〔Monthly JSON / Mission Configuration / Image Object Store〕）— US-08, US-10
- [x] Step 5: Repository層テスト（`tests/infrastructure/`: 条件付き書込・Conflict変換）
- [x] Step 6: Application層（`src/application/`: views, calendar-query, daily-record, mission, monthly-goal, food-image, services）— US-01〜08
- [x] Step 7: Application層テスト（`tests/application/`: 競合拒否、画像追加の補償、部分削除と再試行、setup前N/A）
- [x] Step 8: API層（`src/api/`: http, error-mapping, router, lambda, dev-server）と共有契約（`src/shared/api-contract.ts`）— US-08, US-09
- [x] Step 9: API層テスト（`tests/api/router.test.ts`）
- [x] Step 10: Frontend（`src/presentation/`: index.html, main, App, api-client, image-prep, components, styles.css, public/manifest・sw・robots・icons）— US-01〜US-11
- [x] Step 11: Frontendテスト（`tests/presentation/`: パレット検査、コンポーネント）— US-11
- [x] Step 12: Infrastructure as Code（`infra/`: CDKスタック、テスト）— デプロイは行わない
- [x] Step 13: CI（`.github/workflows/ci.yml`）とREADME
- [x] Step 14: コード要約文書（`aidlc-docs/construction/weight-fitness-app/code/code-summary.md`）

## ストーリー対応

| ストーリー | 主な実装 |
|---|---|
| US-01 体重 | domain/weight, DailyRecordService, WeightEntryForm |
| US-02/03 ミッション達成 | domain/day-logic, DailyRecordService, MissionChecklist |
| US-04 ミッション管理 | domain/missions, MissionService, MissionEditor, MissionSetupGate |
| US-05 月間目標 | MonthlyGoalService, MonthlyGoalEditor |
| US-06 カレンダー | domain/dates, CalendarQueryService, CalendarPage, CalendarDayCell, DayDetailModal |
| US-07 画像 | domain/images, FoodImageService, image-prep, FoodImageGallery |
| US-08 同期 | 条件付き書込、ConflictNotice、OperationFeedback |
| US-09 URLアクセス | 認証なしAPI、フッター注意表示、noindex |
| US-10 S3 JSON | month-repository, mission-configuration-repository, s3-object-store |
| US-11 配色 | styles.css、パレット検査テスト |
