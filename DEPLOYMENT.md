# Vercel deployment mapping (no custom domain yet)

## Branch behavior
- `main` -> Production deployment
- `qa` -> Stable QA deployment
- All other branches (`feature/*`, `bugfix/*`, `dev/*`, etc.) -> no Vercel deployment

## Vercel default URL pattern
- Production (`main`): `https://<project-name>.vercel.app`
- QA (`qa`): `https://<project-name>-git-qa-<vercel-username>.vercel.app`

## Vercel Ignored Build Step (set in Vercel UI)
Use this exact command to allow deployments only for `main` and `qa`:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "qa" ]; then exit 1; else exit 0; fi
```

## Environment variable mapping
Production (`main`):
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_API_BASE_URL=https://api.foto.io`
- Optional:
  - `NEXT_PUBLIC_HELPER_DOWNLOAD_URL=https://github.com/zymerce/foto-helper/releases/latest`
  - current code does not read this yet

QA (`qa`):
- `NEXT_PUBLIC_APP_ENV=qa`
- `NEXT_PUBLIC_API_BASE_URL=https://api-qa.foto.io`
- Optional:
  - `NEXT_PUBLIC_HELPER_DOWNLOAD_URL=https://github.com/zymerce/foto-helper/releases/tag/v0.0.1-qa.1`
  - current code does not read this yet

Note: Until custom domains exist, replace API URLs above with your actual Render default service URLs when available.

## Backend CORS note
Until domains are purchased, backend allowed origins should include:
- `https://<project-name>.vercel.app`
- `https://<project-name>-git-qa-<vercel-username>.vercel.app`
