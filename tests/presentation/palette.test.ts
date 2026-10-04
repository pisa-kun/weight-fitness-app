import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// US-11 / NFR-04: UIは指定14色のみを使う（例ベースの静的検査）

const PALETTE = new Set([
  "#e30f25", "#0c7bbb", "#f8c112", "#7f1184", "#eafdff", "#f68b1f", "#7cfc00",
  "#00afcc", "#f6adc6", "#ea533a", "#7a99cf", "#f6ae54", "#7b68ee", "#f0f8ff",
]);

const ROOT = join(process.cwd(), "src", "presentation");
const TARGET = /\.(css|tsx|ts|html|webmanifest)$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : TARGET.test(name) ? [path] : [];
  });
}

describe("配色（US-11）", () => {
  const sources = files(ROOT).map((path) => ({ path, text: readFileSync(path, "utf8") }));

  it("検査対象のファイルがある", () => {
    expect(sources.some((s) => s.path.endsWith("styles.css"))).toBe(true);
  });

  it("16進カラーはすべて指定パレット内", () => {
    for (const { path, text } of sources) {
      for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        expect(PALETTE.has(m[0].toLowerCase()), `${path}: ${m[0]}`).toBe(true);
      }
    }
  });

  it("rgb()/hsl()や色名による指定を使わない", () => {
    const css = sources.filter((s) => s.path.endsWith(".css"));
    const named = /:\s*[^;]*\b(white|black|gray|grey|red|blue|green|yellow|orange|purple|pink|silver|transparent|currentcolor)\b/i;
    for (const { path, text } of css) {
      expect(/\b(rgba?|hsla?|hwb|lab|lch|oklch|color-mix)\(/i.test(text), path).toBe(false);
      for (const line of text.split("\n")) {
        if (line.trim().startsWith("*") || line.trim().startsWith("/*")) continue;
        expect(named.test(line), `${path}: ${line}`).toBe(false);
      }
    }
  });
});
