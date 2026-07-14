import Database from "better-sqlite3";
import type { Finding } from "../types";

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  db = new Database("reviewbot.db");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo TEXT NOT NULL,
      pr_number INTEGER NOT NULL,
      reviewed_at INTEGER NOT NULL,
      findings_count INTEGER NOT NULL,
      blocking_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      nit_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_repo ON reviews(repo);
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_at ON reviews(reviewed_at);
  `);
  return db;
}

export function recordReview(
  repo: string,
  prNumber: number,
  findings: Finding[]
): void {
  const connection = getDb();
  const severities = findings.reduce<Record<string, number>>(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    { blocking: 0, warning: 0, nit: 0 }
  );

  connection
    .prepare(
      `INSERT INTO reviews (repo, pr_number, reviewed_at, findings_count, blocking_count, warning_count, nit_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      repo,
      prNumber,
      Date.now(),
      findings.length,
      severities.blocking,
      severities.warning,
      severities.nit
    );
}

export interface Stats {
  repositories: number;
  reviews: number;
  totalFindings: number;
}

export function getStats(): Stats {
  const connection = getDb();
  const row = connection
    .prepare(
      `SELECT
        COUNT(DISTINCT repo) AS repositories,
        COUNT(*) AS reviews,
        COALESCE(SUM(findings_count), 0) AS totalFindings
       FROM reviews`
    )
    .get() as { repositories: number; reviews: number; totalFindings: number };

  return {
    repositories: row.repositories,
    reviews: row.reviews,
    totalFindings: row.totalFindings,
  };
}