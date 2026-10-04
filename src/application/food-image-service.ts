import { isValidLocalDate, yearMonthOf, type LocalDate } from "../domain/dates";
import { addImageReference, removeImageReference } from "../domain/day-logic";
import {
  detectImageContentType,
  imageObjectKey,
  isValidImageId,
  MAX_IMAGES_PER_DAY,
  MAX_STORED_IMAGE_BYTES,
  type FoodImageReference,
} from "../domain/images";
import { fail, ok, type Result } from "../domain/result";
import type { ImageContent } from "../infrastructure/repositories";
import type { MonthView } from "../shared/api-contract";
import { checkVersion, loadMonthState, viewOf, type ServiceContext } from "./context";

/** 食事画像の追加・取得・個別削除（US-07）。月JSON参照とS3オブジェクトを整合させる */
export class FoodImageService {
  constructor(private readonly ctx: ServiceContext) {}

  async attachImage(date: LocalDate, body: Uint8Array, expectedVersion: string | null): Promise<Result<MonthView>> {
    if (!isValidLocalDate(date)) return fail("ValidationError", "日付が正しくありません。");
    if (body.length === 0) return fail("UnsupportedImage", "画像を選択してください。");
    if (body.length > MAX_STORED_IMAGE_BYTES) {
      return fail("PayloadTooLarge", "画像のサイズが大きすぎます。別の画像を選択してください。");
    }
    const contentType = detectImageContentType(body);
    if (!contentType) return fail("UnsupportedImage", "JPEG、PNG、WebPの画像のみ追加できます。");

    const ym = yearMonthOf(date);
    const state = await loadMonthState(this.ctx, ym);
    if (!state.ok) return state;
    const version = checkVersion(state.value.month.version, expectedVersion);
    if (!version.ok) return version;
    // 既存記録を変更する前に枚数上限を確認する（BR-13）
    if ((state.value.month.value.days[date]?.images.length ?? 0) >= MAX_IMAGES_PER_DAY) {
      return fail("ValidationError", `画像は1日${MAX_IMAGES_PER_DAY}枚までです。`, { image: "上限に達しています" });
    }

    const imageId = this.ctx.newId();
    const ref: FoodImageReference = {
      imageId,
      objectKey: imageObjectKey(date, imageId),
      contentType,
      sizeBytes: body.length,
      attachedDate: date,
    };
    const next = addImageReference(state.value.month.value, ref, state.value.config.value);
    if (!next.ok) return next;

    const put = await this.ctx.images.putImage(ref.objectKey, body, contentType);
    if (!put.ok) return put;
    const written = await this.ctx.months.writeMonth(ym, next.value, expectedVersion);
    if (!written.ok) {
      // 補償: 参照を記録できなかった画像オブジェクトを残さない
      await this.ctx.images.deleteImage(ref.objectKey);
      return written;
    }
    return ok(viewOf(this.ctx, ym, state.value, next.value, written.value));
  }

  async readImage(date: LocalDate, imageId: string): Promise<Result<ImageContent>> {
    if (!isValidLocalDate(date) || !isValidImageId(imageId)) return fail("NotFound", "画像が見つかりません。");
    const month = await this.ctx.months.readMonth(yearMonthOf(date));
    if (!month.ok) return month;
    const ref = month.value.value.days[date]?.images.find((i) => i.imageId === imageId);
    if (!ref) return fail("NotFound", "画像が見つかりません。");
    const content = await this.ctx.images.readImage(ref.objectKey);
    if (!content.ok) return content;
    return ok({ body: content.value.body, contentType: ref.contentType });
  }

  /**
   * 個別削除（BR-14）: 月JSONから参照を除去 → オブジェクト削除。
   * 参照が既に無い場合（前回の部分失敗の再試行）は決定的キーのオブジェクトを冪等に削除する。
   */
  async removeImage(date: LocalDate, imageId: string, expectedVersion: string | null): Promise<Result<MonthView>> {
    if (!isValidLocalDate(date) || !isValidImageId(imageId)) return fail("NotFound", "画像が見つかりません。");
    const ym = yearMonthOf(date);
    const state = await loadMonthState(this.ctx, ym);
    if (!state.ok) return state;
    const version = checkVersion(state.value.month.version, expectedVersion);
    if (!version.ok) return version;

    const { doc, removed } = removeImageReference(state.value.month.value, date, imageId);
    let newVersion = state.value.month.version;
    if (removed) {
      const written = await this.ctx.months.writeMonth(ym, doc, expectedVersion);
      if (!written.ok) return written;
      newVersion = written.value;
    }
    const deleted = await this.ctx.images.deleteImage(imageObjectKey(date, imageId));
    if (!deleted.ok) {
      return fail("PartialDeletionFailure", "画像の削除が完了しませんでした。もう一度削除してください。");
    }
    return ok(viewOf(this.ctx, ym, state.value, doc, newVersion));
  }
}
