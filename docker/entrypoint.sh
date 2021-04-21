#!/bin/sh

yarn lerna run --scope @airnode/deployer sls:config
yarn cli:deployer ${@}
