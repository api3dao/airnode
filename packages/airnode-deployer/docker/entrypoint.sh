#!/bin/sh

set -e

DEPLOYER_BINARY="airnode-deployer"
USER_ID="${USER_ID:-0}"
GROUP_ID="${GROUP_ID:-0}"

test -f config/aws.env && export $(egrep -v '^\s*#' config/aws.env | xargs)

su-exec ${USER_ID}:${GROUP_ID} ${DEPLOYER_BINARY} "$@"
