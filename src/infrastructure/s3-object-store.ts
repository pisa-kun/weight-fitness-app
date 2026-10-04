import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { fail, ok, type Result } from "../domain/result";
import type { ObjectStore, StoredObject, WriteCondition } from "./object-store";

/** 非公開S3バケットへのアダプター。SDK例外は型付きエラーに変換し、詳細は応答に出さない */
export class S3ObjectStore implements ObjectStore {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async get(key: string): Promise<Result<StoredObject | null>> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const body = res.Body ? await res.Body.transformToByteArray() : new Uint8Array();
      return ok({ body, contentType: res.ContentType ?? "application/octet-stream", etag: res.ETag ?? "" });
    } catch (e) {
      if (isStatus(e, 404) || errorName(e) === "NoSuchKey") return ok(null);
      logStorageError("get", e);
      return fail("StorageFailure", "保存先の読み込みに失敗しました。時間をおいて再試行してください。");
    }
  }

  async put(key: string, body: Uint8Array, contentType: string, condition: WriteCondition): Promise<Result<{ etag: string }>> {
    try {
      const res = await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ...(condition && "ifMatch" in condition ? { IfMatch: condition.ifMatch } : {}),
          ...(condition && "ifNoneMatch" in condition ? { IfNoneMatch: condition.ifNoneMatch } : {}),
        }),
      );
      return ok({ etag: res.ETag ?? "" });
    } catch (e) {
      // 412 PreconditionFailed / 409 ConditionalRequestConflict は版の不一致
      if (isStatus(e, 412) || isStatus(e, 409)) return fail("Conflict", "他の端末で更新されています。");
      logStorageError("put", e);
      return fail("StorageFailure", "保存に失敗しました。時間をおいて再試行してください。");
    }
  }

  async delete(key: string): Promise<Result<void>> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return ok(undefined);
    } catch (e) {
      logStorageError("delete", e);
      return fail("StorageFailure", "削除に失敗しました。時間をおいて再試行してください。");
    }
  }
}

function isStatus(e: unknown, status: number): boolean {
  return e instanceof S3ServiceException
    ? e.$metadata.httpStatusCode === status
    : (e as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === status;
}

function errorName(e: unknown): string | undefined {
  return (e as { name?: string })?.name;
}

/** ログには操作名とエラー種別だけを出す（キー・本文は出さない, NFR-U-11） */
function logStorageError(op: string, e: unknown): void {
  console.error(JSON.stringify({ event: "storage_error", op, error: errorName(e) ?? "unknown" }));
}
