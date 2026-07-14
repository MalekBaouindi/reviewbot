import type { ReviewResult, Finding, Severity, Category } from "../types";

const VALID_SEVERITIES: ReadonlySet<string> = new Set(["blocking", "warning", "nit"]);
const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "bug",
  "security",
  "performance",
  "style",
]);

function stripMarkdownJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

function parseFinding(raw: unknown): Finding | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const f = raw as Record<string, unknown>;
  if (typeof f.file !== "string" || f.file.length === 0) return null;
  if (typeof f.line !== "number" || f.line < 1) return null;
  if (typeof f.severity !== "string" || !VALID_SEVERITIES.has(f.severity)) return null;
  if (typeof f.category !== "string" || !VALID_CATEGORIES.has(f.category)) return null;
  if (typeof f.comment !== "string" || f.comment.length === 0) return null;

  return {
    file: f.file,
    line: f.line,
    severity: f.severity as Severity,
    category: f.category as Category,
    comment: f.comment,
  };
}

function parseResult(parsed: unknown): ReviewResult | null {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.findings)) return null;
  if (typeof obj.summary !== "string") return null;

  const findings = obj.findings
    .map(parseFinding)
    .filter((f): f is Finding => f !== null);

  return {
    findings,
    summary: obj.summary,
  };
}

export function parseReviewResponse(raw: string): ReviewResult {
  try {
    const cleaned = stripMarkdownJson(raw);
    const parsed = JSON.parse(cleaned);
    const result = parseResult(parsed);
    if (result) return result;
  } catch {
    // fall through to fallback
  }

  return {
    findings: [],
    summary: "Could not parse review response from model.",
  };
}