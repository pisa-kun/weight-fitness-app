import { describe, expect, it } from "vitest";
import { detectImageContentType } from "../../src/domain/images";
import { deserializeMonth, emptyMonth, serializeMonth } from "../../src/domain/month-document";

describe("Month Document（例ベース）", () => {
  it("空の月を往復できる", () => {
    const doc = emptyMonth("2026-10");
    expect(deserializeMonth(serializeMonth(doc), "2026-10")).toEqual({ ok: true, value: doc });
  });

  it("別月のキー・3枚以上の画像・不正な体重を含むJSONは破損として拒否する", () => {
    const base = { schemaVersion: 1, month: "2026-10", monthlyGoal: null };
    const bad = [
      { ...base, days: { "2026-11-01": { weightKg: null, missionStates: null, images: [] } } },
      { ...base, days: { "2026-10-01": { weightKg: -1, missionStates: null, images: [] } } },
      { ...base, days: { "2026-10-01": { weightKg: 60.25, missionStates: null, images: [] } } },
      { ...base, days: { "2026-10-01": { weightKg: null, missionStates: [], images: [] } } },
      { ...base, month: "2026-09", days: {} },
    ];
    for (const b of bad) expect(deserializeMonth(JSON.stringify(b), "2026-10").ok).toBe(false);
    expect(deserializeMonth("not json").ok).toBe(false);
  });
});

describe("画像形式判定（例ベース）", () => {
  it("マジックバイトでJPEG/PNG/WebPを判定し、それ以外はnull", () => {
    expect(detectImageContentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageContentType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(
      detectImageContentType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe("image/webp");
    expect(detectImageContentType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
});
