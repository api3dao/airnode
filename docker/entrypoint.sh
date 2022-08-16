#!/bin/sh

set -e

GIT_REF=${GIT_REF:-master}

# Use Git respository as a source when there's no `/airnode` directory mounted
if [ -d /airnode ]; then
  # Efficient way to copy the whole directory with a lot of small files
  (cd /airnode; tar cf - .) | (cd /build; tar xpf -)
else
  git clone https://github.com/api3dao/airnode.git .
  git checkout ${GIT_REF}
fi

yarn bootstrap
yarn build

yarn ts-node docker/scripts/prepare-containers.ts "$@"
