FROM node:14.17-alpine3.14

ENV name="airnode"
ENV appDir="/app" \
    appBin="/usr/local/bin/${name}" \
    cronjob="/etc/cron.d/${name}"

LABEL application=${name} \
      description="Arinode"

WORKDIR ${appDir}

COPY --from=api3/artifacts /dependencies ${appDir}/node_modules
COPY --from=api3/artifacts /packages ${appDir}/node_modules/@api3/
COPY --from=api3/artifacts /build/packages/node/dist ${appDir}/
COPY packages/node/docker/airnode-crontab ${cronjob}

    # Install Tini to pass signals correctly
RUN apk add --update --no-cache tini && \
    # Make Airnode available to system as a binary
    ln -s ${appDir}/bin/invoke.js ${appBin} && \
    chmod +x ${appBin} && \
    # Create Airnode user
    adduser -h ${appDir} -s /bin/false -S -D -H ${name} && \
    # Enable Airnode cronjob
    chmod +x ${cronjob} && \
    crontab -u ${name} ${cronjob}

# We need to run the cron daemon as root but the Airnode itself is run under the airnode user
ENTRYPOINT ["tini", "--", "crond", "-f"]
