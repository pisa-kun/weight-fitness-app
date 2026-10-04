import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "aws-cdk-lib";
import { defaultAssetPaths, WeightFitnessAppStack } from "../lib/weight-fitness-app-stack";

// 事前にリポジトリルートで `npm run build` を実行し、dist/web と dist/api を作成しておくこと
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const paths = defaultAssetPaths(repoRoot);
for (const p of [paths.webAssetPath, paths.apiAssetPath]) {
  if (!existsSync(p)) {
    throw new Error(`${p} がありません。リポジトリルートで npm run build を実行してください。`);
  }
}

const app = new App();
new WeightFitnessAppStack(app, "WeightFitnessAppStack", {
  ...paths,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "ap-northeast-1" },
  description: "weight-fitness-app (CloudFront + Lambda Function URL + private S3)",
});
