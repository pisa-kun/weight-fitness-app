import { describe, expect, it } from "vitest";
import { GIF, JPEG, setup } from "../helpers";

const missions = [
  { title: "腹筋", kind: "mission" as const, target: "30回" },
  { title: "ウォーキング", kind: "exercise" as const, target: "30分" },
];

describe("初回設定とミッション（例ベース, US-03/US-04）", () => {
  it("初回設定日がsetupDateとなり、それ以前はN/A", async () => {
    const { services } = setup("2026-10-04T03:00:00Z");
    const before = await services.calendar.getMonthView("2026-10");
    expect(before.ok && before.value.missionConfiguration).toBeNull();

    const config = await services.missions.configureMissions(missions, null);
    expect(config.ok).toBe(true);
    if (!config.ok) return;
    expect(config.value.setupDate).toBe("2026-10-04");

    const view = await services.calendar.getMonthView("2026-10");
    if (!view.ok) throw new Error("unexpected");
    expect(view.value.days.find((d) => d.date === "2026-10-03")!.missions).toBeNull();
    expect(view.value.days.find((d) => d.date === "2026-10-04")!.missions).toHaveLength(2);
  });

  it("古いversionでのミッション設定はConflict", async () => {
    const { services } = setup();
    const first = await services.missions.configureMissions(missions, null);
    if (!first.ok) throw new Error("unexpected");
    expect((await services.missions.configureMissions(missions, first.value.version)).ok).toBe(true);
    const stale = await services.missions.configureMissions(missions, first.value.version);
    expect(stale.ok === false && stale.error.code).toBe("Conflict");
  });

  it("編集は編集日以降に適用し、過去日の内容と達成状態を保持する", async () => {
    const { services, setNow } = setup("2026-10-04T03:00:00Z");
    const c1 = await services.missions.configureMissions(missions, null);
    if (!c1.ok) throw new Error("unexpected");
    const m1 = await services.calendar.getMonthView("2026-10");
    if (!m1.ok) throw new Error("unexpected");
    const firstId = c1.value.definitions[0]!.missionId;
    const saved = await services.dailyRecords.saveDay("2026-10-04", { missionCompletions: { [firstId]: true } }, m1.value.version);
    if (!saved.ok) throw new Error("unexpected");

    setNow("2026-10-06T03:00:00Z");
    const c2 = await services.missions.configureMissions(
      [{ missionId: firstId, title: "腹筋50回", kind: "mission", target: null }],
      c1.value.version,
    );
    expect(c2.ok).toBe(true);
    const m2 = await services.calendar.getMonthView("2026-10");
    if (!m2.ok) throw new Error("unexpected");
    const past = m2.value.days.find((d) => d.date === "2026-10-04")!;
    expect(past.missions?.map((m) => [m.title, m.isCompleted])).toEqual([
      ["腹筋", true],
      ["ウォーキング", false],
    ]);
    const edited = m2.value.days.find((d) => d.date === "2026-10-06")!;
    expect(edited.missions?.map((m) => m.title)).toEqual(["腹筋50回"]);
  });
});

describe("日次記録と同期（例ベース, US-01/US-08）", () => {
  it("体重を保存し再表示で確認できる", async () => {
    const { services } = setup();
    const saved = await services.dailyRecords.saveDay("2026-10-01", { weightKg: 65.4 }, null);
    expect(saved.ok).toBe(true);
    const view = await services.calendar.getMonthView("2026-10");
    if (!view.ok) throw new Error("unexpected");
    const day = view.value.days.find((d) => d.date === "2026-10-01")!;
    expect(day.weightKg).toBe(65.4);
    expect(day.isComplete).toBe(true); // 設定前はミッションN/A（Q16-B）
  });

  it("古いversionからの保存は拒否し、先行更新を上書きしない（BR-15/BR-16）", async () => {
    const { services } = setup();
    const a = await services.dailyRecords.saveDay("2026-10-01", { weightKg: 60 }, null);
    if (!a.ok) throw new Error("unexpected");
    const b = await services.dailyRecords.saveDay("2026-10-01", { weightKg: 61 }, a.value.version);
    expect(b.ok).toBe(true);
    const stale = await services.dailyRecords.saveDay("2026-10-01", { weightKg: 99 }, a.value.version);
    expect(stale.ok === false && stale.error.code).toBe("Conflict");
    const view = await services.calendar.getMonthView("2026-10");
    expect(view.ok && view.value.days[0]!.weightKg).toBe(61);
  });

  it("保存失敗時はStorageFailureを返し、記録は変更されない（BR-22）", async () => {
    const { services, store } = setup();
    store.failNext("put", "months/");
    const r = await services.dailyRecords.saveDay("2026-10-01", { weightKg: 60 }, null);
    expect(r.ok === false && r.error.code).toBe("StorageFailure");
    const view = await services.calendar.getMonthView("2026-10");
    expect(view.ok && view.value.version).toBeNull();
  });

  it("月間目標は月ごとに保存できる（US-05）", async () => {
    const { services } = setup();
    const r = await services.goals.setGoal("2026-10", "毎日1万歩", null);
    expect(r.ok && r.value.monthlyGoal).toBe("毎日1万歩");
    const other = await services.calendar.getMonthView("2026-11");
    expect(other.ok && other.value.monthlyGoal).toBeNull();
  });
});

