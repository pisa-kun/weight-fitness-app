// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/presentation/App";
import { ApiError, type Api } from "../../src/presentation/api-client";
import { CalendarDayCell } from "../../src/presentation/components/CalendarDayCell";
import { FoodImageGallery } from "../../src/presentation/components/FoodImageGallery";
import { MissionEditor } from "../../src/presentation/components/MissionEditor";
import type { DayView, MonthView } from "../../src/shared/api-contract";

afterEach(cleanup);

const day = (patch: Partial<DayView> = {}): DayView => ({
  date: "2026-10-04",
  weightKg: null,
  missions: null,
  images: [],
  isComplete: false,
  hasRecord: false,
  ...patch,
});

describe("CalendarDayCell（例ベース, US-06）", () => {
  it("完了日は完了クラスと✓、当日は当日クラスを持ち、読み上げラベルに状態を含む", () => {
    render(<CalendarDayCell day={day({ isComplete: true, weightKg: 65, hasRecord: true })} isToday onSelect={() => {}} />);
    const cell = screen.getByTestId("calendar-day-2026-10-04");
    expect(cell.className).toContain("is-complete");
    expect(cell.className).toContain("is-today");
    expect(cell.getAttribute("aria-label")).toContain("完了");
    expect(cell.getAttribute("aria-label")).toContain("体重65.0kg");
    expect(cell.textContent).toContain("✓");
  });
});

describe("MissionEditor（例ベース, US-04）", () => {
  it("空の名称は保存せず項目エラーを表示する", async () => {
    const onSave = vi.fn(async () => true);
    render(<MissionEditor initial={[]} mode="setup" onSave={onSave} />);
    fireEvent.click(screen.getByTestId("mission-editor-save-button"));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "名称を入力してください");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("最後の1件は削除できず、15件で追加できなくなる", () => {
    render(<MissionEditor initial={[]} mode="setup" onSave={async () => true} />);
    expect((screen.getByTestId("mission-editor-remove-button-0") as HTMLButtonElement).disabled).toBe(true);
    const add = screen.getByTestId("mission-editor-add-button") as HTMLButtonElement;
    for (let i = 0; i < 14; i++) fireEvent.click(add);
    expect(add.disabled).toBe(true);
  });

  it("運動目標を含めて保存する", async () => {
    const onSave = vi.fn(async () => true);
    render(<MissionEditor initial={[]} mode="setup" onSave={onSave} />);
    fireEvent.change(screen.getByTestId("mission-editor-title-input-0"), { target: { value: "ランニング" } });
    fireEvent.change(screen.getByTestId("mission-editor-target-input-0"), { target: { value: "30分" } });
    fireEvent.click(screen.getByTestId("mission-editor-exercise-checkbox-0"));
    fireEvent.click(screen.getByTestId("mission-editor-save-button"));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([{ missionId: null, title: "ランニング", kind: "exercise", target: "30分" }]),
    );
  });
});

describe("FoodImageGallery（例ベース, US-07）", () => {
  it("削除は確認でキャンセルされたら依頼しない", () => {
    const onDelete = vi.fn(async () => true);
    render(
      <FoodImageGallery
        date="2026-10-04"
        images={[{ imageId: "00000000-0000-4000-8000-000000000001", contentType: "image/jpeg", sizeBytes: 1 }]}
        imageUrl={() => "/x"}
        onAdd={async () => true}
        onDelete={onDelete}
        confirm={() => false}
      />,
    );
    fireEvent.click(screen.getByTestId("food-image-delete-button-0"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("2枚登録済みなら追加できない旨を表示する", () => {
    const images = [1, 2].map((n) => ({ imageId: `00000000-0000-4000-8000-00000000000${n}`, contentType: "image/jpeg", sizeBytes: 1 }));
    render(<FoodImageGallery date="2026-10-04" images={images} imageUrl={() => "/x"} onAdd={async () => true} onDelete={async () => true} />);
    expect(screen.getByTestId("food-image-limit-notice")).toBeTruthy();
    expect(screen.queryByTestId("food-image-file-input")).toBeNull();
  });

  it("非対応形式・10 MB超は理由を示して拒否する", () => {
    const onAdd = vi.fn(async () => true);
    render(<FoodImageGallery date="2026-10-04" images={[]} imageUrl={() => "/x"} onAdd={onAdd} onDelete={async () => true} />);
    const input = screen.getByTestId("food-image-file-input");
    fireEvent.change(input, { target: { files: [new File(["x"], "a.gif", { type: "image/gif" })] } });
    expect(screen.getByRole("alert").textContent).toContain("JPEG");
    const big = new File(["x"], "a.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(screen.getByRole("alert").textContent).toContain("10 MB");
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("App（例ベース, US-04/US-08/US-09）", () => {
  const monthView = (patch: Partial<MonthView> = {}): MonthView => ({
    month: "2026-10",
    version: '"v1"',
    monthlyGoal: null,
    today: "2026-10-04",
    days: Array.from({ length: 31 }, (_, i) => day({ date: `2026-10-${String(i + 1).padStart(2, "0")}` })),
    missionConfiguration: {
      setupDate: "2026-10-01",
      revision: 1,
      definitions: [{ missionId: "a", title: "腹筋", kind: "mission", target: null }],
      version: '"c1"',
    },
    ...patch,
  });

  const fakeApi = (overrides: Partial<Api>): Api => ({
    getMonth: async () => monthView(),
    saveDay: async () => monthView(),
    saveGoal: async () => monthView(),
    configureMissions: async () => monthView().missionConfiguration!,
    uploadImage: async () => monthView(),
    deleteImage: async () => monthView(),
    imageUrl: () => "/x",
    ...overrides,
  });

  it("ミッション未設定なら初回登録を表示し、未認証アクセスの注意を常時表示する", async () => {
    render(<App api={fakeApi({ getMonth: async () => monthView({ missionConfiguration: null }) })} />);
    expect(await screen.findByTestId("mission-setup-gate")).toBeTruthy();
    expect(screen.queryByTestId("calendar-page")).toBeNull();
    expect(screen.getByTestId("app-footer-access-notice").textContent).toContain("URLを知っている人");
  });

  it("保存がConflictなら未保存を示し、草稿を再適用して保存できる", async () => {
    const saveDay = vi
      .fn<Api["saveDay"]>()
      .mockRejectedValueOnce(new ApiError("Conflict", "他の端末で更新されています。", undefined, monthView({ version: '"v2"' })))
      .mockResolvedValueOnce(monthView({ version: '"v3"' }));
    const getMonth = vi.fn(async () => monthView({ version: '"v2"' }));
    render(<App api={fakeApi({ saveDay, getMonth })} />);

    fireEvent.click(await screen.findByTestId("calendar-day-2026-10-04"));
    fireEvent.change(screen.getByTestId("weight-entry-input"), { target: { value: "64.5" } });
    await act(async () => {
      fireEvent.click(screen.getByTestId("weight-entry-save-button"));
    });
    expect(await screen.findByTestId("conflict-notice")).toBeTruthy();
    expect(screen.getByTestId("operation-feedback-error")).toBeTruthy();
    expect((screen.getByTestId("weight-entry-input") as HTMLInputElement).value).toBe("64.5");

    await act(async () => {
      fireEvent.click(screen.getByTestId("conflict-notice-reapply-button"));
    });
    await waitFor(() => expect(saveDay).toHaveBeenCalledTimes(2));
    expect(saveDay.mock.calls[1]![1]).toEqual({ weightKg: 64.5, expectedVersion: '"v2"' });
    await waitFor(() => expect(screen.queryByTestId("conflict-notice")).toBeNull());
  });
});
