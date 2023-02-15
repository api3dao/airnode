FROM node:18.14.0-alpine3.17

ARG npmRegistryUrl=https://registry.npmjs.org/
ARG npmTag=latest

ENV name="airnode-client" \
    packageName="@api3/airnode-node" \
    appDir="/app"
ENV cronjob="/etc/cron.d/${name}"

LABEL application=${name} \
    description="Airnode Client"

COPY airnode-crontab ${cronjob}
COPY entrypoint.sh /entrypoint.sh

# Install Tini to correctly pass signals
RUN apk add --update --no-cache tini dos2unix && \
    # Install airnode-node
    npm set registry ${npmRegistryUrl} && \
    yarn global add ${packageName}@${npmTag} && \
    ln -s /usr/local/share/.config/yarn/global/node_modules/${packageName}/dist ${appDir} && \
    # Create user
    adduser -h ${appDir} -s /bin/false -S -D -H ${name} && \
    # Enable Airnode cronjob
    chmod +x ${cronjob} && \
    crontab -u ${name} ${cronjob} && \
    # Git swaps out LF with CRLF on Windows but only in the working directory
    dos2unix /entrypoint.sh

WORKDIR ${appDir}

# We need to run the cron daemon as root but the Airnode itself is run under the airnode user
ENTRYPOINT ["tini", "--", "/entrypoint.sh"]
