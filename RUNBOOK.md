# fotoz.io Web Runbook

## Pre-merge
- Run `npm run lint` and `npm run build`.
- Confirm narrative consistency and accessibility checks for UI changes.
- Update docs when behavior/copy/theme/pipeline changes.

## Release validation (qa)
- Verify landing CTA routes.
- Verify login -> workspace and role-based admin visibility.
- Verify auth page links and error states.
- Verify role console visibility from `/workspace`:
  - `admin`, `support`, `analyst`, `photographer`, `customer`
- Verify `/projects` flow:
  - create project
  - click `Upload with Helper`
  - confirm helper receives deep-link context and validates session

## Rollback
- Revert offending PR on `qa` or `main`.
- Redeploy previous known-good commit in Vercel.
- Document incident and follow-up tasks.
