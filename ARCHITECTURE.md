# fotoz.io Web Architecture

## Purpose
Web application for marketing, onboarding, authentication UX, workspace operations, and helper download/connect orchestration.

## Core flows
- Landing conversion: `/` -> `/signup` or `/login`
- Auth flows: studio-owner signup, verify, login, forgot/reset, invite acceptance
- Post-login landing: `/app/home`
- Canonical authenticated routes: `/app/*`
- Role route model:
  - `admin`: workspace owner/manager surfaces plus `/app/projects`, `/app/uploads`, `/app/admin/*`
  - `photographer`: `/app/projects`, `/app/uploads`, `/app/activity`
  - `customer` (client): `/app/customer/selections`, `/app/customer/history`
  - `support`: `/app/support/cases`, `/app/support/user-lookup`, `/app/support/escalations`
  - `analyst`: `/app/analytics/funnel`, `/app/analytics/ops`, `/app/analytics/quality`
  - `super_admin`: governance and platform-control surfaces under `/app/admin/*`
- Shared shell standards:
  - fixed desktop sidebar + top bar
  - mobile hamburger drawer
  - top-right account/settings/sign-out surface
- Workspace/project flow:
  - self-signup creates a studio-owner account
  - authenticated project creation is API-backed
  - helper connect starts from `/app/projects` using a one-time connect code
- Legacy route compatibility:
  - `/workspace` -> `/app/home`
  - `/admin` -> `/app/admin/overview`
  - role routes (`/support`, `/analyst`, `/photographer`, `/customer`) -> canonical `/app/*` routes

## Integration boundaries
- Consumes API via `NEXT_PUBLIC_API_BASE_URL`.
- Launches helper via `fotoz://connect?...` one-time deep links.
- Must not expose backend secrets in public env vars.

## Theming
- Global semantic token theme.
- Non-landing pages support light/dark/system preference.
- Landing remains fixed visual surface for conversion consistency.
