import { describe, it, expect } from "vitest";
import { extractValidLines } from "./diff";
import type { DiffChunk } from "../types";

describe("extractValidLines", () => {
  it("returns empty map for empty chunks", () => {
    const result = extractValidLines([]);
    expect(result.size).toBe(0);
  });

  it("extracts right-side line numbers from a simple hunk", () => {
    const chunks: DiffChunk[] = [{
      filename: "src/test.ts",
      patch: "@@ -1,2 +1,3 @@\n a\n b\n+new line\n",
    }];
    const result = extractValidLines(chunks);
    const lines = result.get("src/test.ts");
    expect(lines).toBeDefined();
    expect(lines!.has(1)).toBe(true);
    expect(lines!.has(2)).toBe(true);
    expect(lines!.has(3)).toBe(true);
    expect(lines!.size).toBe(3);
  });

  it("tracks right-line counter across context and added lines", () => {
    const chunks: DiffChunk[] = [{
      filename: "f.ts",
      patch: "@@ -5,4 +5,5 @@\n context\n context\n+added\n context\n context\n",
    }];
    const result = extractValidLines(chunks);
    const lines = result.get("f.ts")!;
    expect(lines.has(5)).toBe(true);  // context
    expect(lines.has(6)).toBe(true);  // context
    expect(lines.has(7)).toBe(true);  // added
    expect(lines.has(8)).toBe(true);  // context
    expect(lines.has(9)).toBe(true);  // context
    expect(lines.size).toBe(5);
  });

  it("does not include deleted lines on the right side", () => {
    const chunks: DiffChunk[] = [{
      filename: "f.ts",
      patch: "@@ -1,3 +1,2 @@\n unchanged\n-removed\n unchanged\n",
    }];
    const result = extractValidLines(chunks);
    const lines = result.get("f.ts")!;
    expect(lines.has(1)).toBe(true);         // unchanged → right line 1
    expect(lines.has(2)).toBe(true);         // unchanged (old line 3) → right line 2
    expect(lines.size).toBe(2);               // only 2 lines on the right side
  });

  it("handles multiple hunks in one file", () => {
    const chunks: DiffChunk[] = [{
      filename: "f.ts",
      patch: "@@ -1,2 +1,2 @@\n a\n b\n@@ -10,2 +10,3 @@\n c\n d\n+e\n",
    }];
    const result = extractValidLines(chunks);
    const lines = result.get("f.ts")!;
    expect(lines.has(1)).toBe(true);
    expect(lines.has(2)).toBe(true);
    expect(lines.has(10)).toBe(true);
    expect(lines.has(11)).toBe(true);
    expect(lines.has(12)).toBe(true);
    expect(lines.size).toBe(5);
  });

  it("handles multiple files", () => {
    const chunks: DiffChunk[] = [
      { filename: "a.ts", patch: "@@ -1 +1 @@\n x\n" },
      { filename: "b.ts", patch: "@@ -1 +1,2 @@\n y\n+z\n" },
    ];
    const result = extractValidLines(chunks);
    expect(result.get("a.ts")!.size).toBe(1);
    expect(result.get("b.ts")!.size).toBe(2);
  });

  it("ignores diff headers outside hunks", () => {
    const chunks: DiffChunk[] = [{
      filename: "f.ts",
      patch: "diff --git a/f.ts b/f.ts\nindex abc..def 100644\n--- a/f.ts\n+++ b/f.ts\n@@ -1,2 +1,3 @@\n a\n b\n+c\n",
    }];
    const result = extractValidLines(chunks);
    const lines = result.get("f.ts")!;
    expect(lines.has(1)).toBe(true);
    expect(lines.has(2)).toBe(true);
    expect(lines.has(3)).toBe(true);
    expect(lines.size).toBe(3);
  });
});
