import { fail, ok, type Result } from "../domain/result";
import type { ObjectStore, StoredObject, WriteCondition } from "./object-store";

type Operation = "get" | "put" | "delete";

/**
 * テスト・ローカル開発用のインメモリ実装。S3の条件付き書込と同じ意味論を持つ。
 * failNext()で次の操作を失敗させ、部分失敗や補償の検証に使う。
 */
export class MemoryObjectStore implements ObjectStore {
  private readonly objects = new Map<string, StoredObject>();
  private counter = 0;
  private readonly failures: { op: Operation; keyPrefix: string }[] = [];

  failNext(op: Operation, keyPrefix = ""): void {
    this.failures.push({ op, keyPrefix });
  }

  keys(): string[] {
    return [...this.objects.keys()].sort();
  }

  async get(key: string): Promise<Result<StoredObject | null>> {
    if (this.consumeFailure("get", key)) return fail("StorageFailure", "保存先の読み込みに失敗しました。");
    return ok(this.objects.get(key) ?? null);
  }

  async put(key: string, body: Uint8Array, contentType: string, condition: WriteCondition): Promise<Result<{ etag: string }>> {
    if (this.consumeFailure("put", key)) return fail("StorageFailure", "保存に失敗しました。");
    const existing = this.objects.get(key);
    if (condition && "ifMatch" in condition && existing?.etag !== condition.ifMatch) {
      return fail("Conflict", "他の端末で更新されています。");
    }
    if (condition && "ifNoneMatch" in condition && existing) {
      return fail("Conflict", "他の端末で更新されています。");
    }
    const etag = `"mem-${++this.counter}"`;
    this.objects.set(key, { body: body.slice(), contentType, etag });
    return ok({ etag });
  }

  async delete(key: string): Promise<Result<void>> {
    if (this.consumeFailure("delete", key)) return fail("StorageFailure", "削除に失敗しました。");
    this.objects.delete(key);
    return ok(undefined);
  }

  private consumeFailure(op: Operation, key: string): boolean {
    const index = this.failures.findIndex((f) => f.op === op && key.startsWith(f.keyPrefix));
    if (index < 0) return false;
    this.failures.splice(index, 1);
    return true;
  }
}
