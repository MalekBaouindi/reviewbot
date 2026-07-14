import type { ProbotOctokit } from "probot";
import type { ReviewResult, Finding } from "../types";

const SEVERITY_PREFIX: Record<string, string> = {
  blocking: "[BLOCKING]",
  warning: "[WARNING]",
  nit: "[NIT]",
};

function formatCommentBody(finding: Finding): string {
  return `${SEVERITY_PREFIX[finding.severity]} **${finding.category}**: ${finding.comment}`;
}

function buildComments(findings: Finding[]): Array<{
  path: string;
  line: number;
  side: "RIGHT";
  body: string;
}> {
  return findings.map((f) => ({
    path: f.file,
    line: f.line,
    side: "RIGHT" as const,
    body: formatCommentBody(f),
  }));
}

export async function publishReview(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  pullNumber: number,
  result: ReviewResult,
  validLines?: Map<string, Set<number>>
): Promise<void> {
  let findings = result.findings;
  if (validLines) {
    const before = findings.length;
    findings = findings.filter(f => {
      const lines = validLines.get(f.file);
      return lines?.has(f.line);
    });
    if (findings.length < before) {
      // filtered out invalid line references silently
    }
  }

  const comments = buildComments(findings);

  const body =
    comments.length === 0
      ? `### ReviewBot Summary\n\n${result.summary}`
      : `### ReviewBot Summary\n\nFound ${comments.length} finding(s).\n\n${result.summary}`;

  await octokit.request("POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews", {
    owner,
    repo,
    pull_number: pullNumber,
    body,
    event: "COMMENT",
    comments,
  });
}