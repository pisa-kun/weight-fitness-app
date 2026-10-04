import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { deserializeMissionConfiguration, serializeMissionConfiguration } from "../../src/domain/missions";
import { deserializeMonth, serializeMonth } from "../../src/domain/month-document";
import { formatWeightKg, parseWeightInput } from "../../src/domain/weight";
import { missionConfigurationArb, monthDocumentArb, weightKgArb } from "./generators";

// PBT-02: 往復性（Property-based）

describe("[PBT] 往復性", () => {
  it("Month DocumentはJSON化→復元で意味上同一", () => {
    fc.assert(
      fc.property(monthDocumentArb, (doc) => {
        const restored = deserializeMonth(serializeMonth(doc), doc.month);
        expect(restored).toEqual({ ok: true, value: doc });
      }),
    );
  });

  it("Mission ConfigurationはJSON化→復元で同一", () => {
    fc.assert(
      fc.property(missionConfigurationArb, (config) => {
        expect(deserializeMissionConfiguration(serializeMissionConfiguration(config))).toEqual({ ok: true, value: config });
      }),
    );
  });

  it("体重の表示文字列→入力解析で同じ値に戻る", () => {
    fc.assert(
      fc.property(weightKgArb, (w) => {
        expect(parseWeightInput(formatWeightKg(w))).toEqual({ ok: true, value: w });
      }),
    );
  });
});
