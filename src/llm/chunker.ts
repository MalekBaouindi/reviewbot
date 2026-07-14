import type { DiffChunk } from "../types";

const MAX_PROMPT_CHARS = 400_000;

export function batchChunks(chunks: DiffChunk[]): DiffChunk[][] {
  const batches: DiffChunk[][] = [];
  let current: DiffChunk[] = [];
  let currentSize = 0;

  for (const chunk of chunks) {
    const chunkSize = chunk.patch.length + chunk.filename.length + 100;

    if (currentSize + chunkSize > MAX_PROMPT_CHARS && current.length > 0) {
      batches.push(current);
      current = [];
      currentSize = 0;
    }

    current.push(chunk);
    currentSize += chunkSize;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}
