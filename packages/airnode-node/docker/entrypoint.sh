#!/bin/sh

node /app/src/cli/validate-config.js && node /app/src/workers/local-gateways/run-server.js & crond -f
