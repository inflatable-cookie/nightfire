#!/bin/sh
# The repository's one Rust route.
#
# Local commands run through `oxide` so build storage, profile and rustc policy
# are Oxide's. CI runs Cargo, and `EFFIGY_OXIDE_ESCAPE=cargo` is the explicit
# per-invocation escape. There is no automatic fallback: a missing or refusing
# Oxide reports its own error and the escape, never a silent local Cargo run and
# never a per-selector `:cargo` variant.
#
#   mode                                   print `oxide` or `cargo`
#   run <cargo args...>                    one Cargo command
#   tool <manifest-path> -- <command...>   one tool that runs Cargo itself,
#                                          bound to one Cargo workspace
set -eu

usage() {
  printf 'usage: %s mode | run <cargo args...> | tool <manifest-path> -- <command> [args...]\n' "$0" >&2
  exit 2
}

require_oxide() {
  if command -v oxide >/dev/null 2>&1; then
    return 0
  fi
  printf 'oxide is not on PATH; install it, or set EFFIGY_OXIDE_ESCAPE=cargo to run Cargo directly.\n' >&2
  exit 127
}

report_refusal() {
  printf 'Rust route: oxide failed with exit %s; set EFFIGY_OXIDE_ESCAPE=cargo to run Cargo directly.\n' "$1" >&2
}

case "${EFFIGY_OXIDE_ESCAPE:-}" in
  "") escape=no ;;
  cargo) escape=yes ;;
  *)
    printf 'unsupported EFFIGY_OXIDE_ESCAPE value: %s (supported: cargo)\n' "$EFFIGY_OXIDE_ESCAPE" >&2
    exit 2
    ;;
esac

if [ "$escape" = yes ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  route=cargo
else
  route=oxide
fi

if [ "$#" -lt 1 ]; then
  usage
fi

subcommand=$1
shift

case "$subcommand" in
  mode)
    printf '%s\n' "$route"
    ;;
  run)
    if [ "$#" -lt 1 ]; then
      usage
    fi
    if [ "$route" = cargo ]; then
      exec cargo "$@"
    fi
    require_oxide
    status=0
    oxide "$@" || status=$?
    if [ "$status" -ne 0 ]; then
      report_refusal "$status"
    fi
    exit "$status"
    ;;
  tool)
    if [ "$#" -lt 3 ] || [ "$2" != "--" ]; then
      usage
    fi
    manifest=$1
    shift 2
    if [ "$route" = cargo ]; then
      exec "$@"
    fi
    require_oxide
    status=0
    oxide exec --manifest-path "$manifest" -- "$@" || status=$?
    if [ "$status" -ne 0 ]; then
      report_refusal "$status"
    fi
    exit "$status"
    ;;
  *)
    usage
    ;;
esac
