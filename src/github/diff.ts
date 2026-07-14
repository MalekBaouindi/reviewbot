import type { ProbotOctokit } from "probot";
import type { DiffChunk } from "../types";

const FILTER_PATTERNS = [
  /(^|\/)node_modules\//,
  /(^|\/)vendor\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)out\//,
  /(^|\/)\.next\//,
  /(^|\/)__pycache__\//,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /poetry\.lock$/,
  /\.generated\.\w+$/,
  /\.min\.(js|css)$/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
];

function shouldFilter(filename: string, extraPatterns?: string[]): boolean {
  if (FILTER_PATTERNS.some((p) => p.test(filename))) return true;
  if (extraPatterns && matchesIgnorePattern(filename, extraPatterns)) return true;
  return false;
}

function matchesIgnorePattern(filename: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.endsWith("/")) {
      const dir = pattern.slice(0, -1);
      if (filename === dir || filename.startsWith(dir + "/")) return true;
    } else if (pattern.startsWith("*.") && filename.endsWith(pattern.slice(1))) {
      return true;
    } else if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".") + "$");
      if (regex.test(filename)) return true;
    } else if (filename === pattern || filename.endsWith("/" + pattern)) {
      return true;
    }
  }
  return false;
}

export async function fetchReviewbotIgnore(
  octokit: ProbotOctokit,
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path: ".reviewbotignore",
    });
    const content = Buffer.from((data as { content: string }).content, "base64").toString("utf-8");
    return content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  } catch {
    return [];
  }
}

function parseDiff(raw: string, extraPatterns?: string[]): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let current: DiffChunk | null = null;

  for (const line of raw.split("\n")) {
    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (match) {
      const filename = match[2];

      if (filename === "/dev/null") {
        current = null;
        continue;
      }

      if (shouldFilter(filename, extraPatterns)) {
        current = null;
        continue;
      }

      current = { filename, patch: "" };
      chunks.push(current);
      current.patch += line + "\n";
      continue;
    }

    if (current) {
      current.patch += line + "\n";
    }
  }

  return chunks;
}

export function extractValidLines(chunks: DiffChunk[]): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();

  for (const chunk of chunks) {
    const lines = new Set<number>();
    let rightLine = 0;
    let inHunk = false;

    for (const line of chunk.patch.split("\n")) {
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkMatch) {
        rightLine = parseInt(hunkMatch[1], 10);
        inHunk = true;
        continue;
      }

      if (!inHunk) continue;

      if (line.startsWith("+") || line.startsWith(" ")) {
        lines.add(rightLine);
        rightLine++;
      }
    }

    map.set(chunk.filename, lines);
  }

  return map;
}

export async function fetchDiff(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  pullNumber: number,
  ignorePatterns?: string[]
): Promise<DiffChunk[]> {
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner,
    repo,
    pull_number: pullNumber,
    headers: { accept: "application/vnd.github.v3.diff" },
  });

  const raw = typeof data === "string" ? data : "";
  return parseDiff(raw, ignorePatterns);
}