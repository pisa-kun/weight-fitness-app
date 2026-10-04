import fc from "fast-check";

// PBT-08: vitest.config.tsが決めたseedを全テストファイルへ適用する。
// shrinkingはfast-checkの既定（有効）のまま変更しない。失敗時はfast-checkがseedと縮小済み反例を出力する。
const seed = Number(process.env.PBT_SEED);

if (!Number.isInteger(seed)) {
  throw new Error(`PBT_SEED must be an integer: ${process.env.PBT_SEED}`);
}

fc.configureGlobal({ seed, numRuns: 200 });
