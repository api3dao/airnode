# Environment
FROM node:14.17.1-alpine3.13 AS environment

ENV name="airnode"
ENV airnodeDir="/app/${name}"

WORKDIR ${airnodeDir}

#Build preparation
FROM environment AS preparation

COPY . ${airnodeDir}

RUN apk add --update --no-cache git

# Production dependencies
FROM preparation AS deps

RUN yarn global add lerna && \
    lerna bootstrap -- --production --no-optional --ignore-scripts

# Build
FROM preparation AS build

RUN yarn bootstrap && \
    yarn build && \
    yarn run pack

# Run image
FROM environment

ENV airnodeBin="/usr/local/bin/${name}" \
    cronjob="/etc/cron.d/${name}"

LABEL application=${name} \
    description="Arinode"

COPY --from=deps ${airnodeDir}/node_modules ${airnodeDir}/node_modules
COPY --from=build ${airnodeDir}/packages/*/*.tgz ${airnodeDir}/node_modules/@api3/
COPY --from=build ${airnodeDir}/packages/node/dist ${airnodeDir}/
COPY packages/node/docker/airnode-crontab ${cronjob}

    # Install Tini to pass signals correctly
RUN apk add --update --no-cache tini && \
    # Unpack Airnode packages as dependencies
    cd ${airnodeDir}/node_modules/@api3/ && \
    for package in $(find * -type l); do rm "${package}" && mkdir "${package}" && tar -xf api3-${package}*.tgz -C "${package}" --strip-components 1 && rm api3-${package}*.tgz; done && \
    # Make Airnode available to system as a binary
    ln -s ${airnodeDir}/bin/invoke.js ${airnodeBin} && \
    chmod +x ${airnodeBin} && \
    # Create Airnode user
    adduser -h ${airnodeDir} -s /bin/false -S -D -H ${name} && \
    # Enable Airnode cronjob
    chmod +x ${cronjob} && \
    crontab -u ${name} ${cronjob}

# We need to run the cron daemon as root but the Airnode itself is run under the airnode user
ENTRYPOINT ["tini", "--", "crond", "-f"]
