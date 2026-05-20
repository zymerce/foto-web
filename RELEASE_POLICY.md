# Web Release Policy

## Strategy
- Calendarless continuous promotion.
- Merge feature work into `qa` after review and passing checks.
- Promote `qa -> main` via controlled PR with release note.

## Mandatory promotion checks
- CI green
- Docs updated where required
- PR evidence complete
- Risk + rollback declared

## Rollback
- Revert PR or redeploy previous known-good revision.
