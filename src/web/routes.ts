import type { Router } from "express";
import { getStats } from "../db/stats";

function renderDashboard(stats: { repositories: number; reviews: number; totalFindings: number }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReviewBot Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: #0d1117; color: #c9d1d9; min-height: 100vh; display: flex; flex-direction: column; }
    .container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; flex: 1; }
    h1 { font-size: 2rem; font-weight: 600; color: #58a6ff; margin-bottom: 0.5rem; }
    .subtitle { color: #8b949e; font-size: 0.95rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.5rem; text-align: center; }
    .card-value { font-size: 2.5rem; font-weight: 700; color: #58a6ff; }
    .card-label { font-size: 0.8rem; color: #8b949e; margin-top: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .links { display: flex; gap: 1.5rem; justify-content: center; margin: 2rem 0; }
    .links a { color: #58a6ff; text-decoration: none; font-size: 0.9rem; }
    .links a:hover { text-decoration: underline; }
    .footer { border-top: 1px solid #21262d; padding: 1.5rem; text-align: center; color: #484f58; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ReviewBot</h1>
    <p class="subtitle">AI Code Review &mdash; powered by Groq</p>
    <div class="grid">
      <div class="card">
        <div class="card-value">${stats.reviews}</div>
        <div class="card-label">Reviews</div>
      </div>
      <div class="card">
        <div class="card-value">${stats.repositories}</div>
        <div class="card-label">Repositories</div>
      </div>
      <div class="card">
        <div class="card-value">${stats.totalFindings}</div>
        <div class="card-label">Issues Found</div>
      </div>
    </div>
    <div class="links">
      <a href="/stats">JSON API</a>
      <a href="/stats/badge">Badge</a>
      <a href="https://github.com/apps/reviewbot">Install App</a>
    </div>
  </div>
  <div class="footer">ReviewBot &mdash; AI Code Review</div>
</body>
</html>`;
}

export function addWebRoutes(router: Router): void {
  router.get("/stats", (_req, res) => {
    try {
      const stats = getStats();
      res.json(stats);
    } catch {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  router.get("/stats/badge", (_req, res) => {
    try {
      const stats = getStats();
      const reviews = stats.reviews;
      const color = reviews > 0 ? "brightgreen" : "lightgrey";
      res.redirect(`https://img.shields.io/badge/reviews-${reviews}-${color}?logo=github`);
    } catch {
      res.redirect("https://img.shields.io/badge/reviews-error-red");
    }
  });

  router.get("/dashboard", (_req, res) => {
    try {
      const stats = getStats();
      res.send(renderDashboard(stats));
    } catch {
      res.status(500).send("Failed to load dashboard");
    }
  });
}
