#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_EVENT_NAME:-}" != "pull_request" ]]; then
  exit 0
fi

BODY="${PR_BODY:-}"
for required in "## Summary" "## Validation" "## Evidence" "## Documentation" "## Release impact"; do
  if ! grep -Fq "$required" <<< "$BODY"; then
    echo "Missing PR section: $required"
    exit 1
  fi
done

if [[ "${BASE_REF:-}" == "main" && "${HEAD_REF:-}" != "qa" ]]; then
  echo "Promotion guard: main can only receive PRs from qa"
  exit 1
fi

git fetch --no-tags --depth=1 origin "${BASE_REF}" >/dev/null 2>&1 || true
changed_files=$(git diff --name-only "origin/${BASE_REF}"...HEAD || true)
if grep -Eq '^(app/|components/|package\.json|\.github/workflows/)' <<< "$changed_files"; then
  if ! grep -Eq '(^README\.md$|^ARCHITECTURE\.md$|^RUNBOOK\.md$|^RELEASE\.md$|^CONTRIBUTING\.md$|^docs/)' <<< "$changed_files"; then
    echo "Docs policy: behavior/pipeline changes require docs updates"
    exit 1
  fi
fi
