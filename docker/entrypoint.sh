#!/bin/sh

DEPLOYER_BINARY="/usr/local/bin/deployer"
USER_ID="${USER_ID:-0}"
GROUP_ID="${GROUP_ID:-0}"

su-exec ${USER_ID}:${GROUP_ID} ${DEPLOYER_BINARY} "$@"
