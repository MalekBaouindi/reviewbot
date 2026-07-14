import type { ProbotOctokit } from "probot";
import type { DiffChunk } from "../types";

const MAX_CONTEXT_FILE_LINES = 300;
const CONTEXT_WINDOW_SIZE = 15;

export async function fetchFileContent(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      ref,
    });
    const content = (data as { content?: string }).content;
    if (!content) return null;
    return Buffer.from(content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export function extractContextWindows(
  content: string,
  changedLines: Set<number>
): string | null {
  const allLines = content.split("\n");
  if (allLines.length > MAX_CONTEXT_FILE_LINES) {
    const changed = Array.from(changedLines).sort((a, b) => a - b);
    const windows: string[] = [];
    let regionStart = -1;
    let regionEnd = -1;

    for (const line of changed) {
      const idx = line - 1;
      if (regionStart === -1 || idx > regionEnd + CONTEXT_WINDOW_SIZE * 2) {
        if (regionStart !== -1) {
          windows.push(
            allLines.slice(regionStart, regionEnd).join("\n")
          );
        }
        regionStart = Math.max(0, idx - CONTEXT_WINDOW_SIZE);
        regionEnd = Math.min(allLines.length, idx + 1 + CONTEXT_WINDOW_SIZE);
      } else {
        regionEnd = Math.min(allLines.length, idx + 1 + CONTEXT_WINDOW_SIZE);
      }
    }

    if (regionStart !== -1) {
      windows.push(
        allLines.slice(regionStart, regionEnd).join("\n")
      );
    }

    return windows.length > 0
      ? windows.join("\n\n// ---\n\n")
      : null;
  }

  return allLines.join("\n");
}

export interface FileContext {
  filename: string;
  context: string;
  totalLines: number;
}

export async function buildFileContextMap(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  ref: string,
  chunks: DiffChunk[],
  changedLinesMap: Map<string, Set<number>>
): Promise<Map<string, FileContext>> {
  const map = new Map<string, FileContext>();

  for (const chunk of chunks) {
    const changedLines = changedLinesMap.get(chunk.filename);
    if (!changedLines || changedLines.size === 0) continue;

    const content = await fetchFileContent(octokit, owner, repo, chunk.filename, ref);
    if (!content) continue;

    const context = extractContextWindows(content, changedLines);
    if (!context) continue;

    map.set(chunk.filename, {
      filename: chunk.filename,
      context,
      totalLines: content.split("\n").length,
    });
  }

  return map;
}
