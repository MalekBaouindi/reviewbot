# ReviewBot

![demo](https://via.placeholder.com/800x400.png?text=ReviewBot+Demo+GIF)

AI-powered pull request reviews powered by [Groq](https://groq.com) (`llama-3.3-70b-versatile`). Install on your repositories and get automated inline code reviews on every PR — catching bugs, security issues, performance problems, and style improvements before they ship.

<p align="center">
  <a href="https://github.com/apps/reviewbot"><img src="https://img.shields.io/badge/Install%20on%20GitHub-ReviewBot-2ea44f?logo=github&style=for-the-badge" alt="Install on GitHub"></a>
  <a href="/dashboard"><img src="https://img.shields.io/badge/dashboard-live-58a6ff?style=for-the-badge" alt="Dashboard"></a>
  <img src="/stats/badge" alt="Review stats">
</p>

---

## Features

- **Automatic reviews** — triggered on `pull_request.opened` and `pull_request.synchronize`
- **Inline comments** — findings are posted directly on the relevant lines in the diff
- **Summary review** — each review includes a concise summary of all findings
- **Severity triage** — issues tagged as `blocking`, `warning`, or `nit`
- **Category labels** — each finding categorized as `bug`, `security`, `performance`, or `style`
- **Groq-powered** — fast inference using `llama-3.3-70b-versatile` with JSON structured output
- **Context-aware** — fetches surrounding code context so the model sees more than just the diff
- **Smart chunking** — large PRs split across multiple batched requests; automatic retry with exponential backoff
- **Debounced** — rapid pushes don't trigger duplicate reviews
- **`.reviewbotignore`** — skip files per-repo with gitignore-style patterns
- **Line validation** — comments only posted on lines that exist in the diff
- **Statistics & dashboard** — SQLite-backed review history with live dashboard

## Architecture

```
GitHub Pull Request Event
            │
            ▼
Webhook Server (Probot + TypeScript)
            │
            ▼
Fetch PR Diff + .reviewbotignore + head ref
            │
            ▼
Filter generated / lock / ignored files
            │
            ▼
Extract valid RIGHT-side line positions
            │
            ▼
Fetch file context (surrounding code)
            │
            ▼
Smart chunking (split large diffs)
            │
            ▼
Build prompt (context + diff) → Groq
(llama-3.3-70b-versatile, JSON mode)
            │
            ▼
Parse + validate structured JSON findings
            │
            ▼
Filter findings by valid diff lines
            │
            ▼
Post inline comments + summary review
            │
            ▼
Record statistics (SQLite)
            │
            ▼
Dashboard / Stats API / Badge endpoints
```

## Example Review Output

```json
{
  "findings": [
    {
      "file": "src/auth.ts",
      "line": 42,
      "severity": "blocking",
      "category": "bug",
      "comment": "Possible null dereference on `user.profile` — add an optional chain or null check."
    },
    {
      "file": "src/api.ts",
      "line": 15,
      "severity": "warning",
      "category": "performance",
      "comment": "Unnecessary array spread in hot path — assign directly."
    }
  ],
  "summary": "Found 2 issues: 1 blocking bug, 1 performance warning."
}
```

Inline comments appear like this in the PR:

> **[BLOCKING] bug**: Possible null dereference on `user.profile` — add an optional chain or null check.

---

## Getting Started

### Prerequisites

- Node.js >= 22
- A [GitHub App](https://docs.github.com/en/apps) with Pull Request read/write permissions
- A [Groq API key](https://console.groq.com)

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | Your GitHub App ID |
| `GITHUB_PRIVATE_KEY` | GitHub App private key (PEM or base64) |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret configured in the GitHub App |
| `GROQ_API_KEY` | Groq API key |
| `MODEL` | Model name (default: `llama-3.3-70b-versatile`) |
| `PORT` | Server port (default: `3000`) |

### Local Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Start
npm start
```

Use [smee.io](https://smee.io) to forward GitHub webhooks to your local server.

## Dashboard

Once deployed, ReviewBot exposes three web endpoints:

| Route | Description |
|---|---|
| `/dashboard` | Live HTML dashboard showing review counts, repos, and issues found |
| `/stats` | JSON API (`GET /stats`) for programmatic access |
| `/stats/badge` | Shields.io badge redirect (`/stats/badge`) |

## Deployment

ReviewBot is designed to deploy on [Render](https://render.com) or [Fly.io](https://fly.io). Set the environment variables in your hosting dashboard and point your GitHub App's webhook URL to `https://your-app.com/api/github/webhooks`.

### GitHub Marketplace

To list ReviewBot on the GitHub Marketplace:

1. Ensure `app.yml` is configured with `public: true`
2. Create a GitHub App at https://github.com/settings/apps
3. Set the required permissions (pull requests: write, contents: read)
4. Subscribe to the `pull_request` event
5. Generate an App ID, private key, and webhook secret
6. Deploy and set the webhook URL to `https://your-app.com/api/github/webhooks`
7. Submit your app for Marketplace listing at https://github.com/marketplace/new

## Statistics

```
Installed on:    —
Reviews run:     —
Issues found:    —
```

> Visit `/dashboard` after deployment to see live stats. Statistics are tracked in SQLite and populate automatically as reviews are performed.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Probot |
| Language | TypeScript |
| GitHub API | Octokit |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| SDK | OpenAI SDK |
| Database | better-sqlite3 |
| Hosting | Render / Fly.io |

## License

MIT
