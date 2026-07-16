import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    // Starts with 1 column → 6 cell buttons (6 strings). After '+', 12.
    await user.click(screen.getByRole("button", { name: "Add column" }));
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

  it("shows the typed digit immediately, before any commit key", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await user.click(cell);
    await user.keyboard("7");
    // Should appear in the cell immediately, even without Enter
    expect(cell).toHaveTextContent("7");
  });

  it("accumulates two digits into a single fret (e.g. 12)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await user.click(cell);
    await user.keyboard("12");
    expect(cell).toHaveTextContent("12");
  });

  it("applies an articulation to the active note via the toolbar button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await user.click(cell);
    await user.keyboard("7");
    // Disabled before a note exists; clicking after creating one applies it
    const vibrato = screen.getByRole("button", { name: "Vibrato" });
    expect(vibrato).toBeEnabled();
    await user.click(vibrato);
    expect(cell).toHaveTextContent("7~");
    expect(vibrato).toHaveAttribute("aria-pressed", "true");
  });

  it("disables toolbar buttons when no note is selected", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Full bend" })).toBeDisabled();
  });

  it("focuses the hidden numeric input when a cell is tapped (mobile keypad)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "string-2-col-0" }));
    const input = screen.getByLabelText("Fret number input");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  it("applies a digit from a soft-keyboard input event", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await user.click(cell);
    const input = screen.getByLabelText("Fret number input") as HTMLInputElement;
    // Mobile soft keypads arrive via the input event
    fireEvent.input(input, { target: { value: "9" } });
    expect(cell).toHaveTextContent("9");
  });
});

describe("transpose buttons", () => {
  it("shifts a note up a semitone through onChange", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const cell = screen.getByRole("button", { name: "string-2-col-0" });
    await user.click(cell);
    await user.keyboard("7");
    await user.click(screen.getByRole("button", { name: "Transpose up a semitone" }));
    expect(cell).toHaveTextContent("8");
  });

  it("disables both buttons when the tab has no notes", () => {
    render(<TabEditor tab={[{ notes: [] }]} tuning={STANDARD_TUNING} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Transpose up a semitone" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Transpose down a semitone" })).toBeDisabled();
  });

  it("disables − when a note sits on fret 0, keeps + enabled", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "string-2-col-0" }));
    await user.keyboard("0");
    expect(screen.getByRole("button", { name: "Transpose down a semitone" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Transpose up a semitone" })).toBeEnabled();
  });
});
