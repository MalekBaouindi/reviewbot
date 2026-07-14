import { describe, it, expect } from "vitest";
import { extractContextWindows } from "./context";

describe("extractContextWindows", () => {
  it("returns full content for small files", () => {
    const content = "line1\nline2\nline3";
    const changed = new Set([1]);
    const result = extractContextWindows(content, changed);
    expect(result).toBe("line1\nline2\nline3");
  });

  it("returns null when changed lines set is empty", () => {
    const content = "line1\nline2\nline3";
    const changed = new Set<number>();
    const result = extractContextWindows(content, changed);
    expect(result).toBeNull();
  });

  it("returns context windows for large files", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 500; i++) {
      lines.push(`line${i}`);
    }
    const content = lines.join("\n");
    const changed = new Set([100]);

    const result = extractContextWindows(content, changed);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThan(content.length);
    expect(result).toContain("line85");   // 100 - 15
    expect(result).toContain("line100");
    expect(result).toContain("line115");   // 100 + 15
  });

  it("merges nearby changed regions into one window", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 500; i++) {
      lines.push(`line${i}`);
    }
    const content = lines.join("\n");
    const changed = new Set([100, 105, 110]);

    const result = extractContextWindows(content, changed);
    const windows = result!.split("// ---");
    expect(windows.length).toBe(1);
  });

  it("creates separate windows for far apart changes", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 500; i++) {
      lines.push(`line${i}`);
    }
    const content = lines.join("\n");
    const changed = new Set([100, 400]);

    const result = extractContextWindows(content, changed);
    const windows = result!.split("// ---");
    expect(windows.length).toBeGreaterThanOrEqual(2);
  });

  it("returns null when no changed lines match", () => {
    const content = "line1\nline2\nline3\n";
    const changed = new Set([10]);
    const result = extractContextWindows(content, changed);
    expect(result).toBeNull();
  });

  it("handles empty content", () => {
    const content = "";
    const changed = new Set([1]);
    const result = extractContextWindows(content, changed);
    expect(result).toBeNull();
  });
});
