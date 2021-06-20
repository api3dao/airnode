# Build preparation
FROM node:14.17.1-alpine3.13 as buildPrep

ARG yarnRegistry

ENV airnodeDir="/app/airnode"
ENV deployerDir="${airnodeDir}/packages/deployer" \
    YARN_REGISTRY=${yarnRegistry}

RUN apk add --update python make g++ && \
    mkdir -p ${deployerDir}

WORKDIR ${deployerDir}

# Actual build
FROM buildPrep as buildBuild

COPY tsconfig.build.json ${airnodeDir}
COPY packages/deployer ${deployerDir}

RUN yarn install && \
    yarn build

# Necessary NPM packages
FROM buildPrep as buildDependencies

COPY packages/deployer/package.json ${deployerDir}
COPY packages/deployer/yarn.lock ${deployerDir}

ENV NODE_ENV production

RUN yarn install --prod

# Run image
FROM node:14.17.1-alpine3.13

ENV name="airnode-deployer" \
    terraformURL="https://releases.hashicorp.com/terraform/0.15.3/terraform_0.15.3_linux_amd64.zip" \
    buildDeployerDir="/app/airnode/packages/deployer" \
    deployerBin="/usr/local/bin/deployer" \
    deployerDir="/app"

LABEL application=${name} \
    description="Arinode Deployer CLI"

COPY --from=buildBuild ${buildDeployerDir}/dist ${deployerDir}
COPY --from=buildDependencies ${buildDeployerDir}/node_modules ${deployerDir}/node_modules
COPY docker/entrypoint.sh /entrypoint.sh

# Install external dependencies
RUN apk add --update --no-cache su-exec git && \
    # Download Terraform binary
    wget ${terraformURL} && \
    unzip *.zip -d /bin && \
    rm -rf *.zip && \
    # Make the binary available within PATH
    ln -s ${deployerDir}/bin/deployer.js ${deployerBin} && \
    chmod +x ${deployerBin}

WORKDIR ${deployerDir}

ENTRYPOINT ["/entrypoint.sh"]
