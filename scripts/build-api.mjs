// Lambda向けにAPIを単一のESMファイルへバンドルする
import { build } from "esbuild";

await build({
  entryPoints: ["src/api/lambda.ts"],
  outfile: "dist/api/index.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  minify: true,
  sourcemap: false,
  // ESM出力でCommonJS依存のrequireを使えるようにする
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});
