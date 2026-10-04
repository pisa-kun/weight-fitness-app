import { S3Client } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createServices } from "../application/services";
import { S3ObjectStore } from "../infrastructure/s3-object-store";
import { createRouter } from "./router";

// Lambda Function URL（ペイロード形式2.0）のエントリポイント

const bucket = process.env.DATA_BUCKET_NAME;
if (!bucket) throw new Error("DATA_BUCKET_NAME is not set");

const router = createRouter(createServices(new S3ObjectStore(new S3Client({}), bucket)));

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const started = Date.now();
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(event.headers ?? {})) headers[k.toLowerCase()] = v;
  const body = event.body === undefined || event.body === null
    ? null
    : event.isBase64Encoded
      ? new Uint8Array(Buffer.from(event.body, "base64"))
      : new TextEncoder().encode(event.body);

  const res = await router({ method: event.requestContext.http.method, path: event.rawPath, headers, body });

  // ログは操作・結果・所要時間のみ（体重や画像本体は出さない, NFR-U-11）
  console.info(
    JSON.stringify({ event: "request", method: event.requestContext.http.method, route: routeLabel(event.rawPath), status: res.status, ms: Date.now() - started }),
  );

  if (typeof res.body === "string") {
    return { statusCode: res.status, headers: res.headers, body: res.body };
  }
  return { statusCode: res.status, headers: res.headers, body: Buffer.from(res.body).toString("base64"), isBase64Encoded: true };
}

/** 日付やIDを伏せたルート名 */
function routeLabel(path: string): string {
  return path.replace(/\d{4}-\d{2}(-\d{2})?/g, ":date").replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ":id");
}
