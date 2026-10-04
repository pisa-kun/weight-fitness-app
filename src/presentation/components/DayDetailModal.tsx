import { useEffect, useRef, type ReactNode } from "react";
import type { DayView } from "../../shared/api-contract";
import { FoodImageGallery } from "./FoodImageGallery";
import { MissionChecklist } from "./MissionChecklist";
import { WeightEntryForm } from "./WeightEntryForm";

/** 選択日のミッション・体重・画像を表示・更新するモーダル（FR-05, US-06） */
export function DayDetailModal({
  day,
  imageUrl,
  notice,
  onClose,
  onSaveWeight,
  onToggleMission,
  onAddImage,
  onDeleteImage,
}: {
  day: DayView;
  imageUrl: (date: string, imageId: string) => string;
  notice?: ReactNode;
  onClose: () => void;
  onSaveWeight: (weightKg: number | null) => Promise<boolean>;
  onToggleMission: (missionId: string, completed: boolean) => Promise<boolean>;
  onAddImage: (file: File) => Promise<boolean>;
  onDeleteImage: (imageId: string) => Promise<boolean>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // jsdom等showModal未対応の環境ではopen属性で代替する
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
    };
  }, []);

  const [, m, d] = day.date.split("-");
  return (
    <dialog
      ref={ref}
      className="day-modal"
      aria-labelledby="day-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      data-testid="day-detail-modal"
    >
      <div className="modal-header">
        <h2 id="day-modal-title" className="panel-title">
          {Number(m)}月{Number(d)}日の記録 {day.isComplete && <span className="badge-complete">✓ 完了</span>}
        </h2>
        <button type="button" className="button button-small" onClick={onClose} data-testid="day-detail-close-button">
          閉じる
        </button>
      </div>
      {notice}
      <WeightEntryForm date={day.date} weightKg={day.weightKg} onSave={onSaveWeight} />
      <MissionChecklist missions={day.missions} onToggle={onToggleMission} />
      <FoodImageGallery date={day.date} images={day.images} imageUrl={imageUrl} onAdd={onAddImage} onDelete={onDeleteImage} />
    </dialog>
  );
}
