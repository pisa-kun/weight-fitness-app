import { describe, expect, it } from "vitest";
import { formatWeightKg, parseWeightInput, parseWeightKg } from "../../src/domain/weight";

describe("体重の検証（例ベース, BR-02/BR-03）", () => {
  it("0.1 kg単位の正数を受け付ける", () => {
    expect(parseWeightKg(65.3)).toEqual({ ok: true, value: 65.3 });
    expect(parseWeightKg(0.1)).toEqual({ ok: true, value: 0.1 });
    expect(parseWeightKg(500)).toEqual({ ok: true, value: 500 });
  });

  it("0以下・非有限・0.1 kg刻みでない値を拒否する", () => {
    for (const v of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 65.25, "65"]) {
      const r = parseWeightKg(v);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("ValidationError");
    }
  });

  it("画面入力は数値文字列のみ受け付ける", () => {
    expect(parseWeightInput(" 70.4 ")).toEqual({ ok: true, value: 70.4 });
    expect(parseWeightInput("abc").ok).toBe(false);
    expect(parseWeightInput("70.45").ok).toBe(false);
    expect(parseWeightInput("0").ok).toBe(false);
    expect(parseWeightInput("").ok).toBe(false);
  });

  it("表示は小数点以下1桁", () => {
    expect(formatWeightKg(70)).toBe("70.0");
  });
});
