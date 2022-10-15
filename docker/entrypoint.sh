#!/bin/sh

set -e

GIT_REF=${GIT_REF:-master}

# Use Git respository as a source when there's no `/airnode` directory mounted
if [ -d /airnode ]; then
  # Efficient way to copy the whole directory with a lot of small files
  # Keeping any local code changes but excluding platform-specific files (dependencies, builds, etc.)
  git config --global --add safe.directory /airnode
  rsync -a --include .git --exclude-from=<(git -C /airnode ls-files --exclude-standard -oi --directory) /airnode/ /build
else
  git clone https://github.com/api3dao/airnode.git .
  git checkout ${GIT_REF}
fi

yarn bootstrap
yarn build

export NODE_OPTIONS="--unhandled-rejections=throw"
yarn ts-node docker/scripts/prepare-containers.ts "$@"
