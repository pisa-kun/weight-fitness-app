import { IMAGE_CONTENT_TYPES, MAX_SELECTABLE_IMAGE_BYTES, MAX_STORED_IMAGE_BYTES } from "../domain/images";

// 画像の事前確認と、転送上限に収めるための端末内縮小（NFR-U-08）

const MAX_EDGE = 2048;
const QUALITIES = [0.85, 0.75, 0.65, 0.55];
/** 透過PNGをJPEGにする際の下地色（指定パレットの色） */
const BACKGROUND = "#f0f8ff";

/** 選択された画像の形式・サイズを確認する。問題なければnull、あれば理由 */
export function validateSelectedImage(file: { type: string; size: number }): string | null {
  if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return "JPEG、PNG、WebPの画像を選択してください。";
  }
  if (file.size > MAX_SELECTABLE_IMAGE_BYTES) {
    return "10 MBを超える画像は追加できません。";
  }
  return null;
}

/** 転送上限以下ならそのまま、超える場合は長辺を縮小しJPEGへ再圧縮する */
export async function prepareImageForUpload(file: File): Promise<Blob> {
  if (file.size <= MAX_STORED_IMAGE_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  try {
    let edge = MAX_EDGE;
    for (let attempt = 0; attempt < 4; attempt++) {
      for (const quality of QUALITIES) {
        const blob = await encode(bitmap, edge, quality);
        if (blob.size <= MAX_STORED_IMAGE_BYTES) return blob;
      }
      edge = Math.floor(edge * 0.75);
    }
  } finally {
    bitmap.close();
  }
  throw new Error("画像を保存できるサイズまで小さくできませんでした。別の画像を選択してください。");
}

function encode(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("画像を処理できませんでした。"));
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像を処理できませんでした。"))), "image/jpeg", quality),
  );
}
