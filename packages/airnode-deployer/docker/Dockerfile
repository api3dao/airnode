FROM node:18.14.0-alpine3.17

ARG npmRegistryUrl=https://registry.npmjs.org/
ARG npmTag=latest

ENV name="airnode-deployer" \
    baseTerraformURL="https://releases.hashicorp.com/terraform/1.4.0/terraform_1.4.0_linux_" \
    appDir="/app"
ENV packageName="@api3/${name}"

LABEL application=${name} \
    description="Airnode Deployer CLI"

COPY ./entrypoint.sh /entrypoint.sh

RUN ARCH=`[ $(arch) == "x86_64" ] && echo "amd64" || echo "arm64" ` && \
    # Install external dependencies
    apk add --update --no-cache su-exec git dos2unix && \
    # Download Terraform binary
    wget ${baseTerraformURL}${ARCH}.zip && \
    unzip *.zip -d /bin && \
    rm -rf *.zip && \
    # Install airnode-deployer
    npm set registry ${npmRegistryUrl} && \
    yarn global add ${packageName}@${npmTag} && \
    ln -s /usr/local/share/.config/yarn/global/node_modules/${packageName}/dist ${appDir} && \
    # Create user
    adduser -h ${appDir} -s /bin/false -S -D -H ${name} && \
    # Git swaps out LF with CRLF on Windows but only in the working directory
    dos2unix /entrypoint.sh && \
    find ${appDir}/terraform -type f -exec dos2unix -q {} {} \;

WORKDIR ${appDir}

ENV GOOGLE_APPLICATION_CREDENTIALS=/app/config/gcp.json

ENTRYPOINT ["/entrypoint.sh"]
