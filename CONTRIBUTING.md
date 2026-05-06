# Contributing to foto-web

## Branching (Strict Rule)
- Long-lived branches: `qa`, `main`
- All new work must use short-lived branches named `feature/<name>`
- Promotion flow is PR only: `feature/* -> qa -> main`
- Direct push to `qa` or `main` is not allowed

## Pull Requests
- Keep PRs small and focused.
- Ensure CI is green (`lint`, `build`) before requesting review.
- At least one approval is required.

## Commit style
Use clear commits with scope prefixes when possible:
- `feat:`
- `fix:`
- `chore:`
- `docs:`
