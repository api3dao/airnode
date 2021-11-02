#!/bin/sh

ADMIN_BINARY="/usr/local/bin/airnode-admin"
USER_ID="${USER_ID:-0}"
GROUP_ID="${GROUP_ID:-0}"

su-exec ${USER_ID}:${GROUP_ID} ${ADMIN_BINARY} "$@"
