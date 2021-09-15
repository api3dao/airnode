ARG build=git

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
    rm -rf node_modules/@api3

# Build
FROM source${build} AS build

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

COPY --from=deps ${buildDir}/node_modules ${dependenciesDir}
COPY --from=build ${packagesDir} ${packagesDir}
COPY --from=build ${buildDir} ${buildDir}
