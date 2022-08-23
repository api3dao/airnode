#!/bin/sh

set -e

GIT_REF=${GIT_REF:-master}

# Use Git respository as a source when there's no `/airnode` directory mounted
if [ -d /airnode ]; then
  # Efficient way to copy the whole directory with a lot of small files
  # Keeping any local code changes but excluding platform-specific files (dependencies, builds, etc.)
  rsync -a --include packages/airnode-protocol/deployments --exclude node_modules --exclude build --exclude dist --exclude coverage --exclude artifacts --exclude cache --exclude .webpack --exclude deployments /airnode/ /build
else
  git clone https://github.com/api3dao/airnode.git .
  git checkout ${GIT_REF}
fi

yarn bootstrap
yarn build

yarn ts-node docker/scripts/prepare-containers.ts "$@"
