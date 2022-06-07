FROM node:14.19.3-alpine3.15

ENV name="airnode-node"
ENV appDir="/app" \
  cronjob="/etc/cron.d/${name}"

LABEL application=${name} \
  description="Airnode Client"

WORKDIR ${appDir}

COPY --from=api3/airnode-artifacts /dependencies/common ${appDir}/node_modules
COPY --from=api3/airnode-artifacts /dependencies/airnode-node ${appDir}/node_modules
COPY --from=api3/airnode-artifacts /packages ${appDir}/node_modules/@api3/
COPY --from=api3/airnode-artifacts /build/packages/airnode-node/dist ${appDir}/
COPY packages/airnode-node/docker/airnode-crontab ${cronjob}
COPY packages/airnode-node/docker/entrypoint.sh /entrypoint.sh

# Install Tini to pass signals correctly
RUN apk add --update --no-cache tini dos2unix && \
  # Create Airnode user
  adduser -h ${appDir} -s /bin/false -S -D -H ${name} && \
  # Enable Airnode cronjob
  chmod +x ${cronjob} && \
  crontab -u ${name} ${cronjob} && \
  # Git swaps out LF with CRLF on Windows but only in the working directory
  dos2unix /entrypoint.sh

# We need to run the cron daemon as root but the Airnode itself is run under the airnode user
ENTRYPOINT ["tini", "--", "/entrypoint.sh"]
