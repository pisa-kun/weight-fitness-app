import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { WeightFitnessAppStack } from "../lib/weight-fitness-app-stack";

// 合成のみ（AWSへのアクセス・デプロイは行わない）

function synth(): Template {
  const dir = mkdtempSync(path.join(tmpdir(), "wfa-"));
  const webDir = mkdtempSync(path.join(dir, "web-"));
  const apiDir = mkdtempSync(path.join(dir, "api-"));
  writeFileSync(path.join(webDir, "index.html"), "<html></html>");
  writeFileSync(path.join(apiDir, "index.mjs"), "export const handler = async () => ({});");
  const app = new App();
  const stack = new WeightFitnessAppStack(app, "TestStack", {
    webAssetPath: webDir,
    apiAssetPath: apiDir,
    env: { account: "123456789012", region: "ap-northeast-1" },
  });
  return Template.fromStack(stack);
}

describe("WeightFitnessAppStack", () => {
  const template = synth();

  it("S3バケットはすべてパブリックアクセスをブロックし暗号化する", () => {
    const buckets = template.findResources("AWS::S3::Bucket");
    expect(Object.keys(buckets)).toHaveLength(2);
    for (const b of Object.values(buckets)) {
      expect(b.Properties.PublicAccessBlockConfiguration).toEqual({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      });
      expect(b.Properties.BucketEncryption).toBeDefined();
    }
  });

  it("データバケットはバージョニング有効・保持（RETAIN）", () => {
    template.hasResource("AWS::S3::Bucket", {
      Properties: { VersioningConfiguration: { Status: "Enabled" } },
      DeletionPolicy: "Retain",
    });
  });

  it("Function URLはIAM認証で、CloudFrontにInvokeFunctionUrlとInvokeFunctionを許可する", () => {
    template.hasResourceProperties("AWS::Lambda::Url", { AuthType: "AWS_IAM" });
    template.hasResourceProperties("AWS::Lambda::Permission", {
      Action: "lambda:InvokeFunctionUrl",
      Principal: "cloudfront.amazonaws.com",
    });
    template.hasResourceProperties("AWS::Lambda::Permission", {
      Action: "lambda:InvokeFunction",
      Principal: "cloudfront.amazonaws.com",
    });
  });

  it("Lambdaは Node.js 22 / arm64 で、データバケット名を受け取る", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Architectures: ["arm64"],
      Environment: { Variables: Match.objectLike({ DATA_BUCKET_NAME: Match.anyValue() }) },
    });
  });

  it("CloudFrontはHTTPSへリダイレクトし、/api/* はキャッシュ無効", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: "redirect-to-https" }),
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({
            PathPattern: "/api/*",
            ViewerProtocolPolicy: "redirect-to-https",
            CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
          }),
        ]),
      }),
    });
  });

  it("ログ保持は30日", () => {
    template.hasResourceProperties("AWS::Logs::LogGroup", { RetentionInDays: 30 });
  });
});
