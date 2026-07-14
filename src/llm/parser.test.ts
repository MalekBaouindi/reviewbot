import { describe, it, expect } from "vitest";
import { parseReviewResponse } from "./parser";

describe("parseReviewResponse", () => {
  it("parses valid JSON with findings", () => {
    const raw = JSON.stringify({
      findings: [
        { file: "src/auth.ts", line: 42, severity: "blocking", category: "bug", comment: "Null dereference" },
      ],
      summary: "One issue found.",
    });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("blocking");
    expect(result.summary).toBe("One issue found.");
  });

  it("parses empty findings", () => {
    const raw = JSON.stringify({ findings: [], summary: "No issues." });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toBe("No issues.");
  });

  it("strips markdown code fences", () => {
    const raw = "```json\n" + JSON.stringify({ findings: [], summary: "Clean." }) + "\n```";
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toBe("Clean.");
  });

  it("strips markdown fences without json tag", () => {
    const raw = "```\n" + JSON.stringify({ findings: [], summary: "OK." }) + "\n```";
    const result = parseReviewResponse(raw);
    expect(result.summary).toBe("OK.");
  });

  it("returns fallback for invalid JSON", () => {
    const result = parseReviewResponse("not json");
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toBe("Could not parse review response from model.");
  });

  it("returns fallback for malformed structure (missing findings)", () => {
    const raw = JSON.stringify({ summary: "test" });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
  });

  it("returns fallback for malformed structure (missing summary)", () => {
    const raw = JSON.stringify({ findings: [] });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
  });

  it("filters invalid findings with wrong severity", () => {
    const raw = JSON.stringify({
      findings: [
        { file: "a.ts", line: 1, severity: "invalid", category: "bug", comment: "bad severity" },
      ],
      summary: "test",
    });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
  });

  it("filters invalid findings with wrong category", () => {
    const raw = JSON.stringify({
      findings: [
        { file: "a.ts", line: 1, severity: "warning", category: "invalid", comment: "bad category" },
      ],
      summary: "test",
    });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
  });

  it("filters findings with missing required fields", () => {
    const raw = JSON.stringify({
      findings: [
        { file: "a.ts", line: 1, severity: "warning", category: "style" },
      ],
      summary: "test",
    });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
  });

  it("filters findings with line < 1", () => {
    const raw = JSON.stringify({
      findings: [
        { file: "a.ts", line: 0, severity: "warning", category: "style", comment: "c" },
      ],
      summary: "test",
    });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
  });

  it("filters findings with empty file path", () => {
    const raw = JSON.stringify({
      findings: [
        { file: "", line: 1, severity: "warning", category: "bug", comment: "c" },
      ],
      summary: "test",
    });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(0);
  });

  it("preserves valid findings and filters invalid ones", () => {
    const raw = JSON.stringify({
      findings: [
        { file: "good.ts", line: 5, severity: "blocking", category: "bug", comment: "real" },
        { file: "bad.ts", line: 0, severity: "warning", category: "style", comment: "invalid line" },
      ],
      summary: "Mixed results.",
    });
    const result = parseReviewResponse(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].file).toBe("good.ts");
  });
});
