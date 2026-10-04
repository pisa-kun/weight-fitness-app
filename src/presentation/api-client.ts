import type { AppErrorCode } from "../domain/result";
import {
  EXPECTED_VERSION_HEADER,
  type ApiErrorBody,
  type ConfigureMissionsRequest,
  type MissionConfigView,
  type MonthView,
  type SaveDayRequest,
  type SaveGoalRequest,
} from "../shared/api-contract";

// ブラウザー → バックエンドAPI。S3へは直接アクセスしない（FR-08, BR-21）

export class ApiError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, string>>,
    readonly latest?: ApiErrorBody["latest"],
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = "通信に失敗しました。未保存です。通信状態を確認して再試行してください。";

/** CloudFront OAC経由でLambda URLへPOST/PUTする際に必要な本文のSHA-256 */
async function sha256Hex(body: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", body);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function request<T>(
  method: string,
  path: string,
  options: { json?: unknown; binary?: Blob; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  let body: ArrayBuffer | undefined;
  if (options.json !== undefined) {
    body = new TextEncoder().encode(JSON.stringify(options.json)).buffer as ArrayBuffer;
    headers["content-type"] = "application/json";
  } else if (options.binary) {
    body = await options.binary.arrayBuffer();
    headers["content-type"] = options.binary.type || "application/octet-stream";
  }
  if (body !== undefined) headers["x-amz-content-sha256"] = await sha256Hex(body);

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, cache: "no-store" });
  } catch {
    throw new ApiError("StorageFailure", NETWORK_MESSAGE);
  }
  if (res.ok) return (await res.json()) as T;

  let parsed: ApiErrorBody | null = null;
  try {
    parsed = (await res.json()) as ApiErrorBody;
  } catch {
    parsed = null;
  }
  if (parsed?.error) {
    throw new ApiError(parsed.error.code, parsed.error.message, parsed.error.details, parsed.latest);
  }
  throw new ApiError(res.status === 413 ? "PayloadTooLarge" : "StorageFailure", NETWORK_MESSAGE);
}

export const api = {
  getMonth: (ym: string) => request<MonthView>("GET", `/api/months/${ym}`),
  saveDay: (date: string, req: SaveDayRequest) => request<MonthView>("PUT", `/api/days/${date}`, { json: req }),
  saveGoal: (ym: string, req: SaveGoalRequest) => request<MonthView>("PUT", `/api/months/${ym}/goal`, { json: req }),
  configureMissions: (req: ConfigureMissionsRequest) => request<MissionConfigView>("PUT", "/api/missions", { json: req }),
  uploadImage: (date: string, image: Blob, expectedVersion: string | null) =>
    request<MonthView>("POST", `/api/days/${date}/images`, {
      binary: image,
      headers: expectedVersion ? { [EXPECTED_VERSION_HEADER]: expectedVersion } : {},
    }),
  deleteImage: (date: string, imageId: string, expectedVersion: string | null) =>
    request<MonthView>("DELETE", `/api/days/${date}/images/${imageId}`, {
      headers: expectedVersion ? { [EXPECTED_VERSION_HEADER]: expectedVersion } : {},
    }),
  imageUrl: (date: string, imageId: string) => `/api/images/${date}/${imageId}`,
};

export type Api = typeof api;
