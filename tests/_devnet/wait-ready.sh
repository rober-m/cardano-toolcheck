#!/usr/bin/env bash
# Block until the local Yaci devnet's Store API answers, or time out.
set -euo pipefail

API="${YACI_STORE_URL:-http://localhost:8080/api/v1/}"
DEADLINE=$(( SECONDS + ${DEVNET_TIMEOUT:-240} ))

echo "Waiting for devnet at ${API} ..."
until curl -sf "${API%/}/blocks/latest" >/dev/null 2>&1; do
  if (( SECONDS >= DEADLINE )); then
    echo "Devnet did not become ready in time." >&2
    exit 1
  fi
  sleep 3
done
echo "Devnet is ready."
