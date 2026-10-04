import { describe, expect, it } from "vitest";
import {
  createMissionConfiguration,
  deserializeMissionConfiguration,
  effectiveRevision,
  reviseMissionConfiguration,
  serializeMissionConfiguration,
  validateMissionDefinitions,
} from "../../src/domain/missions";

let counter = 0;
const newId = () => `m-${++counter}`;

describe("ミッション定義（例ベース, BR-04〜BR-08）", () => {
  it("0件は拒否し、空の初期テンプレートから開始できない", () => {
    const r = validateMissionDefinitions([], newId);
    expect(r.ok).toBe(false);
  });

  it("16件は拒否し、15件は受け付ける", () => {
    const make = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `ミッション${i}` }));
    expect(validateMissionDefinitions(make(16), newId).ok).toBe(false);
    expect(validateMissionDefinitions(make(15), newId).ok).toBe(true);
  });

  it("運動目標も通常ミッションと同じ定義で登録する", () => {
    const r = validateMissionDefinitions([{ title: "ランニング", kind: "exercise", target: " 30分 " }], newId);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0]).toMatchObject({ title: "ランニング", kind: "exercise", target: "30分" });
  });

  it("空の名称・重複IDを項目単位で拒否する", () => {
    const r = validateMissionDefinitions(
      [{ title: "  " }, { missionId: "same", title: "a" }, { missionId: "same", title: "b" }],
      newId,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.details?.["definitions.0.title"]).toBeDefined();
      expect(r.error.details?.["definitions.2.missionId"]).toBeDefined();
    }
  });

  it("setupDate前はN/A、編集は編集日から適用し過去のrevisionを保持する", () => {
    const defs1 = [{ missionId: "a", title: "腹筋", kind: "mission" as const, target: null }];
    const defs2 = [...defs1, { missionId: "b", title: "散歩", kind: "exercise" as const, target: "20分" }];
    const config1 = createMissionConfiguration(defs1, "2026-10-04");
    const config2 = reviseMissionConfiguration(config1, defs2, "2026-10-10");

    expect(effectiveRevision(config2, "2026-10-03")).toBeNull();
    expect(effectiveRevision(config2, "2026-10-09")?.revision).toBe(1);
    expect(effectiveRevision(config2, "2026-10-10")?.revision).toBe(2);
    expect(effectiveRevision(config2, "2026-12-01")?.revision).toBe(2);
    expect(config2.revisions[0]).toEqual(config1.revisions[0]);
  });

  it("壊れた設定JSONを拒否する", () => {
    expect(deserializeMissionConfiguration("{").ok).toBe(false);
    expect(deserializeMissionConfiguration(JSON.stringify({ schemaVersion: 1, setupDate: "2026-10-04", revisions: [] })).ok).toBe(false);
    const config = createMissionConfiguration([{ missionId: "a", title: "x", kind: "mission", target: null }], "2026-10-04");
    expect(deserializeMissionConfiguration(serializeMissionConfiguration(config))).toEqual({ ok: true, value: config });
  });
});