describe("食事画像（例ベース, US-07 / BR-12〜BR-14）", () => {
  it("1日2枚まで追加でき、3枚目は拒否する", async () => {
    const { services, store } = setup();
    let version: string | null = null;
    for (let i = 0; i < 2; i++) {
      const r = await services.images.attachImage("2026-10-04", JPEG, version);
      if (!r.ok) throw new Error(r.error.message);
      version = r.value.version;
    }
    const third = await services.images.attachImage("2026-10-04", JPEG, version);
    expect(third.ok === false && third.error.code).toBe("ValidationError");
    expect(store.keys().filter((k) => k.startsWith("images/"))).toHaveLength(2);
  });

  it("非対応形式・サイズ超過を拒否する", async () => {
    const { services } = setup();
    const gif = await services.images.attachImage("2026-10-04", GIF, null);
    expect(gif.ok === false && gif.error.code).toBe("UnsupportedImage");
    const big = new Uint8Array(3_500_001);
    big.set(JPEG);
    const tooBig = await services.images.attachImage("2026-10-04", big, null);
    expect(tooBig.ok === false && tooBig.error.code).toBe("PayloadTooLarge");
  });

  it("JSON更新に失敗したら保存済み画像オブジェクトを補償削除する", async () => {
    const { services, store } = setup();
    store.failNext("put", "months/");
    const r = await services.images.attachImage("2026-10-04", JPEG, null);
    expect(r.ok).toBe(false);
    expect(store.keys().filter((k) => k.startsWith("images/"))).toHaveLength(0);
  });

  it("画像を取得でき、存在しない画像はNotFound", async () => {
    const { services } = setup();
    const r = await services.images.attachImage("2026-10-04", JPEG, null);
    if (!r.ok) throw new Error("unexpected");
    const imageId = r.value.days.find((d) => d.date === "2026-10-04")!.images[0]!.imageId;
    const img = await services.images.readImage("2026-10-04", imageId);
    expect(img.ok && img.value.contentType).toBe("image/jpeg");
    const missing = await services.images.readImage("2026-10-05", imageId);
    expect(missing.ok === false && missing.error.code).toBe("NotFound");
  });

  it("オブジェクト削除の部分失敗は成功扱いせず、再試行で整合して完了する", async () => {
    const { services, store } = setup();
    const added = await services.images.attachImage("2026-10-04", JPEG, null);
    if (!added.ok) throw new Error("unexpected");
    const imageId = added.value.days.find((d) => d.date === "2026-10-04")!.images[0]!.imageId;

    store.failNext("delete", "images/");
    const partial = await services.images.removeImage("2026-10-04", imageId, added.value.version);
    expect(partial.ok === false && partial.error.code).toBe("PartialDeletionFailure");

    const latest = await services.calendar.getMonthView("2026-10");
    if (!latest.ok) throw new Error("unexpected");
    const retry = await services.images.removeImage("2026-10-04", imageId, latest.value.version);
    expect(retry.ok).toBe(true);
    expect(store.keys().filter((k) => k.startsWith("images/"))).toHaveLength(0);
    if (retry.ok) expect(retry.value.days.find((d) => d.date === "2026-10-04")!.images).toHaveLength(0);
  });

  it("画像の有無は完了判定に影響しない（BR-11）", async () => {
    const { services } = setup();
    const w = await services.dailyRecords.saveDay("2026-10-02", { weightKg: 60 }, null);
    if (!w.ok) throw new Error("unexpected");
    const withImage = await services.images.attachImage("2026-10-02", JPEG, w.value.version);
    if (!withImage.ok) throw new Error("unexpected");
    const day = withImage.value.days.find((d) => d.date === "2026-10-02")!;
    expect(day.isComplete).toBe(true);
  });
});
