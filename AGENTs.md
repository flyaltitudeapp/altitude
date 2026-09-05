## 1 Introduction

This repository contains **Altitude**, an single tenant crew center platform for virtual airlines, built with Next .js 15, Bun, strict TypeScript and a modern React/Tailwind frontend.  
AI coding agents that consume this file **MUST** obey the rules herein:

- Use the documented commands; **NEVER** spin up dev/preview servers.
- **NEVER** run a db migration without my consent.
- Respect code-style conventions (strict-null, no any, etc.).
- Leverage the provided error-handling helpers in `lib/`.
- Re-use design-tokens from `app/globals.css`; do **not** redefine colors elsewhere.

The goal is to provide every agent with a single source of truth—no more scattered `*.rules` files.

---

## 2 Specification

### 2.1 Project Structure

| Path              | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `app/`            | Next 13/14/15 “app-router” pages, layouts & components.                 |
| `components/`     | Shared client components.                                               |
| `actions/`        | Server Actions grouped by domain.                                       |
| `domains/`        | Business logic modules (aircraft, users, …).                            |
| `lib/`            | Framework-agnostic helpers (error handling, encryption, rate-limiter…). |
| `db/`             | Drizzle ORM schema & query helpers (SQLite/libSQL).                     |
| `bot/`            | Discord bot driven by Bun.                                              |
| `public/styles/`  | Optional alternate Tailwind themes.                                     |
| `app/globals.css` | Global CSS variables **authoritative color source**.                    |

### 2.2 Languages & Toolchain

- **TypeScript 5.8** – `"strict": true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, etc.
- **Bun** runtime & package manager (`bun.lock`).
- **Next .js 15** with the App Router and React 19.
- **Tailwind CSS 4** configured via PostCSS (`postcss.config.mjs`).
- **Drizzle ORM 0.44** (SQLite driver).

> **MANDATORY :** _Never_ use the `any` type. Prefer `unknown` + proper narrowing.

### 2.3 Commands

Run tasks with **Bun** scripts only.

| Goal                      | Command                               |
| ------------------------- | ------------------------------------- |
| Type-check entire project | `bun run check:types`                 |
| Lint (ESLint, Prettier)   | `bun run lint`                        |
| Autofix style issues      | `bun run lint:fix` & `bun run format` |
| Seed local DB             | `bun run db:seed`                     |
| Schedule jobs             | `bun run cron`                        |
| Discord bot (prod)        | `bun run bot`                         |

### 2.4 Code Style & Conventions

- **Formatting**: Prettier 3 – semicolons, single quotes, 100 char line max.
- **Imports**: `import type` wherever possible; enforced by ESLint `import/consistent-type-imports`.
- **Naming**: `kebab-case` for files, `camelCase` variables. Use full acronyms (`API`, `URL`, `ID`).
- **Styling**: Consume CSS variables from `:root` in `app/globals.css`. Example:

className="text-foreground"

- **Variants**: Use Tailwind dark mode (`data-theme="dark"` OR `.dark` class).
- **No inline color** other than CSS variable references.

### 2.5 Security Guidelines

- Secrets **MUST NOT** be committed – use `.env.example` for documentation only.
- All passwords/API keys stored encrypted via [`lib/encryption.ts`](lib/encryption.ts:1).
- Validate all external inputs with **Zod** schemas.
- HTTPS only in production; Caddy reverse-proxy handles TLS/`/files` static assets.
- Principle of least privilege in database roles & Discord bot scopes.

---

## 3 Build, CI & Git Workflow

- Local commits **MUST** pass `bun run check:types` and `bun run lint`.
- Husky + lint-staged auto-fixes on pre-commit.
- **Branching**: trunk-based; short-lived feature branches.
- No `git push --force` on `main`; if necessary for PRs use `--force-with-lease`.
- Release tagging handled by CI (not yet public).

---

### Appendix A – Bun Script Index (for fast lookup)

```json
{
  "check:types": "bunx tsc --noEmit",
  "lint": "bunx eslint . --ext .js,.jsx,.ts,.tsx",
  "lint:fix": "bunx eslint . --ext .js,.jsx,.ts,.tsx --fix",
  "format": "bunx prettier --write .",
  "cron": "bun run jobs/scheduler.ts",
  "bot": "bun run bot/index.ts"
}
```
