import type { LocalDate } from "./dates";

// 食事画像の制約（BR-12, BR-13, NFR-U-08）

export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

/** 利用者が選択できる元画像の上限（FR-06: 1枚10 MB） */
export const MAX_SELECTABLE_IMAGE_BYTES = 10 * 1024 * 1024;
/** バックエンドへ転送・保存する画像の上限（Lambdaのペイロード制約による, NFR-U-08） */
export const MAX_STORED_IMAGE_BYTES = 3_500_000;
export const MAX_IMAGES_PER_DAY = 2;

export interface FoodImageReference {
  readonly imageId: string;
  /** バックエンドだけが利用する非公開S3キー */
  readonly objectKey: string;
  readonly contentType: ImageContentType;
  readonly sizeBytes: number;
  readonly attachedDate: LocalDate;
}

const IMAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidImageId(value: unknown): value is string {
  return typeof value === "string" && IMAGE_ID_PATTERN.test(value);
}

export function isImageContentType(value: unknown): value is ImageContentType {
  return typeof value === "string" && (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

/** 日付とimageIdから決定的に求める画像オブジェクトキー（削除の冪等再試行に使う） */
export function imageObjectKey(date: LocalDate, imageId: string): string {
  return `images/${date}/${imageId}`;
}

/** 先頭バイト（マジックバイト）から画像形式を判定する。宣言されたContent-Typeは信用しない */
export function detectImageContentType(bytes: Uint8Array): ImageContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
