# fotoz.io Web Release Strategy

## Promotion model
- Continuous delivery into `qa` after review and passing checks.
- Controlled promotion from `qa` to `main` with release notes.

## Required release notes fields
- Summary of changes
- Risk level (low/medium/high)
- Config/env impact
- Rollback steps

## Rollback policy
- Keep previous deployment reference.
- Revert PR or redeploy prior commit immediately on regression.
