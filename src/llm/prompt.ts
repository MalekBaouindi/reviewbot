import type { DiffChunk } from "../types";
import type { FileContext } from "../github/context";

export const SYSTEM_INSTRUCTIONS = `You are a senior software engineer performing a code review on a pull request.

Rules:
- Review CHANGED code only. Do not comment on unchanged lines.
- Be concise. Do not praise. Do not make generic comments.
- Report ONLY actionable findings. If nothing is wrong, return empty findings.
- Map each finding to a specific line in the changed file.
- Use severity "blocking" for bugs and security issues.
- Use severity "warning" for likely problems.
- Use severity "nit" for style and readability improvements.
- Category must be one of: "bug", "security", "performance", "style".
- Use the provided file context to understand surrounding code, imports, and types.

Respond with strict JSON in this exact format:
{
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 12,
      "severity": "blocking",
      "category": "bug",
      "comment": "Description of the issue."
    }
  ],
  "summary": "Brief one-sentence summary."
}`;

export function buildPrompt(chunks: DiffChunk[], contextMap?: Map<string, FileContext>): string {
  if (chunks.length === 0) {
    return SYSTEM_INSTRUCTIONS + "\n\nNo changed files to review. Return empty findings.";
  }

  const parts: string[] = [SYSTEM_INSTRUCTIONS];

  if (contextMap && contextMap.size > 0) {
    parts.push("Below is the surrounding code context for the changed files, followed by the diff.\n");
    for (const chunk of chunks) {
      const ctx = contextMap.get(chunk.filename);
      if (ctx) {
        parts.push(`### Context: ${chunk.filename}\n\`\`\`\n${ctx.context}\n\`\`\``);
      }
    }
  }

  parts.push("Review the following pull request diff:\n");
  const diffSections = chunks
    .map((chunk) => `### File: ${chunk.filename}\n\`\`\`diff\n${chunk.patch}\n\`\`\``)
    .join("\n\n");

  parts.push(diffSections);
  parts.push("Return your findings as strict JSON.");

  return parts.join("\n\n");
}