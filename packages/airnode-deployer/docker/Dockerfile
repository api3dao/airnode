FROM node:14.17-bullseye

ENV name="airnode-deployer"
ENV terraformURL="https://releases.hashicorp.com/terraform/1.0.6/terraform_1.0.6_linux_amd64.zip" \
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
RUN apt-get update && \
    apt-get install -y git gosu && \
    apt-get clean

# Install Terraform
RUN wget ${terraformURL} && \
    unzip *.zip -d /bin && \
    rm -rf *.zip && \
    # Make the binary available within PATH
    ln -s ${appDir}/bin/deployer.js ${appBin} && \
    chmod +x ${appBin}

WORKDIR ${appDir}

ENTRYPOINT ["/entrypoint.sh"]
