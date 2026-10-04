import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// PBT-08: 実行ごとに1つのseedを決めて出力し、全テストファイルで共有する。
// 失敗時は PBT_SEED=<seed> npm test で同じ入力列を再現できる。
const pbtSeed = process.env.PBT_SEED && process.env.PBT_SEED !== "" ? process.env.PBT_SEED : String(Math.floor(Math.random() * 2 ** 31));
console.info(`[PBT] fast-check seed=${pbtSeed} (再現: PBT_SEED=${pbtSeed})`);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    env: { PBT_SEED: pbtSeed },
    setupFiles: ["tests/setup/pbt-seed.ts"],
  },
});
