#!/usr/bin/env bash
set -euo pipefail

required=(
  "app/page.tsx"
  "app/login/page.tsx"
  "app/signup/page.tsx"
  "app/verify-email/page.tsx"
  "app/verify-email/confirm/page.tsx"
  "app/forgot-password/page.tsx"
  "app/reset-password/page.tsx"
  "app/invite/accept/page.tsx"
  "app/workspace/page.tsx"
  "app/admin/page.tsx"
  "app/support/page.tsx"
  "app/analyst/page.tsx"
  "app/photographer/page.tsx"
  "app/customer/page.tsx"
  "app/projects/page.tsx"
)

for f in "${required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing required route file: $f"
    exit 1
  fi
done

echo "Route smoke passed"
