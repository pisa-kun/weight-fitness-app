import { useRef, useState } from "react";
import { MAX_IMAGES_PER_DAY } from "../../domain/images";
import type { ImageDto } from "../../shared/api-contract";
import { validateSelectedImage } from "../image-prep";

/** 日付ごとに0〜2枚の食事画像を表示・追加・個別削除する（US-07） */
export function FoodImageGallery({
  date,
  images,
  imageUrl,
  onAdd,
  onDelete,
  confirm = (message) => window.confirm(message),
}: {
  date: string;
  images: readonly ImageDto[];
  imageUrl: (date: string, imageId: string) => string;
  onAdd: (file: File) => Promise<boolean>;
  onDelete: (imageId: string) => Promise<boolean>;
  confirm?: (message: string) => boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const full = images.length >= MAX_IMAGES_PER_DAY;

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="gallery" data-testid="food-image-gallery">
      <h3 className="section-title">
        食事の画像（{images.length}/{MAX_IMAGES_PER_DAY}）
      </h3>
      <ul className="gallery-list">
        {images.map((img, index) => (
          <li key={img.imageId} className="gallery-item">
            <img src={imageUrl(date, img.imageId)} alt={`${date}の食事画像${index + 1}`} loading="lazy" />
            <button
              type="button"
              className="button button-small button-danger"
              disabled={busy}
              onClick={() => {
                if (!confirm(`${date}の食事画像${index + 1}を削除します。よろしいですか？`)) return;
                void run(() => onDelete(img.imageId));
              }}
              data-testid={`food-image-delete-button-${index}`}
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      {full ? (
        <p className="hint" data-testid="food-image-limit-notice">
          この日は上限の{MAX_IMAGES_PER_DAY}枚に達しています。追加するには画像を削除してください。
        </p>
      ) : (
        <div>
          <label className={`button${busy ? " is-disabled" : ""}`} data-testid="food-image-add-label">
            画像を追加
            <input
              ref={inputRef}
              className="visually-hidden-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (inputRef.current) inputRef.current.value = "";
                if (!file) return;
                const reason = validateSelectedImage(file);
                setError(reason);
                if (reason) return;
                void run(() => onAdd(file));
              }}
              data-testid="food-image-file-input"
            />
          </label>
          <p className="hint">JPEG・PNG・WebP、10 MBまで。大きな画像は端末内で縮小してから保存します（元の画像は保存しません）。</p>
        </div>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
