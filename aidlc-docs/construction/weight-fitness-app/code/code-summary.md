# Code Summary - weight-fitness-app

**状態**: 生成完了（ユーザー委任により承認）。**AWSへは未デプロイ**

## 生成ファイル

| 層 | ファイル |
|---|---|
| 構成 | `package.json`、`tsconfig.json`、`vite.config.ts`、`vitest.config.ts`、`scripts/build-api.mjs`、`scripts/generate-icons.mjs`、`config/` |
| Domain | `src/domain/dates.ts`、`result.ts`、`weight.ts`、`missions.ts`、`month-document.ts`、`day-logic.ts`、`images.ts` |
| Infrastructure | `src/infrastructure/object-store.ts`、`memory-object-store.ts`、`s3-object-store.ts`、`repositories.ts`（MonthlyJsonRepository / MissionConfigurationRepository / ImageObjectStore） |
| Application | `src/application/context.ts`、`views.ts`、`calendar-query-service.ts`、`daily-record-service.ts`、`mission-service.ts`、`monthly-goal-service.ts`、`food-image-service.ts`、`services.ts` |
| API | `src/shared/api-contract.ts`、`src/api/http.ts`、`error-mapping.ts`、`router.ts`、`lambda.ts`、`dev-server.ts` |
| Frontend | `src/presentation/index.html`、`main.tsx`、`App.tsx`、`api-client.ts`、`image-prep.ts`、`styles.css`、`components/*.tsx`（12コンポーネント）、`public/`（manifest、sw.js、robots.txt、icons） |
| IaC | `infra/bin/app.ts`、`infra/lib/weight-fitness-app-stack.ts`、`infra/cdk.json`、`infra/test/stack.test.ts` |
| CI/文書 | `.github/workflows/ci.yml`、`README.md` |

## テスト

- 例ベース: `tests/domain/`、`tests/infrastructure/`、`tests/application/`、`tests/api/`、`tests/presentation/`
- PBT: `tests/pbt/round-trip.pbt.test.ts`（PBT-02）、`invariants.pbt.test.ts`・`views.pbt.test.ts`（PBT-03）、`generators.ts`（PBT-07）、`tests/setup/pbt-seed.ts` + `vitest.config.ts`（PBT-08）

## 設計からの差分

- 計画上の `month-repository` / `mission-configuration-repository` / `image-object-store` は `src/infrastructure/repositories.ts` に集約した（責務は同じ）。
- ミッション定義の改訂ごとに日別snapshotを即時更新せず、表示・保存時に適用revisionで解決する（NFR Design 2章）。
- CDKの`FunctionUrlOrigin.withOriginAccessControl`は`lambda:InvokeFunction`権限を付与しないため、2025年10月以降のFunction URL要件に合わせて`CfnPermission`を追加した。

## ストーリー実装状況

- [x] US-01 〜 US-11（対応は`weight-fitness-app-code-generation-plan.md`のストーリー対応表を参照）
