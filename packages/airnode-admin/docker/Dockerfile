FROM node:18.14.0-alpine3.17

ARG npmRegistryUrl=https://registry.npmjs.org/
ARG npmTag=latest

ENV name="airnode-admin" \
    appDir="/app"
ENV packageName="@api3/${name}"

LABEL application=${name} \
    description="Airnode Admin CLI"

# Install airnode-admin
RUN npm set registry ${npmRegistryUrl} && \
    yarn global add ${packageName}@${npmTag} && \
    ln -s /usr/local/share/.config/yarn/global/node_modules/${packageName}/dist ${appDir} && \
    # Create user
    adduser -h ${appDir} -s /bin/false -S -D -H ${name}

WORKDIR ${appDir}

USER ${name}

ENTRYPOINT ["airnode-admin"]
