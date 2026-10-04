# Performance Test Instructions

利用者1名・同時2〜3端末の想定（NFR-U-01）のため、負荷・ストレステストは実施しない（N/A）。

## 目標（NFR-U-02）と確認方法

- 月表示・保存: 通常2秒以内、Lambdaコールドスタート時3秒程度まで。
- デプロイ後にブラウザーの開発者ツール（Network）で `/api/months/*` と `PUT /api/days/*` の所要時間を数回計測する。
- 遅い場合はCloudWatch Logsの`ms`（構造化ログ）でLambda内の処理時間を確認し、必要ならメモリを増やす（`infra/lib/weight-fitness-app-stack.ts`の`memorySize`）。
