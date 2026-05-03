#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <github-org> <repo-name>"
  exit 1
fi

ORG="$1"
REPO="$2"
CHECK_NAME="CI"

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login -h github.com"
  exit 1
fi

if ! gh repo view "${ORG}/${REPO}" >/dev/null 2>&1; then
  gh repo create "${ORG}/${REPO}" --private
fi

git remote remove origin >/dev/null 2>&1 || true
git remote add origin "git@github.com:${ORG}/${REPO}.git"

git push -u origin main
git push -u origin dev
git push -u origin qa

gh repo edit "${ORG}/${REPO}" --default-branch main

for BR in main dev qa; do
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/${ORG}/${REPO}/branches/${BR}/protection" \
    -f required_status_checks.strict=true \
    -f required_status_checks.contexts[]="${CHECK_NAME}" \
    -f enforce_admins=true \
    -f required_pull_request_reviews.dismiss_stale_reviews=true \
    -f required_pull_request_reviews.required_approving_review_count=1 \
    -f required_linear_history=true \
    -f allow_force_pushes=false \
    -f allow_deletions=false \
    -f required_conversation_resolution=true

done

echo "Bootstrap complete for ${ORG}/${REPO}"
