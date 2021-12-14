FROM node:14.17-alpine3.14

ENV name="airnode-deployer"
ENV baseTerraformURL="https://releases.hashicorp.com/terraform/1.0.6/terraform_1.0.6_linux_" \
    appBin="/usr/local/bin/${name}" \
    appDir="/app"

LABEL application=${name} \
      description="Airnode Deployer CLI"

COPY --from=api3/airnode-artifacts /dependencies/common ${appDir}/node_modules
COPY --from=api3/airnode-artifacts /dependencies/airnode-deployer ${appDir}/node_modules
COPY --from=api3/airnode-artifacts /packages ${appDir}/node_modules/@api3/
COPY --from=api3/airnode-artifacts /build/packages/airnode-deployer/dist ${appDir}/
COPY packages/airnode-deployer/docker/entrypoint.sh /entrypoint.sh

    # Install external dependencies
RUN ARCH=`[ $(arch) == "x86_64" ] && echo "amd64" || echo "arm64" ` && \
    apk add --update --no-cache su-exec git && \
    # Download Terraform binary
    wget ${baseTerraformURL}${ARCH}.zip && \
    unzip *.zip -d /bin && \
    rm -rf *.zip && \
    # Make the binary available within PATH
    ln -s ${appDir}/bin/deployer.js ${appBin} && \
    chmod +x ${appBin}

# Default placement for GCP credentials
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/gcloud/application_default_credentials.json

WORKDIR ${appDir}

ENTRYPOINT ["/entrypoint.sh"]
