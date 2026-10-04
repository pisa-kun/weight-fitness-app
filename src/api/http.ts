// フレームワーク非依存のHTTP表現。Lambda Function URLとローカルdev-serverの両方から使う

export interface HttpRequest {
  readonly method: string;
  readonly path: string;
  /** ヘッダー名は小文字 */
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: Uint8Array | null;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | Uint8Array;
}

export const jsonResponse = (status: number, value: unknown): HttpResponse => ({
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(value),
});
