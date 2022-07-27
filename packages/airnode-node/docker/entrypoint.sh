#!/bin/sh

node /app/src/cli/validate-config.js && node /app/src/workers/gateways-api.js & crond -f
