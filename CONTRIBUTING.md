# Contributing to foto-web

## Branching (Strict Rule)
- Long-lived branches: `qa`, `main`
- All new work must use short-lived branches named `feature/<name>`
- Promotion flow is PR only: `feature/* -> qa -> main`
- Direct push to `qa` or `main` is not allowed
- Before coding, sync with latest `qa` (`git fetch`, `git checkout qa`, `git pull`) and then create your feature branch

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
