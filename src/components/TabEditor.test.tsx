import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TabEditor } from "./TabEditor";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

function Harness() {
  const [tab, setTab] = useState<Column[]>([{ notes: [] }]);
  return <TabEditor tab={tab} tuning={STANDARD_TUNING} onChange={setTab} />;
}

describe("TabEditor", () => {
  it("adds a column when '+' is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // 초기 1칸 → 셀 버튼 6개(6줄). + 누르면 12개.
    await user.click(screen.getByRole("button", { name: "칸 추가" }));
    const cells = screen.getAllByRole("button", { name: /^string-\d-col-\d$/ });
    expect(cells.length).toBe(12);
  });

  it("calls onChange when a fret is entered into a cell", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TabEditor tab={[{ notes: [] }]} tuning={STANDARD_TUNING} onChange={onChange} />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await user.click(cell);
    await user.keyboard("7");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalled();
  });
});
