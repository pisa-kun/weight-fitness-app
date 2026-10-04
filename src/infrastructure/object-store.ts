import type { Result } from "../domain/result";

// PrivateS3ObjectAdapter: 非公開オブジェクトストレージの抽象（C-06）。
// 機能サービスからS3 SDKやAWS詳細を隠す。

export interface StoredObject {
  readonly body: Uint8Array;
  readonly contentType: string;
  /** 楽観ロックに使う版（S3ではETag） */
  readonly etag: string;
}

/** 条件付き書込。ifMatch: 既存の版と一致する場合のみ / ifNoneMatch: 存在しない場合のみ */
export type WriteCondition = { readonly ifMatch: string } | { readonly ifNoneMatch: "*" } | null;

export interface ObjectStore {
  /** 存在しない場合は ok(null) */
  get(key: string): Promise<Result<StoredObject | null>>;
  /** 条件不成立は Conflict を返す */
  put(key: string, body: Uint8Array, contentType: string, condition: WriteCondition): Promise<Result<{ etag: string }>>;
  /** 存在しないキーの削除も成功とする（冪等） */
  delete(key: string): Promise<Result<void>>;
}

export const conditionFor = (expectedVersion: string | null): WriteCondition =>
  expectedVersion === null ? { ifNoneMatch: "*" } : { ifMatch: expectedVersion };
