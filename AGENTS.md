# Repository Guidelines

## Project Structure & Module Organization
The site is a single-page landing stored in `index.html`. Inline CSS lives inside the `<style>` block near the head; group changes by comment markers (e.g., `/* hero */`) and keep them in sorted order. Add reusable assets under a new `assets/` directory and reference them with relative paths (`assets/img/logo.png`). Keep localized copy in Spanish; annotate English helper notes with `<!-- EN -->` comments when needed.

## Build, Test, and Development Commands
Use `npx serve .` to spin up a static preview on http://localhost:3000. For quick iteration, `python -m http.server 4000` also works and avoids caching issues. Run `npx prettier@latest index.html --check` before pushing to confirm formatting, then use `--write` to auto-fix small drifts.

## Coding Style & Naming Conventions
Format HTML with two-space indentation and wrap attributes onto new lines when they exceed 100 characters. Prefer semantic tags (`<section>`, `<main>`) over generic divs and keep aria labels in Spanish. CSS variables follow kebab-case (`--brand-accent`); utility classes pair noun + qualifier (`.btn--brand`, `.grid--two`). Place structural comments using lowercase Spanish descriptions.

## Testing Guidelines
Manually sanity-check the landing in Chromium- and WebKit-based browsers. Run `npx html-validate index.html` to catch structural issues and `npx pa11y http://localhost:3000` against the served page to flag accessibility regressions. Keep Lighthouse performance above 90; note any exceptions in the PR description.

## Commit & Pull Request Guidelines
Initialize Git if missing, then use Conventional Commits (`feat:`, `fix:`, `style:`) with imperative verbs (`feat: refina hero CTA`). PRs should describe intent, list visual or copy changes, attach before/after screenshots, and link tracking tickets or WhatsApp requests when available.
