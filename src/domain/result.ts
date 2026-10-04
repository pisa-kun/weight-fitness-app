// 成功値または型付きエラーを表す共通Result型（Application Design Q5-A）

export type AppErrorCode =
  | "ValidationError"
  | "NotFound"
  | "Conflict"
  | "StorageFailure"
  | "PartialDeletionFailure"
  | "UnsupportedImage"
  | "PayloadTooLarge"
  | "UnexpectedFailure";

export interface AppError {
  readonly code: AppErrorCode;
  /** 利用者向けの日本語メッセージ。内部情報（S3キー、SDK例外）は含めない */
  readonly message: string;
  /** 項目単位の検証エラー（項目名 → メッセージ） */
  readonly details?: Readonly<Record<string, string>>;
}

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: AppError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = <T = never>(
  code: AppErrorCode,
  message: string,
  details?: Record<string, string>,
): Result<T> => ({ ok: false, error: details ? { code, message, details } : { code, message } });

export const failWith = <T = never>(error: AppError): Result<T> => ({ ok: false, error });
