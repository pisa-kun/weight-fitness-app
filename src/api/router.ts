import type { AppServices } from "../application/services";
import { yearMonthOf } from "../domain/dates";
import type { DayUpdate } from "../domain/day-logic";
import { fail, type Result } from "../domain/result";
import { EXPECTED_VERSION_HEADER, type ApiErrorBody } from "../shared/api-contract";
import { toPublicResponse } from "./error-mapping";
import { jsonResponse, type HttpRequest, type HttpResponse } from "./http";

// C-02 Application API。ログイン認証なし（FR-09）。S3へはサービス経由でのみアクセスする

const MAX_JSON_BODY_BYTES = 64 * 1024;
const MAX_VERSION_LENGTH = 200;

type Handler = (req: HttpRequest, params: string[]) => Promise<HttpResponse>;

interface Route {
  readonly method: string;
  readonly pattern: RegExp;
  readonly handler: Handler;
}

const MONTH = "(\\d{4}-\\d{2})";
const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const ID = "([0-9a-f-]{36})";

export function createRouter(services: AppServices): (req: HttpRequest) => Promise<HttpResponse> {
  /** Conflict時は最新の月表示を添えて返す（BR-15） */
  const monthResult = async (r: Result<unknown>, month: string | null): Promise<HttpResponse> => {
    if (r.ok) return jsonResponse(200, r.value);
    let latest: ApiErrorBody["latest"];
    if (r.error.code === "Conflict" && month) {
      const view = await services.calendar.getMonthView(month);
      if (view.ok) latest = view.value;
    }
    return toPublicResponse(r.error, latest);
  };

  const routes: Route[] = [
    {
      method: "GET",
      pattern: new RegExp(`^/api/months/${MONTH}$`),
      handler: async (_req, [ym]) => monthResult(await services.calendar.getMonthView(ym!), null),
    },
    {
      method: "PUT",
      pattern: new RegExp(`^/api/days/${DATE}$`),
      handler: async (req, [date]) => {
        const body = parseJsonBody(req);
        if (!body.ok) return toPublicResponse(body.error);
        const version = readVersion(body.value.expectedVersion);
        if (!version.ok) return toPublicResponse(version.error);
        const update = toDayUpdate(body.value);
        if (!update.ok) return toPublicResponse(update.error);
        return monthResult(await services.dailyRecords.saveDay(date!, update.value, version.value), yearMonthOf(date!));
      },
    },
    {
      method: "PUT",
      pattern: new RegExp(`^/api/months/${MONTH}/goal$`),
      handler: async (req, [ym]) => {
        const body = parseJsonBody(req);
        if (!body.ok) return toPublicResponse(body.error);
        const version = readVersion(body.value.expectedVersion);
        if (!version.ok) return toPublicResponse(version.error);
        return monthResult(await services.goals.setGoal(ym!, body.value.goal ?? null, version.value), ym!);
      },
    },
    {
      method: "GET",
      pattern: /^\/api\/missions$/,
      handler: async () => {
        const r = await services.missions.getConfiguration();
        return r.ok ? jsonResponse(200, r.value) : toPublicResponse(r.error);
      },
    },
    {
      method: "PUT",
      pattern: /^\/api\/missions$/,
      handler: async (req) => {
        const body = parseJsonBody(req);
        if (!body.ok) return toPublicResponse(body.error);
        const version = readVersion(body.value.expectedVersion);
        if (!version.ok) return toPublicResponse(version.error);
        const r = await services.missions.configureMissions(body.value.definitions, version.value);
        if (r.ok) return jsonResponse(200, r.value);
        if (r.error.code === "Conflict") {
          const latest = await services.missions.getConfiguration();
          return toPublicResponse(r.error, latest.ok ? latest.value : undefined);
        }
        return toPublicResponse(r.error);
      },
    },
    {
      method: "POST",
      pattern: new RegExp(`^/api/days/${DATE}/images$`),
      handler: async (req, [date]) => {
        const version = readVersion(headerVersion(req));
        if (!version.ok) return toPublicResponse(version.error);
        const r = await services.images.attachImage(date!, req.body ?? new Uint8Array(), version.value);
        return monthResult(r, yearMonthOf(date!));
      },
    },
    {
      method: "GET",
      pattern: new RegExp(`^/api/images/${DATE}/${ID}$`),
      handler: async (_req, [date, imageId]) => {
        const r = await services.images.readImage(date!, imageId!);
        if (!r.ok) return toPublicResponse(r.error);
        return {
          status: 200,
          // imageIdは不変なので端末内で1日キャッシュする（NFR Design Q4）
          headers: { "content-type": r.value.contentType, "cache-control": "private, max-age=86400" },
          body: r.value.body,
        };
      },
    },
    {
      method: "DELETE",
      pattern: new RegExp(`^/api/days/${DATE}/images/${ID}$`),
      handler: async (req, [date, imageId]) => {
        const version = readVersion(headerVersion(req));
        if (!version.ok) return toPublicResponse(version.error);
        return monthResult(await services.images.removeImage(date!, imageId!, version.value), yearMonthOf(date!));
      },
    },
  ];

  return async (req) => {
    try {
      const matched = routes
        .map((route) => ({ route, m: route.pattern.exec(req.path) }))
        .filter((x): x is { route: Route; m: RegExpExecArray } => x.m !== null);
      if (matched.length === 0) return toPublicResponse({ code: "NotFound", message: "指定されたAPIはありません。" });
      const hit = matched.find((x) => x.route.method === req.method.toUpperCase());
      if (!hit) {
        return { ...jsonResponse(405, { error: { code: "ValidationError", message: "許可されていない操作です。" } }) };
      }
      return await hit.route.handler(req, hit.m.slice(1));
    } catch (e) {
      console.error(JSON.stringify({ event: "unexpected_error", error: (e as Error)?.name ?? "unknown" }));
      return toPublicResponse({ code: "UnexpectedFailure", message: "予期しないエラーが発生しました。再試行してください。" });
    }
  };
}

