FROM node:14.17-alpine3.14

ENV name="airnode-deployer" \
    terraformURL="https://releases.hashicorp.com/terraform/1.0.6/terraform_1.0.6_linux_amd64.zip" \
    appBin="/usr/local/bin/deployer" \
    appDir="/app"

LABEL application=${name} \
      description="Arinode Deployer CLI"

COPY --from=api3/artifacts /dependencies ${appDir}/node_modules
COPY --from=api3/artifacts /packages ${appDir}/node_modules/@api3/
COPY --from=api3/artifacts /build/packages/airnode-deployer/dist ${appDir}/
COPY packages/airnode-deployer/docker/entrypoint.sh /entrypoint.sh

    # Install external dependencies
RUN apk add --update --no-cache su-exec git && \
    # Download Terraform binary
    wget ${terraformURL} && \
    unzip *.zip -d /bin && \
    rm -rf *.zip && \
    # Make the binary available within PATH
    ln -s ${appDir}/bin/deployer.js ${appBin} && \
    chmod +x ${appBin}

WORKDIR ${appDir}

ENTRYPOINT ["/entrypoint.sh"]
