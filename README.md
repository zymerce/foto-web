# foto-web

Next.js frontend for fotoz.io deployed on Vercel.

## UI/Theming
- Global design tokens use shadcn/tweakcn theme variables in `app/globals.css`.
- Non-landing pages support theme mode persistence (`system -> light -> dark`) via top-right toggle.
- Landing page (`/`) is intentionally fixed as a marketing surface and does not follow theme switching.
- Client-only theme label rendering is hydration-safe (`ThemeManager` waits for client render before showing toggle label).

## Auth navigation
- Successful login redirects to `/app/home`.
- Canonical authenticated surface is `/app/*` with separate studio and platform shells.
- Legacy routes redirect to canonical routes:
  - `/workspace` -> `/app/home`
  - `/admin` -> `/app/admin/overview`
  - `/support` -> `/app/platform/support/home`
  - `/analyst` -> `/app/platform/home`
  - `/customer` -> `/app/customer/selections`

## Branch/deploy model
- `qa` = stable QA deployment
- `main` = production deployment
- All work starts from `feature/<name>` and promotes by PR: `feature/* -> qa -> main`

## Local development
```bash
npm ci
npm run dev
```

## Required env keys
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_API_BASE_URL`
- Optional / forward-compatible:
  - `NEXT_PUBLIC_HELPER_DOWNLOAD_URL`
  - current code does not read this yet

## Governance docs
- `ARCHITECTURE.md`
- `RUNBOOK.md`
- `RELEASE.md`
- `RELEASE_POLICY.md`
- `docs/MESSAGING_CONTRACT.md`

## Vercel behavior
Only `qa` and `main` should deploy. Configure the Ignored Build Step in Vercel UI:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "qa" ]; then exit 1; else exit 0; fi
```
