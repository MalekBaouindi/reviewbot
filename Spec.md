# ReviewBot — AI Code Review GitHub App (Powered by Groq)

**Goal:** Build a real, installable GitHub App that automatically reviews pull requests using **Groq's `llama-3.3-70b-versatile`**, posts inline review comments, and can display install/usage statistics on the README. This isn't a demo—it's a production-ready developer tool that people can install and use on their own repositories.

---

# 1. MVP Scope

Version 1 should do exactly this:

1. A user installs the GitHub App on a repository.
2. Every time a Pull Request is opened or updated:

   * Fetch the PR diff using the GitHub API.
   * Collect all changed files.
   * Send the diff to Groq in a **single batched request** (or a few batches for very large PRs).
   * Receive structured JSON describing bugs, security issues, performance problems, and style improvements.
   * Post findings as **inline review comments**.
   * Publish a short summary review.

Nothing runs locally for the end user. The service is hosted and behaves like any other GitHub App.

---

# 2. Architecture

```
GitHub Pull Request Event
            │
            ▼
Webhook Server (Probot + TypeScript)
            │
            ▼
Fetch PR Diff (Octokit)
            │
            ▼
Filter generated / ignored files
            │
            ▼
Batch changed files
            │
            ▼
Groq API
(llama-3.3-70b-versatile)
            │
            ▼
Structured JSON Findings
            │
            ▼
Map findings to GitHub diff positions
            │
            ▼
Create GitHub Review
(inline comments + summary)
            │
            ▼
Store usage statistics
```

### Why Probot?

* Official GitHub framework
* Installation authentication handled automatically
* Webhook verification included
* Excellent TypeScript support

### Why Groq?

* Free API tier
* No credit card required
* Extremely fast inference
* OpenAI-compatible API
* Simple integration using the OpenAI SDK

The project only requires structured extraction from code diffs, so adding frameworks like LangChain or LlamaIndex would introduce unnecessary complexity.

---

# 3. Tech Stack

| Layer         | Technology                       | Reason                           |
| ------------- | -------------------------------- | -------------------------------- |
| Framework     | Probot                           | Official GitHub App framework    |
| Language      | TypeScript                       | Strong typing                    |
| GitHub API    | Octokit                          | Official SDK                     |
| LLM           | Groq (`llama-3.3-70b-versatile`) | Fast, free, high-quality reviews |
| SDK           | OpenAI SDK                       | Works directly with Groq         |
| Hosting       | Render / Fly.io                  | Easy deployment                  |
| Database      | SQLite → PostgreSQL              | Statistics & usage tracking      |
| Local webhook | smee.io                          | Local development                |

---

# 4. Repository Structure

```
reviewbot/
│
├── src/
│   ├── index.ts
│   │
│   ├── github/
│   │   ├── diff.ts
│   │   └── review.ts
│   │
│   ├── llm/
│   │   ├── prompt.ts
│   │   └── client.ts
│   │
│   ├── db/
│   │   └── stats.ts
│   │
│   └── types.ts
│
├── .env.example
├── app.yml
├── package.json
└── README.md
```

---

# 5. LLM Output Contract

Always request **strict JSON**.

```json
{
  "findings": [
    {
      "file": "src/auth.ts",
      "line": 42,
      "severity": "blocking",
      "category": "bug",
      "comment": "Possible null dereference."
    }
  ],
  "summary": "One blocking issue found."
}
```

## Prompt Rules

The model should:

* Review only changed code.
* Ignore unchanged lines.
* Be concise.
* Avoid praise.
* Avoid generic comments.
* Report only actionable findings.
* Use:

  * **blocking** → bugs/security
  * **warning** → likely problems
  * **nit** → style/readability

If nothing is wrong:

```json
{
  "findings": [],
  "summary": "No issues found."
}
```

---

# 6. Groq Integration

Use:

```
https://api.groq.com/openai/v1
```

Model:

```
llama-3.3-70b-versatile
```

Recommended settings:

```
temperature = 0.1
response_format = json_object
```

