import { describe, it, expect } from "vitest";
import { buildPrompt } from "./prompt";
import type { DiffChunk } from "../types";

describe("buildPrompt", () => {
  it("returns empty prompt for no chunks", () => {
    const result = buildPrompt([]);
    expect(result).toContain("No changed files");
  });

  it("includes file names in diff sections", () => {
    const chunks: DiffChunk[] = [
      { filename: "src/test.ts", patch: "diff --git a/src/test.ts b/src/test.ts\n@@ -1 +1,2 @@\n old\n+new\n" },
    ];
    const result = buildPrompt(chunks);
    expect(result).toContain("src/test.ts");
    expect(result).toContain("+new");
    expect(result).toContain("```diff");
  });

  it("includes system instructions", () => {
    const chunks: DiffChunk[] = [
      { filename: "f.ts", patch: "diff --git a/f.ts b/f.ts\n@@ -1 +1 @@\n a\n" },
    ];
    const result = buildPrompt(chunks);
    expect(result).toContain("senior software engineer");
    expect(result).toContain("strict JSON");
    expect(result).toContain("blocking");
  });

  it("handles multiple chunks", () => {
    const chunks: DiffChunk[] = [
      { filename: "a.ts", patch: "diff --git a/a.ts b/a.ts\n@@ -1 +1 @@\n a\n" },
      { filename: "b.ts", patch: "diff --git a/b.ts b/b.ts\n@@ -1 +1 @@\n b\n" },
    ];
    const result = buildPrompt(chunks);
    expect(result).toContain("a.ts");
    expect(result).toContain("b.ts");
  });

  it("includes file context when provided", () => {
    const chunks: DiffChunk[] = [
      { filename: "src/test.ts", patch: "diff --git a/src/test.ts b/src/test.ts\n@@ -1 +1,2 @@\n old\n+new\n" },
    ];
    const ctx = new Map();
    ctx.set("src/test.ts", { filename: "src/test.ts", context: "// existing code\nfunction foo() {}\n", totalLines: 3 });

    const result = buildPrompt(chunks, ctx);
    expect(result).toContain("### Context: src/test.ts");
    expect(result).toContain("function foo");
    expect(result).toContain("### File: src/test.ts");
    expect(result).toContain("+new");
  });

  it("includes only context for files in the batch", () => {
    const chunks: DiffChunk[] = [
      { filename: "a.ts", patch: "diff --git a/a.ts b/a.ts\n@@ -1 +1 @@\n a\n" },
    ];
    const ctx = new Map();
    ctx.set("a.ts", { filename: "a.ts", context: "a content", totalLines: 1 });
    ctx.set("b.ts", { filename: "b.ts", context: "b content", totalLines: 1 });

    const result = buildPrompt(chunks, ctx);
    expect(result).toContain("a content");
    expect(result).not.toContain("b content");
  });

  it("says return nothing when no chunks", () => {
    const result = buildPrompt([]);
    expect(result).toContain("Return empty findings");
  });
});
