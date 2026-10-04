import * as path from "node:path";
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";
import type { Construct } from "constructs";

export interface WeightFitnessAppStackProps extends StackProps {
  /** ビルド済みWeb資産（dist/web） */
  readonly webAssetPath: string;
  /** ビルド済みLambdaバンドル（dist/api） */
  readonly apiAssetPath: string;
}

/**
 * CloudFront（OAC） + 非公開S3（Web資産・データ） + Lambda Function URL（AWS_IAM）。
 * 設計: aidlc-docs/construction/weight-fitness-app/infrastructure-design/
 * 注意: ログイン認証はない（FR-09）。配信URLを知る人はデータを閲覧・更新できる。
 */
export class WeightFitnessAppStack extends Stack {
  constructor(scope: Construct, id: string, props: WeightFitnessAppStackProps) {
    super(scope, id, props);

    // 健康データ（月JSON・ミッション設定・画像）。スタック削除時も保持する
    const dataBucket = new s3.Bucket(this, "DataBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [
        { id: "expire-noncurrent-versions", noncurrentVersionExpiration: Duration.days(30) },
        { id: "abort-incomplete-multipart", abortIncompleteMultipartUploadAfter: Duration.days(1) },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // SPA・PWA資産。再ビルドで再作成できるため削除可能
    const webBucket = new s3.Bucket(this, "WebAssetsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const logGroup = new logs.LogGroup(this, "ApiFunctionLogs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const apiFunction = new lambda.Function(this, "ApiFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handler",
      code: lambda.Code.fromAsset(props.apiAssetPath),
      memorySize: 512,
      timeout: Duration.seconds(15),
      logGroup,
      environment: {
        DATA_BUCKET_NAME: dataBucket.bucketName,
      },
      description: "weight-fitness-app API (no login; access via CloudFront OAC only)",
    });
    // Get/Put/Delete + List（存在しないキーを404として判別するため）
    dataBucket.grantReadWrite(apiFunction);

    const functionUrl = apiFunction.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM });

    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, "SecurityHeaders", {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          override: true,
        },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER, override: true },
      },
      customHeadersBehavior: {
        customHeaders: [{ header: "X-Robots-Tag", value: "noindex, nofollow", override: true }],
      },
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "weight-fitness-app",
      defaultRootObject: "index.html",
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
        compress: true,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: origins.FunctionUrlOrigin.withOriginAccessControl(functionUrl, { readTimeout: Duration.seconds(30) }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: securityHeaders,
          compress: true,
        },
      },
    });

    // 2025年10月以降の新しいFunction URLは lambda:InvokeFunction も必要。
    // CDKのwithOriginAccessControlはInvokeFunctionUrlのみ付与するため補う（aws/aws-cdk#35872）。
    new lambda.CfnPermission(this, "AllowCloudFrontInvokeFunction", {
      action: "lambda:InvokeFunction",
      principal: "cloudfront.amazonaws.com",
      functionName: apiFunction.functionArn,
      sourceArn: `arn:${Stack.of(this).partition}:cloudfront::${Stack.of(this).account}:distribution/${distribution.distributionId}`,
    });

    // ハッシュ付き資産は長期キャッシュ、入口ファイルは毎回再検証
    const noCacheFiles = ["index.html", "sw.js", "manifest.webmanifest", "robots.txt"];
    const assets = new s3deploy.BucketDeployment(this, "DeployHashedAssets", {
      sources: [s3deploy.Source.asset(props.webAssetPath, { exclude: noCacheFiles })],
      destinationBucket: webBucket,
      cacheControl: [s3deploy.CacheControl.fromString("public, max-age=31536000, immutable")],
      prune: false,
    });
    const entry = new s3deploy.BucketDeployment(this, "DeployEntryFiles", {
      sources: [s3deploy.Source.asset(props.webAssetPath, { exclude: ["*", ...noCacheFiles.map((f) => `!${f}`)] })],
      destinationBucket: webBucket,
      cacheControl: [s3deploy.CacheControl.fromString("no-cache")],
      prune: false,
      distribution,
      distributionPaths: ["/*"],
    });
    entry.node.addDependency(assets);

    new CfnOutput(this, "AppUrl", { value: `https://${distribution.distributionDomainName}`, description: "アプリのURL（ログインなしで利用可能）" });
    new CfnOutput(this, "DataBucketName", { value: dataBucket.bucketName, description: "健康データの非公開バケット（RETAIN）" });
  }
}

export const defaultAssetPaths = (repoRoot: string) => ({
  webAssetPath: path.join(repoRoot, "dist", "web"),
  apiAssetPath: path.join(repoRoot, "dist", "api"),
});
