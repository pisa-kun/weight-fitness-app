import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildMonthView } from "../../src/application/views";
import type { MonthDocument } from "../../src/domain/month-document";
import { missionConfigurationArb, monthDocumentArb } from "./generators";

// PBT-03: 画像は日次完了判定に影響しない（BR-11）

const stripImages = (doc: MonthDocument): MonthDocument => ({
  ...doc,
  days: Object.fromEntries(Object.entries(doc.days).map(([d, r]) => [d, { ...r, images: [] }])),
});

describe("[PBT] カレンダー表示モデルの不変条件", () => {
  it("画像を取り除いても各日の完了判定は変わらない", () => {
    fc.assert(
      fc.property(monthDocumentArb, fc.option(missionConfigurationArb, { nil: null }), (doc, config) => {
        const version = config ? '"v1"' : null;
        const a = buildMonthView(doc.month, doc, null, config, version, "2026-10-04");
        const b = buildMonthView(doc.month, stripImages(doc), null, config, version, "2026-10-04");
        expect(a.days.map((d) => d.isComplete)).toEqual(b.days.map((d) => d.isComplete));
      }),
    );
  });

  it("表示モデルの画像は1日0〜2件で、内部のobjectKeyを含まない", () => {
    fc.assert(
      fc.property(monthDocumentArb, (doc) => {
        const view = buildMonthView(doc.month, doc, null, null, null, "2026-10-04");
        for (const day of view.days) {
          expect(day.images.length).toBeLessThanOrEqual(2);
          for (const img of day.images) expect(Object.keys(img)).not.toContain("objectKey");
        }
      }),
    );
  });
});
