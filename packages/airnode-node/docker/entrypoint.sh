#!/bin/sh

node /app/src/cli/validate-config.js && crond -f
