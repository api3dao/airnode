#!/bin/sh

set -e

GIT_REF=${GIT_REF:-master}

# Use Git respository as a source when there's no `/airnode` directory mounted
if [ -d /airnode ]; then
  git clone --depth 1 file:///airnode /build
else
  git clone https://github.com/api3dao/airnode.git .
  git checkout ${GIT_REF}
fi

yarn bootstrap
yarn build

yarn ts-node docker/scripts/prepare-containers.ts "$@"
