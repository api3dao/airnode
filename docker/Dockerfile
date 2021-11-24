ARG build=local

# Environment
FROM node:14.17-alpine3.14 AS environment

ENV buildDir="/build" \
    dependenciesDir="/dependencies" \
    packagesDir="/packages"

WORKDIR ${buildDir}

# Build preparation
FROM environment AS preparation

RUN apk add --update --no-cache git

# Source preparation - local
FROM preparation as sourcelocal

COPY . ${buildDir}

# Source preparation - git
FROM preparation as sourcegit

ARG branch=master
ARG repository=https://github.com/api3dao/airnode.git

RUN git clone ${repository} ${buildDir} -b ${branch}

# Production dependencies
FROM source${build} AS deps

RUN yarn global add lerna && \
    lerna bootstrap -- --production --no-optional --ignore-scripts && \
    rm -rf node_modules/@api3 && \
    mkdir -p ${dependenciesDir}/common && \
    cp -r ${buildDir}/node_modules/. ${dependenciesDir}/common && \
    cd ${buildDir}/packages && \
    for name in *; do mkdir ${dependenciesDir}/${name} && cp -r ${name}/node_modules/. ${dependenciesDir}/${name}; done

# Build
FROM source${build} AS build

# Download solidity compiler as per: https://github.com/nomiclabs/hardhat/issues/1280#issuecomment-949822371
# This path is hard-coded in hardhat.config.ts in airnode-adapter and airnode-protocol.
RUN mkdir -p /root/.cache/hardhat-nodejs/compilers/wasm \
  &&  wget -O /root/.cache/hardhat-nodejs/compilers/wasm/soljson-v0.8.9+commit.e5eed63a.js https://solc-bin.ethereum.org/wasm/soljson-v0.8.9+commit.e5eed63a.js \
  &&  wget -O /root/.cache/hardhat-nodejs/compilers/wasm/list.json https://solc-bin.ethereum.org/wasm/list.json

RUN yarn bootstrap && \
    yarn build && \
    yarn run pack && \
    mkdir ${packagesDir} && \
    cd ${packagesDir} && \
    cp ${buildDir}/packages/*/*.tgz . && \
    # Unpack each .tgz package into a directory with its name (simulating node_modules structure)
    for name in *; do package=$(echo ${name} | sed "s/api3-\(.*\)-v.*\.tgz/\1/g") && mkdir "${package}" && tar -xf ${name} -C "${package}" --strip-components 1 && rm ${name}; done

# Artifact storage
FROM environment AS artifacts

COPY --from=deps ${dependenciesDir} ${dependenciesDir}
COPY --from=build ${packagesDir} ${packagesDir}
COPY --from=build ${buildDir} ${buildDir}
