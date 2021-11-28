FROM node:14.17-bullseye

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

# Install Tini to pass signals correctly
# Install busybox for Alpine-like cron commands
RUN apt-get update && \
    apt-get install -y tini busybox-static && \
    apt-get clean

# Link busybox's cron functions and set up cron environment
RUN ln -s /bin/busybox /bin/crond && \
    ln -s /bin/busybox /bin/crontab && \
    mkdir -p /var/spool/cron/crontabs

# Create Airnode user
RUN useradd --home-dir ${appDir} --shell /bin/false --system --no-create-home ${name}

# Enable Airnode cronjob
RUN chmod +x ${cronjob} && \
    crontab -u ${name} ${cronjob}

# We need to run the cron daemon as root but the Airnode itself is run under the airnode user
ENTRYPOINT ["tini", "--", "crond", "-f"]
