# Contributing to fotoz.io Web

## Branching (Strict Rule)
- Long-lived branches: `qa`, `main`
- All new work must use short-lived branches named `feature/<name>`
- Promotion flow is PR only: `feature/* -> qa -> main`
- Direct push to `qa` or `main` is not allowed
- Before coding, sync with latest `qa` (`git fetch`, `git checkout qa`, `git pull`) and then create your feature branch

## Definition of Done (Blocking)
- CI green (`lint`, typecheck, build)
- Required PR sections complete (summary, validation, evidence, docs, release impact)
- Docs updated for behavior/pipeline changes
- Security-sensitive changes explicitly reviewed
- Rollback plan documented

## Planning ritual (mandatory)
Before coding, include mini design in PR:
- goal
- constraints
- impact (UI/API/data/infra)
- test plan
- rollout plan

## Commit style
Use clear commits with scope prefixes when possible: `feat:`, `fix:`, `chore:`, `docs:`.
