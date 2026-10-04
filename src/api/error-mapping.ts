import type { AppError, AppErrorCode } from "../domain/result";
import type { ApiErrorBody } from "../shared/api-contract";
import { jsonResponse, type HttpResponse } from "./http";

// C-07: 型付きエラー → 安全な利用者向け応答（NFR-U-10）

const STATUS: Record<AppErrorCode, number> = {
  ValidationError: 400,
  NotFound: 404,
  Conflict: 409,
  UnsupportedImage: 415,
  PayloadTooLarge: 413,
  StorageFailure: 503,
  PartialDeletionFailure: 503,
  UnexpectedFailure: 500,
};

export function statusOf(code: AppErrorCode): number {
  return STATUS[code];
}

export function toPublicResponse(error: AppError, latest?: ApiErrorBody["latest"]): HttpResponse {
  const body: ApiErrorBody = {
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    ...(latest !== undefined ? { latest } : {}),
  };
  return jsonResponse(statusOf(error.code), body);
}
