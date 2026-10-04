import { fail, ok, type Result } from "./result";

// 体重はkg、正数、0.1 kg単位。上限は設けない（BR-02, BR-03）

const TENTH_TOLERANCE = 1e-6;

/** 入力値を検証し、0.1 kg単位に正規化した体重を返す */
export function parseWeightKg(value: unknown): Result<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail("ValidationError", "体重は数値で入力してください。", { weightKg: "数値を入力してください" });
  }
  if (value <= 0) {
    return fail("ValidationError", "体重は0より大きい値を入力してください。", { weightKg: "0より大きい値を入力してください" });
  }
  const scaled = value * 10;
  const rounded = Math.round(scaled);
  if (!Number.isFinite(scaled) || Math.abs(scaled - rounded) > TENTH_TOLERANCE * Math.max(1, Math.abs(scaled))) {
    return fail("ValidationError", "体重は0.1 kg単位で入力してください。", { weightKg: "小数点以下1桁までで入力してください" });
  }
  const normalized = rounded / 10;
  if (normalized <= 0) {
    return fail("ValidationError", "体重は0より大きい値を入力してください。", { weightKg: "0より大きい値を入力してください" });
  }
  return ok(normalized);
}

/** 画面入力の文字列を体重へ変換する（"65" / "65.3" 形式のみ受付） */
export function parseWeightInput(text: string): Result<number> {
  const trimmed = text.trim();
  if (!/^\d+(\.\d)?$/.test(trimmed)) {
    return fail("ValidationError", "体重は「65.3」のように小数点以下1桁までの数値で入力してください。", {
      weightKg: "小数点以下1桁までの数値で入力してください",
    });
  }
  return parseWeightKg(Number(trimmed));
}

export function formatWeightKg(value: number): string {
  return value.toFixed(1);
}
