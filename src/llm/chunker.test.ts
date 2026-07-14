import { describe, it, expect } from "vitest";
import { batchChunks } from "./chunker";
import type { DiffChunk } from "../types";

describe("batchChunks", () => {
  it("returns single batch for small input", () => {
    const chunks: DiffChunk[] = [
      { filename: "a.ts", patch: "short patch" },
    ];
    const batches = batchChunks(chunks);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
  });

  it("returns empty for empty input", () => {
    const batches = batchChunks([]);
    expect(batches).toHaveLength(0);
  });

  it("splits into multiple batches when chunks exceed limit", () => {
    const chunks: DiffChunk[] = [];
    for (let i = 0; i < 10; i++) {
      chunks.push({
        filename: `file${i}.ts`,
        patch: "a".repeat(100_000),
      });
    }
    const batches = batchChunks(chunks);
    expect(batches.length).toBeGreaterThan(1);
    const totalFiles = batches.reduce((sum, b) => sum + b.length, 0);
    expect(totalFiles).toBe(10);
  });

  it("keeps files intact within a batch (no file splitting)", () => {
    const chunks: DiffChunk[] = [
      { filename: "small.ts", patch: "tiny" },
      { filename: "huge.ts", patch: "x".repeat(500_000) },
      { filename: "small2.ts", patch: "tiny" },
    ];
    const batches = batchChunks(chunks);
    for (const batch of batches) {
      for (const chunk of batch) {
        expect(chunks.find(c => c.filename === chunk.filename)).toBeDefined();
      }
    }
    const allFiles = batches.flatMap(b => b.map(c => c.filename));
    expect(allFiles).toEqual(["small.ts", "huge.ts", "small2.ts"]);
  });

  it("puts single huge file in its own batch", () => {
    const chunks: DiffChunk[] = [
      { filename: "huge.ts", patch: "x".repeat(500_000) },
    ];
    const batches = batchChunks(chunks);
    expect(batches).toHaveLength(1);
    expect(batches[0][0].filename).toBe("huge.ts");
  });
});
