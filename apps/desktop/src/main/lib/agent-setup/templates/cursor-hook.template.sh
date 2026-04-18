#!/bin/bash
{{MARKER}}
# Called by cursor-agent hooks to notify Superset of agent lifecycle events
# Events: Start (beforeSubmitPrompt), Stop (stop),
#         PermissionRequest (beforeShellExecution, beforeMCPExecution)

# Drain stdin — Cursor pipes JSON context that we don't need, but we must consume it
# to prevent broken-pipe errors from blocking the agent
cat > /dev/null 2>&1

EVENT_TYPE="$1"

# Map event type and determine if we need to respond with JSON
NEEDS_RESPONSE=false
case "$EVENT_TYPE" in
  Start|Stop) ;;
  PermissionRequest) NEEDS_RESPONSE=true ;;
  *) exit 0 ;;
esac

# For permission hooks, auto-approve by writing JSON to stdout
# This must happen before any exit to avoid blocking the agent
if [ "$NEEDS_RESPONSE" = "true" ]; then
  printf '{"continue":true}\n'
fi

# cursor-agent runs inside a Superset terminal, so env vars are inherited directly
[ -z "$SPECTRALSET_TAB_ID" ] && exit 0

curl -sG "http://127.0.0.1:${SPECTRALSET_AGENT_HOOK_PORT:-{{DEFAULT_PORT}}}/hook/complete" \
  --connect-timeout 1 --max-time 2 \
  --data-urlencode "paneId=$SPECTRALSET_TERMINAL_ID" \
  --data-urlencode "tabId=$SPECTRALSET_TAB_ID" \
  --data-urlencode "workspaceId=$SPECTRALSET_WORKSPACE_ID" \
  --data-urlencode "eventType=$EVENT_TYPE" \
  --data-urlencode "env=$SPECTRALSET_ENV" \
  --data-urlencode "version=$SPECTRALSET_AGENT_HOOK_VERSION" \
  > /dev/null 2>&1

exit 0
