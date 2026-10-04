import { describe, expect, it } from "vitest";
import { emptyMonth } from "../../src/domain/month-document";
import { MemoryObjectStore } from "../../src/infrastructure/memory-object-store";
import { MonthlyJsonRepository, monthKey } from "../../src/infrastructure/repositories";

describe("MonthlyJsonRepository（例ベース, NFR-U-09）", () => {
  it("未作成の月は空の月とversion=nullを返す", async () => {
    const repo = new MonthlyJsonRepository(new MemoryObjectStore());
    expect(await repo.readMonth("2026-10")).toEqual({ ok: true, value: { value: emptyMonth("2026-10"), version: null } });
  });

  it("新規作成はversion=null、更新は読込versionでのみ成功し、古いversionはConflict", async () => {
    const repo = new MonthlyJsonRepository(new MemoryObjectStore());
    const doc = emptyMonth("2026-10");
    const v1 = await repo.writeMonth("2026-10", doc, null);
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;

    const again = await repo.writeMonth("2026-10", doc, null);
    expect(again.ok === false && again.error.code).toBe("Conflict");

    const v2 = await repo.writeMonth("2026-10", { ...doc, monthlyGoal: "a" }, v1.value);
    expect(v2.ok).toBe(true);

    const stale = await repo.writeMonth("2026-10", { ...doc, monthlyGoal: "b" }, v1.value);
    expect(stale.ok === false && stale.error.code).toBe("Conflict");

    const read = await repo.readMonth("2026-10");
    expect(read.ok && read.value.value.monthlyGoal).toBe("a");
  });

  it("破損したJSONはUnexpectedFailureとして扱い、内部情報を含めない", async () => {
    const store = new MemoryObjectStore();
    await store.put(monthKey("2026-10"), new TextEncoder().encode("{broken"), "application/json", null);
    const r = await new MonthlyJsonRepository(store).readMonth("2026-10");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("UnexpectedFailure");
      expect(r.error.message).not.toContain("months/");
    }
  });

  it("ストレージ障害はStorageFailure", async () => {
    const store = new MemoryObjectStore();
    store.failNext("get");
    const r = await new MonthlyJsonRepository(store).readMonth("2026-10");
    expect(r.ok === false && r.error.code).toBe("StorageFailure");
  });
});