### Why batch requests?

Groq Free Tier roughly allows:

* ~30 requests/minute
* ~1,000 requests/day

Instead of:

```
15 changed files
=
15 API requests
```

Use:

```
15 changed files
=
1 batched request
```

This reduces latency and stays comfortably within rate limits.

---

# 7. Development Roadmap

## Phase 1 — MVP

* Scaffold Probot app
* Register GitHub App
* Receive PR webhooks
* Fetch diff
* Send diff to Groq
* Parse JSON
* Publish inline review comments
* Deploy on Render
* Install on personal repositories

---

## Phase 2 — Reliability

* Handle large diffs
* Chunk intelligently
* Ignore generated files
* Support `.reviewbotignore`
* Debounce repeated synchronize events
* Retry failed reviews

---

## Phase 3 — Context-Aware Reviews

This is where the project becomes unique.

On installation:

* Index repository
* Embed important files
* Store vectors

During review:

* Retrieve relevant code
* Include surrounding implementation
* Include related tests
* Review using repository context

This enables ReviewBot to detect issues beyond the visible diff.

---

## Phase 4 — Public Release

* Usage dashboard
* Statistics badge
* GitHub Marketplace listing
* Demo GIF
* Public demo repository
* One-click install button

---

# 8. README Goals

The repository should immediately communicate value.

Top of README:

* Demo GIF
* Install button
* Feature list
* Architecture diagram
* Example review
* Statistics

Later include:

```
Installed on:
42 repositories

Reviewed:
1,385 Pull Requests

Issues Found:
4,901
```

Even modest real-world numbers build credibility.

---

# 9. Manual Setup

## GitHub

Create a GitHub App.

Permissions:

* Pull Requests

  * Read & Write

* Contents

  * Read

Events:

* pull_request

Generate:

* App ID
* Private Key
* Webhook Secret

---

## Groq

Create a Groq account.

Generate an API key.

Add:

```
GROQ_API_KEY=...
```

to your environment.

---

## Local Development

Install:

* Node.js
* pnpm (or npm)
* smee.io client

Use smee.io to forward GitHub webhooks to your local server.

---

# 10. Environment Variables

```env
GITHUB_APP_ID=

GITHUB_PRIVATE_KEY=

GITHUB_WEBHOOK_SECRET=

GROQ_API_KEY=

MODEL=llama-3.3-70b-versatile

PORT=3000
```

---

# 11. Prompt for Claude Code / GPT-5 / Cursor

```
I'm building "ReviewBot," a production-ready GitHub App that automatically reviews pull requests.

Stack:

- Probot
- Node.js
- TypeScript
- Octokit
- Groq API (OpenAI-compatible)
- Model: llama-3.3-70b-versatile
- Hosted on Render

Implement only the Phase 1 MVP.

Requirements:

1. Scaffold a Probot TypeScript project.

2. Handle:
   - pull_request.opened
   - pull_request.synchronize

3. Fetch the PR diff using Octokit.

4. Batch all changed files into a single prompt sent to Groq.

5. Request strict JSON output:

{
  file,
  line,
  severity,
  category,
  comment
}

6. Parse the JSON safely.

7. Convert findings into GitHub inline review comments.

8. Post a summary review.

9. Include:

- app.yml
- .env.example
- README stub

Requirements:

- Strong TypeScript types
- Production-ready code
- Minimal architecture
- No unnecessary abstractions
- Clear separation between GitHub logic and LLM logic
```

---

# 12. Long-Term Vision

ReviewBot should evolve beyond a simple AI code reviewer.

The goal is to become a context-aware GitHub App capable of understanding an entire repository, retrieving related implementation details, and providing accurate, actionable code reviews with minimal false positives.

The project demonstrates:

* GitHub App development
* Webhook architecture
* Production TypeScript
* API integrations
* Structured LLM outputs
* Prompt engineering
* RAG-ready architecture
* Deployable SaaS design

Rather than being another AI wrapper, ReviewBot should be a tool developers trust enough to install on real repositories.
