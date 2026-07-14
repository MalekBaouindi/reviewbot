export type Severity = "blocking" | "warning" | "nit";

export type Category = "bug" | "security" | "performance" | "style";

export interface Finding {
  file: string;
  line: number;
  severity: Severity;
  category: Category;
  comment: string;
}

export interface ReviewResult {
  findings: Finding[];
  summary: string;
}

export interface DiffChunk {
  filename: string;
  patch: string;
}