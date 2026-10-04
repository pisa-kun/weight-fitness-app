import { describe, expect, it } from "vitest";
import { createRouter } from "../../src/api/router";
import type { HttpRequest } from "../../src/api/http";
import type { ApiErrorBody, MonthView } from "../../src/shared/api-contract";
import { JPEG, setup } from "../helpers";

const encoder = new TextEncoder();

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): HttpRequest {
  return {
    method,
    path,
    headers,
    body: body === undefined ? null : body instanceof Uint8Array ? body : encoder.encode(JSON.stringify(body)),
  };
}

const json = <T>(body: string | Uint8Array): T => JSON.parse(typeof body === "string" ? body : new TextDecoder().decode(body)) as T;

describe("HTTP API（例ベース, US-08/US-09）", () => {
  it("認証なしで月表示を取得できる", async () => {
    const router = createRouter(setup().services);
    const res = await router(req("GET", "/api/months/2026-10"));
    expect(res.status).toBe(200);
    expect(json<MonthView>(res.body).days).toHaveLength(31);
  });

  it("体重の保存と、古いversionでの409 + 最新状態", async () => {
    const router = createRouter(setup().services);
    const first = await router(req("PUT", "/api/days/2026-10-01", { weightKg: 60, expectedVersion: null }));
    expect(first.status).toBe(200);
    const stale = await router(req("PUT", "/api/days/2026-10-01", { weightKg: 62, expectedVersion: null }));
    expect(stale.status).toBe(409);
    const body = json<ApiErrorBody>(stale.body);
    expect(body.error.code).toBe("Conflict");
    expect((body.latest as MonthView).days[0]!.weightKg).toBe(60);
  });

  it("不正な入力は400で、内部情報を含まない", async () => {
    const router = createRouter(setup().services);
    const res = await router(req("PUT", "/api/days/2026-10-01", { weightKg: "abc", expectedVersion: null }));
    expect(res.status).toBe(400);
    const res2 = await router(req("PUT", "/api/days/2026-10-01", undefined));
    expect(res2.status).toBe(400);
    const res3 = await router(req("GET", "/api/months/2026-13"));
    expect(res3.status).toBe(400);
    expect(String(res3.body)).not.toMatch(/months\/|stack|Error:/);
  });

  it("未知のパスは404、未許可メソッドは405", async () => {
    const router = createRouter(setup().services);
    expect((await router(req("GET", "/api/unknown"))).status).toBe(404);
    expect((await router(req("DELETE", "/api/months/2026-10"))).status).toBe(405);
  });

  it("ミッション設定・画像追加・取得・削除の一連の流れ", async () => {
    const router = createRouter(setup().services);
    const m = await router(req("PUT", "/api/missions", { definitions: [{ title: "腹筋", kind: "mission", target: null }], expectedVersion: null }));
    expect(m.status).toBe(200);
    const missions = await router(req("GET", "/api/missions"));
    expect(json<{ definitions: unknown[] }>(missions.body).definitions).toHaveLength(1);

    const up = await router(req("POST", "/api/days/2026-10-04/images", JPEG, { "content-type": "image/jpeg" }));
    expect(up.status).toBe(200);
    const view = json<MonthView>(up.body);
    const imageId = view.days[3]!.images[0]!.imageId;

    const img = await router(req("GET", `/api/images/2026-10-04/${imageId}`));
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toBe("image/jpeg");
    expect(img.body).toBeInstanceOf(Uint8Array);

    const del = await router(req("DELETE", `/api/days/2026-10-04/images/${imageId}`, undefined, { "x-expected-version": view.version! }));
    expect(del.status).toBe(200);
    expect(json<MonthView>(del.body).days[3]!.images).toHaveLength(0);
  });

  it("非対応画像は415", async () => {
    const router = createRouter(setup().services);
    const res = await router(req("POST", "/api/days/2026-10-04/images", encoder.encode("GIF89a"), {}));
    expect(res.status).toBe(415);
  });
});