function parseJsonBody(req: HttpRequest): Result<Record<string, unknown>> {
  if (!req.body || req.body.length === 0) return fail("ValidationError", "リクエスト本文がありません。");
  if (req.body.length > MAX_JSON_BODY_BYTES) return fail("PayloadTooLarge", "リクエストが大きすぎます。");
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(req.body));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return fail("ValidationError", "リクエストの形式が正しくありません。");
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return fail("ValidationError", "リクエストの形式が正しくありません。");
  }
}

function headerVersion(req: HttpRequest): string | null {
  const v = req.headers[EXPECTED_VERSION_HEADER];
  return v === undefined || v === "" ? null : v;
}

function readVersion(value: unknown): Result<string | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_VERSION_LENGTH) {
    return fail("ValidationError", "版の指定が正しくありません。");
  }
  return { ok: true, value };
}

function toDayUpdate(body: Record<string, unknown>): Result<DayUpdate> {
  const update: { weightKg?: number | null; missionCompletions?: Record<string, boolean> } = {};
  if ("weightKg" in body) {
    if (body.weightKg !== null && typeof body.weightKg !== "number") {
      return fail("ValidationError", "体重は数値で入力してください。", { weightKg: "数値を入力してください" });
    }
    update.weightKg = body.weightKg as number | null;
  }
  if ("missionCompletions" in body && body.missionCompletions !== undefined) {
    const mc = body.missionCompletions;
    if (typeof mc !== "object" || mc === null || Array.isArray(mc)) {
      return fail("ValidationError", "ミッションの達成状態の形式が正しくありません。");
    }
    const entries = Object.entries(mc as Record<string, unknown>);
    if (entries.length > 15 || entries.some(([, v]) => typeof v !== "boolean")) {
      return fail("ValidationError", "ミッションの達成状態の形式が正しくありません。");
    }
    update.missionCompletions = Object.fromEntries(entries) as Record<string, boolean>;
  }
  return { ok: true, value: update };
}
