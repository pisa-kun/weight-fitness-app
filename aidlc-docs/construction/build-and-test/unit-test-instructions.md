# Unit Test Execution

## 実行

```powershell
npm test                 # ルート: 例ベース + PBT（Vitest + fast-check）
cd infra; npm test       # CDKスタックの合成テスト
```

## 構成

| 種別 | 場所 | 内容 |
|---|---|---|
| 例ベース | `tests/domain/` | 日付（Asia/Tokyo）、体重、ミッション、完了判定、Month Document、画像形式 |
| 例ベース | `tests/infrastructure/` | 条件付き書込・Conflict・破損JSON・ストレージ障害 |
| 例ベース | `tests/application/` | 初回設定、編集の将来適用、競合拒否、画像上限・補償・部分削除の再試行 |
| 例ベース | `tests/api/` | HTTPステータス対応、409 + latest、内部情報の非開示 |
| 例ベース | `tests/presentation/` | パレット検査（US-11）、コンポーネント・競合時の再適用（jsdom） |
| PBT | `tests/pbt/` | 往復性（PBT-02）、不変条件（PBT-03）、共有生成器（PBT-07） |

## PBTの再現性（PBT-08）

- 実行のたびに `[PBT] fast-check seed=<n>` が出力され、全テストファイルで同じseedを使う。
- 失敗時はfast-checkが縮小済みの反例とseed・pathを出力する（shrinkingは既定で有効）。
- 再現: `$env:PBT_SEED=<n>; npm test`（bashでは `PBT_SEED=<n> npm test`）。
- CI（`.github/workflows/ci.yml`）でも毎回seedがログに残る。PBTはCIから除外しない。

## 期待結果

- ルート: 13ファイル / 76テスト成功
- infra: 1ファイル / 6テスト成功
