FROM node:14.17-alpine3.14

ENV name="airnode"
ENV appDir="/app" \
    appBin="/usr/local/bin/${name}" \
    cronjob="/etc/cron.d/${name}"

LABEL application=${name} \
      description="Arinode"

WORKDIR ${appDir}

COPY --from=api3/airnode-artifacts /dependencies ${appDir}/node_modules
COPY --from=api3/airnode-artifacts /packages ${appDir}/node_modules/@api3/
COPY --from=api3/airnode-artifacts /build/packages/airnode-node/dist ${appDir}/
COPY packages/airnode-node/docker/airnode-crontab ${cronjob}

    # Install Tini to pass signals correctly
RUN apk add --update --no-cache tini && \
    # Create Airnode user
    adduser -h ${appDir} -s /bin/false -S -D -H ${name} && \
    # Enable Airnode cronjob
    chmod +x ${cronjob} && \
    crontab -u ${name} ${cronjob}

# We need to run the cron daemon as root but the Airnode itself is run under the airnode user
ENTRYPOINT ["tini", "--", "crond", "-f"]
