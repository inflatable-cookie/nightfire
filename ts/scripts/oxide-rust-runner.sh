#!/bin/sh
set -eu

if [ "$#" -lt 2 ]; then
  printf 'usage: %s <selector> <command> [args...]\n' "$0" >&2
  exit 2
fi

selector=$1
case "$selector" in
  check:rust:format|check:rust|check:rust:clippy|test:rust) escape="$selector:cargo" ;;
  *) printf 'unsupported Rust selector: %s\n' "$selector" >&2; exit 2 ;;
esac
shift

if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  exec cargo "$@"
fi

if ! command -v oxide >/dev/null 2>&1; then
  printf 'oxide is not on PATH; use effigy %s\n' "$escape" >&2
  exit 127
fi

exec oxide "$@"
