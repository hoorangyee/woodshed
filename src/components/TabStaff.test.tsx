import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TabStaff } from "./TabStaff";
import { STANDARD_TUNING, type Column } from "@/lib/tab/types";

const TAB: Column[] = [{ notes: [{ string: 0, fret: 3 }] }, { notes: [] }];

describe("TabStaff playhead", () => {
  it("renders no highlight without activeColumn", () => {
    const { container } = render(<TabStaff tab={TAB} tuning={STANDARD_TUNING} />);
    expect(container.querySelector("svg rect")).toBeNull();
  });

  it("highlights the active column at its x position", () => {
    const { container } = render(
      <TabStaff tab={TAB} tuning={STANDARD_TUNING} activeColumn={1} />,
    );
    const rect = container.querySelector("svg rect");
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute("x")).toBe("46"); // column 1 × COL_W (46)
    expect(rect!.getAttribute("width")).toBe("46");
  });

  it("ignores an out-of-range activeColumn", () => {
    const { container } = render(
      <TabStaff tab={TAB} tuning={STANDARD_TUNING} activeColumn={5} />,
    );
    expect(container.querySelector("svg rect")).toBeNull();
  });
});
