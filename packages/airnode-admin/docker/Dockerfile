FROM node:14.17-alpine3.14

ENV name="airnode-admin"
ENV appDir="/app" \
    appBin="/usr/local/bin/${name}"

LABEL application=${name} \
      description="Airnode Admin CLI"

WORKDIR ${appDir}

COPY --from=api3/airnode-artifacts /dependencies/common ${appDir}/node_modules
COPY --from=api3/airnode-artifacts /dependencies/airnode-admin ${appDir}/node_modules
COPY --from=api3/airnode-artifacts /packages ${appDir}/node_modules/@api3/
COPY --from=api3/airnode-artifacts /build/packages/airnode-admin/dist ${appDir}/
COPY packages/airnode-admin/docker/entrypoint.sh /entrypoint.sh

RUN apk add --update --no-cache su-exec
# Make the binary available within PATH
RUN ln -s ${appDir}/bin/admin.js ${appBin} && chmod +x ${appBin}

ENTRYPOINT ["/entrypoint.sh"]
