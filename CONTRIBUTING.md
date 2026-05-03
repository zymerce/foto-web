# Contributing to foto-web

## Branching
- Long-lived branches: `dev`, `qa`, `main`
- Create short-lived branches from `dev` using `local/<ticket-or-feature>`
- Promotion flow is PR only: `local/* -> dev -> qa -> main`

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
