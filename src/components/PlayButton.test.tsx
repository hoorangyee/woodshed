import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayButton } from "./PlayButton";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

const { stopMock, playMock } = vi.hoisted(() => ({
  stopMock: vi.fn(),
  playMock: vi.fn(),
}));

vi.mock("@/lib/audio/player", () => ({
  isAudioSupported: () => true,
  playLick: playMock,
}));

const TAB: Column[] = [{ notes: [{ string: 0, fret: 3 }] }];

describe("PlayButton", () => {
  beforeEach(() => {
    stopMock.mockClear();
    playMock.mockReset();
    playMock.mockReturnValue({
      stop: stopMock,
      release: vi.fn(),
      startTime: 0,
      columnDuration: 1 / 3,
      totalDuration: 1 / 3,
      currentTime: () => 0,
    });
  });

  it("toggles to stop while playing, and stops on second click", async () => {
    const user = userEvent.setup();
    render(<PlayButton tab={TAB} tuning={STANDARD_TUNING} />);
    await user.click(await screen.findByRole("button", { name: "Play lick" }));
    expect(playMock).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(stopMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Play lick" })).toBeInTheDocument();
  });

  it("reports the active column while playing", async () => {
    const user = userEvent.setup();
    const onActive = vi.fn();
    render(<PlayButton tab={TAB} tuning={STANDARD_TUNING} onActiveColumn={onActive} />);
    await user.click(await screen.findByRole("button", { name: "Play lick" }));
    await vi.waitFor(() => expect(onActive).toHaveBeenCalledWith(0));
  });

  it("is disabled when the tab has no sounding notes", async () => {
    render(
      <PlayButton tab={[{ notes: [] }, { notes: [], whiskey: true }]} tuning={STANDARD_TUNING} />,
    );
    expect(await screen.findByRole("button", { name: "Play lick" })).toBeDisabled();
  });

  it("keeps reporting through the latest onActiveColumn after a rerender", async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <PlayButton tab={TAB} tuning={STANDARD_TUNING} onActiveColumn={first} />,
    );
    await user.click(await screen.findByRole("button", { name: "Play lick" }));
    rerender(<PlayButton tab={TAB} tuning={STANDARD_TUNING} onActiveColumn={second} />);
    first.mockClear();
    await vi.waitFor(() => expect(second).toHaveBeenCalledWith(0));
    expect(first).not.toHaveBeenCalled();
  });
});
